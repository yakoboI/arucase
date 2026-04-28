/**
 * Authority Data Management Page
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './Branding.css';

const Authority = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    signature: '',
    date: '',
  });

  // Fetch current authority data
  const { data: authorityData, isLoading, error: authorityError } = useQuery({
    queryKey: ['authority-data'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getAuthorityData();
        return res.data.authority || null;
      } catch (err) {
        console.error('[Authority] Error fetching authority data:', err);
        throw err;
      }
    },
  });

  // Initialize form data when authority data loads
  useEffect(() => {
    if (authorityData) {
      setFormData({
        name: authorityData.name || '',
        title: authorityData.title || '',
        signature: authorityData.signature || '',
        date: authorityData.date || '',
      });
    }
  }, [authorityData]);

  // Save authority data mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.saveAuthorityData(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['authority-data']);
      toast.success('Authority information saved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save authority data');
    },
  });

  // Upload signature image mutation
  const uploadSignatureMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('signature_file', file);
      return adminAPI.uploadAuthoritySignature(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['authority-data']);
      toast.success('Signature image uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload signature');
    },
  });

  // Delete signature image mutation
  const deleteSignatureMutation = useMutation({
    mutationFn: async () => {
      return adminAPI.deleteAuthoritySignature();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['authority-data']);
      toast.success('Signature image deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete signature');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.title.trim()) {
      toast.error('Name and title are required');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WEBP');
      return;
    }

    uploadSignatureMutation.mutate(file);
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

  const handleDeleteSignature = () => {
    if (window.confirm('Are you sure you want to delete the signature image?')) {
      deleteSignatureMutation.mutate();
    }
  };

  const getSignatureUrl = () => {
    if (!authorityData?.signature_image_path) return null;
    
    // Use the same URL construction as Logo and Stamp components
    const path = authorityData.signature_image_path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Construct full URL to backend static files
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    // Remove leading slash from path if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/static/${cleanPath}`;
  };

  return (
    <AdminLayout>
      <div className="branding-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-signature"></i>
            Authority Data Management
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : authorityError ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle error-icon"></i>
                <h3>Error Loading Authority Data</h3>
                <p>{authorityError.message || 'Failed to load authority information'}</p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="authority-form">
                  <div className="form-section">
                    <h3>Authority Information</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Name of Authorisor *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="excel-input"
                          required
                          placeholder="e.g., Fr.Moses Assey"
                        />
                      </div>
                      <div className="form-group">
                        <label>Title of Authorisor *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="excel-input"
                          required
                          placeholder="e.g., Rector"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Text Signature (Optional)</label>
                        <input
                          type="text"
                          value={formData.signature}
                          onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                          className="excel-input"
                          placeholder="Text signature"
                        />
                      </div>
                      <div className="form-group">
                        <label>Authorization Date (Optional)</label>
                        <input
                          type="text"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="excel-input"
                          placeholder="Date"
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                        <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Authority Data'}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="signature-section">
                  <h3>Signature Image</h3>
                  {getSignatureUrl() && authorityData?.signature_image_path ? (
                    <div className="signature-preview">
                      <img
                        src={getSignatureUrl()}
                        alt="Authority Signature"
                        className="signature-image"
                        onError={(e) => {
                          console.error('[Authority] Signature image load error:', e.target.src);
                          e.target.style.display = 'none';
                          const placeholder = e.target.nextElementSibling;
                          if (placeholder) {
                            placeholder.style.display = 'block';
                          }
                        }}
                      />
                      <div className="logo-placeholder" style={{ display: 'none' }}>
                        <i className="fas fa-signature placeholder-icon"></i>
                        <p>Signature image not found</p>
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                          {authorityData.signature_image_path}
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteSignature}
                        className="excel-btn danger small"
                        disabled={deleteSignatureMutation.isLoading}
                      >
                        <i className="fas fa-trash"></i> Delete Signature Image
                      </button>
                    </div>
                  ) : (
                    <div className="logo-placeholder">
                      <i className="fas fa-signature placeholder-icon"></i>
                      <p>No signature image uploaded</p>
                    </div>
                  )}

                  <div className="upload-section">
                    <h4>Upload Signature Image</h4>
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
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={handleFileInputChange}
                        style={{ display: 'none' }}
                      />
                      <i className="fas fa-cloud-upload-alt upload-icon"></i>
                      <p className="upload-text">
                        {dragActive ? 'Drop signature here' : 'Click or drag signature to upload'}
                      </p>
                      <p className="upload-hint">
                        Recommended: Width 200-400px, Height 40-80px (one line)
                      </p>
                    </div>

                    {uploadSignatureMutation.isLoading && (
                      <div className="upload-progress">
                        <i className="fas fa-spinner fa-spin"></i> Uploading...
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Authority;

