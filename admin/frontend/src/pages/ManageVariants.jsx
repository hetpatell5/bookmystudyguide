import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import inventoryService from '../services/inventoryService';
import taxonomyService from '../services/taxonomyService';
import styles from '../components/ProductForm.module.css'; // Reuse form styles
import Select from 'react-select';

const reactSelectStyles = {
  control: (base) => ({ ...base, minHeight: '40px', background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--text-primary)' }),
  singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
  menu: (base) => ({ ...base, background: 'var(--bg-card)', zIndex: 999 }),
  option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--bg-subtle)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' })
};

export default function ManageVariants() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [products, setProducts] = useState([]);
  const [taxonomy, setTaxonomy] = useState({ books: [], mainDegrees: [], subDegrees: [], subjects: [], languages: [] });
  
  // Filters
  const [bookId, setBookId] = useState('');
  const [mainDegreeId, setMainDegreeId] = useState('');
  const [subDegreeId, setSubDegreeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  
  // Edit State
  const [productLinks, setProductLinks] = useState([]);
  
  useEffect(() => { fetchInitial(); }, []);
  
  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [prodRes, booksRes, degsRes, langRes] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getBooks(),
        inventoryService.getMainDegrees(),
        taxonomyService.getLanguages()
      ]);
      setProducts(prodRes.data || prodRes.products || prodRes || []);
      setTaxonomy(t => ({
        ...t,
        books: booksRes.data || booksRes || [],
        mainDegrees: degsRes.data || degsRes || [],
        languages: langRes?.data || langRes || []
      }));
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleMainDegreeChange = async (id) => {
    setMainDegreeId(id);
    setSubDegreeId('');
    setSubjectId('');
    if (id) {
      const res = await inventoryService.getSubDegrees(id);
      setTaxonomy(t => ({ ...t, subDegrees: res.data || res || [], subjects: [] }));
    } else {
      setTaxonomy(t => ({ ...t, subDegrees: [], subjects: [] }));
    }
  };

  const handleSubDegreeChange = async (id) => {
    setSubDegreeId(id);
    setSubjectId('');
    if (id) {
      const res = await inventoryService.getSubjects(id);
      setTaxonomy(t => ({ ...t, subjects: res.data || res || [] }));
    } else {
      setTaxonomy(t => ({ ...t, subjects: [] }));
    }
  };

  const selectedProduct = useMemo(() => {
    if (!bookId || !subjectId) return null;
    return products.find(p => String(p.bookId) === String(bookId) && String(p.subjectId) === String(subjectId)) || null;
  }, [bookId, subjectId, products]);

  // When selected product changes, pre-fill its links
  useEffect(() => {
    if (selectedProduct) {
      const links = Array.isArray(selectedProduct.productLinks) ? selectedProduct.productLinks : (Array.isArray(selectedProduct.ProductLinks) ? selectedProduct.ProductLinks : []);
      setProductLinks(links);
    } else {
      setProductLinks([]);
    }
  }, [selectedProduct]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    try {
      // Create a payload that only overrides the productLinks for the selected product
      const payload = {
        ...selectedProduct,
        productLinks: productLinks
      };
      await inventoryService.updateProduct(selectedProduct.id, payload);
      toast.success('Variants fully updated');
      
      // Update local product cache without full refetch for completely snappy UI
      setProducts(ps => ps.map(p => p.id === selectedProduct.id ? { ...p, productLinks: [...productLinks] } : p));
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update variants');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner spinner-lg"/></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      <ToastContainer position="top-right" autoClose={3000}/>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Manage Product Variants</h1>
          <p className="page-sub">Fast-track UI to natively map links, languages, and formats.</p>
        </div>
      </div>

      <div className="section-block" style={{ padding: 20, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', overflow: 'visible' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Filter Options</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Select Book</label>
            <Select 
              options={taxonomy.books.map(b => ({ value: b.id, label: b.name || b.title }))}
              value={bookId ? { value: bookId, label: taxonomy.books.find(b => String(b.id) === String(bookId))?.name || taxonomy.books.find(b => String(b.id) === String(bookId))?.title } : null}
              onChange={selected => setBookId(selected ? selected.value : '')}
              isClearable
              placeholder="-- Choose Book --"
              styles={reactSelectStyles}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Select Degree</label>
            <Select 
              options={taxonomy.mainDegrees.map(m => ({ value: m.id, label: m.name }))}
              value={mainDegreeId ? { value: mainDegreeId, label: taxonomy.mainDegrees.find(m => String(m.id) === String(mainDegreeId))?.name } : null}
              onChange={selected => handleMainDegreeChange(selected ? selected.value : '')}
              isClearable
              placeholder="-- Choose Degree --"
              styles={reactSelectStyles}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Select Sub Degree</label>
            <Select 
              isDisabled={!mainDegreeId}
              options={taxonomy.subDegrees.map(s => ({ value: s.id, label: `${s.name} ${s.year ? `(${s.year})` : ''}` }))}
              value={subDegreeId ? { value: subDegreeId, label: (() => { const s = taxonomy.subDegrees.find(x => String(x.id) === String(subDegreeId)); return s ? `${s.name} ${s.year ? `(${s.year})` : ''}` : ''; })() } : null}
              onChange={selected => handleSubDegreeChange(selected ? selected.value : '')}
              isClearable
              placeholder="-- Choose Sub Degree --"
              styles={reactSelectStyles}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Select Subject</label>
            <Select 
              isDisabled={!subDegreeId}
              options={taxonomy.subjects.map(s => ({ value: s.id, label: s.name }))}
              value={subjectId ? { value: subjectId, label: taxonomy.subjects.find(s => String(s.id) === String(subjectId))?.name } : null}
              onChange={selected => setSubjectId(selected ? selected.value : '')}
              isClearable
              placeholder="-- Choose Subject --"
              styles={reactSelectStyles}
            />
          </div>
        </div>
      </div>

      {bookId && subjectId && !selectedProduct && (
        <div className="empty-state" style={{ padding: 40, border: '1px dashed var(--border-default)', borderRadius: 'var(--r-md)', background: 'var(--bg-subtle)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>This exact Book and Subject combination does not exist in the Products database. Create the Product first.</p>
        </div>
      )}

      {selectedProduct && (
        <form onSubmit={handleSave} className="section-block" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--r-md)' }}>
          <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-default)', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Editing Variants for:</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {selectedProduct.title} <code style={{ fontSize:11, marginLeft:8, background:'var(--bg-subtle)', padding:'2px 6px', borderRadius:4 }}>{selectedProduct.sku}</code>
            </p>
          </div>

          <div className={styles.section} style={{ padding: 0 }}>
            <div className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Variant Links</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setProductLinks([...productLinks, { language: '', type: 'Soft Copy', price: '', link: '' }])}>
                <Plus size={14}/> Add Variant
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {productLinks.map((link, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 1fr 1fr 2fr auto', gap: 12, alignItems: 'end', background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-default)' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Language</label>
                    <select className="form-select" value={link.language} onChange={e => {
                      const newLinks = [...productLinks];
                      newLinks[i].language = e.target.value;
                      setProductLinks(newLinks);
                    }}>
                      <option value="">Select...</option>
                      {taxonomy.languages.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Type</label>
                    <select className="form-select" value={link.type} onChange={e => {
                      const newLinks = [...productLinks];
                      newLinks[i].type = e.target.value;
                      setProductLinks(newLinks);
                    }}>
                      <option value="Soft Copy">Soft Copy</option>
                      <option value="Hard Copy">Hard Copy</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Price (₹)</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00" value={link.price} onChange={e => {
                      const newLinks = [...productLinks];
                      newLinks[i].price = e.target.value;
                      setProductLinks(newLinks);
                    }}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>URL Link (Optional)</label>
                    <input className="form-input" placeholder="https://..." value={link.link} onChange={e => {
                      const newLinks = [...productLinks];
                      newLinks[i].link = e.target.value;
                      setProductLinks(newLinks);
                    }}/>
                  </div>
                  <button type="button" className="btn btn-outline" style={{ border: 'none', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '0 10px', height: 38 }} onClick={() => {
                    const newLinks = [...productLinks];
                    newLinks.splice(i, 1);
                    setProductLinks(newLinks);
                  }}>
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              {productLinks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', border: '1px dashed var(--border-default)', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 13 }}>No product variants added. Use the button above to add different copy variations.</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : <><Save size={13}/> Force Replace Variants</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
