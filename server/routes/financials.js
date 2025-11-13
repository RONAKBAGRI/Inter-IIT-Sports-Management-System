// server/routes/financials.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// --- FINANCIAL TRANSACTIONS ROUTES ---
// (GET, POST, DELETE routes are unchanged)
// ...

// 1. Fetch All Transactions (READ)
router.get('/transactions', async (req, res) => {
    try {
        const [transactions] = await db.query(`
            SELECT 
                FT.Transaction_ID, FT.Amount, FT.Transaction_Date, FT.Payment_Status, FT.Type,
                P.Name AS Participant_Name, P.Participant_ID,
                E.Name AS Event_Name, E.Event_ID
            FROM financial_transactions FT
            JOIN participants P ON FT.Participant_ID = P.Participant_ID
            JOIN events E ON FT.Event_ID = E.Event_ID
            ORDER BY FT.Transaction_Date DESC
        `);
        res.json(transactions);
    } catch (err) {
        console.error('Error fetching financial transactions:', err);
        res.status(500).json({ message: 'Failed to fetch financial transactions.' });
    }
});

// 2. Add New Transaction (CREATE)
router.post('/transactions', async (req, res) => {
    const { participantId, eventId, amount, transactionDate, paymentStatus, type } = req.body;
    if (!participantId || !eventId || !amount || !transactionDate || !paymentStatus || !type) {
        return res.status(400).json({ message: 'Missing required transaction fields.' });
    }
    try {
        const [maxIdResult] = await db.query('SELECT IFNULL(MAX(Transaction_ID), 0) + 1 as nextId FROM financial_transactions');
        const nextTransactionId = maxIdResult[0].nextId;
        const query = `
            INSERT INTO financial_transactions 
            (Transaction_ID, Participant_ID, Event_ID, Amount, Transaction_Date, Payment_Status, Type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(query, [nextTransactionId, participantId, eventId, amount, transactionDate, paymentStatus, type]);
        res.status(201).json({
            message: `${type} transaction recorded successfully. ID: ${nextTransactionId}`,
            id: nextTransactionId
        });
    } catch (err) {
        console.error(`Error recording ${type} transaction:`, err.message);
        res.status(500).json({
            message: `Failed to record ${type} transaction due to a database error.`,
            error: err.code
        });
    }
});

// 2.1. Delete Transaction (DELETE)
router.delete('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM financial_transactions WHERE Transaction_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }
        res.json({ message: `Transaction ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting transaction:', err.message);
        res.status(500).json({ 
            message: 'Deletion failed. This transaction may be linked to other records.',
            error: err.code 
        });
    }
});

// 2.2. Update Transaction (UPDATE) - 🌟 NEW
router.put('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { participantId, eventId, amount, transactionDate, paymentStatus, type } = req.body;

    if (!participantId || !eventId || !amount || !transactionDate || !paymentStatus || !type) {
        return res.status(400).json({ message: 'Missing required transaction fields.' });
    }

    try {
        const query = `
            UPDATE financial_transactions
            SET Participant_ID = ?, Event_ID = ?, Amount = ?, Transaction_Date = ?, Payment_Status = ?, Type = ?
            WHERE Transaction_ID = ?
        `;
        const [result] = await db.query(query, [participantId, eventId, amount, transactionDate, paymentStatus, type, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }
        res.json({ message: `Transaction ${id} updated successfully.` });
    } catch (err) {
        console.error(`Error updating ${type} transaction:`, err.message);
        res.status(500).json({
            message: `Failed to update ${type} transaction due to a database error.`,
            error: err.code
        });
    }
});


// --- INCIDENT REPORTS ROUTES ---
// (GET, POST, DELETE routes are unchanged)
// ...

// 3. Fetch All Incident Reports (READ)
router.get('/incidents', async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT 
                IR.Report_ID, IR.Time, IR.Description, IR.Action_taken, IR.Severity,
                P.Name AS Participant_Name, P.Participant_ID,
                S.Name AS Staff_Reporter, S.Staff_ID
            FROM incident_reports IR
            JOIN staff S ON IR.Staff_ID = S.Staff_ID
            LEFT JOIN participants P ON IR.Participant_ID = P.Participant_ID
            ORDER BY IR.Time DESC
        `);
        res.json(reports);
    } catch (err) {
        console.error('Error fetching incident reports:', err);
        res.status(500).json({ message: 'Failed to fetch incident reports.' });
    }
});

// 4. Create New Incident Report (CREATE)
router.post('/incidents', async (req, res) => {
    const { participantId, staffId, description, severity, actionTaken } = req.body;
    if (!staffId || !description || !severity) {
        return res.status(400).json({ message: 'Missing required incident fields: Staff, Description, or Severity.' });
    }
    try {
        const [maxIdResult] = await db.query('SELECT IFNULL(MAX(Report_ID), 0) + 1 as nextId FROM incident_reports');
        const nextReportId = maxIdResult[0].nextId;
        const query = `
            INSERT INTO incident_reports 
            (Report_ID, Participant_ID, Staff_ID, Time, Description, Severity, Action_taken)
            VALUES (?, ?, ?, NOW(), ?, ?, ?)
        `;
        await db.query(query, [nextReportId, participantId || null, staffId, description, severity, actionTaken || null]);
        res.status(201).json({
            message: `Incident report ID ${nextReportId} filed successfully.`,
            id: nextReportId
        });
    } catch (err) {
        console.error('Error creating incident report:', err.message);
        res.status(500).json({
            message: 'Failed to create incident report.',
            error: err.code
        });
    }
});

// 4.1. Delete Incident (DELETE)
router.delete('/incidents/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM incident_reports WHERE Report_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Incident report not found.' });
        }
        res.json({ message: `Incident report ${id} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting incident:', err.message);
        res.status(500).json({ 
            message: 'Deletion failed. This incident may be linked to other records.',
            error: err.code 
        });
    }
});

// 4.2. Update Incident (UPDATE) - 🌟 NEW
router.put('/incidents/:id', async (req, res) => {
    const { id } = req.params;
    // Note: We don't update the Time of the incident
    const { participantId, staffId, description, severity, actionTaken } = req.body;
    
    if (!staffId || !description || !severity) {
        return res.status(400).json({ message: 'Missing required incident fields: Staff, Description, or Severity.' });
    }

    try {
        const query = `
            UPDATE incident_reports
            SET Participant_ID = ?, Staff_ID = ?, Description = ?, Severity = ?, Action_taken = ?
            WHERE Report_ID = ?
        `;
        const [result] = await db.query(query, [participantId || null, staffId, description, severity, actionTaken || null, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Incident report not found.' });
        }
        res.json({ message: `Incident report ${id} updated successfully.` });
    } catch (err) {
        console.error('Error updating incident report:', err.message);
        res.status(500).json({
            message: 'Failed to update incident report.',
            error: err.code
        });
    }
});

module.exports = router;