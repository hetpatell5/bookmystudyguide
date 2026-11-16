import api from './api';

const userService = {
  // --- CUSTOMERS (USERS) ---
  getUsers: async () => {
    const response = await api.get('/api/users');
    return response.data;
  },

  // --- ADMINS ---
  getAdmins: async () => {
    const response = await api.get('/api/admin');
    return response.data;
  },

  createAdmin: async (data) => {
    const response = await api.post('/api/admin/register', data);
    return response.data;
  },

  updateAdmin: async (id, data) => {
    const response = await api.put(`/api/admin/${id}`, data);
    return response.data;
  },

  updateAdminPermissions: async (id, permissions) => {
    const response = await api.put(`/api/admin/${id}/permissions`, { permissions });
    return response.data;
  },

  deleteAdmin: async (id) => {
    const response = await api.delete(`/api/admin/${id}`);
    return response.data;
  }
};

export default userService;
