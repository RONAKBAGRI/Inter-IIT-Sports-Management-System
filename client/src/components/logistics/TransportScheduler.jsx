// client/src/components/logistics/TransportScheduler.jsx
import React, { useState, useEffect, useCallback } from 'react';
// 🌟 Import all update functions
import { 
    fetchTransportRoutes, fetchTransportVehicles, fetchTransportSchedules, 
    createTransportRoute, createTransportVehicle, createTransportSchedule, 
    fetchStaffRoster,
    deleteTransportRoute, deleteTransportVehicle, deleteTransportSchedule,
    updateTransportRoute, updateTransportVehicle, updateTransportSchedule
} from '../../services/api';

// --- Sub-Component: Route Form ---
// 🌟 Now accepts itemToEdit and onSuccess
function RouteForm({ onCreation: onSuccess, onToggle, itemToEdit }) {
    const getInitialState = () => ({ routeId: '', routeName: '', description: '' });
    const [formData, setFormData] = useState(getInitialState());
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 🌟 Load data when itemToEdit prop changes
    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                routeId: itemToEdit.Route_ID, // This field is read-only
                routeName: itemToEdit.Route_Name,
                description: itemToEdit.Description || ''
            });
            setMessage('');
            setError('');
        } else {
            setFormData(getInitialState());
        }
    }, [itemToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');
        try {
            let result;
            if (itemToEdit) {
                // UPDATE (Cannot update ID)
                result = await updateTransportRoute(itemToEdit.Route_ID, { 
                    routeName: formData.routeName, 
                    description: formData.description 
                });
            } else {
                // CREATE
                result = await createTransportRoute(formData);
            }
            setMessage(result.message);
            onSuccess(); // Refresh list and hide form
            setFormData(getInitialState()); // Reset form
        } catch (err) {
            setError(err.message || 'Route operation failed.');
        }
    };

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const isEditing = !!itemToEdit;

    return (
        <div style={{ padding: '15px', border: '1px solid #28a745', borderRadius: '6px', backgroundColor: '#e9f7ef' }}>
            <h4 style={{ color: 'var(--color-success)', marginTop: 0 }}>
                {isEditing ? 'Edit Route' : 'Add New Route'}
            </h4>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Route ID is a primary key, cannot be edited. Can be disabled. */}
                <input name="routeId" type="number" placeholder="Route ID (e.g., 21)" value={formData.routeId} onChange={handleChange} required disabled={isEditing} />
                <input name="routeName" type="text" placeholder="Route Name (e.g., Airport Express)" value={formData.routeName} onChange={handleChange} required />
                <textarea name="description" placeholder="Description (Optional)" value={formData.description} onChange={handleChange} rows="2" />
                {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{message}</p>}
                {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ flex: 2, backgroundColor: 'var(--color-success)' }}>
                        {isEditing ? 'Save Changes' : 'Create Route'}
                    </button>
                    <button type="button" onClick={onToggle} style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}>Hide</button>
                </div>
            </form>
        </div>
    );
}

// --- Sub-Component: Vehicle Form ---
// 🌟 Now accepts itemToEdit and onSuccess
function VehicleForm({ onCreation: onSuccess, routes, onToggle, itemToEdit }) {
    const getInitialState = () => ({
        vehicleId: '', 
        vehicleName: '', 
        licensePlate: '', 
        capacity: '', 
        defaultRouteId: routes[0]?.Route_ID || ''
    });
    
    const [formData, setFormData] = useState(getInitialState());
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setFormData(p => ({ ...p, defaultRouteId: routes[0]?.Route_ID || '' }));
    }, [routes]);
    
    // 🌟 Load data when itemToEdit prop changes
    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                vehicleId: itemToEdit.Vehicle_ID, // This field is read-only
                vehicleName: itemToEdit.Vehicle_Name,
                licensePlate: itemToEdit.License_plate,
                capacity: itemToEdit.Capacity,
                defaultRouteId: itemToEdit.Default_Route_ID
            });
            setMessage('');
            setError('');
        } else {
            setFormData(getInitialState());
        }
    }, [itemToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');
        try {
            const dataToSend = { 
                ...formData, 
                vehicleId: parseInt(formData.vehicleId), 
                capacity: parseInt(formData.capacity), 
                defaultRouteId: parseInt(formData.defaultRouteId) 
            };
            
            let result;
            if (itemToEdit) {
                // UPDATE (Cannot update ID)
                result = await updateTransportVehicle(itemToEdit.Vehicle_ID, dataToSend);
            } else {
                // CREATE
                result = await createTransportVehicle(dataToSend);
            }
            
            setMessage(result.message);
            onSuccess();
            setFormData(getInitialState());
        } catch (err) {
            setError(err.message || 'Vehicle operation failed.');
        }
    };

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const isEditing = !!itemToEdit;

    return (
        <div style={{ padding: '15px', border: '1px solid #007bff', borderRadius: '6px', backgroundColor: '#f0f8ff' }}>
            <h4 style={{ color: 'var(--color-primary)', marginTop: 0 }}>
                {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h4>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input name="vehicleId" type="number" placeholder="Vehicle ID (e.g., 75)" value={formData.vehicleId} onChange={handleChange} required disabled={isEditing} />
                <input name="vehicleName" type="text" placeholder="Vehicle Name (e.g., Mini Bus 7)" value={formData.vehicleName} onChange={handleChange} required />
                <input name="licensePlate" type="text" placeholder="License Plate (e.g., TN01ZZ9999)" value={formData.licensePlate} onChange={handleChange} required />
                <input name="capacity" type="number" placeholder="Capacity" value={formData.capacity} onChange={handleChange} required min="1" />
                <select name="defaultRouteId" value={formData.defaultRouteId} onChange={handleChange} required>
                    {routes.map(r => <option key={r.Route_ID} value={r.Route_ID}>{r.Route_Name}</option>)}
                </select>
                {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{message}</p>}
                {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ flex: 2, backgroundColor: 'var(--color-primary)' }}>
                        {isEditing ? 'Save Changes' : 'Create Vehicle'}
                    </button>
                    <button type="button" onClick={onToggle} style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}>Hide</button>
                </div>
            </form>
        </div>
    );
}

// --- Sub-Component: Schedule Form ---
// 🌟 Now accepts itemToEdit and onSuccess
function ScheduleForm({ onCreation: onSuccess, routes, vehicles, staff, onToggle, itemToEdit }) {
    
    const getInitialState = () => ({
        staffId: staff[0]?.Staff_ID || '', 
        routeId: routes[0]?.Route_ID || '', 
        vehicleId: vehicles[0]?.Vehicle_ID || '', 
        departureTime: new Date().toISOString().slice(0, 16)
    });

    const [formData, setFormData] = useState(getInitialState());
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itemToEdit) { // Only set defaults if creating
            setFormData(p => ({ 
                ...p, 
                staffId: staff[0]?.Staff_ID || '', 
                routeId: routes[0]?.Route_ID || '', 
                vehicleId: vehicles[0]?.Vehicle_ID || '' 
            }));
        }
    }, [routes, vehicles, staff, itemToEdit]);

    // 🌟 Load data when itemToEdit prop changes
    useEffect(() => {
        if (itemToEdit) {
            // Format YYYY-MM-DDTHH:MM
            const localTime = new Date(itemToEdit.Departure_time).toISOString().slice(0, 16);
            
            setFormData({
                staffId: itemToEdit.Staff_ID,
                routeId: itemToEdit.Route_ID,
                vehicleId: itemToEdit.Vehicle_ID,
                departureTime: localTime
            });
            setMessage('');
            setError('');
        } else {
            setFormData(getInitialState());
        }
    }, [itemToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');
        try {
            const dataToSend = { 
                staffId: parseInt(formData.staffId), 
                routeId: parseInt(formData.routeId), 
                vehicleId: parseInt(formData.vehicleId), 
                departureTime: formData.departureTime.replace('T', ' ') + ':00' // Format YYYY-MM-DD HH:MM:SS
            };
            
            let result;
            if (itemToEdit) {
                // UPDATE
                result = await updateTransportSchedule(itemToEdit.Schedule_ID, dataToSend);
            } else {
                // CREATE
                result = await createTransportSchedule(dataToSend);
            }
            
            setMessage(result.message);
            onSuccess();
            setFormData(getInitialState()); // Reset form
        } catch (err) {
            setError(err.message || 'Schedule operation failed.');
        }
    };

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const isEditing = !!itemToEdit;
    
    if (routes.length === 0 || vehicles.length === 0 || staff.length === 0) {
        return <p style={{ color: 'var(--color-warning)' }}>Loading dependencies or missing data to create a schedule.</p>;
    }

    return (
        <div style={{ padding: '15px', border: '1px solid var(--color-primary-dark)', borderRadius: '6px', backgroundColor: '#f0f8ff' }}>
            <h4 style={{ color: 'var(--color-primary-dark)', marginTop: 0 }}>
                {isEditing ? 'Edit Schedule' : 'Create New Schedule'}
            </h4>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Driver (Staff):</label>
                <select name="staffId" value={formData.staffId} onChange={handleChange} required>
                    {staff.map(s => <option key={s.Staff_ID} value={s.Staff_ID}>{s.Name}</option>)}
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Route:</label>
                <select name="routeId" value={formData.routeId} onChange={handleChange} required>
                    {routes.map(r => <option key={r.Route_ID} value={r.Route_ID}>{r.Route_Name}</option>)}
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Vehicle:</label>
                <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} required>
                    {vehicles.map(v => <option key={v.Vehicle_ID} value={v.Vehicle_ID}>{v.Vehicle_Name} ({v.License_plate})</option>)}
                </select>
                
                <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>Departure Time:</label>
                <input name="departureTime" type="datetime-local" value={formData.departureTime} onChange={handleChange} required />
                
                {message && <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{message}</p>}
                {error && <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</p>}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ flex: 2, backgroundColor: 'var(--color-primary)' }}>
                        {isEditing ? 'Save Changes' : 'Schedule Trip'}
                    </button>
                    <button type="button" onClick={onToggle} style={{ flex: 1, backgroundColor: 'var(--color-secondary)' }}>Hide</button>
                </div>
            </form>
        </div>
    );
}

// --- Main Transport Scheduler Component ---
function TransportScheduler({ refreshKey, onScheduleUpdate }) {
    const [routes, setRoutes] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeForm, setActiveForm] = useState(null); // 'route', 'vehicle', 'schedule'
    
    // 🌟 State for items being edited
    const [routeToEdit, setRouteToEdit] = useState(null);
    const [vehicleToEdit, setVehicleToEdit] = useState(null);
    const [scheduleToEdit, setScheduleToEdit] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [routesData, vehiclesData, schedulesData, staffData] = await Promise.all([
                fetchTransportRoutes(),
                fetchTransportVehicles(),
                fetchTransportSchedules(),
                fetchStaffRoster() 
            ]);
            setRoutes(routesData);
            setVehicles(vehiclesData);
            setSchedules(schedulesData);
            setStaff(staffData);
        } catch (err) {
            setError('Could not fetch transport data. Check server connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

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

    // 🌟 Clear all edit states
    const clearEditStates = () => {
        setRouteToEdit(null);
        setVehicleToEdit(null);
        setScheduleToEdit(null);
    };

    const handleFormToggle = (formName) => {
        if (activeForm === formName) {
            setActiveForm(null);
            clearEditStates(); // Clear edit state if closing form
        } else {
            setActiveForm(formName);
            clearEditStates(); // Clear edit state when switching forms
        }
    };

    const handleCreation = () => {
        loadData(); // Reload data
        onScheduleUpdate(); // Propagate update
        // Don't close form, just clear edit state
        clearEditStates();
    };
    
    // 🌟 Handlers to set up forms for editing
    const handleEditRoute = (route) => {
        setRouteToEdit(route);
        setActiveForm('route');
    };
    const handleEditVehicle = (vehicle) => {
        setVehicleToEdit(vehicle);
        setActiveForm('vehicle');
    };
    const handleEditSchedule = (schedule) => {
        setScheduleToEdit(schedule);
        setActiveForm('schedule');
    };

    // Generic Delete Handler
    const handleDelete = async (type, id) => {
        let deleteFunction;
        let itemType;
        
        switch(type) {
            case 'route':
                deleteFunction = deleteTransportRoute;
                itemType = 'route';
                break;
            case 'vehicle':
                deleteFunction = deleteTransportVehicle;
                itemType = 'vehicle';
                break;
            case 'schedule':
                deleteFunction = deleteTransportSchedule;
                itemType = 'schedule';
                break;
            default:
                return;
        }

        if (!window.confirm(`Are you sure you want to delete ${itemType} ${id}? This may fail if it is in use.`)) {
            return;
        }

        try {
            const result = await deleteFunction(id);
            alert(result.message);
            loadData(); // Refresh all data
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    if (loading) return <p>Loading Transport Data...</p>;
    if (error) return <p style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>Error: {error}</p>;
    
    const renderRoutes = () => (
        <div style={{ marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '6px' }}>
            <h4 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>
                Defined Routes ({routes.length}) 
                <button onClick={() => handleFormToggle('route')} style={{ float: 'right', backgroundColor: activeForm === 'route' ? 'var(--color-danger)' : 'var(--color-success)', padding: '5px 10px', fontSize: '0.9em' }}>
                    {activeForm === 'route' ? 'Cancel' : '+ Route'}
                </button>
            </h4>
            {activeForm === 'route' && (
                <RouteForm 
                    onCreation={handleCreation} 
                    onToggle={() => handleFormToggle('route')} 
                    itemToEdit={routeToEdit}
                />
            )}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                            <th style={tableHeaderStyle}>ID</th>
                            <th style={tableHeaderStyle}>Route Name</th>
                            <th style={tableHeaderStyle}>Description</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routes.map((r, index) => (
                            <tr key={r.Route_ID} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' }}>
                                <td style={tableCellStyle}>{r.Route_ID}</td>
                                <td style={tableCellStyle}>{r.Route_Name}</td>
                                <td style={tableCellStyle}>{r.Description}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => handleEditRoute(r)} style={editButtonStyle}>Edit</button>
                                    <button onClick={() => handleDelete('route', r.Route_ID)} style={deleteButtonStyle}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderVehicles = () => (
        <div style={{ marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '6px' }}>
            <h4 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>
                Vehicle Fleet ({vehicles.length})
                <button onClick={() => handleFormToggle('vehicle')} style={{ float: 'right', backgroundColor: activeForm === 'vehicle' ? 'var(--color-danger)' : 'var(--color-success)', padding: '5px 10px', fontSize: '0.9em' }}>
                    {activeForm === 'vehicle' ? 'Cancel' : '+ Vehicle'}
                </button>
            </h4>
            {activeForm === 'vehicle' && (
                <VehicleForm 
                    onCreation={handleCreation} 
                    routes={routes} 
                    onToggle={() => handleFormToggle('vehicle')} 
                    itemToEdit={vehicleToEdit}
                />
            )}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                            <th style={tableHeaderStyle}>Name / ID</th>
                            <th style={tableHeaderStyle}>Plate</th>
                            <th style={tableHeaderStyle}>Capacity</th>
                            <th style={tableHeaderStyle}>Default Route</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map((v, index) => (
                            <tr key={v.Vehicle_ID} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' }}>
                                <td style={tableCellStyle}>{v.Vehicle_Name} ({v.Vehicle_ID})</td>
                                <td style={tableCellStyle}>{v.License_plate}</td>
                                <td style={tableCellStyle}>{v.Capacity}</td>
                                <td style={tableCellStyle}>{v.Default_Route_Name}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => handleEditVehicle(v)} style={editButtonStyle}>Edit</button>
                                    <button onClick={() => handleDelete('vehicle', v.Vehicle_ID)} style={deleteButtonStyle}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSchedules = () => (
        <div style={{ marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '6px' }}>
            <h4 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>
                Current Schedules ({schedules.length})
                <button onClick={() => handleFormToggle('schedule')} style={{ float: 'right', backgroundColor: activeForm === 'schedule' ? 'var(--color-danger)' : 'var(--color-success)', padding: '5px 10px', fontSize: '0.9em' }}>
                    {activeForm === 'schedule' ? 'Cancel' : '+ Schedule'}
                </button>
            </h4>
            {activeForm === 'schedule' && (
                <ScheduleForm 
                    onCreation={handleCreation} 
                    routes={routes} 
                    vehicles={vehicles} 
                    staff={staff} 
                    onToggle={() => handleFormToggle('schedule')} 
                    itemToEdit={scheduleToEdit}
                />
            )}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                            <th style={tableHeaderStyle}>Schedule ID</th>
                            <th style={tableHeaderStyle}>Route</th>
                            <th style={tableHeaderStyle}>Time</th>
                            <th style={tableHeaderStyle}>Vehicle</th>
                            <th style={tableHeaderStyle}>Driver</th>
                            <th style={tableHeaderStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.map((s, index) => (
                            <tr key={s.Schedule_ID} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' }}>
                                <td style={tableCellStyle}>{s.Schedule_ID}</td>
                                <td style={tableCellStyle}>{s.Route_Name}</td>
                                <td style={tableCellStyle}>{new Date(s.Departure_time).toLocaleString()}</td>
                                <td style={tableCellStyle}>{s.Vehicle_Name} ({s.License_plate})</td>
                                <td style={tableCellStyle}>{s.Staff_Driver}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => handleEditSchedule(s)} style={editButtonStyle}>Edit</button>
                                    <button onClick={() => handleDelete('schedule', s.Schedule_ID)} style={deleteButtonStyle}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- Main Render ---
    return (
        <div>
            <h3 style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                Transport Routes & Scheduling Overview
            </h3>
            
            <div className="responsive-flex-container" style={{ display: 'flex', gap: 'var(--gap-base)', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    {renderRoutes()}
                </div>
                <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    {renderVehicles()}
                </div>
            </div>
            
            {renderSchedules()}
        </div>
    );
}

export default TransportScheduler;