import api from './api';

export const authAPI = {
  uploadProfilePicture: (formData) =>
    api.post('/auth/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteProfilePicture: () => api.delete('/auth/profile-picture'),
};
