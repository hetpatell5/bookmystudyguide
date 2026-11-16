import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Trash2, Link as LinkIcon, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import educationalService from '../services/educationalService';
import { IMAGE_BASE_URL } from '../services/api';
import styles from './Synopsis.module.css';

const Synopsis = () => {
  const [synopses, setSynopses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeSynopsis, setActiveSynopsis] = useState(null);
  const [links, setLinks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSynopses(); }, []);

  const fetchSynopses = async () => {
    try {
      setLoading(true);
      const res = await educationalService.getSynopses();
      setSynopses(res.data || res || []);
    } catch { toast.error('Failed to load synopses'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this synopsis?')) return;
    try {
      await educationalService.deleteSynopsis(id);
      toast.success('Deleted');
      setSynopses(synopses.filter(s => s.id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const openLinkModal = (syn) => {
    setActiveSynopsis(syn);
    setLinks(syn.synopsisLinks || []);
    setShowModal(true);
  };

  const addLinkRow = () => {
    setLinks([...links, { language: '', type: 'Soft Copy', category: 'Synopsis', price: '', mrp: '', link: '', images: [] }]);
  };

  const updateLink = (idx, field, val) => {
    const updated = [...links];
    updated[idx][field] = val;
    setLinks(updated);
  };

  const handleSaveLinks = async () => {
    if (!activeSynopsis) return;
    try {
      setSaving(true);
      await educationalService.updateSynopsis(activeSynopsis.id, { synopsisLinks: links });
      toast.success('Links updated');
      setShowModal(false);
      fetchSynopses();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const getImageUrl = (item) => {
    const img = item.images?.[item.coverImageIndex] || item.images?.[0];
    if (!img) return 'https://via.placeholder.com/60x60?text=N/A';
    return img.startsWith('http') ? img : `${IMAGE_BASE_URL}/${img}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Synopsis & Projects</h1>
          <p className="page-subtitle">{synopses.length} project reports in inventory</p>
        </div>
        <button className="btn-ghost" onClick={fetchSynopses} title="Refresh"><FolderKanban size={16} /></button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state" style={{ minHeight: 280 }}>
            <Loader2 size={32} className="spinner" />
            <p>Loading synopses...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Classification</th>
                  <th>Price</th>
                  <th>Variants</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {synopses.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state" style={{ minHeight: 200 }}>
                        <p>No synopses found.</p>
                      </div>
                    </td>
                  </tr>
                ) : synopses.map(syn => (
                  <tr key={syn.id}>
                    <td>
                      <img src={getImageUrl(syn)} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}
                        onError={e => { e.target.src = 'https://via.placeholder.com/48?text=N/A'; }} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{syn.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {syn.description?.replace(/<[^>]*>/g, '').slice(0, 80)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{syn.mainDegree}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{syn.subDegree} &bull; {syn.subject}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--brand-secondary)' }}>₹{syn.price}</div>
                      {syn.mrp > syn.price && <del style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹{syn.mrp}</del>}
                    </td>
                    <td>
                      <span className="badge-info">{syn.synopsisLinks?.length || 0} variants</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: '5px' }} onClick={() => openLinkModal(syn)} title="Manage Links">
                          <LinkIcon size={15} />
                        </button>
                        <button className="btn-danger" style={{ padding: '5px' }} onClick={() => handleDelete(syn.id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Links Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Download Variants</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeSynopsis?.title}</p>
              </div>
              <button className="btn-ghost" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Language</th><th>Type</th><th>Category</th>
                      <th>Price (₹)</th><th>MRP (₹)</th><th>Link</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link, idx) => (
                      <tr key={idx}>
                        {['language', 'type', 'category'].map(f => (
                          <td key={f}>
                            <select className="form-input" style={{ fontSize: 12, padding: '5px 8px' }}
                              value={link[f]} onChange={e => updateLink(idx, f, e.target.value)}>
                              {f === 'language' && ['', 'English', 'Hindi', 'Gujarati'].map(o => <option key={o} value={o}>{o || 'Select...'}</option>)}
                              {f === 'type' && ['Soft Copy', 'Hard Copy', 'Audio', 'Video'].map(o => <option key={o}>{o}</option>)}
                              {f === 'category' && ['Synopsis', 'Report', 'Guide'].map(o => <option key={o}>{o}</option>)}
                            </select>
                          </td>
                        ))}
                        {['price', 'mrp'].map(f => (
                          <td key={f}>
                            <input className="form-input" style={{ fontSize: 12, padding: '5px 8px', width: 80 }}
                              type="number" placeholder={f} value={link[f]} onChange={e => updateLink(idx, f, e.target.value)} />
                          </td>
                        ))}
                        <td>
                          <input className="form-input" style={{ fontSize: 12, padding: '5px 8px', minWidth: 200 }}
                            placeholder="https://..." value={link.link} onChange={e => updateLink(idx, 'link', e.target.value)} />
                        </td>
                        <td>
                          <button className="btn-danger" style={{ padding: '4px' }}
                            onClick={() => setLinks(links.filter((_, i) => i !== idx))}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, marginTop: 12 }}
                onClick={addLinkRow}>
                <Plus size={13} /> Add Variant
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveLinks} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Variants'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Synopsis;
