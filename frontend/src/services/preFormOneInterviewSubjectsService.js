import api from './api';

export const preFormOneInterviewSubjectsService = {
  getSubjects: async () => {
    const response = await api.get('/preformone-interview-subjects');
    return response.data || [];
  },

  getSubjectById: async (id) => {
    const response = await api.get(`/preformone-interview-subjects/${id}`);
    return response.data.data || response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/preformone-interview-subjects', {
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code,
      is_active: subjectData.is_active,
    });
    return response.data;
  },

  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/preformone-interview-subjects/${id}`, {
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code,
      is_active: subjectData.is_active,
    });
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/preformone-interview-subjects/${id}`);
    return response.data;
  },
};
