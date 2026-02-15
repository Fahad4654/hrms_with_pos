import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  salary: number;
}

interface Role {
  id: string;
  name: string;
}

const EmployeeManagement: React.FC = () => {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleId: '', salary: 0 });

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [meta.page, meta.limit, sortBy, sortOrder]);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
      if (data.length > 0 && !formData.roleId) {
        setFormData(prev => ({ ...prev, roleId: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch roles', error);
      showToast('Failed to fetch roles', 'error');
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/employees', {
        params: {
          page: meta.page,
          limit: meta.limit,
          search,
          sortBy,
          sortOrder
        }
      });
      setEmployees(data.data);
      setMeta(prev => ({ 
        ...prev, 
        total: data.meta.total, 
        totalPages: data.meta.totalPages,
        page: data.meta.page
      }));
    } catch (error) {
      console.error('Failed to fetch employees', error);
      showToast('Failed to fetch employees', 'error');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta(prev => ({ ...prev, page: 1 }));
    fetchEmployees();
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/employees', formData);
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', roleId: roles[0]?.id || '', salary: 0 });
      fetchEmployees();
      showToast('Employee created successfully', 'success');
    } catch (error) {
      showToast('Failed to create employee', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ margin: 0 }}>Employees</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search name or email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '200px' }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add</button>
        </div>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: window.innerWidth <= 480 ? '600px' : '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th onClick={() => toggleSort('name')} style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px', cursor: 'pointer' }}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('role')} style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px', cursor: 'pointer' }}>
                Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('email')} style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px', cursor: 'pointer' }}>
                Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('salary')} style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px', cursor: 'pointer' }}>
                Salary {sortBy === 'salary' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>No employees found</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px', fontWeight: '500' }}>{emp.name}</td>
                  <td style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      background: emp.role?.name === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                      color: emp.role?.name === 'ADMIN' ? 'var(--error)' : 'var(--primary)'
                    }}>
                      {emp.role?.name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px', color: 'var(--text-muted)' }}>{emp.email}</td>
                  <td style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px' }}>${Number(emp.salary).toLocaleString()}</td>
                  <td style={{ padding: window.innerWidth <= 480 ? '12px 16px' : '16px 24px' }}>
                    <button style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} employees
          </p>
          <select 
            value={meta.limit} 
            onChange={e => setMeta(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            style={{ 
              padding: '4px 8px', 
              background: 'rgba(15, 23, 42, 0.5)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '4px', 
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            {[5, 10, 20, 50].map(l => <option key={l} value={l}>{l} / page</option>)}
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

      {showModal && (
        <div className="modal-overlay" style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.8)', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          zIndex: 1000 
        }}>
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h2>New Employee</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Default Password</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select 
                  style={{ width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                  value={formData.roleId} 
                  onChange={e => setFormData({...formData, roleId: e.target.value})}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Annual Salary ($)</label>
                <input type="number" required value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
