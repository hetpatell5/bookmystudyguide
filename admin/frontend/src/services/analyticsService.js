import api from './api';

const analyticsService = {
  getDeepInsights: async (startDate = null, endDate = null) => {
    const url = (startDate && endDate)
      ? `/api/admin/analytics/deep-insights?startDate=${startDate}&endDate=${endDate}`
      : `/api/admin/analytics/deep-insights`;
    return api.get(url);
  },

  getOverview: async () => {
    return api.get('/api/admin/analytics/overview');
  },

  getRealtimeData: async () => {
    return api.get('/api/admin/analytics/realtime');
  }
};

export default analyticsService;
