import axios from "axios";

// Base URL Configuration
// Backend typically runs on port 5002, frontend on 3000
// const LIVE_BASE_URL = "https://www.bookmystudyguide.com"; // Live backend
const LOCAL_BASE_URL = "http://localhost:5002"; // Local backend

// Use environment variable or detect from window.location
export const BASE_URL = process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost' ? "http://localhost:5002" : `${window.location.protocol}//${window.location.hostname}`);

// Image Base URL - used for rendering images from /uploads
export const IMAGE_BASE_URL = "https://pub-722abff1b9994a85813a69355c83d3c3.r2.dev";

// R2 Public URL - used for direct cloud storage access
export const R2_PUBLIC_URL = "https://pub-722abff1b9994a85813a69355c83d3c3.r2.dev";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// 🔐 Token interceptor - Check both localStorage and sessionStorage
api.interceptors.request.use((config) => {
  const userToken =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }

  return config;
});

// 🔁 RESPONSE interceptor (standardization & error handling)
api.interceptors.response.use(
  (response) => {
    // If the backend returned the standardized { success, data } format,
    // we can optionally unwrap it here or just pass it through.
    // To minimize breaking changes while supporting the new format:
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      // We keep the original response structure but add a convenience property
      // Or we can just let components handle it since many already use .data?.data
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Clear tokens and notify the app
    if (error.response?.status === 401) {
      const hadToken = localStorage.getItem("token") || sessionStorage.getItem("token");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      if (hadToken) {
        window.dispatchEvent(new Event("auth:expired"));
      }
    }

    // Already retried? then reject
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Local backend down → switch to live (only in development)
    if (
      (error.code === "ERR_NETWORK" ||
        error.message?.includes("Network Error")) &&
      BASE_URL === LOCAL_BASE_URL
    ) {
      originalRequest._retry = true;
      // originalRequest.baseURL = LIVE_BASE_URL;

      console.warn("⚠️ Local backend not available. Switching to LIVE backend");

      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);

// 🚀 FRONTEND OPTIMIZATION: In-Memory API Cache
// Caches heavy public GET requests for 5 minutes to ensure instant rendering on repeated visits
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Export a way to clear cache manually if needed
export const clearApiCache = () => {
    console.log("🧹 Clearing API Cache...");
    apiCache.clear();
};

const originalGet = api.get;
const originalPost = api.post;
const originalPut = api.put;
const originalPatch = api.patch;
const originalDelete = api.delete;

// Auto-clear cache on mutations
const wrapMutation = (method) => async (...args) => {
    try {
        const response = await method.apply(api, args);
        if (response.status >= 200 && response.status < 300) {
            clearApiCache();
        }
        return response;
    } catch (err) {
        throw err;
    }
};

api.post = wrapMutation(originalPost);
api.put = wrapMutation(originalPut);
api.patch = wrapMutation(originalPatch);
api.delete = wrapMutation(originalDelete);

api.get = async (url, config = {}) => {
  // Endpoints that are safe to cache (public data, rarely changes rapidly)
  const cacheablePrefixes = [
    "/api/products",
    "/api/combo-products",
    "/api/mainDegrees",
    "/api/subDegrees",
    "/api/subjects",
    "/api/blogs",
    "/api/reviews"
  ];

  // Do not cache cart, user specific data, or if explicitly bypassed
  const isCacheable =
    !config.skipCache &&
    cacheablePrefixes.some(prefix => url.startsWith(prefix)) &&
    !url.includes("/cart") &&
    !url.includes("/auth");

  let cacheKey = `${url}?${JSON.stringify(config.params || {})}`;
  if (url.includes('localhost:5002/uploads') || url.includes('localhost:5002/uploads')) {
      cacheKey = `${url}?${JSON.stringify(config.params || {})}`;
  }

  if (isCacheable) {
    if (apiCache.has(cacheKey)) {
      const cached = apiCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`⚡ [Cache Hit] ${url}`);
        return Promise.resolve(cached.response);
      }
      apiCache.delete(cacheKey);
    }
  }

  try {
    const response = await originalGet.call(api, url, config);
    if (isCacheable && response.status === 200) {
      apiCache.set(cacheKey, { timestamp: Date.now(), response });
    }
    return response;
  } catch (err) {
    throw err;
  }
};

export default api;
