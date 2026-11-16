import { useState, useEffect } from 'react';
import { Image, Plus, Trash2, X, Loader2, RefreshCw, ExternalLink, Upload, Monitor, Smartphone, LayoutGrid, List } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contentService from '../services/contentService';
import styles from './Advertisements.module.css';

const empty = { title: '', imageFile: null, imagePreview: '', mobileFile: null, mobilePreview: '', isActive: true };

export default function Advertisements() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await contentService.getAds();
      setAds(Array.isArray(res) ? res : res?.data || []);
    } catch { toast.error('Failed to load ads'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAds(); }, []);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm(f => ({ ...f, [`${field}File`]: file, [`${field}Preview`]: preview }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.imageFile) { toast.error('Desktop image is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('image', form.imageFile);
      if (form.mobileFile) fd.append('mobileImage', form.mobileFile);
      fd.append('isActive', form.isActive);
      
      await contentService.createAd(fd);
      toast.success('Advertisement created');
      setModalOpen(false);
      setForm(empty);
      fetchAds();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this advertisement?')) return;
    try { await contentService.deleteAd(id); toast.success('Deleted'); fetchAds(); }
    catch { toast.error('Delete failed'); }
  };

  const toggleStatus = async (ad) => {
    try {
      const newStatus = !ad.isActive;
      await contentService.updateAdStatus(ad.id, newStatus);
      toast.success(`Ad marked as ${newStatus ? 'Published' : 'Draft'}`);
      fetchAds(); // Refresh to ensure sync
    } catch { toast.error('Status update failed'); }
  };

  const getImgSrc = (url) => url || '';

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000}/>

      <div className="page-header">
        <div><h1 className="page-title">Advertisements</h1><p className="page-sub">{ads.length} ads</p></div>
        <div className="page-actions">
          {/* View Toggle */}
          <div style={{ display:'flex', background:'var(--bg-subtle)', border:'1px solid var(--border-default)', borderRadius:'var(--r-md)', padding:2 }}>
            <button className={`${styles.viewBtn} ${viewMode==='grid'?styles.viewBtnActive:''}`} onClick={()=>setViewMode('grid')} title="Grid View"><LayoutGrid size={14}/></button>
            <button className={`${styles.viewBtn} ${viewMode==='list'?styles.viewBtnActive:''}`} onClick={()=>setViewMode('list')} title="List View"><List size={14}/></button>
          </div>
          
          <button className="btn btn-outline btn-sm" onClick={fetchAds}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setModalOpen(true); }}><Plus size={14}/> New Ad</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg"/><span>Loading ads...</span></div>
      ) : ads.length === 0 ? (
        <div className="empty-state">
          <Image size={40}/>
          <h3>No advertisements yet</h3>
          <p>Create banners and promotional ads for your site</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {ads.map(ad => (
            <div key={ad.id} className={styles.adCard}>
              <div className={styles.imgWrap}>
                {ad.image ? (
                  <img src={getImgSrc(ad.image)} alt={ad.title} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
                ) : null}
                <div className={styles.imgPlaceholder} style={{ display: ad.image ? 'none' : 'flex' }}>
                  <Image size={28} color="var(--text-faint)"/>
                </div>
                {ad.mobileImage && <div className={styles.mobileBadge}><Smartphone size={11}/> Mobile</div>}
                
                {/* Status Float Badge */}
                <div style={{ position:'absolute', top:8, right:8, background:ad.isActive?'var(--color-success)':'var(--color-warning)', color:'#fff', fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600 }}>
                  {ad.isActive ? 'PUBLISHED' : 'DRAFT'}
                </div>
              </div>

              <div className={styles.adBody}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minHeight:16 }}>{ad.title || 'Untitled Advertisement'}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ display:'flex', gap:3, color:'var(--text-secondary)' }}>
                      <Monitor size={12} title="Desktop image uploaded"/>
                      {ad.mobileImage && <Smartphone size={12} title="Mobile image uploaded" color="var(--brand-secondary)"/>}
                    </div>
                    <span>•</span>
                    <span>ID #{ad.id?.substring(0,8)}...</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button className={`btn btn-sm ${ad.isActive?'btn-outline':'btn-primary'}`} style={{ padding:'2px 8px', fontSize:11, height:'auto' }} onClick={()=>toggleStatus(ad)}>
                    {ad.isActive ? 'Hide' : 'Publish'}
                  </button>
                  <button className="action-btn del" title="Delete" onClick={() => handleDelete(ad.id)}><Trash2 size={13}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="section-block" style={{ padding:0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width:100 }}>Preview</th>
                <th>Advertisement Title</th>
                <th>Platforms</th>
                <th>Status</th>
                <th>Created</th>
                <th align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map(ad => (
                <tr key={ad.id}>
                  <td>
                    <div style={{ width:80, height:45, background:'var(--bg-box)', borderRadius:'var(--r-sm)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border-default)' }}>
                      {ad.image ? <img src={getImgSrc(ad.image)} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="Preview"/> : <Image size={16} color="var(--text-faint)"/>}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight:600, fontSize:13, color:'var(--text-primary)' }}>{ad.title || 'Untitled Advertisement'}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>ID: {ad.id}</div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <span className="badge badge-gray" style={{ fontSize:10, padding:'2px 6px', display:'flex', alignItems:'center', gap:4 }}><Monitor size={10}/> Desktop</span>
                      {ad.mobileImage && <span className="badge badge-brand" style={{ fontSize:10, padding:'2px 6px', display:'flex', alignItems:'center', gap:4 }}><Smartphone size={10}/> Mobile</span>}
                    </div>
                  </td>
                  <td>
                    <button className={`badge ${ad.isActive?'badge-success':'badge-warning'}`} onClick={()=>toggleStatus(ad)} style={{ cursor:'pointer', border:'none' }} title="Click to toggle status">
                      {ad.isActive ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {new Date(ad.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button className="action-btn del" title="Delete" onClick={() => handleDelete(ad.id)}><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h2 className="modal-title">New Advertisement</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14}/></button>
            </div>
            <div className="modal-body" style={{ maxHeight:'70vh', overflowY:'auto' }}>
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="e.g. Summer Sale Banner" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
              </div>

              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Initial Status</label>
                <select className="form-select" value={form.isActive?'true':'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Published (Live instantly)</option>
                  <option value="false">Draft (Hidden from users)</option>
                </select>
              </div>

              {/* Desktop image */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label"><Monitor size={13} style={{ verticalAlign:'middle', marginRight:4 }}/>Desktop Image *</label>
                <label className={styles.uploadLabel}>
                  <input type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'image')}/>
                  {form.imagePreview ? (
                    <div className={styles.previewWrap}>
                      <img src={form.imagePreview} alt="desktop preview"/>
                      <span className={styles.changeHint}>Click to change</span>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <Upload size={20}/>
                      <span>Click to upload desktop image</span>
                      <small>PNG, JPG, WebP recommended</small>
                    </div>
                  )}
                </label>
              </div>

              {/* Mobile image */}
              <div className="form-group">
                <label className="form-label"><Smartphone size={13} style={{ verticalAlign:'middle', marginRight:4 }}/>Mobile Image <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(optional)</span></label>
                <label className={styles.uploadLabel}>
                  <input type="file" accept="image/*" hidden onChange={e => handleFileChange(e, 'mobile')}/>
                  {form.mobilePreview ? (
                    <div className={styles.previewWrap}>
                      <img src={form.mobilePreview} alt="mobile preview"/>
                      <span className={styles.changeHint}>Click to change</span>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <Upload size={18}/>
                      <span>Click to upload mobile image</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> Creating...</> : 'Create Ad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
