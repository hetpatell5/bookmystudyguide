import { useState, useEffect } from 'react';
import { MessageSquare, Users, Mail, Star, Trash2, Download, Search, Calendar, RefreshCw, Inbox as InboxIcon } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contentService from '../services/contentService';
import styles from './Inbox.module.css';

export default function Inbox() {
  const [tab, setTab] = useState('feedback');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'feedback') {
        const res = await contentService.getFeedback();
        setFeedbacks(res.feedbacks || res.data?.feedbacks || res.data || res || []);
      } else {
        const res = await contentService.getSubscribers();
        setSubscribers(res.subscribers || res.data?.subscribers || res.data || res || []);
      }
    } catch { toast.error(`Failed to load ${tab}`); }
    finally { setLoading(false); }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try { await contentService.deleteFeedback(id); setFeedbacks(f => f.filter(x => x.id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const exportCSV = () => {
    const rows = [['Email', 'Subscribed On'], ...subscribers.map(s => [s.email, new Date(s.createdAt).toLocaleDateString('en-IN')])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported!');
  };

  const displayFeedbacks = feedbacks.filter(f =>
    !search ||
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase()) ||
    f.message?.toLowerCase().includes(search.toLowerCase())
  );

  const displaySubscribers = subscribers.filter(s => !search || s.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000}/>

      <div className="page-header">
        <div><h1 className="page-title">Inbox</h1><p className="page-sub">User feedback and newsletter subscribers</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchData}><RefreshCw size={13}/> Refresh</button>
          {tab === 'subscribers' && (
            <button className="btn btn-primary btn-sm" onClick={exportCSV}><Download size={13}/> Export CSV</button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
          <MessageSquare size={14}/> Feedback {feedbacks.length > 0 && <span className="badge badge-accent" style={{ marginLeft:4 }}>{feedbacks.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'subscribers' ? 'active' : ''}`} onClick={() => setTab('subscribers')}>
          <Users size={14}/> Subscribers {subscribers.length > 0 && <span className="badge badge-info" style={{ marginLeft:4 }}>{subscribers.length}</span>}
        </button>
      </div>

      <div style={{ marginBottom:14 }}>
        <div className="search-wrap">
          <Search size={14}/>
          <input className="search-input" type="text" placeholder={tab === 'feedback' ? 'Search by name, email, message...' : 'Search subscribers...'} value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg"/><span>Loading...</span></div>
      ) : tab === 'feedback' ? (
        // Feedback Cards
        <div className={styles.feedbackGrid}>
          {displayFeedbacks.length === 0 ? (
            <div className="empty-state" style={{ gridColumn:'1/-1' }}><MessageSquare size={40}/><h3>No feedback yet</h3><p>User feedback and contact messages will appear here</p></div>
          ) : (
            displayFeedbacks.slice().reverse().map(f => (
              <div key={f.id} className={styles.feedbackCard}>
                <div className={styles.cardTop}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className={styles.avatar}>{(f.name || 'U')[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{f.name || 'Anonymous'}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}><Mail size={10}/> {f.email || '—'}</div>
                    </div>
                  </div>
                  {f.rating && (
                    <div style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 8px', background:'rgba(251,191,36,.1)', borderRadius:'var(--r-sm)', color:'#d97706', fontSize:12, fontWeight:700 }}>
                      <Star size={12} fill="#d97706" stroke="none"/> {f.rating}
                    </div>
                  )}
                </div>
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, margin:'10px 0', flex:1 }}>{f.message || f.feedback || '—'}</p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                    <Calendar size={11}/>
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : '—'}
                  </div>
                  <button className="action-btn del" onClick={() => deleteFeedback(f.id)}><Trash2 size={13}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Subscribers Table
        <div className="section-block">
          {displaySubscribers.length === 0 ? (
            <div className="empty-state"><Users size={40}/><h3>No subscribers yet</h3><p>Newsletter subscribers will appear here</p></div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr><th>Email</th><th>Subscribed On</th><th>Status</th></tr></thead>
                <tbody>
                  {displaySubscribers.slice().reverse().map(s => (
                    <tr key={s.id}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><Mail size={13} color="var(--text-muted)"/>{s.email}</div></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : '—'}
                      </td>
                      <td><span className="badge badge-success">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
