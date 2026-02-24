import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../context/LocaleContext';

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
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleCustomerSearch = (field: 'phone' | 'email', value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
    
    if (value.length >= 3) {
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(async () => {
        setSearchingCustomer(true);
        try {
          const { data } = await api.get('/customers/search', { params: { q: value } });
          const matches = data.data;
          if (matches && matches.length > 0) {
            // Auto-fill from the first match
            const match = matches[0];
            setCustomer({
              name: match.name || '',
              email: match.email || '',
              phone: match.phone || '',
              address: match.address || ''
            });
            showToast('Customer details auto-filled', 'success');
          }
        } catch (error) {
          console.error('Error searching customer', error);
        } finally {
          setSearchingCustomer(false);
        }
      }, 600);
      setSearchTimeout(timeout);
    }
  };

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
      showToast('Failed to fetch products', 'error');
    }
  };

  const addToCart = (product: Product) => {
    if (product.stockLevel <= 0) return showToast('Out of stock', 'warning');
    
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
      })),
      customer: customer.name ? customer : undefined
    };

    try {
      await api.post('/sales/checkout', saleData);
      showToast('Sale completed successfully!', 'success');
      setCart([]);
      setCustomer({ name: '', email: '', phone: '', address: '' });
      fetchProducts();
    } catch (error: any) {
      console.error('Checkout failed, saving to offline queue', error);
      const offlineQueue = JSON.parse(localStorage.getItem('offline_sales') || '[]');
      offlineQueue.push({ ...saleData, timestamp: new Date().toISOString() });
      localStorage.setItem('offline_sales', JSON.stringify(offlineQueue));
      
      showToast('Checkout failed (likely offline). Transaction saved locally and will sync later.', 'warning');
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
    <div className="pos-container" style={{ display: 'flex', gap: '4%', height: 'calc(100vh - 120px)' }}>
      {/* Product Selection Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="glass-card" style={{ padding: '12px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.2rem', opacity: 0.7 }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search by SKU or Name..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', padding: '8px 0', fontSize: '1rem' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', overflowY: 'auto', padding: '4px' }}>
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              className="glass-card" 
              onClick={() => addToCart(p)}
              style={{ 
                padding: '16px', 
                cursor: 'pointer', 
                textAlign: 'center', 
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '160px'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
              <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '4px', color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
              <p style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{useLocale().formatCurrency(p.price)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.stockLevel} units</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart / Checkout Area */}
      <div className="glass-card pos-cart" style={{ width: '30%', minWidth: '350px', display: 'flex', flexDirection: 'column', padding: '2% 3%' }}>
        <h2 style={{ marginBottom: '4%' }}>Current Sale</h2>
        
        {/* Customer Information Form */}
        <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-main)' }}>Customer Details (Optional)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Name *" 
              value={customer.name}
              onChange={e => setCustomer(prev => ({ ...prev, name: e.target.value }))}
              style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', padding: '8px 10px', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}
            />
            <input 
              type="text" 
              placeholder="Phone (Search)" 
              value={customer.phone}
              onChange={e => handleCustomerSearch('phone', e.target.value)}
              style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', padding: '8px 10px', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}
            />
            <input 
              type="email" 
              placeholder="Email (Search)" 
              value={customer.email}
              onChange={e => handleCustomerSearch('email', e.target.value)}
              style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', padding: '8px 10px', borderRadius: '4px', color: 'white', fontSize: '0.85rem', gridColumn: '1 / span 2' }}
            />
            <input 
              type="text" 
              placeholder="Address" 
              value={customer.address}
              onChange={e => setCustomer(prev => ({ ...prev, address: e.target.value }))}
              style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)', padding: '8px 10px', borderRadius: '4px', color: 'white', fontSize: '0.85rem', gridColumn: '1 / span 2' }}
            />
          </div>
          {searchingCustomer && <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '8px', margin: 0 }}>Searching customer...</p>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '4%' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '10%' }}>Cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4%', paddingBottom: '4%', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <p style={{ fontWeight: '500' }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.quantity} x {useLocale().formatCurrency(item.price)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold' }}>{useLocale().formatCurrency(item.quantity * Number(item.price))}</p>
                  <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '5%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2%', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>{useLocale().formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4%', color: 'var(--text-muted)' }}>
            <span>Tax (8%)</span>
            <span>{useLocale().formatCurrency(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6%', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>{useLocale().formatCurrency(total)}</span>
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
