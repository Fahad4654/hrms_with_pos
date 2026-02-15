import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.accessToken, data.refreshToken, data.employee);
      
      // Redirect based on user permissions
      const permissions = data.employee.permissions || [];
      if (permissions.length === 0) {
        // No permissions assigned
        navigate('/no-access');
      } else if (permissions.includes('all')) {
        navigate('/employees');
      } else if (permissions.includes('employees')) {
        navigate('/employees');
      } else if (permissions.includes('attendance')) {
        navigate('/attendance');
      } else if (permissions.includes('categories')) {
        navigate('/categories');
      } else if (permissions.includes('inventory')) {
        navigate('/products');
      } else if (permissions.includes('pos')) {
        navigate('/pos');
      } else if (permissions.includes('sales')) {
        navigate('/sales');
      } else if (permissions.includes('analytics')) {
        navigate('/analytics');
      } else {
        navigate('/no-access');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>HRMS + POS</h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '30px' }}>Secure Enterprise Portal</p>
        
        {error && <div style={{ color: 'var(--error)', marginBottom: '20px', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Business Email</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
