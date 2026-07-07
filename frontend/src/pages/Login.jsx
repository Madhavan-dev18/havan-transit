import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin, onRegister, message }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegistering) {
      if (onRegister) {
        onRegister(username, email, password, navigate);
      } else {
        // Fallback alert if App.jsx hasn't been wired for registration yet
        alert("Registration payload captured. Wire 'onRegister' in App.jsx to execute.");
      }
    } else {
      onLogin(username, password, navigate);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '20px',
      margin: 0,
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        padding: '40px 30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 82, 204, 0.06)',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          color: '#0052cc',
          margin: '0 0 6px 0',
          letterSpacing: '-0.8px'
        }}>Havan Bus</h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: '0 0 32px 0',
          fontWeight: '500'
        }}>
          {isRegistering ? 'Create a new passenger account' : 'Sign in to book your journey'}
        </p>

        {message.text && (
          <div style={{
            padding: '12px 14px',
            background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: message.type === 'error' ? '#991b1b' : '#166534',
            borderRadius: '8px',
            border: `1px solid ${message.type === 'error' ? '#fee2e2' : '#bbf7d0'}`,
            marginBottom: '24px',
            fontSize: '13px',
            textAlign: 'left',
            fontWeight: '500'
          }}>
            {message.type === 'error' ? '⚠️ ' : '✅ '} {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
            />
          </div>

          {isRegistering && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isRegistering ? "Create a strong password" : "Enter account password"}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#0052cc',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0043a4'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#0052cc'}
          >
            {isRegistering ? 'Register Account' : 'Authenticate Profile'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '14px', color: '#64748b' }}>
          {isRegistering ? "Already have a clearance profile? " : "Don't have an operating profile yet? "}
          <span 
            onClick={toggleMode}
            style={{ color: '#0052cc', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Sign In' : 'Register Here'}
          </span>
        </div>

      </div>
    </div>
  );
}

export default Login;