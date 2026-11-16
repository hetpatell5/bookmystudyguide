import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Download, RefreshCw, Mail, Phone, GraduationCap } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import userService from '../services/userService';
import styles from './Users.module.css';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers();
      const data = res?.users || res?.data?.users || res?.data || res || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to fetch users'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
      || (u.course||'').toLowerCase().includes(q) || (u.university||'').toLowerCase().includes(q)
      || (u.phoneno||'').includes(q);
  });

  const exportCSV = () => {
    const h = ['Name','Email','Phone','Course','University'];
    const rows = filtered.map(u => [u.name,u.email,u.phoneno,u.course,u.university].map(v => `"${v||''}"`));
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `bmsg_users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success('Exported!');
  };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-sub">{users.length} registered accounts</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetch}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}><Download size={13}/> Export CSV</button>
        </div>
      </div>

      <div className="section-block">
        <div className="filter-bar">
          <div className="search-wrap">
            <Search size={14}/>
            <input className="search-input" placeholder="Search name, email, course, university..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>{filtered.length} results</span>
        </div>

        {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Student</th><th>Contact</th><th>Course</th><th>University</th><th>Address</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id || u._id}>
                    <td style={{ color:'var(--text-faint)', fontSize:12 }}>{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--grad-brand)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {(u.name||'?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{u.name||'—'}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.role||'user'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize:12, display:'flex', flexDirection:'column', gap:2 }}>
                        {u.email && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={11}/> {u.email}</span>}
                        {u.phoneno && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/> {u.phoneno}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {u.course ? <span style={{ display:'flex', alignItems:'center', gap:4 }}><GraduationCap size={12}/> {u.course}</span> : '—'}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{u.university||'—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{u.address||'—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><UsersIcon size={36}/><h3>No students found</h3></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
