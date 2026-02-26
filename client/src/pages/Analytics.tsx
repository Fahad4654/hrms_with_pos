import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useLocale } from '../context/LocaleContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';

const Analytics: React.FC = () => {
  const { formatCurrency } = useLocale();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      const { data } = await api.get(`/bi/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>Loading Command Analytics...</div>;
  if (!data) return <div style={{ padding: '40px', textAlign: 'center' }}>Failed to load data.</div>;

  const COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comprehensive business intelligence and performance metrics</p>
      </div>

      {/* Primary Analytics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Revenue Cards */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Weekly Revenue</p>
          <h2 style={{ color: 'var(--accent)', margin: 0 }}>{formatCurrency(data.revenue.weekly)}</h2>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Monthly Total</p>
            <p style={{ fontWeight: '600', margin: 0 }}>{formatCurrency(data.revenue.monthly)}</p>
          </div>
        </div>

        {/* Attendance (Today) */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Attendance Today</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
            <div>
              <p style={{ color: 'var(--success)', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{data.hr.attendance.present}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</p>
            </div>
            <div>
              <p style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{data.hr.attendance.late}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Late</p>
            </div>
            <div>
              <p style={{ color: 'var(--error)', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{data.hr.attendance.absent}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Absent</p>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
            Out of {data.hr.totalEmployees} total staff
          </p>
        </div>

        {/* Inventory Status */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Inventory Health</p>
          <div style={{ display: 'flex', gap: '20px' }}>
             <div>
                <p style={{ color: data.inventory.outOfStock > 0 ? 'var(--error)' : 'var(--text-muted)', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{data.inventory.outOfStock}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Out of Stock</p>
             </div>
             <div>
                <p style={{ color: data.inventory.lowStock > 0 ? '#f59e0b' : 'var(--text-muted)', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{data.inventory.lowStock}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Low Stock</p>
             </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>Total Active Products: {data.inventory.totalItems}</p>
        </div>
      </div>

      {/* Advanced Charts Grid - Force 2 Columns on Desktop */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Sales Trend Line Chart - Full Width Row */}
        <div className="glass-card" style={{ padding: '24px', minHeight: '400px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>Revenue Trends</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.875rem' }} 
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.875rem' }} 
              />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.revenue.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Workforce Distribution Bar Chart */}
        <div className="glass-card" style={{ padding: '24px', minHeight: '400px' }}>
          <h3 style={{ marginBottom: '24px' }}>Workforce Distribution (By Role)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hr.distribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={100} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.hr.distribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Sales Heatmap */}
        <div className="glass-card" style={{ padding: '24px', minHeight: '400px' }}>
          <h3 style={{ marginBottom: '24px' }}>Peak Sales Times (Avg. Hourly)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', height: '300px' }}>
            {data.peakHours.map((item: any, index: number) => {
              const maxCount = Math.max(...data.peakHours.map((h: any) => h.count), 1);
              const intensity = item.count / maxCount;
              return (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: `rgba(99, 102, 241, ${0.1 + intensity * 0.9})`,
                  borderRadius: '8px',
                  padding: '8px',
                  border: intensity > 0.7 ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                className="heatmap-cell"
                title={`${item.count} sales at ${item.hour}:00`}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{item.hour}:00</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.count} items</span>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Intense Purple/Blue indicates peak customer traffic.
          </p>
        </div>

        {/* Best Selling Products */}
        <div className="glass-card" style={{ padding: '24px', minHeight: '400px' }}>
          <h3 style={{ marginBottom: '24px' }}>Top 5 Best Sellers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.inventory.bestSellers.map((product: any, index: number) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '12px 16px', 
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: COLORS[index % COLORS.length], 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>{index + 1}</span>
                  <span style={{ fontWeight: '500' }}>{product.name}</span>
                </div>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{product.quantity} sold</span>
              </div>
            ))}
            {data.inventory.bestSellers.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No sales data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Meta Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
         <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '8px' }}>Total Monthly Payroll</p>
            <p style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>{formatCurrency(data.hr.salaryExpenses)}</p>
         </div>
         <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '8px' }}>New Hires (This Month)</p>
            <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>{data.hr.newHires}</p>
         </div>
      </div>
    </div>
  );
};

export default Analytics;
