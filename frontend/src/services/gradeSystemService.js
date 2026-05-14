/**
 * Grade System Service
 * Handles API calls for system grade configuration and calculation
 */

import api from './api';

const defaultGradeConfig = () => ({
  success: true,
  data: {
    oLevel: [
      { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
      { grade: 'B', min: 70, max: 84, description: 'Vizuri Sana' },
      { grade: 'C', min: 50, max: 69, description: 'Vizuri' },
      { grade: 'D', min: 40, max: 49, description: 'Dhaifu' },
      { grade: 'F', min: 0, max: 39, description: 'Feli' },
    ],
    aLevel: [
      { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
      { grade: 'B', min: 75, max: 84, description: 'Vizuri Sana' },
      { grade: 'C', min: 65, max: 74, description: 'Vizuri' },
      { grade: 'D', min: 55, max: 64, description: 'Dhaifu' },
      { grade: 'E', min: 45, max: 54, description: 'Wastani' },
      { grade: 'S', min: 40, max: 44, description: 'Kidogo' },
      { grade: 'F', min: 0, max: 39, description: 'Feli' },
    ],
  },
});

const gradeSystemService = {
  getSystemGradeConfig: async () => {
    try {
      const response = await api.get('/system/grade-config');
      return response.data;
    } catch {
      return defaultGradeConfig();
    }
  },

  calculateGrade: async (score, level = 'O-Level') => {
    try {
      const configResponse = await gradeSystemService.getSystemGradeConfig();
      const gradeConfig = configResponse.data;
      const isALevel =
        level.toUpperCase().includes('A-LEVEL') ||
        level.toUpperCase().includes('FORM V') ||
        level.toUpperCase().includes('FORM VI');
      const grades = isALevel ? gradeConfig.aLevel : gradeConfig.oLevel;

      for (const grade of grades) {
        if (score >= grade.min && score <= grade.max) {
          return {
            grade: grade.grade,
            description: grade.description,
            min: grade.min,
            max: grade.max,
          };
        }
      }

      return {
        grade: 'F',
        description: 'Feli',
        min: 0,
        max: 39,
      };
    } catch {
      if (score >= 85) return { grade: 'A', description: 'Bora Sana', min: 85, max: 100 };
      if (score >= 70) return { grade: 'B', description: 'Vizuri Sana', min: 70, max: 84 };
      if (score >= 50) return { grade: 'C', description: 'Vizuri', min: 50, max: 69 };
      if (score >= 40) return { grade: 'D', description: 'Dhaifu', min: 40, max: 49 };
      return { grade: 'F', description: 'Feli', min: 0, max: 39 };
    }
  },

  updateGradeConfig: async (gradeConfig) => {
    const response = await api.post('/system/grade-config', gradeConfig);
    return response.data;
  },
};

export default gradeSystemService;
