import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, Loader2, Search, ChevronLeft, ChevronRight, Eye, EyeOff, CheckSquare, Upload, ShieldAlert } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import taxonomyService from '../services/taxonomyService';
import styles from './Classifications.module.css';

const TABS = [
  { id: 'mainDegrees', label: 'Main Degrees' },
  { id: 'subDegrees', label: 'Sub Degrees' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'books', label: 'Books' },
  { id: 'languages', label: 'Languages' },
  { id: 'courses', label: 'Courses' },
  { id: 'semesters', label: 'Semesters' },
  { id: 'years', label: 'Years' },
];

const CASCADE_LABEL = {
  mainDegrees: 'all its Sub Degrees and Subjects',
  subDegrees: 'all its Subjects',
  subjects: null,
  books: null,
  languages: null,
  courses: null,
  semesters: null,
  years: null,
};

export default function Classifications() {
  const [tab, setTab] = useState('mainDegrees');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  // Filter dropdowns
  const [filterMainId, setFilterMainId] = useState('');
  const [filterSubId, setFilterSubId] = useState('');

  // For modal dropdowns
  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [filterSubDegrees, setFilterSubDegrees] = useState([]);

  // For subject modal specifically
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [years, setYears] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false); // true = all records across all pages selected
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const isPaginated = true;
  const totalPages = Math.ceil(total / limit);

  const fetchData = async (p = page, lim = limit, s = search) => {
    setLoading(true);
    try {
      let res;
      const params = { page: p, limit: lim };
      if (s?.trim()) params.search = s.trim();

      if (tab === 'books') res = await taxonomyService.getBooks(params);
      if (tab === 'mainDegrees') res = await taxonomyService.getMainDegrees(params);
      if (tab === 'subDegrees') res = await taxonomyService.getSubDegrees(filterMainId || undefined, params);
      if (tab === 'subjects') {
        if (filterMainId) params.mainDegreeId = filterMainId;
        if (filterSubId) params.subDegreeId = filterSubId;
        res = await taxonomyService.getSubjects(params);
      }
      if (tab === 'languages') res = await taxonomyService.getLanguages();
      if (tab === 'courses') res = await taxonomyService.getCourses();
      if (tab === 'semesters') res = await taxonomyService.getSemesters();
      if (tab === 'years') res = await taxonomyService.getYears();

      const payload = res?.data || res;
      const _rows = Array.isArray(payload) ? payload : (payload?.data || payload?.subjects || payload || []);
      const _total = res?.pagination?.total ?? payload?.pagination?.total ?? payload?.total ?? _rows.length;

      setData(_rows);
      setTotal(_total);
      setSelectedIds(new Set());
      setSelectAllPages(false);
    } catch { toast.error('Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const fetchMainDegrees = async () => {
    const res = await taxonomyService.getMainDegrees();
    setMainDegrees(res?.data || res || []);
  };

  const fetchSubDegrees = async (mainId, forFilter = false) => {
    if (!mainId) { if (forFilter) setFilterSubDegrees([]); else setSubDegrees([]); return; }
    const res = await taxonomyService.getSubDegrees(mainId);
    if (forFilter) setFilterSubDegrees(res?.data || res || []);
    else setSubDegrees(res?.data || res || []);
  };

  const fetchSubjectDependencies = async () => {
    try {
      const [crs, sem, yr] = await Promise.all([
        taxonomyService.getCourses(),
        taxonomyService.getSemesters(),
        taxonomyService.getYears()
      ]);
      setCourses(crs?.data || crs || []);
      setSemesters(sem?.data || sem || []);
      setYears(yr?.data || yr || []);
    } catch (err) {
      console.error("Failed to fetch subject dependencies", err);
    }
  };

  useEffect(() => {
    setPage(1);
    setSearch('');
    setFilterMainId('');
    setFilterSubId('');
    setSelectedIds(new Set());
    setSelectAllPages(false);
    if (tab === 'subDegrees' || tab === 'subjects') fetchMainDegrees();
    if (tab === 'subjects') fetchSubjectDependencies();
  }, [tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(page, limit, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [tab, page, limit, filterMainId, filterSubId, search]);

  const handleFilterMainChange = async (id) => {
    setFilterMainId(id);
    setFilterSubId('');
    setPage(1);
    await fetchSubDegrees(id, true);
  };

  const openAdd = () => { setSelected(null); setForm({}); setSubDegrees([]); setModalOpen(true); };
  const openEdit = (item) => {
    setSelected(item);
    setForm({
      name: item.name || '',
      title: item.title || '',
      mainDegreeId: item.mainDegreeId || '',
      subDegreeId: item.subDegreeId || '',
      course: item.course || '',
      semester: item.semester || '',
      year: item.year || '',
      imagePreview: item.image || null,
      imageFile: null
    });
    if (tab === 'subjects' && item.mainDegreeId) fetchSubDegrees(item.mainDegreeId);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item? This may affect linked products.')) return;
    try {
      if (tab === 'books') await taxonomyService.deleteBook(id);
      if (tab === 'mainDegrees') await taxonomyService.deleteMainDegree(id);
      if (tab === 'subDegrees') await taxonomyService.deleteSubDegree(id);
      if (tab === 'subjects') await taxonomyService.deleteSubject(id);
      if (tab === 'languages') await taxonomyService.deleteLanguage(id);
      if (tab === 'courses') await taxonomyService.deleteCourse(id);
      if (tab === 'semesters') await taxonomyService.deleteSemester(id);
      if (tab === 'years') await taxonomyService.deleteYear(id);
      toast.success('Deleted');
      fetchData(page, limit);
    } catch { toast.error('Delete failed'); }
  };

  const handleSave = async () => {
    const name = form.name || form.title;
    if (!name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (tab === 'books') {
        const formData = new FormData();
        formData.append('title', form.title || form.name); // Using 'title' as books might expect it, or 'name' based on model. Book model uses 'name'
        formData.append('name', form.title || form.name);
        if (form.imageFile) formData.append('image', form.imageFile);

        if (selected) {
          await taxonomyService.updateBook(selected.id, formData);
        } else {
          await taxonomyService.createBook(formData);
        }
      } else if (selected) {
        if (tab === 'mainDegrees') await taxonomyService.updateMainDegree(selected.id, form);
        if (tab === 'subDegrees') await taxonomyService.updateSubDegree(selected.id, form);
        if (tab === 'subjects') await taxonomyService.updateSubject(selected.id, form);
        if (tab === 'languages') await taxonomyService.updateLanguage(selected.id, form);
        if (tab === 'courses') await taxonomyService.updateCourse(selected.id, form);
        if (tab === 'semesters') await taxonomyService.updateSemester(selected.id, form);
        if (tab === 'years') await taxonomyService.updateYear(selected.id, form);
      } else {
        if (tab === 'mainDegrees') await taxonomyService.createMainDegree(form);
        if (tab === 'subDegrees') await taxonomyService.createSubDegree(form);
        if (tab === 'subjects') await taxonomyService.createSubject(form);
        if (tab === 'languages') await taxonomyService.createLanguage(form);
        if (tab === 'courses') await taxonomyService.createCourse(form);
        if (tab === 'semesters') await taxonomyService.createSemester(form);
        if (tab === 'years') await taxonomyService.createYear(form);
      }
      toast.success(selected ? 'Updated' : 'Created');
      setModalOpen(false);
      fetchData(page, limit);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // ─── Single row publish toggle ───────────────────────────────────────────
  const handleTogglePublish = async (item) => {
    const newStatus = !item.isPublished;
    const cascadeLabel = CASCADE_LABEL[tab];
    if (cascadeLabel) {
      const action = newStatus ? 'publish' : 'unpublish';
      if (!window.confirm(`This will ${action} "${item.name || item.title}" and ${cascadeLabel}. Continue?`)) return;
    }
    try {
      if (tab === 'mainDegrees') await taxonomyService.toggleMainDegreePublish(item.id, newStatus);
      if (tab === 'subDegrees') await taxonomyService.toggleSubDegreePublish(item.id, newStatus);
      if (tab === 'subjects') await taxonomyService.toggleSubjectPublish(item.id, newStatus);
      if (tab === 'books') await taxonomyService.toggleBookPublish(item.id, newStatus);
      toast.success(`${newStatus ? 'Published' : 'Drafted'}${cascadeLabel ? ' (cascade applied)' : ''}`);
      fetchData(page, limit);
    } catch { toast.error('Failed to update publish status'); }
  };

  // ─── Bulk delete ─────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const count = selectAllPages ? total : selectedIds.size;
    if (count === 0) return;
    const label = selectAllPages ? `ALL ${total}` : count;
    if (!window.confirm(`Permanently delete ${label} item(s)? This cannot be undone.`)) return;
    setBulkDeleteLoading(true);
    try {
      if (selectAllPages) {
        // Fetch all IDs without pagination then bulk-delete
        let allIds = [];
        if (tab === 'books') {
          const res = await taxonomyService.getBooks({ limit: 99999 });
          const rows = res?.data || res || [];
          allIds = rows.map(r => r.id);
        } else if (tab === 'mainDegrees') {
          const res = await taxonomyService.getMainDegrees({ limit: 99999 });
          const rows = res?.data || res || [];
          allIds = rows.map(r => r.id);
        } else if (tab === 'subDegrees') {
          const res = await taxonomyService.getSubDegrees(filterMainId || undefined, { limit: 99999 });
          const rows = res?.data || res || [];
          allIds = rows.map(r => r.id);
        } else if (tab === 'subjects') {
          const params = { limit: 99999 };
          if (filterMainId) params.mainDegreeId = filterMainId;
          if (filterSubId) params.subDegreeId = filterSubId;
          const res = await taxonomyService.getSubjects(params);
          const payload = res?.data || res;
          const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.subjects || []);
          allIds = rows.map(r => r.id);
        } else {
          allIds = Array.from(selectedIds);
        }
        if (tab === 'books') await taxonomyService.bulkDeleteBooks(allIds);
        else if (tab === 'mainDegrees') await taxonomyService.bulkDeleteMainDegrees(allIds);
        else if (tab === 'subDegrees') await taxonomyService.bulkDeleteSubDegrees(allIds);
        else if (tab === 'subjects') await taxonomyService.bulkDeleteSubjects(allIds);
        else await Promise.all(allIds.map(id => {
          if (tab === 'languages') return taxonomyService.deleteLanguage(id);
          if (tab === 'courses') return taxonomyService.deleteCourse(id);
          if (tab === 'semesters') return taxonomyService.deleteSemester(id);
          if (tab === 'years') return taxonomyService.deleteYear(id);
        }));
        toast.success(`Deleted all ${allIds.length} items`);
      } else {
        const ids = Array.from(selectedIds);
        if (tab === 'books') await taxonomyService.bulkDeleteBooks(ids);
        else if (tab === 'mainDegrees') await taxonomyService.bulkDeleteMainDegrees(ids);
        else if (tab === 'subDegrees') await taxonomyService.bulkDeleteSubDegrees(ids);
        else if (tab === 'subjects') await taxonomyService.bulkDeleteSubjects(ids);
        else await Promise.all(ids.map(id => {
          if (tab === 'languages') return taxonomyService.deleteLanguage(id);
          if (tab === 'courses') return taxonomyService.deleteCourse(id);
          if (tab === 'semesters') return taxonomyService.deleteSemester(id);
          if (tab === 'years') return taxonomyService.deleteYear(id);
        }));
        toast.success(`Deleted ${ids.length} items`);
      }
      setSelectAllPages(false);
      fetchData(1, limit);
    } catch { toast.error('Bulk delete failed'); }
    finally { setBulkDeleteLoading(false); }
  };

  // ─── Bulk publish/draft ──────────────────────────────────────────────────
  const handleBulkPublish = async (isPublished) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const cascadeLabel = CASCADE_LABEL[tab];
    const action = isPublished ? 'publish' : 'draft';
    if (cascadeLabel) {
      if (!window.confirm(`This will ${action} ${ids.length} item(s) and ${cascadeLabel}. Continue?`)) return;
    }
    setBulkLoading(true);
    try {
      if (tab === 'mainDegrees') await taxonomyService.bulkPublishMainDegrees(ids, isPublished);
      if (tab === 'subDegrees') await taxonomyService.bulkPublishSubDegrees(ids, isPublished);
      if (tab === 'subjects') await taxonomyService.bulkPublishSubjects(ids, isPublished);
      if (tab === 'books') await taxonomyService.bulkPublishBooks(ids, isPublished);
      toast.success(`${ids.length} items ${isPublished ? 'published' : 'drafted'}${cascadeLabel ? ' (cascade applied)' : ''}`);
      fetchData(page, limit);
    } catch { toast.error('Bulk action failed'); }
    finally { setBulkLoading(false); }
  };

  // ─── Selection helpers ───────────────────────────────────────────────────
  const toggleSelectOne = (id) => {
    setSelectAllPages(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
      setSelectAllPages(false);
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
      setSelectAllPages(false);
    }
  };

  const filtered = isPaginated
    ? data
    : data.filter(d => {
      const q = search.toLowerCase();
      return !q || (d.name || d.title || '').toLowerCase().includes(q);
    });

  const nameKey = (tab === 'books' ? 'title' : 'name');
  const tabLabel = TABS.find(t => t.id === tab)?.label || '';
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div><h1 className="page-title">Classifications</h1><p className="page-sub">Manage degree structure and books</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={() => fetchData(page, limit)}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add {tabLabel.replace(/s$/, '')}</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {tab === t.id && (
              <span className="badge badge-info" style={{ fontSize: 10, marginLeft: 4 }}>
                {isPaginated ? total : data.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="section-block">
        {/* Toolbar */}
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
          {/* Search */}
          <div className="search-wrap">
            <Search size={14} />
            <input
              className="search-input"
              placeholder={`Search ${tabLabel.toLowerCase()}...`}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Subjects: server-side filters */}
          {tab === 'subjects' && (
            <>
              <select className="filter-select" value={filterMainId} onChange={e => handleFilterMainChange(e.target.value)}>
                <option value="">All Degrees</option>
                {mainDegrees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="filter-select" value={filterSubId} onChange={e => { setFilterSubId(e.target.value); setPage(1); }} disabled={!filterMainId}>
                <option value="">All Sub-Degrees</option>
                {filterSubDegrees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}

          {/* Sub Degrees: filter by main degree */}
          {tab === 'subDegrees' && (
            <select className="filter-select" value={filterMainId} onChange={e => { setFilterMainId(e.target.value); setPage(1); }}>
              <option value="">All Main Degrees</option>
              {mainDegrees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}

          {/* Per-page selector */}
          {isPaginated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Show</span>
              <select className="filter-select" value={limit} style={{ width: 80 }}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>per page</span>
            </div>
          )}
        </div>

        {/* ─── Bulk Action Bar ─────────────────────────────────────────── */}
        {someSelected && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: selectAllPages || (allSelected && total > filtered.length) ? '8px 8px 0 0' : 8,
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <CheckSquare size={14} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--primary)' }} />
                {selectAllPages ? `All ${total}` : selectedIds.size} selected
              </span>
              {['mainDegrees', 'subDegrees', 'subjects', 'books'].includes(tab) && (
                <>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', border: 'none' }}
                    onClick={() => handleBulkPublish(true)}
                    disabled={bulkLoading || selectAllPages}
                  >
                    {bulkLoading ? <Loader2 size={12} className={styles.spin} /> : <Eye size={12} />}
                    &nbsp;Publish Selected
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none' }}
                    onClick={() => handleBulkPublish(false)}
                    disabled={bulkLoading || selectAllPages}
                  >
                    {bulkLoading ? <Loader2 size={12} className={styles.spin} /> : <EyeOff size={12} />}
                    &nbsp;Draft Selected
                  </button>
                </>
              )}
              <button
                className="btn btn-sm"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none' }}
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
              >
                {bulkDeleteLoading ? <Loader2 size={12} className={styles.spin} /> : <ShieldAlert size={12} />}
                &nbsp;{selectAllPages ? `Delete All ${total}` : 'Delete Selected'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { setSelectedIds(new Set()); setSelectAllPages(false); }}>
                <X size={12} /> Clear
              </button>
              {CASCADE_LABEL[tab] && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                  ⚡ Will cascade to {CASCADE_LABEL[tab]}
                </span>
              )}
            </div>
            {/* Select-all-pages banner */}
            {allSelected && total > filtered.length && !selectAllPages && (
              <div style={{
                padding: '7px 14px', background: 'rgba(99,102,241,0.08)',
                border: '1px solid var(--border)', borderTop: 'none',
                borderRadius: '0 0 8px 8px', fontSize: 12, color: 'var(--text-secondary)'
              }}>
                All {filtered.length} items on this page are selected.&nbsp;
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 12 }}
                  onClick={() => setSelectAllPages(true)}
                >
                  Select all {total} {tabLabel.toLowerCase()} instead
                </button>
              </div>
            )}
            {selectAllPages && (
              <div style={{
                padding: '7px 14px', background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.25)', borderTop: 'none',
                borderRadius: '0 0 8px 8px', fontSize: 12, color: '#dc2626', fontWeight: 600
              }}>
                All {total} {tabLabel.toLowerCase()} are selected.&nbsp;
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 12 }}
                  onClick={() => { setSelectAllPages(false); setSelectedIds(new Set()); }}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {/* Select All */}
                  <th style={{ width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </th>
                  <th>#</th>
                  <th>Name</th>
                  {tab === 'subDegrees' && <th>Main Degree</th>}
                  {tab === 'subjects' && <><th>Sub Degree</th><th>Main Degree</th></>}
                  {['mainDegrees', 'subDegrees', 'subjects', 'books'].includes(tab) && <th>Status</th>}
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} style={{ background: selectedIds.has(item.id) ? 'rgba(99,102,241,0.07)' : '' }}>
                    {/* Row checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                      {isPaginated ? (page - 1) * limit + i + 1 : i + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {tab === 'books' && item.image && (
                          <img src={item.image} alt="Book cover" style={{ width: 32, height: 42, objectFit: 'contain', background: '#f8f9fa', borderRadius: 3, border: '1px solid var(--border)' }} />
                        )}
                        <span>{item[nameKey] || item.name || item.title || '—'}</span>
                      </div>
                    </td>
                    {tab === 'subDegrees' && <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.MainDegree?.name || '—'}</td>}
                    {tab === 'subjects' && (
                      <>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.SubDegree?.name || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.MainDegree?.name || item.SubDegree?.MainDegree?.name || '—'}</td>
                      </>
                    )}
                    {/* Status badge + toggle */}
                    {['mainDegrees', 'subDegrees', 'subjects', 'books'].includes(tab) && (
                      <td>
                        <button
                          onClick={() => handleTogglePublish(item)}
                          title={item.isPublished ? 'Click to Draft' : 'Click to Publish'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                            background: item.isPublished
                              ? 'rgba(34,197,94,0.15)'
                              : 'rgba(245,158,11,0.15)',
                            color: item.isPublished ? '#22c55e' : '#f59e0b',
                          }}
                        >
                          {item.isPublished
                            ? <><Eye size={11} /> Published</>
                            : <><EyeOff size={11} /> Draft</>
                          }
                        </button>
                      </td>
                    )}
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="action-btn edit" onClick={() => openEdit(item)}><Pencil size={13} /></button>
                        <button className="action-btn del" onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8}><div className="empty-state"><h3>No {tabLabel} found</h3></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {isPaginated && totalPages > 1 && (
          <div className={styles.pagination}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(1)} disabled={page === 1}>««</button>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 12 }}>…</span>
                    : <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline'}`}
                      style={{ minWidth: 32 }} onClick={() => setPage(p)}>{p}</button>
                )
              }

              <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                <ChevronRight size={13} />
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»»</button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className={`modal fade-in ${tab === 'subjects' ? '' : 'modal-sm'}`} style={tab === 'subjects' ? { maxWidth: 650, width: '95%' } : {}}>
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Edit' : 'Add'} {tabLabel.replace(/s$/, '')}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              {tab !== 'subjects' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Name *</label>
                  <input className="form-input" placeholder="Enter name..."
                    value={form[nameKey] || form.name || ''}
                    onChange={e => setForm(f => ({ ...f, [nameKey]: e.target.value, name: e.target.value }))} />
                </div>
              )}

              {tab === 'books' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Book Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {(form.imagePreview) && (
                      <img src={form.imagePreview} alt="Preview" style={{ height: 80, width: 'auto', maxWidth: 150, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                    )}
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                      <Upload size={14} style={{ marginRight: 6 }} />
                      Upload Image
                      <input type="file" accept="image/*" hidden onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          setForm(f => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file) }));
                        }
                      }} />
                    </label>
                    {form.imageFile && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.imageFile.name}</span>}
                  </div>
                </div>
              )}

              {tab === 'subDegrees' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Main Degree *</label>
                  <select className="form-select" value={form.mainDegreeId || ''} onChange={e => setForm(f => ({ ...f, mainDegreeId: e.target.value }))}>
                    <option value="">Select Main Degree</option>
                    {mainDegrees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {tab === 'subjects' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Main Degree *</label>
                    <select className="form-select" value={form.mainDegreeId || ''}
                      onChange={e => { setForm(f => ({ ...f, mainDegreeId: e.target.value, subDegreeId: '' })); fetchSubDegrees(e.target.value); }}>
                      <option value="">Select Main Degree</option>
                      {mainDegrees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Sub Degree *</label>
                    <select className="form-select" value={form.subDegreeId || ''} onChange={e => setForm(f => ({ ...f, subDegreeId: e.target.value }))} disabled={!form.mainDegreeId}>
                      <option value="">Select Sub Degree</option>
                      {subDegrees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12, gridColumn: 'span 2' }}>
                    <label className="form-label">Name *</label>
                    <input className="form-input" placeholder="Enter name..."
                      value={form[nameKey] || form.name || ''}
                      onChange={e => setForm(f => ({ ...f, [nameKey]: e.target.value, name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Year *</label>
                    <select className="form-select" value={form.year || ''} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Semester *</label>
                    <select className="form-select" value={form.semester || ''} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                      <option value="">Select Semester</option>
                      {semesters.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12, gridColumn: 'span 2' }}>
                    <label className="form-label">Course *</label>
                    <select className="form-select" value={form.course || ''} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin} /> Saving...</> : (selected ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
