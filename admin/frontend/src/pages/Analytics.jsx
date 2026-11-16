import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, TrendingUp, Users, ShoppingBag, IndianRupee } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import analyticsService from '../services/analyticsService';
import styles from './Analytics.module.css';

const C = { primary:'#2563eb', success:'#059669', warning:'#d97706', danger:'#dc2626', purple:'#7c3aed', cyan:'#0891b2', orange:'#ea580c' };
const tt = { background:'var(--bg-card)', border:'1px solid var(--border-default)', borderRadius:10, color:'var(--text-primary)', fontSize:12 };

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [period, setPeriod] = useState('last30Days');

  const fetch = async (s, e) => {
    setLoading(true);
    try {
      const res = await analyticsService.getDeepInsights(s, e);
      setData(res?.data?.data || res?.data || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleApply = () => { if (startDate && endDate) fetch(startDate, endDate); };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg"/><span>Loading analytics...</span></div>;

  const stats = data?.stats || {};
  const trend  = data?.trend  || [];
  const topProducts = data?.topProducts || [];
  const geoData = data?.geo || [];

  return (
    <div className={styles.page}>
      <div className="page-header">
        <div><h1 className="page-title">Analytics</h1><p className="page-sub">Deep business insights</p></div>
        <div className="page-actions">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" style={{ width:140 }}/>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" style={{ width:140 }}/>
          <button className="btn btn-primary btn-sm" onClick={handleApply} disabled={!startDate||!endDate}>Apply</button>
          <button className="btn btn-outline btn-sm" onClick={() => fetch()}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Period filters */}
      <div style={{ display:'flex', gap:6, marginBottom:4 }}>
        {[['today','Today'],['last7Days','7 Days'],['last30Days','30 Days'],['allTime','All Time']].map(([f,l]) => (
          <button key={f} className={`btn btn-sm ${period===f?'btn-primary':'btn-outline'}`} onClick={() => { setPeriod(f); }}>{l}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background:'rgba(37,99,235,.1)', color:C.primary }}><IndianRupee size={16}/></div><div className="stat-body"><div className="stat-label">Total Revenue</div><div className="stat-value">&#x20B9;{(stats.totalRevenue||0).toLocaleString('en-IN')}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'rgba(5,150,105,.1)', color:C.success }}><ShoppingBag size={16}/></div><div className="stat-body"><div className="stat-label">Total Orders</div><div className="stat-value">{stats.totalOrders||0}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'rgba(124,58,237,.1)', color:C.purple }}><Users size={16}/></div><div className="stat-body"><div className="stat-label">Total Users</div><div className="stat-value">{stats.totalUsers||0}</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'rgba(245,158,11,.1)', color:'#f59e0b' }}><TrendingUp size={16}/></div><div className="stat-body"><div className="stat-label">Avg Order Value</div><div className="stat-value">&#x20B9;{Math.round(stats.avgOrderValue||0).toLocaleString('en-IN')}</div></div></div>
      </div>

      {/* Charts */}
      {trend.length > 0 && (
        <div className="section-block">
          <div className="section-header"><span className="section-title">Revenue Trend</span></div>
          <div style={{ padding:'16px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.primary} stopOpacity={.22}/>
                    <stop offset="95%" stopColor={C.primary} stopOpacity={.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'var(--text-faint)', fontSize:11 }}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-faint)', fontSize:11 }}/>
                <Tooltip contentStyle={tt}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                <Area type="monotone" dataKey="revenue" stroke={C.primary} fill="url(#tGrad)" name="Revenue (Rs.)" strokeWidth={2}/>
                <Area type="monotone" dataKey="orders" stroke={C.success} fill="rgba(5,150,105,.06)" name="Orders" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, flexWrap:'wrap' }}>
        {topProducts.length > 0 && (
          <div className="section-block">
            <div className="section-header"><span className="section-title">Top Products</span></div>
            <div style={{ padding:'14px' }}>
              <table className="data-table">
                <thead><tr><th>Product</th><th>Sales</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topProducts.slice(0,10).map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:600, fontSize:12 }}>{p.title||p.name||'—'}</td>
                      <td>{p.totalSold||p.quantity||'—'}</td>
                      <td>&#x20B9;{Number(p.revenue||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.periods && (
          <div className="section-block">
            <div className="section-header"><span className="section-title">Period Comparison</span></div>
            <div style={{ padding:'14px' }}>
              {Object.entries(stats.periods).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textTransform:'capitalize' }}>{k.replace(/([A-Z])/g,' $1').trim()}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>&#x20B9;{Number(v.revenue||0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{v.count||0} orders</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!data && !loading && (
        <div className="empty-state">
          <BarChart3 size={48}/>
          <h3>No analytics data</h3>
          <p>Analytics will appear once orders start coming in</p>
        </div>
      )}
    </div>
  );
}
