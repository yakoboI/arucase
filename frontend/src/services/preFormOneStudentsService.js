/**
 * Pre-Form One Students Service
 * Handles API calls for Pre-Form One registered students
 */

import api from './api';

const preFormOneStudentsService = {
  // Get all Pre-Form One registered students
  getPreFormOneStudents: async () => {
    console.log('🔍 SERVICE DEBUG: getPreFormOneStudents called');
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get Pre-Form One students');
      const response = await api.get('/pre-form-one/2025');
      console.log('🔍 SERVICE DEBUG: Get Pre-Form One students API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting Pre-Form One students:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Get Pre-Form One students by year
  getPreFormOneStudentsByYear: async (year) => {
    console.log('🔍 SERVICE DEBUG: getPreFormOneStudentsByYear called for year:', year);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get Pre-Form One students by year');
      const response = await api.get(`/pre-form-one/${year}`);
      console.log('🔍 SERVICE DEBUG: Get Pre-Form One students by year API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting Pre-Form One students by year:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Get student by admission number
  getStudentByAdmissionNumber: async (admissionNumber) => {
    console.log('🔍 SERVICE DEBUG: getStudentByAdmissionNumber called for:', admissionNumber);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get student by admission number');
      // Note: This endpoint may not exist in the current backend, would need to be created
      const response = await api.get(`/pre-form-one/student/${admissionNumber}`);
      console.log('🔍 SERVICE DEBUG: Get student by admission number API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting student by admission number:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Save student scores
  saveStudentScores: async (studentScores) => {
    console.log('🔍 SERVICE DEBUG: saveStudentScores called with data:', studentScores);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to save student scores');
      const response = await api.post('/preformone-scores', studentScores);
      console.log('🔍 SERVICE DEBUG: Save student scores API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error saving student scores:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Save multiple student scores (bulk)
  saveBulkStudentScores: async (scores) => {
    console.log('🔍 SERVICE DEBUG: saveBulkStudentScores called with data:', scores);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to save bulk student scores');
      const response = await api.post('/preformone-scores/bulk', { scores });
      console.log('🔍 SERVICE DEBUG: Save bulk student scores API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error saving bulk student scores:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Get student scores for a subject
  getStudentScoresBySubject: async (subjectId, scoreType) => {
    console.log('🔍 SERVICE DEBUG: getStudentScoresBySubject called for subject:', subjectId, 'type:', scoreType);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get student scores by subject');
      const response = await api.get(`/preformone-scores/subject/${subjectId}?type=${scoreType}`);
      console.log('🔍 SERVICE DEBUG: Get student scores by subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting student scores by subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Get score statistics for a subject
  getScoreStatistics: async (subjectId, scoreType) => {
    console.log('🔍 SERVICE DEBUG: getScoreStatistics called for subject:', subjectId, 'type:', scoreType);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get score statistics');
      const response = await api.get(`/preformone-scores/stats/${subjectId}?type=${scoreType}`);
      console.log('🔍 SERVICE DEBUG: Get score statistics API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting score statistics:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Export scores to CSV
  exportScores: async (subjectId, scoreType) => {
    console.log('🔍 SERVICE DEBUG: exportScores called for subject:', subjectId, 'type:', scoreType);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to export scores');
      const response = await api.get(`/preformone-scores/export/${subjectId}?type=${scoreType}`, {
        responseType: 'blob'
      });
      console.log('🔍 SERVICE DEBUG: Export scores API response received:', response);
      
      return response;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error exporting scores:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  }
};

export default preFormOneStudentsService;
