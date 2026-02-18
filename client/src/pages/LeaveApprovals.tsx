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
  daysRequested: number;
  daysRemaining: number;
  employee?: {
    name: string;
    role: string;
  };
}

const LeaveApprovals: React.FC = () => {
  const { showToast } = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Pagination & Sort State
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchLeaves();
  }, [meta.page, meta.limit, sortBy, sortOrder, filter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves/all', {
        params: {
          page: meta.page,
          limit: meta.limit,
          search,
          status: filter,
          sortBy,
          sortOrder
        }
      });
      // Standardize: Ensure we have an array
      const data = res.data.data || [];
      setLeaves(data);
      const m = res.data.meta;
      if (m) {
        setMeta({
          total: m.total,
          page: m.page,
          totalPages: m.totalPages,
          limit: m.limit
        });
      }
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
    fetchLeaves();
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

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/leaves/${id}/status`, { status });
      showToast(`Request ${status.toLowerCase()} successfully`, 'success');
      fetchLeaves();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Update failed', 'error');
    }
  };

  if (loading && leaves.length === 0) return <div className="animate-fade-in">Loading Leave Approvals...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '4%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1>Leave Approvals</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and manage all employee leave requests</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search employee, type..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '220px' }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
              <button 
                key={f}
                onClick={() => {
                  setFilter(f);
                  setMeta(prev => ({ ...prev, page: 1 }));
                }}
                className={`btn ${filter === f ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', border: 'none' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card table-container">
        {loading ? (
          <p style={{ padding: '3%', color: 'var(--text-muted)' }}>Loading requests...</p>
        ) : leaves.length === 0 ? (
          <p style={{ padding: '3%', color: 'var(--text-muted)' }}>No leave requests found.</p>
        ) : (
          <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th onClick={() => toggleSort('employee')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                  Employee {sortBy === 'employee' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => toggleSort('type')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                  Leave Details {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '2% 3%' }}>Current Balance</th>
                <th onClick={() => toggleSort('startDate')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                  Dates {sortBy === 'startDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => toggleSort('status')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '2% 3%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(leave => (
                <tr key={leave.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '2% 3%' }}>
                    <div style={{ fontWeight: '500' }}>{leave.employee?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{leave.employee?.role}</div>
                  </td>
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
                  <td style={{ padding: '2% 3%' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {leave.status !== 'APPROVED' && (
                        <button onClick={() => handleUpdateStatus(leave.id, 'APPROVED')} className="btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 12px' }}>Approve</button>
                      )}
                      {leave.status !== 'REJECTED' && (
                        <button onClick={() => handleUpdateStatus(leave.id, 'REJECTED')} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '4px 12px' }}>Reject</button>
                      )}
                    </div>
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

export default LeaveApprovals;
