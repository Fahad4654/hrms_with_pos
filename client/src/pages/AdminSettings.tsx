import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const AdminSettings: React.FC = () => {
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Role Edit State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  const availablePermissions = [
    'all',
    'employees',
    'attendance',
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
    } catch (error) {
      console.error('Error saving role:', error);
      showToast('Error saving role', 'error');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchData();
      showToast('Role deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      showToast(error.response?.data?.message || 'Error deleting role', 'error');
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

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: '32px' }}>Role Management</h1>
      
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Roles</h2>
          <button className="btn btn-primary" onClick={() => { setEditingRole({ name: '', permissions: [] }); setIsRoleModalOpen(true); }}>
            + New Role
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Role Name</th>
              <th style={{ padding: '12px' }}>Permissions</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{role.name}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {role.permissions.map(p => (
                      <span key={p} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', color: 'var(--primary)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', marginRight: '8px' }} onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }}>Edit</button>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', color: 'var(--error)' }} onClick={() => handleDeleteRole(role.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Modal */}
      {isRoleModalOpen && (
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
            <h2>{editingRole?.id ? 'Edit Role' : 'New Role'}</h2>
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
                <label>Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '8px' }}>
                  {availablePermissions.map(perm => (
                    <label key={perm} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '0.875rem', 
                      cursor: 'pointer',
                      padding: '8px',
                      background: editingRole?.permissions?.includes(perm) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={editingRole?.permissions?.includes(perm) || false} 
                        onChange={() => togglePermission(perm)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{perm.charAt(0).toUpperCase() + perm.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
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
