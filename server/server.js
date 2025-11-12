// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
// const port = process.env.PORT || 5000; // Vercel ignores this, you can remove it

// Middleware Setup
app.use(cors({
    // WARNING: This will need to change in production!
    // See section 4 below.
    origin: process.env.CLIENT_URL || 'http://localhost:5173' 
}));
app.use(express.json());

// Route Imports
const participantRoutes = require('./routes/participants');
const dashboardRoutes = require('./routes/dashboard'); 
const eventRoutes = require('./routes/events');
const logisticsRoutes = require('./routes/logistics');
const financialRoutes = require('./routes/financials');
const teamsRoutes = require('./routes/teams');

// Mount Routes
app.use('/api/participants', participantRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/events', eventRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/teams', teamsRoutes);

app.get('/', (req, res) => {
    res.send('Sports Management API is Running!');
});

// REMOVE THIS SECTION
// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// }); 

// ADD THIS LINE AT THE VERY END
module.exports = app;