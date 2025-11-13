// client/src/components/financials/IncidentLog.jsx
import React, { useState, useEffect, useCallback } from 'react';
// 🌟 Import updateIncident
import { createIncident, fetchIncidents, fetchParticipants, fetchStaffRoster, deleteIncident, updateIncident } from '../../services/api';

// --- Incident Filing Form Component ---
// 🌟 Now accepts incidentToEdit and onSuccess
function IncidentForm({ onCreation: onSuccess, onToggle, incidentToEdit }) {
    
    const getInitialState = (participants, staff) => ({
        participantId: participants[0]?.Participant_ID || '', 
        staffId: staff[0]?.Staff_ID || '', 
        description: '', 
        severity: 'Medium', 
        actionTaken: '' 
    });

    const [formData, setFormData] = useState(getInitialState([], []));
    const [lookup, setLookup] = useState({ participants: [], staff: [] });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Load lookup data
    useEffect(() => {
        const loadLookup = async () => {
            try {
                const [participantsData, staffData] = await Promise.all([
                    fetchParticipants(),
                    fetchStaffRoster()
                ]);
                
                setLookup({ participants: participantsData, staff: staffData });
                
                // Set defaults only if not editing
                if (!incidentToEdit) {
                    setFormData(getInitialState(participantsData, staffData));
                }
            } catch (err) {
                setError('Failed to load required lookup data for Participants/Staff.');
            }
        };
        loadLookup();
    }, [incidentToEdit]); // Rerun if incidentToEdit is cleared

    // 🌟 Load data when incidentToEdit prop changes
    useEffect(() => {
        if (incidentToEdit) {
            setFormData({
                participantId: incidentToEdit.Participant_ID || '',
                staffId: incidentToEdit.Staff_ID,
                description: incidentToEdit.Description,
                severity: incidentToEdit.Severity,
                actionTaken: incidentToEdit.Action_taken || ''
            });
            setMessage('');
            setError('');
        }
        // No 'else' block needed, loadLookup effect handles initial state
    }, [incidentToEdit]);

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
            participantId: formData.participantId ? parseInt(formData.participantId) : null,
            staffId: parseInt(formData.staffId),
        };
        
        try {
            let result;
            if (incidentToEdit) {
                // UPDATE
                result = await updateIncident(incidentToEdit.Report_ID, dataToSend);
            } else {
                // CREATE
                result = await createIncident(dataToSend);
            }
            
            setMessage(result.message);
            onSuccess(); // Triggers list refresh and hides form
            setFormData(getInitialState(lookup.participants, lookup.staff)); // Reset fields
        } catch (err) {
            setError(err.message || 'Incident operation failed.');
        }
    };

    const isEditing = !!incidentToEdit;

    return (
        <div style={{ padding: '15px', border: '1px solid var(--color-danger)', borderRadius: '6px', backgroundColor: '#fff6f7', marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--color-dark)', marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                {isEditing ? 'Edit Incident Report' : 'File New Incident Report'}
            </h4>
            {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Reporting Staff:</label>
                <select name="staffId" value={formData.staffId} onChange={handleChange} required>
                    {lookup.staff.map(s => (
                        <option key={s.Staff_ID} value={s.Staff_ID}>{s.Name} ({s.Role_Name})</option>
                    ))}
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Affected Participant (Optional):</label>
                <select name="participantId" value={formData.participantId} onChange={handleChange}>
                    <option value="">-- N/A (General Incident) --</option>
                    {lookup.participants.map(p => (
                        <option key={p.Participant_ID} value={p.Participant_ID}>{p.Name} ({p.Institute})</option>
                    ))}
                </select>
                
                <textarea name="description" placeholder="Detailed Description of Incident" value={formData.description} onChange={handleChange} required rows="3"/>
                
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Severity:</label>
                <select name="severity" value={formData.severity} onChange={handleChange} required>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                </select>
                
                <input name="actionTaken" type="text" placeholder="Action Taken (Optional)" value={formData.actionTaken} onChange={handleChange} />

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ flex: 2, backgroundColor: 'var(--color-danger)' }}>
                        {isEditing ? 'Save Changes' : 'File Report'}
                    </button>
                    <button type="button" onClick={onToggle} style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}


// --- Main Incident Log Component ---
function IncidentLog({ refreshKey, onUpdate }) {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    // 🌟 State for the incident being edited
    const [incidentToEdit, setIncidentToEdit] = useState(null);

    const loadIncidents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchIncidents();
            setIncidents(data);
        } catch (err) {
            setError('Could not fetch incident reports.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIncidents();
    }, [loadIncidents, refreshKey]);

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete incident report ${id}?`)) {
            return;
        }
        try {
            const result = await deleteIncident(id);
            alert(result.message);
            loadIncidents(); // Refresh the list
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // 🌟 Handler to set up the form for editing
    const handleEdit = (incident) => {
        setIncidentToEdit(incident);
        setShowForm(true);
    };

    // 🌟 Handler to reset the form
    const handleToggleForm = () => {
        setShowForm(prev => !prev);
        setIncidentToEdit(null); // Clear edit state when toggling
    };

    // 🌟 Handler for when form is submitted successfully
    const handleFormSuccess = () => {
        onUpdate(); // This is the prop (re-fetches data via refreshKey)
        setIncidentToEdit(null); // Clear edit state
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

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'High': return 'var(--color-danger)';
            case 'Medium': return 'var(--color-warning)';
            case 'Low': return 'var(--color-success)';
            default: return 'var(--color-secondary)';
        }
    }

    if (loading) return <p>Loading Incident Reports...</p>;
    if (error) return <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>Error: {error}</p>;

    return (
        <div>
            <h3 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                Reported Incidents ({incidents.length})
            </h3>

            <div style={{ marginBottom: '20px' }}>
                {!showForm && (
                    <button onClick={handleToggleForm} style={{ backgroundColor: 'var(--color-danger)' }}>+ File New Incident</button>
                )}
                {/* 🌟 Pass correct props to the form */}
                {showForm && (
                    <IncidentForm 
                        onCreation={handleFormSuccess} 
                        onToggle={handleToggleForm} 
                        incidentToEdit={incidentToEdit}
                    />
                )}
            </div>
            
            <div style={{ maxHeight: '500px', overflowY: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                            <th style={tableHeaderStyle}>ID</th>
                            <th style={tableHeaderStyle}>Time</th>
                            <th style={tableHeaderStyle}>Severity</th>
                            <th style={tableHeaderStyle}>Reporter</th>
                            <th style={tableHeaderStyle}>Participant</th>
                            <th style={tableHeaderStyle}>Description</th>
                            <th style={tableHeaderStyle}>Action Taken</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incidents.map((i, index) => (
                            <tr key={i.Report_ID} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' }}>
                                <td style={tableCellStyle}>{i.Report_ID}</td>
                                <td style={tableCellStyle}>{new Date(i.Time).toLocaleString()}</td>
                                <td style={{...tableCellStyle, color: getSeverityColor(i.Severity), fontWeight: 'bold'}}>{i.Severity}</td>
                                <td style={tableCellStyle}>{i.Staff_Reporter}</td>
                                <td style={tableCellStyle}>{i.Participant_Name || 'N/A'}</td>
                                <td style={{...tableCellStyle, maxWidth: '200px', whiteSpace: 'normal'}}>{i.Description}</td>
                                <td style={tableCellStyle}>{i.Action_taken || 'PENDING'}</td>
                                <td style={tableCellStyle}>
                                    {/* 🌟 NEW: Edit button */}
                                    <button 
                                        onClick={() => handleEdit(i)}
                                        style={editButtonStyle}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(i.Report_ID)}
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

export default IncidentLog;