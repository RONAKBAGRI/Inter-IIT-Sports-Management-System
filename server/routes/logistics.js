// server/routes/logistics.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// --- STAFF ROUTES ---

// 1. Fetch Staff Roster (READ)
router.get('/staff', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
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

// 2. Fetch Roles Lookup (for staff creation/update dropdowns)
router.get('/data/roles-list', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
        const [roles] = await db.query('SELECT Role_ID, Role_Name FROM roles ORDER BY Role_Name');
        res.json(roles);
    } catch (err) {
        console.error('Error fetching roles lookup data:', err);
        res.status(500).json({ message: 'Error fetching roles lookup data.' });
    }
});

// 3. Create New Staff Member (CREATE)
router.post('/staff', async (req, res) => {
    const { name, dob, email, phone, roleId } = req.body;
    
    if (!name || !email || !roleId) {
        return res.status(400).json({ message: 'Missing required staff fields (Name, Email, Role).' });
    }

    try {
        // Query FIX: Changed table names to lowercase
        const [lastStaff] = await db.query('SELECT IFNULL(MAX(Staff_ID), 0) + 1 AS NextID FROM staff');
        const nextStaffId = lastStaff[0].NextID;

        // Query FIX: Changed table names to lowercase
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

// --- EQUIPMENT ROUTES ---

// 4. Fetch Equipment Inventory (READ)
router.get('/equipment/inventory', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
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
        // Query FIX: Changed table names to lowercase
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

        // Query FIX: Changed table names to lowercase
        const [itemStatus] = await connection.query('SELECT Status FROM equipment_items WHERE Item_ID = ?', [itemId]);
        if (itemStatus.length === 0 || itemStatus[0].Status !== 'Available') {
            await connection.rollback();
            return res.status(400).json({ message: 'Item is not available for checkout (Status must be "Available").' });
        }

        // Query FIX: Changed table names to lowercase
        await connection.query("UPDATE equipment_items SET Status = 'Issued' WHERE Item_ID = ?", [itemId]);

        // Query FIX: Changed table names to lowercase
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

        // Query FIX: Changed table names to lowercase
        const [checkoutResult] = await connection.query(
            'UPDATE equipment_checkouts SET Checkin_time = NOW() WHERE Item_ID = ? AND Checkin_time IS NULL ORDER BY Checkout_time DESC LIMIT 1',
            [itemId]
        );

        if (checkoutResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'No active checkout found for this item.' });
        }

        // Query FIX: Changed table names to lowercase
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

// 8. Fetch Transport Routes (READ)
router.get('/transport/routes', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
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
        // Query FIX: Changed table names to lowercase
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

// 9. Fetch Transport Vehicles (READ)
router.get('/transport/vehicles', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
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
        // Query FIX: Changed table names to lowercase
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

// 10. Fetch Transport Schedules (READ)
router.get('/transport/schedules', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
        const [schedules] = await db.query(`
            SELECT 
                TS.Schedule_ID, TS.Departure_time,
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

// 10.1. Create New Schedule (CREATE) - ✅ FIXED
router.post('/transport/schedules', async (req, res) => {
    const { staffId, routeId, vehicleId, departureTime } = req.body;
    
    if (!staffId || !routeId || !vehicleId || !departureTime) {
        return res.status(400).json({ message: 'Missing required schedule fields.' });
    }

    try {
        // ✅ FIXED: Get next Schedule_ID manually
        // Query FIX: Changed table names to lowercase
        const [maxIdResult] = await db.query('SELECT IFNULL(MAX(Schedule_ID), 0) + 1 as nextId FROM transport_schedules');
        const nextScheduleId = maxIdResult[0].nextId;

        // Query FIX: Changed table names to lowercase
        const query = 'INSERT INTO transport_schedules (Schedule_ID, Staff_ID, Route_ID, Vehicle_ID, Departure_time) VALUES (?, ?, ?, ?, ?)';
        await db.query(query, [nextScheduleId, staffId, routeId, vehicleId, departureTime]);
        
        res.status(201).json({ message: `Schedule ID ${nextScheduleId} created successfully.`, id: nextScheduleId });
    } catch (err) {
        console.error('Error creating schedule:', err.message);
        res.status(500).json({ message: 'Failed to create schedule.' });
    }
});

module.exports = router;