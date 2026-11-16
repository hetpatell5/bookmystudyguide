import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, ShoppingBag, IndianRupee, Box,
  Clock, CheckCircle2, PackageOpen, CreditCard,
  Calendar, FileText, BarChart3, RefreshCw, AlertCircle,
  Truck, TrendingDown, TrendingUp, ArrowRight, Zap,
  Tag, Image, Star, MessageSquare
} from 'lucide-react';
import orderService from '../services/orderService';
import userService from '../services/userService';
import inventoryService from '../services/inventoryService';
import analyticsService from '../services/analyticsService';
import { useAdminAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';

const C = {
  primary: '#2563eb', success: '#059669', warning: '#d97706',
  danger: '#dc2626', purple: '#7c3aed', cyan: '#0891b2', orange: '#ea580c',
};

const statusStyle = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'delivered')  return { bg: 'rgba(5,150,105,.1)',  text: '#059669' };
  if (v === 'pending')    return { bg: 'rgba(217,119,6,.1)',  text: '#d97706' };
  if (v === 'processing') return { bg: 'rgba(37,99,235,.1)',  text: '#2563eb' };
  if (v === 'cancelled')  return { bg: 'rgba(220,38,38,.1)',  text: '#dc2626' };
  return { bg: 'var(--gray-100)', text: 'var(--text-muted)' };
};

const tt = {
  background: 'var(--bg-card)', border: '1px solid var(--border-default)',
  borderRadius: 10, color: 'var(--text-primary)', fontSize: 12,
  boxShadow: 'var(--shadow-md)',
};

export default function Dashboard() {
  const { admin } = useAdminAuth();
  const [orders,    setOrders]    = useState([]);
  const [users,     setUsers]     = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersR, ordersR, prodsR] = await Promise.all([
        userService.getUsers(),
        orderService.getAllOrders(),
        inventoryService.getProducts(),
        analyticsService.getDeepInsights().catch(() => null),
      ]);
      setUsers(   Array.isArray(usersR?.users  || usersR?.data || usersR) ? (usersR.users || usersR.data || usersR) : []);
      setOrders(  Array.isArray(ordersR?.data  || ordersR)     ? (ordersR.data || ordersR) : []);
      setProducts(Array.isArray(prodsR?.data   || prodsR)      ? (prodsR.data  || prodsR)  : []);
    } catch (err) {
      console.error('Dashboard:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const totalRevenue  = orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const pendingCount  = orders.filter(o => o.status?.toLowerCase() === 'pending').length;
  const deliveredCnt  = orders.filter(o => o.status?.toLowerCase() === 'delivered').length;
  const cancelledCnt  = orders.filter(o => o.status?.toLowerCase() === 'cancelled').length;
  const processingCnt = orders.filter(o => o.status?.toLowerCase() === 'processing').length;
  const todayOrders   = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length;
  const todayRevenue  = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString() && o.paymentStatus === 'Paid').reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const paidOrders    = orders.filter(o => o.paymentStatus === 'Paid').length;

  const salesData = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      if (!map[key]) map[key] = { name: label, orders: 0, revenue: 0 };
      map[key].orders++;
      if (o.paymentStatus === 'Paid') map[key].revenue += Number(o.amount) || 0;
    });
    return Object.values(map).slice(-6);
  }, [orders]);

  const statusData = useMemo(() => [
    { name: 'Delivered',  value: deliveredCnt,  fill: C.success },
    { name: 'Processing', value: processingCnt, fill: C.primary },
    { name: 'Pending',    value: pendingCount,  fill: C.warning },
    { name: 'Cancelled',  value: cancelledCnt,  fill: C.danger  },
  ].filter(d => d.value > 0), [deliveredCnt, processingCnt, pendingCount, cancelledCnt]);

  const daily7 = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      map[k] = { date: d.toLocaleDateString('en-IN', { weekday: 'short' }), count: 0 };
    }
    orders.forEach(o => {
      const k = new Date(o.createdAt).toISOString().slice(0, 10);
      if (map[k]) map[k].count++;
    });
    return Object.values(map);
  }, [orders]);

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner spinner-lg" />
      <span>Loading dashboard…</span>
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const QUICK_LINKS = [
    { to: '/products',  label: 'Add Product',  icon: Box,         color: C.purple,  bg: 'rgba(124,58,237,.09)' },
    { to: '/orders',    label: 'View Orders',  icon: ShoppingBag, color: C.primary, bg: 'rgba(37,99,235,.09)'  },
    { to: '/payments',  label: 'Payments',     icon: CreditCard,  color: C.success, bg: 'rgba(5,150,105,.09)'  },
    { to: '/coupons',   label: 'Coupons',      icon: Tag,         color: C.warning, bg: 'rgba(217,119,6,.09)'  },
    { to: '/blogs',     label: 'Blogs',        icon: FileText,    color: C.orange,  bg: 'rgba(234,88,12,.09)'  },
    { to: '/analytics', label: 'Analytics',    icon: BarChart3,   color: C.cyan,    bg: 'rgba(8,145,178,.09)'  },
  ];

  return (
    <div className={styles.page}>

      {/* ── Welcome Banner ── */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeGreeting}>
            {greeting}, {admin?.name || 'Admin'} 👋
          </div>
          <div className={styles.welcomeSub}>
            Here's what's happening with BookMyStudyGuide today
          </div>
        </div>
        <div className={styles.welcomeRight}>
          <div className={styles.welcomeDateChip}>
            <Calendar size={13} />
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button className={styles.refreshBtn} onClick={fetchAll}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Alert ── */}
      {pendingCount > 0 && (
        <div className={styles.alert}>
          <AlertCircle size={14} />
          <span>{pendingCount} order{pendingCount > 1 ? 's' : ''} are waiting for action</span>
          <Link to="/orders" className={styles.alertLink}>View Orders →</Link>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className={styles.kpiRow}>
        {/* Revenue — highlighted */}
        <div className={`${styles.kpi} ${styles.kpiHighlight}`} style={{ '--kpi-accent': C.primary }}>
          <div className={styles.kpiTop}>
            <div className={styles.kpiIcon}><IndianRupee size={20} /></div>
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Revenue</div>
            <div className={styles.kpiVal}>₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div className={styles.kpiTag}>Lifetime paid orders</div>
          </div>
        </div>

        {/* Orders */}
        <Link to="/orders" className={styles.kpi} style={{ '--kpi-accent': C.primary }}>
          <div className={styles.kpiTop}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(37,99,235,.1)', color: C.primary }}><ShoppingBag size={20} /></div>
            <div className={`${styles.kpiTrend} ${styles.kpiTrendNeutral}`}>{todayOrders} today</div>
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Orders</div>
            <div className={styles.kpiVal}>{orders.length}</div>
            <div className={styles.kpiTag} style={{ color: C.warning }}><Clock size={10} /> {pendingCount} pending</div>
          </div>
        </Link>

        {/* Students */}
        <Link to="/users" className={styles.kpi} style={{ '--kpi-accent': C.purple }}>
          <div className={styles.kpiTop}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(124,58,237,.1)', color: C.purple }}><Users size={20} /></div>
            <div className={`${styles.kpiTrend} ${styles.kpiTrendUp}`}><TrendingUp size={10} /> Active</div>
          </div>
          <div>
            <div className={styles.kpiLabel}>Students</div>
            <div className={styles.kpiVal}>{users.length}</div>
            <div className={styles.kpiTag}>Registered accounts</div>
          </div>
        </Link>

        {/* Products */}
        <Link to="/products" className={styles.kpi} style={{ '--kpi-accent': C.success }}>
          <div className={styles.kpiTop}>
            <div className={styles.kpiIcon} style={{ background: 'rgba(5,150,105,.1)', color: C.success }}><Box size={20} /></div>
            <div className={`${styles.kpiTrend} ${styles.kpiTrendUp}`}><CheckCircle2 size={10} /> Active</div>
          </div>
          <div>
            <div className={styles.kpiLabel}>Products</div>
            <div className={styles.kpiVal}>{products.length}</div>
            <div className={styles.kpiTag}>
              Study materials
            </div>
          </div>
        </Link>
      </div>

      {/* ── Secondary Stats ── */}
      <div className={styles.statsGrid}>
        <StatCard icon={<Calendar size={16}/>}      bg="rgba(139,92,246,.1)"  color="#7c3aed" label="Today Orders"  value={todayOrders} />
        <StatCard icon={<CheckCircle2 size={16}/>}  bg="rgba(5,150,105,.1)"   color="#059669" label="Delivered"     value={deliveredCnt} />
        <StatCard icon={<PackageOpen size={16}/>}   bg="rgba(37,99,235,.1)"   color="#2563eb" label="Processing"    value={processingCnt} />
        <StatCard icon={<TrendingDown size={16}/>}  bg="rgba(220,38,38,.1)"   color="#dc2626" label="Cancelled"     value={cancelledCnt} />
        <StatCard icon={<Truck size={16}/>}         bg="rgba(234,88,12,.1)"   color="#ea580c" label="Today Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} />
        <StatCard icon={<CreditCard size={16}/>}    bg="rgba(8,145,178,.1)"   color="#0891b2" label="Paid Orders"   value={paidOrders} />
        <StatCard icon={<FileText size={16}/>}      bg="rgba(5,150,105,.1)"   color="#059669" label="Active Products" value={products.filter(p => p.isActive !== false).length} />
        <StatCard icon={<Users size={16}/>}         bg="rgba(245,158,11,.1)"  color="#f59e0b" label="Students"      value={users.length} />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className={styles.chartsRow}>
        {/* Revenue & Orders trend */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrap}>
              <span className={styles.chartTitle}>Revenue & Orders Trend</span>
              <span className={styles.chartSub}>Last 6 months overview</span>
            </div>
            <span className={styles.chartBadge}>Monthly</span>
          </div>
          <div className={styles.chartDivider} />
          <div className={styles.chartBody} style={{ paddingTop: 16 }}>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.primary} stopOpacity={.2} />
                    <stop offset="95%" stopColor={C.primary} stopOpacity={.02} />
                  </linearGradient>
                  <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.success} stopOpacity={.15} />
                    <stop offset="95%" stopColor={C.success} stopOpacity={.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                <Tooltip contentStyle={tt} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke={C.primary} fill="url(#gR)" name="Revenue (₹)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="orders"  stroke={C.success} fill="url(#gO)" name="Orders"      strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status donut */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrap}>
              <span className={styles.chartTitle}>Order Status</span>
              <span className={styles.chartSub}>Distribution breakdown</span>
            </div>
          </div>
          <div className={styles.chartDivider} />
          <div className={styles.chartBody} style={{ paddingTop: 10 }}>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={58} outerRadius={85} paddingAngle={5} dataKey="value">
                  {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={tt} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className={styles.chartsRowEqual}>
        {/* Daily orders line chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrap}>
              <span className={styles.chartTitle}>Daily Orders</span>
              <span className={styles.chartSub}>Last 7 days</span>
            </div>
          </div>
          <div className={styles.chartDivider} />
          <div className={styles.chartBody} style={{ paddingTop: 14 }}>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={daily7}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                <Tooltip contentStyle={tt} />
                <Line
                  type="monotone" dataKey="count" stroke={C.cyan} strokeWidth={2.5}
                  dot={{ r: 4, fill: C.cyan, stroke: 'white', strokeWidth: 2 }}
                  activeDot={{ r: 6 }} name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleWrap}>
              <span className={styles.chartTitle}>Quick Actions</span>
              <span className={styles.chartSub}>Jump to key sections</span>
            </div>
            <Zap size={16} color={C.warning} />
          </div>
          <div className={styles.chartDivider} />
          <div className={styles.quickActions}>
            {QUICK_LINKS.map(({ to, label, icon: Icon, color, bg }) => (
              <Link
                key={to}
                to={to}
                className={styles.quickAction}
                style={{ background: bg, color, borderColor: `${color}22` }}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Orders ── */}
      <div className={styles.recentOrders}>
        <div className={styles.recentHeader}>
          <div className={styles.recentTitleWrap}>
            <div className={styles.recentIconWrap}><ShoppingBag size={14} /></div>
            <span className={styles.recentTitle}>Recent Orders</span>
          </div>
          <Link to="/orders" className={styles.viewAllBtn}>
            View All <ArrowRight size={12} />
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map(o => {
                const sc = statusStyle(o.status);
                return (
                  <tr key={o.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-secondary)', fontWeight: 700 }}>
                        #{(o.orderId || o.id || '').toString().slice(0, 10)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.customerName || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{Number(o.amount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${o.paymentStatus === 'Paid' ? 'badge-success' : o.paymentStatus === 'Partial' ? 'badge-warning' : 'badge-neutral'}`}>
                        {o.paymentStatus || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: sc.bg, color: sc.text }}>{o.status || 'Pending'}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <ShoppingBag size={40} />
                      <h3>No orders yet</h3>
                      <p>Orders will appear here once customers start buying</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function StatCard({ icon, bg, color, label, value }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: bg, color }}>{icon}</div>
      <div className={styles.statBody}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}
