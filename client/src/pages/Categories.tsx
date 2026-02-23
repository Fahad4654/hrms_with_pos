import React, { useState, useEffect } from 'react';
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
  const [name, setName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories', { params: { limit: 1000 } });
      setCategories(data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories', error);
      showToast('Failed to fetch categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, { name });
        showToast('Category updated successfully', 'success');
      } else {
        await api.post('/categories', { name });
        showToast('Category created successfully', 'success');
      }
      setShowModal(false);
      setName('');
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save category';
      showToast(message, 'error');
    }
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This will fail if it has products.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
        showToast('Category deleted successfully', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.message || 'Failed to delete category', 'error');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%' }}>
        <h1 style={{ margin: 0 }}>Category Management</h1>
        <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setName(''); setShowModal(true); }}>
          + New Category
        </button>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '2% 3%' }}>Name</th>
              <th style={{ padding: '2% 3%' }}>Products Count</th>
              <th style={{ padding: '2% 3%', width: '20%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: '5%', textAlign: 'center' }}>Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '5%', textAlign: 'center' }}>No categories found</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '2% 3%', fontWeight: '500' }}>{cat.name}</td>
                  <td style={{ padding: '2% 3%' }}>{cat._count?.products || 0} items</td>
                  <td style={{ padding: '2% 3%' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ padding: '4px 12px' }} onClick={() => openEditModal(cat)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '4px 12px' }} onClick={() => handleDelete(cat.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '30px', width: '90%', maxWidth: '400px' }}>
            <h2>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Category Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Electronics" />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn" style={{ flex: 1, border: '1px solid var(--glass-border)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
