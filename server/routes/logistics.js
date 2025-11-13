// server/routes/logistics.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// --- STAFF ROUTES ---
// (GET, POST, DELETE routes are unchanged)
// ... (GET /staff, GET /data/roles-list, POST /staff, DELETE /staff/:id) ...

// 1. Fetch Staff Roster (READ)
router.get('/staff', async (req, res) => {
    try {
        const [staff] = await db.query(`
            SELECT 
                S.Staff_ID, S.Name, S.Date_of_Birth, S.Email, S.Phone,
                R.Role_Name, R.Role_ID
            FROM staff S
            JOIN roles R ON S.Role_ID = R.Role_ID
            ORDER BY R.Role_Name, S.Name
        `);
        res.json(staff);
    } catch (err) {
        console.error('Error fetching staff roster:', err);
        res.status(500).json({ message: 'Failed to fetch staff data.' });
    }
});

// 2. Fetch Roles Lookup
router.get('/data/roles-list', async (req, res) => {
    try {
        const [roles] = await db.query('SELECT Role_ID, Role_Name FROM roles ORDER BY Role_Name');
        res.json(roles);
    } catch (err) {
        console.error('Error fetching roles lookup data:', err);
        res.status(500).json({ message: 'Error fetching roles lookup data.' });
    }
});

// 3. Create New Staff Member
router.post('/staff', async (req, res) => {
    const { name, dob, email, phone, roleId } = req.body;
    if (!name || !email || !roleId) {
        return res.status(400).json({ message: 'Missing required staff fields (Name, Email, Role).' });
    }
    try {
        const [lastStaff] = await db.query('SELECT IFNULL(MAX(Staff_ID), 0) + 1 AS NextID FROM staff');
        const nextStaffId = lastStaff[0].NextID;
        const query = `
            INSERT INTO staff
            (Staff_ID, Name, Date_of_Birth, Email, Phone, Role_ID)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.query(query, [nextStaffId, name, dob, email, phone || null, roleId]);
        res.status(201).json({
            message: `Staff member ${name} registered successfully. ID: ${nextStaffId}`,
            id: nextStaffId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Registration failed. Email or Phone number already in use.' });
        }
        console.error('Error registering staff member:', err.message);
        res.status(400).json({
            message: 'Staff registration failed due to a database error.',
            error: err.code
        });
    }
});

// 3.1. Delete Staff Member
router.delete('/staff/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM staff WHERE Staff_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Staff member not found.' });
        }
        res.json({ message: `Staff member ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting staff:', err.message);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ 
                message: 'Deletion failed. Staff member is referenced in other records (e.g., Incident Reports, Schedules, Checkouts).',
                error: err.code 
            });
        }
        res.status(500).json({ 
            message: 'Deletion failed due to a database error.',
            error: err.code 
        });
    }
});

// 3.2. Update Staff Member (UPDATE) - 🌟 NEW
router.put('/staff/:id', async (req, res) => {
    const { id } = req.params;
    const { name, dob, email, phone, roleId } = req.body;

    if (!name || !email || !roleId || !dob) {
        return res.status(400).json({ message: 'Missing required fields (Name, Email, DOB, Role).' });
    }

    try {
        const query = `
            UPDATE staff
            SET Name = ?, Date_of_Birth = ?, Email = ?, Phone = ?, Role_ID = ?
            WHERE Staff_ID = ?
        `;
        const [result] = await db.query(query, [name, dob, email, phone || null, roleId, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Staff member not found.' });
        }

        res.json({ message: `Staff member ${id} updated successfully.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Update failed. Email or Phone number already in use.' });
        }
        console.error('Error updating staff member:', err.message);
        res.status(500).json({ message: 'Staff update failed due to a database error.', error: err.code });
    }
});


// --- EQUIPMENT ROUTES ---
// (No changes to Equipment routes)
// ... (GET /equipment/inventory, GET /equipment/checkouts, POST /equipment/checkout, PUT /equipment/checkin/:itemId) ...
// 4. Fetch Equipment Inventory (READ)
router.get('/equipment/inventory', async (req, res) => {
    try {
        const [inventory] = await db.query(`
            SELECT 
                EI.Item_ID, EI.Item_Code, EI.Status, EI.Conditions, EI.Purchase_Date,
                ET.Type_Name
            FROM equipment_items EI
            JOIN equipment_types ET ON EI.Type_ID = ET.Type_ID
            ORDER BY ET.Type_Name, EI.Item_Code
        `);
        res.json(inventory);
    } catch (err) {
        console.error('Error fetching equipment inventory:', err);
        res.status(500).json({ message: 'Failed to fetch equipment inventory data.' });
    }
});

// 5. Fetch Equipment Checkouts (READ)
router.get('/equipment/checkouts', async (req, res) => {
    try {
        const [checkouts] = await db.query(`
            SELECT 
                EC.Checkout_ID, EC.Checkout_time, EC.Checkin_time,
                S.Name AS Staff_Name,
                EI.Item_Code,
                ET.Type_Name
            FROM equipment_checkouts EC
            JOIN staff S ON EC.Staff_ID = S.Staff_ID
            JOIN equipment_items EI ON EC.Item_ID = EI.Item_ID
            JOIN equipment_types ET ON EI.Type_ID = ET.Type_ID
            ORDER BY EC.Checkout_time DESC
        `);
        res.json(checkouts);
    } catch (err) {
        console.error('Error fetching checkouts:', err);
        res.status(500).json({ message: 'Failed to fetch checkout data.' });
    }
});

// 6. Checkout Equipment (CREATE)
router.post('/equipment/checkout', async (req, res) => {
    const { staffId, itemId } = req.body;
    if (!staffId || !itemId) {
        return res.status(400).json({ message: 'Missing Staff ID or Item ID for checkout.' });
    }
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [itemStatus] = await connection.query('SELECT Status FROM equipment_items WHERE Item_ID = ?', [itemId]);
        if (itemStatus.length === 0 || itemStatus[0].Status !== 'Available') {
            await connection.rollback();
            return res.status(400).json({ message: 'Item is not available for checkout (Status must be "Available").' });
        }
        await connection.query("UPDATE equipment_items SET Status = 'Issued' WHERE Item_ID = ?", [itemId]);
        const checkoutQuery = `
            INSERT INTO equipment_checkouts
            (Staff_ID, Item_ID, Checkout_time)
            VALUES (?, ?, NOW())
        `;
        const [result] = await connection.query(checkoutQuery, [staffId, itemId]);
        await connection.commit();
        res.status(201).json({
            message: `Equipment ${itemId} checked out successfully by Staff ${staffId}.`,
            checkoutId: result.insertId
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error checking out equipment:', err.message);
        res.status(500).json({ message: 'Equipment checkout failed due to a database error.', error: err.code });
    } finally {
        if (connection) connection.release();
    }
});

// 7. Checkin Equipment (UPDATE)
router.put('/equipment/checkin/:itemId', async (req, res) => {
    const { itemId } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [checkoutResult] = await connection.query(
            'UPDATE equipment_checkouts SET Checkin_time = NOW() WHERE Item_ID = ? AND Checkin_time IS NULL ORDER BY Checkout_time DESC LIMIT 1',
            [itemId]
        );
        if (checkoutResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'No active checkout found for this item.' });
        }
        await connection.query("UPDATE equipment_items SET Status = 'Available' WHERE Item_ID = ?", [itemId]);
        await connection.commit();
        res.json({ message: `Equipment ${itemId} checked in successfully.` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error checking in equipment:', err.message);
        res.status(500).json({ message: 'Equipment checkin failed due to a database error.', error: err.code });
    } finally {
        if (connection) connection.release();
    }
});


// --- TRANSPORT ROUTES ---
// (GET, POST, DELETE routes are unchanged)
// ... 

// 8. Fetch Transport Routes (READ)
router.get('/transport/routes', async (req, res) => {
    try {
        const [routes] = await db.query('SELECT Route_ID, Route_Name, Description FROM transport_routes ORDER BY Route_ID');
        res.json(routes);
    } catch (err) {
        console.error('Error fetching transport routes:', err);
        res.status(500).json({ message: 'Failed to fetch transport routes data.' });
    }
});

// 8.1. Create New Route (CREATE)
router.post('/transport/routes', async (req, res) => {
    const { routeId, routeName, description } = req.body;
    if (!routeId || !routeName) {
        return res.status(400).json({ message: 'Missing Route ID or Name.' });
    }
    try {
        const query = 'INSERT INTO transport_routes (Route_ID, Route_Name, Description) VALUES (?, ?, ?)';
        await db.query(query, [routeId, routeName, description || null]);
        res.status(201).json({ message: `Route ${routeName} created successfully.`, id: routeId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Route ID or Name already exists.' });
        }
        console.error('Error creating route:', err.message);
        res.status(500).json({ message: 'Failed to create route.' });
    }
});

// 8.2. Delete Route (DELETE)
router.delete('/transport/routes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM transport_routes WHERE Route_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Route not found.' });
        }
        res.json({ message: `Route ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting route:', err.message);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ 
                message: 'Deletion failed. Route is referenced by a Vehicle or Schedule.',
                error: err.code 
            });
        }
        res.status(500).json({ 
            message: 'Deletion failed due to a database error.',
            error: err.code 
        });
    }
});

// 8.3. Update Route (UPDATE) - 🌟 NEW
router.put('/transport/routes/:id', async (req, res) => {
    const { id } = req.params;
    const { routeName, description } = req.body; // Note: Route_ID is not updatable (it's the key)

    if (!routeName) {
        return res.status(400).json({ message: 'Missing Route Name.' });
    }

    try {
        const query = 'UPDATE transport_routes SET Route_Name = ?, Description = ? WHERE Route_ID = ?';
        const [result] = await db.query(query, [routeName, description || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Route not found.' });
        }
        res.json({ message: `Route ${id} updated successfully.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Route Name already exists.' });
        }
        console.error('Error updating route:', err.message);
        res.status(500).json({ message: 'Failed to update route.' });
    }
});

// 9. Fetch Transport Vehicles (READ)
router.get('/transport/vehicles', async (req, res) => {
    try {
        const [vehicles] = await db.query(`
            SELECT 
                TV.Vehicle_ID, TV.Vehicle_Name, TV.License_plate, TV.Capacity, TV.Route_ID AS Default_Route_ID,
                TR.Route_Name AS Default_Route_Name
            FROM transport_vehicles TV
            JOIN transport_routes TR ON TV.Route_ID = TR.Route_ID
            ORDER BY TV.Vehicle_Name
        `);
        res.json(vehicles);
    } catch (err) {
        console.error('Error fetching transport vehicles:', err);
        res.status(500).json({ message: 'Failed to fetch transport vehicles data.' });
    }
});

// 9.1. Create New Vehicle (CREATE)
router.post('/transport/vehicles', async (req, res) => {
    const { vehicleId, vehicleName, licensePlate, capacity, defaultRouteId } = req.body;
    if (!vehicleId || !vehicleName || !licensePlate || !capacity || !defaultRouteId) {
        return res.status(400).json({ message: 'Missing required vehicle fields.' });
    }
    try {
        const query = 'INSERT INTO transport_vehicles (Vehicle_ID, Vehicle_Name, License_plate, Capacity, Route_ID) VALUES (?, ?, ?, ?, ?)';
        await db.query(query, [vehicleId, vehicleName, licensePlate, capacity, defaultRouteId]);
        res.status(201).json({ message: `Vehicle ${vehicleName} added successfully.`, id: vehicleId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Vehicle ID or License Plate already exists.' });
        }
        console.error('Error creating vehicle:', err.message);
        res.status(500).json({ message: 'Failed to create vehicle.' });
    }
});

// 9.2. Delete Vehicle (DELETE)
router.delete('/transport/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM transport_vehicles WHERE Vehicle_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Vehicle not found.' });
        }
        res.json({ message: `Vehicle ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting vehicle:', err.message);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ 
                message: 'Deletion failed. Vehicle is referenced in a Schedule.',
                error: err.code 
            });
        }
        res.status(500).json({ 
            message: 'Deletion failed due to a database error.',
            error: err.code 
        });
    }
});

// 9.3. Update Vehicle (UPDATE) - 🌟 NEW
router.put('/transport/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    const { vehicleName, licensePlate, capacity, defaultRouteId } = req.body;

    if (!vehicleName || !licensePlate || !capacity || !defaultRouteId) {
        return res.status(400).json({ message: 'Missing required vehicle fields.' });
    }

    try {
        const query = `
            UPDATE transport_vehicles 
            SET Vehicle_Name = ?, License_plate = ?, Capacity = ?, Route_ID = ?
            WHERE Vehicle_ID = ?
        `;
        const [result] = await db.query(query, [vehicleName, licensePlate, capacity, defaultRouteId, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Vehicle not found.' });
        }
        res.json({ message: `Vehicle ${id} updated successfully.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'License Plate already exists.' });
        }
        console.error('Error updating vehicle:', err.message);
        res.status(500).json({ message: 'Failed to update vehicle.' });
    }
});

// 10. Fetch Transport Schedules (READ)
router.get('/transport/schedules', async (req, res) => {
    try {
        const [schedules] = await db.query(`
            SELECT 
                TS.Schedule_ID, TS.Departure_time, TS.Staff_ID, TS.Route_ID, TS.Vehicle_ID,
                TR.Route_Name,
                S.Name AS Staff_Driver,
                TV.Vehicle_Name, TV.License_plate
            FROM transport_schedules TS
            JOIN transport_routes TR ON TS.Route_ID = TR.Route_ID
            JOIN staff S ON TS.Staff_ID = S.Staff_ID
            JOIN transport_vehicles TV ON TS.Vehicle_ID = TV.Vehicle_ID
            ORDER BY TS.Departure_time DESC
        `);
        res.json(schedules);
    } catch (err) {
        console.error('Error fetching transport schedules:', err);
        res.status(500).json({ message: 'Failed to fetch transport schedules data.' });
    }
});

// 10.1. Create New Schedule (CREATE)
router.post('/transport/schedules', async (req, res) => {
    const { staffId, routeId, vehicleId, departureTime } = req.body;
    if (!staffId || !routeId || !vehicleId || !departureTime) {
        return res.status(400).json({ message: 'Missing required schedule fields.' });
    }
    try {
        const [maxIdResult] = await db.query('SELECT IFNULL(MAX(Schedule_ID), 0) + 1 as nextId FROM transport_schedules');
        const nextScheduleId = maxIdResult[0].nextId;
        const query = 'INSERT INTO transport_schedules (Schedule_ID, Staff_ID, Route_ID, Vehicle_ID, Departure_time) VALUES (?, ?, ?, ?, ?)';
        await db.query(query, [nextScheduleId, staffId, routeId, vehicleId, departureTime]);
        res.status(201).json({ message: `Schedule ID ${nextScheduleId} created successfully.`, id: nextScheduleId });
    } catch (err) {
        console.error('Error creating schedule:', err.message);
        res.status(500).json({ message: 'Failed to create schedule.' });
    }
});

// 10.2. Delete Schedule (DELETE)
router.delete('/transport/schedules/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM transport_schedules WHERE Schedule_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Schedule not found.' });
        }
        res.json({ message: `Schedule ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting schedule:', err.message);
        res.status(500).json({ 
            message: 'Deletion failed due to a database error.',
            error: err.code 
        });
    }
});

// 10.3. Update Schedule (UPDATE) - 🌟 NEW
router.put('/transport/schedules/:id', async (req, res) => {
    const { id } = req.params;
    const { staffId, routeId, vehicleId, departureTime } = req.body;

    if (!staffId || !routeId || !vehicleId || !departureTime) {
        return res.status(400).json({ message: 'Missing required schedule fields.' });
    }

    try {
        const query = `
            UPDATE transport_schedules
            SET Staff_ID = ?, Route_ID = ?, Vehicle_ID = ?, Departure_time = ?
            WHERE Schedule_ID = ?
        `;
        const [result] = await db.query(query, [staffId, routeId, vehicleId, departureTime, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Schedule not found.' });
        }
        res.json({ message: `Schedule ${id} updated successfully.` });
    } catch (err) {
        console.error('Error updating schedule:', err.message);
        res.status(500).json({ message: 'Failed to update schedule.' });
    }
});


module.exports = router;