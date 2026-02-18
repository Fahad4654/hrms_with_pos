import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  daysRequested: number;
  daysRemaining: number;
  employee?: {
    name: string;
    role: string;
  };
}

const LeaveManagement: React.FC = () => {
  const { showToast } = useToast();
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string, name: string }[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<{ name: string, daysAllowed: number, daysTaken: number, daysRemaining: number }[]>([]);

  // Pagination & Filter State
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form State
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: '',
    reason: ''
  });

  // const canApprove = ... (removed)

  useEffect(() => {
    fetchMyLeaves();
  }, [meta.page, meta.limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchStaticData();
  }, []);

  const fetchStaticData = async () => {
    try {
      const [typesRes, summaryRes] = await Promise.all([
        api.get('/settings/leave-types?active=true'),
        api.get('/leaves/summary')
      ]);
      setLeaveTypes(typesRes.data);
      setLeaveSummary(summaryRes.data);
      
      if (typesRes.data.length > 0 && !formData.type) {
         setFormData(prev => ({ ...prev, type: typesRes.data[0].name }));
      }
    } catch (error) {
      console.error('Failed to fetch static data', error);
    }
  };

  const fetchMyLeaves = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leaves/my-leaves', {
        params: {
          page: meta.page,
          limit: meta.limit,
          search,
          sortBy,
          sortOrder
        }
      });
      setMyLeaves(data.data);
      setMeta(prev => ({ 
        ...prev, 
        total: data.meta.total, 
        totalPages: data.meta.totalPages,
        page: data.meta.page
      }));
    } catch (error) {
      console.error('Failed to fetch leaves', error);
      showToast('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta(prev => ({ ...prev, page: 1 }));
    fetchMyLeaves();
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setMeta(prev => ({ ...prev, page: 1 }));
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
      fetchMyLeaves();
      fetchStaticData(); // Update summary
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // handleUpdateStatus removed

  if (loading && myLeaves.length === 0) return <div className="animate-fade-in">Loading Leave Management...</div>;

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2%' }}>
        <h2>My Requests</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Search reason or type..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '200px' }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      <div className="glass-card table-container">
        {loading ? (
          <p style={{ padding: '3%', color: 'var(--text-muted)' }}>Loading requests...</p>
        ) : myLeaves.length === 0 ? (
          <p style={{ padding: '3%', color: 'var(--text-muted)' }}>No leave requests found.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th onClick={() => toggleSort('type')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                   Leave Details {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '2% 3%' }}>Current Balance</th>
                <th onClick={() => toggleSort('startDate')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                   Dates {sortBy === 'startDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '2% 3%' }}>Reason</th>
                <th onClick={() => toggleSort('status')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                   Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.map(leave => (
                <tr key={leave.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '2% 3%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge">{leave.type}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                      {leave.daysRequested} {leave.daysRequested === 1 ? 'Day' : 'Days'}
                    </div>
                  </td>
                  <td style={{ padding: '2% 3%' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 'bold', color: leave.daysRemaining < leave.daysRequested && leave.status === 'PENDING' ? 'var(--error)' : 'var(--success)' }}>
                        {leave.daysRemaining}
                      </span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>Days left</span>
                    </div>
                  </td>
                  <td style={{ padding: '2% 3%', fontSize: '0.875rem' }}>
                    <div style={{ whiteSpace: 'nowrap' }}>{new Date(leave.startDate).toLocaleDateString()}</div>
                    <div style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>to {new Date(leave.endDate).toLocaleDateString()}</div>
                  </td>
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

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3%', flexWrap: 'wrap', gap: '2%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} requests
          </p>
          <select 
            value={meta.limit} 
            onChange={e => setMeta(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            style={{ 
              padding: '6px 12px', 
              background: 'rgba(15, 23, 42, 0.5)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '4px', 
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            {[5, 10, 20, 50].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn" 
            disabled={meta.page <= 1}
            onClick={() => setMeta(prev => ({ ...prev, page: prev.page - 1 }))}
            style={{ border: '1px solid var(--glass-border)' }}
          >
            Previous
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === meta.totalPages || (p >= meta.page - 1 && p <= meta.page + 1))
              .map((p, i, arr) => {
                const showEllipsis = i > 0 && p !== arr[i-1] + 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                    <button
                      onClick={() => setMeta(prev => ({ ...prev, page: p }))}
                      className={`btn ${meta.page === p ? 'btn-primary' : ''}`}
                      style={{ minWidth: '40px', padding: '6px', border: '1px solid var(--glass-border)' }}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })
            }
          </div>

          <button 
            className="btn" 
            disabled={meta.page >= meta.totalPages}
            onClick={() => setMeta(prev => ({ ...prev, page: prev.page + 1 }))}
            style={{ border: '1px solid var(--glass-border)' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
