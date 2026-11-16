import api from './api';

const inventoryService = {
  // Products
  getProducts: async (params = {}) => {
    const PAGE_SIZE = 1000;
    // Fetch first page to get total count
    const firstRes = await api.get('/api/products', {
      params: { limit: PAGE_SIZE, page: 1, admin: true, ...params },
    });
    const firstData = firstRes.data;
    const allRows = [...(firstData.data || [])];
    const pagination = firstData.pagination;

    // If there are more pages, fetch them all in parallel
    if (pagination && pagination.pages > 1) {
      const pageNumbers = [];
      for (let p = 2; p <= pagination.pages; p++) pageNumbers.push(p);
      const restResults = await Promise.all(
        pageNumbers.map(p =>
          api.get('/api/products', { params: { limit: PAGE_SIZE, page: p, admin: true, ...params } })
        )
      );
      restResults.forEach(r => {
        const rows = r.data?.data || [];
        allRows.push(...rows);
      });
    }

    // Return in the same shape the rest of the app expects
    return { data: allRows, pagination: { ...pagination, total: allRows.length } };
  },
  
  getProductById: async (id) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  createProduct: async (data) => {
    const response = await api.post('/api/products', data);
    return response.data;
  },

  updateProduct: async (id, data) => {
    const response = await api.patch(`/api/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },

  toggleProductPublish: async (id, isActive) => {
    const response = await api.patch(`/api/products/${id}/publish`, { isActive });
    return response.data;
  },

  bulkPublishProducts: async (ids, isPublished) => {
    const response = await api.post('/api/products/bulk-publish', { ids, isPublished });
    return response.data;
  },

  // Taxonomy
  getBooks: async () => {
    const response = await api.get('/api/books');
    return response.data;
  },

  getMainDegrees: async () => {
    const response = await api.get('/api/mainDegrees');
    return response.data;
  },

  getSubDegrees: async (mainDegreeId) => {
    const url = mainDegreeId ? `/api/subDegrees?mainDegreeId=${mainDegreeId}` : '/api/subDegrees';
    const response = await api.get(url);
    return response.data;
  },

  getSubjects: async (subDegreeId, page = 1) => {
    const url = subDegreeId 
      ? `/api/subjects?subDegreeId=${subDegreeId}&limit=1000&page=${page}` 
      : `/api/subjects?limit=1000&page=${page}`;
    const response = await api.get(url);
    return response.data;
  },

  // Bulk Updates
  bulkUpdatePrices: async (products) => {
    // This is often a loop of patches in the old system
    return Promise.all(products.map(p => inventoryService.updateProduct(p.id, p.data)));
  },

  // Combo Products
  getComboProducts: async () => {
    const response = await api.get('/api/admin/combo-products');
    return response.data;
  },

  // Soft Copies
  getSoftCopies: async () => {
    const response = await api.get('/api/admin/soft-copies');
    return response.data;
  },

  createSoftCopy: async (formData) => {
    const response = await api.post('/api/admin/soft-copy', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateSoftCopy: async (id, formData) => {
    const response = await api.put(`/api/admin/soft-copy/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteSoftCopy: async (id) => {
    const response = await api.delete(`/api/admin/soft-copy/${id}`);
    return response.data;
  },

  createComboProduct: async (formData) => {
    const response = await api.post('/api/admin/combo-products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateComboProduct: async (id, formData) => {
    const response = await api.patch(`/api/admin/combo-products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteComboProduct: async (id) => {
    const response = await api.delete(`/api/admin/combo-products/${id}`);
    return response.data;
  },

  toggleComboPublish: async (id, isActive) => {
    const response = await api.patch(`/api/admin/combo-products/${id}/publish`, { isActive });
    return response.data;
  },

  bulkPublishCombos: async (ids, isPublished) => {
    const response = await api.post('/api/admin/combo-products/bulk-publish', { ids, isPublished });
    return response.data;
  }
};

export default inventoryService;
