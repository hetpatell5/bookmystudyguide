import { useState, useEffect } from 'react';
import { Star, Trash2, Pencil, X, Loader2, RefreshCw, Plus } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contentService from '../services/contentService';
import styles from './Reviews.module.css';

const empty = { name: '', review: '', rating: 5, isApproved: true, productId: '' };

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await contentService.getReviews();
      setReviews(res?.data || res || []);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const openEdit = (r) => {
    setSelected(r);
    setForm({ name: r.name||'', review: r.review||r.comment||'', rating: r.rating||5, isApproved: r.isApproved!==false });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.review) { toast.error('Review text required'); return; }
    setSaving(true);
    try {
      await contentService.saveReview(selected?.id, form);
      toast.success(selected ? 'Review updated' : 'Review created');
      setModalOpen(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try { await contentService.deleteReview(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Delete failed'); }
  };

  const Stars = ({ n }) => (
    <span style={{ display:'inline-flex', gap:2 }}>
      {[1,2,3,4,5].map(i => <Star key={i} size={13} fill={i<=n?'#f59e0b':'none'} stroke={i<=n?'#f59e0b':'#94a3b8'} />)}
    </span>
  );

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div><h1 className="page-title">Reviews</h1><p className="page-sub">{reviews.length} reviews</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetch}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setForm(empty); setModalOpen(true); }}><Plus size={14}/> Add Review</button>
        </div>
      </div>

      <div className="section-block">
        {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Review</th><th>Rating</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:600 }}>{r.name||r.customerName||'Anonymous'}</td>
                    <td style={{ maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-secondary)' }}>{r.review||r.comment||'—'}</td>
                    <td><Stars n={r.rating||0}/></td>
                    <td><span className={`badge ${r.isApproved!==false?'badge-success':'badge-warning'}`}>{r.isApproved!==false?'Approved':'Pending'}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{r.createdAt?new Date(r.createdAt).toLocaleDateString('en-IN'):'—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="action-btn edit" onClick={() => openEdit(r)}><Pencil size={13}/></button>
                        <button className="action-btn del" onClick={() => handleDelete(r.id)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && <tr><td colSpan={6}><div className="empty-state"><Star size={36}/><h3>No reviews yet</h3></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal modal-sm fade-in">
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Edit Review' : 'Add Review'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Customer Name</label>
                <input className="form-input" placeholder="Name..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Review *</label>
                <textarea className="form-textarea" rows={4} placeholder="Review text..." value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Rating (1-5)</label>
                <select className="form-select" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Star{n>1?'s':''}</option>)}
                </select>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.isApproved} onChange={e => setForm(f => ({ ...f, isApproved: e.target.checked }))} style={{ width:14, height:14 }}/>
                Approved / Visible
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : (selected ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
