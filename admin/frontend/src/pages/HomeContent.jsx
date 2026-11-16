import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Star, 
  Image as ImageIcon,
  Upload,
  X,
  RefreshCcw
} from 'lucide-react';
import { toast } from 'react-toastify';
import contentService from '../services/contentService';
import api from '../services/api';
import styles from './HomeContent.module.css';

const initialReview = { name: "", rating: 5, comment: "", image: "" };
const initialService = { title: "", description: "", icon: "" };

const HomeContent = () => {
  const [activeTab, setActiveTab] = useState('reviews');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  
  // Form States
  const [reviewForm, setReviewForm] = useState(initialReview);
  const [serviceForm, setServiceForm] = useState(initialService);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'reviews') {
        const res = await contentService.getReviews();
        const data = res.data || res || [];
        setReviews(Array.isArray(data) ? data : []);
      } else {
        const res = await contentService.getServices();
        const data = res.data || res || [];
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      
      const res = await api.post("/api/admin/upload", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        if (activeTab === 'reviews') {
          setReviewForm(prev => ({ ...prev, image: res.data.url }));
        } else {
          setServiceForm(prev => ({ ...prev, icon: res.data.url }));
        }
        toast.success("Asset uploaded!");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await contentService.saveReview(editId, reviewForm);
      toast.success(editId ? "Testimonial updated" : "Testimonial published");
      setReviewForm(initialReview);
      setEditId(null);
      fetchData();
    } catch (error) {
      toast.error("Process failed");
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      await contentService.saveService(editId, serviceForm);
      toast.success(editId ? "Service feature updated" : "Service feature added");
      setServiceForm(initialService);
      setEditId(null);
      fetchData();
    } catch (error) {
      toast.error("Process failed");
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    if (activeTab === 'reviews') {
      setReviewForm({ name: item.name, rating: item.rating, comment: item.comment, image: item.image || "" });
    } else {
      setServiceForm({ title: item.title, description: item.description, icon: item.icon || "" });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${activeTab === 'reviews' ? 'testimonial' : 'service'}?`)) return;
    try {
      if (activeTab === 'reviews') {
        await contentService.deleteReview(id);
      } else {
        await contentService.deleteService(id);
      }
      toast.success("Content removed");
      fetchData();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  return (
    <div className={styles.container}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Home Content</h1>
          <p className="page-sub">Manage testimonials and service highlights shown on the homepage</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <div 
          className={`${styles.tabBtn} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('reviews'); setEditId(null); }}
        >
          <MessageSquare size={18} /> Client Testimonials
        </div>
        <div 
          className={`${styles.tabBtn} ${activeTab === 'services' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('services'); setEditId(null); }}
        >
          <Briefcase size={18} /> Service Benchmarks
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Management Form */}
        <div className={styles.formCard}>
          <h3>
            {editId ? <Edit2 size={20} /> : <Plus size={20} />}
            {editId ? 'Update Content' : 'Add New Item'}
          </h3>
          
          {activeTab === 'reviews' ? (
            <form className={styles.form} onSubmit={handleReviewSubmit}>
              <div className={styles.formGroup}>
                <label>Client Name</label>
                <input 
                  value={reviewForm.name} 
                  onChange={e => setReviewForm({...reviewForm, name: e.target.value})}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Satisfaction Rating</label>
                <select 
                  value={reviewForm.rating} 
                  onChange={e => setReviewForm({...reviewForm, rating: Number(e.target.value)})}
                >
                  <option value="5">5 Stars (Excellent)</option>
                  <option value="4">4 Stars (Great)</option>
                  <option value="3">3 Stars (Good)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Testimonial Content</label>
                <textarea 
                  value={reviewForm.comment} 
                  onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                  rows={4}
                  placeholder="The best study platform..."
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Display Avatar</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    value={reviewForm.image} 
                    onChange={e => setReviewForm({...reviewForm, image: e.target.value})}
                    placeholder="Image URL or upload below"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer', color: 'var(--brand-secondary)', fontWeight: 600 }}>
                    <Upload size={14} /> {uploading ? 'Processing...' : 'Upload Image'}
                    <input type="file" hidden onChange={handleFileUpload} accept="image/*" />
                  </label>
                </div>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={uploading}>
                <CheckCircle2 size={18} /> {editId ? 'Apply Changes' : 'Publish Review'}
              </button>
              {editId && <button type="button" className={styles.cancelBtn} onClick={() => { setEditId(null); setReviewForm(initialReview); }}>Cancel Edit</button>}
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleServiceSubmit}>
              <div className={styles.formGroup}>
                <label>Feature Title</label>
                <input 
                  value={serviceForm.title} 
                  onChange={e => setServiceForm({...serviceForm, title: e.target.value})}
                  placeholder="e.g. Free Home Delivery"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Feature Description</label>
                <textarea 
                  value={serviceForm.description} 
                  onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                  rows={3}
                  placeholder="Briefly explain the feature..."
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Feature Icon</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    value={serviceForm.icon} 
                    onChange={e => setServiceForm({...serviceForm, icon: e.target.value})}
                    placeholder="Icon URL or upload"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer', color: 'var(--brand-secondary)', fontWeight: 600 }}>
                    <Upload size={14} /> {uploading ? 'Processing...' : 'Upload Icon'}
                    <input type="file" hidden onChange={handleFileUpload} accept="image/*" />
                  </label>
                </div>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={uploading}>
                <CheckCircle2 size={18} /> {editId ? 'Update Feature' : 'Add Feature'}
              </button>
              {editId && <button type="button" className={styles.cancelBtn} onClick={() => { setEditId(null); setServiceForm(initialService); }}>Cancel Edit</button>}
            </form>
          )}
        </div>

        {/* Dynamic Content List */}
        <div className={styles.listContainer}>
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '200px', borderRadius: 'var(--r-lg)' }} />
            ))
          ) : activeTab === 'reviews' ? (
            reviews.slice().reverse().map((rev) => (
              <div key={rev.id} className={styles.reviewItem}>
                <div className={styles.itemActions}>
                  <button className={styles.actionBtn} onClick={() => handleEdit(rev)}><Edit2 size={14} /></button>
                  <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(rev.id)}><Trash2 size={14} /></button>
                </div>
                <div className={styles.reviewHeader}>
                  <img src={rev.image || "https://via.placeholder.com/50"} alt="" className={styles.reviewAvatar} />
                  <div>
                    <div className={styles.reviewName}>{rev.name}</div>
                    <div className={styles.reviewRating}>
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} size={12} fill={i < rev.rating ? "#f59e0b" : "none"} strokeWidth={i < rev.rating ? 0 : 2} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.reviewComment}>
                  "{rev.comment}"
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(rev.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            services.slice().reverse().map((item) => (
              <div key={item.id} className={styles.serviceItem}>
                <div className={styles.itemActions}>
                  <button className={styles.actionBtn} onClick={() => handleEdit(item)}><Edit2 size={14} /></button>
                  <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
                <div className={styles.serviceIcon}>
                  <img src={item.icon || "https://via.placeholder.com/50"} alt="" />
                </div>
                <div className={styles.serviceContent}>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeContent;
