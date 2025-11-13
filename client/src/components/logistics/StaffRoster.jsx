// client/src/components/logistics/StaffRoster.jsx
import React, { useState, useEffect, useCallback } from 'react';
// 🌟 Import updateStaffMember
import { fetchStaffRoster, fetchRolesLookup, createStaffMember, deleteStaffMember, updateStaffMember } from '../../services/api';

// --- Staff Registration Form Component ---
// 🌟 Now accepts staffToEdit and onSuccess
function StaffForm({ roles, staffToEdit, onSuccess, onToggle }) {
    
    const getInitialState = () => ({
        name: '', 
        dob: '', 
        email: '', 
        phone: '', 
        roleId: roles[0]?.Role_ID || ''
    });

    const [formData, setFormData] = useState(getInitialState());
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 🌟 Load data when staffToEdit prop changes
    useEffect(() => {
        if (staffToEdit) {
            setFormData({
                name: staffToEdit.Name,
                dob: new Date(staffToEdit.Date_of_Birth).toISOString().slice(0, 10),
                email: staffToEdit.Email,
                phone: staffToEdit.Phone || '',
                roleId: staffToEdit.Role_ID
            });
            setMessage('');
            setError('');
        } else {
            setFormData(getInitialState());
        }
    }, [staffToEdit, roles]); // Rerun if prop or roles list changes

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 🌟 handleSubmit now handles both Create and Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); 
        setError('');

        try {
            const dataToSend = {
                ...formData,
                roleId: parseInt(formData.roleId),
            };

            let result;
            if (staffToEdit) {
                // UPDATE
                result = await updateStaffMember(staffToEdit.Staff_ID, dataToSend);
            } else {
                // CREATE
                result = await createStaffMember(dataToSend);
            }
            
            setMessage(result.message);
            setError('');
            setFormData(getInitialState()); // Reset form
            onSuccess(); // Triggers list refresh and hides form
        } catch (err) {
            setError(err.message || 'Staff operation failed.');
        }
    };

    const isEditing = !!staffToEdit;

    return (
        <div style={{ padding: '20px', border: '1px solid #007bff40', borderRadius: '6px', backgroundColor: '#f0f8ff' }}>
            <h4 style={{ color: 'var(--color-primary-dark)', marginTop: 0 }}>
                {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h4>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input name="name" type="text" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                <input name="email" type="email" placeholder="Email (Unique)" value={formData.email} onChange={handleChange} required />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input name="dob" type="date" value={formData.dob} onChange={handleChange} required style={{ flex: 1 }} />
                    <input name="phone" type="tel" placeholder="Phone (Optional, Unique)" value={formData.phone} onChange={handleChange} style={{ flex: 1 }} />
                </div>
                
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Role:</label>
                <select name="roleId" value={formData.roleId} onChange={handleChange} required>
                    {roles.map(role => (
                        <option key={role.Role_ID} value={role.Role_ID}>{role.Role_Name}</option>
                    ))}
                </select>

                {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold', margin: '5px 0 0 0' }}>{message}</p>}
                {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold', margin: '5px 0 0 0' }}>{error}</p>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ flex: 2, backgroundColor: 'var(--color-primary)' }}>
                        {isEditing ? 'Save Changes' : 'Register Staff'}
                    </button>
                    <button type="button" onClick={onToggle} style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- Main Staff Roster Component ---
function StaffRoster({ refreshKey, onStaffUpdate }) {
    const [staff, setStaff] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    // 🌟 State for the staff member being edited
    const [staffToEdit, setStaffToEdit] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [staffData, rolesData] = await Promise.all([
                fetchStaffRoster(),
                fetchRolesLookup()
            ]);
            setStaff(staffData);
            setRoles(rolesData);
        } catch (err) {
            setError('Could not fetch logistics data. Check server connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete staff member ${id}? This may fail if they are linked to schedules or incidents.`)) {
            return;
        }
        try {
            const result = await deleteStaffMember(id);
            alert(result.message);
            loadData(); // Refresh the list
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // 🌟 Handler to set up the form for editing
    const handleEdit = (staffMember) => {
        setStaffToEdit(staffMember);
        setShowForm(true);
    };

    // 🌟 Handler to reset the form
    const handleToggleForm = () => {
        setShowForm(prev => !prev);
        setStaffToEdit(null); // Clear edit state when toggling
    };

    // 🌟 Handler for when form is submitted successfully
    const handleFormSuccess = () => {
        onStaffUpdate(); // This is the prop (re-fetches data via refreshKey)
        setStaffToEdit(null); // Clear edit state
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

    if (loading) return <p>Loading Staff Roster...</p>;
    if (error) return <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>Error: {error}</p>;

    return (
        <div>
            <h3 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                All Event Staff & Officials ({staff.length})
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
                {!showForm && (
                    <button onClick={handleToggleForm} style={{ backgroundColor: 'var(--color-primary)' }}>+ Register New Staff</button>
                )}
                {/* 🌟 Pass correct props to the form */}
                {showForm && (
                    <StaffForm 
                        onSuccess={handleFormSuccess} 
                        roles={roles} 
                        staffToEdit={staffToEdit}
                        onToggle={handleToggleForm}
                    />
                )}
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                            <th style={tableHeaderStyle}>ID</th>
                            <th style={tableHeaderStyle}>Name</th>
                            <th style={tableHeaderStyle}>Role</th>
                            <th style={tableHeaderStyle}>Email</th>
                            <th style={tableHeaderStyle}>Phone</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map((s, index) => (
                            <tr key={s.Staff_ID} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' }}>
                                <td style={tableCellStyle}>{s.Staff_ID}</td>
                                <td style={tableCellStyle}>{s.Name}</td>
                                <td style={tableCellStyle}>{s.Role_Name}</td>
                                <td style={tableCellStyle}>{s.Email}</td>
                                <td style={tableCellStyle}>{s.Phone || 'N/A'}</td>
                                <td style={tableCellStyle}>
                                    {/* 🌟 NEW: Edit button */}
                                    <button 
                                        onClick={() => handleEdit(s)}
                                        style={editButtonStyle}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(s.Staff_ID)}
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

export default StaffRoster;