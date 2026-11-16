import api from './api';

const orderService = {
  // --- ORDERS ---
  getAllOrders: async (params = {}) => {
    const response = await api.get('/api/payment/admin/all-orders', { params: { limit: 1000, ...params } });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await api.get(`/api/payment/order/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await api.put(`/api/payment/admin/order/${id}`, { status });
    return response.data;
  },

  createOfflineOrder: async (data) => {
    const response = await api.post('/api/payment/admin/offline-order', data);
    return response.data;
  },

  // --- SHIPPING (SHIPROCKET) ---
  createShipment: async (orderId, dimensions) => {
    const response = await api.post('/api/shipping/shiprocket/create', { 
      orderId, 
      ...dimensions 
    });
    return response.data;
  },

  getCouriers: async (orderId) => {
    const response = await api.post('/api/shipping/shiprocket/couriers', { orderId });
    return response.data;
  },

  scheduleShipment: async (orderId, courierId) => {
    const response = await api.post('/api/shipping/shiprocket/schedule', { orderId, courierId });
    return response.data;
  },

  cancelShipment: async (orderId) => {
    const response = await api.post('/api/shipping/shiprocket/cancel', { orderId });
    return response.data;
  },

  trackShipment: async (orderId) => {
    const response = await api.get(`/api/shipping/shiprocket/track/${orderId}`);
    return response.data;
  },

  downloadLabel: async (orderId) => {
    const response = await api.get(`/api/shipping/shiprocket/label/${orderId}`);
    return response.data;
  },

  downloadInvoice: async (orderId) => {
    const response = await api.get(`/api/shipping/shiprocket/invoice/${orderId}`);
    return response.data;
  },

  downloadOrderInvoice: (id) => {
    return { invoiceUrl: `/api/payment/admin/order/${id}/invoice` };
  },

  saveManualShipping: async (id, { courierName, awbCode }) => {
    const response = await api.post(`/api/payment/admin/order/${id}/manual-ship`, { courierName, awbCode });
    return response.data;
  },

  deleteOrder: async (id) => {
    const response = await api.delete(`/api/payment/admin/order/${id}`);
    return response.data;
  },

  // --- ANALYTICS ---
  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard-stats');
    return response.data;
  }
};

export default orderService;
