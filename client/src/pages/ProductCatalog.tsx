import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  companyId: string | null;
  company: {
    id: string;
    name: string;
  } | null;
  price: number;
  stockLevel: number;
  features: string | null;
  image: string | null;
}

interface ProductCompany {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

const ProductCatalog: React.FC = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<ProductCompany[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ 
    sku: '', 
    name: '', 
    categoryId: '', 
    companyId: '', 
    price: 0, 
    stockLevel: 0,
    features: '',
    image: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCompanies();
  }, [meta.page, meta.limit, sortBy, sortOrder]);

  const fetchCompanies = async () => {
    try {
      const { data } = await api.get('/companies', { params: { limit: 1000 } });
      setCompanies(data.data || []);
    } catch (error) {
      console.error('Failed to fetch companies', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories', { params: { limit: 1000 } });
      const categoriesArray = data.data || data;
      if (categoriesArray && Array.isArray(categoriesArray)) {
        setCategories(categoriesArray);
        if (categoriesArray.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: categoriesArray[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
      showToast('Failed to fetch categories', 'error');
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
      if (data && data.data) {
        setProducts(data.data);
        setMeta(prev => ({ 
          ...prev, 
          total: data.meta.total, 
          totalPages: data.meta.totalPages,
          page: data.meta.page
        }));
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
      showToast('Failed to fetch products', 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB', 'error');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploadingImage(true);
    try {
      const { data } = await api.post('/products/upload-image', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setFormData(prev => ({ ...prev, image: data.imageUrl }));
      showToast('Image uploaded successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploadingImage(false);
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

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', formData);
      setShowModal(false);
      setFormData({ 
        sku: '', 
        name: '', 
        categoryId: categories[0]?.id || '', 
        companyId: companies[0]?.id || '', 
        price: 0, 
        stockLevel: 0,
        features: '',
        image: ''
      });
      fetchProducts();
      showToast('Product created successfully', 'success');
    } catch (error: any) {
      console.error('Failed to create product', error);
      const message = error.response?.data?.message || 'Failed to create product';
      showToast(message, 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.put(`/products/${editingProduct.id}`, formData);
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ 
        sku: '', 
        name: '', 
        categoryId: categories[0]?.id || '', 
        companyId: companies[0]?.id || '', 
        price: 0, 
        stockLevel: 0,
        features: '',
        image: ''
      });
      fetchProducts();
      showToast('Product updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to update product', error);
      const message = error.response?.data?.message || 'Failed to update product';
      showToast(message, 'error');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId,
      companyId: product.companyId || '',
      price: Number(Number(product.price).toFixed(2)),
      stockLevel: product.stockLevel,
      features: product.features || '',
      image: product.image || ''
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ 
      sku: '', 
      name: '', 
      categoryId: categories[0]?.id || '', 
      companyId: '', 
      price: 0, 
      stockLevel: 0,
      features: '',
      image: ''
    });
    setShowModal(true);
  };

  const handleBulkImport = async (products: any[]) => {
    setIsImporting(true);
    try {
      await api.post('/products/bulk', products);
      showToast('Products imported successfully', 'success');
      setShowImportModal(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to import products', error);
      showToast(error.response?.data?.message || 'Failed to import products', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      showToast('Preparing full export...', 'info');
      // Fetch all products (high limit to ensure everything is captured)
      const { data } = await api.get('/products', {
        params: { limit: 10000 }
      });
      
      const allProducts = data.data || [];
      
      const exportData = allProducts.map((p: Product) => ({
        'SKU': p.sku,
        'Name': p.name,
        'Category': p.category?.name || 'N/A',
        'Company': p.company?.name || 'N/A',
        'Price': p.price,
        'Stock': p.stockLevel,
        'Features': p.features || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      XLSX.writeFile(wb, "inventory_export.xlsx");
      showToast('Inventory exported successfully', 'success');
    } catch (error) {
      console.error('Export failed', error);
      showToast('Failed to export inventory', 'error');
    }
  };

  const downloadExample = () => {
    const data = [
      { SKU: 'PROD001', Name: 'Example Product', Category: 'Electronics', Company: 'Sony', Price: 29.99, Stock: 100, Features: 'High quality features' },
      { SKU: '', Name: 'Auto SKU Item', Category: 'Home', Company: 'Samsung', Price: 15.50, Stock: 50, Features: 'Leave SKU empty to auto-generate' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products_import_template.xlsx");
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
        showToast('Product deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product', 'error');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4%', flexWrap: 'wrap', gap: '2%' }}>
        <h1 style={{ margin: 0 }}>Inventory Management</h1>
        <div style={{ display: 'flex', gap: '2%', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: '200px' }} // Keep max-width for sanity but use % width
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <button className="btn" onClick={() => setShowImportModal(true)} style={{ border: '1px solid var(--glass-border)' }}>Import Products</button>
          <button className="btn" onClick={handleExport} style={{ border: '1px solid var(--glass-border)' }}>Export Inventory</button>
          <button className="btn btn-primary" onClick={openCreateModal}>+ New Product</button>
        </div>
      </div>

      <div className="glass-card table-container">
        <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th onClick={() => toggleSort('sku')} style={{ padding: '12px 16px', cursor: 'pointer', width: '12%' }}>
                SKU {sortBy === 'sku' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('name')} style={{ padding: '12px 16px', cursor: 'pointer', width: '20%' }}>
                Product Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('category')} style={{ padding: '12px 16px', cursor: 'pointer', width: '12%' }}>
                Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('company')} style={{ padding: '12px 16px', cursor: 'pointer', width: '12%' }}>
                Company {sortBy === 'company' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('price')} style={{ padding: '12px 16px', cursor: 'pointer', width: '10%' }}>
                Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => toggleSort('stockLevel')} style={{ padding: '12px 16px', cursor: 'pointer', width: '10%' }}>
                Stock {sortBy === 'stockLevel' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px 16px', width: '10%' }}>Status</th>
              <th style={{ 
                padding: '12px 16px', 
                width: '160px', 
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
            {products.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '5%', textAlign: 'center' }}>No products found</td></tr>
            ) : (
              products.map(product => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.sku}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.category?.name || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.company?.name || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{useLocale().formatCurrency(product.price)}</td>
                  <td style={{ padding: '12px 16px' }}>{product.stockLevel} units</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '0.5% 1.5%', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      background: product.stockLevel < 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: product.stockLevel < 10 ? 'var(--error)' : 'var(--success)'
                    }}>
                      {product.stockLevel < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td style={{ 
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
                        onClick={() => { setViewingProduct(product); setShowDetailsModal(true); }}
                      >
                        Details
                      </button>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => openEditModal(product)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }} 
                        onClick={() => handleDelete(product.id)}
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
            Showing {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} products
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

      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '30px', width: '90%', maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingProduct ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={editingProduct ? handleUpdate : handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%' }}>
                <div className="input-group">
                  <label>SKU (Leave empty to auto-generate)</label>
                  <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="e.g. SKU-1234" />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select 
                    value={formData.categoryId} 
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%' }}>
                <div className="input-group">
                  <label>Company / Brand</label>
                  <select 
                    value={formData.companyId} 
                    onChange={e => setFormData({...formData, companyId: e.target.value})}
                  >
                    <option value="">Select Company</option>
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Product Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%' }}>
                <div className="input-group">
                  <label>Price</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div className="input-group">
                   <label>Stock Level</label>
                   <input type="number" required value={formData.stockLevel} onChange={e => setFormData({...formData, stockLevel: Number(e.target.value)})} />
                </div>
              </div>
              <div className="input-group">
                <label>Features / Description</label>
                <textarea 
                  value={formData.features} 
                  onChange={e => setFormData({...formData, features: e.target.value})}
                  style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                />
              </div>
              <div className="input-group">
                <label>Product Image</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Image Preview */}
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px dashed var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {formData.image ? (
                      <img 
                        src={formData.image.startsWith('/') ? `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}${formData.image}` : formData.image} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No Image</span>
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        value={formData.image} 
                        onChange={e => setFormData({...formData, image: e.target.value})} 
                        placeholder="Image URL or upload a file" 
                        style={{ flex: 1 }}
                      />
                      <label 
                        className="btn" 
                        style={{ 
                          border: '1px solid var(--glass-border)', 
                          cursor: uploadingImage ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <input 
                          type="file" 
                          hidden 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          disabled={uploadingImage} 
                        />
                        {uploadingImage ? (
                          <>
                            <div className="mini-loader"></div> Uploading...
                          </>
                        ) : 'Upload File'}
                      </label>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Upload an image file (max 5MB) or paste an external direct image URL.
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2%', marginTop: '5%' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingProduct ? 'Update Product' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content animate-fade-in" style={{ padding: '30px', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>Import Products</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Upload an Excel (.xlsx) or CSV file with columns: <strong>SKU, Name, Category, Company, Price, Stock, Features</strong>.
            </p>
            
            <div 
              style={{ 
                border: '2px dashed var(--glass-border)', 
                borderRadius: '12px', 
                padding: '40px 20px', 
                textAlign: 'center',
                marginBottom: '20px',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input 
                id="fileInput"
                type="file" 
                accept=".xlsx, .xls, .csv" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);
                    
                    // Map headers to backend format
                    const mappedData = data.map((item: any) => ({
                      sku: item.SKU || item.sku || '',
                      name: item.Name || item.name || item['Product Name'] || '',
                      category: item.Category || item.category || '',
                      company: item.Company || item.company || '',
                      price: Number(item.Price || item.price || 0),
                      stockLevel: Number(item.Stock || item.stock || item.stockLevel || 0),
                      features: item.Features || item.features || ''
                    })).filter(p => p.name && p.category);

                    if (mappedData.length === 0) {
                      showToast('No valid products found in file', 'error');
                      return;
                    }

                    handleBulkImport(mappedData);
                  };
                  reader.readAsBinaryString(file);
                }}
              />
              <p style={{ margin: 0 }}>{isImporting ? 'Importing...' : 'Click to Upload Excel or CSV'}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn" 
                onClick={downloadExample} 
                style={{ flex: 1, border: '1px solid var(--glass-border)' }}
                disabled={isImporting}
              >
                Download Template
              </button>
              <button 
                className="btn" 
                onClick={() => setShowImportModal(false)}
                style={{ flex: 1, border: '1px solid var(--glass-border)' }}
                disabled={isImporting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Product Details Modal */}
      {showDetailsModal && viewingProduct && (
        <ProductDetailsModal 
          product={viewingProduct} 
          onClose={() => { setShowDetailsModal(false); setViewingProduct(null); }} 
        />
      )}
    </div>
  );
};

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  const { formatCurrency } = useLocale();
  
  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.8)', 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      overflowY: 'auto',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card modal-content animate-fade-in" style={{ padding: '30px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Product Details</h2>
          <button className="btn" onClick={onClose} style={{ border: '1px solid var(--glass-border)' }}>Close</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {product.image ? (
              <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img src={product.image.startsWith('/') ? `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}${product.image}` : product.image} alt={product.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ) : (
              <div style={{ 
                width: '100%', 
                aspectRatio: '16/9', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px dashed var(--glass-border)',
                color: 'var(--text-muted)'
              }}>
                No Image
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p><strong>Status:</strong> 
                <span style={{ 
                  marginLeft: '8px',
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  background: product.stockLevel < 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: product.stockLevel < 10 ? 'var(--error)' : 'var(--success)'
                }}>
                  {product.stockLevel < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p><strong>Product Name:</strong> {product.name}</p>
            <p><strong>SKU:</strong> {product.sku}</p>
            <p><strong>Category:</strong> {product.category?.name || 'N/A'}</p>
            <p><strong>Company / Brand:</strong> {product.company?.name || 'N/A'}</p>
            <p><strong>Price:</strong> {formatCurrency(product.price)}</p>
            <p><strong>Stock Level:</strong> {product.stockLevel} units</p>
            <div style={{ marginTop: '12px' }}>
              <p><strong>Features / Description:</strong></p>
              <div style={{ 
                marginTop: '8px', 
                padding: '16px', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                border: '1px solid var(--glass-border)',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap'
              }}>
                {product.features || 'No features described for this product.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;
