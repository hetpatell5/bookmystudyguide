import { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Trash2, Pencil, X, Eye, EyeOff, Loader2, RefreshCw, Shield } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import userService from '../services/userService';
import { useAdminAuth } from '../context/AuthContext';
import styles from './Admins.module.css';

const DEFAULT_PERMS = {
  dashboard: true, analytics: false,
  products: false, comboProducts: false, classifications: false,
  orders: false, payments: false, coupons: false,
  blogs: false, advertisements: false, reviews: false, faq: false, inbox: false,
  users: false, settings: false
};

const PERM_GROUPS = [
  { group: 'Overview', keys: [ { id: 'dashboard', label: 'Dashboard' }, { id: 'analytics', label: 'Analytics' } ] },
  { group: 'Catalog', keys: [ { id: 'products', label: 'Products' }, { id: 'comboProducts', label: 'Combo Products' }, { id: 'classifications', label: 'Classifications' } ] },
  { group: 'Sales', keys: [ { id: 'orders', label: 'Orders' }, { id: 'payments', label: 'Payments' }, { id: 'coupons', label: 'Coupons' } ] },
  { group: 'Content', keys: [ { id: 'blogs', label: 'Blogs' }, { id: 'advertisements', label: 'Ads' }, { id: 'reviews', label: 'Reviews' }, { id: 'faq', label: 'FAQ' }, { id: 'inbox', label: 'Inbox' } ] },
  { group: 'Management', keys: [ { id: 'users', label: 'Students' }, { id: 'settings', label: 'Settings' } ] },
];

export default function Admins() {
  const { admin: me, isSuperAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'admin', permissions: { ...DEFAULT_PERMS } });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await userService.getAdmins();
      setAdmins(res.admins || res.data?.admins || []);
    } catch { toast.error('Failed to load admins'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isSuperAdmin) fetch(); else setLoading(false); }, [isSuperAdmin]);

  const openAdd = () => { 
    setSelected(null); 
    setForm({ name:'', email:'', password:'', role:'admin', permissions: { ...DEFAULT_PERMS } }); 
    setModalOpen(true); 
  };
  
  const openEdit = (a) => { 
    setSelected(a); 
    // If the server returned real permissions, use them directly (filling only missing keys with defaults).
    // If permissions is null/undefined (e.g. old un-migrated record), fall back to all-false defaults.
    const savedPerms = a.permissions && typeof a.permissions === 'object' ? a.permissions : null;
    const mergedPerms = savedPerms
      ? { ...DEFAULT_PERMS, ...savedPerms }   // saved values win over defaults
      : { ...DEFAULT_PERMS };                  // completely new / no data yet
    setForm({ 
      name: a.name || '', 
      email: a.email || '', 
      password: '', 
      role: a.role || 'admin',
      permissions: mergedPerms
    }); 
    setModalOpen(true); 
  };

  const handleSave = async () => {
    if (!selected && (!form.email || !form.password)) { toast.error('Email and password required'); return; }
    setSaving(true);
    try {
      if (selected) {
        const data = { name: form.name, email: form.email, role: form.role };
        if (form.password) data.password = form.password;
        await userService.updateAdmin(selected.id, data);
        await userService.updateAdminPermissions(selected.id, form.permissions);
        toast.success('Admin updated');
      } else {
        const res = await userService.createAdmin(form);
        const createdId = res.admin?.id || res.data?.admin?.id;
        if (createdId) {
          await userService.updateAdminPermissions(createdId, form.permissions);
        }
        toast.success('Admin created');
      }
      setModalOpen(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (id === me?.id) { toast.error('Cannot delete your own account'); return; }
    if (!window.confirm('Delete this admin?')) return;
    try { await userService.deleteAdmin(id); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  if (!isSuperAdmin) return (
    <div className={styles.page}>
      <div className="empty-state"><Shield size={48}/><h3>Super Admin Only</h3><p>You need super admin role to manage staff</p></div>
    </div>
  );

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div><h1 className="page-title">Staff Management</h1><p className="page-sub">{admins.length} admin accounts on system</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetch}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}><UserPlus size={14}/> Add Admin</button>
        </div>
      </div>

      <div className="section-block">
        {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Admin Staff</th><th>Email Address</th><th>Role & Access</th><th>Created On</th><th>Actions</th></tr></thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id} style={{ background: a.id === me?.id ? 'rgba(37,99,235,.03)' : '' }}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad-brand)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, boxShadow: '0 2px 5px rgba(37,99,235,0.2)' }}>
                          {(a.name||'A')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:14 }}>{a.name}</div>
                          {a.id === me?.id && <span className="badge badge-accent" style={{ fontSize:10, marginTop: 2 }}>You</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:13, color:'var(--text-secondary)' }}>{a.email}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <span className={`badge ${a.role==='super_admin'||a.role==='superadmin'?'badge-brand':'badge-info'}`}>
                          {a.role?.replace('_',' ')||'admin'}
                        </span>
                        {a.role !== 'super_admin' && a.role !== 'superadmin' && a.permissions && Object.keys(a.permissions).some(k => a.permissions[k]) && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                            {Object.entries(a.permissions).filter(([k,v]) => !!v).map(([k]) => (
                               <span key={k} style={{ fontSize: 10, background: 'var(--bg-box)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-default)' }}>{k}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{a.createdAt?new Date(a.createdAt).toLocaleDateString('en-IN'):'—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-outline btn-sm" title="Edit Profile & Permissions" onClick={() => openEdit(a)} style={{ padding: '4px 10px', height: 'auto', fontSize: 12 }}>
                          <Pencil size={13} style={{ marginRight: 4 }}/> Edit Access
                        </button>
                        {a.id !== me?.id && <button className="action-btn del" title="Delete" onClick={() => handleDelete(a.id)}><Trash2 size={15}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && <tr><td colSpan={5}><div className="empty-state"><ShieldCheck size={36}/><h3>No admins yet</h3></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal modal-md fade-in">
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Edit Admin & Access' : 'Create New System Admin'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={14}/></button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="Staff Name..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input className="form-input" type="email" placeholder="admin@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">{selected ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                    <input className="form-input" type={showPw?'text':'password'} placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ paddingRight:36 }} />
                    <button type="button" style={{ position:'absolute', right:10, background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)' }} onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Standard Admin</option>
                    <option value="super_admin">Super Admin (Full Access)</option>
                  </select>
                </div>
              </div>

              {form.role === 'admin' && (
                <div style={{ marginTop: 24, padding: 16, borderRadius: 'var(--r-md)', background: 'var(--bg-box)', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <ShieldCheck size={18} color="var(--brand-primary)" />
                    <label className="form-label" style={{ margin: 0, fontSize: 14 }}>Configure Page Access</label>
                  </div>
                  <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
                    Select exactly which pages this admin is allowed to access. Unchecked pages will be blocked and hidden from their menus.
                  </p>
                  
                  <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
                    {PERM_GROUPS.map((group) => (
                      <div key={group.group} style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {group.group}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                          {group.keys.map(({ id, label }) => (
                            <label key={id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)', cursor:'pointer', padding:'8px 10px', borderRadius:'var(--r-md)', background:form.permissions[id]?'var(--color-success-bg)':'var(--bg-card)', border:'1px solid '+(form.permissions[id]?'rgba(16,185,129,0.4)':'var(--border-default)'), transition:'var(--t-fast)' }}>
                              <input type="checkbox" checked={!!form.permissions[id]} onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, [id]: e.target.checked } }))} style={{ width:16, height:16, accentColor:'var(--color-success)', flexShrink: 0 }}/>
                              <span style={{ fontWeight: form.permissions[id] ? 600 : 400, color: form.permissions[id] ? 'var(--color-success)' : '', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {form.role === 'super_admin' && (
                <div style={{ marginTop: 24, padding: 20, borderRadius: 'var(--r-md)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={24} />
                    <strong style={{ fontSize: 16 }}>Full Administrator Access</strong>
                  </div>
                  <p style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>Super Admins automatically receive unrestricted access to all management sections, configurations, and staff access controls.</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className={styles.spin}/> Saving Account...</> : (selected ? 'Update Profile & Access' : 'Create Admin Account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
