import api from './api';

export const preFormOneInterviewSubjectsService = {
  // Get all interview subjects
  getSubjects: async () => {
    console.log('🔍 SERVICE DEBUG: getSubjects called');
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get interview subjects');
      const response = await api.get('/preformone-interview-subjects');
      console.log('🔍 SERVICE DEBUG: Get interview subjects API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error fetching interview subjects:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Get interview subject by ID
  getSubjectById: async (id) => {
    console.log('🔍 SERVICE DEBUG: getSubjectById called for ID:', id);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get interview subject');
      const response = await api.get(`/preformone-interview-subjects/${id}`);
      console.log('🔍 SERVICE DEBUG: Get interview subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data.data || response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error fetching interview subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Create new interview subject
  createSubject: async (subjectData) => {
    console.log('🔍 SERVICE DEBUG: createSubject called with data:', subjectData);
    console.log('🔍 SERVICE DEBUG: Subject name:', subjectData.subject_name);
    console.log('🔍 SERVICE DEBUG: Subject code:', subjectData.subject_code);
    console.log('🔍 SERVICE DEBUG: Is active:', subjectData.is_active);
    
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to create interview subject');
      const response = await api.post('/preformone-interview-subjects', {
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code,
        is_active: subjectData.is_active
      });
      console.log('🔍 SERVICE DEBUG: Create interview subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error creating interview subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Update interview subject
  updateSubject: async (id, subjectData) => {
    console.log('🔍 SERVICE DEBUG: updateSubject called for ID:', id);
    console.log('🔍 SERVICE DEBUG: Subject data:', subjectData);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to update interview subject');
      const response = await api.put(`/preformone-interview-subjects/${id}`, {
        subject_name: subjectData.subject_name,
        subject_code: subjectData.subject_code,
        is_active: subjectData.is_active
      });
      console.log('🔍 SERVICE DEBUG: Update interview subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error updating interview subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Delete interview subject
  deleteSubject: async (id) => {
    console.log('🔍 SERVICE DEBUG: deleteSubject called for ID:', id);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to delete interview subject');
      const response = await api.delete(`/preformone-interview-subjects/${id}`);
      console.log('🔍 SERVICE DEBUG: Delete interview subject API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error deleting interview subject:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  }
};
