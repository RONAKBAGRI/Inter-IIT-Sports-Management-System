// client/src/pages/LogisticsManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LogisticsManagement = () => {
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [equipmentItems, setEquipmentItems] = useState([]);
    const [checkoutHistory, setCheckoutHistory] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form states
    const [checkoutForm, setCheckoutForm] = useState({
        item_id: '',
        staff_id: '',
        notes: ''
    });

    const API_BASE_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [typesRes, itemsRes, historyRes, staffRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/logistics/equipment-types`),
                axios.get(`${API_BASE_URL}/logistics/equipment-items`),
                axios.get(`${API_BASE_URL}/logistics/checkout-history`),
                axios.get(`${API_BASE_URL}/logistics/staff`)
            ]);
            
            setEquipmentTypes(typesRes.data);
            setEquipmentItems(itemsRes.data);
            setCheckoutHistory(historyRes.data);
            setStaff(staffRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error loading logistics data');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/logistics/checkout`, checkoutForm);
            alert('Equipment checked out successfully!');
            setCheckoutForm({
                item_id: '',
                staff_id: '',
                notes: ''
            });
            fetchAllData();
        } catch (error) {
            console.error('Error during checkout:', error);
            alert(error.response?.data?.error || 'Error during checkout');
        }
    };

    const handleReturn = async (checkoutId) => {
        try {
            await axios.post(`${API_BASE_URL}/logistics/return`, {
                checkout_id: checkoutId
            });
            alert('Equipment returned successfully!');
            fetchAllData();
        } catch (error) {
            console.error('Error during return:', error);
            alert(error.response?.data?.error || 'Error during return');
        }
    };

    const getAvailabilityStatus = (available, total) => {
        if (total === 0) return { class: 'status-out', text: 'No Stock' };
        const percentage = (available / total) * 100;
        if (percentage === 0) return { class: 'status-out', text: 'Out of Stock' };
        if (percentage < 25) return { class: 'status-low', text: 'Low Stock' };
        return { class: 'status-available', text: 'Available' };
    };

    if (loading) {
        return <div style={loadingStyle}>Loading logistics data...</div>;
    }

    return (
        <div style={containerStyle}>
            <h1>🏆 Equipment Logistics Management</h1>
            
            {/* Equipment Overview */}
            <div style={sectionStyle}>
                <h2>📊 Equipment Overview</h2>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Equipment Type</th>
                            <th style={thStyle}>Total Items</th>
                            <th style={thStyle}>Available</th>
                            <th style={thStyle}>In Use</th>
                            <th style={thStyle}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipmentTypes.map(type => {
                            const status = getAvailabilityStatus(type.available_items, type.total_items);
                            return (
                                <tr key={type.id}>
                                    <td style={tdStyle}>{type.name}</td>
                                    <td style={tdStyle}>{type.total_items}</td>
                                    <td style={tdStyle}>{type.available_items}</td>
                                    <td style={tdStyle}>{type.in_use_items}</td>
                                    <td style={{
                                        ...tdStyle,
                                        color: status.class === 'status-available' ? 'green' :
                                               status.class === 'status-low' ? 'orange' : 'red',
                                        fontWeight: 'bold'
                                    }}>
                                        {status.text}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Equipment Items */}
            <div style={sectionStyle}>
                <h2>📦 All Equipment Items</h2>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Item Code</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Condition</th>
                            <th style={thStyle}>Purchase Date</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipmentItems.map(item => (
                            <tr key={item.id}>
                                <td style={tdStyle}>{item.type_name}</td>
                                <td style={tdStyle}>{item.item_name}</td>
                                <td style={{
                                    ...tdStyle,
                                    color: item.status === 'Available' ? 'green' : 
                                           item.status === 'Issued' ? 'orange' : 'red',
                                    fontWeight: 'bold'
                                }}>
                                    {item.status}
                                </td>
                                <td style={{...tdStyle, textTransform: 'capitalize'}}>{item.condition_status}</td>
                                <td style={tdStyle}>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</td>
                                <td style={tdStyle}>
                                    <button 
                                        style={item.status === 'Available' ? buttonStyle : disabledButtonStyle}
                                        onClick={() => item.status === 'Available' && setCheckoutForm({...checkoutForm, item_id: item.id})}
                                        disabled={item.status !== 'Available'}
                                    >
                                        {item.status === 'Available' ? 'Select for Checkout' : 'Not Available'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Checkout Form */}
            <div style={sectionStyle}>
                <h2>✅ Checkout Equipment</h2>
                <form onSubmit={handleCheckoutSubmit} style={formStyle}>
                    <div style={formGroupStyle}>
                        <label>Select Equipment:</label>
                        <select 
                            value={checkoutForm.item_id}
                            onChange={(e) => setCheckoutForm({...checkoutForm, item_id: e.target.value})}
                            required
                            style={inputStyle}
                        >
                            <option value="">Choose equipment...</option>
                            {equipmentItems.filter(item => item.status === 'Available').map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.type_name} - {item.item_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div style={formGroupStyle}>
                        <label>Select Staff:</label>
                        <select 
                            value={checkoutForm.staff_id}
                            onChange={(e) => setCheckoutForm({...checkoutForm, staff_id: e.target.value})}
                            required
                            style={inputStyle}
                        >
                            <option value="">Choose staff member...</option>
                            {staff.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name} - {member.role_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div style={formGroupStyle}>
                        <label>Notes:</label>
                        <textarea 
                            value={checkoutForm.notes}
                            onChange={(e) => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                            rows="3"
                            style={inputStyle}
                        />
                    </div>
                    
                    <button type="submit" style={submitButtonStyle}>
                        Checkout Equipment
                    </button>
                </form>
            </div>

            {/* Checkout History */}
            <div style={sectionStyle}>
                <h2>📋 Checkout History</h2>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Equipment</th>
                            <th style={thStyle}>Staff Member</th>
                            <th style={thStyle}>Checkout Date</th>
                            <th style={thStyle}>Return Date</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checkoutHistory.map(checkout => (
                            <tr key={checkout.id}>
                                <td style={tdStyle}>{checkout.equipment_type} - {checkout.item_name}</td>
                                <td style={tdStyle}>{checkout.staff_name || 'N/A'}</td>
                                <td style={tdStyle}>{new Date(checkout.checkout_date).toLocaleDateString()}</td>
                                <td style={tdStyle}>{checkout.actual_return_date ? new Date(checkout.actual_return_date).toLocaleDateString() : 'Not Returned'}</td>
                                <td style={{ 
                                    ...tdStyle,
                                    textTransform: 'capitalize',
                                    color: checkout.status === 'returned' ? 'green' : 'orange'
                                }}>
                                    {checkout.status}
                                </td>
                                <td style={tdStyle}>
                                    {checkout.status === 'checked_out' ? (
                                        <button 
                                            style={returnButtonStyle}
                                            onClick={() => handleReturn(checkout.id)}
                                        >
                                            Return
                                        </button>
                                    ) : (
                                        'Completed'
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Styles
const containerStyle = {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
};

const sectionStyle = {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px'
};

const thStyle = {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold'
};

const tdStyle = {
    padding: '10px',
    borderBottom: '1px solid #ddd'
};

const formStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
};

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column'
};

const inputStyle = {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '5px'
};

const buttonStyle = {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
};

const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
};

const submitButtonStyle = {
    ...buttonStyle,
    gridColumn: 'span 2',
    fontSize: '16px',
    padding: '12px'
};

const returnButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745'
};

const loadingStyle = {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px'
};

export default LogisticsManagement;
