import { useState, useEffect } from 'react';
import api from '../services/api.js';

interface Category {
  id: string;
  name: string;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;
    try {
      if (editingCategory.id) {
        await api.put(`/categories/${editingCategory.id}`, { name: editingCategory.name });
      } else {
        await api.post('/categories', { name: editingCategory.name });
      }
      setShowModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      alert('Error saving category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting category');
    }
  };

  if (loading) return <div>Loading categories...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ margin: 0 }}>Product Categories</h1>
        <button className="btn btn-primary" onClick={() => { setEditingCategory({ name: '' }); setShowModal(true); }}>
          + New Category
        </button>
      </div>
      
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {categories.map(cat => (
            <div key={cat.id} className="glass-card" style={{ 
              padding: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--glass-border)'
            }}>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>{cat.name}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '4px 12px', fontSize: '0.875rem' }} 
                  onClick={() => { setEditingCategory(cat); setShowModal(true); }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '4px 12px', fontSize: '0.875rem', color: 'var(--error)' }} 
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Modal */}
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
            <h2>{editingCategory?.id ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSaveCategory}>
              <div className="input-group">
                <label>Category Name</label>
                <input 
                  required
                  value={editingCategory?.name || ''} 
                  onChange={e => setEditingCategory({ ...editingCategory!, name: e.target.value })}
                  placeholder="Electronics"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => { setShowModal(false); setEditingCategory(null); }} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingCategory?.id ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
