import { useState, useEffect } from 'react';
import { Mail, Users, TrendingUp, Download, Search, RefreshCw, Calendar } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contentService from '../services/contentService';
import styles from './Newsletter.module.css';

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchSubscribers(); }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await contentService.getSubscribers();
      const list = res.subscribers || res.data?.subscribers || res.data || res || [];
      setSubscribers(Array.isArray(list) ? list : []);
    } catch { toast.error('Failed to load subscribers'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const rows = [
      ['#', 'Email', 'Subscribed On'],
      ...filtered.map((s, i) => [
        i + 1,
        s.email,
        new Date(s.createdAt).toLocaleDateString('en-IN'),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported successfully');
  };

  const thisMonth = subscribers.filter(s => {
    const d = new Date(s.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const last7 = subscribers.filter(s =>
    (Date.now() - new Date(s.createdAt)) < 7 * 24 * 60 * 60 * 1000
  ).length;

  const filtered = subscribers.filter(s =>
    !search || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Newsletter</h1>
          <p className="page-sub">Manage email subscribers</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchSubscribers}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(26,60,110,.1)', color: 'var(--brand-primary)' }}>
            <Users size={16} />
          </div>
          <div className="stat-body">
            <div className="stat-label">Total Subscribers</div>
            <div className="stat-value">{subscribers.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(200,169,81,.1)', color: 'var(--brand-secondary)' }}>
            <Mail size={16} />
          </div>
          <div className="stat-body">
            <div className="stat-label">This Month</div>
            <div className="stat-value">{thisMonth}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}>
            <TrendingUp size={16} />
          </div>
          <div className="stat-body">
            <div className="stat-label">Last 7 Days</div>
            <div className="stat-value">{last7}</div>
          </div>
        </div>
      </div>

      <div className="section-block">
        {/* Search bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <Search size={14} />
            <input
              className="search-input"
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} of {subscribers.length} subscribers
          </span>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Mail size={40} strokeWidth={1.2} />
            <h3>{search ? 'No matching subscribers' : 'No subscribers yet'}</h3>
            <p>{search ? 'Try a different search term' : 'Subscribers will appear here once someone signs up'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Email</th>
                  <th>Subscribed On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={styles.emailAvatar}>{s.email?.[0]?.toUpperCase() || '?'}</div>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{s.email}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Calendar size={11} />
                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td><span className="badge badge-success">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
