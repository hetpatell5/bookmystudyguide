import api from './api';

const paymentService = {
  getAllPayments: async (params = {}) => {
    const { page = 1, search = '', status = '' } = params;
    const response = await api.get('/api/payment/admin/all-payments', {
      params: { page, search, status }
    });
    return response.data;
  },

  processRefund: async (paymentId, data) => {
    const response = await api.post(`/api/payment/admin/refund/${paymentId}`, data);
    return response.data;
  }
};

export default paymentService;
