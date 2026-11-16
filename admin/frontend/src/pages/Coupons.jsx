import { useState, useEffect, useMemo } from 'react';
import { Ticket, Plus, Trash2, X, Loader2, RefreshCw, Search, Check, BarChart2, TrendingUp } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import couponService from '../services/couponService';
import api from '../services/api';
import styles from './Coupons.module.css';

const empty = {
  code: '', discount: '', type: 'percentage', minOrderValue: '', minItems: '',
  expiryDate: '', isActive: true, eligibleProductIds: [], eligibleComboIds: [],
  eligibleMainDegreeIds: [], eligibleSynopsisIds: []
};

const getList = (res) => res.data?.data || res.data?.items || res.data || [];

function RulePicker({ title, items, selected, onChange, getLabel, placeholder }) {
  const [query, setQuery] = useState('');
  const selectedSet = new Set(selected);
  const filtered = items.filter(item => getLabel(item).toLowerCase().includes(query.toLowerCase()));

  const toggle = (id) => {
    onChange(selectedSet.has(id)
      ? selected.filter(value => value !== id)
      : [...selected, id]
    );
  };

  return (
    <div className={styles.rulePicker}>
      <div className={styles.rulePickerTop}>
        <label className="form-label">{title}</label>
        <span>{selected.length} selected</span>
      </div>
      <div className={styles.ruleSearch}>
        <Search size={13} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder} />
      </div>
      <div className={styles.ruleList}>
        {filtered.map(item => {
          const id = String(item.id);
          const checked = selectedSet.has(id);
          return (
            <button type="button" key={id} className={`${styles.ruleOption} ${checked ? styles.ruleOptionActive : ''}`} onClick={() => toggle(id)}>
              <span className={styles.ruleCheck}>{checked && <Check size={12} />}</span>
              <span>{getLabel(item)}</span>
            </button>
          );
        })}
        {filtered.length === 0 && <div className={styles.ruleEmpty}>No matching items</div>}
      </div>
    </div>
  );
}

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [catalog, setCatalog] = useState({ products: [], combos: [], degrees: [], synopses: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await couponService.getCoupons();
      setCoupons(res.data || res || []);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchCoupons(); }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [products, combos, degrees, synopses] = await Promise.all([
          api.get('/api/products?admin=true&limit=500'),
          api.get('/api/admin/combo-products?limit=500'),
          api.get('/api/mainDegrees'),
          api.get('/api/synopsis?limit=500'),
        ]);
        setCatalog({
          products: getList(products),
          combos: getList(combos),
          degrees: getList(degrees),
          synopses: getList(synopses),
        });
      } catch {
        toast.error('Failed to load coupon rule lists');
      }
    };
    loadCatalog();
  }, []);

  const handleSave = async () => {
    if (!form.code || !form.discount) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await couponService.createCoupon(form);
      toast.success('Coupon created');
      setModalOpen(false);
      setForm(empty);
      fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await couponService.deleteCoupon(id); toast.success('Deleted'); fetchCoupons(); }
    catch { toast.error('Delete failed'); }
  };

  const isExpired = d => d && new Date(d) < new Date();

  const stats = useMemo(() => {
    const top = [...coupons].sort((a, b) => Number(b.usedCount || 0) - Number(a.usedCount || 0))[0];
    return {
      total:     coupons.length,
      active:    coupons.filter(c => c.isActive && !isExpired(c.expiryDate)).length,
      totalUses: coupons.reduce((s, c) => s + Number(c.usedCount || 0), 0),
      topCoupon: top && Number(top.usedCount) > 0 ? top : null,
    };
  }, [coupons]);

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div><h1 className="page-title">Coupons</h1><p className="page-sub">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchCoupons}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setModalOpen(true); }}><Plus size={14} /> New Coupon</button>
        </div>
      </div>

      {/* Usage Analytics */}
      {coupons.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <Ticket size={16} style={{ color: 'var(--brand-secondary)' }} />
            <div><div className={styles.statNum}>{stats.total}</div><div className={styles.statLabel}>Total Coupons</div></div>
          </div>
          <div className={styles.statCard}>
            <BarChart2 size={16} style={{ color: 'var(--color-success)' }} />
            <div><div className={styles.statNum}>{stats.active}</div><div className={styles.statLabel}>Active</div></div>
          </div>
          <div className={styles.statCard}>
            <TrendingUp size={16} style={{ color: 'var(--color-warning)' }} />
            <div><div className={styles.statNum}>{stats.totalUses}</div><div className={styles.statLabel}>Total Uses</div></div>
          </div>
          {stats.topCoupon && (
            <div className={styles.statCard}>
              <BarChart2 size={16} style={{ color: 'var(--color-purple)' }} />
              <div>
                <div className={styles.statNum} style={{ fontFamily: 'monospace', fontSize: 14 }}>{stats.topCoupon.code}</div>
                <div className={styles.statLabel}>Most Used ({stats.topCoupon.usedCount} uses)</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="section-block">
        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th><th>Discount</th><th>Type</th>
                  <th>Min Order</th><th>Used / Limit</th>
                  <th>Expiry</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--brand-secondary)', background: 'var(--color-info-bg)', padding: '3px 8px', borderRadius: 'var(--r-sm)' }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                    </td>
                    <td>
                      <span className={`badge ${c.discountType === 'percentage' ? 'badge-purple' : 'badge-accent'}`}>
                        {c.discountType === 'percentage' ? 'Percentage' : 'Fixed'}
                      </span>
                    </td>
                    <td>₹{Number(c.minOrderAmount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: Number(c.usedCount) > 0 ? 'var(--brand-secondary)' : 'var(--text-muted)' }}>
                          {c.usedCount || 0}
                        </span>
                        {c.usageLimit && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {c.usageLimit}</span>
                        )}
                        {Number(c.usedCount) > 0 && (
                          <div className={styles.usageBar}>
                            <div
                              className={styles.usageFill}
                              style={{ width: c.usageLimit ? `${Math.min(100, (c.usedCount / c.usageLimit) * 100)}%` : '100%' }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: isExpired(c.expiryDate) ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                      {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN') : '—'}
                      {isExpired(c.expiryDate) && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Expired</span>}
                    </td>
                    <td>
                      <span className={`badge ${c.isActive && !isExpired(c.expiryDate) ? 'badge-success' : 'badge-neutral'}`}>
                        {c.isActive && !isExpired(c.expiryDate) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td><button className="action-btn del" onClick={() => handleDelete(c.id)}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><Ticket size={36} /><h3>No coupons yet</h3><p>Create your first discount coupon</p></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className={`modal modal-lg fade-in ${styles.couponModal}`}>
            <div className="modal-header">
              <h2 className="modal-title">New Coupon</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Coupon Code *</label>
                <input className="form-input" placeholder="SAVE20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Discount *</label>
                  <input className="form-input" type="number" placeholder="20" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Fixed Amount</option>
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Min Order Value</label>
                  <input className="form-input" type="number" placeholder="0" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Minimum Eligible Items</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.minItems} onChange={e => setForm(f => ({ ...f, minItems: e.target.value }))} />
              </div>
              <div className={styles.ruleSection}>
                <div className={styles.ruleSectionHead}>
                  <div>
                    <h3>Coupon eligibility</h3>
                    <p>Select where this coupon is allowed. Leave everything empty for all products.</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(f => ({
                    ...f,
                    eligibleProductIds: [],
                    eligibleComboIds: [],
                    eligibleMainDegreeIds: [],
                    eligibleSynopsisIds: []
                  }))}>Clear all</button>
                </div>
                <div className={styles.ruleGrid}>
                  <RulePicker title="Valid Books" items={catalog.products} selected={form.eligibleProductIds} onChange={values => setForm(f => ({ ...f, eligibleProductIds: values }))} getLabel={p => p.title || p.name || 'Untitled book'} placeholder="Search books" />
                  <RulePicker title="Valid Combos" items={catalog.combos} selected={form.eligibleComboIds} onChange={values => setForm(f => ({ ...f, eligibleComboIds: values }))} getLabel={c => c.title || 'Untitled combo'} placeholder="Search combos" />
                  <RulePicker title="Valid Degrees" items={catalog.degrees} selected={form.eligibleMainDegreeIds} onChange={values => setForm(f => ({ ...f, eligibleMainDegreeIds: values }))} getLabel={d => d.name || d.title || 'Untitled degree'} placeholder="Search degrees" />
                  <RulePicker title="Valid Synopsis / Projects" items={catalog.synopses} selected={form.eligibleSynopsisIds} onChange={values => setForm(f => ({ ...f, eligibleSynopsisIds: values }))} getLabel={s => s.title || 'Untitled synopsis'} placeholder="Search synopsis" />
                </div>
              </div>
              <p className={styles.ruleNote}>
                Leave lists empty for all products. If any list is selected, the discount applies only to matching cart items.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 14, height: 14, accentColor: 'var(--brand-secondary)' }} />
                Active immediately
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin} /> Saving...</> : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
