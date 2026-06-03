import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SeatMap from '../components/SeatMap';

function Dashboard({ onBook }) {
  // Core Search State
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // App Engine State
  const [buses, setBuses] = useState([]);
  const [activeBusId, setActiveBusId] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerForms, setPassengerForms] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);

  useEffect(() => {
    fetchLiveBuses();
  }, []);

  const fetchLiveBuses = async () => {
    setLoading(true);
    setActiveBusId(null);
    setSelectedSeats([]);
    
    try {
      const token = localStorage.getItem('authToken');
      const params = {};
      if (source.trim()) params.source = source.trim();
      if (dest.trim()) params.dest = dest.trim();
      if (date) params.date = date;

      const response = await axios.get('http://127.0.0.1:8000/api/buses/', {
        headers: token ? { 'Authorization': `Token ${token}` } : {},
        params: params
      });
      
      setBuses(response.data);
      setSearchExecuted(true);
    } catch (err) {
      // Clean fallback if backend is offline during UI testing
      setBuses([]);
      setSearchExecuted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusForMapping = async (bus) => {
    if (activeBusId === bus.id) {
      setActiveBusId(null);
      setSelectedSeats([]);
      setPassengerForms({});
      return;
    }
    
    setLoadingSeats(true);
    setActiveBusId(bus.id);
    setSelectedSeats([]);
    setPassengerForms({});
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`http://127.0.0.1:8000/api/buses/${bus.id}/occupied-seats/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      setOccupiedSeats(response.data.occupied_seats);
    } catch (err) {
      setOccupiedSeats([]);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSeatToggleSelection = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
      const updatedForms = { ...passengerForms };
      delete updatedForms[seatId];
      setPassengerForms(updatedForms);
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
      setPassengerForms({
        ...passengerForms,
        [seatId]: { name: '', age: '', gender: 'Male' }
      });
    }
  };

  const handleInputChange = (seatId, field, value) => {
    setPassengerForms({
      ...passengerForms,
      [seatId]: { ...passengerForms[seatId], [field]: value }
    });
  };

  const validateAndSubmit = () => {
    for (const seatId of selectedSeats) {
      const form = passengerForms[seatId];
      if (!form || !form.name.trim() || !form.age) {
        alert(`Missing passenger details for seat: ${seatId}`);
        return;
      }
    }

    const structuredPayload = selectedSeats.map(seatId => ({
      seat: seatId,
      name: passengerForms[seatId].name.trim(),
      age: parseInt(passengerForms[seatId].age, 10),
      gender: passengerForms[seatId].gender
    }));

    if (onBook) onBook(activeBusId, structuredPayload);
    setActiveBusId(null);
    setSelectedSeats([]);
    setPassengerForms({});
  };

  return (
    <div style={{ padding: '20px', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      {/* --- RESPONSIVE SEARCH ENGINE BAR --- */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '16px', 
        backgroundColor: '#ffffff', 
        padding: '24px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        marginBottom: '32px',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>From</label>
          <input 
            type="text" 
            placeholder="Origin City" 
            value={source} 
            onChange={(e) => setSource(e.target.value)} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} 
          />
        </div>
        
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>To</label>
          <input 
            type="text" 
            placeholder="Destination City" 
            value={dest} 
            onChange={(e) => setDest(e.target.value)} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }} 
          />
        </div>

        <button 
          onClick={fetchLiveBuses}
          style={{ flex: '1 1 150px', padding: '14px', backgroundColor: '#0052cc', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', transition: 'background-color 0.2s' }}
        >
          Search Buses
        </button>
      </div>

      {/* --- LIVE RESULTS LISTING --- */}
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '20px' }}>
        {searchExecuted ? `Routes Found (${buses.length})` : 'Available Routes'}
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#0052cc', fontWeight: '600' }}>Fetching live registry...</div>
      ) : buses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          No routes available matching your search parameters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {buses.map((bus) => (
            <div key={bus.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              
              {/* Bus Details Row */}
              <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{bus.bus_name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: '#64748b' }}>
                    <span>Route: <strong style={{ color: '#0f172a' }}>{bus.source} → {bus.dest}</strong></span>
                    <span>Date: <strong style={{ color: '#0f172a' }}>{bus.date}</strong></span>
                    <span>Time: <strong style={{ color: '#0f172a' }}>{bus.time}</strong></span>
                  </div>
                </div>

                <div style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: '800', color: '#0052cc' }}>₹{bus.price}</span>
                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>{bus.available_seats} Seats Left</span>
                  </div>
                  <button
                    onClick={() => handleSelectBusForMapping(bus)}
                    style={{ padding: '12px 20px', backgroundColor: activeBusId === bus.id ? '#64748b' : '#0052cc', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {activeBusId === bus.id ? 'Close Map' : 'Select Seats'}
                  </button>
                </div>
              </div>

              {/* Collapsible Seating & Checkout Module */}
              {activeBusId === bus.id && (
                <div style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                  
                  {/* Grid Component */}
                  <div style={{ flex: '1 1 350px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
                    <SeatMap 
                      occupiedSeats={occupiedSeats} 
                      selectedSeats={selectedSeats} 
                      onSeatClick={handleSeatToggleSelection} 
                    />
                  </div>

                  {/* Passenger Detail Inputs */}
                  {selectedSeats.length > 0 && (
                    <div style={{ flex: '1 1 350px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Passenger Details</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1', overflowY: 'auto', maxHeight: '400px' }}>
                        {selectedSeats.map((seatId) => (
                          <div key={seatId} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #0052cc' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#0052cc', display: 'block', marginBottom: '12px' }}>Seat: {seatId}</span>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <input 
                                type="text" placeholder="Full Name" 
                                value={passengerForms[seatId]?.name || ''} 
                                onChange={(e) => handleInputChange(seatId, 'name', e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
                              />
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <input 
                                  type="number" placeholder="Age" 
                                  value={passengerForms[seatId]?.age || ''} 
                                  onChange={(e) => handleInputChange(seatId, 'age', e.target.value)}
                                  style={{ flex: '1', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
                                />
                                <select 
                                  value={passengerForms[seatId]?.gender || 'Male'} 
                                  onChange={(e) => handleInputChange(seatId, 'gender', e.target.value)}
                                  style={{ flex: '2', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' }}
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Checkout Summary */}
                      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '20px', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>
                          <span color="#0f172a">Total Amount:</span>
                          <span style={{ color: '#16a34a' }}>₹{selectedSeats.length * parseFloat(bus.price)}</span>
                        </div>
                        <button
                          onClick={validateAndSubmit}
                          style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
                        >
                          Book Ticket
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;