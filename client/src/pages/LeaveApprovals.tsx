import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';

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

const LeaveApprovals: React.FC = () => {
  const { showToast } = useToast();
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const fetchPendingLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves/pending');
      setPendingLeaves(res.data);
    } catch (error) {
      console.error('Failed to fetch pending leaves', error);
      showToast('Failed to load pending requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/leaves/${id}/status`, { status });
      showToast(`Request ${status.toLowerCase()} successfully`, 'success');
      fetchPendingLeaves();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Update failed', 'error');
    }
  };

  if (loading) return <div className="animate-fade-in">Loading Pending Approvals...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '4%' }}>
        <h1>Leave Approvals</h1>
        <p style={{ color: 'var(--text-muted)' }}>Review and manage employee leave requests</p>
      </div>

      <div className="glass-card table-container">
        {pendingLeaves.length === 0 ? (
          <p style={{ padding: '3%', color: 'var(--text-muted)' }}>No pending leave requests found.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default LeaveApprovals;
