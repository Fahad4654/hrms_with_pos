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
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
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
          search,
          sortBy,
          sortOrder
        } 
      });
      if (data && data.data) {
        setCategories(data.data);
        setMeta(prev => ({ 
          ...prev, 
          total: data.meta.total, 
          totalPages: data.meta.totalPages,
          page: data.meta.page
        }));
      } else if (Array.isArray(data)) {
        // Fallback for older API format if any
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
      showToast('Failed to fetch categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta(prev => ({ ...prev, page: 1 }));
    fetchCategories();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%', flexWrap: 'wrap', gap: '2%' }}>
        <h1 style={{ margin: 0 }}>Category Management</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '150px' }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setName(''); setShowModal(true); }}>
            + New Category
          </button>
        </div>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th onClick={() => toggleSort('name')} style={{ padding: '2% 3%', cursor: 'pointer' }}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '2% 3%' }}>
                Products Count
              </th>
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
