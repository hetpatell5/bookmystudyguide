import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Package, Tag, ShoppingCart,
  CreditCard, Ticket, Users, FileText, HelpCircle,
  Settings, LogOut, Shield, BarChart3, Star, Layers,
  GraduationCap, ShieldCheck, Inbox,
  Image, Menu, Briefcase, FolderKanban, Globe, Contact2,
  Home, Layout, Mail, HardDrive, PenLine, Lightbulb, Sparkles
} from 'lucide-react';
import { useAdminAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

const NAV = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/', perm: 'dashboard' },
      { label: 'Analytics', icon: BarChart3, to: '/analytics', perm: 'analytics' },
    ]
  },
  {
    group: 'Sales',
    items: [
      { label: 'Orders', icon: ShoppingCart, to: '/orders', perm: 'orders' },
      { label: 'Payments', icon: CreditCard, to: '/payments', perm: 'payments' },
      { label: 'Coupons', icon: Ticket, to: '/coupons', perm: 'coupons' },
    ]
  },
  {
    group: 'Catalog',
    items: [
      { label: 'Products', icon: BookOpen, to: '/products', perm: 'products' },
      { label: 'Manage Variants', icon: Layers, to: '/manage-variants', perm: 'products' },
      { label: 'Combo Products', icon: Package, to: '/combo-products', perm: 'comboProducts' },
      { label: 'Projects', icon: Briefcase, to: '/projects', perm: 'projects' },
      { label: 'Classifications', icon: Tag, to: '/classifications', perm: 'classifications' },
    ]
  },
  {
    group: 'Content',
    items: [
      { label: 'Blogs', icon: FileText, to: '/blogs', perm: 'blogs' },
      { label: 'Advertisements', icon: Image, to: '/ads', perm: 'advertisements' },
      { label: 'Reviews', icon: Star, to: '/reviews', perm: 'reviews' },
      { label: 'FAQ', icon: HelpCircle, to: '/faq', perm: 'faq' },
      { label: 'Inbox', icon: Inbox, to: '/inbox', perm: 'inbox' },
      { label: 'Home Content', icon: Home, to: '/home-content', perm: 'homeContent' },
      { label: 'Common Pages', icon: Globe, to: '/common-pages', perm: 'commonPages' },
      { label: 'Contact Info', icon: Contact2, to: '/contact-settings', perm: 'contactSettings' },
      { label: 'Featured Sections', icon: Sparkles, to: '/featured-sections', perm: 'homeContent' },
    ]
  },
  {
    group: 'Educational',
    items: [
      { label: 'Synopsis', icon: FolderKanban, to: '/synopsis', perm: 'synopsis' },
      { label: 'IGNOU Cards', icon: Layout, to: '/ignou-cards', perm: 'ignouCards' },
      { label: 'Assignment Inquiries', icon: PenLine, to: '/assignment-inquiries', perm: 'softCopies' },
      { label: 'Project Inquiries', icon: Lightbulb, to: '/project-inquiries', perm: 'projects' },
    ]
  },
  {
    group: 'Management',
    items: [
      { label: 'Students', icon: Users, to: '/users', perm: 'users' },
      { label: 'Staff', icon: ShieldCheck, to: '/admins', superOnly: true },
      { label: 'Settings', icon: Settings, to: '/settings', perm: 'settings' },
    ]
  },
  {
    group: 'Tools',
    items: [
      { label: 'Newsletter', icon: Mail, to: '/newsletter', perm: 'newsletter' },
      { label: 'Storage', icon: HardDrive, to: '/storage', superOnly: true },
    ]
  },
];

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { admin, logout, isSuperAdmin, can } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div className={styles.logoMark}>
            <GraduationCap size={20} />
          </div>
          <div className={styles.logoInfo}>
            <div className={styles.logoTitle}>BMSG Admin</div>
            <div className={styles.logoSub}>BookMyStudyGuide</div>
          </div>
        </div>
        <button className={styles.collapseBtn} onClick={() => setIsCollapsed(!isCollapsed)}>
          <Menu size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map(group => {
          const visible = group.items.filter(item => {
            if (item.superOnly && !isSuperAdmin) return false;
            if (item.perm && !isSuperAdmin && !can(item.perm)) return false;
            return true;
          });
          if (!visible.length) return null;
          return (
            <div key={group.group} className={styles.group}>
              <span className={styles.groupLabel}>{group.group}</span>
              {visible.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
                >
                  <item.icon size={16} className={styles.itemIcon} />
                  <span className={styles.navText}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        {admin && (
          <div className={styles.profile}>
            <div className={styles.avatar}>
              {(admin.name || admin.email || 'A')[0].toUpperCase()}
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{admin.name || 'Admin'}</span>
              <span className={styles.profileRole}>
                <Shield size={9} />
                {(admin.role || 'admin').replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={15} />
          <span className={styles.btnText}>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
