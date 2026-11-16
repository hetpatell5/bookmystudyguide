import api from './api';

const projectService = {
  // All project/synopsis data lives at /api/synopsis
  getProjects: async () => (await api.get('/api/synopsis?limit=1000')).data,

  createProject: async (formData) =>
    (await api.post('/api/synopsis', formData)).data,

  updateProject: async (id, formData) =>
    (await api.patch(`/api/synopsis/${id}`, formData)).data,

  deleteProject: async (id) => (await api.delete(`/api/synopsis/${id}`)).data,

  // Synopsis does not have a dedicated publish toggle — use the patch endpoint
  togglePublish: async (id, isActive) =>
    (await api.patch(`/api/synopsis/${id}`, { isActive })).data,

  // No bulk-publish on synopsis — patch individually
  bulkPublish: async (ids, isPublished) =>
    Promise.all(ids.map((id) => api.patch(`/api/synopsis/${id}`, { isActive: isPublished }))),
};

export default projectService;
