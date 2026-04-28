/**
 * Students API Service
 */
import api from './api';

export const studentsAPI = {
  // Get students
  getStudents: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students?${queryString}`);
  },
  
  // Get single student
  getStudent: (admNo, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/${admNo}?${queryString}`);
  },
  
  // Create student
  createStudent: (data) => api.post('/students', data),
  
  // Update student
  updateStudent: (admNo, data, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.put(`/students/${admNo}?${queryString}`, data);
  },
  
  // Delete student
  deleteStudent: (admNo, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/${admNo}?${queryString}`);
  },
  
  // Upload student photo
  uploadPhoto: (admNo, formData) => api.post(`/students/${admNo}/photo`, formData),
  
  // Get student scores
  getScores: (admNo, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/${admNo}/scores?${queryString}`);
  },

  // Get scores for a class (bulk)
  getClassScores: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/scores/list?${queryString}`);
  },

  // Get all scores for a class and month (batch - reduces API calls)
  getBatchScores: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/scores/batch?${queryString}`);
  },
  
  // Save student score
  saveScore: (admNo, data) => api.post(`/students/${admNo}/scores`, data),

  // Score entry CSV: download template (returns blob; caller should trigger download)
  getScoreEntryTemplate: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/scores/template?${queryString}`, { responseType: 'blob' });
  },

  // Score entry CSV: bulk upload (FormData with file + level, stream, year, month, subject_code)
  uploadScoresCsv: (formData) => api.post('/students/scores/bulk-upload', formData),
  
  // Get subjects
  getSubjects: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/subjects/list?${queryString}`);
  },

  // Save subject
  saveSubject: (data) => api.post('/students/subjects', data),

  // Delete subject
  deleteSubject: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/subjects?${queryString}`);
  },

  // Get teachers
  getTeachers: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/teachers/list?${queryString}`);
  },

  // Save teacher
  saveTeacher: (data) => api.post('/students/teachers', data),

  // Delete teacher
  deleteTeacher: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/teachers?${queryString}`);
  },

  // Get student parishes for a class
  getParishes: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/parishes/list?${queryString}`);
  },

  // Save or update student parish
  saveParish: (data) => api.post('/students/parishes', data),

  // Bulk save or update student parishes (for CSV upload)
  saveParishesBulk: (data) => api.post('/students/parishes/bulk', data),

  // Delete student parish
  deleteParish: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/parishes?${queryString}`);
  },

  // Get comments
  getComments: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/comments/list?${queryString}`);
  },

  // Get class grades (grade of average of weighted totals per student index)
  getClassGrades: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/class-grades?${queryString}`);
  },

  // Save comment
  saveComment: (data) => api.post('/students/comments', data),

  // Save comments in bulk (for CSV upload; avoids rate limiting)
  saveCommentsBulk: (data) => api.post('/students/comments/bulk', data),

  // Delete comment
  deleteComment: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/comments?${queryString}`);
  },

  // Get tabia mwenendo evaluations
  getTabiaMwenendo: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/tabia-mwenendo/list?${queryString}`);
  },

  // Save tabia mwenendo evaluations (batch)
  saveTabiaMwenendo: (data) => api.post('/students/tabia-mwenendo', data),

  // Get monthly results
  getMonthlyResults: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/monthly-results/list?${queryString}`);
  },

  // Calculate monthly results
  calculateMonthlyResults: (data) => api.post('/students/monthly-results/calculate', data),

  // Download monthly results PDF
  downloadMonthlyResultsPDF: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/monthly-results/pdf?${queryString}`, {
      responseType: 'blob',
    });
  },

  // Save monthly result
  saveMonthlyResult: (data) => api.post('/students/monthly-results', data),

  // Delete monthly result
  deleteMonthlyResult: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/monthly-results?${queryString}`);
  },

  // Get fees announcements
  getFeesAnnouncements: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/fees-announcements/list?${queryString}`);
  },

  // Save fees announcements
  saveFeesAnnouncements: (data) => api.post('/students/fees-announcements', data),

  // Get individual debt
  getDebt: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/debt/list?${queryString}`);
  },

  // Save individual debt
  saveDebt: (data) => api.post('/students/debt', data),

  // Bulk save or update individual debt records (for CSV upload)
  saveDebtsBulk: (data) => api.post('/students/debt/bulk', data),

  // Delete individual debt
  deleteDebt: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/debt?${queryString}`);
  },

  // ========== MARKS CONFIG OPERATIONS ==========

  // Get marks configuration
  getMarksConfig: () => api.get('/students/marks-config'),

  // Save marks configuration
  saveMarksConfig: (data) => api.post('/students/marks-config', data),

  // ========== CSV OPERATIONS ==========

  // Download CSV template
  downloadTemplate: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/template?${queryString}`, {
      responseType: 'blob',
    });
  },

  // Download registered students CSV
  exportCSV: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/students/export?${queryString}`, {
      responseType: 'blob',
    });
  },

  // Bulk upload students from CSV
  bulkUpload: (formData) => api.post('/students/bulk-upload', formData),

  // Download Photo Entry Form PDF
  downloadPhotoEntryFormPDF: (level, stream, year, month = null, term = null) => {
    const params = new URLSearchParams();
    params.append('level', level);
    params.append('stream', stream);
    params.append('year', year.toString());
    if (month) {
      params.append('month', month);
    }
    if (term) {
      params.append('term', term);
    }
    return api.get(`/students/photo-entry-form/pdf?${params.toString()}`, {
      responseType: 'blob',
    });
  },

  // Clear scores for specific students
  clearScores: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/students/scores/clear?${queryString}`);
  },
};

