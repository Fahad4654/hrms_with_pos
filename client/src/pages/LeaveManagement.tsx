import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  employee?: {
    name: string;
  };
}

const LeaveManagement: React.FC = () => {
  const { showToast } = useToast();
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string, name: string }[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<{ name: string, daysAllowed: number, daysTaken: number, daysRemaining: number }[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: '',
    reason: ''
  });

  // const canApprove = ... (removed)

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, typesRes, summaryRes] = await Promise.all([
        api.get('/leaves/my-leaves'),
        api.get('/settings/leave-types?active=true'),
        api.get('/leaves/summary')
      ]);
      setMyLeaves(myRes.data);
      setLeaveTypes(typesRes.data);
      setLeaveSummary(summaryRes.data);
      
      // Set default type if not set and types exist
      if (typesRes.data.length > 0 && !formData.type) {
         setFormData(prev => ({ ...prev, type: typesRes.data[0].name }));
      }
    } catch (error) {
      console.error('Failed to fetch leaves', error);
      showToast('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Date Validation
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) {
      showToast('Start date cannot be later than end date', 'error');
      return;
    }

    // 2. Quota Validation
    const selectedSummary = leaveSummary.find(s => s.name === formData.type);
    if (selectedSummary) {
      const requestedDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (requestedDays > selectedSummary.daysRemaining) {
        showToast(`Insufficient balance. Remaining: ${selectedSummary.daysRemaining} days`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post('/leaves/request', formData);
      showToast('Leave request submitted successfully', 'success');
      setFormData({ 
        startDate: '', 
        endDate: '', 
        type: leaveTypes[0]?.name || '', 
        reason: '' 
      });
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // handleUpdateStatus removed

  if (loading) return <div className="animate-fade-in">Loading Leave Management...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '4%' }}>
        <h1>Leave Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>Request leaves and track approval status</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3%', marginBottom: '4%' }}>
        {/* Request Form */}
        <div className="glass-card" style={{ padding: '6%' }}>
          <h3 style={{ marginBottom: '6%' }}>New Request</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Start Date</label>
              <input 
                type="date" 
                required 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>End Date</label>
              <input 
                type="date" 
                required 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Leave Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                style={{ width: '100%' }}
                required
              >
                <option value="" disabled>Select Leave Type</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Reason (Optional)</label>
              <textarea 
                placeholder="Briefly explain your reason..."
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', padding: '12px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '8px' }}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Status Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4%' }}>
          <div className="glass-card" style={{ padding: '8%', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Recent Status</p>
            <h2 style={{ color: myLeaves[0]?.status === 'APPROVED' ? 'var(--success)' : myLeaves[0]?.status === 'REJECTED' ? 'var(--error)' : 'var(--primary)' }}>
              {myLeaves[0]?.status || 'No Active Requests'}
            </h2>
          </div>
          <div className="glass-card" style={{ padding: '8%' }}>
            <h3 style={{ marginBottom: '16px' }}>Leave Balance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaveSummary.map((item, i) => (
                <div key={i} style={{ borderBottom: i === leaveSummary.length - 1 ? 'none' : '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600' }}>{item.name}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.daysRemaining} remaining</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Taken: {item.daysTaken} / {item.daysAllowed} days
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px' }}>
                    <div style={{ 
                      width: `${Math.min(100, (item.daysTaken / item.daysAllowed) * 100)}%`, 
                      height: '100%', 
                      background: 'var(--primary)', 
                      borderRadius: '2px' 
                    }} />
                  </div>
                </div>
              ))}
              {leaveSummary.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No leave types configured.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals removed */}

      <h2>My Requests</h2>
      <div className="glass-card table-container" style={{ marginTop: '2%' }}>
        {myLeaves.length === 0 ? (
          <p style={{ padding: '3%', color: 'var(--text-muted)' }}>You haven't submitted any leave requests yet.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th style={{ padding: '2% 3%' }}>Dates</th>
                <th style={{ padding: '2% 3%' }}>Type</th>
                <th style={{ padding: '2% 3%' }}>Reason</th>
                <th style={{ padding: '2% 3%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.map(leave => (
                <tr key={leave.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '2% 3%' }}>
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '2% 3%' }}>{leave.type}</td>
                  <td style={{ padding: '2% 3%', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{leave.reason || '--'}</td>
                  <td style={{ padding: '2% 3%' }}>
                    <span 
                      style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        background: leave.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 
                                    leave.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        color: leave.status === 'APPROVED' ? 'var(--success)' : 
                               leave.status === 'REJECTED' ? 'var(--error)' : 'var(--primary)'
                      }}
                    >
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
