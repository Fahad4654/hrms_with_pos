import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

interface Sale {
  id: string;
  totalAmount: number;
  timestamp: string;
  employee: { name: string };
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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1>Sales History</h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Search by employee..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '250px' }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '16px 24px' }}>Date</th>
              <th style={{ padding: '16px 24px' }}>Employee</th>
              <th style={{ padding: '16px 24px' }}>Items</th>
              <th style={{ padding: '16px 24px' }}>Total Amount</th>
              <th style={{ padding: '16px 24px' }}>ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>Loading transactions...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>No transactions found</td></tr>
            ) : (
              sales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px' }}>{new Date(sale.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>{sale.employee?.name}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {sale.items.length} items
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>${Number(sale.totalAmount).toFixed(2)}</td>
                  <td style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.id.slice(0, 8)}...</td>
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
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} transactions
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
    </div>
  );
};

export default SalesHistory;
