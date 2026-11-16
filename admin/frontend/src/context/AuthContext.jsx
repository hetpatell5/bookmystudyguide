import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      if (token) {
        try {
          const res = await api.get('/api/admin/me');
          setAdmin({ ...(res.data.admin || res.data), token });
        } catch {
          localStorage.removeItem('adminToken');
          sessionStorage.removeItem('adminToken');
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      const res = await api.post('/api/admin/login', { email, password });
      const { token, admin: adminData } = res.data;
      if (rememberMe) {
        localStorage.setItem('adminToken', token);
      } else {
        localStorage.setItem('adminToken', token);
        sessionStorage.setItem('adminToken', token);
      }
      setAdmin({ ...adminData, token });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed. Check credentials.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    setAdmin(null);
  };

  const refreshMe = async () => {
    try {
      const res = await api.get('/api/admin/me');
      setAdmin(prev => ({ ...prev, ...(res.data.admin || res.data) }));
    } catch { /* silent */ }
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useAdminAuth = () => {
  const ctx = useContext(AuthContext);
  const role = ctx.admin?.role || '';
  const isSuperAdmin = role === 'super_admin' || role === 'superadmin';
  const permissions  = ctx.admin?.permissions || {};
  const can = (key) => {
    if (isSuperAdmin) return true;
    const parts = key.split('.');
    let val = permissions;
    for (const p of parts) {
      if (val == null) return false;
      val = val[p];
    }
    return !!val;
  };
  return { ...ctx, isSuperAdmin, permissions, can };
};
