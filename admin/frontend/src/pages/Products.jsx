import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, X, RefreshCw, Zap, AlertTriangle, Link2, Eye, EyeOff, CheckSquare, ShieldAlert } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import inventoryService from '../services/inventoryService';
import ProductForm from '../components/ProductForm';
import styles from './Products.module.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('all');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [taxonomy, setTaxonomy] = useState({ books: [], mainDegrees: [], subDegrees: [] });
  const [filters, setFilters] = useState({ bookId: '', mainDegreeId: '', subDegreeId: '', variantFilter: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [bulk, setBulk] = useState({ open: false, mainDegreeId: '', subDegreeId: '', bookId: '', mode: 'set', price: '', mrp: '' });
  const [bulkSubDegrees, setBulkSubDegrees] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPublishLoading, setBulkPublishLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prodRes, booksRes, degsRes] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getBooks(),
        inventoryService.getMainDegrees(),
      ]);
      setProducts(prodRes.data || prodRes.products || prodRes || []);
      setTaxonomy(t => ({
        ...t,
        books: booksRes.data || booksRes || [],
        mainDegrees: degsRes.data || degsRes || [],
      }));
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const handleFilterMainDegree = async (id) => {
    setFilters(f => ({ ...f, mainDegreeId: id, subDegreeId: '' }));
    if (id) {
      const res = await inventoryService.getSubDegrees(id);
      setTaxonomy(t => ({ ...t, subDegrees: res.data || res || [] }));
    } else {
      setTaxonomy(t => ({ ...t, subDegrees: [] }));
    }
  };

  const handleBulkMainDegree = async (id) => {
    setBulk(b => ({ ...b, mainDegreeId: id, subDegreeId: '' }));
    if (id) {
      const res = await inventoryService.getSubDegrees(id);
      setBulkSubDegrees(res.data || res || []);
    } else {
      setBulkSubDegrees([]);
    }
  };

  const filtered = useMemo(() => {
    const st = search.toLowerCase();
    return products.filter(p => {
      const title = (p.title || p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      if (st && !title.includes(st) && !sku.includes(st)) return false;
      if (filters.bookId && String(p.bookId) !== String(filters.bookId)) return false;
      if (filters.mainDegreeId && String(p.mainDegreeId) !== String(filters.mainDegreeId)) return false;
      if (filters.subDegreeId && String(p.subDegreeId) !== String(filters.subDegreeId)) return false;
      const varCount = (p.productLinks || p.ProductLinks || []).length;
      if (filters.variantFilter === 'no_variants' && varCount > 0) return false;
      if (filters.variantFilter === 'has_variants' && varCount === 0) return false;

      return true;
    });
  }, [products, search, filters]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const bulkTargets = useMemo(() => {
    if (!bulk.bookId && !bulk.mainDegreeId && !bulk.subDegreeId) return [];
    return products.filter(p => {
      if (bulk.bookId && String(p.bookId) !== String(bulk.bookId)) return false;
      if (bulk.mainDegreeId && String(p.mainDegreeId) !== String(bulk.mainDegreeId)) return false;
      if (bulk.subDegreeId && String(p.subDegreeId) !== String(bulk.subDegreeId)) return false;
      return true;
    });
  }, [bulk.bookId, bulk.mainDegreeId, bulk.subDegreeId, products]);

  const applyBulk = async () => {
    if (!bulkTargets.length) { toast.warning('No products match the selection'); return; }
    if (!bulk.price && !bulk.mrp) { toast.error('Enter a price or MRP value'); return; }
    if (!window.confirm(`Update ${bulkTargets.length} products?`)) return;
    setBulkSaving(true);
    try {
      const numP = bulk.price ? parseFloat(bulk.price) : null;
      const numM = bulk.mrp ? parseFloat(bulk.mrp) : null;
      const updates = bulkTargets.map(p => {
        let finalP = p.price;
        if (numP !== null) {
          if (bulk.mode === 'increase') finalP += numP;
          else if (bulk.mode === 'decrease') finalP -= numP;
          else if (bulk.mode === 'percent') finalP += finalP * numP / 100;
          else finalP = numP;
        }
        finalP = Math.max(0, parseFloat(finalP.toFixed(2)));
        const finalM = numM !== null ? numM : Math.max(finalP, p.mrp || finalP);
        const disc = finalM > finalP ? Math.round(((finalM - finalP) / finalM) * 100) : 0;
        return { id: p.id, data: { price: finalP, mrp: finalM, discount: disc, percentage: disc } };
      });
      await inventoryService.bulkUpdatePrices(updates);
      toast.success(`Updated ${updates.length} products`);
      fetchAll();
      setBulk(b => ({ ...b, open: false }));
    } catch { toast.error('Bulk update failed'); }
    finally { setBulkSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await inventoryService.deleteProduct(id); setProducts(ps => ps.filter(p => p.id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const handleTogglePublish = async (item) => {
    const newStatus = !item.isActive;
    try {
      await inventoryService.toggleProductPublish(item.id, newStatus);
      toast.success(`${newStatus ? 'Published' : 'Drafted'}`);
      fetchAll();
    } catch { toast.error('Failed to update status'); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Permanently delete ${ids.length} selected product(s)? This cannot be undone.`)) return;
    setBulkDeleteLoading(true);
    try {
      await Promise.all(ids.map(id => inventoryService.deleteProduct(id)));
      toast.success(`Deleted ${ids.length} products`);
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Bulk delete failed'); }
    finally { setBulkDeleteLoading(false); }
  };

  const handleBulkPublish = async (isPublished) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Update ${ids.length} products to ${isPublished ? 'Published' : 'Draft'}?`)) return;
    setBulkPublishLoading(true);
    try {
      await inventoryService.bulkPublishProducts(ids, isPublished);
      toast.success(`Bulk updated ${ids.length} products`);
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Bulk update failed'); }
    finally { setBulkPublishLoading(false); }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(filtered.map(item => item.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;



  const getImg = (p) => {
    let imgs = p.images;
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
    return Array.isArray(imgs) && imgs.length ? imgs[0] : null;
  };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000}/>

      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">{products.length} total &bull; {filtered.length} shown</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchAll}><RefreshCw size={13}/> Refresh</button>
          <button className={`btn btn-sm ${bulk.open ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBulk(b => ({ ...b, open: !b.open }))}>
            <Zap size={13}/> Bulk Tools
          </button>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setFormMode('all'); setFormOpen(true); }}><Plus size={14}/> Add Product</button>
        </div>
      </div>

      {/* Bulk Editor */}
      {bulk.open && (
        <div className="section-block" style={{ marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-title"><Zap size={14} style={{ verticalAlign:'middle', marginRight:4 }}/>Batch Price Update</span>
            <span className="badge badge-info">{bulkTargets.length} products targeted</span>
          </div>
          <div style={{ padding:'14px' }}>
            <div className="grid-2" style={{ marginBottom:12 }}>
              <div className="form-group">
                <label className="form-label">Target Book</label>
                <select className="form-select" value={bulk.bookId} onChange={e => setBulk(b => ({ ...b, bookId: e.target.value }))}>
                  <option value="">Any Book</option>
                  {taxonomy.books.map(b => <option key={b.id} value={b.id}>{b.name || b.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target Degree</label>
                <select className="form-select" value={bulk.mainDegreeId} onChange={e => handleBulkMainDegree(e.target.value)}>
                  <option value="">Any Degree</option>
                  {taxonomy.mainDegrees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sub Degree</label>
                <select className="form-select" value={bulk.subDegreeId} onChange={e => setBulk(b => ({ ...b, subDegreeId: e.target.value }))} disabled={!bulk.mainDegreeId}>
                  <option value="">Any Sub-Degree</option>
                  {bulkSubDegrees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price Mode</label>
                <select className="form-select" value={bulk.mode} onChange={e => setBulk(b => ({ ...b, mode: e.target.value }))}>
                  <option value="set">Set Fixed Price</option>
                  <option value="increase">Increase By (+)</option>
                  <option value="decrease">Decrease By (-)</option>
                  <option value="percent">Percentage (+%)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">New Price (₹)</label>
                <input className="form-input" type="number" placeholder="Amount..." value={bulk.price} onChange={e => setBulk(b => ({ ...b, price: e.target.value }))}/>
              </div>
              <div className="form-group">
                <label className="form-label">New MRP (₹) — optional</label>
                <input className="form-input" type="number" placeholder="Leave blank to keep" value={bulk.mrp} onChange={e => setBulk(b => ({ ...b, mrp: e.target.value }))}/>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--color-warning-bg)', borderRadius:'var(--r-md)', border:'1px solid rgba(217,119,6,.2)' }}>
              <AlertTriangle size={15} color="var(--color-warning)"/>
              <p style={{ flex:1, margin:0, fontSize:12, color:'var(--text-secondary)' }}>
                This will update <strong>{bulkTargets.length}</strong> products. This action cannot be undone easily.
              </p>
              <button className="btn btn-primary btn-sm" onClick={applyBulk} disabled={bulkSaving || !bulkTargets.length}>
                {bulkSaving ? <><Loader2 size={12} className={styles.spin}/> Processing...</> : 'Apply Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <div className="search-wrap" style={{ flex:1 }}>
          <Search size={14}/>
          <input className="search-input" type="text" placeholder="Search by title or SKU..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <button className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(v => !v)}>
          Filters {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {showFilters && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12, padding:'12px', background:'var(--bg-subtle)', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)' }}>
          <select className="filter-select" value={filters.bookId} onChange={e => setFilters(f => ({ ...f, bookId: e.target.value }))}>
            <option value="">All Books</option>
            {taxonomy.books.map(b => <option key={b.id} value={b.id}>{b.name || b.title}</option>)}
          </select>
          <select className="filter-select" value={filters.mainDegreeId} onChange={e => handleFilterMainDegree(e.target.value)}>
            <option value="">All Degrees</option>
            {taxonomy.mainDegrees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="filter-select" value={filters.subDegreeId} onChange={e => setFilters(f => ({ ...f, subDegreeId: e.target.value }))} disabled={!filters.mainDegreeId}>
            <option value="">All Sub-Degrees</option>
            {taxonomy.subDegrees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select className="filter-select" value={filters.variantFilter} onChange={e => setFilters(f => ({ ...f, variantFilter: e.target.value }))}>
            <option value="">All Variants</option>
            <option value="no_variants">No Variants</option>
            <option value="has_variants">Has Variants</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ bookId:'', mainDegreeId:'', subDegreeId:'', variantFilter:'' })}>
            <X size={12}/> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="section-block">
        {someSelected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              <CheckSquare size={14} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--primary)' }}/>
              {selectedIds.size} selected
            </span>
            <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', border: 'none' }} onClick={() => handleBulkPublish(true)} disabled={bulkPublishLoading}>
              {bulkPublishLoading ? <Loader2 size={12} className={styles.spin}/> : <Eye size={12}/>} &nbsp;Publish Selected
            </button>
            <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none' }} onClick={() => handleBulkPublish(false)} disabled={bulkPublishLoading}>
              {bulkPublishLoading ? <Loader2 size={12} className={styles.spin}/> : <EyeOff size={12}/>} &nbsp;Draft Selected
            </button>
            <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none' }} onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
              {bulkDeleteLoading ? <Loader2 size={12} className={styles.spin}/> : <ShieldAlert size={12}/>} &nbsp;Delete Selected
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedIds(new Set())}><X size={12}/> Clear</button>
          </div>
        )}
        {loading ? (
          <div className="loading-overlay"><div className="spinner spinner-lg"/><span>Loading products...</span></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}/>
                  </th>
                  <th style={{ width: '45%' }}>Product</th>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Price / MRP</th>
                  <th style={{ width: '15%' }}>Variants</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '10%', position: 'sticky', right: 0, zIndex: 10, background: 'var(--bg-page)', boxShadow: '-4px 0 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(p => {
                  const img = getImg(p);
                  const linksCount = (p.productLinks || p.ProductLinks || []).length;
                  const rawName = p.title || p.name || '';
                  const displayName = rawName.includes('|') ? rawName.split('|')[0].trim() : rawName;
                  
                  return (
                    <tr key={p.id} style={{ background: selectedIds.has(p.id) ? 'rgba(99,102,241,0.07)' : '' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelectOne(p.id)} style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}/>
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {img ? (
                            <img src={img} alt="" style={{ width:70, height:90, borderRadius:'4px', objectFit:'contain', background: '#fff', border:'1px solid var(--border-default)', flexShrink:0 }}
                              onError={e => { e.target.style.display='none'; }}/>
                          ) : (
                            <div style={{ width:70, height:90, borderRadius:'4px', background:'var(--bg-subtle)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--text-faint)' }}>IMG</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div>
                              <code style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', background:'var(--bg-subtle)', padding:'3px 8px', borderRadius:4, whiteSpace: 'nowrap', display: 'inline-block' }}>{p.sku || 'No SKU'}</code>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ fontWeight:600, fontSize:13, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={rawName}>{displayName}</div>
                              <div style={{ fontSize:11, color:'var(--text-muted)', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.bookName || p.mainDegree || ''}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight:700, fontSize:13 }}>₹{p.price}</div>
                        {p.mrp > p.price && <div style={{ fontSize:11, color:'var(--text-muted)', textDecoration:'line-through' }}>₹{p.mrp}</div>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0 8px', fontSize: 11, color: 'var(--primary)', height: 26, background: 'rgba(99, 102, 241, 0.08)' }} onClick={() => { setSelected(p); setFormMode('variants'); setFormOpen(true); }} title="Click to edit variants">
                          <Link2 size={12} style={{ marginRight: 4 }}/>
                          {linksCount} Variants
                        </button>
                      </td>

                      <td>
                        <button onClick={() => handleTogglePublish(p)} title={p.isActive ? 'Click to Draft' : 'Click to Publish'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: p.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: p.isActive ? '#22c55e' : '#f59e0b' }}>
                          {p.isActive ? <><Eye size={11}/> Published</> : <><EyeOff size={11}/> Draft</>}
                        </button>
                      </td>

                      <td style={{ position: 'sticky', right: 0, zIndex: 5, background: selectedIds.has(p.id) ? 'var(--bg-subtle)' : 'var(--bg-page)', boxShadow: '-4px 0 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display:'flex', gap:4, justifyContent: 'center' }}>
                          <button className="action-btn edit" title="Edit" onClick={() => { setSelected(p); setFormMode('all'); setFormOpen(true); }}><Pencil size={13}/></button>
                          <button className="action-btn del" title="Delete" onClick={() => handleDelete(p.id)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={7}><div className="empty-state"><span style={{ fontSize:13, color:'var(--text-muted)' }}>No products match your filters</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 12px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-card)', borderRadius: '0 0 16px 16px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} products
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </div>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ProductForm isOpen={formOpen} focusMode={formMode} onClose={() => setFormOpen(false)} product={selected} onSave={fetchAll}/>
    </div>
  );
}
