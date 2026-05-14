/**
 * Pre-Form One Continuing Subjects Service
 * Handles API calls for continuing subjects CRUD operations
 */

import api from './api';

const preFormOneContinuingSubjectsService = {
  getSubjects: async () => {
    const response = await api.get('/preformone-continuing-subjects');
    return response.data;
  },

  getSubjectById: async (id) => {
    const response = await api.get(`/preformone-continuing-subjects/${id}`);
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/preformone-continuing-subjects', {
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code,
      is_active: subjectData.is_active,
    });
    return response.data;
  },

  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/preformone-continuing-subjects/${id}`, {
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code,
      is_active: subjectData.is_active,
    });
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/preformone-continuing-subjects/${id}`);
    return response.data;
  },

  exportSubjects: async () => {
    const response = await api.get('/preformone-continuing-subjects/export', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'preformone-continuing-subjects.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return response.data;
  },
};

export default preFormOneContinuingSubjectsService;
