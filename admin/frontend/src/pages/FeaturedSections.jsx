import React, { useState, useEffect } from 'react';
import {
  Trash2, Edit2, X, RefreshCcw, Save, ToggleLeft, ToggleRight,
  Sparkles, BookOpen, Hash, FileText, Layers, CheckCircle2, Circle,
  Eye, EyeOff, PlusCircle, GripVertical, ChevronUp, ChevronDown
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import educationalService from '../services/educationalService';
import taxonomyService from '../services/taxonomyService';
import SearchableSelect from '../components/SearchableSelect';
import './FeaturedSections.css';

const BLANK = {
  title: '',
  subtitle: '',
  mainDegreeId: '',
  subDegreeId: '',
  isActive: true,
  order: 0,
};

export default function FeaturedSections() {
  const [sections, setSections]       = useState([]);
  const [form, setForm]               = useState(BLANK);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees]   = useState([]);
  const [subLoading, setSubLoading]   = useState(false);
  const [allBookTypes, setAllBookTypes] = useState([]);

  useEffect(() => { load(); loadDegrees(); loadBookTypes(); }, []);

  const loadBookTypes = async () => {
    try {
      const res = await import('../services/api').then(m => m.default.get('/api/books'));
      const books = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
      setAllBookTypes(books.map(b => ({ id: b.id, name: b.name || b.title })));
    } catch { /* silent */ }
  };

  const load = async () => {
    setFetching(true);
    try {
      const res = await educationalService.getFeaturedSections();
      setSections(Array.isArray(res?.data) ? res.data : []);
    } catch { toast.error('Failed to load featured sections'); }
    finally { setFetching(false); }
  };

  const loadDegrees = async () => {
    try {
      const res = await taxonomyService.getMainDegrees();
      setMainDegrees(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch { /* silent */ }
  };

  // Load sub-degrees whenever main degree changes
  useEffect(() => {
    if (!form.mainDegreeId) {
      setSubDegrees([]);
      return;
    }
    setSubLoading(true);
    taxonomyService.getSubDegrees(form.mainDegreeId)
      .then(res => {
        const subs = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setSubDegrees(subs);
      })
      .catch(() => setSubDegrees([]))
      .finally(() => setSubLoading(false));
  }, [form.mainDegreeId]);

  const ef = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openEdit = (section) => {
    setForm({
      title: section.title,
      subtitle: section.subtitle || '',
      mainDegreeId: (section.mainDegreeIds || [])[0] || '',
      subDegreeId:  (section.subDegreeIds  || [])[0] || '',
      isActive: section.isActive,
      order: section.order ?? 0,
    });
    setEditId(section.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => { setForm(BLANK); setEditId(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim())    { toast.warning('Title is required'); return; }
    if (!form.mainDegreeId)    { toast.warning('Select a Main Degree'); return; }
    setSaving(true);
    try {
      // Wrap single value back into arrays for the backend
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        mainDegreeIds: [form.mainDegreeId],
        subDegreeIds:  form.subDegreeId ? [form.subDegreeId] : [],
        isActive: form.isActive,
        order: form.order,
      };
      await educationalService.saveFeaturedSection(editId, payload);
      toast.success(editId ? 'Section updated!' : 'Section created!');
      reset();
      load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this featured section?')) return;
    try {
      await educationalService.deleteFeaturedSection(id);
      toast.success('Section deleted');
      setSections(s => s.filter(x => x.id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const toggleActive = async (section) => {
    try {
      await educationalService.saveFeaturedSection(section.id, { isActive: !section.isActive });
      setSections(s => s.map(x => x.id === section.id ? { ...x, isActive: !x.isActive } : x));
      toast.success(`Section ${!section.isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update'); }
  };

  const activeSections   = sections.filter(s => s.isActive);
  const inactiveSections = sections.filter(s => !s.isActive);

  return (
    <div className="fs-page">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ── Page Header ── */}
      <div className="fs-page-header">
        <div className="fs-page-header__left">
          <div className="fs-page-icon"><Sparkles size={20} /></div>
          <div>
            <h1 className="fs-page-title">Featured Degree Sections</h1>
            <p className="fs-page-sub">Showcase curated books by degree on the home page</p>
          </div>
        </div>
        <button className="fs-btn fs-btn--outline fs-btn--sm" onClick={load}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="fs-stats">
        <div className="fs-stat">
          <span className="fs-stat__value">{sections.length}</span>
          <span className="fs-stat__label">Total Sections</span>
        </div>
        <div className="fs-stat fs-stat--active">
          <span className="fs-stat__value">{activeSections.length}</span>
          <span className="fs-stat__label">Active</span>
        </div>
        <div className="fs-stat fs-stat--inactive">
          <span className="fs-stat__value">{inactiveSections.length}</span>
          <span className="fs-stat__label">Inactive</span>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="fs-layout">

        {/* ── Left: Form ── */}
        <div className="fs-form-panel">
          <div className="fs-form-panel__header">
            <div className="fs-form-panel__header-left">
              <PlusCircle size={16} />
              <span>{editId ? 'Edit Section' : 'New Featured Section'}</span>
            </div>
            {editId && (
              <button className="fs-btn fs-btn--ghost fs-btn--sm" onClick={reset}>
                <X size={14} /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="fs-form">

            {/* Section Title */}
            <div className="fs-field">
              <label className="fs-label">
                <FileText size={13} />
                Section Title <span className="fs-required">*</span>
              </label>
              <input
                className="fs-input"
                placeholder="e.g. DWED Study Materials"
                value={form.title}
                onChange={e => ef('title', e.target.value)}
                required
              />
            </div>

            {/* Subtitle */}
            <div className="fs-field">
              <label className="fs-label">
                <FileText size={13} />
                Subtitle / Tagline
              </label>
              <input
                className="fs-input"
                placeholder="e.g. Top picks for DWED students"
                value={form.subtitle}
                onChange={e => ef('subtitle', e.target.value)}
              />
            </div>

            {/* Main Degree */}
            <div className="fs-field">
              <label className="fs-label">
                <Layers size={13} />
                Main Degree <span className="fs-required">*</span>
              </label>
              <SearchableSelect
                options={mainDegrees}
                value={form.mainDegreeId}
                onChange={id => { ef('mainDegreeId', id); ef('subDegreeId', ''); }}
                placeholder="Select a Main Degree..."
              />
              <p className="fs-hint">Select the main degree category for this section</p>
            </div>

            {/* Sub Degree */}
            <div className="fs-field">
              <label className={`fs-label ${!form.mainDegreeId ? 'fs-label--disabled' : ''}`}>
                <Layers size={13} />
                Sub Degree
                {subLoading && <span className="fs-badge fs-badge--loading">Loading…</span>}
                {!subLoading && subDegrees.length > 0 && (
                  <span className="fs-badge">{subDegrees.length} available</span>
                )}
              </label>
              <SearchableSelect
                options={subDegrees}
                value={form.subDegreeId}
                onChange={id => ef('subDegreeId', id)}
                placeholder={!form.mainDegreeId ? 'Select Main Degree first' : 'Select a Sub Degree... (optional)'}
                disabled={!form.mainDegreeId}
              />
              <p className="fs-hint">Optional — leave blank to show all books under the main degree</p>
            </div>

            {/* Order & Status */}
            <div className="fs-field-row">
              <div className="fs-field">
                <label className="fs-label">
                  <Hash size={13} />
                  Display Order
                </label>
                <input
                  className="fs-input fs-input--sm"
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={e => ef('order', Number(e.target.value))}
                />
              </div>

              <div className="fs-field">
                <label className="fs-label">Status</label>
                <button
                  type="button"
                  onClick={() => ef('isActive', !form.isActive)}
                  className={`fs-toggle ${form.isActive ? 'fs-toggle--on' : 'fs-toggle--off'}`}
                >
                  {form.isActive
                    ? <><CheckCircle2 size={15} /> Active</>
                    : <><Circle size={15} /> Inactive</>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button className="fs-btn fs-btn--primary fs-btn--full" type="submit" disabled={saving}>
              {saving
                ? <><span className="fs-spinner" /> Saving…</>
                : <><Save size={14} /> {editId ? 'Update Section' : 'Create Section'}</>
              }
            </button>
          </form>
        </div>

        {/* ── Right: Sections List ── */}
        <div className="fs-list-panel">
          <div className="fs-list-panel__header">
            <span className="fs-list-panel__title">
              <BookOpen size={16} />
              All Sections
              <span className="fs-count-badge">{sections.length}</span>
            </span>
          </div>

          {fetching ? (
            <div className="fs-loading">
              <div className="fs-spinner fs-spinner--lg" />
              <span>Loading sections…</span>
            </div>
          ) : sections.length === 0 ? (
            <div className="fs-empty">
              <div className="fs-empty__icon"><Sparkles size={32} /></div>
              <h3>No featured sections yet</h3>
              <p>Create your first section using the form on the left.</p>
            </div>
          ) : (
            <div className="fs-cards">
              {[...sections].sort((a, b) => a.order - b.order).map((sec) => {
                const mainDeg = sec.mainDegrees?.[0];
                const subDeg  = sec.subDegrees?.[0];
                return (
                  <div key={sec.id} className={`fs-card ${sec.isActive ? 'fs-card--active' : 'fs-card--inactive'}`}>
                    <div className="fs-card__header">
                      <div className="fs-card__order">#{sec.order ?? '—'}</div>
                      <div className="fs-card__info">
                        <div className="fs-card__title">{sec.title}</div>
                        {sec.subtitle && <div className="fs-card__sub">{sec.subtitle}</div>}
                      </div>
                      <div className="fs-card__status">
                        {sec.isActive
                          ? <span className="fs-pill fs-pill--green"><CheckCircle2 size={11} /> Active</span>
                          : <span className="fs-pill fs-pill--gray"><Circle size={11} /> Inactive</span>
                        }
                      </div>
                    </div>

                    {/* Degree display */}
                    <div className="fs-card__degrees">
                      {mainDeg && (
                        <div className="fs-degree-row">
                          <span className="fs-degree-label">Main</span>
                          <span className="fs-tag fs-tag--main">{mainDeg.name}</span>
                        </div>
                      )}
                      {subDeg && (
                        <div className="fs-degree-row">
                          <span className="fs-degree-label">Sub</span>
                          <span className="fs-tag fs-tag--sub">{subDeg.name}</span>
                        </div>
                      )}
                      {!mainDeg && !subDeg && (
                        <div className="fs-degree-row">
                          <span className="fs-degree-label" style={{ color: '#ef4444' }}>⚠</span>
                          <span style={{ fontSize: 12, color: '#ef4444' }}>No degree assigned</span>
                        </div>
                      )}
                    </div>

                    <div className="fs-card__footer">
                      <span className="fs-products-count">
                        <BookOpen size={12} />
                        {(sec.products || []).length} products
                      </span>
                      <div className="fs-card__actions">
                        <button
                          className={`fs-action-btn ${sec.isActive ? 'fs-action-btn--eye-off' : 'fs-action-btn--eye'}`}
                          title={sec.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleActive(sec)}
                        >
                          {sec.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          className="fs-action-btn fs-action-btn--edit"
                          title="Edit"
                          onClick={() => openEdit(sec)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="fs-action-btn fs-action-btn--delete"
                          title="Delete"
                          onClick={() => handleDelete(sec.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
