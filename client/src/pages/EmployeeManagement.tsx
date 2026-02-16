import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';

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
  level: number;
}

const EmployeeManagement: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleId: '', salary: 0 });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { confirm } = useConfirm();

  // Filter roles based on hierarchy
  // Level 1 can see all. Level > 1 can only see strictly lower hierarchy (higher level number)
  const filteredRoles = roles.filter(role => {
    if (!user?.level || user.level === 1) return true;
    return role.level > user.level;
  });

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [meta.page, meta.limit, sortBy, sortOrder]);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
      if (data && data.length > 0 && !formData.roleId) {
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
    } catch (error: any) {
      console.error('Failed to create employee', error);
      let message = error.response?.data?.message || 'Failed to create employee';
      
      // Handle Zod validation errors if present
      const errors = error.response?.data?.errors;
      if (errors) {
         // errors is typically { _errors: [], fieldName: { _errors: [] } }
         // Let's try to extract the first error message
         const firstField = Object.keys(errors).find(k => k !== '_errors');
         if (firstField && errors[firstField] && errors[firstField]._errors) {
             message = `${firstField}: ${errors[firstField]._errors.join(', ')}`;
         } else if (errors._errors && errors._errors.length > 0) {
             message = errors._errors.join(', ');
         }
      }
      showToast(message, 'error');
    }
  };

  const openEditModal = (employee: Employee) => {
    if (!employee.role) {
        showToast('Employee has no role assigned', 'error');
        return;
    }
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '', // Leave empty to keep existing
      roleId: employee.role.id,
      salary: employee.salary
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      if (formData.password) {
          await api.put(`/employees/${editingEmployee.id}`, formData);
      } else {
          // Exclude password if empty
          const { password, ...rest } = formData;
          await api.put(`/employees/${editingEmployee.id}`, rest);
      }
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      setFormData({ name: '', email: '', password: '', roleId: roles[0]?.id || '', salary: 0 });
      fetchEmployees();
      showToast('Employee updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to update employee', error);
      const message = error.response?.data?.message || 'Failed to update employee';
      showToast(message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee?',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.delete(`/employees/${id}`);
        fetchEmployees();
        showToast('Employee deleted successfully', 'success');
      } catch (error: any) {
        console.error('Failed to delete employee', error);
        showToast(error.response?.data?.message || 'Failed to delete employee', 'error');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%', flexWrap: 'wrap', gap: '2%' }}>
        <h1 style={{ margin: 0 }}>Employees</h1>
        <div style={{ display: 'flex', gap: '2%', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search name or email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: '200px' }}
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
              <th onClick={() => toggleSort('name')} style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%', cursor: 'pointer' }}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('role')} style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%', cursor: 'pointer' }}>
                Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('email')} style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%', cursor: 'pointer' }}>
                Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('salary')} style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%', cursor: 'pointer' }}>
                Salary {sortBy === 'salary' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '5%', textAlign: 'center' }}>No employees found</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%', fontWeight: '500' }}>{emp.name}</td>
                  <td style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%' }}>
                    <span style={{ 
                      padding: '0.5% 1.5%', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      background: emp.role?.name === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                      color: emp.role?.name === 'ADMIN' ? 'var(--error)' : 'var(--primary)'
                    }}>
                      {emp.role?.name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%', color: 'var(--text-muted)' }}>{emp.email}</td>
                  <td style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%' }}>${Number(emp.salary).toLocaleString()}</td>
                  <td style={{ padding: window.innerWidth <= 480 ? '2% 3%' : '2% 3%' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => openEditModal(emp)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => handleDelete(emp.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3%', flexWrap: 'wrap', gap: '2%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} employees
          </p>
          <select 
            value={meta.limit} 
            onChange={e => setMeta(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            style={{ 
              padding: '0.5% 1%', 
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

          {/* Page Numbers */}
          {(() => {
            const pages = [];
            const total = meta.totalPages;
            const current = meta.page;

            if (total <= 5) {
              for (let i = 1; i <= total; i++) pages.push(i);
            } else {
              if (current <= 3) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
              } else if (current >= total - 2) {
                pages.push('...');
                for (let i = total - 4; i <= total; i++) pages.push(i);
              } else {
                pages.push('...');
                for (let i = current - 2; i <= current + 2; i++) pages.push(i);
                pages.push('...');
              }
            }

            return pages.map((p, i) => (
              <button
                key={i}
                className="btn hide-on-mobile"
                disabled={p === '...'}
                onClick={() => typeof p === 'number' && setMeta(prev => ({ ...prev, page: p }))}
                style={{
                  border: '1px solid var(--glass-border)',
                  background: current === p ? 'var(--primary)' : 'transparent',
                  color: 'white',
                  minWidth: '40px',
                  justifyContent: 'center',
                  cursor: p === '...' ? 'default' : 'pointer'
                }}
              >
                {p}
              </button>
            ));
          })()}

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

      {/* Create Modal */}
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
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '4%', width: '90%', maxWidth: '40%' }}>
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
                  style={{ width: '100%', padding: '3%', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                  value={formData.roleId} 
                  onChange={e => setFormData({...formData, roleId: e.target.value})}
                >
                  {filteredRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Annual Salary ($)</label>
                <input type="number" required value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
              </div>
              <div style={{ display: 'flex', gap: '2%', marginTop: '5%' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
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
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '4%', width: '90%', maxWidth: '40%' }}>
            <h2>Edit Employee</h2>
            <form onSubmit={handleEdit}>
              <div className="input-group">
                <label>Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="********" />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select 
                  style={{ width: '100%', padding: '3%', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                  value={formData.roleId} 
                  onChange={e => setFormData({...formData, roleId: e.target.value})}
                >
                  {filteredRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Annual Salary ($)</label>
                <input type="number" required value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
              </div>
              <div style={{ display: 'flex', gap: '2%', marginTop: '5%' }}>
                <button type="button" className="btn" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
