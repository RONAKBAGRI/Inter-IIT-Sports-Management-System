// server/routes/logistics.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET all equipment types with counts
router.get('/equipment-types', async (req, res) => {
    try {
        const query = `
            SELECT 
                et.Type_ID as id,
                et.Type_Name as name,
                '' as description,
                COUNT(ei.Item_ID) as total_items,
                SUM(CASE WHEN ei.Status = 'Available' THEN 1 ELSE 0 END) as available_items,
                SUM(CASE WHEN ei.Status = 'Issued' THEN 1 ELSE 0 END) as in_use_items
            FROM equipment_types et
            LEFT JOIN equipment_items ei ON et.Type_ID = ei.Type_ID
            GROUP BY et.Type_ID, et.Type_Name
            ORDER BY et.Type_Name
        `;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching equipment types:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET all equipment items with details
router.get('/equipment-items', async (req, res) => {
    try {
        const query = `
            SELECT 
                ei.Item_ID as id,
                ei.Type_ID as type_id,
                ei.Item_Code as item_name,
                ei.Status as status,
                ei.Conditions as condition_status,
                ei.Purchase_Date as purchase_date,
                et.Type_Name as type_name,
                CASE WHEN ei.Status = 'Available' THEN 1 ELSE 0 END as available_quantity,
                1 as total_quantity
            FROM equipment_items ei
            JOIN equipment_types et ON ei.Type_ID = et.Type_ID
            ORDER BY et.Type_Name, ei.Item_Code
        `;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching equipment items:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET checkout history
router.get('/checkout-history', async (req, res) => {
    try {
        const query = `
            SELECT 
                ec.Checkout_ID as id,
                ec.Item_ID as item_id,
                ec.Staff_ID as staff_id,
                ec.Checkout_time as checkout_date,
                ec.Checkin_time as actual_return_date,
                ei.Item_Code as item_name,
                et.Type_Name as equipment_type,
                s.Name as staff_name,
                CASE 
                    WHEN ec.Checkin_time IS NULL THEN 'checked_out'
                    ELSE 'returned'
                END as status,
                1 as quantity_checked_out,
                DATE_ADD(ec.Checkout_time, INTERVAL 7 DAY) as expected_return_date
            FROM equipment_checkouts ec
            JOIN equipment_items ei ON ec.Item_ID = ei.Item_ID
            JOIN equipment_types et ON ei.Type_ID = et.Type_ID
            LEFT JOIN staff s ON ec.Staff_ID = s.Staff_ID
            ORDER BY ec.Checkout_time DESC
        `;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching checkout history:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST checkout equipment
router.post('/checkout', async (req, res) => {
    try {
        const { item_id, staff_id, notes } = req.body;
        
        // Check if equipment is available
        const [itemResult] = await db.query('SELECT Status FROM equipment_items WHERE Item_ID = ?', [item_id]);
        
        if (itemResult.length === 0) {
            return res.status(404).json({ error: 'Equipment item not found' });
        }
        
        if (itemResult[0].Status !== 'Available') {
            return res.status(400).json({ error: 'Equipment is not available for checkout' });
        }
        
        // Create checkout record
        const [result] = await db.query(
            'INSERT INTO equipment_checkouts (Staff_ID, Item_ID, Checkout_time) VALUES (?, ?, NOW())',
            [staff_id, item_id]
        );
        
        // Update equipment status to Issued
        await db.query(
            'UPDATE equipment_items SET Status = "Issued" WHERE Item_ID = ?',
            [item_id]
        );
        
        res.status(201).json({ id: result.insertId, message: 'Equipment checked out successfully' });
    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST return equipment
router.post('/return', async (req, res) => {
    try {
        const { checkout_id } = req.body;
        
        // Get checkout details
        const [checkout] = await db.query('SELECT * FROM equipment_checkouts WHERE Checkout_ID = ?', [checkout_id]);
        
        if (checkout.length === 0) {
            return res.status(404).json({ error: 'Checkout record not found' });
        }
        
        if (checkout[0].Checkin_time !== null) {
            return res.status(400).json({ error: 'Equipment already returned' });
        }
        
        // Update checkout record with return time
        await db.query(
            'UPDATE equipment_checkouts SET Checkin_time = NOW() WHERE Checkout_ID = ?',
            [checkout_id]
        );
        
        // Update equipment status back to Available
        await db.query(
            'UPDATE equipment_items SET Status = "Available" WHERE Item_ID = ?',
            [checkout[0].Item_ID]
        );
        
        res.json({ message: 'Equipment returned successfully' });
    } catch (error) {
        console.error('Error during return:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET staff for dropdown
router.get('/staff', async (req, res) => {
    try {
        const query = `
            SELECT 
                s.Staff_ID as id,
                s.Name as name,
                r.Role_Name as role_name
            FROM staff s
            JOIN roles r ON s.Role_ID = r.Role_ID
            ORDER BY s.Name
        `;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
