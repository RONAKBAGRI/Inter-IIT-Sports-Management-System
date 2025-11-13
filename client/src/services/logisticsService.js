// client/src/services/logisticsService.js
import axios from 'axios';

const API_BASE_URL = 'https://inter-iit-sports-management-system.vercel.app/api/logistics'; 
// const API_BASE_URL = 'http://localhost:5000/api/logistics';

export const logisticsService = {
    // Get all equipment types with counts
    getEquipmentTypes: () => axios.get(`${API_BASE_URL}/equipment-types`),
    
    // Get all equipment items
    getEquipmentItems: () => axios.get(`${API_BASE_URL}/equipment-items`),
    
    // Get checkout history
    getCheckoutHistory: () => axios.get(`${API_BASE_URL}/checkout-history`),
    
    // Get participants for dropdown
    getParticipants: () => axios.get(`${API_BASE_URL}/participants`),
    
    // Checkout equipment
    checkoutEquipment: (data) => axios.post(`${API_BASE_URL}/checkout`, data),
    
    // Return equipment
    returnEquipment: (data) => axios.post(`${API_BASE_URL}/return`, data)
};

export default logisticsService;
