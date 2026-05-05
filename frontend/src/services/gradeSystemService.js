/**
 * Grade System Service
 * Handles API calls for system grade configuration and calculation
 */

import api from './api';

const gradeSystemService = {
  // Get current system grade configuration
  getSystemGradeConfig: async () => {
    console.log('🔍 GRADE SERVICE DEBUG: getSystemGradeConfig called');
    try {
      console.log('🔍 GRADE SERVICE DEBUG: Making API request to get system grade config');
      const response = await api.get('/system/grade-config');
      console.log('🔍 GRADE SERVICE DEBUG: System grade config API response received:', response);
      console.log('🔍 GRADE SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 GRADE SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 GRADE SERVICE DEBUG: Error getting system grade config:');
      console.error('🔍 GRADE SERVICE DEBUG: Error object:', error);
      console.error('🔍 GRADE SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 GRADE SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 GRADE SERVICE DEBUG: Error data:', error.response?.data);
      
      // Return default grade configuration if API fails
      return {
        success: true,
        data: {
          oLevel: [
            { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
            { grade: 'B', min: 70, max: 84, description: 'Vizuri Sana' },
            { grade: 'C', min: 50, max: 69, description: 'Vizuri' },
            { grade: 'D', min: 40, max: 49, description: 'Dhaifu' },
            { grade: 'F', min: 0, max: 39, description: 'Feli' }
          ],
          aLevel: [
            { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
            { grade: 'B', min: 75, max: 84, description: 'Vizuri Sana' },
            { grade: 'C', min: 65, max: 74, description: 'Vizuri' },
            { grade: 'D', min: 55, max: 64, description: 'Dhaifu' },
            { grade: 'E', min: 45, max: 54, description: 'Wastani' },
            { grade: 'S', min: 40, max: 44, description: 'Kidogo' },
            { grade: 'F', min: 0, max: 39, description: 'Feli' }
          ]
        }
      };
    }
  },

  // Calculate grade using system configuration
  calculateGrade: async (score, level = 'O-Level') => {
    console.log('🔍 GRADE SERVICE DEBUG: calculateGrade called for score:', score, 'level:', level);
    try {
      // Get system grade configuration
      const configResponse = await gradeSystemService.getSystemGradeConfig();
      console.log('🔍 GRADE SERVICE DEBUG: Grade config received:', configResponse);
      
      const gradeConfig = configResponse.data;
      const isALevel = level.toUpperCase().includes('A-LEVEL') || level.toUpperCase().includes('FORM V') || level.toUpperCase().includes('FORM VI');
      const grades = isALevel ? gradeConfig.aLevel : gradeConfig.oLevel;
      
      console.log('🔍 GRADE SERVICE DEBUG: Using grade config:', grades, 'isALevel:', isALevel);
      
      // Find the appropriate grade
      for (const grade of grades) {
        if (score >= grade.min && score <= grade.max) {
          console.log('🔍 GRADE SERVICE DEBUG: Grade calculated:', grade.grade);
          return {
            grade: grade.grade,
            description: grade.description,
            min: grade.min,
            max: grade.max
          };
        }
      }
      
      // Default to F if no grade found
      console.log('🔍 GRADE SERVICE DEBUG: No grade found, defaulting to F');
      return {
        grade: 'F',
        description: 'Feli',
        min: 0,
        max: 39
      };
      
    } catch (error) {
      console.error('🔍 GRADE SERVICE DEBUG: Error calculating grade:', error);
      
      // Fallback to default calculation
      if (score >= 85) return { grade: 'A', description: 'Bora Sana', min: 85, max: 100 };
      if (score >= 70) return { grade: 'B', description: 'Vizuri Sana', min: 70, max: 84 };
      if (score >= 50) return { grade: 'C', description: 'Vizuri', min: 50, max: 69 };
      if (score >= 40) return { grade: 'D', description: 'Dhaifu', min: 40, max: 49 };
      return { grade: 'F', description: 'Feli', min: 0, max: 39 };
    }
  },

  // Update system grade configuration
  updateGradeConfig: async (gradeConfig) => {
    console.log('🔍 GRADE SERVICE DEBUG: updateGradeConfig called with:', gradeConfig);
    try {
      console.log('🔍 GRADE SERVICE DEBUG: Making API request to update grade config');
      const response = await api.post('/system/grade-config', gradeConfig);
      console.log('🔍 GRADE SERVICE DEBUG: Update grade config API response received:', response);
      console.log('🔍 GRADE SERVICE DEBUG: Response status:', response.status);
      console.log('🔍 GRADE SERVICE DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('🔍 GRADE SERVICE DEBUG: Error updating grade config:');
      console.error('🔍 GRADE SERVICE DEBUG: Error object:', error);
      console.error('🔍 GRADE SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 GRADE SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 GRADE SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  }
};

export default gradeSystemService;
