import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/bi/labor-analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading Analytics...</div>;

  return (
    <div>
      <h1>Business Intelligence</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Real-time performance and labor efficiency metrics</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Labor Efficiency</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', flexDirection: 'column' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              ${analytics?.salesPerManHour.toFixed(2)}
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Sales per Man-Hour</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Sales</p>
              <p style={{ fontWeight: '600' }}>${analytics?.totalSales.toFixed(2)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Hours</p>
              <p style={{ fontWeight: '600' }}>{analytics?.totalHours.toFixed(1)} hrs</p>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Sales Distribution</h3>
          {/* Simplified bar chart representation */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '150px', paddingBottom: '20px' }}>
            {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--primary)', borderRadius: '4px 4px 0 0', opacity: 0.6 + (h/200) }}></div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        <h3>Quick Payroll Export</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>Generate and verify monthly payroll for all active employees.</p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-primary">Process current month</button>
          <button className="btn" style={{ border: '1px solid var(--glass-border)' }}>Export CSV</button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
