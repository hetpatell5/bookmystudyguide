import React, { useState, useEffect } from 'react';
import {
  Trash2, Edit2, Plus, Layout, X,
  Bell, MessageCircle, FileText, MapPin, Package,
  Users, Info, ExternalLink, RefreshCcw, Save, Link as LinkIcon,
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import educationalService from '../services/educationalService';
import styles from './IgnouCards.module.css';

const ICON_MAP = { Bell, MessageCircle, FileText, MapPin, Package, Users, Info, ExternalLink };

const BLANK = { title: '', subtitle: '', icon: 'Bell', slug: '', targetUrl: '', order: 0 };

export default function IgnouCards() {
  const [cards, setCards]       = useState([]);
  const [form, setForm]         = useState(BLANK);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setFetching(true);
    try {
      const res = await educationalService.getIgnouCards();
      setCards(Array.isArray(res) ? res : (res.data || []));
    } catch { toast.error('Failed to load cards'); }
    finally { setFetching(false); }
  };

  const ef = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openEdit = (card) => {
    setForm({ title: card.title, subtitle: card.subtitle, icon: card.icon, slug: card.slug, targetUrl: card.targetUrl, order: card.order });
    setEditId(card.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => { setForm(BLANK); setEditId(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.slug || !form.targetUrl) { toast.warning('Title, Slug and URL are required'); return; }
    setSaving(true);
    try {
      await educationalService.saveIgnouCard(editId, form);
      toast.success(editId ? 'Card updated!' : 'Card created!');
      reset(); load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this card? It will disappear from the IGNOU portal.')) return;
    try {
      await educationalService.deleteIgnouCard(id);
      toast.success('Card deleted');
      setCards(c => c.filter(x => x.id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const Icon = ({ name, size = 16 }) => {
    const C = ICON_MAP[name] || Info;
    return <C size={size} />;
  };

  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">IGNOU Quick-Support</h1>
          <p className="page-sub">Manage cards shown on the IGNOU portal section</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCcw size={13} /> Refresh</button>
        </div>
      </div>

      <div className={styles.layout}>

        {/* ── Form ── */}
        <div className="section-block" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">{editId ? 'Edit Card' : 'New Card'}</span>
            {editId && <button className="btn btn-outline btn-sm" onClick={reset}><X size={12} /> Cancel</button>}
          </div>
          <form onSubmit={handleSave} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div className="form-group">
              <label className="form-label">Main Title *</label>
              <input className="form-input" placeholder="e.g. Admission Updates" value={form.title} onChange={e => ef('title', e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Badge Text (Subtitle)</label>
              <input className="form-input" placeholder="e.g. NEW UPDATES" value={form.subtitle} onChange={e => ef('subtitle', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <select className="form-input" value={form.icon} onChange={e => ef('icon', e.target.value)}>
                  {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Display Order</label>
                <input className="form-input" type="number" value={form.order} onChange={e => ef('order', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">App Slug *</label>
              <input className="form-input" placeholder="e.g. admission-updates" value={form.slug} onChange={e => ef('slug', e.target.value)} required />
              {form.slug && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Path: /ignou/{form.slug}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Target URL *</label>
              <input className="form-input" type="url" placeholder="https://ignou.ac.in/..." value={form.targetUrl} onChange={e => ef('targetUrl', e.target.value)} required />
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Save size={13} /> {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Card'}
            </button>
          </form>
        </div>

        {/* ── Cards list ── */}
        <div className="section-block" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">Active Cards ({cards.length})</span>
          </div>

          {fetching ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <Layout size={36} />
              <h3>No cards yet</h3>
              <p>Create your first card using the form on the left.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Icon</th>
                    <th>Title</th>
                    <th>Slug / URL</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...cards].sort((a, b) => a.order - b.order).map((card, i) => (
                    <tr key={card.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{card.order ?? i + 1}</td>
                      <td>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                          <Icon name={card.icon} />
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{card.title}</div>
                        {card.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.subtitle}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>/ignou/{card.slug}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <LinkIcon size={10} /> {card.targetUrl?.slice(0, 40)}{card.targetUrl?.length > 40 ? '…' : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="action-btn edit" title="Edit" onClick={() => openEdit(card)}><Edit2 size={13} /></button>
                          <button className="action-btn del" title="Delete" onClick={() => handleDelete(card.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
