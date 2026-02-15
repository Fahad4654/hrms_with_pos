import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface SidebarItemProps {
  label: string;
  icon: string;
  to: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ label, icon, to }) => {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        cursor: 'pointer',
        backgroundColor: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'all 0.2s',
        marginBottom: '8px',
        fontWeight: active ? '600' : '400'
      }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
};

const Dashboard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(window.innerWidth > 1024);
  const location = useLocation();

  // Close mobile menu when route changes on mobile
  React.useEffect(() => {
    if (window.innerWidth <= 1024) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Universal Header (Mobile & Desktop Toggle) */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000
      }}>
        <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--primary)' }}>HRMS + POS</h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className={`sidebar ${isMobileMenuOpen ? 'open' : ''} glass-card`}
        style={{ 
          height: '100vh',
          zIndex: 1100,
          position: 'sticky', // Base position for desktop
          top: 0
        }}
      >
        <h2 className="hide-on-mobile" style={{ fontSize: '1.25rem', marginBottom: '40px', color: 'var(--primary)' }}>HRMS + POS</h2>
        
        <div style={{ marginBottom: '32px', marginTop: isMobileMenuOpen ? '60px' : '0' }}>
          <SidebarItem label="Overview" icon="📊" to="/" />
          <SidebarItem label="Employees" icon="👥" to="/employees" />
          <SidebarItem label="Attendance" icon="🕒" to="/attendance" />
          <SidebarItem label="Products" icon="📦" to="/products" />
          <SidebarItem label="Sales POS" icon="💰" to="/pos" />
          <SidebarItem label="Analytics" icon="📈" to="/analytics" />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</p>
            </div>
          </div>
          <button className="btn" onClick={logout} style={{ width: '100%', fontSize: '0.875rem', color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        padding: '40px', 
        paddingTop: '100px', // Consistent top padding for fixed header
        marginLeft: (isMobileMenuOpen && window.innerWidth > 1024) ? '280px' : '0',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
        maxWidth: '100vw'
      }} className="main-content">
        <div className="animate-fade-in">
          {children || (
            <>
              <h1 style={{ marginBottom: '40px' }}>Command Center</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Total Sales (Today)</p>
                  <h3>$1,240.00</h3>
                </div>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Clocked In</p>
                  <h3>12 / 15</h3>
                </div>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Pending Leaves</p>
                  <h3>3</h3>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
