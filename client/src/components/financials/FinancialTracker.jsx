// client/src/components/financials/FinancialTracker.jsx
import React, { useState, useEffect, useCallback } from 'react';
// 🌟 Import updateTransaction
import { fetchTransactions, createTransaction, fetchParticipants, fetchEventLookupData, deleteTransaction, updateTransaction } from '../../services/api';

// --- Transaction Form Component ---
// 🌟 Now accepts transactionToEdit and onSuccess
function TransactionForm({ onCreation: onSuccess, onToggle, transactionToEdit }) {
    
    const getInitialState = (participants, events) => ({
        participantId: participants[0]?.Participant_ID || '', 
        eventId: events[0]?.Event_ID || '', 
        amount: '', 
        transactionDate: new Date().toISOString().slice(0, 10), 
        paymentStatus: 'Paid', 
        type: 'Fine' 
    });
    
    const [formData, setFormData] = useState(getInitialState([], []));
    const [lookup, setLookup] = useState({ participants: [], events: [] });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Load lookup data
    useEffect(() => {
        const loadLookup = async () => {
            try {
                const [participantsData, eventData] = await Promise.all([
                    fetchParticipants(),
                    fetchEventLookupData()
                ]);
                
                setLookup({ participants: participantsData, events: eventData.events });
                
                // Set defaults only if not editing
                if (!transactionToEdit) {
                    setFormData(getInitialState(participantsData, eventData.events));
                }
            } catch (err) {
                setError('Failed to load required lookup data.');
            }
        };
        loadLookup();
    }, [transactionToEdit]); // Rerun if transactionToEdit is cleared

    // 🌟 Load data when transactionToEdit prop changes
    useEffect(() => {
        if (transactionToEdit) {
            setFormData({
                participantId: transactionToEdit.Participant_ID,
                eventId: transactionToEdit.Event_ID,
                amount: transactionToEdit.Amount,
                transactionDate: new Date(transactionToEdit.Transaction_Date).toISOString().slice(0, 10),
                paymentStatus: transactionToEdit.Payment_Status,
                type: transactionToEdit.Type
            });
            setMessage('');
            setError('');
        }
        // No 'else' block needed, loadLookup effect handles initial state
    }, [transactionToEdit]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setMessage(''); setError('');
    };

    // 🌟 handleSubmit now handles both Create and Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');

        const dataToSend = {
            ...formData,
            participantId: parseInt(formData.participantId),
            eventId: parseInt(formData.eventId),
            amount: parseFloat(formData.amount),
        };
        
        try {
            let result;
            if (transactionToEdit) {
                // UPDATE
                result = await updateTransaction(transactionToEdit.Transaction_ID, dataToSend);
            } else {
                // CREATE
                result = await createTransaction(dataToSend);
            }
            
            setMessage(result.message);
            onSuccess(); // Triggers list refresh and hides form
            setFormData(getInitialState(lookup.participants, lookup.events)); // Reset fields
        } catch (err) {
            setError(err.message || 'Transaction operation failed.');
        }
    };

    const isEditing = !!transactionToEdit;

    return (
        <div style={{ padding: '15px', border: '1px solid var(--color-success)', borderRadius: '6px', backgroundColor: '#e9f7ef', marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--color-dark)', marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                {isEditing ? 'Edit Transaction' : 'Record New Transaction'}
            </h4>
            {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Participant:</label>
                <select name="participantId" value={formData.participantId} onChange={handleChange} required>
                    {lookup.participants.map(p => (
                        <option key={p.Participant_ID} value={p.Participant_ID}>{p.Name} ({p.Institute})</option>
                    ))}
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Associated Event:</label>
                <select name="eventId" value={formData.eventId} onChange={handleChange} required>
                    {lookup.events.map(e => (
                        <option key={e.Event_ID} value={e.Event_ID}>{e.Event_Name} ({e.Event_ID})</option>
                    ))}
                </select>
                
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Transaction Type:</label>
                <select name="type" value={formData.type} onChange={handleChange} required>
                    <option value="Fine">Fine</option>
                    <option value="Sponsorship">Sponsorship</option>
                    <option value="Registration">Registration</option>
                </select>

                <input name="amount" type="number" placeholder="Amount (e.g., 150.00)" value={formData.amount} onChange={handleChange} required min="0.01" step="0.01"/>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} required style={{ flex: 1 }}>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Refunded">Refunded</option>
                    </select>
                    <input name="transactionDate" type="date" value={formData.transactionDate} onChange={handleChange} required style={{ flex: 1 }}/>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ flex: 2, backgroundColor: 'var(--color-success)' }}>
                        {isEditing ? 'Save Changes' : 'Record Transaction'}
                    </button>
                    <button type="button" onClick={onToggle} style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- Main Financial Tracker Component ---
function FinancialTracker({ refreshKey, onUpdate }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    // 🌟 State for the transaction being edited
    const [transactionToEdit, setTransactionToEdit] = useState(null);

    const loadTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTransactions();
            setTransactions(data);
        } catch (err) {
            setError('Could not fetch financial transactions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions, refreshKey]);

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete transaction ${id}?`)) {
            return;
        }
        try {
            const result = await deleteTransaction(id);
            alert(result.message);
            loadTransactions(); // Refresh the list
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // 🌟 Handler to set up the form for editing
    const handleEdit = (transaction) => {
        setTransactionToEdit(transaction);
        setShowForm(true);
    };

    // 🌟 Handler to reset the form
    const handleToggleForm = () => {
        setShowForm(prev => !prev);
        setTransactionToEdit(null); // Clear edit state when toggling
    };

    // 🌟 Handler for when form is submitted successfully
    const handleFormSuccess = () => {
        onUpdate(); // This is the prop (re-fetches data via refreshKey)
        setTransactionToEdit(null); // Clear edit state
        setShowForm(false); // Hide the form
    };

    const tableHeaderStyle = { padding: '12px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.2)', fontWeight: '600' };
    const tableCellStyle = { padding: '10px', borderRight: '1px solid #ddd' };

    const editButtonStyle = {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-white)',
        border: 'none',
        padding: '5px 8px',
        fontSize: '0.8em',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '5px'
    };
    
    const deleteButtonStyle = {
        backgroundColor: 'var(--color-danger)',
        color: 'var(--color-white)',
        border: 'none',
        padding: '5px 8px',
        fontSize: '0.8em',
        borderRadius: '4px',
        cursor: 'pointer'
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Paid': return 'var(--color-success)';
            case 'Pending': return 'var(--color-warning)';
            case 'Refunded': return 'var(--color-primary)';
            default: return 'var(--color-secondary)';
        }
    }

    if (loading) return <p>Loading Financial Transactions...</p>;
    if (error) return <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>Error: {error}</p>;

    return (
        <div>
            <h3 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                All Financial Transactions ({transactions.length})
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
                {!showForm && (
                    <button onClick={handleToggleForm} style={{ backgroundColor: 'var(--color-success)' }}>+ Record New Transaction</button>
                )}
                {/* 🌟 Pass correct props to the form */}
                {showForm && (
                    <TransactionForm 
                        onCreation={handleFormSuccess} 
                        onToggle={handleToggleForm} 
                        transactionToEdit={transactionToEdit}
                    />
                )}
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                            <th style={tableHeaderStyle}>ID</th>
                            <th style={tableHeaderStyle}>Date</th>
                            <th style={tableHeaderStyle}>Participant</th>
                            <th style={tableHeaderStyle}>Type / Event</th>
                            <th style={tableHeaderStyle}>Amount</th>
                            <th style={tableHeaderStyle}>Status</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t, index) => (
                            <tr key={t.Transaction_ID} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' }}>
                                <td style={tableCellStyle}>{t.Transaction_ID}</td>
                                <td style={tableCellStyle}>{new Date(t.Transaction_Date).toLocaleDateString()}</td>
                                <td style={tableCellStyle}>{t.Participant_Name} ({t.Participant_ID})</td>
                                <td style={tableCellStyle}>{t.Type} / {t.Event_Name}</td>
                                <td style={tableCellStyle}>₹{parseFloat(t.Amount).toFixed(2)}</td> 
                                <td style={{...tableCellStyle, color: getStatusColor(t.Payment_Status), fontWeight: 'bold'}}>
                                    {t.Payment_Status.toUpperCase()}
                                </td>
                                <td style={tableCellStyle}>
                                    {/* 🌟 NEW: Edit button */}
                                    <button 
                                        onClick={() => handleEdit(t)}
                                        style={editButtonStyle}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(t.Transaction_ID)}
                                        style={deleteButtonStyle}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default FinancialTracker;