/**
 * Pre-Form One Students Service
 * Handles API calls for Pre-Form One registered students
 */

import api from './api';

async function fetchPreFormOneStudents(year) {
  const response = await api.get(`/pre-form-one/${year}`);
  return response.data;
}

const preFormOneStudentsService = {
  /** @param {number|string} [year] defaults to current calendar year */
  getPreFormOneStudents: async (year = new Date().getFullYear()) => fetchPreFormOneStudents(year),

  getPreFormOneStudentsByYear: async (year) => fetchPreFormOneStudents(year),

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
