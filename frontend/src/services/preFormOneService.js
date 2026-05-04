import api from './api';

export const preFormOneService = {
  // Get all students for a specific year
  getStudents: async (year) => {
    try {
      const response = await api.get(`/api/preform-one/${year}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },

  // Create a single student
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/api/preform-one', studentData);
      return response.data;
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  },

  // Create multiple students (bulk registration)
  createBulkStudents: async (students) => {
    try {
      const response = await api.post('/api/preform-one/bulk', { students });
      return response.data;
    } catch (error) {
      console.error('Error creating bulk students:', error);
      throw error;
    }
  },

  // Update student parish
  updateStudentParish: async (studentId, parish) => {
    try {
      const response = await api.put(`/api/preform-one/${studentId}/parish`, { parish });
      return response.data;
    } catch (error) {
      console.error('Error updating student parish:', error);
      throw error;
    }
  },

  // Bulk update parishes for multiple students
  bulkUpdateParishes: async (updates) => {
    try {
      const response = await api.put('/api/preform-one/bulk-parish', { updates });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating parishes:', error);
      throw error;
    }
  },

  // Delete a student
  deleteStudent: async (studentId) => {
    try {
      const response = await api.delete(`/api/preform-one/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Export students to CSV
  exportStudents: async (year) => {
    try {
      const response = await api.get(`/api/preform-one/${year}/export`, {
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
