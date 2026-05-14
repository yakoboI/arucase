/**
 * Pre-Form One Students Service
 * Handles API calls for Pre-Form One registered students
 */

import api from './api';

const preFormOneStudentsService = {
  getPreFormOneStudents: async () => {
    const response = await api.get('/pre-form-one/2025');
    return response.data;
  },

  getPreFormOneStudentsByYear: async (year) => {
    const response = await api.get(`/pre-form-one/${year}`);
    return response.data;
  },

  getStudentByAdmissionNumber: async (admissionNumber) => {
    const response = await api.get(`/pre-form-one/student/${admissionNumber}`);
    return response.data;
  },

  saveStudentScores: async (studentScores) => {
    const response = await api.post('/preformone-scores', studentScores);
    return response.data;
  },

  saveBulkStudentScores: async (scores) => {
    const response = await api.post('/preformone-scores/bulk', { scores });
    return response.data;
  },

  getStudentScoresBySubject: async (subjectId, scoreType) => {
    const response = await api.get(`/preformone-scores/subject/${subjectId}?type=${scoreType}`);
    return response.data;
  },

  getScoreStatistics: async (subjectId, scoreType) => {
    const response = await api.get(`/preformone-scores/stats/${subjectId}?type=${scoreType}`);
    return response.data;
  },

  exportScores: async (subjectId, scoreType) => {
    const response = await api.get(`/preformone-scores/export/${subjectId}?type=${scoreType}`, {
      responseType: 'blob',
    });
    return response;
  },
};

export default preFormOneStudentsService;
