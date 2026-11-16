import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Clock,
  MapPin,
  MessageCircle,
  Globe,
  Share2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { toast } from 'react-toastify';
import contentService from '../services/contentService';
import styles from './ContactSettings.module.css';

const initialForm = {
  phone: "",
  email: "",
  officeTime: "",
  address: "",
  facebook: "",
  instagram: "",
  whatsapp: "",
};

const ContactSettings = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      setLoading(true);
      const res = await contentService.getContact();
      if (res) {
        setForm({
          phone: res.phone || "",
          email: res.email || "",
          officeTime: res.officeTime || "",
          address: res.address || "",
          facebook: res.facebook || "",
          instagram: res.instagram || "",
          whatsapp: res.whatsapp || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load contact information");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await contentService.updateContact(form);
      toast.success("Public contact info updated!");
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="skeleton" style={{ height: '100px', marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
          <div className="skeleton" style={{ height: '600px' }} />
          <div className="skeleton" style={{ height: '400px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contact Info</h1>
          <p className="page-sub">Configure public contact channels and social links</p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Settings Form */}
        <div className={styles.settingsCard}>
          <form onSubmit={handleSave}>
            <div className={styles.sectionTitle}><Globe size={18} /> Global Reach</div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label><Phone size={14} /> Official Phone</label>
                <input 
                  type="text" 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  placeholder="+91 00000 00000" 
                />
              </div>
              <div className={styles.formGroup}>
                <label><Mail size={14} /> Support Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="contact@bmsg.com" 
                />
              </div>
              <div className={styles.formGroup}>
                <label><Clock size={14} /> Availability (Office Hours)</label>
                <input 
                  type="text" 
                  name="officeTime" 
                  value={form.officeTime} 
                  onChange={handleChange} 
                  placeholder="Mon-Sat: 10AM - 7PM" 
                />
              </div>
            </div>

            <div className={styles.sectionTitle}><MapPin size={18} /> Physical Headquarters</div>
            <div className={styles.formGroup}>
              <textarea 
                name="address" 
                value={form.address} 
                onChange={handleChange} 
                rows={3} 
                placeholder="Enter complete office address..."
              />
            </div>

            <div className={styles.sectionTitle}><Share2 size={18} /> Social Connectivity</div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Facebook</label>
                <div className={styles.socialInput}>
                  <div className={styles.socialIcon}><FaFacebook size={18} /></div>
                  <input 
                    name="facebook" 
                    value={form.facebook} 
                    onChange={handleChange} 
                    placeholder="facebook.com/bmsg" 
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Instagram</label>
                <div className={styles.socialInput}>
                  <div className={styles.socialIcon}><FaInstagram size={18} /></div>
                  <input 
                    name="instagram" 
                    value={form.instagram} 
                    onChange={handleChange} 
                    placeholder="@bookmystudyguide" 
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>WhatsApp Number</label>
                <div className={styles.socialInput}>
                  <div className={styles.socialIcon}><MessageCircle size={18} /></div>
                  <input 
                    name="whatsapp" 
                    value={form.whatsapp} 
                    onChange={handleChange} 
                    placeholder="+91..." 
                  />
                </div>
              </div>
            </div>

            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Synchronizing...' : (
                <>
                  <CheckCircle size={20} />
                  <span>Update Global Config</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Footer Preview */}
        <div className={styles.previewCard}>
          <h3>Live Footer Preview</h3>
          
          <div className={styles.previewItem}>
            <div className={styles.contactIcon}><Phone size={18} /></div>
            <div className={styles.contactInfo}>
              <h5>Contact Lines</h5>
              <p>{form.phone || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.previewItem}>
            <div className={styles.contactIcon}><Mail size={18} /></div>
            <div className={styles.contactInfo}>
              <h5>Student Support</h5>
              <p>{form.email || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.previewItem}>
            <div className={styles.contactIcon}><Clock size={18} /></div>
            <div className={styles.contactInfo}>
              <h5>Operational Hours</h5>
              <p>{form.officeTime || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.previewItem}>
            <div className={styles.contactIcon}><MapPin size={18} /></div>
            <div className={styles.contactInfo}>
              <h5>Office Hub</h5>
              <p>{form.address || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.socialRow}>
            {form.facebook && (
              <div className={styles.socialLink}><FaFacebook size={18} /></div>
            )}
            {form.instagram && (
              <div className={styles.socialLink}><FaInstagram size={18} /></div>
            )}
            {form.whatsapp && (
              <div className={styles.socialLink}><MessageCircle size={18} /></div>
            )}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'center', opacity: 0.4 }}>
            <AlertCircle size={14} />
            <span style={{ fontSize: '0.7rem' }}>Preview simulates customer application footer</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSettings;
