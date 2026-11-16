import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Pencil, Trash2, X, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contentService from '../services/contentService';
import styles from './FAQ.module.css';

const empty = { question: '', answer: '', category: '', isActive: true };

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await contentService.getFaqs();
      setFaqs(res?.data || res || []);
    } catch { toast.error('Failed to load FAQs'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const openEdit = (f) => { setSelected(f); setForm({ question:f.question||'', answer:f.answer||'', category:f.category||'', isActive:f.isActive!==false }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.question || !form.answer) { toast.error('Question and answer required'); return; }
    setSaving(true);
    try {
      await contentService.saveFaq(selected?.id, form);
      toast.success(selected ? 'FAQ updated' : 'FAQ created');
      setModalOpen(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try { await contentService.deleteFaq(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div><h1 className="page-title">FAQ</h1><p className="page-sub">{faqs.length} questions</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetch}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setForm(empty); setModalOpen(true); }}><Plus size={14}/> Add FAQ</button>
        </div>
      </div>

      {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
        <div className="section-block">
          {faqs.length === 0 ? (
            <div className="empty-state"><HelpCircle size={40}/><h3>No FAQs yet</h3><p>Add frequently asked questions for your students</p></div>
          ) : (
            faqs.map(f => (
              <div key={f.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                <div
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', cursor:'pointer', gap:12 }}
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                    <HelpCircle size={15} style={{ color:'var(--brand-secondary)', flexShrink:0 }} />
                    <span style={{ fontWeight:600, fontSize:13, color:'var(--text-primary)' }}>{f.question}</span>
                    {f.category && <span className="badge badge-info">{f.category}</span>}
                  </div>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <span className={`badge ${f.isActive!==false?'badge-success':'badge-neutral'}`}>{f.isActive!==false?'Active':'Hidden'}</span>
                    <button className="action-btn edit" onClick={e => { e.stopPropagation(); openEdit(f); }}><Pencil size={13}/></button>
                    <button className="action-btn del" onClick={e => { e.stopPropagation(); handleDelete(f.id); }}><Trash2 size={13}/></button>
                    {expanded === f.id ? <ChevronUp size={16} color="var(--text-muted)"/> : <ChevronDown size={16} color="var(--text-muted)"/>}
                  </div>
                </div>
                {expanded === f.id && (
                  <div style={{ padding:'0 18px 16px 43px', fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>
                    {f.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Edit FAQ' : 'New FAQ'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Category</label>
                <input className="form-input" placeholder="e.g. Shipping, Payments..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Question *</label>
                <input className="form-input" placeholder="What is...?" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Answer *</label>
                <textarea className="form-textarea" rows={5} placeholder="Answer..." value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width:14, height:14 }}/>
                Active / Visible
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
