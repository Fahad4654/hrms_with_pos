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
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes on mobile
  React.useEffect(() => {
    if (windowWidth <= 1024) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, windowWidth]);

  const contentPaddingX = windowWidth <= 480 ? (windowWidth <= 320 ? '12px' : '20px') : '40px';

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
        padding: windowWidth <= 480 ? '0 12px' : '0 20px',
        zIndex: 1000
      }}>
        <h2 style={{ fontSize: windowWidth <= 320 ? '0.875rem' : '1rem', margin: 0, color: 'var(--primary)' }}>HRMS + POS</h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: windowWidth <= 480 ? '1.25rem' : '1.5rem', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className={`sidebar ${isMobileMenuOpen ? 'open' : ''} glass-card`}
        style={{ 
          marginTop: isMobileMenuOpen ? '0' : '0' // Placeholder to maintain React style object if needed, but classes will handle layout
        }}
      >
        <h2 className="hide-on-mobile" style={{ fontSize: '1.25rem', marginBottom: '40px', color: 'var(--primary)' }}>HRMS + POS</h2>
        
        <div style={{ marginBottom: '32px', marginTop: isMobileMenuOpen ? '60px' : '0' }}>
          {[
            { label: "Overview", icon: "📊", to: "/", permission: "all" },
            { label: "Employees", icon: "👥", to: "/employees", permission: "employees" },
            { label: "Attendance", icon: "🕒", to: "/attendance", permission: "attendance" },
            { label: "Products", icon: "📦", to: "/products", permission: "products" },
            { label: "Sales POS", icon: "💰", to: "/pos", permission: "pos" },
            { label: "Sales History", icon: "📜", to: "/sales", permission: "sales" },
            { label: "Analytics", icon: "📈", to: "/analytics", permission: "analytics" },
            { label: "Admin Settings", icon: "⚙️", to: "/settings", permission: "all" },
          ].filter(item => 
            user?.permissions?.includes('all') || user?.permissions?.includes(item.permission)
          ).map(item => (
            <SidebarItem key={item.to} label={item.label} icon={item.icon} to={item.to} />
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            {! (windowWidth <= 1200 && !isMobileMenuOpen) && (
              <div className="hide-on-mobile">
                <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{user?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</p>
              </div>
            )}
            {/* On mobile, show the name always if sidebar is open */}
            {isMobileMenuOpen && (
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{user?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</p>
              </div>
            )}
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
        paddingLeft: contentPaddingX,
        paddingRight: contentPaddingX,
        paddingTop: '100px', // Consistent top padding for fixed header
        paddingBottom: '40px',
        transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
        maxWidth: '100vw'
      }} className="main-content">
        <div className="animate-fade-in">
          {children || (
            <>
              <h1 style={{ marginBottom: '40px' }}>Command Center</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: windowWidth <= 480 ? '16px' : '24px' }}>
                <div className="glass-card" style={{ padding: windowWidth <= 480 ? '16px' : '24px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Total Sales (Today)</p>
                  <h3>$1,240.00</h3>
                </div>
                <div className="glass-card" style={{ padding: windowWidth <= 480 ? '16px' : '24px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Clocked In</p>
                  <h3>12 / 15</h3>
                </div>
                <div className="glass-card" style={{ padding: windowWidth <= 480 ? '16px' : '24px' }}>
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
