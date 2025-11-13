const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware Setup
app.use(cors({
    // This correctly uses your environment variable for the hosted URL
    // and falls back to localhost for development.
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

// This app.listen block is for local development.
// Vercel ignores it but it's needed to run the server locally.
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

// This exports the app for Vercel's serverless environment.
// It MUST be the last line.
module.exports = app;