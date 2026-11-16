import axios from 'axios';

const LOCAL_BASE_URL = 'http://localhost:5002';

export const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? LOCAL_BASE_URL
    : `${window.location.protocol}//${window.location.hostname}`);

export const IMAGE_BASE_URL  = 'https://pub-722abff1b9994a85813a69355c83d3c3.r2.dev';
export const R2_PUBLIC_URL   = 'https://pub-722abff1b9994a85813a69355c83d3c3.r2.dev';

const adminLoginPath = new URL('login', window.location.origin + import.meta.env.BASE_URL).pathname;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach token and admin flag to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Attach admin flag so backend knows to include drafted items
  config.params = config.params || {};
  config.params.admin = 'true';

  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminToken');
      if (window.location.pathname !== adminLoginPath) {
        window.location.href = adminLoginPath;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
