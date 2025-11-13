// client/src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
// 🌟 1. Import the lookup fetcher
import { fetchStandings, fetchRecentResults, fetchUpcomingMatches, fetchParticipantLookupData } from '../services/api';


function Dashboard() {
    const [standings, setStandings] = useState([]);
    const [recentResults, setRecentResults] = useState([]);
    const [upcomingMatches, setUpcomingMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // 🌟 2. Add state for the institute name map
    const [instituteMap, setInstituteMap] = useState({});


    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 🌟 3. Fetch lookup data along with other data
            const [standingsData, resultsData, upcomingData, lookupData] = await Promise.all([
                fetchStandings(),
                fetchRecentResults(),
                fetchUpcomingMatches(),
                fetchParticipantLookupData() // Fetches { institutes, hostels, messes }
            ]);
            
            setStandings(standingsData);
            setRecentResults(resultsData);
            setUpcomingMatches(upcomingData);

            // 🌟 4. Create the mapping from Short_Name to Name
            const newMap = {};
            if (lookupData.institutes) {
                lookupData.institutes.forEach(inst => {
                    // This creates an entry like: { "IITB": "Indian Institute of Technology Bombay" }
                    newMap[inst.Short_Name] = inst.Name;
                });
            }
            setInstituteMap(newMap); // Save the map to state

        } catch (err) {
            setError('Failed to load dashboard data from API. Check server and database connections.');
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        loadData();
    }, [loadData]);


    const tableHeaderStyle = { padding: '12px 10px', textAlign: 'left', fontWeight: '600' };
    const tableCellStyle = { padding: '12px 10px', borderRight: '1px solid #ddd' }; 
    
    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Dashboard...</div>;
    if (error) return <div style={{ color: 'var(--color-danger)', fontWeight: 'bold', padding: '40px' }}>Error: {error}</div>;


    // Helper component for match cards
    const MatchCard = ({ match, type }) => {
        const isUpcoming = type === 'Upcoming';
        const borderColor = isUpcoming ? 'var(--color-primary)' : 'var(--color-success)';
        const bgColor = isUpcoming ? '#e6f7ff' : '#e9f7ef'; // Light Blue or Light Green


        return (
            <div style={{
                padding: '15px',
                borderLeft: `4px solid ${borderColor}`,
                backgroundColor: bgColor,
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: 'var(--color-secondary)' }}>
                    {new Date(match.Start_time).toLocaleDateString()} {new Date(match.Start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} @ {match.Venue_Name}
                </p>
                <p style={{ margin: '0', fontWeight: 'bold', color: 'var(--color-dark)' }}>
                    {match.Event_Name}
                </p>
                <p style={{ margin: '5px 0 0 0', fontWeight: '600', color: borderColor, fontSize: '1.1em' }}>
                    {match.Competitors || (isUpcoming ? "Competitors TBD" : "N/A")}
                </p>
                {!isUpcoming && (
                    <p style={{ margin: '5px 0 0 0', color: 'var(--color-success)', fontWeight: 'bold', fontSize: '1.1em' }}>
                        Result: {match.Score_Summary || 'Score not detailed'}
                    </p>
                )}
            </div>
        );
    };


    return (
        <>
            <div style={{ padding: '0px' }}>
                <h2>Inter-IIT Sports Meet Dashboard</h2>
                
                {/* 1. Leaderboard Section (Full Width, Stacked Above) */}
                <div className="responsive-flex-container" style={{ marginBottom: 'var(--gap-base)' }}>
                    <div style={{ width: '100%', backgroundColor: 'var(--color-white)', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', padding: '20px' }}>
                        <h3 style={{ color: 'var(--color-primary-dark)', borderBottom: '2px solid var(--color-primary)', paddingBottom: '10px', margin: '0 0 15px 0' }}>
                            Overall Institute Standings
                        </h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1em' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--color-primary-dark)', color: 'var(--color-white)', position: 'sticky', top: 0 }}>
                                        <th style={{...tableHeaderStyle, width: '10%'}}>Rank</th>
                                        <th style={tableHeaderStyle}>Institute</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right', width: '30%'}}>Total Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {standings.map((s, index) => (
                                        <tr key={s.Institute} style={{ 
                                            borderBottom: '1px solid #e0e0e0', 
                                            backgroundColor: index % 2 === 0 ? 'var(--color-white)' : '#f5f5f5' 
                                        }}>
                                            <td style={{...tableCellStyle, fontWeight: 'bold', backgroundColor: index === 0 ? '#ffeb3b80' : (index === 1 ? '#c0c0c080' : (index === 2 ? '#cd7f3280' : undefined))}}>{index + 1}</td>
                                            
                                            {/* 🌟 5. Use the map to show the full name */}
                                            <td style={tableCellStyle}>
                                                {instituteMap[s.Institute] || s.Institute}
                                            </td>
                                            
                                            <td style={{...tableCellStyle, textAlign: 'right', fontWeight: 'bold'}}>{s.Total_points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>


                {/* 2. Upcoming & Recent Matches Section (Side-by-Side/Stacked) */}
                <div className="responsive-flex-container" style={{ display: 'flex', gap: 'var(--gap-base)', alignItems: 'flex-start', flexWrap: 'wrap' }}>


                    {/* --- Upcoming Matches --- */}
                    <div style={{ flex: '1 1 48%', minWidth: '350px', backgroundColor: 'var(--color-white)', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', padding: '20px' }}>
                        <h3 style={{ color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', paddingBottom: '10px', margin: '0 0 15px 0' }}>
                            Upcoming Matches 🔜
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {upcomingMatches.length > 0 ? (
                                upcomingMatches.map((m) => <MatchCard key={m.Match_ID} match={m} type="Upcoming" />)
                            ) : (
                                <p style={{ color: 'var(--color-secondary)', padding: '15px' }}>No matches currently scheduled.</p>
                            )}
                        </div>
                    </div>
                    
                    {/* --- Recent Completed Results --- */}
                    <div style={{ flex: '1 1 48%', minWidth: '350px', backgroundColor: 'var(--color-white)', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', padding: '20px' }}>
                        <h3 style={{ color: 'var(--color-success)', borderBottom: '2px solid var(--color-success)', paddingBottom: '10px', margin: '0 0 15px 0' }}>
                            Recent Completed Results ✅
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {recentResults.length > 0 ? (
                                recentResults.map((r) => <MatchCard key={r.Match_ID} match={r} type="Recent" />)
                            ) : (
                                <p style={{ color: 'var(--color-secondary)', padding: '15px' }}>No match results recorded yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


export default Dashboard;