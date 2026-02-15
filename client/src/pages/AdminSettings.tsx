import { useState, useEffect } from 'react';
import api from '../services/api.js';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface Category {
  id: string;
  name: string;
}

const AdminSettings: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'categories'>('roles');
  
  // Role Edit State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  
  // Category Edit State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const availablePermissions = [
    'employees', 'attendance', 'leave', 'products', 'pos', 'sales', 'analytics', 'all'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, catsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/categories')
      ]);
      setRoles(rolesRes.data);
      setCategories(catsRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole?.name) return;
    try {
      if (editingRole.id) {
        await api.put(`/roles/${editingRole.id}`, editingRole);
      } else {
        await api.post('/roles', editingRole);
      }
      setIsRoleModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Error saving role');
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory?.name) return;
    try {
      if (editingCategory.id) {
        await api.put(`/categories/${editingCategory.id}`, { name: editingCategory.name });
      } else {
        await api.post('/categories', { name: editingCategory.name });
      }
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Error saving category');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting role');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting category');
    }
  };

  const togglePermission = (perm: string) => {
    if (!editingRole) return;
    const currentPerms = editingRole.permissions || [];
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    setEditingRole({ ...editingRole, permissions: newPerms });
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: '32px' }}>Admin Settings</h1>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'roles' ? '' : 'btn-outline'}`}
          onClick={() => setActiveTab('roles')}
          style={{ padding: '8px 24px' }}
        >
          Roles & Permissions
        </button>
        <button 
          className={`btn ${activeTab === 'categories' ? '' : 'btn-outline'}`}
          onClick={() => setActiveTab('categories')}
          style={{ padding: '8px 24px' }}
        >
          Product Categories
        </button>
      </div>

      {activeTab === 'roles' ? (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Roles</h2>
            <button className="btn" onClick={() => { setEditingRole({ name: '', permissions: [] }); setIsRoleModalOpen(true); }}>
              Add Role
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
      ) : (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Product Categories</h2>
            <button className="btn" onClick={() => { setEditingCategory({ name: '' }); setIsCategoryModalOpen(true); }}>
              Add Category
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {categories.map(cat => (
              <div key={cat.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontWeight: '600' }}>{cat.name}</span>
                <div>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', marginRight: '8px' }} onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}>Edit</button>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', color: 'var(--error)' }} onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Modal */}
      {isRoleModalOpen && (
        <div className="modal-overlay active">
          <div className="glass-card animate-scale-up" style={{ width: '400px', padding: '32px' }}>
            <h3>{editingRole?.id ? 'Edit Role' : 'New Role'}</h3>
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Role Name</label>
              <input 
                className="input-field" 
                value={editingRole?.name} 
                onChange={e => setEditingRole({ ...editingRole!, name: e.target.value })}
                placeholder="Manager"
              />
            </div>
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Permissions</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {availablePermissions.map(perm => (
                  <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={editingRole?.permissions?.includes(perm)} 
                      onChange={() => togglePermission(perm)}
                    />
                    {perm.charAt(0).toUpperCase() + perm.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
              <button className="btn" style={{ flex: 1 }} onClick={handleSaveRole}>Save</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsRoleModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="modal-overlay active">
          <div className="glass-card animate-scale-up" style={{ width: '400px', padding: '32px' }}>
            <h3>{editingCategory?.id ? 'Edit Category' : 'New Category'}</h3>
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Category Name</label>
              <input 
                className="input-field" 
                value={editingCategory?.name} 
                onChange={e => setEditingCategory({ ...editingCategory!, name: e.target.value })}
                placeholder="Electronics"
              />
            </div>
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
              <button className="btn" style={{ flex: 1 }} onClick={handleSaveCategory}>Save</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsCategoryModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
