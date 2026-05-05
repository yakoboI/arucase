import api from './api';

export const preFormOneService = {
  // Get all students for a specific year
  getStudents: async (year) => {
    console.log('🔍 SERVICE DEBUG: getStudents called for year:', year);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to get students');
      const response = await api.get(`/pre-form-one/${year}`);
      console.log('🔍 SERVICE DEBUG: Get students API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      console.log('🔍 SERVICE DEBUG: Response data type:', typeof response.data);
      console.log('🔍 SERVICE DEBUG: Is response.data array:', Array.isArray(response.data));
      
      if (response.data && response.data.data) {
        console.log('🔍 SERVICE DEBUG: Found nested data.data:', response.data.data);
        console.log('🔍 SERVICE DEBUG: Is data.data array:', Array.isArray(response.data.data));
      }
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error fetching students:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
      // Handle specific error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Create a single student
  createStudent: async (studentData) => {
    console.log('🔍 SERVICE DEBUG: createStudent called with data:', studentData);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to /pre-form-one');
      const response = await api.post('/pre-form-one', studentData);
      console.log('🔍 SERVICE DEBUG: API response received:', response);
      console.log('🔍 SERVICE DEBUG: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error creating student:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
      // Handle specific error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Create multiple students (bulk registration)
  createBulkStudents: async (students) => {
    console.log('🔍 SERVICE DEBUG: createBulkStudents called with students:', students);
    console.log('🔍 SERVICE DEBUG: Number of students:', students?.length || 0);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to /pre-form-one/bulk');
      const response = await api.post('/pre-form-one/bulk', { students });
      console.log('🔍 SERVICE DEBUG: Bulk API response received:', response);
      console.log('🔍 SERVICE DEBUG: Bulk response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error creating bulk students:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Update student parish
  updateStudentParish: async (studentId, parish) => {
    console.log('🔍 SERVICE DEBUG: updateStudentParish called');
    console.log('🔍 SERVICE DEBUG: Student ID:', studentId);
    console.log('🔍 SERVICE DEBUG: Parish:', parish);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to update parish');
      const response = await api.put(`/pre-form-one/${studentId}/parish`, { parish });
      console.log('🔍 SERVICE DEBUG: Parish update API response received:', response);
      console.log('🔍 SERVICE DEBUG: Parish update response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error updating student parish:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Bulk update parishes for multiple students
  bulkUpdateParishes: async (updates) => {
    console.log('🔍 SERVICE DEBUG: bulkUpdateParishes called');
    console.log('🔍 SERVICE DEBUG: Updates data:', updates);
    console.log('🔍 SERVICE DEBUG: Number of updates:', updates?.length || 0);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to bulk update parishes');
      const response = await api.put('/pre-form-one/bulk-parish', { updates });
      console.log('🔍 SERVICE DEBUG: Bulk parish API response received:', response);
      console.log('🔍 SERVICE DEBUG: Bulk parish response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error bulk updating parishes:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Update a student
  updateStudent: async (id, studentData) => {
    console.log('🔍 SERVICE DEBUG: updateStudent called');
    console.log('🔍 SERVICE DEBUG: Student ID:', id);
    console.log('🔍 SERVICE DEBUG: Student data:', studentData);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to update student');
      const response = await api.put(`/pre-form-one/${id}`, studentData);
      console.log('🔍 SERVICE DEBUG: Update student API response received:', response);
      console.log('🔍 SERVICE DEBUG: Update student response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error updating student:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Delete a student
  deleteStudent: async (studentId) => {
    console.log('🔍 SERVICE DEBUG: deleteStudent called');
    console.log('🔍 SERVICE DEBUG: Student ID:', studentId);
    try {
      console.log('🔍 SERVICE DEBUG: Making API request to delete student');
      const response = await api.delete(`/pre-form-one/${studentId}`);
      console.log('🔍 SERVICE DEBUG: Delete student API response received:', response);
      console.log('🔍 SERVICE DEBUG: Delete student response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error deleting student:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Export students to CSV
  exportStudents: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}/export`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `preform-one-students-${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    } catch (error) {
      console.error('Error exporting students:', error);
      throw error;
    }
  }
};

export default preFormOneService;
