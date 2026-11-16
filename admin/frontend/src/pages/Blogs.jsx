import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Pencil, Trash2, X, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contentService from '../services/contentService';
import styles from './Blogs.module.css';

const empty = { title: '', content: '', category: '', slug: '', isPublished: true };

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await contentService.getBlogs();
      setBlogs(res?.blogs || res?.data || res || []);
    } catch { toast.error('Failed to load blogs'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setSelected(null); setForm(empty); setModalOpen(true); };
  const openEdit = (b) => { setSelected(b); setForm({ title:b.title||'', content:b.content||'', category:b.category||'', slug:b.slug||'', isPublished:b.isPublished!==false }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      await contentService.saveBlog(selected?.id, form);
      toast.success(selected ? 'Blog updated' : 'Blog created');
      setModalOpen(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blog?')) return;
    try { await contentService.deleteBlog(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = blogs.filter(b => !search || (b.title||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div><h1 className="page-title">Blogs</h1><p className="page-sub">{blogs.length} articles</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetch}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> New Blog</button>
        </div>
      </div>

      <div className="section-block">
        <div className="filter-bar">
          <div className="search-wrap"><Search size={14}/><input className="search-input" placeholder="Search blogs..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        </div>
        {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{b.title}</div>
                      {b.slug && <div style={{ fontSize:11, color:'var(--text-muted)' }}>/blog/{b.slug}</div>}
                    </td>
                    <td>{b.category ? <span className="badge badge-info">{b.category}</span> : '—'}</td>
                    <td><span className={`badge ${b.isPublished !== false ? 'badge-success' : 'badge-neutral'}`}>{b.isPublished !== false ? 'Published' : 'Draft'}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="action-btn edit" onClick={() => openEdit(b)}><Pencil size={13}/></button>
                        <button className="action-btn del" onClick={() => handleDelete(b.id)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5}><div className="empty-state"><FileText size={36}/><h3>No blogs yet</h3></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal modal-lg fade-in">
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Edit Blog' : 'New Blog'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="Blog title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid-2" style={{ marginBottom:14 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-input" placeholder="e.g. Tips, News..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug</label>
                  <input className="form-input" placeholder="url-friendly-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Content *</label>
                <textarea className="form-textarea" rows={10} placeholder="Write blog content here..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} style={{ width:14, height:14 }}/>
                Published
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : (selected ? 'Update' : 'Publish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
