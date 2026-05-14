import api from './api';

export const preFormOnePromotionService = {
  getEligibleStudents: async (year) => {
    const response = await api.get(`/preformone-promotion/eligible/${year}`, {
      timeout: 15000,
    });
    return response.data;
  },

  getPromotionStatus: async (year) => {
    const response = await api.get(`/preformone-promotion/status/${year}`, {
      timeout: 15000,
    });
    return response.data;
  },

  promoteStudents: async (year, promotionData) => {
    const response = await api.post(`/preformone-promotion/promote/${year}`, promotionData);
    return response.data;
  },

  getPromotionHistory: async () => {
    const response = await api.get('/preformone-promotion/history');
    return response.data;
  },
};
