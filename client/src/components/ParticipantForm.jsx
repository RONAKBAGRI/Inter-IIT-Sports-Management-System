// client/src/components/ParticipantForm.jsx
import React, { useState, useEffect } from 'react';
import { createParticipant, fetchParticipantLookupData, updateParticipant } from '../services/api';

// Accept 'participantToEdit' prop
function ParticipantForm({ onSave, participantToEdit }) {
    
    // Define a reusable initial state function
    const getInitialFormData = (institutes = [], hostels = [], messes = []) => {
        const initialInstituteId = institutes[0]?.Institute_ID || '';
        const initialHostelId = hostels[0]?.Hostel_ID || '';
        const defaultHostel = hostels.find(h => h.Hostel_ID === initialHostelId);
        const defaultHostInstituteId = defaultHostel ? defaultHostel.Institute_ID : null;
        const initialFilteredMesses = messes.filter(m => m.Institute_ID === defaultHostInstituteId);
        const initialMessId = initialFilteredMesses[0]?.Mess_ID || '';

        return {
            name: '', 
            dob: '', 
            gender: 'M', 
            email: '', 
            hostelId: initialHostelId, 
            instituteId: initialInstituteId, 
            messId: initialMessId 
        };
    };

    const [formData, setFormData] = useState(getInitialFormData());
    const [lookupData, setLookupData] = useState({ institutes: [], hostels: [], messes: [] });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Load lookup data (hostels, messes, etc.) on component mount
    useEffect(() => {
        fetchParticipantLookupData().then(data => {
            setLookupData(data);
            // Set initial form data using the loaded lookup data
            // This runs only once and sets the defaults for a NEW entry
            setFormData(getInitialFormData(data.institutes, data.hostels, data.messes));
        }).catch(() => setError('Failed to load dependency data.'));
    }, []);

    // Watch for changes to 'participantToEdit'
    useEffect(() => {
        if (participantToEdit) {
            // If participantToEdit exists, fill the form with its data
            setFormData({
                name: participantToEdit.Name,
                dob: new Date(participantToEdit.DOB).toISOString().slice(0, 10), // Format date for input
                gender: participantToEdit.Gender,
                email: participantToEdit.Email,
                hostelId: participantToEdit.Hostel_ID,
                instituteId: participantToEdit.Institute_ID,
                messId: participantToEdit.Mess_ID
            });
            setMessage(''); // Clear any old messages
            setError('');
        } else {
            // If it's null (e.g., after saving or cancelling), reset the form
            setFormData(getInitialFormData(lookupData.institutes, lookupData.hostels, lookupData.messes));
        }
    }, [participantToEdit, lookupData]); // Rerun when prop or lookup data changes

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Mess filtering logic (no changes)
    const currentHostelId = formData.hostelId;
    const selectedHostel = lookupData.hostels.find(h => h.Hostel_ID === parseInt(currentHostelId));
    const hostingInstituteId = selectedHostel ? selectedHostel.Institute_ID : null;
    const filteredMesses = lookupData.messes.filter(m => m.Institute_ID === hostingInstituteId);

    const handleHostelChange = (e) => {
        const newHostelId = e.target.value;
        const newSelectedHostel = lookupData.hostels.find(h => h.Hostel_ID === parseInt(newHostelId));
        const newHostingInstituteId = newSelectedHostel ? newSelectedHostel.Institute_ID : null;
        const newFilteredMesses = lookupData.messes.filter(m => m.Institute_ID === newHostingInstituteId);
        const newMessId = newFilteredMesses[0]?.Mess_ID || '';
        setFormData(prev => ({ 
            ...prev, 
            hostelId: newHostelId, 
            messId: newMessId
        }));
    };

    // Function to clear the form and notify parent
    const clearForm = () => {
        setFormData(getInitialFormData(lookupData.institutes, lookupData.hostels, lookupData.messes));
        setMessage('');
        setError('');
        onSave(); // This notifies the parent to set selectedParticipant to null
    };

    // Updated handleSubmit to handle both Create and Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!formData.messId && filteredMesses.length > 0) {
             return setError('Please select a valid Mess.');
        }
        if (filteredMesses.length === 0 && lookupData.messes.length > 0) {
            return setError('No valid Mess available for the selected Hostel/Institute.');
        }
        
        try {
            const dataToSend = {
                ...formData,
                instituteId: parseInt(formData.instituteId),
                hostelId: parseInt(formData.hostelId),
                messId: parseInt(formData.messId)
            };

            let result;
            if (participantToEdit) {
                // UPDATE logic
                result = await updateParticipant(participantToEdit.Participant_ID, dataToSend);
            } else {
                // CREATE logic
                result = await createParticipant(dataToSend);
            }

            setMessage(result.message);
            onSave(); // Notifies parent to refresh list AND clear selection
        } catch (err) {
            setError(err.message || 'An unknown error occurred.');
        }
    };

    // Dynamic title and button text
    const isEditing = !!participantToEdit;
    const formTitle = isEditing ? '👤 Edit Athlete' : '👤 Register Athlete';
    const submitButtonText = isEditing ? 'Save Changes' : 'Submit Registration';

    return (
        <div style={{ 
            padding: '20px', 
            backgroundColor: 'var(--color-white)', 
            borderRadius: '8px', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
        }}>
            <h3 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                {formTitle}
            </h3>
            {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Athlete Details */}
                <input name="name" type="text" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                <input name="email" type="email" placeholder="Email (Unique)" value={formData.email} onChange={handleChange} required />
                <label style={{ fontSize: '0.8em', color: 'var(--color-secondary)', marginTop: '-10px' }}>Date of Birth</label>
                <input name="dob" type="date" value={formData.dob} onChange={handleChange} required style={{ marginTop: '-10px' }}/>
                
                <select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                </select>

                {/* Home Institute */}
                <label style={{ fontWeight: 'bold', marginTop: '10px', color: 'var(--color-dark)' }}>Home Institute:</label>
                <select name="instituteId" value={formData.instituteId} onChange={handleChange} required>
                    {lookupData.institutes.map(inst => (
                        <option key={inst.Institute_ID} value={inst.Institute_ID}>{inst.Short_Name} - {inst.Name}</option>
                    ))}
                </select>
                
                {/* Accommodation - HOSTEL */}
                <label style={{ fontWeight: 'bold', marginTop: '10px', color: 'var(--color-dark)' }}>Assigned Hostel (Hosting Inst):</label>
                <select name="hostelId" value={formData.hostelId} onChange={handleHostelChange} required>
                    {lookupData.hostels.map(hostel => (
                        <option key={hostel.Hostel_ID} value={hostel.Hostel_ID}>
                            {hostel.Hostel_Name} (Inst: {hostel.Institute_ID})
                        </option>
                    ))}
                </select>

                {/* Accommodation - MESS (Filtered) */}
                <label style={{ fontWeight: 'bold', color: 'var(--color-dark)' }}>Assigned Mess (Filtered):</label>
                <select name="messId" value={formData.messId} onChange={handleChange} required disabled={filteredMesses.length === 0}>
                    {filteredMesses.length > 0 ? (
                        filteredMesses.map(mess => (
                            <option key={mess.Mess_ID} value={mess.Mess_ID}>
                                {mess.Mess_Name} (Inst: {mess.Institute_ID})
                            </option>
                        ))
                    ) : (
                        <option value="">-- No Messes for this Hostel's Institute --</option>
                    )}
                </select>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" disabled={filteredMesses.length === 0 && lookupData.messes.length > 0} style={{ flex: 2 }}>
                        {submitButtonText}
                    </button>
                    {/* Cancel button only shows when editing */}
                    {isEditing && (
                        <button 
                            type="button" 
                            onClick={clearForm} 
                            style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default ParticipantForm;