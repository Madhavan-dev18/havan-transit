import { Link, useLocation } from 'react-router-dom';

function Navbar({ onLogout }) {
  const location = useLocation();

  const navLinkStyle = (path) => ({
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '700',
    color: location.pathname === path ? '#0052cc' : '#64748b',
    borderBottom: location.pathname === path ? '2px solid #0052cc' : '2px solid transparent',
    paddingBottom: '4px',
    transition: 'all 0.2s ease'
  });

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ background: '#0052cc', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '18px', fontWeight: '800' }}>H</span>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Havan Bus</h1>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link to="/dashboard" style={navLinkStyle('/dashboard')}>Dashboard</Link>
        <Link to="/tickets" style={navLinkStyle('/tickets')}>My Tickets</Link>
        <button 
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#f8fafc'}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;