import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Role {
  id: string;
  name: string;
  level: number;
  permissions: string[];
}

const AdminSettings: React.FC = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState<'name' | 'level'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Role Edit State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  const toggleSort = (field: 'name' | 'level') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const availablePermissions = [
    'all',
    'employees',
    'attendance',
    'leaves',
    'leave-approvals',
    'categories',
    'inventory',
    'pos',
    'sales',
    'analytics'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showToast('Error fetching roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole?.name) return;
    try {
      if (editingRole.id) {
        await api.put(`/roles/${editingRole.id}`, editingRole);
        showToast('Role updated successfully', 'success');
      } else {
        await api.post('/roles', editingRole);
        showToast('Role created successfully', 'success');
      }
      setIsRoleModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving role:', error);
      showToast(error.response?.data?.message || 'Error saving role', 'error');
    }
  };

  const handleDeleteRole = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? Users assigned to this role may lose access.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.delete(`/roles/${id}`);
        fetchData();
        showToast('Role deleted successfully', 'success');
      } catch (error: any) {
        console.error('Error deleting role:', error);
        showToast(error.response?.data?.message || 'Error deleting role', 'error');
      }
    }
  };

  const togglePermission = (perm: string) => {
    if (!editingRole) return;
    const currentPerms = editingRole.permissions || [];
    
    // If toggling 'all' permission
    if (perm === 'all') {
      if (currentPerms.includes('all')) {
        // Uncheck 'all'
        setEditingRole({ ...editingRole, permissions: currentPerms.filter(p => p !== 'all') });
      } else {
        // Check 'all' and remove all other permissions
        setEditingRole({ ...editingRole, permissions: ['all'] });
      }
    } else {
      // If toggling any other permission
      if (currentPerms.includes(perm)) {
        // Uncheck this permission
        setEditingRole({ ...editingRole, permissions: currentPerms.filter(p => p !== perm) });
      } else {
        // Check this permission and remove 'all' if it was selected
        const newPerms = currentPerms.filter(p => p !== 'all');
        setEditingRole({ ...editingRole, permissions: [...newPerms, perm] });
      }
    }
  };

  if (loading) return <div>Loading settings...</div>;

  // Client-side sort + paginate
  const sortedRoles = [...roles].sort((a, b) => {
    const valA = sortBy === 'name' ? a.name.toLowerCase() : a.level;
    const valB = sortBy === 'name' ? b.name.toLowerCase() : b.level;
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  const totalRoles = sortedRoles.length;
  const totalPages = Math.max(1, Math.ceil(totalRoles / limit));
  const paginatedRoles = sortedRoles.slice((page - 1) * limit, page * limit);

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: '4%' }}>Permissions</h1>
      
      <div className="glass-card" style={{ padding: '3%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3%' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Roles</h2>
          <button className="btn btn-primary" onClick={() => { setEditingRole({ name: '', permissions: [], level: 10 }); setIsRoleModalOpen(true); }}>
            + New Role
          </button>
        </div>
        <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '12px 16px', width: '5%' }}>#</th>
              <th onClick={() => toggleSort('name')} style={{ padding: '12px 16px', cursor: 'pointer' }}>
                Role Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('level')} style={{ padding: '12px 16px', cursor: 'pointer', width: '12%' }}>
                Level {sortBy === 'level' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px 16px' }}>Permissions</th>
              <th className="actions-cell" style={{ padding: '12px 16px', textAlign: 'right',
                position: 'sticky',
                right: 0,
                width: '170px',
                background: '#1e293b',
                zIndex: 20,
                borderLeft: '2px solid var(--glass-border)',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.3)'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRoles.map((role, index) => (
              <tr key={role.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '12px 16px' }}>{(page - 1) * limit + index + 1}</td>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{role.name}</td>
                <td style={{ padding: '12px 16px' }}>{role.level}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }} className="flex-wrap">
                    {role.permissions.map(p => (
                      <span key={p} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', color: 'var(--primary)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="actions-cell" style={{
                    padding: '12px 16px',
                    position: 'sticky',
                    right: 0,
                    background: '#1e293b',
                    zIndex: 10,
                    borderLeft: '2px solid var(--glass-border)',
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.3)'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.875rem' }} onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }}>Edit</button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.875rem' }} onClick={() => handleDeleteRole(role.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Showing {Math.min((page - 1) * limit + 1, totalRoles)}-{Math.min(page * limit, totalRoles)} of {totalRoles} roles
            </p>
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ padding: '6px 12px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white', fontSize: '0.875rem' }}
            >
              {[5, 10, 20, 50].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ border: '1px solid var(--glass-border)', padding: '6px 12px', fontSize: '0.875rem' }}>Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
              .map((p, i, arr) => {
                const showEllipsis = i > 0 && p !== arr[i - 1] + 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span style={{ color: 'var(--text-muted)', padding: '6px 4px' }}>...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`btn ${page === p ? 'btn-primary' : ''}`}
                      style={{ minWidth: '36px', padding: '6px', border: '1px solid var(--glass-border)', fontSize: '0.875rem' }}
                    >{p}</button>
                  </React.Fragment>
                );
              })
            }
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ border: '1px solid var(--glass-border)', padding: '6px 12px', fontSize: '0.875rem' }}>Next</button>
          </div>
        </div>
      </div>

      {/* Role Modal */}
      {isRoleModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ width: '90%', maxWidth: '600px', padding: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingRole?.id ? 'Edit Role' : 'New Role'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveRole(); }}>
              <div className="input-group">
                <label>Role Name</label>
                <input 
                  required
                  value={editingRole?.name || ''} 
                  onChange={e => setEditingRole({ ...editingRole!, name: e.target.value })}
                  placeholder="Manager"
                />
              </div>
              <div className="input-group">
                <label>Hierarchy Level (1-100)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={editingRole?.level || 10} 
                  onChange={e => setEditingRole({ ...editingRole!, level: parseInt(e.target.value) })}
                  placeholder="10"
                />
                <small style={{ color: 'var(--text-muted)' }}>Lower number = Higher authority (e.g. 1 = Super Admin)</small>
              </div>
              <div className="input-group">
                <label>Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2%', marginTop: '2%' }}>
                  {availablePermissions.map(perm => (
                    <label key={perm} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      fontSize: '0.875rem', 
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: editingRole?.permissions?.includes(perm) ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      transition: 'all 0.2s ease',
                      height: '48px'
                    }}>
                      <span style={{ 
                        color: editingRole?.permissions?.includes(perm) ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: editingRole?.permissions?.includes(perm) ? '600' : '400'
                      }}>
                        {perm.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                      <input 
                        type="checkbox" 
                        checked={editingRole?.permissions?.includes(perm) || false} 
                        onChange={() => togglePermission(perm)}
                        style={{ 
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--primary)'
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2%', marginTop: '5%' }}>
                <button type="button" className="btn" onClick={() => setIsRoleModalOpen(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingRole?.id ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
