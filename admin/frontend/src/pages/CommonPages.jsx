import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  UploadCloud, 
  Trash2, 
  Edit2, 
  X, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle,
  RefreshCcw
} from 'lucide-react';
import { toast } from 'react-toastify';
import inventoryService from '../services/inventoryService';
import api from '../services/api';
import styles from './CommonPages.module.css';

const CommonPages = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [editPages, setEditPages] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getBooks();
      const data = res.data || res || [];
      
      const normalized = Array.isArray(data) ? data.map(b => {
        let pages = b.commonPages || [];
        if (typeof pages === 'string') {
          try { pages = JSON.parse(pages); } catch (e) { pages = []; }
        }
        return { ...b, commonPages: Array.isArray(pages) ? pages : [] };
      }) : [];
      
      setBooks(normalized);
    } catch (error) {
      toast.error("Failed to load book directory");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (book) => {
    setSelectedBook(book);
    setEditPages(book.commonPages.map(url => ({ type: 'existing', url, preview: url })));
    setShowModal(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPages(prev => [...prev, { type: 'new', file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const movePage = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= editPages.length) return;
    const updated = [...editPages];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
    setEditPages(updated);
  };

  const removePage = (idx) => {
    setEditPages(editPages.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!selectedBook) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name", selectedBook.name);
      
      const sequence = editPages.map(p => p.type === 'existing' ? p.url : "___NEW_FILE___");
      formData.append("retainedPages", JSON.stringify(sequence));

      const newFiles = editPages.filter(p => p.type === 'new');
      newFiles.forEach(p => formData.append("commonPages", p.file));

      await api.put(`/api/books/${selectedBook.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Common pages synchronized!");
      setShowModal(false);
      fetchBooks();
    } catch (error) {
      toast.error("Cloud synchronization failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredBooks = books.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Common Pages</h1>
          <p className="page-sub">Manage shared image resources and common annexures for printed books</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchBooks}>
            <RefreshCcw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className={styles.tableHeader}>
        <div className="search-wrap" style={{ width: '360px' }}>
          <Search size={14}/>
          <input
            className="search-input"
            type="text"
            placeholder="Search by book name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '240px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredBooks.map((book) => (
            <div key={book.id} className={styles.bookCard}>
              <span className={styles.skuBadge}>{book.sku || 'NO-SKU'}</span>
              <h3 className={styles.bookTitle}>{book.name}</h3>
              
              <div className={styles.previewStrip}>
                {book.commonPages.length > 0 ? (
                  book.commonPages.map((url, i) => (
                    <img key={i} src={url} className={styles.thumb} alt="" />
                  ))
                ) : (
                  <div style={{ padding: '1rem', border: '1px dashed var(--border-subtle)', width: '100%', borderRadius: 'var(--r-sm)', fontSize: '0.75rem', textAlign: 'center', opacity: 0.5 }}>
                    No pages uploaded
                  </div>
                )}
              </div>

              <div className={styles.pagesCount}>
                <FileText size={14} /> {book.commonPages.length} Resources Attached
              </div>

              <div className={styles.cardActions}>
                <button className="btn btn-brand btn-sm" onClick={() => openModal(book)}>
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showModal && selectedBook && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Managed Content: {selectedBook.name}</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Rearrange or add high-resolution common pages
                </p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.uploadZone} onClick={() => document.getElementById('hub-upload').click()}>
                <UploadCloud size={40} style={{ color: 'var(--brand-secondary)', marginBottom: '1rem' }} />
                <h3>Drop new pages here</h3>
                <p>Click to browse files (Images only)</p>
                <input type="file" id="hub-upload" multiple hidden onChange={handleFileUpload} accept="image/*" />
              </div>

              <div className={styles.sequenceGrid}>
                {editPages.map((page, idx) => (
                  <div key={idx} className={styles.pageItem}>
                    <img src={page.preview} alt="" />
                    <div className={styles.seqBadge}>{idx + 1}</div>
                    <div className={styles.itemOverlay}>
                      <div className={styles.orderControls}>
                        <button className={styles.orderBtn} onClick={() => movePage(idx, -1)} disabled={idx === 0}>
                          <ArrowUp size={14} />
                        </button>
                        <button className={styles.orderBtn} onClick={() => movePage(idx, 1)} disabled={idx === editPages.length - 1}>
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <button className={styles.removeBtn} onClick={() => removePage(idx)}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Discard</button>
              <button className="btn btn-brand" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <CheckCircle size={16} />
                    <span>Save Sequence</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonPages;
