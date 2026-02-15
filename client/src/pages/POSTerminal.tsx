import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockLevel: number;
}

interface CartItem extends Product {
  quantity: number;
}

const POSTerminal: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // For POS, we'll fetch a larger set (e.g., 50) and handle local filtering for speed, 
      // or we can implement real-time search from backend.
      // Let's do real-time search from backend for consistency.
      const { data } = await api.get('/products', {
        params: {
          search,
          limit: 50
        }
      });
      setProducts(data.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stockLevel <= 0) return alert('Out of stock');
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    setLoading(true);
    const saleData = {
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        priceAtSale: Number(item.price),
      }))
    };

    try {
      await api.post('/sales/checkout', saleData);
      alert('Sale completed successfully!');
      setCart([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Checkout failed, saving to offline queue', error);
      const offlineQueue = JSON.parse(localStorage.getItem('offline_sales') || '[]');
      offlineQueue.push({ ...saleData, timestamp: new Date().toISOString() });
      localStorage.setItem('offline_sales', JSON.stringify(offlineQueue));
      
      alert('Checkout failed (likely offline). Transaction saved locally and will sync later.');
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  // Basic sync mechanism
  useEffect(() => {
    const syncOfflineSales = async () => {
      const queue = JSON.parse(localStorage.getItem('offline_sales') || '[]');
      if (queue.length === 0) return;

      console.log(`Attempting to sync ${queue.length} offline sales...`);
      const remaining = [];
      for (const sale of queue) {
        try {
          await api.post('/sales/checkout', { items: sale.items });
        } catch (err) {
          remaining.push(sale);
        }
      }
      localStorage.setItem('offline_sales', JSON.stringify(remaining));
      if (remaining.length === 0 && queue.length > 0) {
        console.log('All offline sales synced successfully!');
      }
    };

    window.addEventListener('online', syncOfflineSales);
    return () => window.removeEventListener('online', syncOfflineSales);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredProducts = products; // Already filtered by backend

  return (
    <div className="pos-container" style={{ display: 'flex', gap: '32px', height: 'calc(100vh - 120px)' }}>
      {/* Product Selection Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
          <input 
            type="text" 
            placeholder="Search SKU or Name..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', overflowY: 'auto' }}>
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              className="glass-card" 
              onClick={() => addToCart(p)}
              style={{ padding: '16px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📦</div>
              <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '4px' }}>{p.name}</p>
              <p style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${Number(p.price).toFixed(2)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.stockLevel} in stock</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart / Checkout Area */}
      <div className="glass-card pos-cart" style={{ width: '400px', display: 'flex', flexDirection: 'column', padding: '24px' }}>
        <h2 style={{ marginBottom: '24px' }}>Current Sale</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '24px' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <p style={{ fontWeight: '500' }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.quantity} x ${Number(item.price).toFixed(2)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold' }}>${(item.quantity * Number(item.price)).toFixed(2)}</p>
                  <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</span>
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', height: '60px', fontSize: '1.25rem', justifyContent: 'center' }}
            disabled={cart.length === 0 || loading}
            onClick={handleCheckout}
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSTerminal;
