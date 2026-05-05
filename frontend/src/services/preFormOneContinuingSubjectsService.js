/**
 * Pre-Form One Continuing Subjects Service
 * Handles API calls for continuing subjects CRUD operations
 */

import api from './api';

const preFormOneContinuingSubjectsService = {
  // Get all continuing subjects
  getSubjects: async () => {
    console.log('🔍 SERVICE DEBUG: getSubjects called');
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get continuing subjects');
      const response = await api.get('/preformone-continuing-subjects');
      console.log('🔍 SERVICE DEBUG: Get continuing subjects API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting continuing subjects:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Get continuing subject by ID
  getSubjectById: async (id) => {
    console.log('🔍 SERVICE DEBUG: getSubjectById called for ID:', id);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get continuing subject by ID');
      const response = await api.get(`/preformone-continuing-subjects/${id}`);
      console.log('🔍 SERVICE DEBUG: Get continuing subject by ID API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting continuing subject by ID:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Create new continuing subject
  createSubject: async (subjectData) => {
    console.log('🔍 SERVICE DEBUG: createSubject called with data:', subjectData);
    console.log('🔍 SERVICE DEBUG: Subject name:', subjectData.subject_name);
    console.log('🔍 SERVICE DEBUG: Subject code:', subjectData.subject_code);
    console.log('🔍 SERVICE DEBUG: Is active:', subjectData.is_active);
    
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to create continuing subject');
      const response = await api.post('/preformone-continuing-subjects', {
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code,
        is_active: subjectData.is_active
      });
      console.log('🔍 SERVICE DEBUG: Create continuing subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error creating continuing subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Update continuing subject
  updateSubject: async (id, subjectData) => {
    console.log('🔍 SERVICE DEBUG: updateSubject called for ID:', id);
    console.log('🔍 SERVICE DEBUG: Subject data:', subjectData);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to update continuing subject');
      const response = await api.put(`/preformone-continuing-subjects/${id}`, {
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code,
        is_active: subjectData.is_active
      });
      console.log('🔍 SERVICE DEBUG: Update continuing subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error updating continuing subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Delete continuing subject
  deleteSubject: async (id) => {
    console.log('🔍 SERVICE DEBUG: deleteSubject called for ID:', id);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to delete continuing subject');
      const response = await api.delete(`/preformone-continuing-subjects/${id}`);
      console.log('🔍 SERVICE DEBUG: Delete continuing subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error deleting continuing subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Export continuing subjects to Excel
  exportSubjects: async () => {
    console.log('🔍 SERVICE DEBUG: exportSubjects called');
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to export continuing subjects');
      const response = await api.get('/preformone-continuing-subjects/export', {
        responseType: 'blob'
      });
      console.log('🔍 SERVICE DEBUG: Export continuing subjects API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'preformone-continuing-subjects.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('🔍 SERVICE DEBUG: Continuing subjects exported successfully');
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error exporting continuing subjects:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  }
};

export default preFormOneContinuingSubjectsService;
