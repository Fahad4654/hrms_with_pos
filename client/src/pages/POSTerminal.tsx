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
  image?: string | null;
}

interface CartItem extends Product {
  quantity: number;
}

const POSTerminal: React.FC = () => {
  const { showToast } = useToast();
  const { formatDateTime, formatCurrency } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleCustomerSearch = (field: 'phone' | 'email', value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
    setShowSuggestions(true);
    
    if (value.length >= 3) {
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(async () => {
        setSearchingCustomer(true);
        try {
          const { data } = await api.get('/customers/search', { params: { q: value } });
          setSuggestions(data.data || []);
        } catch (error) {
          console.error('Error searching customer', error);
          setSuggestions([]);
        } finally {
          setSearchingCustomer(false);
        }
      }, 600);
      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (match: any) => {
    setCustomer({
      name: match.name || '',
      email: match.email || '',
      phone: match.phone || '',
      address: match.address || ''
    });
    setSuggestions([]);
    setShowSuggestions(false);
    showToast('Customer details loaded', 'success');
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
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockLevel) {
          showToast(`Cannot add more. Only ${product.stockLevel} in stock.`, 'warning');
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      if (product.stockLevel <= 0) {
        showToast('Out of stock', 'warning');
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (!existing) return prev;

      const newQuantity = existing.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(item => item.id !== productId);
      }
      
      if (newQuantity > existing.stockLevel) {
        showToast(`Cannot add more. Only ${existing.stockLevel} in stock.`, 'warning');
        return prev;
      }

      return prev.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const subtotalValue = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const taxValue = subtotalValue * 0.08;
  const totalValue = subtotalValue + taxValue;

  const handlePrintMemo = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = sale.items.map((item: any) => `
      <tr>
        <td style="padding: 8px 0;">${item.product?.name || 'Unknown Product'}</td>
        <td style="padding: 8px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right;">${formatCurrency(item.priceAtSale)}</td>
        <td style="padding: 8px 0; text-align: right;">${formatCurrency(item.quantity * item.priceAtSale)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Memo #${sale.transactionId}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 1px solid #eee; padding: 12px 0; text-align: left; color: #666; font-size: 14px; }
            .totals { float: right; width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .grand-total { border-top: 2px solid #eee; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; color: #000; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALES RECEIPT</h1>
            <p>Transaction ID: #${sale.transactionId}</p>
            <p>${formatDateTime(sale.timestamp)}</p>
          </div>
          <div class="info">
            <div>
              <h3>Customer Info</h3>
              <p>Name: ${sale.customer?.name || 'Walk-in'}</p>
              ${sale.customer?.phone ? `<p>Phone: ${sale.customer.phone}</p>` : ''}
              ${sale.customer?.address ? `<p>Address: ${sale.customer.address}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <h3>Employee</h3>
              <p>${sale.employee?.name || 'Staff'}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formatCurrency(sale.subtotal)}</span>
            </div>
            <div class="total-row">
              <span>Tax (8%)</span>
              <span>${formatCurrency(sale.taxAmount)}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total</span>
              <span>${formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
      const { data } = await api.post('/sales/checkout', saleData);
      showToast('Sale completed successfully!', 'success');
      handlePrintMemo(data);
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
              {p.image ? (
                <img 
                  src={p.image.startsWith('http') ? p.image : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}${p.image.startsWith('/') ? '' : '/'}${p.image}`} 
                  alt={p.name}
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', margin: '0 auto 8px' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }}
                />
              ) : null}
              <div style={{ fontSize: '2rem', marginBottom: '8px', display: p.image ? 'none' : 'block' }}>📦</div>
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
        <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)', position: 'relative' }}>
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
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              marginTop: '4px',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {suggestions.map((s, i) => (
                <div 
                  key={s.id || i}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.phone && <span style={{ marginRight: '8px' }}>📞 {s.phone}</span>}
                    {s.email && <span>✉️ {s.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '4%' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '10%' }}>Cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4%', paddingBottom: '4%', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <p style={{ fontWeight: '500', marginBottom: '4px' }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{useLocale().formatCurrency(item.price)}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <p style={{ fontWeight: 'bold' }}>{useLocale().formatCurrency(item.quantity * Number(item.price))}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >-</button>
                    <span style={{ fontSize: '0.875rem', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >+</button>
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '8px' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '5%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2%', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotalValue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4%', color: 'var(--text-muted)' }}>
            <span>Tax (8%)</span>
            <span>{formatCurrency(taxValue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6%', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>{formatCurrency(totalValue)}</span>
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
