import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';

interface Category {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    products: number;
  };
}

const Categories: React.FC = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { formatDateTime } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCategories();
  }, [meta.page, meta.limit, sortBy, sortOrder]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories', {
        params: {
          page: meta.page,
          limit: meta.limit,
          sortBy,
          sortOrder
        }
      });
      setCategories(data.data);
      setMeta(prev => ({ 
        ...prev, 
        total: data.meta.total, 
        totalPages: data.meta.totalPages,
        page: data.meta.page
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Error fetching categories', 'error');
    } finally {
      setLoading(false);
    }
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
      
      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th 
                style={{ padding: '2% 3%', cursor: 'pointer', userSelect: 'none', width: '50%' }} 
                onClick={() => toggleSort('name')}
              >
                Category Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                style={{ padding: '2% 3%', cursor: 'pointer', userSelect: 'none', width: '25%' }} 
                onClick={() => toggleSort('createdAt')}
              >
                Created Timestamp {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '2% 3%', textAlign: 'right', width: '25%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '5%', textAlign: 'center' }}>No categories found</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '2% 3%', fontWeight: '500' }}>{cat.name}</td>
                  <td style={{ padding: '2% 3%' }}>{formatDateTime(cat.createdAt)}</td>
                  <td style={{ padding: '2% 3%' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => { setEditingCategory(cat); setShowModal(true); }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => handleDeleteCategory(cat.id)}
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

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3%', flexWrap: 'wrap', gap: '2%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} categories
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
            {[10, 25, 50, 100].map(l => <option key={l} value={l}>{l}</option>)}
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
