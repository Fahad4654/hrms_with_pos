import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const AdminSettings: React.FC = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: '4%' }}>Role Management</h1>
      
      <div className="glass-card" style={{ padding: '3%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3%' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Roles</h2>
          <button className="btn btn-primary" onClick={() => { setEditingRole({ name: '', permissions: [] }); setIsRoleModalOpen(true); }}>
            + New Role
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '1.5%' }}>Role Name</th>
              <th style={{ padding: '1.5%' }}>Permissions</th>
              <th style={{ padding: '1.5%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1.5%', fontWeight: 'bold' }}>{role.name}</td>
                <td style={{ padding: '1.5%' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5%' }}>
                    {role.permissions.map(p => (
                      <span key={p} style={{ fontSize: '0.75rem', padding: '0.5% 1.5%', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', color: 'var(--primary)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '1.5%' }}>
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
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '4%', width: '90%', maxWidth: '40%' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2%', marginTop: '2%' }}>
                  {availablePermissions.map(perm => (
                    <label key={perm} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '2%', 
                      fontSize: '0.875rem', 
                      cursor: 'pointer',
                      padding: '2%',
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
