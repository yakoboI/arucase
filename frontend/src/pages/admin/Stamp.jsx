/**
 * School Stamp Management Page
 */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/admin';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './Stamp.css';

const Stamp = () => {
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const { data: stampData, isLoading, error: stampError } = useQuery({
    queryKey: ['school-stamp'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolStamp();
        return res.data.stamp || null;
      } catch (err) {
        console.error('[Stamp] Error fetching stamp:', err);
        throw err;
      }
    },
    enabled: !authLoading,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('stamp_file', file);
      return adminAPI.uploadSchoolStamp(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-stamp'] });
      toast.success('Stamp uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload stamp');
    },
  });

  const handleFileSelect = (file) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, JPEG, or WEBP');
      return;
    }

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

  const getStampUrl = () =>
    stampData?.stamp_image_path ? resolveStaticUrl(stampData.stamp_image_path) : null;

  return (
    <AdminLayout>
      <div className="stamp-admin-page">
        <div className="excel-card stamp-root-card">
          <div className="excel-card-header">
            <i className="fas fa-stamp" aria-hidden="true"></i>
            School Stamp Management
          </div>
          <div className="excel-card-body">
            {authLoading || isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : stampError ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle error-icon" aria-hidden="true"></i>
                <h3>Error Loading Stamp</h3>
                <p>{stampError.message || 'Failed to load stamp information'}</p>
              </div>
            ) : (
              <>
                <div className="current-logo-section">
                  <h3>Current Stamp</h3>
                  {getStampUrl() && stampData?.stamp_image_path ? (
                    <div className="logo-preview">
                      <img
                        src={getStampUrl()}
                        alt="School Stamp"
                        className="stamp-image"
                        onError={(e) => {
                          console.error('[Stamp] Image load error:', e.target.src);
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'block';
                          }
                        }}
                      />
                      <div className="logo-placeholder" style={{ display: 'none' }}>
                        <i className="fas fa-stamp placeholder-icon" aria-hidden="true"></i>
                        <p>Stamp image not found</p>
                        {stampData.stamp_image_path ? (
                          <p className="stamp-path-meta">{stampData.stamp_image_path}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="logo-placeholder">
                      <i className="fas fa-stamp placeholder-icon" aria-hidden="true"></i>
                      <p>No stamp uploaded</p>
                    </div>
                  )}
                </div>

                <div className="upload-section">
                  <h3>Upload New Stamp</h3>
                  <div
                    className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                    <i className="fas fa-cloud-upload-alt upload-icon" aria-hidden="true"></i>
                    <p className="upload-text">
                      {dragActive ? 'Drop stamp here' : 'Click or drag stamp to upload'}
                    </p>
                    <p className="upload-hint">Supported formats: PNG, JPG, JPEG, WEBP (Max 5MB)</p>
                  </div>

                  {uploadMutation.isPending && (
                    <div className="upload-progress">
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Uploading...
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

export default Stamp;
