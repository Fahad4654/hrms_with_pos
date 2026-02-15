import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NoAccess: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div className="glass-card" style={{ padding: '40px', maxWidth: '500px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
        <h1 style={{ marginBottom: '16px' }}>No Access</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          Your account does not have any permissions assigned. Please contact your administrator to grant you access to the system.
        </p>
        <button className="btn btn-primary" onClick={handleLogout} style={{ width: '100%' }}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default NoAccess;
