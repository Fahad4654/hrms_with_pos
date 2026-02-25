import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Sale {
  id: string;
  transactionId: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  timestamp: string;
  employee: { name: string };
  customer?: { name: string; phone?: string; email?: string; address?: string; };
  items: Array<{
    id: string;
    quantity: number;
    priceAtSale: number;
    product: { name: string };
  }>;
}

interface PaginatedResponse {
  data: Sale[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { formatDateTime, formatCurrency } = useLocale();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchHistory();
  }, [meta.page, meta.limit]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse>('/sales/history', {
        params: {
          page: meta.page,
          limit: meta.limit,
          search
        }
      });
      setSales(data.data);
      setMeta(prev => ({ 
        ...prev, 
        total: data.meta.total, 
        totalPages: data.meta.totalPages,
        page: data.meta.page
      }));
    } catch (error) {
      console.error('Failed to fetch sales history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta(prev => ({ ...prev, page: 1 }));
    fetchHistory();
  };

  const handleDeleteSale = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Sale',
      message: 'Are you sure you want to delete this sale? This action will restore product inventory and remove the transaction and its associated commissions permanently.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.delete(`/sales/${id}`);
        showToast('Sale deleted and inventory restored successfully', 'success');
        fetchHistory();
      } catch (error: any) {
        showToast(error.response?.data?.message || 'Error deleting sale', 'error');
      }
    }
  };

  const handlePrintMemo = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = sale.items.map(item => `
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
            <h1>SALES MEMO</h1>
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
              <p>${sale.employee?.name}</p>
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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%', flexWrap: 'wrap', gap: '2%' }}>
        <h1>Sales History</h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Search by employee or transaction ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: '250px' }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '12px 16px', width: '50px' }}>#</th>
              <th style={{ padding: '12px 16px', width: '180px' }}>Timestamp</th>
              <th style={{ padding: '12px 16px', width: '20%' }}>Customer</th>
              <th style={{ padding: '12px 16px', width: '20%' }}>Employee</th>
              <th style={{ padding: '12px 16px', width: '100px' }}>Items</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>Total Amount</th>
              <th style={{ padding: '12px 16px', width: '100px' }}>ID</th>
              <th className="actions-cell" style={{ 
                padding: '12px 16px', 
                width: '170px', 
                position: 'sticky', 
                right: 0, 
                background: '#1e293b', 
                zIndex: 20,
                borderLeft: '2px solid var(--glass-border)',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.3)'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '5%', textAlign: 'center' }}>Loading transactions...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '5%', textAlign: 'center' }}>No transactions found</td></tr>
            ) : (
              sales.map((sale, index) => (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px 16px' }}>{(meta.page - 1) * meta.limit + index + 1}</td>
                  <td className="td-wrap" style={{ padding: '12px 16px' }}>{formatDateTime(sale.timestamp)}</td>
                  <td className="td-wrap" style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--accent)' }}>
                    {sale.customer?.name || <span style={{ color: 'var(--text-muted)' }}>Walk-in</span>}
                  </td>
                  <td className="td-wrap" style={{ padding: '12px 16px', fontWeight: '500' }}>{sale.employee?.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {sale.items.length} items
                    </div>
                  </td>
                  <td className="td-wrap" style={{ padding: '2% 3%', fontWeight: 'bold' }}>{formatCurrency(sale.totalAmount)}</td>
                  <td className="td-wrap" style={{ padding: '2% 3%', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>#{sale.transactionId}</td>
                  <td className="actions-cell" style={{ 
                    padding: '12px 16px',
                    position: 'sticky',
                    right: 0,
                    background: '#1e293b',
                    zIndex: 10,
                    borderLeft: '2px solid var(--glass-border)',
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.3)'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => { setViewingSale(sale); setIsDetailsModalOpen(true); }}
                      >
                        Details
                      </button>
                      <button 
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => handleDeleteSale(sale.id)}
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
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} transactions
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

      {/* Details Modal */}
      {isDetailsModalOpen && viewingSale && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ width: '90%', maxWidth: '600px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>Sale Details</h2>
            
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Transaction ID</p>
                <p style={{ margin: 0, fontWeight: '500' }}>#{viewingSale.transactionId}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Date & Time</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{formatDateTime(viewingSale.timestamp)}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Employee</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{viewingSale.employee?.name}</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>Customer Details</h3>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
              {viewingSale.customer ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Name</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{viewingSale.customer.name}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Phone</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{viewingSale.customer.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Email</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{viewingSale.customer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Address</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{viewingSale.customer.address || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>Walk-in Customer</p>
              )}
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>Items Purchased</h3>
            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '10px', width: '50%' }}>Product</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingSale.items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '10px' }}>{item.product?.name || 'Unknown Product'}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(item.priceAtSale)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                        {formatCurrency(item.quantity * Number(item.priceAtSale))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>Subtotal:</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                      {formatCurrency(viewingSale.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>Tax (8%):</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                      {formatCurrency(viewingSale.taxAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 'bold' }}>Total Amount:</td>
                    <td style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {formatCurrency(viewingSale.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handlePrintMemo(viewingSale)} 
                style={{ padding: '8px 20px' }}
              >
                Print Memo
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsDetailsModalOpen(false)} 
                style={{ border: '1px solid var(--glass-border)', padding: '8px 20px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
