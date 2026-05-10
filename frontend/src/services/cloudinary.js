import axios from 'axios';

// Cloudinary service for frontend
const cloudinaryService = {
  // Get Cloudinary config from backend
  getCloudinaryConfig: async () => {
    try {
      const response = await axios.get('/api/cloudinary/test');
      return response.data;
    } catch (error) {
      console.error('Failed to get Cloudinary config:', error);
      return null;
    }
  },

  // Get signature for upload
  getUploadSignature: async (folder, publicId) => {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const response = await axios.post('/api/cloudinary/signature', {
        folder,
        public_id: publicId,
        timestamp
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get upload signature:', error);
      throw error;
    }
  },

  // Upload image using signature
  uploadImage: async (file, folder, publicId) => {
    try {
      const { signature, timestamp, cloud_name, api_key } = await cloudinaryService.getUploadSignature(folder, publicId);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('public_id', publicId);
      
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/image/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }
};

export default cloudinaryService;
