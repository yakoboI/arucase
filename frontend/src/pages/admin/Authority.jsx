/**
 * Authority Data Management Page
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import { resolveStaticUrl } from '../../utils/backendUrl';
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

  const getSignatureUrl = () =>
    authorityData?.signature_image_path
      ? resolveStaticUrl(authorityData.signature_image_path)
      : null;

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
                  <div className="signature-row">
                    {getSignatureUrl() && authorityData?.signature_image_path ? (
                      <div className="signature-preview-compact">
                        <img
                          src={getSignatureUrl()}
                          alt="Authority Signature"
                          className="signature-image-small"
                          onError={(e) => {
                            console.error('[Authority] Signature image load error:', e.target.src);
                            e.target.style.display = 'none';
                            const placeholder = e.target.nextElementSibling;
                            if (placeholder) {
                              placeholder.style.display = 'block';
                            }
                          }}
                        />
                        <div className="logo-placeholder-small" style={{ display: 'none' }}>
                          <i className="fas fa-signature placeholder-icon-small"></i>
                          <p style={{ fontSize: '0.75rem', margin: '0.25rem 0' }}>Signature image not found</p>
                        </div>
                        <button
                          onClick={handleDeleteSignature}
                          className="excel-btn danger small"
                          disabled={deleteSignatureMutation.isLoading}
                        >
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </div>
                    ) : (
                      <div className="signature-preview-compact">
                        <div className="logo-placeholder-small">
                          <i className="fas fa-signature placeholder-icon-small"></i>
                          <p style={{ fontSize: '0.75rem', margin: '0.25rem 0' }}>No signature uploaded</p>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="excel-btn primary small"
                        >
                          <i className="fas fa-upload"></i> Upload
                        </button>
                      </div>
                    )}

                    <div className="upload-section-compact">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={handleFileInputChange}
                        style={{ display: 'none' }}
                      />
                      <div
                        className={`upload-area-small ${dragActive ? 'drag-active' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="fas fa-cloud-upload-alt upload-icon-small"></i>
                        <p className="upload-text-small">
                          {dragActive ? 'Drop here' : 'Click or drag to upload'}
                        </p>
                        <p className="upload-hint-small">
                          200-400px × 40-80px
                        </p>
                      </div>

                      {uploadSignatureMutation.isLoading && (
                        <div className="upload-progress-small">
                          <i className="fas fa-spinner fa-spin"></i> Uploading...
                        </div>
                      )}
                    </div>
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

