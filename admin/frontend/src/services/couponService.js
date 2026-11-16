import api from './api';

const couponService = {
  getCoupons: async () => {
    const response = await api.get('/api/coupons');
    return response.data;
  },

  createCoupon: async (data) => {
    const response = await api.post('/api/coupons', data);
    return response.data;
  },

  deleteCoupon: async (id) => {
    const response = await api.delete(`/api/coupons/${id}`);
    return response.data;
  }
};

export default couponService;
