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
  const { user } = useAuth();
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'Sick',
    reason: ''
  });

  const canApprove = user?.permissions?.includes('all') || user?.permissions?.includes('attendance');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, pendingRes] = await Promise.all([
        api.get('/leaves/my-leaves'),
        canApprove ? api.get('/leaves/pending') : Promise.resolve({ data: [] })
      ]);
      setMyLeaves(myRes.data);
      setPendingLeaves(pendingRes.data);
    } catch (error) {
      console.error('Failed to fetch leaves', error);
      showToast('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leaves/request', formData);
      showToast('Leave request submitted successfully', 'success');
      setFormData({ startDate: '', endDate: '', type: 'Sick', reason: '' });
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/leaves/${id}/status`, { status });
      showToast(`Request ${status.toLowerCase()} successfully`, 'success');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Update failed', 'error');
    }
  };

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
              >
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Vacation">Vacation</option>
                <option value="Emergency">Emergency</option>
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
            <h3 style={{ marginBottom: '16px' }}>Leave Guidelines</h3>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.875rem', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Apply at least 2 days in advance for casual leave.</li>
              <li style={{ marginBottom: '8px' }}>Medical certificates required for sick leave over 2 days.</li>
              <li>Approval depends on team schedule and workload.</li>
            </ul>
          </div>
        </div>
      </div>

      {canApprove && pendingLeaves.length > 0 && (
        <div style={{ marginBottom: '4%' }}>
          <h2 style={{ marginBottom: '2%' }}>Pending Approvals</h2>
          <div className="glass-card table-container">
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '2% 3%' }}>Employee</th>
                  <th style={{ padding: '2% 3%' }}>Type</th>
                  <th style={{ padding: '2% 3%' }}>Dates</th>
                  <th style={{ padding: '2% 3%' }}>Reason</th>
                  <th style={{ padding: '2% 3%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map(leave => (
                  <tr key={leave.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '2% 3%', fontWeight: '500' }}>{leave.employee?.name}</td>
                    <td style={{ padding: '2% 3%' }}><span className="badge">{leave.type}</span></td>
                    <td style={{ padding: '2% 3%', fontSize: '0.875rem' }}>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '2% 3%', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{leave.reason || '--'}</td>
                    <td style={{ padding: '2% 3%' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleUpdateStatus(leave.id, 'APPROVED')} className="btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 12px' }}>Approve</button>
                        <button onClick={() => handleUpdateStatus(leave.id, 'REJECTED')} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '4px 12px' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
