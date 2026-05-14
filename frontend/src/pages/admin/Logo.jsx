/**
 * School Logo Management Page
 */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './Logo.css';

const Logo = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch current logo
  const { data: logoData, isLoading, error: logoError } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolLogo();
        return res.data.logo || null;
      } catch (error) {
        console.error('[Logo] Error fetching logo:', error);
        return null;
      }
    },
    retry: false,
  });

  // Upload logo mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('logo_file', file);
      return adminAPI.uploadSchoolLogo(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-logo'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      toast.success('Logo uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    },
  });

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, JPEG, or WEBP');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 5MB');
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const getLogoUrl = () =>
    logoData?.logo_image_path ? resolveStaticUrl(logoData.logo_image_path) : null;

  return (
    <AdminLayout>
      <div className="logo-admin-page">
        <div className="excel-card logo-root-card">
          <div className="excel-card-header">
            <i className="fas fa-image"></i>
            School Logo Management
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : logoError ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle error-icon"></i>
                <h3>Error Loading Logo</h3>
                <p>{logoError.message || 'Failed to load logo information'}</p>
              </div>
            ) : (
              <>
                <div className="current-logo-section">
                  <h3>Current Logo</h3>
                  {getLogoUrl() && logoData?.logo_image_path ? (
                    <div className="logo-preview">
                      <img
                        src={getLogoUrl()}
                        alt="School Logo"
                        className="logo-image"
                        onError={(e) => {
                          console.error('[Logo] Image load error:', e.target.src);
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) placeholder.style.display = 'block';
                        }}
                        onLoad={() => {
                          console.log('[Logo] Image loaded successfully:', getLogoUrl());
                        }}
                      />
                      <div className="logo-placeholder" style={{ display: 'none' }}>
                        <i className="fas fa-image placeholder-icon"></i>
                        <p>Logo image not found</p>
                        <p className="logo-path">Path: {logoData.logo_image_path}</p>
                        <p className="logo-url">URL: {getLogoUrl()}</p>
                      </div>
                      <p className="logo-path">Path: {logoData.logo_image_path}</p>
                      <p className="logo-url">URL: {getLogoUrl()}</p>
                    </div>
                  ) : (
                    <div className="logo-placeholder">
                      <i className="fas fa-image placeholder-icon"></i>
                      <p>No logo uploaded</p>
                      <p className="upload-hint">Upload a logo using the form below</p>
                    </div>
                  )}
                </div>

                <div className="upload-section">
                  <h3>Upload New Logo</h3>
                  <div
                    className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                    <i className="fas fa-cloud-upload-alt upload-icon"></i>
                    <p className="upload-text">
                      {dragActive ? 'Drop logo here' : 'Click or drag logo to upload'}
                    </p>
                    <p className="upload-hint">
                      Supported formats: PNG, JPG, JPEG, WEBP (Max 5MB)
                    </p>
                  </div>

                  {uploadMutation.isLoading && (
                    <div className="upload-progress">
                      <i className="fas fa-spinner fa-spin"></i> Uploading...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Logo;

