import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, Mail, Database, Save, Loader2, Eye, EyeOff, Send, Plus, X, HardDrive, FileImage, UploadCloud, Trash2 } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import settingsService from '../services/settingsService';
import styles from './Settings.module.css';

const TABS = [
  { id: 'email', label: 'Email Sender', icon: <Mail size={15}/> },
  { id: 'templates', label: 'Email Templates', icon: <Mail size={15}/> },
  { id: 'config', label: 'Site Config', icon: <SettingsIcon size={15}/> },
  { id: 'quick-links', label: 'Quick Links', icon: <SettingsIcon size={15}/> },
  { id: 'about', label: 'About Page', icon: <FileImage size={15}/> },
  { id: 'backup', label: 'Backups', icon: <Database size={15}/> },
];

const TEMPLATE_TYPES = [
  'OTP_VERIFICATION',
  'WELCOME_EMAIL',
  'ORDER_PLACED',
  'ORDER_SHIPPED',
  'ORDER_CANCELLED',
  'FORGOT_PASSWORD',
  'PASSWORD_RESET',
  'CONTACT_MESSAGE',
];

const TEMPLATE_VARIABLES = {
  OTP_VERIFICATION: ['{{name}}', '{{otp}}', '{{minutes}}'],
  WELCOME_EMAIL: ['{{name}}'],
  ORDER_PLACED: ['{{name}}', '{{orderId}}', '{{totalAmount}}', '{{orderDate}}', '{{products}}', '{{shippingAddress}}'],
  ORDER_SHIPPED: ['{{name}}', '{{orderId}}', '{{courierName}}', '{{awbCode}}', '{{trackingUrl}}'],
  ORDER_CANCELLED: ['{{name}}', '{{orderId}}', '{{totalAmount}}'],
  FORGOT_PASSWORD: ['{{name}}', '{{otp}}'],
  PASSWORD_RESET: ['{{name}}', '{{resetLink}}'],
  CONTACT_MESSAGE: ['{{name}}', '{{email}}', '{{phone}}', '{{message}}'],
};

const CONFIG_FIELD_META = {
  SITE_TITLE: {
    label: 'Website Name',
    help: 'Used in browser title, SEO tags, checkout payment name, footer copyright, and logo alt text.',
    placeholder: 'Book My Study Guide',
  },
  SITE_DESCRIPTION: {
    label: 'Website Description',
    help: 'Used in SEO meta description and footer brand text.',
    placeholder: 'Your trusted store for IGNOU guides, projects, assignments, and exam-ready study material.',
  },
  SITE_KEYWORDS: {
    label: 'SEO Keywords',
    help: 'Comma-separated keywords for search engines.',
    placeholder: 'IGNOU books, study guides, assignments, projects, exam preparation',
  },
  SITE_LOGO: {
    label: 'Logo URL',
    help: 'Public image URL used in header, footer, and Razorpay checkout.',
    placeholder: 'https://example.com/logo.png',
  },
  POLICY_SHIPPING: {
    label: 'Shipping Policy',
    help: 'Shown on the customer Shipping Policy page. HTML is supported.',
    placeholder: '<h2>Shipping Policy</h2><p>Write shipping details here...</p>',
  },
  POLICY_RETURNS: {
    label: 'Return & Refund Policy',
    help: 'Shown on the customer Returns page. HTML is supported.',
    placeholder: '<h2>Return & Refund Policy</h2><p>Write return details here...</p>',
  },
  POLICY_TERMS: {
    label: 'Terms & Conditions',
    help: 'Shown on the customer Terms page. HTML is supported.',
    placeholder: '<h2>Terms & Conditions</h2><p>Write terms here...</p>',
  },
};

const DEFAULT_CONFIG_VALUES = {
  general: {
    SITE_TITLE: 'Book My Study Guide',
    SITE_DESCRIPTION: 'Book My Study Guide provides reliable IGNOU study guides, solved assignments, project reports, synopsis support, and exam-focused learning material for students across India.',
    SITE_KEYWORDS: 'IGNOU study guide, IGNOU solved assignments, IGNOU project report, IGNOU synopsis, exam preparation, distance learning books, BMSG',
  },
  legal: {
    POLICY_SHIPPING: `<h2>Shipping Policy</h2>
<p>At Book My Study Guide, we work to dispatch physical study material quickly and safely through trusted courier partners.</p>
<h3>Order Processing</h3>
<p>Orders are usually processed after successful payment confirmation. Processing time may vary during holidays, peak admission periods, or high-demand exam seasons.</p>
<h3>Delivery Timeline</h3>
<p>Estimated delivery time depends on the customer pincode, courier availability, and serviceability. Delivery estimates shown at checkout or shared after dispatch are approximate.</p>
<h3>Shipping Charges</h3>
<p>Shipping charges for physical products are calculated during checkout based on delivery pincode and available courier rates. Digital products do not require shipping.</p>
<h3>Tracking</h3>
<p>Once your order is shipped, tracking details such as courier name and tracking ID/AWB may be shared by email, SMS, WhatsApp, or inside your account order section.</p>
<h3>Delivery Issues</h3>
<p>If your package is delayed, marked delivered but not received, damaged, or lost in transit, please contact support with your order ID and tracking details so we can help investigate.</p>`,
    POLICY_RETURNS: `<h2>Return & Refund Policy</h2>
<p>We want students to receive the correct study material in usable condition. Please read the policy below before placing an order.</p>
<h3>Physical Products</h3>
<p>Returns or replacements may be considered if the item delivered is wrong, damaged, misprinted, or significantly different from the product ordered. Please report the issue within 24 hours of delivery with clear photos/videos.</p>
<h3>Digital Products</h3>
<p>Digital products, downloadable files, project reports, synopsis files, and soft-copy material are generally non-returnable and non-refundable once access or download is provided.</p>
<h3>Cancellation</h3>
<p>Cancellation requests can be reviewed only before an order is packed, dispatched, or digital access is provided. Once shipped or delivered digitally, cancellation may not be possible.</p>
<h3>Refund Processing</h3>
<p>Approved refunds are processed to the original payment method or another approved method. Bank/payment gateway timelines may vary.</p>
<h3>How To Request Help</h3>
<p>Contact our support team with your order ID, registered email/phone number, issue details, and supporting images or videos.</p>`,
    POLICY_TERMS: `<h2>Terms & Conditions</h2>
<p>Welcome to Book My Study Guide. By using our website and placing an order, you agree to the terms below.</p>
<h3>Products & Content</h3>
<p>We provide educational study material, guides, assignments, projects, synopsis support, and related resources. Product availability, format, pricing, and descriptions may change from time to time.</p>
<h3>Student Responsibility</h3>
<p>Our material is intended to support learning and preparation. Students are responsible for following their university/institution rules, submission guidelines, academic integrity requirements, and deadlines.</p>
<h3>Payments</h3>
<p>Orders are confirmed after successful payment or approved partial-payment flow. Payment failures, gateway delays, or verification issues may delay order confirmation.</p>
<h3>Digital Access</h3>
<p>For digital products, access may be provided through download links, email, account section, or another delivery method. Do not share purchased files publicly or resell them.</p>
<h3>Shipping</h3>
<p>Physical product delivery depends on courier serviceability and customer address accuracy. Customers must provide correct name, phone number, address, and pincode.</p>
<h3>Limitation Of Liability</h3>
<p>We are not responsible for indirect losses, academic outcomes, missed deadlines, or issues caused by incorrect customer information, courier delays, or misuse of material.</p>
<h3>Contact</h3>
<p>For questions about orders, policies, or support, please contact our customer support team through the website contact page.</p>`,
  },
};

const DEFAULT_QUICK_LINKS = [
  {
    icon: 'Layers',
    title: 'Classifications',
    menus: [
      { label: 'Books', to: '/classifications?tab=books' },
      { label: 'Main Degrees', to: '/classifications?tab=mainDegrees' },
      { label: 'Sub Degrees', to: '/classifications?tab=subDegrees' },
      { label: 'Subjects', to: '/classifications?tab=subjects' },
    ],
  },
  {
    icon: 'Package',
    title: 'Products',
    menus: [
      { label: 'All Products', to: '/products' },
      { label: 'Combo Bundles', to: '/combo-products' },
    ],
  },
  {
    icon: 'ShoppingCart',
    title: 'Orders',
    menus: [
      { label: 'View Orders', to: '/orders' },
    ],
  },
];



export default function Settings() {
  const location = useLocation();
  const qTab = new URLSearchParams(location.search).get('tab');
  const [tab, setTab] = useState(qTab || 'email');
  const [configCat, setConfigCat] = useState('general');
  const [loading, setLoading] = useState(false);
  
  const CONFIG_CATEGORIES = {
    general: { label: 'General & Brand', keys: ['SITE_TITLE', 'SITE_DESCRIPTION', 'SITE_KEYWORDS', 'SITE_LOGO'] },
    ecommerce: { label: 'E-Commerce & Payments', keys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'] },
    shiprocket: { label: 'Shipping & Shiprocket', keys: ['SHIPROCKET_EMAIL', 'SHIPROCKET_PASSWORD', 'SHIPROCKET_PICKUP_LOCATION'] },
    legal: { label: 'Legal Policies', keys: ['POLICY_SHIPPING', 'POLICY_RETURNS', 'POLICY_TERMS'] },
    analytics: { label: 'Integrations & Analytics', keys: ['GOOGLE_ANALYTICS_ID', 'GA_PROPERTY_ID', 'GA_SERVICE_ACCOUNT'] }
  };
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Email config
  const [emailConfig, setEmailConfig] = useState({ user:'', pass:'', from:'', fromName:'' });

  // Templates
  const [templateType, setTemplateType] = useState('OTP_VERIFICATION');
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [tplForm, setTplForm] = useState({ name:'', subject:'', htmlContent:'', isActive:false });
  const [testEmail, setTestEmail] = useState('');
  const [tplModal, setTplModal] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Config
  const [config, setConfig] = useState({});
  const [quickLinks, setQuickLinks] = useState(DEFAULT_QUICK_LINKS);

  // Backups
  const [backups, setBackups] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // About page certificates
  const [aboutCerts, setAboutCerts] = useState({ ABOUT_GST_CERT_URL: '', ABOUT_STARTUP_CERT_URL: '' });
  const [certUploading, setCertUploading] = useState({ gst: false, startup: false });

  useEffect(() => {
    if (tab === 'email') loadEmailConfig();
    if (tab === 'templates') loadTemplates();
    if (tab === 'config') loadConfig();
    if (tab === 'quick-links') loadQuickLinks();
    if (tab === 'about') loadAboutCerts();
    if (tab === 'backup') loadBackups();
  }, [tab]);

  useEffect(() => {
    if (tab === 'templates') {
      setSelectedTpl(null);
      loadTemplates();
    }
  }, [templateType]);

  const loadEmailConfig = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getEmailConfig();
      if (res?.data) setEmailConfig(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getEmailTemplates(templateType);
      setTemplates(Array.isArray(res) ? res : res?.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getConfig();
      if (res?.data) {
        const configMap = {};
        res.data.forEach(item => {
          if (!item.key.startsWith('SMTP_') && !item.key.startsWith('EMAIL_')) {
            configMap[item.key] = item.value;
          }
        });
        setConfig(configMap);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getBackups();
      setBackups(res?.data || res?.backups || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const saveEmailConfig = async () => {
    setSaving(true);
    try {
      await settingsService.saveEmailConfig(emailConfig);
      toast.success('Email config saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const saveTpl = async () => {
    if (!tplForm.name || !tplForm.subject || !tplForm.htmlContent) { toast.error('Fill all template fields'); return; }
    setSaving(true);
    try {
      await settingsService.saveEmailTemplate({ ...tplForm, type: templateType, id: selectedTpl?.id });
      toast.success(selectedTpl ? 'Template updated' : 'Template created');
      setTplModal(false);
      loadTemplates();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const openNewTpl = () => {
    setSelectedTpl(null);
    setTplForm({ name:'', subject:'', htmlContent:'', isActive:false });
    setTplModal(true);
  };

  const openEditTpl = (tpl) => {
    setSelectedTpl(tpl);
    setTplForm({
      name: tpl.name || '',
      subject: tpl.subject || '',
      htmlContent: tpl.htmlContent || '',
      isActive: !!tpl.isActive,
    });
    setTplModal(true);
  };

  const activateTpl = async (tpl) => {
    if (!tpl?.id) return;
    setSaving(true);
    try {
      await settingsService.activateEmailTemplate(tpl.id);
      toast.success('Template set as active');
      await loadTemplates();
    } catch {
      toast.error('Could not activate template');
    } finally {
      setSaving(false);
    }
  };

  const ensureDefaults = async () => {
    setSaving(true);
    try {
      const res = await settingsService.ensureDefaultEmailTemplates();
      const count = res?.created?.length || 0;
      toast.success(count ? `Added ${count} default templates` : 'Default templates already exist');
      await loadTemplates();
    } catch {
      toast.error('Could not add default templates');
    } finally {
      setSaving(false);
    }
  };

  const loadQuickLinks = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getConfig();
      const qlConfig = res?.data?.find(item => item.key === 'QUICK_LINKS');
      if (qlConfig?.value) {
        const parsed = JSON.parse(qlConfig.value);
        setQuickLinks(Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_QUICK_LINKS);
      } else {
        setQuickLinks(DEFAULT_QUICK_LINKS);
      }
    } catch {
      setQuickLinks(DEFAULT_QUICK_LINKS);
    } finally {
      setLoading(false);
    }
  };

  const loadAboutCerts = async () => {
    try {
      const res = await settingsService.getConfig();
      const map = {};
      (res?.data || []).forEach(item => { map[item.key] = item.value; });
      setAboutCerts({
        ABOUT_GST_CERT_URL: map.ABOUT_GST_CERT_URL || '',
        ABOUT_STARTUP_CERT_URL: map.ABOUT_STARTUP_CERT_URL || '',
      });
    } catch { /* silent */ }
  };

  const isPdf = (url) => url && (url.toLowerCase().endsWith('.pdf') || url.includes('/pdf/'));

  const uploadCert = async (e, configKey, certKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertUploading(s => ({ ...s, [certKey]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/upload/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.url;
      if (!url) throw new Error('No URL returned');
      await settingsService.updateConfig({ [configKey]: url });
      setAboutCerts(s => ({ ...s, [configKey]: url }));
      toast.success('Certificate uploaded and saved');
    } catch { toast.error('Upload failed'); }
    finally { setCertUploading(s => ({ ...s, [certKey]: false })); }
  };

  const removeCert = async (configKey) => {
    try {
      await settingsService.updateConfig({ [configKey]: '' });
      setAboutCerts(s => ({ ...s, [configKey]: '' }));
      toast.success('Certificate removed');
    } catch { toast.error('Remove failed'); }
  };

  const fillCategoryDefaults = () => {
    const defaults = DEFAULT_CONFIG_VALUES[configCat];
    if (!defaults) return;
    setConfig(c => ({ ...c, ...defaults }));
    toast.info('Recommended details filled. Click Save Config to publish them.');
  };

  const sendTestEmail = async () => {
    if (!testEmail) { toast.error('Enter test email'); return; }
    if (!selectedTpl) { toast.error('Select a template first'); return; }
    setSendingTest(true);
    try {
      await settingsService.testEmail({ toEmail: testEmail, subject: selectedTpl.subject, htmlContent: selectedTpl.htmlContent });
      toast.success(`Test email sent to ${testEmail}`);
    } catch { toast.error('Test email failed'); }
    finally { setSendingTest(false); }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      await settingsService.createBackup();
      toast.success('Backup created');
      loadBackups();
    } catch { toast.error('Backup failed'); }
    finally { setCreatingBackup(false); }
  };

  const handleDownload = async (filename) => {
    try {
      const blob = await settingsService.downloadBackup(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const updateQuickGroup = (idx, field, value) => {
    setQuickLinks(list => list.map((group, i) => (
      i === idx ? { ...group, [field]: value } : group
    )));
  };

  const updateQuickMenu = (groupIdx, menuIdx, field, value) => {
    setQuickLinks(list => list.map((group, i) => {
      if (i !== groupIdx) return group;
      const menus = (group.menus || []).map((menu, j) => (
        j === menuIdx ? { ...menu, [field]: value } : menu
      ));
      return { ...group, menus };
    }));
  };

  const addQuickGroup = () => {
    setQuickLinks(list => [...list, { icon: 'Box', title: 'New Group', menus: [{ label: 'New Link', to: '/' }] }]);
  };

  const removeQuickGroup = (idx) => {
    setQuickLinks(list => list.filter((_, i) => i !== idx));
  };

  const addQuickMenu = (groupIdx) => {
    setQuickLinks(list => list.map((group, i) => (
      i === groupIdx
        ? { ...group, menus: [...(group.menus || []), { label: 'New Link', to: '/' }] }
        : group
    )));
  };

  const removeQuickMenu = (groupIdx, menuIdx) => {
    setQuickLinks(list => list.map((group, i) => (
      i === groupIdx
        ? { ...group, menus: (group.menus || []).filter((_, j) => j !== menuIdx) }
        : group
    )));
  };

  const resetQuickLinks = () => {
    setQuickLinks(DEFAULT_QUICK_LINKS);
    toast.info('Default quick links restored. Click Save Quick Links to publish.');
  };

  const saveQuickLinks = async () => {
    setSaving(true);
    try {
      await settingsService.updateConfig({ QUICK_LINKS: JSON.stringify(quickLinks) });
      toast.success('Quick links saved');
    } catch {
      toast.error('Could not save quick links');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div><h1 className="page-title">Settings</h1><p className="page-sub">System configuration and preferences</p></div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* EMAIL CONFIG */}
      {tab === 'email' && (
        <div className="section-block">
          <div className="section-header"><span className="section-title">Email Sender Configuration</span></div>
          <div className="section-body">
            {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
              <>
                <div className="grid-2" style={{ marginBottom:14 }}>
                  <div className="form-group">
                    <label className="form-label">Sender Gmail Address</label>
                    <input className="form-input" type="email" placeholder="your@gmail.com" value={emailConfig.user||''} onChange={e => setEmailConfig(c => ({ ...c, user: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gmail App Password</label>
                    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                      <input className="form-input" type={showPass?'text':'password'} placeholder="16-character app password" value={emailConfig.pass||''} onChange={e => setEmailConfig(c => ({ ...c, pass: e.target.value }))} style={{ paddingRight:36 }}/>
                      <button type="button" style={{ position:'absolute', right:10, background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)' }} onClick={() => setShowPass(v => !v)}>
                        {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid-2" style={{ marginBottom:16 }}>
                  <div className="form-group">
                    <label className="form-label">From Email</label>
                    <input className="form-input" type="email" placeholder="Leave blank to use sender email" value={emailConfig.from||''} onChange={e => setEmailConfig(c => ({ ...c, from: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">From Name</label>
                    <input className="form-input" placeholder="Book My Study Guide" value={emailConfig.fromName||''} onChange={e => setEmailConfig(c => ({ ...c, fromName: e.target.value }))} />
                  </div>
                </div>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:'0 0 16px' }}>
                  Use the Gmail address that will send OTP, order, shipping, cancellation, contact, and test emails. The password must be a Google app password, not the normal Gmail login password.
                </p>
                <button className="btn btn-primary" onClick={saveEmailConfig} disabled={saving}>
                  {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : <><Save size={13}/> Save Config</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* EMAIL TEMPLATES */}
      {tab === 'templates' && (
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <div className="section-block" style={{ flex:'0 0 280px' }}>
            <div className="section-header">
              <span className="section-title">Template Type</span>
              <button className="btn btn-primary btn-sm" onClick={openNewTpl}>
                <Plus size={13}/> New
              </button>
            </div>
            <div style={{ padding:'8px' }}>
              {TEMPLATE_TYPES.map(type => (
                <button key={type} onClick={() => setTemplateType(type)}
                  className={`tab-btn ${templateType === type ? 'active' : ''}`}
                  style={{ display:'block', width:'100%', textAlign:'left', marginBottom:2 }}>
                  {type.replace(/_/g,' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="section-block" style={{ flex:1, minWidth:0 }}>
            <div className="section-header">
              <span className="section-title">{templateType.replace(/_/g,' ')} Templates</span>
            </div>
            <div style={{ padding:'8px' }}>
              {templates.map(t => (
                <div key={t.id} onClick={() => setSelectedTpl(t)}
                  style={{ padding:'12px 14px', borderRadius:'var(--r-md)', cursor:'pointer', border:'1px solid '+(selectedTpl?.id===t.id?'var(--brand-secondary)':'var(--border-default)'), background:selectedTpl?.id===t.id?'var(--color-info-bg)':'var(--bg-card)', marginBottom:6, transition:'var(--t-fast)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:600, fontSize:13 }}>{t.name}</span>
                    {t.isActive && <span className="badge badge-success">Active</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{t.subject}</div>
                </div>
              ))}
              {templates.length === 0 && <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No templates for this type</div>}
            </div>
          </div>

          {selectedTpl && (
            <div className="section-block" style={{ flex:'0 0 320px' }}>
              <div className="section-header">
                <span className="section-title">Selected Template</span>
              </div>
              <div style={{ padding:'14px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{selectedTpl.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>{selectedTpl.subject}</div>
                <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEditTpl(selectedTpl)}>Edit</button>
                  <button className="btn btn-primary btn-sm" onClick={() => activateTpl(selectedTpl)} disabled={selectedTpl.isActive || saving}>
                    {selectedTpl.isActive ? 'Active' : 'Make Active'}
                  </button>
                </div>
                <div className="form-group" style={{ marginBottom:10 }}>
                  <label className="form-label">Send test to</label>
                  <input className="form-input" type="email" placeholder="test@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)}/>
                </div>
                <button className="btn btn-outline" onClick={sendTestEmail} disabled={sendingTest} style={{ width:'100%' }}>
                  {sendingTest ? <><Loader2 size={13} className={styles.spin}/> Sending...</> : <><Send size={13}/> Send Test</>}
                </button>
              </div>
            </div>
          )}

          <div className="section-block" style={{ flex:'1 1 100%' }}>
            <div style={{ padding:'14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>Default Templates</div>
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>Adds missing default templates for every email type without changing existing custom templates.</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={ensureDefaults} disabled={saving}>
                {saving ? <Loader2 size={13} className={styles.spin}/> : <Plus size={13}/>} Add Missing Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LINKS */}
      {tab === 'quick-links' && (
        <div className="section-block">
          <div className="section-header" style={{ gap:12, flexWrap:'wrap' }}>
            <span className="section-title">Quick Links</span>
            <button className="btn btn-outline btn-sm" onClick={resetQuickLinks} style={{ marginLeft:'auto' }}>
              Restore Defaults
            </button>
            <button className="btn btn-primary btn-sm" onClick={addQuickGroup}>
              <Plus size={13}/> Add Group
            </button>
          </div>
          <div className="section-body">
            {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
              <>
                <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)', background:'var(--bg-card)', color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>
                  These control the small shortcut icons in the admin top bar. Use Lucide icon names like <code>Layers</code>, <code>Package</code>, <code>ShoppingCart</code>, <code>Users</code>, or <code>Settings</code>.
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {quickLinks.map((group, groupIdx) => (
                    <div key={groupIdx} style={{ border:'1px solid var(--border-default)', borderRadius:'var(--r-md)', background:'var(--bg-card)', padding:16 }}>
                      <div className="grid-2" style={{ marginBottom:12 }}>
                        <div className="form-group">
                          <label className="form-label">Group Title</label>
                          <input className="form-input" value={group.title || ''} onChange={e => updateQuickGroup(groupIdx, 'title', e.target.value)} placeholder="Products" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Icon Name</label>
                          <input className="form-input" value={group.icon || ''} onChange={e => updateQuickGroup(groupIdx, 'icon', e.target.value)} placeholder="Package" />
                        </div>
                      </div>

                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Menu Links</span>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => addQuickMenu(groupIdx)}>
                          <Plus size={13}/> Add Link
                        </button>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {(group.menus || []).map((menu, menuIdx) => (
                          <div key={menuIdx} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}>
                            <input className="form-input" value={menu.label || ''} onChange={e => updateQuickMenu(groupIdx, menuIdx, 'label', e.target.value)} placeholder="All Products" />
                            <input className="form-input" value={menu.to || ''} onChange={e => updateQuickMenu(groupIdx, menuIdx, 'to', e.target.value)} placeholder="/products" />
                            <button className="btn btn-outline btn-sm" type="button" onClick={() => removeQuickMenu(groupIdx, menuIdx)} style={{ color:'#ef4444', borderColor:'#ef4444' }}>
                              <X size={13}/>
                            </button>
                          </div>
                        ))}
                      </div>

                      <button className="btn btn-outline btn-sm" type="button" onClick={() => removeQuickGroup(groupIdx)} style={{ marginTop:12, color:'#ef4444', borderColor:'#ef4444' }}>
                        Remove Group
                      </button>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" style={{ marginTop:16 }} onClick={saveQuickLinks} disabled={saving}>
                  {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : <><Save size={13}/> Save Quick Links</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CONFIG */}
      {tab === 'config' && (
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <div className="section-block" style={{ flex:'0 0 280px', alignSelf: 'flex-start' }}>
            <div className="section-header">
              <span className="section-title">Categories</span>
            </div>
            <div style={{ padding:'8px' }}>
              {Object.entries(CONFIG_CATEGORIES).map(([catId, catObj]) => (
                <button key={catId} onClick={() => setConfigCat(catId)}
                  className={`tab-btn ${configCat === catId ? 'active' : ''}`}
                  style={{ display:'block', width:'100%', textAlign:'left', marginBottom:2 }}>
                  {catObj.label}
                </button>
              ))}
            </div>
          </div>

          <div className="section-block" style={{ flex:1, minWidth:0 }}>
            <div className="section-header" style={{ gap:12, flexWrap:'wrap' }}>
              <span className="section-title">{CONFIG_CATEGORIES[configCat].label}</span>
              {DEFAULT_CONFIG_VALUES[configCat] && (
                <button type="button" className="btn btn-outline btn-sm" onClick={fillCategoryDefaults} style={{ marginLeft:'auto' }}>
                  Use Recommended Details
                </button>
              )}
            </div>
            <div className="section-body">
              {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
                <>
                  {configCat === 'general' && (
                    <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)', background:'var(--bg-card)', color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>
                      These values are live on the frontend: browser SEO tags, header/footer branding, and Razorpay checkout branding all read from this config.
                    </div>
                  )}
                  {configCat === 'legal' && (
                    <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border-default)', background:'var(--bg-card)', color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>
                      These policy fields are live on the customer Shipping, Returns, and Terms pages. HTML is supported, so headings and paragraphs will render on the site.
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                    {CONFIG_CATEGORIES[configCat].keys.map((k) => {
                      const v = config[k] ?? '';
                      const isLongText = k.includes('POLICY') || k.includes('DESCRIPTION') || k.includes('KEYWORDS') || k === 'QUICK_LINKS';
                      const meta = CONFIG_FIELD_META[k] || {};
                      return (
                        <div key={k} className="form-group" style={{ gridColumn: isLongText ? '1 / -1' : 'auto', background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)', marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px', display: 'block', letterSpacing: '0.5px' }}>
                            {meta.label || k.replace(/_/g, ' ')}
                          </label>
                          {meta.help && (
                            <p style={{ margin:'-4px 0 10px', color:'var(--text-muted)', fontSize:12, lineHeight:1.5 }}>{meta.help}</p>
                          )}
                          {isLongText ? (
                            <textarea className="form-textarea" rows={k.includes('POLICY') ? 12 : 4} value={v} placeholder={meta.placeholder || ''} onChange={e => setConfig(c => ({ ...c, [k]: e.target.value }))} style={{ width: '100%', fontSize: '13px' }} />
                          ) : (
                            <div>
                              {(k.includes('LOGO') && v && v.startsWith('http')) && (
                                <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-sm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                                  <img src={v} alt="Preview" style={{ height: '40px', objectFit: 'contain' }} />
                                </div>
                              )}
                              {(k.includes('SECRET') || k.includes('PASSWORD')) ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input className="form-input" type={showPass ? 'text' : 'password'} value={v} onChange={e => setConfig(c => ({ ...c, [k]: e.target.value }))} style={{ width: '100%', fontFamily: 'monospace', paddingRight: 36 }} />
                                  <button type="button" style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }} onClick={() => setShowPass(s => !s)}>
                                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                                  </button>
                                </div>
                              ) : (
                                <input className="form-input" value={v} placeholder={meta.placeholder || ''} onChange={e => setConfig(c => ({ ...c, [k]: e.target.value }))} style={{ width: '100%', fontFamily: (k.includes('KEY') || k.includes('EMAIL')) ? 'monospace' : 'inherit' }} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button className="btn btn-primary" style={{ marginTop:16 }} onClick={async () => {
                    setSaving(true);
                    try {
                      const catKeys = CONFIG_CATEGORIES[configCat].keys;
                      const payload = Object.fromEntries(catKeys.map(k => [k, config[k] ?? '']));
                      await settingsService.updateConfig(payload);
                      toast.success('Config saved');
                    } catch { toast.error('Save failed'); }
                    finally { setSaving(false); }
                  }} disabled={saving}>
                    {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : <><Save size={13}/> Save Config</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABOUT PAGE CERTIFICATES */}
      {tab === 'about' && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">About Page — Certificates</span>
          </div>
          <div className="section-body">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Upload certificate images here. They will appear in the Certifications section on the public About Us page.
            </p>
            <div className="grid-2" style={{ gap: 24 }}>
              {[
                { key: 'ABOUT_GST_CERT_URL', certKey: 'gst', label: 'GST Certificate', sub: 'GST No: 24AANCB7927R1ZT' },
                { key: 'ABOUT_STARTUP_CERT_URL', certKey: 'startup', label: 'Startup India Certificate', sub: 'DIPP265616' },
              ].map(({ key, certKey, label, sub }) => (
                <div key={key} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{sub}</div>
                  {aboutCerts[key] ? (
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      {isPdf(aboutCerts[key]) ? (
                        <a href={aboutCerts[key]} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px 16px', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', background: 'var(--bg-page, #f8fafc)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>
                          <FileImage size={32} style={{ opacity: 0.6 }} />
                          <span>PDF uploaded — click to preview</span>
                        </a>
                      ) : (
                        <img src={aboutCerts[key]} alt={label} style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)', background: '#fff', padding: 8 }} />
                      )}
                      <button
                        onClick={() => removeCert(key)}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'var(--color-danger)', border: 'none', borderRadius: 'var(--r-sm)', padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => document.getElementById(`cert-upload-${certKey}`).click()}
                      style={{ border: '2px dashed var(--border-default)', borderRadius: 'var(--r-md)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, color: 'var(--text-muted)' }}
                    >
                      <UploadCloud size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                      <div style={{ fontSize: 13 }}>Click to upload image or PDF</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG, WEBP, PDF — max 20MB</div>
                    </div>
                  )}
                  <input
                    id={`cert-upload-${certKey}`}
                    type="file"
                    accept="image/*,application/pdf"
                    hidden
                    onChange={e => uploadCert(e, key, certKey)}
                  />
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => document.getElementById(`cert-upload-${certKey}`).click()}
                    disabled={certUploading[certKey]}
                    style={{ width: '100%' }}
                  >
                    {certUploading[certKey] ? <><Loader2 size={13} className={styles.spin} /> Uploading...</> : <><UploadCloud size={13} /> {aboutCerts[key] ? 'Replace Image' : 'Upload Image'}</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BACKUPS */}
      {tab === 'backup' && (
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Database Backups</span>
            <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={creatingBackup}>
              {creatingBackup ? <><Loader2 size={13} className={styles.spin}/> Creating...</> : <><HardDrive size={13}/> Create Backup</>}
            </button>
          </div>
          <div style={{ padding:'14px' }}>
            {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
              backups.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Filename</th><th>Size</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={i}>
                        <td style={{ fontSize:12, fontFamily:'monospace', fontWeight:500 }}>{b.fileName || b.filename || b.name || '—'}</td>
                        <td style={{ fontSize:12 }}>{b.size ? `${Math.round(b.size/1024)} KB` : '—'}</td>
                        <td style={{ fontSize:12, color:'var(--text-muted)' }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                        <td>
                          {(b.fileName || b.filename) && (
                            <button onClick={() => handleDownload(b.fileName || b.filename)} className="btn btn-outline btn-sm">
                              Download
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>No backups found. Create your first backup above.</p>
            )}
          </div>
        </div>
      )}


      {/* Template Modal */}
      {tplModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTplModal(false); }}>
          <div className="modal modal-lg fade-in">
            <div className="modal-header">
              <h2 className="modal-title">New Email Template</h2>
              <button className="modal-close" onClick={() => setTplModal(false)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom:12 }}>
                <div className="form-group">
                  <label className="form-label">Template Name *</label>
                  <input className="form-input" placeholder="e.g. OTP Email v2" value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Subject *</label>
                  <input className="form-input" placeholder="Subject line..." value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">HTML Content *</label>
                <textarea className="form-textarea" rows={12} placeholder="HTML email content... Use {{name}}, {{otp}}, {{orderId}} etc." value={tplForm.htmlContent} onChange={e => setTplForm(f => ({ ...f, htmlContent: e.target.value }))} style={{ fontFamily:'monospace', fontSize:12 }} />
              </div>
              <div style={{ marginBottom:12, padding:'10px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--r-sm)', background:'var(--bg-card)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6 }}>Available variables for {templateType.replace(/_/g, ' ')}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(TEMPLATE_VARIABLES[templateType] || ['{{name}}']).map(v => (
                    <code key={v} style={{ fontSize:11, padding:'3px 6px', borderRadius:6, background:'rgba(0,0,0,.12)' }}>{v}</code>
                  ))}
                </div>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={tplForm.isActive} onChange={e => setTplForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width:14, height:14 }}/>
                Set as active template for this type
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setTplModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTpl} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> Saving...</> : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
