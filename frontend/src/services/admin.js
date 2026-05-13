/**
 * Admin API Service
 */
import api from './api';

export const adminAPI = {
  // School branding (text)
  getSchoolBranding: () => api.get('/admin/school-branding'),
  saveSchoolBranding: (data) => api.post('/admin/school-branding', data),

  // Get all announcements
  getAnnouncements: () => api.get('/admin/announcements'),

  // Save announcement
  saveAnnouncement: (data) => api.post('/admin/announcements', data),

  // Delete announcement
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),

  // Generate announcement ID
  generateAnnouncementId: () => api.get('/admin/announcements/generate-id'),

  // Get school logo
  getSchoolLogo: () => api.get('/admin/school-logo'),

  // Upload school logo
  uploadSchoolLogo: (formData) => api.post('/admin/school-logo', formData),

  // Get school stamp
  getSchoolStamp: () => api.get('/admin/school-stamp'),

  // Upload school stamp
  uploadSchoolStamp: (formData) => api.post('/admin/school-stamp', formData),

  // Get authority data
  getAuthorityData: () => api.get('/admin/authority-data'),

  // Save authority data
  saveAuthorityData: (data) => api.post('/admin/authority-data', data),

  // Upload authority signature
  uploadAuthoritySignature: (formData) => api.post('/admin/authority-data/upload-signature', formData),

  // Delete authority signature
  deleteAuthoritySignature: () => api.post('/admin/authority-data/delete-signature'),

  // Get patron saint image
  getPatronSaintImage: () => api.get('/admin/patron-saint-image'),

  // Upload patron saint image
  uploadPatronSaintImage: (formData) => api.post('/admin/patron-saint-image', formData),

  // ========== USER MANAGEMENT ==========

  // Get all users
  getUsers: () => api.get('/admin/users'),

  // Get user by ID
  getUser: (id) => api.get(`/admin/users/${id}`),

  // Save user (create or update)
  saveUser: (data) => api.post('/admin/users', data),

  // Delete user
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Get subjects list
  getSubjectsList: () => api.get('/admin/subjects-list'),

  // ========== STUDENT PROMOTION ==========

  // Get promotion dashboard
  getPromotionDashboard: () => api.get('/admin/promotion/dashboard'),

  // Get promotion preview
  getPromotionPreview: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/promotion/preview?${queryString}`);
  },

  // Execute promotion
  executePromotion: (data) => api.post('/admin/promotion/execute', data),

  // Get student promotion history
  getStudentPromotionHistory: (admNo) => api.get(`/admin/promotion/history/${admNo}`),

  // Save promotion exclusion
  savePromotionExclusion: (data) => api.post('/admin/promotion/exclusions', data),

  // Delete promotion exclusion
  deletePromotionExclusion: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.delete(`/admin/promotion/exclusions?${queryString}`);
  },

  // ========== PUBLIC WEBSITE MANAGEMENT ==========

  // ========== EVENTS ==========
  // Events routes removed

  // ========== GALLERY ==========
  getGalleryPhotos: () => api.get('/admin/gallery'),
  uploadGalleryPhotos: (formData) => api.post('/admin/gallery/upload', formData),
  deleteGalleryPhoto: (id) => api.delete(`/admin/gallery/${id}`),
  deleteAllGalleryPhotos: () => api.delete('/admin/gallery/delete-all'),

  // ========== ALUMNI ==========
  getAlumni: () => api.get('/admin/alumni'),
  saveAlumni: (formData) => api.post('/admin/alumni', formData),
  updateAlumniStatus: (id, status) => api.post(`/admin/alumni/${id}/status`, { status }),
  deleteAlumni: (id) => api.delete(`/admin/alumni/${id}`),

  // ========== TESTIMONIES ==========
  // Testimonies routes removed


  // ========== FAQs ==========
  getFAQs: () => api.get('/admin/faqs'),
  getActiveFAQs: () => api.get('/admin/faqs/active'),
  saveFAQ: (data) => api.post('/admin/faqs', data),
  toggleFAQStatus: (id, active) => api.post(`/admin/faqs/${id}/toggle`, { active }),
  deleteFAQ: (id) => api.delete(`/admin/faqs/${id}`),

  // ========== DEPARTMENT CONTACTS ==========
  getDepartmentContacts: () => api.get('/admin/department-contacts'),
  updateDepartmentContacts: (data) => api.post('/admin/department-contacts', data),

  // ========== ADMINISTRATORS ==========
  getAdministrators: () => api.get('/admin/administrators'),
  saveAdministrator: (formData) => api.post('/admin/administrators', formData),
  deleteAdministrator: (id) => api.delete(`/admin/administrators/${id}`),

  // ========== STAFF PROFILES ==========
  getStaffProfiles: () => api.get('/admin/staff-profiles'),
  saveStaffProfile: (formData) => api.post('/admin/staff-profiles', formData),
  deleteStaffProfile: (id) => api.delete(`/admin/staff-profiles/${id}`),

  // ========== PASS ID MANAGEMENT ==========
  getPassIds: (form, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/pass-ids/${form}?${queryString}`);
  },
  generatePassIds: (data) => api.post('/admin/pass-ids/generate', data),
  regeneratePassId: (data) => api.post('/admin/pass-ids/regenerate', data),

  // ========== PUBLIC PAGES ==========
  getPublicPages: () => api.get('/admin/public-pages'),
  getPublicPage: (pageName) => api.get(`/admin/public-pages/${pageName}`),
  savePublicPage: (data) => api.post('/admin/public-pages', data),
  deletePublicPage: (pageName) => api.delete(`/admin/public-pages/${pageName}`),

  // ========== NECTA URLS ==========
  getNECTAUrls: () => api.get('/admin/necta-urls'),
  getNECTAUrl: (examType, year) => api.get(`/admin/necta-urls/${examType}/${year}`),
  saveNECTAUrl: (data) => api.post('/admin/necta-urls', data),
  deleteNECTAUrl: (id) => api.delete(`/admin/necta-urls/${id}`),
  toggleNECTAUrlStatus: (id, active) => api.post(`/admin/necta-urls/${id}/toggle`, { active }),
  importNECTAResults: (exam_type, year) => api.post('/admin/necta/import', { exam_type, year }),

  // AI Matters (upload PDF/CSV/Word, chat over content)
  getAIMattersDocuments: () => api.get('/admin/ai-matters/documents'),
  uploadAIMattersDocument: (formData) => api.post('/admin/ai-matters/upload', formData),
  deleteAIMattersDocument: (id) => api.delete(`/admin/ai-matters/documents/${id}`),
  chatAIMatters: (message) => api.post('/admin/ai-matters/chat', { message }),

  // Admissions applications (public applicants)
  getAdmissionApplications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/admission-applications${qs ? `?${qs}` : ''}`);
  },
  updateAdmissionApplicationStatus: (id, status, feedback) =>
    api.post(`/admin/admission-applications/${id}/status`, { status, feedback }),
  deleteAdmissionApplication: (id) => api.delete(`/admin/admission-applications/${id}`),
};

