import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stockLevel: number;
}

const ProductCatalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 8 });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ sku: '', name: '', category: 'General', price: 0, stockLevel: 0 });

  useEffect(() => {
    fetchProducts();
  }, [meta.page, meta.limit]);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products', {
        params: {
          page: meta.page,
          limit: meta.limit,
          search
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', formData);
      setShowModal(false);
      setFormData({ sku: '', name: '', category: 'General', price: 0, stockLevel: 0 });
      fetchProducts();
    } catch (error) {
      alert('Failed to create product');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1>Inventory & Catalog</h1>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
            No products found matching your search.
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} className="glass-card animate-fade-in" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{product.sku}</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  background: product.stockLevel < 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: product.stockLevel < 10 ? 'var(--error)' : 'var(--success)'
                }}>
                  {product.stockLevel < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
              <h3 style={{ marginBottom: '4px' }}>{product.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>{product.category}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Stock</p>
                  <p style={{ fontWeight: 'bold' }}>{product.stockLevel} units</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent)' }}>${Number(product.price).toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', flexWrap: 'wrap', gap: '16px' }}>
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
            {[8, 16, 32, 64].map(l => <option key={l} value={l}>{l} / page</option>)}
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

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h2>Add New Product</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>SKU</label>
                  <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
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
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
