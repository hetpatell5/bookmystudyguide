import api from './api';

const settingsService = {
  // Email Settings & Templates
  getEmailConfig: async () => {
    const response = await api.get('/api/admin/email-config');
    return response.data;
  },
  saveEmailConfig: async (data) => {
    const response = await api.post('/api/admin/email-config', data);
    return response.data;
  },
  getEmailTemplates: async (type) => {
    const response = await api.get(`/api/admin/email-templates/${type}`);
    return response.data;
  },
  saveEmailTemplate: async (data) => {
    return data.id 
      ? await api.put(`/api/admin/email-template/${data.id}`, data)
      : await api.post('/api/admin/email-template', data);
  },
  activateEmailTemplate: async (id) => {
    const response = await api.put(`/api/admin/email-template/activate/${id}`);
    return response.data;
  },
  ensureDefaultEmailTemplates: async () => {
    const response = await api.post('/api/admin/email-templates/ensure-defaults');
    return response.data;
  },
  testEmail: async (data) => {
    const response = await api.post('/api/admin/test-email', data);
    return response.data;
  },

  // Config / Site Settings / Env
  getConfig: async () => {
    const response = await api.get('/api/config');
    return response.data;
  },
  updateConfig: async (data) => {
    const response = await api.patch('/api/config', data);
    return response.data;
  },

  // Environment Settings (Maintenance, Social, Meta)
  getEnvSettings: async () => {
    const response = await api.get('/api/admin/env-settings');
    return response.data;
  },
  saveEnvSettings: async (data) => {
    const response = await api.post('/api/admin/env-settings', data);
    return response.data;
  },

  // Backups
  getBackups: async () => {
    const response = await api.get('/api/admin/backups');
    return response.data;
  },
  createBackup: async () => {
    const response = await api.post('/api/admin/backups/trigger');
    return response.data;
  },
  downloadBackup: async (filename) => {
    const response = await api.get(`/api/admin/backups/download/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Storage (S3 / Cloudinary)
  getStorageConfig: async () => {
    const response = await api.get('/api/admin/storage-config');
    return response.data;
  },
  saveStorageConfig: async (data) => {
    const response = await api.post('/api/admin/storage-config', data);
    return response.data;
  },
  getStorageStats: async () => {
    const response = await api.get('/api/storage/stats');
    return response.data;
  }
};

export default settingsService;
