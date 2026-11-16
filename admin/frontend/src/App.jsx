import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { AuthProvider, useAuth, useAdminAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Catalog
import Products from './pages/Products';
import ComboBooks from './pages/ComboBooks';
import Projects from './pages/Projects';
import Classifications from './pages/Classifications';
import ManageVariants from './pages/ManageVariants';

// Sales
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Coupons from './pages/Coupons';

// Content
import Blogs from './pages/Blogs';
import Advertisements from './pages/Advertisements';
import Reviews from './pages/Reviews';
import FAQ from './pages/FAQ';
import Inbox from './pages/Inbox';

// Educational
import Synopsis from './pages/Synopsis';
import IgnouCards from './pages/IgnouCards';
import Assignments from './pages/Assignments';
import AssignmentInquiries from './pages/AssignmentInquiries';
import ProjectInquiries from './pages/ProjectInquiries';

// Content Management (extended)
import HomeContent from './pages/HomeContent';
import CommonPages from './pages/CommonPages';
import ContactSettings from './pages/ContactSettings';
import FeaturedSections from './pages/FeaturedSections';

// Tools
import Newsletter from './pages/Newsletter';
import StorageManager from './pages/StorageManager';

// Management
import Users from './pages/Users';
import Admins from './pages/Admins';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

import './styles/index.css';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--brand-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading BMSG Admin...</p>
    </div>
  );
  if (!admin) return <Navigate to="/login" replace />;
  return children;
};

const Forbidden = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', color: 'var(--text-secondary)' }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-box)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-default)', marginBottom: 20 }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Access Restricted</h2>
    <p>You do not have administrative privilege to view this section.</p>
  </div>
);

const PermRoute = ({ perm, superOnly, children }) => {
  const { isSuperAdmin, can } = useAdminAuth();
  if (superOnly && !isSuperAdmin) return <Forbidden />;
  if (perm && !isSuperAdmin && !can(perm)) return <Forbidden />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<PermRoute perm="dashboard"><Dashboard /></PermRoute>} />

            {/* Catalog */}
            <Route path="products" element={<PermRoute perm="products"><Products /></PermRoute>} />
            <Route path="manage-variants" element={<PermRoute perm="products"><ManageVariants /></PermRoute>} />
            <Route path="combo-products" element={<PermRoute perm="comboProducts"><ComboBooks /></PermRoute>} />
            <Route path="projects" element={<PermRoute perm="projects"><Projects /></PermRoute>} />
            <Route path="classifications" element={<PermRoute perm="classifications"><Classifications /></PermRoute>} />

            {/* Sales */}
            <Route path="orders" element={<PermRoute perm="orders"><Orders /></PermRoute>} />
            <Route path="payments" element={<PermRoute perm="payments"><Payments /></PermRoute>} />
            <Route path="coupons" element={<PermRoute perm="coupons"><Coupons /></PermRoute>} />

            {/* Educational */}
            <Route path="synopsis" element={<PermRoute perm="synopsis"><Synopsis /></PermRoute>} />
            <Route path="ignou-cards" element={<PermRoute perm="ignouCards"><IgnouCards /></PermRoute>} />
            <Route path="soft-copies" element={<PermRoute perm="softCopies"><Assignments /></PermRoute>} />
            <Route path="assignment-inquiries" element={<PermRoute perm="softCopies"><AssignmentInquiries /></PermRoute>} />
            <Route path="project-inquiries" element={<PermRoute perm="projects"><ProjectInquiries /></PermRoute>} />

            {/* Content */}
            <Route path="blogs" element={<PermRoute perm="blogs"><Blogs /></PermRoute>} />
            <Route path="ads" element={<PermRoute perm="advertisements"><Advertisements /></PermRoute>} />
            <Route path="reviews" element={<PermRoute perm="reviews"><Reviews /></PermRoute>} />
            <Route path="faq" element={<PermRoute perm="faq"><FAQ /></PermRoute>} />
            <Route path="inbox" element={<PermRoute perm="inbox"><Inbox /></PermRoute>} />
            <Route path="home-content" element={<PermRoute perm="homeContent"><HomeContent /></PermRoute>} />
            <Route path="common-pages" element={<PermRoute perm="commonPages"><CommonPages /></PermRoute>} />
            <Route path="contact-settings" element={<PermRoute perm="contactSettings"><ContactSettings /></PermRoute>} />
            <Route path="featured-sections" element={<PermRoute perm="homeContent"><FeaturedSections /></PermRoute>} />

            {/* Tools */}
            <Route path="newsletter" element={<PermRoute perm="newsletter"><Newsletter /></PermRoute>} />
            <Route path="storage" element={<PermRoute superOnly><StorageManager /></PermRoute>} />

            {/* Management */}
            <Route path="users" element={<PermRoute perm="users"><Users /></PermRoute>} />
            <Route path="admins" element={<PermRoute superOnly><Admins /></PermRoute>} />
            <Route path="analytics" element={<PermRoute perm="analytics"><Analytics /></PermRoute>} />
            <Route path="settings" element={<PermRoute perm="settings"><Settings /></PermRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}