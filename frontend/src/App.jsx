import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';

// Change this line
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://havan-bus-booking-engine.onrender.com/api/';

function ProtectedLayout({ token, message, onLogout, children }) {
  if (!token) return <Navigate to="/login" />;
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' }}>
      <Navbar onLogout={onLogout} />
      {message.text && (
        <div style={{ 
          padding: '12px 20px', 
          backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4', 
          color: message.type === 'error' ? '#991b1b' : '#166534', 
          borderRadius: '8px', 
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          marginBottom: '20px', 
          fontWeight: '600' 
        }}>
          {message.text}
        </div>
      )}
      {children}
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { 'Authorization': `Token ${token}` } : {},
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleGlobalLogin = async (username, password, navigate) => {
    try {
      const response = await axios.post(`${API_BASE_URL}login/`, { username, password });
      const receivedToken = response.data.token;
      localStorage.setItem('authToken', receivedToken);
      setToken(receivedToken);
      showMessage('success', 'Authentication successful.');
      navigate('/dashboard'); 
    } catch (err) {
      console.error("Login authentication failure:", err);
      showMessage('error', 'Invalid credentials. Please try again.');
    }
  };

  // YOU COMPLETELY MISSED THIS ENTIRE FUNCTION
  const handleGlobalRegister = async (username, email, password, navigate) => {
    try {
      const response = await axios.post(`${API_BASE_URL}register/`, { username, email, password });
      const receivedToken = response.data.token;
      
      localStorage.setItem('authToken', receivedToken);
      setToken(receivedToken);
      
      showMessage('success', 'Account created successfully! Welcome to Havan Bus.');
      navigate('/dashboard'); 
    } catch (err) {
      console.error("Registration failure:", err);
      const errorMsg = err.response?.data?.username?.[0] || 'Registration rejected. Username may already be taken.';
      showMessage('error', errorMsg);
    }
  };

  const handleGlobalLogout = () => {
    localStorage.removeItem('authToken');
    setToken('');
    setBookings([]);
  };

  const fetchBookings = async () => {
    try { 
      const response = await api.get('bookings/'); 
      setBookings(response.data); 
    } catch (err) {
      console.error("Failed to sync ledger:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleBookTicket = async (busId, passengerPayload) => {
    try {
      await api.post('bookings/', { 
        bus_id: busId, 
        passenger_details: passengerPayload 
      });
      showMessage('success', 'Seats successfully reserved! PDF generating...');
      fetchBookings();
    } catch (err) {
      const serverError = err.response?.data?.error || 'Booking execution dropped by backend.';
      showMessage('error', serverError);
    }
  };

  const handleDownloadTicket = async (bookingId, ticketUuid) => {
    try {
      const response = await api.get(`bookings/${bookingId}/download/`, {
        responseType: 'blob'
      });
      
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const virtualLink = document.createElement('a');
      virtualLink.href = blobUrl;
      virtualLink.setAttribute('download', `HavanTicket_${ticketUuid}.pdf`);
      
      document.body.appendChild(virtualLink);
      virtualLink.click();
      
      virtualLink.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download ticket failure:", err);
      alert('Unable to capture PDF stream. The background worker may still be rendering the file.');
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        
        {/* AND YOU MISSED PASSING IT HERE */}
        <Route path="/login" element={<Login onLogin={handleGlobalLogin} onRegister={handleGlobalRegister} message={message} />} />
        
        <Route path="/dashboard" element={
          <ProtectedLayout token={token} message={message} onLogout={handleGlobalLogout}>
            <Dashboard onBook={handleBookTicket} />
          </ProtectedLayout>
        } />
        
        <Route path="/tickets" element={
          <ProtectedLayout token={token} message={message} onLogout={handleGlobalLogout}>
            <Tickets bookings={bookings} onDownload={handleDownloadTicket} />
          </ProtectedLayout>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;