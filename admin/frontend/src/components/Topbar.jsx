import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Moon, Sun, LogOut, Bell, Plus, Box, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AuthContext';
import settingsService from '../services/settingsService';
import styles from './Topbar.module.css';

const DEFAULT_LINKS = [
  {
    icon: 'Layers',
    title: 'Classifications',
    menus: [
      { label: 'Books', to: '/classifications?tab=books' },
      { label: 'Main Degrees', to: '/classifications?tab=mainDegrees' },
      { label: 'Sub Degrees', to: '/classifications?tab=subDegrees' },
      { label: 'Subjects', to: '/classifications?tab=subjects' },
    ]
  },
  {
    icon: 'Package',
    title: 'Products',
    menus: [
      { label: 'All Products', to: '/products' },
      { label: 'Combo Bundles', to: '/combo-products' },
    ]
  },
  {
    icon: 'ShoppingCart',
    title: 'Orders',
    menus: [
      { label: 'View Orders', to: '/orders' },
    ]
  }
];

const ROUTE_PERM_MAP = {
  '/products': 'products',
  '/combo-products': 'comboProducts',
  '/classifications': 'classifications',
  '/orders': 'orders',
  '/payments': 'payments',
  '/coupons': 'coupons',
  '/blogs': 'blogs',
  '/ads': 'advertisements',
  '/reviews': 'reviews',
  '/faq': 'faq',
  '/inbox': 'inbox',
  '/users': 'users',
  '/settings': 'settings'
};

const Topbar = () => {
  const { admin, logout, isSuperAdmin, can } = useAdminAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('bmsg-theme') === 'dark');
  const [quickLinks, setQuickLinks] = useState(DEFAULT_LINKS);

  useEffect(() => {
    // Fetch dynamic quick links
    settingsService.getConfig().then(res => {
      if (res?.data) {
        const qlConfig = res.data.find(c => c.key === 'QUICK_LINKS');
        if (qlConfig && qlConfig.value) {
          try {
            const parsed = JSON.parse(qlConfig.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setQuickLinks(parsed);
            }
          } catch (e) {
            console.error('Failed to parse Quick Links configuration');
          }
        }
      }
    }).catch(err => console.log('Config load silent fail'));
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('bmsg-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('bmsg-theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙';

  const initials = admin?.name
    ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  const hasMenuAccess = (url) => {
    if (isSuperAdmin) return true;
    const base = url.split('?')[0]; 
    const reqPerm = ROUTE_PERM_MAP[base];
    if (!reqPerm) return false; // Fail secure, only render known tracking paths
    return can(reqPerm);
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles.greeting}>
          {emoji} {greeting}, <strong className={styles.adminName}>{admin?.name || 'Admin'}</strong>
        </span>
      </div>

      <div className={styles.right}>
        {/* Quick Links */}
        <div className={styles.quickLinksGroup}>
          {quickLinks.map((link, i) => {
            const iconName = link.icon ? link.icon.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') : 'Box';
            const Icon = Icons[iconName] || Box;
            
            const visibleMenus = (link.menus || []).filter(m => hasMenuAccess(m.to));
            if (visibleMenus.length === 0) return null;

            return (
              <div key={i} className={styles.quickItem}>
                <button className={styles.quickBtn} title={link.title}>
                  <Icon size={16} />
                </button>
                <div className={styles.quickDropdown}>
                  <div className={styles.quickHeader}>{link.title}</div>
                  {visibleMenus.map((m, idx) => (
                    <Link key={idx} to={m.to} className={styles.quickLink}>
                      {m.label}
                      <span className={styles.quickLinkAdd} title={`Add ${m.label}`} onClick={(e) => {
                        // Prevent navigation duplication if they just want the Add action?
                        // If they click +, it navigates there anyway.
                      }}>
                        <Plus size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          
          {isSuperAdmin && (
            <button className={styles.iconBtn} title="Edit Quick Links" onClick={() => navigate('/settings?tab=quick-links')} style={{ marginLeft: 4, width: 28, height: 28 }}>
              <SettingsIcon size={14} />
            </button>
          )}
        </div>

        <div className={styles.divider} />

        <button
          className={styles.iconBtn}
          onClick={() => setDarkMode(d => !d)}
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className={styles.iconBtn} title="Notifications">
          <Bell size={16} />
        </button>

        <div className={styles.divider} />

        <div className={styles.userChip}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{admin?.name || 'Admin'}</span>
            <span className={styles.userRole}>{admin?.role?.replace('_', ' ') || 'Admin'}</span>
          </div>
        </div>

        <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
