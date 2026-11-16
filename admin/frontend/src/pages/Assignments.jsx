import { useState, useEffect } from 'react';
import {
  Pencil, Trash2, ChevronRight, ChevronLeft, CheckCircle2, Layers, Settings2,
  FileText, Link as LinkIcon, Loader2, RefreshCw, Search, Upload, MonitorDown,
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import educationalService from '../services/educationalService';
import inventoryService from '../services/inventoryService';
import taxonomyService from '../services/taxonomyService';
import SearchableSelect from '../components/SearchableSelect';
import styles from './ComboBooks.module.css';

const STEPS = [
  { n:1, label:'Classification', icon:<Layers size={15}/> },
  { n:2, label:'Resource', icon:<FileText size={15}/> },
  { n:3, label:'Pricing', icon:<Settings2 size={15}/> },
];

const initForm = {
  bookId:'', mainDegreeId:'', subDegreeId:'', subjectId:'',
  resourceType:'file', resourceLink:'', language:'', price:'',
};

export default function Assignments() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initForm);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  const [books, setBooks] = useState([]);
  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchWizardData();
    fetchListings();
  }, []);

  useEffect(() => {
    if (form.mainDegreeId) {
      inventoryService.getSubDegrees(form.mainDegreeId).then(res => setSubDegrees(res.data || res || []));
    } else { setSubDegrees([]); }
  }, [form.mainDegreeId]);

  useEffect(() => {
    if (form.subDegreeId) {
      inventoryService.getSubjects(form.subDegreeId).then(res => {
        const payload = res?.data || res;
        const data = Array.isArray(payload) ? payload : (payload?.subjects || payload?.data || []);
        setSubjects(Array.isArray(data) ? data : []);
      });
    } else { setSubjects([]); }
  }, [form.subDegreeId]);

  const fetchWizardData = async () => {
    try {
      const [bRes, mRes, lRes] = await Promise.all([
        inventoryService.getBooks(),
        inventoryService.getMainDegrees(),
        taxonomyService.getLanguages(),
      ]);
      setBooks(bRes.data || bRes || []);
      setMainDegrees(mRes.data || mRes || []);
      setLanguages(lRes?.data || lRes || []);
    } catch { toast.error('Failed to load form data'); }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await educationalService.getSoftCopies();
      const data = res?.data?.success ? res.data.data : (res?.data || res);
      setListings(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load resources'); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.match(/\.(pdf|epub|mobi|zip|rar|doc|docx)$/i)) {
      toast.error('Invalid file type. Please upload PDF, ZIP, DOC or EPUB.');
      return;
    }
    setFile(f);
    setFileName(f.name);
  };

  const openEdit = (p) => {
    setEditId(p.id);
    setForm({
      bookId: p.bookId || '',
      mainDegreeId: p.mainDegreeId || '',
      subDegreeId: p.subDegreeId || '',
      subjectId: p.subjectId || '',
      resourceType: p.resourceType || 'file',
      resourceLink: p.resourceLink || '',
      language: p.language || '',
      price: p.price || '',
    });
    setFile(null);
    setFileName(p.fileName || '');
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(initForm);
    setFile(null);
    setFileName('');
    setStep(1);
  };

  const validate = () => {
    if (step === 1 && (!form.bookId || !form.mainDegreeId || !form.subDegreeId || !form.subjectId)) {
      toast.warning('Complete all classification fields'); return false;
    }
    if (step === 2) {
      if (form.resourceType === 'file' && !file && !fileName) { toast.warning('Upload a file'); return false; }
      if (form.resourceType === 'link' && !form.resourceLink) { toast.warning('Enter a resource link'); return false; }
    }
    if (step === 3 && !form.price) { toast.warning('Price is required'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const selectedBook = books.find(b => String(b.id) === String(form.bookId));
      const selectedMain = mainDegrees.find(m => String(m.id) === String(form.mainDegreeId));
      const selectedSub = subDegrees.find(s => String(s.id) === String(form.subDegreeId));
      const selectedSubject = subjects.find(s => String(s.id) === String(form.subjectId));
      const generatedTitle = `${selectedSubject?.name || 'Subject'}${selectedSubject?.year ? ` (${selectedSubject.year})` : ''} - ${selectedSub?.name || 'Degree'}`;

      const fd = new FormData();
      fd.append('title', generatedTitle);
      fd.append('price', form.price);
      fd.append('resourceType', form.resourceType);
      fd.append('language', form.language);
      fd.append('bookId', form.bookId);
      fd.append('mainDegreeId', form.mainDegreeId);
      fd.append('subDegreeId', form.subDegreeId);
      fd.append('subjectId', form.subjectId);
      fd.append('bookName', selectedBook?.name || selectedBook?.title || '');
      fd.append('mainDegree', selectedMain?.name || '');
      fd.append('subDegree', selectedSub?.name || '');
      fd.append('subject', selectedSubject?.name || '');

      if (form.resourceType === 'file') {
        if (file) fd.append('file', file);
      } else {
        fd.append('resourceLink', form.resourceLink);
      }

      if (editId) {
        await educationalService.updateSoftCopy(editId, fd);
        toast.success('Resource updated!');
      } else {
        await educationalService.createSoftCopy(fd);
        toast.success('Resource added!');
      }

      cancelEdit();
      fetchListings();
    } catch (err) {
      toast.error(err.response?.data?.message || (editId ? 'Failed to update resource' : 'Failed to add resource'));
    } finally { setSaving(false); }
  };

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try { await educationalService.deleteSoftCopy(id); toast.success('Deleted'); fetchListings(); }
    catch { toast.error('Delete failed'); }
  };

  const filteredListings = listings.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.title || p.fileName || '').toLowerCase().includes(q) ||
      (p.mainDegree || '').toLowerCase().includes(q) ||
      (p.subDegree || '').toLowerCase().includes(q) ||
      (p.subject || '').toLowerCase().includes(q);
  });

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000}/>

      <div className="page-header">
        <div><h1 className="page-title">Soft Copies</h1><p className="page-sub">Manage digital soft copy resources for students</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={() => { fetchWizardData(); fetchListings(); }}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Wizard */}
      <div className="section-block" style={{ marginBottom:20 }}>
        <div className="section-header">
          <span className="section-title">
            {editId ? 'Edit Resource' : 'Add Resource'}
          </span>
          {editId && <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel Edit</button>}
        </div>

        {/* Step indicators */}
        <div className={styles.steps}>
          {STEPS.map(s => (
            <div key={s.n} className={`${styles.stepItem} ${step === s.n ? styles.active : ''} ${step > s.n ? styles.done : ''}`}>
              <div className={styles.stepIcon}>{step > s.n ? <CheckCircle2 size={15}/> : s.icon}</div>
              <span className={styles.stepLabel}>{s.label}</span>
            </div>
          ))}
          <div className={styles.stepLine}/>
        </div>

        <div style={{ padding:'20px' }}>
          {/* Step 1 — Classification */}
          {step === 1 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Book / University Type *</label>
                <SearchableSelect
                  options={books}
                  value={form.bookId}
                  onChange={id => { set('bookId', id); setForm(f => ({ ...f, mainDegreeId:'', subDegreeId:'', subjectId:'' })); }}
                  placeholder="Select Book"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Main Degree *</label>
                <SearchableSelect
                  options={mainDegrees}
                  value={form.mainDegreeId}
                  onChange={id => { set('mainDegreeId', id); setForm(f => ({ ...f, subDegreeId:'', subjectId:'' })); }}
                  placeholder="Select Degree"
                  disabled={!form.bookId}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sub Degree *</label>
                <SearchableSelect
                  options={subDegrees}
                  value={form.subDegreeId}
                  onChange={id => { set('subDegreeId', id); setForm(f => ({ ...f, subjectId:'' })); }}
                  placeholder="Select Sub Degree"
                  disabled={!form.mainDegreeId}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <SearchableSelect
                  options={subjects}
                  value={form.subjectId}
                  onChange={id => set('subjectId', id)}
                  placeholder="Select Subject"
                  disabled={!form.subDegreeId}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Resource */}
          {step === 2 && (
            <div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Language</label>
                <select className="form-select" value={form.language} onChange={e => set('language', e.target.value)}>
                  <option value="">Select Language</option>
                  {languages.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Resource Type</label>
                <div style={{ display:'flex', gap:20 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13 }}>
                    <input type="radio" name="resourceType" value="file" checked={form.resourceType === 'file'} onChange={e => set('resourceType', e.target.value)} />
                    <FileText size={16}/> Upload PDF / Zip File
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13 }}>
                    <input type="radio" name="resourceType" value="link" checked={form.resourceType === 'link'} onChange={e => set('resourceType', e.target.value)} />
                    <LinkIcon size={16}/> Use External Link
                  </label>
                </div>
              </div>

              {form.resourceType === 'file' ? (
                <div className="form-group">
                  <label className={styles.uploadBox}>
                    <input type="file" accept=".pdf,.epub,.mobi,.zip,.rar,.doc,.docx" hidden onChange={handleFileChange}/>
                    {fileName ? (
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <MonitorDown size={20} color="var(--brand-secondary)"/>
                        <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{fileName}</span>
                      </div>
                    ) : (
                      <div className={styles.uploadPlaceholder}><Upload size={28}/><span>Click to upload file</span></div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Resource Link *</label>
                  <input className="form-input" type="url" value={form.resourceLink} onChange={e => set('resourceLink', e.target.value)} placeholder="https://drive.google.com/..."/>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Pricing */}
          {step === 3 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)}/>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Nav */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'0 20px 20px' }}>
          {step > 1 && <button className="btn btn-outline" onClick={() => setStep(s => s-1)}><ChevronLeft size={14}/> Back</button>}
          {step < 3
            ? <button className="btn btn-primary" onClick={() => { if (validate()) setStep(s => s+1); }}>Next <ChevronRight size={14}/></button>
            : <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> {editId ? 'Updating...' : 'Saving...'}</> : <><CheckCircle2 size={13}/> {editId ? 'Update Resource' : 'Save Resource'}</>}
              </button>
          }
        </div>
      </div>

      {/* Existing Resources List */}
      <div className="section-block">
        <div className="section-header">
          <span className="section-title">Resources ({filteredListings.length})</span>
          <div style={{ position:'relative', width:260 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input
              className="form-input"
              placeholder="Search resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:32, height:34, fontSize:13 }}
            />
          </div>
        </div>
        {loading ? (
          <div className="loading-overlay"><div className="spinner"/></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th style={{ width:50, textAlign:'center' }}>Type</th>
                <th>Title / File</th>
                <th>Classification</th>
                <th>Language</th>
                <th>Price</th>
                <th>Action</th>
              </tr></thead>
              <tbody>
                {filteredListings.map(p => {
                  const isLink = p.resourceType === 'link';
                  return (
                    <tr key={p.id}>
                      <td style={{ textAlign:'center' }}>
                        {isLink ? <LinkIcon size={20} color="var(--brand-secondary)"/> : <FileText size={20} color="var(--color-danger)"/>}
                      </td>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13, maxWidth:300, whiteSpace:'normal', lineHeight:1.3 }}>{p.title || p.fileName || 'Untitled Resource'}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                          {isLink ? (
                            <a href={p.resourceLink} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:4, color:'var(--brand-secondary)', textDecoration:'underline' }}><MonitorDown size={11}/> View Link</a>
                          ) : (
                            <a href={`/uploads/softcopies/${p.fileName}`} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:4, color:'var(--text-secondary)' }}><MonitorDown size={11}/> {p.fileName}</a>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{p.subject || '—'}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.bookName || '—'} / {p.mainDegree || '—'} / {p.subDegree || '—'}</div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{p.language || '—'}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight:700, fontSize:14 }}>₹{p.price || '0.00'}</div>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="action-btn edit" title="Edit" onClick={() => openEdit(p)}><Pencil size={13}/></button>
                          <button className="action-btn del" title="Delete" onClick={() => deleteListing(p.id)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredListings.length === 0 && (
                  <tr><td colSpan={6}><div className="empty-state">
                    <FileText size={36}/>
                    {search.trim()
                      ? <><h3>No matching resources</h3><p>Try a different search term</p></>
                      : <><h3>No digital resources yet</h3><p>Add your first resource above</p></>}
                  </div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
