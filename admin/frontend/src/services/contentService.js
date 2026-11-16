import api from './api';

const contentService = {
  // --- FEEDBACK ---
  getFeedback: async () => {
    const response = await api.get('/api/feedback');
    return response.data;
  },

  deleteFeedback: async (id) => {
    const response = await api.delete(`/api/feedback/${id}`);
    return response.data;
  },

  // --- SUBSCRIBERS ---
  getSubscribers: async () => {
    const response = await api.get('/api/newsletter/subscribers');
    return response.data;
  },

  // --- CONTACT INFO ---
  getContact: async () => {
    const response = await api.get('/api/contact');
    return response.data;
  },

  updateContact: async (data) => {
    const response = await api.post('/api/contact', data);
    return response.data;
  },

  // --- REVIEWS ---
  getReviews: async () => {
    const response = await api.get('/api/reviews');
    return response.data;
  },

  saveReview: async (id, data) => {
    if (id) {
      return (await api.put(`/api/reviews/${id}`, data)).data;
    }
    return (await api.post('/api/reviews', data)).data;
  },

  deleteReview: async (id) => {
    return (await api.delete(`/api/reviews/${id}`)).data;
  },

  // --- SERVICES ---
  getServices: async () => {
    const response = await api.get('/api/services');
    return response.data;
  },

  saveService: async (id, data) => {
    if (id) {
      return (await api.put(`/api/services/${id}`, data)).data;
    }
    return (await api.post('/api/services', data)).data;
  },

  deleteService: async (id) => {
    return (await api.delete(`/api/services/${id}`)).data;
  },

  // --- BLOGS ---
  getBlogs: async () => {
    return (await api.get('/api/blogs')).data;
  },

  createBlog: async (data) => {
    return (await api.post('/api/blogs/add', data)).data;
  },

  updateBlog: async (id, data) => {
    return (await api.put(`/api/blogs/${id}`, data)).data;
  },

  saveBlog: async (id, data) => {
    if (id) return (await api.put(`/api/blogs/${id}`, data)).data;
    return (await api.post('/api/blogs/add', data)).data;
  },

  deleteBlog: async (id) => {
    return (await api.delete(`/api/blogs/${id}`)).data;
  },

  // --- FAQS ---
  getFaqs: async () => {
    return (await api.get('/api/faqs')).data;
  },

  saveFaq: async (id, data) => {
    if (id) return (await api.put(`/api/faqs/${id}`, data)).data;
    return (await api.post('/api/faqs', data)).data;
  },

  deleteFaq: async (id) => {
    return (await api.delete(`/api/faqs/${id}`)).data;
  },

  // --- ADS ---
  getAds: async () => {
    return (await api.get('/api/advertisements')).data;
  },

  // Backend expects multipart/form-data with fields: title, image (file), mobileImage (file optional), isActive (boolean)
  createAd: async (formData) => {
    return (await api.post('/api/advertisements/add', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },

  updateAdStatus: async (id, isActive) => {
    return (await api.put(`/api/advertisements/${id}/status`, { isActive })).data;
  },

  deleteAd: async (id) => {
    return (await api.delete(`/api/advertisements/${id}`)).data;
  },

  // --- SHARED UPLOAD ---
  uploadImage: async (file) => {
    const data = new FormData();
    data.append("file", file);
    const response = await api.post("/api/admin/upload", data, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  }
};

export default contentService;
