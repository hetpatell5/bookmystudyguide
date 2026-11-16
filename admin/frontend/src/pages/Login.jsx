import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, BookOpen, Loader2, GraduationCap, ShieldCheck } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, admin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const theme = localStorage.getItem('bmsg-theme');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, []);

  if (admin) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    const result = await login(email, password, remember);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/');
    } else {
      toast.error(result.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />

      {/* Left panel */}
      <div className={styles.left}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}><GraduationCap size={22} /></div>
          <span className={styles.brandName}>BookMyStudyGuide</span>
        </div>
        <div className={styles.hero}>
          <div className={styles.heroCircle}>
            <BookOpen size={48} strokeWidth={1.5} />
          </div>
          <h2 className={styles.heroTitle}>Admin Control Center</h2>
          <p className={styles.heroDesc}>
            Manage study materials, orders, and thousands of university students across India — all from one place.
          </p>
          <div className={styles.pills}>
            {['Products', 'Orders', 'Students', 'Analytics', 'Coupons', 'Content'].map(p => (
              <span key={p} className={styles.pill}>{p}</span>
            ))}
          </div>
        </div>
        <div className={styles.leftFooter}>
          <ShieldCheck size={13} />
          <span>Secure Portal · BookMyStudyGuide.com</span>
        </div>
      </div>

      {/* Right panel */}
      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.lockIcon}><Lock size={18} /></div>
            <h1 className={styles.title}>Sign In</h1>
            <p className={styles.subtitle}>Enter your admin credentials</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} autoComplete="on">
            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} size={15} />
                <input
                  className={styles.input}
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} size={15} />
                <input
                  className={styles.input}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className={styles.eye} onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <label className={styles.rememberRow}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className={styles.checkbox} />
              <span>Remember me</span>
            </label>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <><Loader2 size={15} className={styles.spin} /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className={styles.note}>
            <ShieldCheck size={11} />
            Protected area. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
