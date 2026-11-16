import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Loader2, Save, Link2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import inventoryService from '../services/inventoryService';
import taxonomyService from '../services/taxonomyService';
import { toast } from 'react-toastify';
import styles from './ProductForm.module.css';
import SearchableSelect from './SearchableSelect';

const emptyForm = {
  title: '', sku: '', bookId: '', mainDegreeId: '', subDegreeId: '', subjectId: '',
  price: '', mrp: '', weight: '0', description: '', images: [], productLinks: []
};

export default function ProductForm({ isOpen, onClose, product, onSave, focusMode = 'all' }) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [taxonomy, setTaxonomy] = useState({ books: [], mainDegrees: [], subDegrees: [], subjects: [], languages: [] });

  useEffect(() => {
    if (!isOpen) return;
    loadTaxonomy();
    if (product) {
      setForm({
        ...product,
        price: product.price || '',
        mrp: product.mrp || '',
        productLinks: Array.isArray(product.productLinks) ? product.productLinks : (Array.isArray(product.ProductLinks) ? product.ProductLinks : []),
        images: Array.isArray(product.images) ? product.images : (() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } })()
      });
      if (product.mainDegreeId) loadSubDegrees(product.mainDegreeId);
      if (product.subDegreeId) loadSubjects(product.subDegreeId);
    } else {
      setForm(emptyForm);
      setTaxonomy(t => ({ ...t, subDegrees: [], subjects: [] }));
    }
  }, [isOpen, product]);

  const loadTaxonomy = async () => {
    try {
      const [books, mainDegrees, languages] = await Promise.all([
        inventoryService.getBooks(), inventoryService.getMainDegrees(), taxonomyService.getLanguages()
      ]);
      setTaxonomy(t => ({ ...t, books: books.data || books || [], mainDegrees: mainDegrees.data || mainDegrees || [], languages: languages?.data || languages || [] }));
    } catch { /* silent */ }
  };

  const loadSubDegrees = async (id) => {
    if (!id) return setTaxonomy(t => ({ ...t, subDegrees: [], subjects: [] }));
    try {
      const res = await inventoryService.getSubDegrees(id);
      setTaxonomy(t => ({ ...t, subDegrees: res.data || res || [] }));
    } catch { /* silent */ }
  };

  const loadSubjects = async (id) => {
    if (!id) return setTaxonomy(t => ({ ...t, subjects: [] }));
    try {
      const res = await inventoryService.getSubjects(id);
      setTaxonomy(t => ({ ...t, subjects: res.data || res || [] }));
    } catch { /* silent */ }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleMainDegreeChange = (e) => {
    const id = e.target.value;
    setForm(f => ({ ...f, mainDegreeId: id, subDegreeId: '', subjectId: '' }));
    loadSubDegrees(id);
  };

  const handleSubDegreeChange = (e) => {
    const id = e.target.value;
    setForm(f => ({ ...f, subDegreeId: id, subjectId: '' }));
    loadSubjects(id);
  };

  const handleImageUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setForm(f => ({ ...f, images: [...f.images, reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.mrp) { toast.error('Title, Price, and MRP are required'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await inventoryService.updateProduct(product.id, form);
        toast.success('Product updated');
      } else {
        await inventoryService.createProduct(form);
        toast.success('Product created');
      }
      onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal modal-xl fade-in ${styles.formModal}`}>
        <div className="modal-header">
          <h2 className="modal-title">{focusMode === 'variants' ? 'Edit Variants (Links/Copies)' : (isEdit ? 'Edit Product' : 'Add New Product')}</h2>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`modal-body ${styles.scrollBody}`}>

            {focusMode !== 'variants' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Classification</div>
                <div className="grid-2">
                  {/* Book Type — searchable */}
                  <div className="form-group">
                    <label className="form-label">Book Type</label>
                    <SearchableSelect
                      options={taxonomy.books.map(b => ({ id: b.id, name: b.name || b.title }))}
                      value={form.bookId}
                      onChange={id => set('bookId', id)}
                      placeholder="Select Book"
                    />
                  </div>

                  {/* Main Degree — searchable */}
                  <div className="form-group">
                    <label className="form-label">Main Degree</label>
                    <SearchableSelect
                      options={taxonomy.mainDegrees.map(m => ({ id: m.id, name: m.name }))}
                      value={form.mainDegreeId}
                      onChange={id => handleMainDegreeChange({ target: { value: id } })}
                      placeholder="Select Degree"
                    />
                  </div>

                  {/* Sub Degree — searchable, depends on Main Degree */}
                  <div className="form-group">
                    <label className="form-label">Sub Degree</label>
                    <SearchableSelect
                      options={taxonomy.subDegrees.map(s => ({ id: s.id, name: s.name + (s.year ? ` (${s.year})` : '') }))}
                      value={form.subDegreeId}
                      onChange={id => handleSubDegreeChange({ target: { value: id } })}
                      placeholder="Select Sub-Degree"
                      disabled={!form.mainDegreeId}
                    />
                  </div>

                  {/* Subject — searchable, depends on Sub Degree */}
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <SearchableSelect
                      options={taxonomy.subjects.map(s => ({ id: s.id, name: s.name }))}
                      value={form.subjectId}
                      onChange={id => set('subjectId', id)}
                      placeholder="Select Subject"
                      disabled={!form.subDegreeId}
                    />
                  </div>
                </div>
              </div>
            )}

            {focusMode !== 'variants' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Basic Information</div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" placeholder="e.g. B.A. Political Science Guide" value={form.title} onChange={e => set('title', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU (Product Code)</label>
                    <input className="form-input" placeholder="e.g. BA-POL-001" value={form.sku} onChange={e => set('sku', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {focusMode !== 'variants' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Pricing & Inventory</div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">MRP (₹) *</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.mrp} onChange={e => set('mrp', e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Weight (grams)</label>
                    <input className="form-input" type="number" placeholder="0" value={form.weight} onChange={e => set('weight', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Product Variants (Links) */}
            <div className={styles.section}>
              <div className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Product Variants (Copies / Links)</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => set('productLinks', [...form.productLinks, { language: '', type: 'Soft Copy', price: '', link: '' }])}>
                  <Plus size={14} /> Add Variant
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {form.productLinks.map((link, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 1fr 1fr 2fr auto', gap: 12, alignItems: 'end', background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-default)' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Language</label>
                      <select className="form-select" value={link.language} onChange={e => {
                        const newLinks = [...form.productLinks];
                        newLinks[i].language = e.target.value;
                        set('productLinks', newLinks);
                      }}>
                        <option value="">Select...</option>
                        {taxonomy.languages.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Type</label>
                      <select className="form-select" value={link.type} onChange={e => {
                        const newLinks = [...form.productLinks];
                        newLinks[i].type = e.target.value;
                        set('productLinks', newLinks);
                      }}>
                        <option value="Soft Copy">Soft Copy</option>
                        <option value="Hard Copy">Hard Copy</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>Price (₹)</label>
                      <input className="form-input" type="number" step="0.01" placeholder="0.00" value={link.price} onChange={e => {
                        const newLinks = [...form.productLinks];
                        newLinks[i].price = e.target.value;
                        set('productLinks', newLinks);
                      }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>URL Link (Optional)</label>
                      <input className="form-input" placeholder="https://..." value={link.link} onChange={e => {
                        const newLinks = [...form.productLinks];
                        newLinks[i].link = e.target.value;
                        set('productLinks', newLinks);
                      }} />
                    </div>
                    <button type="button" className="btn btn-outline" style={{ border: 'none', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '0 10px', height: 38 }} onClick={() => {
                      const newLinks = [...form.productLinks];
                      newLinks.splice(i, 1);
                      set('productLinks', newLinks);
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {form.productLinks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', border: '1px dashed var(--border-default)', borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: 13 }}>No product variants added. Use the button above to add different copy variations.</p>
                  </div>
                )}
              </div>
            </div>

            {focusMode !== 'variants' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Product Description</span>
                  <button type="button" className="btn btn-sm btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => {
                    let text = form.description || '';
                    text = text.replace(/-<\/p>\s*<p[^>]*>/gi, "-");
                    text = text.replace(/([a-zA-Z])<\/p>\s*<p[^>]*>([a-z])/g, "$1$2");
                    // Remove invisible breaking characters and non-breaking spaces
                    text = text.replace(/&nbsp;/gi, " ");
                    text = text.replace(/\u00A0/g, " ");
                    text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
                    text = text.replace(/\u00AD/g, "");
                    text = text.replace(/&shy;/gi, "");
                    text = text.replace(/&#8203;/gi, "");
                    const parts = text.split(/(<[^>]+>)/g);
                    for (let i = 0; i < parts.length; i++) {
                      if (!parts[i].startsWith('<')) {
                        parts[i] = parts[i].replace(/([a-zA-Z0-9])-\s+([a-zA-Z0-9])/g, "$1-$2");
                      }
                    }
                    set('description', parts.join(''));
                    toast.success('Cleaned PDF paste artifacts!');
                  }}>
                    Clean PDF Paste
                  </button>
                </div>
                <div className={styles.quillWrap}>
                  <ReactQuill theme="snow" value={form.description} onChange={val => set('description', val)} placeholder="Describe the product..." />
                </div>
              </div>
            )}

            {focusMode !== 'variants' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Images</div>
                <div className={styles.imageGrid}>
                  {form.images.map((img, i) => (
                    <div key={i} className={styles.imgThumb}>
                      <img src={img} alt="" />
                      <button type="button" className={styles.imgRemove} onClick={() => removeImage(i)}><X size={12} /></button>
                    </div>
                  ))}
                  <label className={styles.imgUpload}>
                    <Upload size={18} />
                    <span>Upload</span>
                    <input type="file" multiple accept="image/*" hidden onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            )}



          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><Loader2 size={13} className={styles.spin} /> Saving...</> : <><Save size={13} /> {isEdit ? (focusMode === 'variants' ? 'Update Variants' : 'Update Product') : 'Create Product'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
