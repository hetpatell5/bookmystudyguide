import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, Briefcase, Loader2, RefreshCw, Eye, EyeOff,
  Pencil, X, Plus, CheckCircle2, Image as ImageIcon,
  GraduationCap, Link as LinkIcon, Save, ChevronLeft, ChevronRight,
  Layers, Settings2, FileText,
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import projectService from '../services/projectService';
import api from '../services/api';
import styles from './Projects.module.css';

/* ── helpers ──────────────────────────────────────────────────── */
const getSynopsisImage = (p) => {
  let imgs = p.images;
  if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
  if (!Array.isArray(imgs) || imgs.length === 0) return '';
  const idx = Number(p.coverImageIndex || 0);
  return imgs[idx] || imgs[0] || '';
};

const getSynopsisCategory = (p) => {
  const parts = [p.mainDegree || p.mainDegreeName, p.subDegree || p.subDegreeName].filter(Boolean);
  return parts.join(' / ') || '—';
};

const initForm = {
  title: '', description: '',
  type: 'Project Report',
  mainDegreeId: '', subDegreeId: '', subjectId: '',
  price: '', mrp: '',
  images: [], coverImageIndex: 0,
  synopsisLinks: [],
  isActive: true,
};

const BLANK_LINK = {
  language: 'English', category: 'Synopsis', type: 'Soft Copy',
  price: '', mrp: '', link: '', images: [], coverImageIndex: 0,
};

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export default function Projects() {
  const [loading, setLoading]     = useState(true);
  const [projects, setProjects]   = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees,  setSubDegrees]  = useState([]);
  const [subjects,    setSubjects]    = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(initForm);
  const [saving,    setSaving]    = useState(false);
  const [linkImgIdx, setLinkImgIdx] = useState(null);

  /* ─── data fetch ─────────────────────────────────────────── */
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await projectService.getProjects();
      const list = res?.data || res || [];
      setProjects(Array.isArray(list) ? list : []);
    } catch { toast.error('Failed to load projects'); }
    finally   { setLoading(false); }
  }, []);

  const fetchMainDegrees = useCallback(async () => {
    try {
      const res  = await api.get('/api/mainDegrees');
      const data = res.data?.data || res.data || [];
      setMainDegrees(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchProjects(); fetchMainDegrees(); }, [fetchProjects, fetchMainDegrees]);

  /* ─── taxonomy cascade ───────────────────────────────────── */
  const loadSubDegrees = async (mainId) => {
    if (!mainId) { setSubDegrees([]); setSubjects([]); return; }
    try {
      const res = await api.get('/api/subDegrees');
      const all = res.data?.data || res.data || [];
      setSubDegrees(Array.isArray(all) ? all.filter(sd => sd.mainDegreeId === mainId) : []);
      setSubjects([]);
    } catch { toast.error('Failed to load sub-degrees'); }
  };

  const loadSubjects = async (subId) => {
    if (!subId) { setSubjects([]); return; }
    try {
      const res  = await api.get(`/api/subjects?subDegreeId=${subId}&limit=1000`);
      const data = res.data?.subjects || res.data?.data || res.data || [];
      setSubjects(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load subjects'); }
  };

  /* ─── modal open/close ───────────────────────────────────── */
  const openAdd = () => {
    setEditId(null); setForm(initForm);
    setSubDegrees([]); setSubjects([]); setLinkImgIdx(null);
    setModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = async (p) => {
    setEditId(p.id);
    let imgs  = p.images;
    let links = p.synopsisLinks;
    if (typeof imgs  === 'string') { try { imgs  = JSON.parse(imgs);  } catch { imgs  = []; } }
    if (typeof links === 'string') { try { links = JSON.parse(links); } catch { links = []; } }
    if (!Array.isArray(imgs))  imgs  = [];
    if (!Array.isArray(links)) links = [];
    setForm({
      title: p.title || '', description: p.description || '',
      mainDegreeId: p.mainDegreeId || '', subDegreeId: p.subDegreeId || '',
      subjectId: p.subjectId || '',
      type: p.type || 'Project Report',
      price: p.price || '', mrp: p.mrp || '',
      images: imgs, coverImageIndex: Number(p.coverImageIndex || 0),
      synopsisLinks: links,
      isActive: p.isActive !== undefined ? p.isActive : true,
    });
    if (p.mainDegreeId) await loadSubDegrees(p.mainDegreeId);
    if (p.subDegreeId)  await loadSubjects(p.subDegreeId);
    setLinkImgIdx(null);
    setModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeModal = () => {
    setModalOpen(false); setEditId(null); setForm(initForm);
    setSubDegrees([]); setSubjects([]); setLinkImgIdx(null);
  };

  /* ─── form helpers ───────────────────────────────────────── */
  const ef = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleMainChange = async (e) => {
    const id = e.target.value;
    setForm(f => ({ ...f, mainDegreeId: id, subDegreeId: '', subjectId: '' }));
    await loadSubDegrees(id);
  };

  const handleSubChange = async (e) => {
    const id = e.target.value;
    setForm(f => ({ ...f, subDegreeId: id, subjectId: '' }));
    await loadSubjects(id);
  };

  const handleImageUpload = (e) => {
    Array.from(e.target.files).filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setForm(f => ({ ...f, images: [...f.images, reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setForm(f => {
      const imgs = f.images.filter((_, i) => i !== idx);
      let ci = f.coverImageIndex;
      if (idx === ci) ci = 0; else if (idx < ci) ci--;
      return { ...f, images: imgs, coverImageIndex: Math.max(0, ci) };
    });
  };

  const addLink    = () => ef('synopsisLinks', [...form.synopsisLinks, { ...BLANK_LINK }]);
  const removeLink = (i) => ef('synopsisLinks', form.synopsisLinks.filter((_, idx) => idx !== i));
  const updateLink = (i, k, v) => {
    const links = [...form.synopsisLinks];
    links[i] = { ...links[i], [k]: v };
    ef('synopsisLinks', links);
  };

  const handleLinkImageUpload = (e) => {
    if (linkImgIdx === null) return;
    Array.from(e.target.files).filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => {
          const links = [...f.synopsisLinks];
          links[linkImgIdx] = { ...links[linkImgIdx], images: [...(links[linkImgIdx].images || []), reader.result] };
          return { ...f, synopsisLinks: links };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeLinkImage = (imgIdx) => {
    if (linkImgIdx === null) return;
    setForm(f => {
      const links = [...f.synopsisLinks];
      const link  = { ...links[linkImgIdx] };
      link.images = link.images.filter((_, i) => i !== imgIdx);
      if (link.coverImageIndex >= link.images.length) link.coverImageIndex = 0;
      links[linkImgIdx] = link;
      return { ...f, synopsisLinks: links };
    });
  };

  /* ─── save ───────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.title?.trim()) { toast.warning('Title is required'); return; }
    const md  = mainDegrees.find(m => m.id === form.mainDegreeId);
    const sd  = subDegrees.find(s => s.id === form.subDegreeId);
    const sub = subjects.find(s => s.id === form.subjectId);
    const fl  = form.synopsisLinks[0];
    const price = form.price || fl?.price || 0;
    const mrp   = form.mrp   || fl?.mrp   || price;
    const payload = {
      title: form.title, description: form.description,
      mainDegreeId: form.mainDegreeId || null,
      subDegreeId:  form.subDegreeId  || null,
      subjectId:    form.subjectId    || null,
      mainDegree: md?.name  || '', subDegree: sd?.name  || '', subject: sub?.name || '',
      type: form.type || 'Project Report',
      price, mrp, isActive: form.isActive,
      images: form.images, coverImageIndex: form.coverImageIndex,
      synopsisLinks: form.synopsisLinks,
      percentage: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    };
    setSaving(true);
    try {
      if (editId) {
        await projectService.updateProject(editId, payload);
        toast.success('Project updated!');
      } else {
        await projectService.createProject(payload);
        toast.success('Project created!');
      }
      closeModal(); fetchProjects();
    } catch { toast.error(editId ? 'Failed to update project' : 'Failed to create project'); }
    finally  { setSaving(false); }
  };

  /* ─── publish / delete ───────────────────────────────────── */
  const handleTogglePublish = async (p) => {
    try {
      await projectService.togglePublish(p.id, !p.isActive);
      toast.success(!p.isActive ? 'Published' : 'Set to Draft');
      fetchProjects();
    } catch { toast.error('Failed to update status'); }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await projectService.deleteProject(id); toast.success('Deleted'); fetchProjects(); }
    catch { toast.error('Delete failed'); }
  };

  const handleBulkPublish = async (isPublished) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) { toast.warning('Select at least one project'); return; }
    try {
      await projectService.bulkPublish(ids, isPublished);
      toast.success(`${ids.length} project(s) ${isPublished ? 'published' : 'drafted'}`);
      setSelectedIds(new Set()); fetchProjects();
    } catch { toast.error('Bulk update failed'); }
  };

  const toggleSelect    = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === projects.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(projects.map(p => p.id)));
  };

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Manage synopsis / project listings</p>
        </div>
        <div className="page-actions">
          {selectedIds.size > 0 && <>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkPublish(true)}><Eye size={13} /> Publish ({selectedIds.size})</button>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkPublish(false)}><EyeOff size={13} /> Draft ({selectedIds.size})</button>
          </>}
          <button className="btn btn-outline btn-sm" onClick={fetchProjects}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Project</button>
        </div>
      </div>

      {modalOpen && (
        <ProjectModal
          editId={editId} form={form} ef={ef} saving={saving}
          mainDegrees={mainDegrees} subDegrees={subDegrees} subjects={subjects}
          handleMainChange={handleMainChange} handleSubChange={handleSubChange}
          handleImageUpload={handleImageUpload} removeImage={removeImage}
          addLink={addLink} removeLink={removeLink} updateLink={updateLink}
          linkImgIdx={linkImgIdx} setLinkImgIdx={setLinkImgIdx}
          handleLinkImageUpload={handleLinkImageUpload} removeLinkImage={removeLinkImage}
          handleSave={handleSave} closeModal={closeModal}
        />
      )}

      <div className="section-block">
        <div className="section-header">
          <span className="section-title">Existing Projects ({projects.length})</span>
        </div>
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th><input type="checkbox" checked={projects.length > 0 && selectedIds.size === projects.length} onChange={toggleSelectAll} /></th>
                <th>Image</th><th>Title</th><th>Category</th><th>Price</th><th>Links</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {projects.map(p => {
                  const thumb     = getSynopsisImage(p);
                  const linkCount = Array.isArray(p.synopsisLinks) ? p.synopsisLinks.length : 0;
                  return (
                    <tr key={p.id}>
                      <td><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                      <td>
                        <img
                          src={thumb || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="%23f1f5f9"/></svg>`}
                          alt=""
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-default)' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                        {p.type && <span className="badge badge-neutral" style={{ fontSize: 10, marginTop: 3 }}>{p.type}</span>}
                      </td>
                      <td><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getSynopsisCategory(p)}</div></td>
                      <td>
                        <div style={{ fontWeight: 700 }}>₹{p.price}</div>
                        {Number(p.mrp) > Number(p.price) && <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{p.mrp}</div>}
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                          <LinkIcon size={10} style={{ marginRight: 3 }} />{linkCount}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {p.isActive ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="action-btn" title={p.isActive ? 'Set to Draft' : 'Publish'}
                            onClick={() => handleTogglePublish(p)}
                            style={{ color: p.isActive ? 'var(--warning)' : 'var(--success)' }}>
                            {p.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button className="action-btn edit" title="Edit" onClick={() => openEdit(p)}>
                            <Pencil size={13} />
                          </button>
                          <button className="action-btn del" title="Delete" onClick={() => deleteProject(p.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <Briefcase size={36} />
                      <h3>No projects yet</h3>
                      <p>Click "+ Add Project" to create your first project</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ProjectModal
══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'classification', label: 'Classification', icon: <Layers size={15} /> },
  { id: 'details',        label: 'Details',        icon: <FileText size={15} /> },
  { id: 'pricing',        label: 'Pricing',        icon: <Settings2 size={15} /> },
  { id: 'images',         label: 'Images',         icon: <ImageIcon size={15} /> },
  { id: 'versions',       label: 'Versions',       icon: <LinkIcon size={15} /> },
];

function ProjectModal({
  editId, form, ef, saving,
  mainDegrees, subDegrees, subjects,
  handleMainChange, handleSubChange,
  handleImageUpload, removeImage,
  addLink, removeLink, updateLink,
  linkImgIdx, setLinkImgIdx,
  handleLinkImageUpload, removeLinkImage,
  handleSave, closeModal,
}) {
  const [tab, setTab] = useState('classification');
  const [mainSearch, setMainSearch] = useState('');
  const [subSearch,  setSubSearch]  = useState('');
  const [subjSearch, setSubjSearch] = useState('');
  const tabIdx = TABS.findIndex(t => t.id === tab);
  const isFirst = tabIdx === 0;
  const isLast  = tabIdx === TABS.length - 1;
  const goNext  = () => !isLast  && setTab(TABS[tabIdx + 1].id);
  const goPrev  = () => !isFirst && setTab(TABS[tabIdx - 1].id);

  return (
    <div className="section-block" style={{ marginBottom: 20 }}>
      <div className="section-header">
        <span className="section-title">{editId ? 'Edit Project' : 'Create New Project'}</span>
        <div className={styles.editorActions}>
          <div className={styles.statusPill}>
            <button
              className={`${styles.statusBtn} ${form.isActive ? styles.live : ''}`}
              onClick={() => ef('isActive', true)}>
              <Eye size={11} /> Live
            </button>
            <button
              className={`${styles.statusBtn} ${!form.isActive ? styles.draft : ''}`}
              onClick={() => ef('isActive', false)}>
              <EyeOff size={11} /> Draft
            </button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={closeModal}>Cancel Edit</button>
        </div>
      </div>

      <div className={styles.steps}>
        {TABS.map((t, i) => (
          <button
            key={t.id}
            className={`${styles.stepItem} ${tab === t.id ? styles.activeStep : ''} ${tabIdx > i ? styles.doneStep : ''}`}
            onClick={() => setTab(t.id)}>
            <span className={styles.stepIcon}>{tabIdx > i ? <CheckCircle2 size={15} /> : t.icon}</span>
            <span className={styles.stepLabel}>{t.label}</span>
          </button>
        ))}
        <div className={styles.stepLine} />
      </div>

      <div className={styles.wizardPane}>

            {/* Details */}
            {tab === 'details' && (
              <div>
                <PaneTitle icon={<FileText size={15} />} title="Project Details" sub="Give your project a clear title and description" />
                <div className={styles.field}>
                  <label className={styles.label}>Project Title *</label>
                  <input
                    className={styles.input}
                    placeholder="e.g. IGNOU MBA Semester 1 Synopsis…"
                    value={form.title}
                    onChange={e => ef('title', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <div className={styles.quillWrap}>
                    <ReactQuill
                      theme="snow"
                      value={form.description}
                      onChange={v => ef('description', v)}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, 4, false] }],
                          [{ font: [] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ color: [] }, { background: [] }],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          [{ indent: '-1' }, { indent: '+1' }],
                          [{ align: [] }],
                          ['blockquote', 'code-block'],
                          ['link', 'image'],
                          ['clean'],
                        ],
                      }}
                      formats={[
                        'header', 'font',
                        'bold', 'italic', 'underline', 'strike',
                        'color', 'background',
                        'list', 'bullet', 'indent',
                        'align',
                        'blockquote', 'code-block',
                        'link', 'image',
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Classification */}
            {tab === 'classification' && (
              <div>
                <PaneTitle icon={<Layers size={15} />} title="Classification" sub="Link this project to a degree and subject" />
                <div className={styles.field}>
                  <label className={styles.label}>Product Type *</label>
                  <select className={styles.select} value={form.type} onChange={e => ef('type', e.target.value)}>
                    <option value="Project Report">Project Report</option>
                    <option value="Practical">Practical Report</option>
                    <option value="Internship Report">Internship Report</option>
                    <option value="Synopsis">Synopsis</option>
                  </select>
                </div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Main Degree</label>
                    <input
                      className={styles.input}
                      style={{ marginBottom: 6 }}
                      placeholder="Search degree…"
                      value={mainSearch}
                      onChange={e => setMainSearch(e.target.value)}
                    />
                    <select
                      className={styles.select}
                      value={form.mainDegreeId}
                      onChange={e => { setMainSearch(''); handleMainChange(e); }}
                      size={Math.min(6, mainDegrees.filter(m => m.name.toLowerCase().includes(mainSearch.toLowerCase())).length + 1)}
                      style={{ height: 'auto' }}
                    >
                      <option value="">— Select Degree —</option>
                      {mainDegrees
                        .filter(m => m.name.toLowerCase().includes(mainSearch.toLowerCase()))
                        .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Sub Degree</label>
                    <input
                      className={styles.input}
                      style={{ marginBottom: 6, opacity: form.mainDegreeId ? 1 : 0.5 }}
                      placeholder="Search sub degree…"
                      value={subSearch}
                      disabled={!form.mainDegreeId}
                      onChange={e => setSubSearch(e.target.value)}
                    />
                    <select
                      className={styles.select}
                      value={form.subDegreeId}
                      onChange={e => { setSubSearch(''); handleSubChange(e); }}
                      disabled={!form.mainDegreeId}
                      size={Math.min(6, subDegrees.filter(s => s.name.toLowerCase().includes(subSearch.toLowerCase())).length + 1)}
                      style={{ height: 'auto', opacity: form.mainDegreeId ? 1 : 0.5 }}
                    >
                      <option value="">— Select Sub Degree —</option>
                      {subDegrees
                        .filter(s => s.name.toLowerCase().includes(subSearch.toLowerCase()))
                        .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Subject</label>
                  <input
                    className={styles.input}
                    style={{ marginBottom: 6, opacity: form.subDegreeId ? 1 : 0.5 }}
                    placeholder="Search subject…"
                    value={subjSearch}
                    disabled={!form.subDegreeId}
                    onChange={e => setSubjSearch(e.target.value)}
                  />
                  <select
                    className={styles.select}
                    value={form.subjectId}
                    onChange={e => { setSubjSearch(''); ef('subjectId', e.target.value); }}
                    disabled={!form.subDegreeId}
                    size={Math.min(7, subjects.filter(s => s.name.toLowerCase().includes(subjSearch.toLowerCase())).length + 1)}
                    style={{ height: 'auto', opacity: form.subDegreeId ? 1 : 0.5 }}
                  >
                    <option value="">— Select Subject —</option>
                    {subjects
                      .filter(s => s.name.toLowerCase().includes(subjSearch.toLowerCase()))
                      .map(s => <option key={s.id} value={s.id}>{s.name}{s.year ? ` (${s.year})` : ''}</option>)}
                  </select>
                </div>
                {!form.mainDegreeId && (
                  <div className={styles.infoBox}>
                    <GraduationCap size={14} style={{ flexShrink: 0, color: 'var(--brand-primary)' }} />
                    <span>Select a Main Degree first to unlock Sub Degree and Subject options.</span>
                  </div>
                )}
              </div>
            )}

            {/* Pricing */}
            {tab === 'pricing' && (
              <div>
                <PaneTitle icon={<Settings2 size={15} />} title="Pricing" sub="Set the selling price and MRP for this project" />
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Selling Price (₹) *</label>
                    <div className={styles.priceWrap}>
                      <span className={styles.priceSign}>₹</span>
                      <input
                        className={`${styles.input} ${styles.priceInput}`}
                        type="number" placeholder="0"
                        value={form.price}
                        onChange={e => ef('price', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>MRP / Strike Price (₹)</label>
                    <div className={styles.priceWrap}>
                      <span className={styles.priceSign}>₹</span>
                      <input
                        className={`${styles.input} ${styles.priceInput}`}
                        type="number" placeholder="0"
                        value={form.mrp}
                        onChange={e => ef('mrp', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {form.price && form.mrp && Number(form.mrp) > Number(form.price) && (
                  <div className={styles.discountBox}>
                    <span className={styles.discountPct}>
                      {Math.round(((form.mrp - form.price) / form.mrp) * 100)}% off
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>will display on the listing</span>
                  </div>
                )}
              </div>
            )}

            {/* Images */}
            {tab === 'images' && (
              <div>
                <PaneTitle icon={<ImageIcon size={15} />} title="Project Images" sub="Upload images - hover to set cover or remove" />
                <label className={styles.uploadZone}>
                  <input type="file" multiple accept="image/*" hidden onChange={handleImageUpload} />
                  <ImageIcon size={28} className={styles.uploadZoneIcon} />
                  <span className={styles.uploadZoneText}>Click or drag images here</span>
                  <span className={styles.uploadZoneSub}>PNG, JPG, WEBP — multiple files OK</span>
                </label>
                {form.images.length > 0 ? (
                  <div className={styles.imgGrid}>
                    {form.images.map((src, i) => (
                      <div key={i} className={`${styles.imgCard} ${i === form.coverImageIndex ? styles.cover : ''}`}>
                        <img src={src} alt="" className={styles.imgCardInner} />
                        {i === form.coverImageIndex && <span className={styles.coverBadge}>Cover</span>}
                        <div className={styles.imgActions}>
                          <button className={styles.imgActionBtn} title="Set as Cover" onClick={() => ef('coverImageIndex', i)}>
                            <CheckCircle2 size={12} />
                          </button>
                          <button className={`${styles.imgActionBtn} ${styles.del}`} title="Remove" onClick={() => removeImage(i)}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.imgEmpty}>No images uploaded yet.</div>
                )}
              </div>
            )}

            {/* Versions */}
            {tab === 'versions' && (
              <div>
                <div className={styles.versionsHeader}>
                  <PaneTitle icon={<LinkIcon size={15} />} title="Download Versions" sub="Add language/format variants with links" noMargin />
                  <button className={styles.addVersionBtn} onClick={addLink}><Plus size={13} /> Add Version</button>
                </div>
                {form.synopsisLinks.length === 0 ? (
                  <div className={styles.emptyVersions}>
                    <LinkIcon size={28} style={{ opacity: .2 }} />
                    <h4>No versions yet</h4>
                    <p>Click "Add Version" to add download links in different languages or formats.</p>
                  </div>
                ) : (
                  <div className={styles.versionList}>
                    {form.synopsisLinks.map((lk, i) => (
                      <div key={i} className={`${styles.vCard} ${linkImgIdx === i ? styles.expanded : ''}`}>
                        <div className={styles.vCardRow}>
                          <div className={styles.vField} style={{ flex: '0 0 110px' }}>
                            <div className={styles.vLabel}>Language</div>
                            <select className={styles.vSelect} value={lk.language || 'English'} onChange={e => updateLink(i, 'language', e.target.value)}>
                              <option>English</option><option>Hindi</option>
                              <option>Gujarati</option><option>Sanskrit</option>
                            </select>
                          </div>
                          <div className={styles.vField} style={{ flex: '0 0 100px' }}>
                            <div className={styles.vLabel}>Category</div>
                            <select className={styles.vSelect} value={lk.category || 'Synopsis'} onChange={e => updateLink(i, 'category', e.target.value)}>
                              <option value="Synopsis">Synopsis</option>
                              <option value="Report">Report</option>
                              <option value="Practical">Practical</option>
                              <option value="Internship Report">Internship Report</option>
                            </select>
                          </div>
                          <div className={styles.vField} style={{ flex: '0 0 85px' }}>
                            <div className={styles.vLabel}>Price (₹)</div>
                            <input className={styles.vInput} type="number" placeholder="0"
                              value={lk.price || ''} onChange={e => updateLink(i, 'price', e.target.value)} />
                          </div>
                          <div className={styles.vField} style={{ flex: '0 0 85px' }}>
                            <div className={styles.vLabel}>MRP (₹)</div>
                            <input className={styles.vInput} type="number" placeholder="0"
                              value={lk.mrp || ''} onChange={e => updateLink(i, 'mrp', e.target.value)} />
                          </div>
                          <div className={styles.vField} style={{ flex: 1, minWidth: 160 }}>
                            <div className={styles.vLabel}>Download Link</div>
                            <input className={styles.vInput} placeholder="https://drive.google.com/…"
                              value={lk.link || ''} onChange={e => updateLink(i, 'link', e.target.value)} />
                          </div>
                          <div className={styles.vActions}>
                            <button
                              className={`${styles.vImgBtn} ${linkImgIdx === i ? styles.active : ''}`}
                              onClick={() => setLinkImgIdx(linkImgIdx === i ? null : i)}
                              title="Manage images">
                              <ImageIcon size={12} />
                              {lk.images?.length > 0 && <span style={{ marginLeft: 3 }}>{lk.images.length}</span>}
                            </button>
                            <button className={styles.vDelBtn} onClick={() => removeLink(i)}><X size={13} /></button>
                          </div>
                        </div>

                        {linkImgIdx === i && (
                          <div className={styles.vImgPanel}>
                            <div className={styles.vImgPanelHead}>
                              <span className={styles.vImgPanelTitle}>
                                Images — {lk.language} / {lk.category}
                              </span>
                              <label className={styles.vUploadBtn}>
                                <Plus size={11} /> Upload
                                <input type="file" multiple accept="image/*" hidden onChange={handleLinkImageUpload} />
                              </label>
                            </div>
                            <div className={styles.vImgGrid}>
                              {(lk.images || []).map((src, ii) => (
                                <div key={ii} className={`${styles.imgCard} ${ii === lk.coverImageIndex ? styles.cover : ''}`}>
                                  <img src={src} alt="" className={styles.imgCardInner} />
                                  {ii === lk.coverImageIndex && <span className={styles.coverBadge}>Cover</span>}
                                  <div className={styles.imgActions}>
                                    <button className={styles.imgActionBtn} onClick={() => {
                                      const links = [...form.synopsisLinks];
                                      links[i] = { ...links[i], coverImageIndex: ii };
                                      ef('synopsisLinks', links);
                                    }}>
                                      <CheckCircle2 size={12} />
                                    </button>
                                    <button className={`${styles.imgActionBtn} ${styles.del}`} onClick={() => removeLinkImage(ii)}>
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {!(lk.images?.length) && (
                                <span className={styles.vImgEmpty}>No images for this variant yet.</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

      </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.dots}>
            {TABS.map(t => (
              <div
                key={t.id}
                className={`${styles.dot} ${tab === t.id ? styles.active : ''}`}
                onClick={() => setTab(t.id)}
              />
            ))}
          </div>
          <div className={styles.footerBtns}>
            {!isFirst && (
              <button className={styles.navBtn} onClick={goPrev}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button className={styles.navBtn} onClick={closeModal}>Cancel</button>
            {!isLast ? (
              <button className={styles.primaryBtn} onClick={goNext}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 size={13} className={styles.spin} /> Saving…</>
                  : <><Save size={13} /> {editId ? 'Save Changes' : 'Create Project'}</>}
              </button>
            )}
          </div>
        </div>

    </div>
  );
}

/* ── Small helpers ───────────────────────────────────────────── */
function PaneTitle({ icon, title, sub, noMargin }) {
  return (
    <div className={styles.paneTitle} style={{ marginBottom: noMargin ? 0 : undefined }}>
      <div className={styles.paneTitleText}><span>{icon}</span>{title}</div>
      <div className={styles.paneSub}>{sub}</div>
    </div>
  );
}
