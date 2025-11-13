// client/src/pages/ParticipantManagement.jsx
import React, { useState } from 'react';
import ParticipantForm from '../components/ParticipantForm.jsx';
import ParticipantList from '../components/ParticipantList.jsx';

function ParticipantManagement() {
    const [refreshKey, setRefreshKey] = useState(0); 
    // State to hold the participant being edited
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    const handleParticipantSave = () => {
        setRefreshKey(prev => prev + 1);
        // Clear the selected participant after a save (create or update)
        setSelectedParticipant(null);
    };

    return (
        <div>
            <h2>👤 Participant Roster Management</h2>
            
            <div className="responsive-flex-container" style={{ 
                display: 'flex', 
                gap: 'var(--gap-base)', 
                alignItems: 'flex-start', 
                flexWrap: 'wrap'
            }}>
                
                {/* Participant Form: Takes up a smaller width */}
                <div style={{ flex: '1 1 30%', minWidth: '300px' }}>
                    {/* Pass the participant to the form */}
                    <ParticipantForm 
                        onSave={handleParticipantSave} 
                        participantToEdit={selectedParticipant} 
                    />
                </div>
                
                {/* Participant List: Takes up the remaining width */}
                <div style={{ flex: '2 1 65%', minWidth: '400px' }}>
                    {/* Pass the 'setter' to the list */}
                    <ParticipantList 
                        refreshKey={refreshKey} 
                        onEdit={setSelectedParticipant} 
                    />
                </div>
            </div>
        </div>
    );
}

export default ParticipantManagement;