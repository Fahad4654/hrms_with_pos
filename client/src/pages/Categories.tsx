import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Category {
  id: string;
  name: string;
  _count?: {
    products: number;
  };
}

const Categories: React.FC = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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
      showToast('Error fetching categories', 'error');
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
        showToast('Category updated successfully', 'success');
      } else {
        await api.post('/categories', { name: editingCategory.name });
        showToast('Category created successfully', 'success');
      }
      setShowModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      showToast('Error saving category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? Products in this category may be affected.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
        showToast('Category deleted successfully', 'success');
      } catch (error: any) {
        console.error('Error deleting category:', error);
        showToast(error.response?.data?.message || 'Error deleting category', 'error');
      }
    }
  };

  if (loading) return <div>Loading categories...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%' }}>
        <h1 style={{ margin: 0 }}>Product Categories</h1>
        <button className="btn btn-primary" onClick={() => { setEditingCategory({ name: '' }); setShowModal(true); }}>
          + New Category
        </button>
      </div>
      
      <div className="glass-card" style={{ padding: '3%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2%' }}>
          {categories.map(cat => (
            <div key={cat.id} className="glass-card" style={{ 
              padding: '3%', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--glass-border)'
            }}>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>{cat.name}</span>
              <div style={{ display: 'flex', gap: '2%' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.5% 1.5%', fontSize: '0.875rem' }} 
                  onClick={() => { setEditingCategory(cat); setShowModal(true); }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.5% 1.5%', fontSize: '0.875rem', color: 'var(--error)' }} 
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
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '4%', width: '90%', maxWidth: '40%' }}>
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
              <div style={{ display: 'flex', gap: '12px', marginTop: '5%' }}>
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
