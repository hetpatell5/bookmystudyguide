import api from './api';

const educationalService = {
  // --- SOFT COPIES (ASSIGNMENTS) ---
  getSoftCopies: async () => {
    const response = await api.get('/api/admin/soft-copies');
    return response.data;
  },

  createSoftCopy: async (formData) => {
    const response = await api.post('/api/admin/soft-copy', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateSoftCopy: async (id, formData) => {
    const response = await api.put(`/api/admin/soft-copy/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteSoftCopy: async (id) => {
    const response = await api.delete(`/api/admin/soft-copy/${id}`);
    return response.data;
  },

  // --- SYNOPSIS ---
  getSynopses: async () => {
    const response = await api.get('/api/synopsis?limit=1000');
    return response.data;
  },

  createSynopsis: async (formData) => {
    const response = await api.post('/api/synopsis', formData);
    return response.data;
  },

  updateSynopsis: async (id, data) => {
    const response = await api.patch(`/api/synopsis/${id}`, data);
    return response.data;
  },

  deleteSynopsis: async (id) => {
    const response = await api.delete(`/api/synopsis/${id}`);
    return response.data;
  },

  // --- IGNOU CARDS ---
  getIgnouCards: async () => {
    const response = await api.get('/api/ignou-cards');
    return response.data;
  },

  saveIgnouCard: async (id, data) => {
    if (id) {
      return (await api.put(`/api/ignou-cards/${id}`, data)).data;
    }
    return (await api.post('/api/ignou-cards', data)).data;
  },

  deleteIgnouCard: async (id) => {
    return (await api.delete(`/api/ignou-cards/${id}`)).data;
  },

  // --- FEATURED SECTIONS ---
  getFeaturedSections: async () => {
    const response = await api.get('/api/featured-sections', { params: { admin: 'true' } });
    return response.data;
  },

  saveFeaturedSection: async (id, data) => {
    if (id) {
      return (await api.put(`/api/featured-sections/${id}`, data)).data;
    }
    return (await api.post('/api/featured-sections', data)).data;
  },

  deleteFeaturedSection: async (id) => {
    return (await api.delete(`/api/featured-sections/${id}`)).data;
  },
};

export default educationalService;
