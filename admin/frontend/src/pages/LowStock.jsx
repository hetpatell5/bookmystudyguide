import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Package, RefreshCw, Search, TrendingDown } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import inventoryService from '../services/inventoryService';
import styles from './LowStock.module.css';

const THRESHOLD_OPTIONS = [5, 10, 20, 50];

export default function LowStock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getProducts();
      const list = res.data || res.products || res || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const lowStock = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter(p => {
        const stock = Number(p.stock ?? p.stockQuantity ?? 0);
        const matchThreshold = stock <= threshold;
        const matchSearch = !q ||
          (p.title || p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q);
        return matchThreshold && matchSearch;
      })
      .sort((a, b) => {
        const sa = Number(a.stock ?? a.stockQuantity ?? 0);
        const sb = Number(b.stock ?? b.stockQuantity ?? 0);
        return sa - sb;
      });
  }, [products, threshold, search]);

  const outOfStock = lowStock.filter(p => Number(p.stock ?? p.stockQuantity ?? 0) === 0).length;
  const critical   = lowStock.filter(p => {
    const s = Number(p.stock ?? p.stockQuantity ?? 0);
    return s > 0 && s <= 3;
  }).length;
  const warning    = lowStock.filter(p => {
    const s = Number(p.stock ?? p.stockQuantity ?? 0);
    return s > 3 && s <= threshold;
  }).length;

  const stockLevel = (p) => {
    const s = Number(p.stock ?? p.stockQuantity ?? 0);
    if (s === 0) return { label: 'Out of Stock', cls: 'badge-danger', pct: 0 };
    if (s <= 3)  return { label: 'Critical', cls: 'badge-danger', pct: Math.min(10, s * 3) };
    if (s <= threshold) return { label: 'Low Stock', cls: 'badge-warning', pct: Math.min(50, (s / threshold) * 50) };
    return { label: 'OK', cls: 'badge-success', pct: 100 };
  };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Low Stock Alerts</h1>
          <p className="page-sub">Products at or below threshold — reorder now</p>
        </div>
        <div className="page-actions">
          <select className="form-select" style={{ width: 160 }} value={threshold} onChange={e => setThreshold(Number(e.target.value))}>
            {THRESHOLD_OPTIONS.map(t => (
              <option key={t} value={t}>Threshold: ≤ {t}</option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={fetchProducts}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.danger}`}>
          <div className={styles.summaryNum}>{outOfStock}</div>
          <div className={styles.summaryLabel}>Out of Stock</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.critical}`}>
          <div className={styles.summaryNum}>{critical}</div>
          <div className={styles.summaryLabel}>Critical (1–3 left)</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.warning}`}>
          <div className={styles.summaryNum}>{warning}</div>
          <div className={styles.summaryLabel}>Low Stock</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.total}`}>
          <div className={styles.summaryNum}>{products.length}</div>
          <div className={styles.summaryLabel}>Total Products</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrap" style={{ marginBottom: 16, maxWidth: 380 }}>
        <Search size={14} className="search-icon" />
        <input className="search-input" placeholder="Search by title or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /><span>Loading inventory...</span></div>
      ) : lowStock.length === 0 ? (
        <div className="empty-state">
          <Package size={40} strokeWidth={1.2} />
          <h3>All good!</h3>
          <p>No products are below the threshold of {threshold}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Level</th>
                <th>Stock Bar</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map(p => {
                const stock = Number(p.stock ?? p.stockQuantity ?? 0);
                const { label, cls, pct } = stockLevel(p);
                const barColor = stock === 0 ? 'var(--color-danger)' : stock <= 3 ? '#f97316' : 'var(--color-warning)';
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title || p.name || '—'}</div>
                      {p.mainDegree && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.mainDegree}</div>}
                    </td>
                    <td>
                      <code style={{ fontSize: 11, background: 'var(--bg-box)', padding: '2px 6px', borderRadius: 4 }}>
                        {p.sku || 'No SKU'}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: 20, fontWeight: 800, color: stock === 0 ? 'var(--color-danger)' : stock <= 3 ? '#f97316' : 'var(--color-warning)' }}>
                        {stock}
                      </span>
                    </td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                    <td style={{ minWidth: 120 }}>
                      <div className={styles.stockBar}>
                        <div className={styles.stockBarFill} style={{ width: `${Math.max(pct, 2)}%`, background: barColor }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)' }}>
            {lowStock.length} products at or below threshold of {threshold}
          </div>
        </div>
      )}
    </div>
  );
}
