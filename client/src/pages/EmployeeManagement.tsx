import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { exportAttendanceToPDF } from '../utils/pdfExport';

interface Employee {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  salary: number;
  joinTimestamp?: string;
  phone?: string;
  address?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  dateOfBirth?: string;
  designation?: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
}

const EmployeeManagement: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { formatDateTime } = useLocale();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    roleId: '', 
    salary: 0, 
    joinTimestamp: '',
    employeeId: '',
    phone: '',
    address: '',
    gender: '',
    maritalStatus: '',
    nationality: '',
    dateOfBirth: '',
    designation: ''
  });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const { confirm } = useConfirm();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { timezone } = useLocale();
  const companyName = 'HRMS POS';

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
      const payload = {
        ...formData,
        joinTimestamp: formData.joinTimestamp || undefined
      };
      await api.post('/employees', payload);
      setShowModal(false);
      resetForm();
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
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '', // Leave empty to keep existing
      roleId: employee.role.id,
      salary: employee.salary,
      joinTimestamp: employee.joinTimestamp ? new Date(Number(employee.joinTimestamp)).toISOString().split('T')[0] : '',
      employeeId: employee.employeeId || '',
      phone: employee.phone || '',
      address: employee.address || '',
      gender: employee.gender || '',
      maritalStatus: employee.maritalStatus || '',
      nationality: employee.nationality || '',
      dateOfBirth: employee.dateOfBirth ? new Date(Number(employee.dateOfBirth)).toISOString().split('T')[0] : '',
      designation: employee.designation || ''
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', email: '', password: '', roleId: roles[0]?.id || '', salary: 0, joinTimestamp: '',
      employeeId: '', phone: '', address: '', gender: '', maritalStatus: '', nationality: '', dateOfBirth: '', designation: ''
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      const payload: any = {
        ...formData,
        joinTimestamp: formData.joinTimestamp || undefined,
        dateOfBirth: formData.dateOfBirth || undefined
      };
      
      if (!payload.password) {
        delete payload.password;
      }

      await api.put(`/employees/${editingEmployee.id}`, payload);
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      resetForm();
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

  const handleExportAttendance = async (employeeId: string, employeeName: string) => {
    try {
      const { data } = await api.get(`/attendance/logs/${employeeId}`, {
        params: { startDate, endDate }
      });
      exportAttendanceToPDF(data, {
        employeeName,
        companyName,
        startDate,
        endDate,
        timezone: timezone || 'UTC'
      });
      showToast('Attendance report generated', 'success');
    } catch (error: any) {
      console.error('Failed to export attendance', error);
      showToast('Failed to generate attendance report', 'error');
    }
  };


  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%', flexWrap: 'wrap', gap: '2%' }}>
        <h1 style={{ margin: 0 }}>Employees</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', width: 'auto' }}
            />
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '120px' }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add</button>
        </div>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '1400px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th onClick={() => toggleSort('name')} style={{ padding: '12px 16px', cursor: 'pointer', width: '15%' }}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('designation')} style={{ padding: '12px 16px', width: '15%', cursor: 'pointer' }}>
                Designation {sortBy === 'designation' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('role')} style={{ padding: '12px 16px', cursor: 'pointer', width: '10%' }}>
                Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('email')} style={{ padding: '12px 16px', cursor: 'pointer', width: '20%' }}>
                Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('phone')} style={{ padding: '12px 16px', width: '12%', cursor: 'pointer' }}>
                Phone No. {sortBy === 'phone' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('joinTimestamp')} style={{ padding: '12px 16px', cursor: 'pointer', width: '15%' }}>
                Join Date {sortBy === 'joinTimestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ 
                padding: '12px 16px', 
                width: '130px', 
                position: 'sticky', 
                right: 0, 
                background: '#1e293b', 
                zIndex: 20,
                borderLeft: '2px solid var(--glass-border)',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.3)'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
               <tr><td colSpan={7} style={{ padding: '5%', textAlign: 'center' }}>No employees found</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emp.name}>{emp.name}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emp.designation || 'N/A'}>{emp.designation || 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>
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
                   <td style={{ 
                    padding: '12px 16px', 
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={emp.email}>
                    {emp.email}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.phone || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {emp.joinTimestamp ? formatDateTime(emp.joinTimestamp) : '--'}
                  </td>
                    <td style={{ 
                      padding: '12px 16px',
                      position: 'sticky',
                      right: 0,
                      background: '#1e293b',
                      zIndex: 10,
                      borderLeft: '2px solid var(--glass-border)',
                      boxShadow: '-4px 0 8px rgba(0,0,0,0.3)'
                    }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem', background: 'var(--primary)', color: 'white' }} 
                        onClick={() => { setViewingEmployee(emp); setIsDetailsModalOpen(true); }}
                      >
                        Details
                      </button>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => openEditModal(emp)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem', background: 'var(--accent)' }} 
                        onClick={() => handleExportAttendance(emp.id, emp.name)}
                      >
                        PDF
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

      {showModal && (
        <EmployeeForm 
          title="New Employee" 
          onSubmit={handleCreate} 
          onCancel={() => setShowModal(false)} 
          formData={formData}
          setFormData={setFormData}
          filteredRoles={filteredRoles}
        />
      )}
      {isEditModalOpen && (
        <EmployeeForm 
          title="Edit Employee" 
          onSubmit={handleEdit} 
          onCancel={() => { setIsEditModalOpen(false); setEditingEmployee(null); }} 
          formData={formData}
          setFormData={setFormData}
          filteredRoles={filteredRoles}
        />
      )}
      {isDetailsModalOpen && viewingEmployee && (
        <DetailsModal 
          employee={viewingEmployee} 
          onClose={() => { setIsDetailsModalOpen(false); setViewingEmployee(null); }} 
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
};

interface EmployeeFormProps {
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onCancel: () => void;
  formData: any;
  setFormData: (data: any) => void;
  filteredRoles: Role[];
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ onSubmit, title, onCancel, formData, setFormData, filteredRoles }) => (
  <div className="modal-overlay" style={{ 
    position: 'fixed', 
    inset: 0, 
    background: 'rgba(0,0,0,0.8)', 
    display: 'flex', 
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto',
    zIndex: 1000,
    padding: '20px'
  }}>
    <div className="glass-card modal-content animate-fade-in" style={{ padding: '30px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{title}</h2>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label>Full Name <span style={{ color: 'var(--error)' }}>*</span></label>
              <input required minLength={2} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Email Address <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="input-group">
              <label>{title.includes('Edit') ? 'New Password (optional)' : 'Default Password'} <span style={{ color: 'var(--error)' }}>{!title.includes('Edit') && '*'}</span></label>
              <input type="password" required={!title.includes('Edit')} minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={title.includes('Edit') ? '********' : ''} />
            </div>
            <div className="input-group">
              <label>Employee ID</label>
              <input value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} placeholder="EMP001" />
            </div>
            <div className="input-group">
              <label>Designation</label>
              <input value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} placeholder="Software Engineer" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label>Role <span style={{ color: 'var(--error)' }}>*</span></label>
              <select 
                required 
                value={formData.roleId} 
                onChange={e => setFormData({...formData, roleId: e.target.value})}
              >
                {filteredRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Salary <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="number" step="0.01" min="0" required value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 234 567 890" />
            </div>
            <div className="input-group">
              <label>Gender</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Marital Status</label>
              <select value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                <option value="">Select Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
            <div className="input-group">
              <label>Date of Birth</label>
              <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Join Date</label>
              <input type="date" value={formData.joinTimestamp} onChange={e => setFormData({...formData, joinTimestamp: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="input-group" style={{ marginTop: '16px' }}>
          <label>Nationality</label>
          <input value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} placeholder="American" />
        </div>

        <div className="input-group" style={{ marginTop: '16px' }}>
          <label>Address</label>
          <textarea 
            value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})} 
            style={{ width: '100%', padding: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', minHeight: '80px' }}
            placeholder="123 Main St, City, Country"
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '30px' }}>
          <button type="button" className="btn" onClick={onCancel} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{title.includes('Edit') ? 'Update Employee' : 'Create Employee'}</button>
        </div>
      </form>
    </div>
  </div>
);

interface DetailsModalProps {
  employee: Employee;
  onClose: () => void;
  formatDateTime: (ts: string | number) => string;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ employee, onClose, formatDateTime }) => {
  const { formatCurrency } = useLocale();
  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.8)', 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      overflowY: 'auto',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card modal-content animate-fade-in" style={{ padding: '30px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Employee Details</h2>
          <button className="btn" onClick={onClose} style={{ border: '1px solid var(--glass-border)' }}>Close</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p><strong>Name:</strong> {employee.name}</p>
              <p><strong>Employee ID:</strong> {employee.employeeId || 'N/A'}</p>
              <p><strong>Designation:</strong> {employee.designation || 'N/A'}</p>
              <p><strong>Email:</strong> {employee.email}</p>
              <p><strong>Phone:</strong> {employee.phone || 'N/A'}</p>
              <p><strong>Salary:</strong> {formatCurrency(employee.salary)}</p>
              <p><strong>Role:</strong> {employee.role?.name}</p>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p><strong>Gender:</strong> {employee.gender || 'N/A'}</p>
              <p><strong>Marital Status:</strong> {employee.maritalStatus || 'N/A'}</p>
              <p><strong>Nationality:</strong> {employee.nationality || 'N/A'}</p>
              <p><strong>Date of Birth:</strong> {employee.dateOfBirth ? formatDateTime(employee.dateOfBirth) : 'N/A'}</p>
              <p><strong>Join Date:</strong> {employee.joinTimestamp ? formatDateTime(employee.joinTimestamp) : 'N/A'}</p>
              <p><strong>Address:</strong> {employee.address || 'N/A'}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;
