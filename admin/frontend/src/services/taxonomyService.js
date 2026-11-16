import api from './api';

const taxonomyService = {
  // Books
  getBooks: async (params = {}) => {
    const response = await api.get('/api/books', { params });
    return response.data;
  },
  createBook: async (data) => {
    const isFormData = data instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const response = await api.post('/api/books', data, config);
    return response.data;
  },
  updateBook: async (id, data) => {
    const isFormData = data instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const response = await api.put(`/api/books/${id}`, data, config);
    return response.data;
  },
  deleteBook: async (id) => {
    const response = await api.delete(`/api/books/${id}`);
    return response.data;
  },
  toggleBookPublish: async (id, isPublished) => {
    const response = await api.patch(`/api/books/${id}/publish`, { isPublished });
    return response.data;
  },
  bulkPublishBooks: async (ids, isPublished) => {
    const response = await api.post('/api/books/bulk-publish', { ids, isPublished });
    return response.data;
  },
  bulkDeleteBooks: async (ids) => {
    const response = await api.post('/api/books/bulk-delete', { ids });
    return response.data;
  },

  // Main Degrees
  getMainDegrees: async (params = {}) => {
    const response = await api.get('/api/mainDegrees', { params });
    return response.data;
  },
  createMainDegree: async (data) => {
    const response = await api.post('/api/mainDegrees', data);
    return response.data;
  },
  updateMainDegree: async (id, data) => {
    const response = await api.patch(`/api/mainDegrees/${id}`, data);
    return response.data;
  },
  deleteMainDegree: async (id) => {
    const response = await api.delete(`/api/mainDegrees/${id}`);
    return response.data;
  },
  toggleMainDegreePublish: async (id, isPublished) => {
    const response = await api.patch(`/api/mainDegrees/${id}/publish`, { isPublished });
    return response.data;
  },
  bulkPublishMainDegrees: async (ids, isPublished) => {
    const response = await api.post('/api/mainDegrees/bulk-publish', { ids, isPublished });
    return response.data;
  },
  bulkDeleteMainDegrees: async (ids) => {
    const response = await api.post('/api/mainDegrees/bulk-delete', { ids });
    return response.data;
  },

  // Sub Degrees
  getSubDegrees: async (mainDegreeId, params = {}) => {
    if (mainDegreeId) params.mainDegreeId = mainDegreeId;
    const response = await api.get('/api/subDegrees', { params });
    return response.data;
  },
  createSubDegree: async (data) => {
    const response = await api.post('/api/subDegrees', data);
    return response.data;
  },
  updateSubDegree: async (id, data) => {
    const response = await api.patch(`/api/subDegrees/${id}`, data);
    return response.data;
  },
  deleteSubDegree: async (id) => {
    const response = await api.delete(`/api/subDegrees/${id}`);
    return response.data;
  },
  toggleSubDegreePublish: async (id, isPublished) => {
    const response = await api.patch(`/api/subDegrees/${id}/publish`, { isPublished });
    return response.data;
  },
  bulkPublishSubDegrees: async (ids, isPublished) => {
    const response = await api.post('/api/subDegrees/bulk-publish', { ids, isPublished });
    return response.data;
  },
  bulkDeleteSubDegrees: async (ids) => {
    const response = await api.post('/api/subDegrees/bulk-delete', { ids });
    return response.data;
  },

  // Subjects
  getSubjects: async (params = {}) => {
    const response = await api.get('/api/subjects', { params });
    return response.data;
  },
  createSubject: async (data) => {
    const response = await api.post('/api/subjects', data);
    return response.data;
  },
  updateSubject: async (id, data) => {
    const response = await api.patch(`/api/subjects/${id}`, data);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await api.delete(`/api/subjects/${id}`);
    return response.data;
  },
  toggleSubjectPublish: async (id, isPublished) => {
    const response = await api.patch(`/api/subjects/${id}/publish`, { isPublished });
    return response.data;
  },
  bulkPublishSubjects: async (ids, isPublished) => {
    const response = await api.post('/api/subjects/bulk-publish', { ids, isPublished });
    return response.data;
  },
  bulkDeleteSubjects: async (ids) => {
    const response = await api.post('/api/subjects/bulk-delete', { ids });
    return response.data;
  },

  // Extras for Subject & Classifications
  getLanguages: async () => { const response = await api.get('/api/languages'); return response.data; },
  createLanguage: async (data) => { const response = await api.post('/api/languages', data); return response.data; },
  updateLanguage: async (id, data) => { const response = await api.put(`/api/languages/${id}`, data); return response.data; },
  deleteLanguage: async (id) => { const response = await api.delete(`/api/languages/${id}`); return response.data; },

  getCourses: async () => { const response = await api.get('/api/courses'); return response.data; },
  createCourse: async (data) => { const response = await api.post('/api/courses', data); return response.data; },
  updateCourse: async (id, data) => { const response = await api.put(`/api/courses/${id}`, data); return response.data; },
  deleteCourse: async (id) => { const response = await api.delete(`/api/courses/${id}`); return response.data; },

  getSemesters: async () => { const response = await api.get('/api/semesters'); return response.data; },
  createSemester: async (data) => { const response = await api.post('/api/semesters', data); return response.data; },
  updateSemester: async (id, data) => { const response = await api.put(`/api/semesters/${id}`, data); return response.data; },
  deleteSemester: async (id) => { const response = await api.delete(`/api/semesters/${id}`); return response.data; },

  getYears: async () => { const response = await api.get('/api/years'); return response.data; },
  createYear: async (data) => { const response = await api.post('/api/years', data); return response.data; },
  updateYear: async (id, data) => { const response = await api.put(`/api/years/${id}`, data); return response.data; },
  deleteYear: async (id) => { const response = await api.delete(`/api/years/${id}`); return response.data; },

};

export default taxonomyService;
