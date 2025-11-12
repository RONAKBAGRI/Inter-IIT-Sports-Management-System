// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import ParticipantManagement from './pages/ParticipantManagement.jsx';
import EventManagement from './pages/EventManagement.jsx';
import LogisticsManagement from './pages/LogisticsManagement.jsx';
import FinancialsAndIncidents from './pages/FinancialsAndIncidents.jsx';
import TeamsManagement from './pages/TeamsManagement.jsx'; // NEW

function App() {
    return (
        <Router>
            <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
                {/* Navigation Header */}
                <header style={headerStyle}>
                    <div style={logoStyle}>
                        Inter-IIT Sports Management System
                    </div>
                    <nav style={navStyle}>
                        <Link to="/" style={linkStyle}>Dashboard</Link>
                        <Link to="/participants" style={linkStyle}>Participants</Link>
                        <Link to="/events" style={linkStyle}>Events</Link>
                        <Link to="/teams" style={linkStyle}>Teams</Link> {/* NEW */}
                        <Link to="/logistics" style={linkStyle}>Logistics</Link>
                        <Link to="/financials" style={linkStyle}>Others</Link>
                    </nav>
                </header>

                {/* Main Content Area: Routes */}
                <main style={mainStyle}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/participants" element={<ParticipantManagement />} />
                        <Route path="/events" element={<EventManagement />} />
                        <Route path="/teams" element={<TeamsManagement />} /> {/* NEW */}
                        <Route path="/logistics" element={<LogisticsManagement />} />
                        <Route path="/financials" element={<FinancialsAndIncidents />} />
                        <Route path="*" element={<div>404 Page Not Found</div>} />
                    </Routes>
                </main>
            </div>
            {/* FOOTER - FIXED VERSION - No Overflow, No White Space */}
            <footer style={{
                background: '#1565C0',
                color: '#ffffff',
                padding: '20px 0 10px 0',
                marginTop: '40px'
            }}>
                <div style={{
                    maxWidth: '1300px',   // <- Set this to match your header/container/card's maxWidth
                    margin: '0 auto',
                    padding: '0 20px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 3px 0' }}>
                            Inter IIT Sports Management System
                        </h3>
                        <p style={{ fontSize: '12px', margin: 0, color: '#E3F2FD', fontStyle: 'italic' }}>
                            Inter-IIT Tech Meet 2025
                        </p>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '12px 0' }}></div>

                    <div style={{ marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#E3F2FD', textAlign: 'center' }}>
                            Development Team
                        </h4>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {['Ronak Bagri','Nishchay Chaudhary', 'Sachin Kumar', 'Sunny Kumar', 'Anish Kumar'].map(name => (
                                <div key={name} style={{ 
                                    fontSize: '12px', 
                                    padding: '4px 12px', 
                                    background: 'rgba(255, 255, 255, 0.1)', 
                                    borderRadius: '4px' 
                                }}>
                                    {name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.2)', margin: '12px 0' }}></div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        fontSize: '11px',
                        flexWrap: 'wrap',
                        gap: '15px',
                        textAlign: 'center'
                    }}>
                        <div>
                            <span style={{ color: '#E3F2FD' }}>Email: </span>
                            <span>support@inter-iit-sports.edu</span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                        <div>
                            <span style={{ color: '#E3F2FD' }}>Repository: </span>
                            <span>https://github.com/nishchaychaudhary1729/interiit-sports-management-system</span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                        <div style={{ color: '#E3F2FD' }}>
                            © 2025 Inter-IIT Sports
                        </div>
                    </div>
                </div>
            </footer>
        </Router>
    );
}

const headerStyle = {
    background: 'var(--color-primary-dark, #1a365d)',
    color: '#fff',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const logoStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold'
};

const navStyle = {
    display: 'flex',
    gap: '1.5rem'
};

const linkStyle = {
    color: '#fff',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background 0.3s',
    fontSize: '0.95rem',
    fontWeight: '500'
};

const mainStyle = {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
};



export default App;
