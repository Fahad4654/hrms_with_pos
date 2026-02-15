import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  price: number;
  stockLevel: number;
}

interface Category {
  id: string;
  name: string;
}

const ProductCatalog: React.FC = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ sku: '', name: '', categoryId: '', price: 0, stockLevel: 0 });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [meta.page, meta.limit, sortBy, sortOrder]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
      if (data.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products', {
        params: {
          page: meta.page,
          limit: meta.limit,
          search,
          sortBy,
          sortOrder
        }
      });
      setProducts(data.data);
      setMeta(prev => ({ 
        ...prev, 
        total: data.meta.total, 
        totalPages: data.meta.totalPages,
        page: data.meta.page
      }));
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta(prev => ({ ...prev, page: 1 }));
    fetchProducts();
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
      await api.post('/products', formData);
      setShowModal(false);
      setFormData({ sku: '', name: '', categoryId: categories[0]?.id || '', price: 0, stockLevel: 0 });
      fetchProducts();
      showToast('Product created successfully', 'success');
    } catch (error) {
      alert('Failed to create product'); // Fallback if showToast fails but it shouldn't
      showToast('Failed to create product', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ margin: 0 }}>Inventory Management</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '200px' }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Product</button>
        </div>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th onClick={() => toggleSort('sku')} style={{ padding: '16px 24px', cursor: 'pointer' }}>
                SKU {sortBy === 'sku' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('name')} style={{ padding: '16px 24px', cursor: 'pointer' }}>
                Product Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('category')} style={{ padding: '16px 24px', cursor: 'pointer' }}>
                Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('price')} style={{ padding: '16px 24px', cursor: 'pointer' }}>
                Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('stockLevel')} style={{ padding: '16px 24px', cursor: 'pointer' }}>
                Stock {sortBy === 'stockLevel' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '16px 24px' }}>Status</th>
              <th style={{ padding: '16px 24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>No products found</td></tr>
            ) : (
              products.map(product => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{product.sku}</td>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>{product.name}</td>
                  <td style={{ padding: '16px 24px' }}>{product.category?.name || 'N/A'}</td>
                  <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>${Number(product.price).toFixed(2)}</td>
                  <td style={{ padding: '16px 24px' }}>{product.stockLevel} units</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      background: product.stockLevel < 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: product.stockLevel < 10 ? 'var(--error)' : 'var(--success)'
                    }}>
                      {product.stockLevel < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <button style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} products
          </p>
          <select 
            value={meta.limit} 
            onChange={e => setMeta(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            style={{ 
              padding: '4px 8px', 
              background: 'rgba(15, 23, 42, 0.5)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '4px', 
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            {[10, 25, 50, 100].map(l => <option key={l} value={l}>{l} / page</option>)}
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

      {/* Product Modal */}
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
            <h2>New Product</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>SKU</label>
                  <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select 
                    style={{ width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    value={formData.categoryId} 
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Product Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Price ($)</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div className="input-group">
                  <label>Initial Stock</label>
                  <input type="number" required value={formData.stockLevel} onChange={e => setFormData({...formData, stockLevel: Number(e.target.value)})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
