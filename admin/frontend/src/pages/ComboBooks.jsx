import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, CheckCircle2, Package, Layers, Settings2, FileText, Image as ImageIcon, Loader2, RefreshCw, Eye, EyeOff, Search } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import inventoryService from '../services/inventoryService';
import taxonomyService from '../services/taxonomyService';
import SearchableSelect from '../components/SearchableSelect';
import styles from './ComboBooks.module.css';

const IMAGE_BASE_URL = 'https://pub-722abff1b9994a85813a69355c83d3c3.r2.dev';

const STEPS = [
  { n:1, label:'Classification', icon:<Layers size={15}/> },
  { n:2, label:'Details', icon:<FileText size={15}/> },
  { n:3, label:'Pricing', icon:<Settings2 size={15}/> },
  { n:4, label:'Bundle Items', icon:<Package size={15}/> },
  { n:5, label:'Media', icon:<ImageIcon size={15}/> },
];

const initForm = { bookId:'', mainDegreeId:'', subDegreeId:'', title:'', description:'', price:'', cancelPrice:'', language:'', isActive:true };

export default function ComboBooks() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initForm);
  const [items, setItems] = useState([{ productId:'', quantity:1 }]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const [books, setBooks] = useState([]);
  const [mainDegrees, setMainDegrees] = useState([]);
  const [subDegrees, setSubDegrees] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Load the wizard's own reference data (books, degrees, products,
    // languages) and the existing-bundles list independently, so a slow
    // combos fetch never blocks the "Create New Bundle" form from being usable.
    fetchWizardData();
    fetchCombos();
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
      const [bRes, mRes, pRes, lRes] = await Promise.all([
        inventoryService.getBooks(),
        inventoryService.getMainDegrees(),
        inventoryService.getProducts(),
        taxonomyService.getLanguages(),
      ]);
      setBooks(bRes.data || bRes || []);
      setMainDegrees(mRes.data || mRes || []);
      setProducts(pRes.data || pRes.products || pRes || []);
      setLanguages(lRes?.data || lRes || []);
    } catch { toast.error('Failed to load form data'); }
  };

  const fetchCombos = async () => {
    setLoading(true);
    try {
      const cRes = await inventoryService.getComboProducts();
      setCombos(cRes.data || cRes || []);
    } catch { toast.error('Failed to load existing bundles'); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getProductImage = (p) => {
    if (!p) return '';
    const imgs = Array.isArray(p.images) ? p.images : (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })();
    const idx = Number(p.coverImageIndex || 0);
    const raw = imgs[idx] || imgs[0] || p.image || '';
    return raw ? (raw.startsWith('http') ? raw : `${IMAGE_BASE_URL}/${raw}`) : '';
  };

  const matchesClassification = (p) =>
    (!form.bookId || String(p.bookId) === String(form.bookId)) &&
    (!form.mainDegreeId || String(p.mainDegreeId) === String(form.mainDegreeId)) &&
    (!form.subDegreeId || String(p.subDegreeId) === String(form.subDegreeId));

  const classifiedProducts = products.filter(matchesClassification);
  const selectedProductIds = new Set(items.map(it => String(it.productId)).filter(Boolean));
  // SearchableSelect needs already-picked products visible even if they fall
  // outside the current classification filter (e.g. edited after the fact).
  const pickerProducts = products.filter(p => selectedProductIds.has(String(p.id)) || matchesClassification(p));

  const addAllClassifiedProducts = () => {
    const toAdd = classifiedProducts
      .filter(p => !selectedProductIds.has(String(p.id)))
      .map(p => ({ productId: String(p.id), quantity: 1 }));
    if (toAdd.length === 0) { toast.info('All matching products are already added'); return; }
    const withoutEmpty = items.filter(it => it.productId);
    setItems([...withoutEmpty, ...toAdd]);
  };

  const selectedBookImages = items
    .filter(it => it.productId)
    .map(it => products.find(p => String(p.id) === String(it.productId)))
    .map(getProductImage)
    .filter(Boolean);

  const handleSubjectChange = (e) => {
    const selected = Array.from(e.target.options).filter(o => o.selected).map(o => o.value);
    set('subjectIds', selected);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      bookId: c.bookId || '',
      mainDegreeId: c.mainDegreeId || '',
      subDegreeId: c.subDegreeId || '',
      title: c.title || '',
      description: c.description || '',
      price: c.price || '',
      cancelPrice: c.cancelPrice || '',
      language: c.language || '',
      isActive: c.isActive !== undefined ? c.isActive : true
    });
    setItems(c.items?.length > 0 ? c.items.map(i => ({ productId: i.productId, quantity: i.quantity })) : [{ productId:'', quantity:1 }]);
    setCoverFile(null);
    setCoverPreview(c.image ? (c.image.startsWith('http') ? c.image : `${IMAGE_BASE_URL}/${c.image}`) : '');
    setGalleryFiles([]);
    setGalleryPreviews(c.gallery ? c.gallery.map(g => (g.startsWith('http') ? g : `${IMAGE_BASE_URL}/${g}`)) : []);
    
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(initForm);
    setItems([{ productId:'', quantity:1 }]);
    setCoverFile(null); setCoverPreview('');
    setGalleryFiles([]); setGalleryPreviews([]);
    setStep(1);
  };

  const validate = () => {
    if (step === 1 && (!form.bookId || !form.mainDegreeId || !form.subDegreeId)) { toast.warning('Complete all classification fields'); return false; }
    if (step === 2 && (!form.title?.trim() || !form.description?.trim())) { toast.warning('Title and description required'); return false; }
    if (step === 3 && !form.price) { toast.warning('Price is required'); return false; }
    if (step === 4 && !items.some(it => it.productId)) { toast.warning('Add at least one product to the bundle'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(k => fd.append(k, form[k]));
      const cleanItems = items.filter(it => it.productId).map(it => ({ productId: it.productId, quantity: Number(it.quantity) || 1 }));
      fd.append('items', JSON.stringify(cleanItems));
      fd.append('isHardCopy', true);
      if (coverFile) fd.append('image', coverFile);
      galleryFiles.forEach(f => fd.append('gallery', f));
      
      if (editId) {
        await inventoryService.updateComboProduct(editId, fd);
        toast.success('Combo bundle updated!');
      } else {
        await inventoryService.createComboProduct(fd);
        toast.success('Combo bundle created!');
      }
      
      cancelEdit();
      fetchCombos();
    } catch { toast.error(editId ? 'Failed to update combo bundle' : 'Failed to create combo bundle'); }
    finally { setSaving(false); }
  };

  const deleteCombo = async (id) => {
    if (!window.confirm('Delete this combo bundle?')) return;
    try { await inventoryService.deleteComboProduct(id); toast.success('Deleted'); fetchCombos(); }
    catch { toast.error('Delete failed'); }
  };

  const handleTogglePublish = async (combo) => {
    const newStatus = !combo.isActive;
    try {
      await inventoryService.toggleComboPublish(combo.id, newStatus);
      toast.success(newStatus ? 'Published' : 'Drafted');
      fetchCombos();
    } catch { toast.error('Failed to update status'); }
  };

  const handleBulkPublish = async (isPublished) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.warning('Select at least one combo'); return; }
    try {
      await inventoryService.bulkPublishCombos(ids, isPublished);
      toast.success(`${ids.length} combo(s) ${isPublished ? 'published' : 'drafted'}`);
      setSelectedIds(new Set());
      fetchCombos();
    } catch { toast.error('Bulk update failed'); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCombos.length) { setSelectedIds(new Set()); }
    else { setSelectedIds(new Set(filteredCombos.map(c => c.id))); }
  };

  const filteredCombos = combos.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) ||
      (c.mainDegree?.name || '').toLowerCase().includes(q) ||
      (c.subDegree?.name || '').toLowerCase().includes(q);
  });

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000}/>

      <div className="page-header">
        <div><h1 className="page-title">Combo Products</h1><p className="page-sub">Create and manage study bundles for students</p></div>
        <div className="page-actions">
          {selectedIds.size > 0 && <>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkPublish(true)}><Eye size={13}/> Publish Selected ({selectedIds.size})</button>
            <button className="btn btn-outline btn-sm" onClick={() => handleBulkPublish(false)}><EyeOff size={13}/> Draft Selected ({selectedIds.size})</button>
          </>}
          <button className="btn btn-outline btn-sm" onClick={() => { fetchWizardData(); fetchCombos(); }}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Wizard */}
      <div className="section-block" style={{ marginBottom:20 }}>
        <div className="section-header">
          <span className="section-title">
            {editId ? 'Edit Bundle' : 'Create New Bundle'}
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
                  onChange={id => set('bookId', id)}
                  placeholder="Select Book"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Main Degree *</label>
                <SearchableSelect
                  options={mainDegrees}
                  value={form.mainDegreeId}
                  onChange={id => set('mainDegreeId', id)}
                  placeholder="Select Degree"
                  disabled={!form.bookId}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sub Degree *</label>
                <SearchableSelect
                  options={subDegrees}
                  value={form.subDegreeId}
                  onChange={id => set('subDegreeId', id)}
                  placeholder="Select Sub Degree"
                  disabled={!form.mainDegreeId}
                />
              </div>
              <div className="form-group" style={{ display: 'none' }}>
              </div>
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Bundle Title *</label>
                <input className="form-input" placeholder="e.g. SEM 1 Complete Kit — English" value={form.title} onChange={e => set('title', e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Language(s) <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(select all that apply)</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {languages.map(l => {
                    const selected = form.language.split(',').map(s => s.trim()).filter(Boolean);
                    const isActive = selected.includes(l.name);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => {
                          const next = isActive
                            ? selected.filter(s => s !== l.name)
                            : [...selected, l.name];
                          set('language', next.join(', '));
                        }}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description (HTML) * <span style={{ fontWeight:400, color:'var(--text-muted)' }}>— paste or write raw HTML, it's rendered as-is on the site</span></label>
                <textarea
                  className="form-input"
                  rows={16}
                  style={{ fontFamily:'monospace', fontSize:12, resize:'vertical', lineHeight:1.5 }}
                  placeholder="<h2>Title</h2>&#10;<p>Describe what's included...</p>"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
                {form.description?.trim() && (
                  <div style={{ marginTop:10 }}>
                    <label className="form-label" style={{ fontSize:11 }}>Preview</label>
                    <div
                      className={styles.descriptionPreview}
                      dangerouslySetInnerHTML={{ __html: form.description }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Pricing */}
          {step === 3 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input className="form-input" type="number" value={form.price} onChange={e => set('price', e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Cancel Price / MRP (₹)</label>
                <input className="form-input" type="number" value={form.cancelPrice} onChange={e => set('cancelPrice', e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.isActive} onChange={e => set('isActive', e.target.value === 'true')}>
                  <option value="true">Active — Visible</option>
                  <option value="false">Inactive — Draft</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 4 — Bundle Items */}
          {step === 4 && (
            <div>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
                Showing products matching your selected classification
                {form.bookId || form.mainDegreeId || form.subDegreeId ? '' : ' (choose a classification in Step 1 to narrow this list)'}.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, alignItems:'center' }}>
                    <SearchableSelect
                      options={pickerProducts}
                      value={item.productId}
                      onChange={id => { const n=[...items]; n[i].productId=id; setItems(n); }}
                      placeholder="Select product..."
                    />
                    <input className="form-input" type="number" min="1" value={item.quantity} style={{ width:70 }}
                      onChange={e => { const n=[...items]; n[i].quantity=e.target.value; setItems(n); }}/>
                    <button className="action-btn del" onClick={() => setItems(items.filter((_,idx)=>idx!==i))}><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, { productId:'', quantity:1 }])}>
                  <Plus size={13}/> Add Item
                </button>
                <button className="btn btn-primary btn-sm" onClick={addAllClassifiedProducts} disabled={classifiedProducts.length === 0}>
                  <Package size={13}/> Add All ({classifiedProducts.length})
                </button>
              </div>
            </div>
          )}

          {/* Step 5 — Media */}
          {step === 5 && (
            <div>
              {selectedBookImages.length > 0 && (
                <div className="form-group" style={{ marginBottom:16 }}>
                  <label className="form-label">Bundle Preview <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(auto-shown on site from selected books — no upload needed)</span></label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {selectedBookImages.map((src, i) => (
                      <img key={i} src={src} alt="" style={{ width:70, height:93, objectFit:'cover', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)' }}/>
                    ))}
                  </div>
                </div>
              )}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Cover Image <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(optional — overrides the auto preview above, 3:4 recommended)</span></label>
                <label className={styles.uploadBox}>
                  <input type="file" accept="image/*" hidden onChange={e => { const f=e.target.files[0]; if(f){setCoverFile(f);setCoverPreview(URL.createObjectURL(f));} }}/>
                  {coverPreview ? (
                    <div style={{ position:'relative' }}>
                      <img src={coverPreview} alt="" style={{ maxHeight:160, borderRadius:'var(--r-md)', objectFit:'cover' }}/>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}><ImageIcon size={32} /><span>Click to upload a custom cover (optional)</span></div>
                  )}
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Gallery Images (optional)</label>
                <input type="file" multiple accept="image/*" className="form-input" onChange={e => {
                  const files = Array.from(e.target.files);
                  setGalleryFiles(p => [...p, ...files]);
                  setGalleryPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
                }}/>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                  {galleryPreviews.map((src,i) => (
                    <img key={i} src={src} alt="" style={{ width:64, height:64, objectFit:'cover', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)' }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Nav */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'0 20px 20px' }}>
          {step > 1 && <button className="btn btn-outline" onClick={() => setStep(s => s-1)}><ChevronLeft size={14}/> Back</button>}
          {step < 5
            ? <button className="btn btn-primary" onClick={() => { if (validate()) setStep(s => s+1); }}>Next <ChevronRight size={14}/></button>
            : <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> {editId ? 'Updating...' : 'Creating...'}</> : <><CheckCircle2 size={13}/> {editId ? 'Update Bundle' : 'Create Bundle'}</>}
              </button>
          }
        </div>
      </div>

      {/* Existing Combos List */}
      <div className="section-block">
        <div className="section-header">
          <span className="section-title">Existing Bundles ({filteredCombos.length})</span>
          <div style={{ position:'relative', width:260 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input
              className="form-input"
              placeholder="Search bundles..."
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
                <th><input type="checkbox" checked={filteredCombos.length > 0 && selectedIds.size === filteredCombos.length} onChange={toggleSelectAll}/></th>
                <th>Image</th><th>Title</th><th>Price</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>
                {filteredCombos.map(c => (
                  <tr key={c.id}>
                    <td><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}/></td>
                    <td>
                      <img src={c.image ? (c.image.startsWith('http') ? c.image : `${IMAGE_BASE_URL}/${c.image}`) : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23f1f5f9"/></svg>'}
                        alt="" style={{ width:44, height:44, objectFit:'cover', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)' }}/>
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{c.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.mainDegree?.name} {c.subDegree?.name ? `— ${c.subDegree.name}` : ''}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight:700 }}>₹{c.price}</div>
                      {c.cancelPrice && <div style={{ fontSize:11, color:'var(--text-muted)', textDecoration:'line-through' }}>₹{c.cancelPrice}</div>}
                    </td>
                    <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-neutral'}`}>{c.isActive ? 'Published' : 'Draft'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="action-btn" title={c.isActive ? 'Draft' : 'Publish'} onClick={() => handleTogglePublish(c)}>
                          {c.isActive ? <EyeOff size={13}/> : <Eye size={13}/>}
                        </button>
                        <button className="action-btn edit" onClick={() => openEdit(c)}><Pencil size={13}/></button>
                        <button className="action-btn del" onClick={() => deleteCombo(c.id)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCombos.length === 0 && (
                  <tr><td colSpan={7}><div className="empty-state"><Package size={36}/>
                    {search.trim()
                      ? <><h3>No matching bundles</h3><p>Try a different search term</p></>
                      : <><h3>No bundles yet</h3><p>Create your first combo bundle above</p></>}
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
