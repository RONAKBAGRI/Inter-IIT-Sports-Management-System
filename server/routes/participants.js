// server/routes/participants.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// --- Helper Routes (for frontend dropdowns) ---
// Fetches Institutes, Hostels, and Messes for use in the creation form
router.get('/data/lookup', async (req, res) => {
    try {
        // Query FIX: Changed table names to lowercase
        const [institutes] = await db.query('SELECT Institute_ID, Name, Short_Name FROM institutes');
        const [hostels] = await db.query('SELECT Hostel_ID, Hostel_Name, Institute_ID FROM hostels');
        const [messes] = await db.query('SELECT Mess_ID, Mess_Name, Institute_ID FROM messes');
        res.json({ institutes, hostels, messes });
    } catch (err) {
        console.error('Error fetching lookup data:', err);
        res.status(500).json({ message: 'Error fetching lookup data.' });
    }
});


// --- CRUD Operations for Participants ---

// 1. READ ALL Participants (Including joined data for display)
router.get('/', async (req, res) => {
    // **NEW LOGIC START**
    const { search } = req.query; // Get search term from query parameters
    // Query FIX: Changed table names to lowercase
    let sqlQuery = `
        SELECT 
            P.Participant_ID, P.Name, P.DOB, P.Gender, P.Email,
            I.Short_Name AS Institute, 
            H.Hostel_Name AS Hostel, 
            M.Mess_Name AS Mess
        FROM participants P
        JOIN institutes I ON P.Institute_ID = I.Institute_ID
        JOIN hostels H ON P.Hostel_ID = H.Hostel_ID
        JOIN messes M ON P.Mess_ID = M.Mess_ID
    `;
    const queryParams = [];

    if (search) {
        // Construct the WHERE clause for search functionality
        const searchTerm = `%${search}%`;
        sqlQuery += `
            WHERE P.Name LIKE ? OR I.Short_Name LIKE ? OR H.Hostel_Name LIKE ?
        `;
        queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    sqlQuery += `
        ORDER BY P.Institute_ID, P.Name
    `;
    // **NEW LOGIC END**

    try {
        const [results] = await db.query(sqlQuery, queryParams);
        res.json(results);
    } catch (err) {
        console.error('Database Error in GET /api/participants:', err);
        res.status(500).json({ message: 'Failed to fetch participants data.' });
    }
});

// 2. CREATE New Participant (POST)
router.post('/', async (req, res) => {
    const { name, dob, gender, email, hostelId, instituteId, messId } = req.body;
    
    // Simple validation (Add more robust validation in a real app)
    if (!name || !email || !instituteId) {
        return res.status(400).json({ message: 'Missing required participant fields.' });
    }

    try {
        // Query FIX: Changed table names to lowercase
        const query = `
            INSERT INTO participants 
            (Name, DOB, Gender, Email, Hostel_ID, Institute_ID, Mess_ID)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [name, dob, gender, email, hostelId, instituteId, messId]);

        res.status(201).json({ 
            message: 'Participant registered successfully.', 
            id: result.insertId 
        });
    } catch (err) {
        // Handle database errors (e.g., foreign key violations, duplicate emails)
        console.error('Error registering participant:', err.message);
        res.status(400).json({ 
            message: 'Registration failed. Check if email is unique or if IDs (Hostel, Institute, Mess) exist.',
            error: err.code 
        });
    }
});


// 3. UPDATE Participant (PUT) - Placeholder
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, hostelId, messId } = req.body;
    
    try {
        // Query FIX: Changed table names to lowercase
        const query = `
            UPDATE participants 
            SET Name = ?, Email = ?, Hostel_ID = ?, Mess_ID = ?
            WHERE Participant_ID = ?
        `;
        const [result] = await db.query(query, [name, email, hostelId, messId, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Participant not found.' });
        }

        res.json({ message: `Participant ${id} updated successfully.` });
    } catch (err) {
        console.error('Error updating participant:', err.message);
        res.status(400).json({ message: 'Update failed.' });
    }
});

// 4. DELETE Participant (DELETE) - 🌟 FINALIZED
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Query FIX: Changed table names to lowercase
        const [result] = await db.query('DELETE FROM participants WHERE Participant_ID = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Participant not found.' });
        }
        
        res.json({ message: `Participant ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting participant:', err.message);
        
        // Check for foreign key constraint violation
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ 
                message: 'Deletion failed. Participant is referenced in other records (e.g., Teams, Registrations, Incidents, or Transactions).',
                error: err.code 
            });
        }
        
        res.status(500).json({ 
            message: 'Deletion failed due to a database error.', 
            error: err.code 
        });
    }
});


module.exports = router;