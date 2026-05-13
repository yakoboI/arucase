/**
 * Gallery Management Page
 */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';
import './AdminGallery.css';

const Gallery = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const { loading: authLoading } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    category: 'general',
    caption: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getGalleryPhotos();
        return res.data.photos || [];
      } catch (error) {
        if (error?.response?.status === 401) return [];
        throw error;
      }
    },
    enabled: !authLoading,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return adminAPI.uploadGalleryPhotos(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
      toast.success('Photos uploaded successfully!');
      setShowUploadModal(false);
      resetUploadForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload photos');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteGalleryPhoto(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
      toast.success('Photo deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete photo');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return adminAPI.deleteAllGalleryPhotos();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
      toast.success(response.data?.message || 'All photos deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete all photos');
    },
  });

  const resetUploadForm = () => {
    setUploadData({
      category: 'general',
      caption: '',
      date: new Date().toISOString().split('T')[0],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    if (!uploadData.date) {
      toast.error('Please select a date');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }
    formData.append('category', uploadData.category);
    formData.append('caption', uploadData.caption);
    formData.append('date', uploadData.date);

    uploadMutation.mutate(formData);
  };

  const handleDelete = (photo) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      deleteMutation.mutate(photo.id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('⚠️ WARNING: This will delete ALL photos from the database and file system!\n\nAre you absolutely sure you want to proceed?')) {
      if (window.confirm('This action cannot be undone. Click OK to confirm deletion of all photos.')) {
        deleteAllMutation.mutate();
      }
    }
  };

  const categories = ['general', 'events', 'sports', 'academics', 'campus', 'students', 'staff'];

  const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `/static/${path}`;
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container admin-gallery-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-images" aria-hidden="true"></i>
            Gallery Management
            <div className="header-actions">
              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="excel-btn danger small"
                  disabled={deleteAllMutation.isPending}
                  title="Delete all photos"
                >
                  <i className="fas fa-trash-alt" aria-hidden="true"></i>{' '}
                  {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All'}
                </button>
              )}
              <button type="button" onClick={() => setShowUploadModal(true)} className="excel-btn primary small">
                <i className="fas fa-upload" aria-hidden="true"></i> Upload Photos
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {authLoading || isLoading ? (
              <div className="loading-state">Loading gallery...</div>
            ) : (
              <>
                <div className="gallery-grid">
                  {photos.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-images empty-icon" aria-hidden="true"></i>
                      <p>No photos uploaded yet</p>
                      <button type="button" onClick={() => setShowUploadModal(true)} className="excel-btn primary">
                        Upload First Photo
                      </button>
                    </div>
                  ) : (
                    photos.map((photo) => (
                      <div key={photo.id} className="gallery-item">
                        <div className="gallery-image-wrap">
                          <img
                            src={getPhotoUrl(photo.path)}
                            alt={photo.caption || 'Gallery photo'}
                            className="gallery-thumbnail"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const ph = e.target.nextElementSibling;
                              if (ph) ph.style.display = 'flex';
                            }}
                          />
                          <div className="gallery-placeholder" style={{ display: 'none' }}>
                            <i className="fas fa-image" aria-hidden="true"></i>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(photo)}
                            className="gallery-delete-btn"
                            aria-label={`Delete photo ${photo.caption || photo.id}`}
                          >
                            <i className="fas fa-trash" aria-hidden="true"></i>
                          </button>
                        </div>
                        <div className="gallery-item-info">
                          <div className="gallery-item-category">{photo.category}</div>
                          {photo.caption ? <div className="gallery-item-caption">{photo.caption}</div> : null}
                          <div className="gallery-item-date">{photo.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {showUploadModal &&
                  createPortal(
                    <div className="admin-gallery-portal">
                      <div className="modal-overlay" role="presentation" onClick={() => setShowUploadModal(false)}>
                        <div
                          className="modal-content admin-gallery-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="admin-gallery-upload-title"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="modal-header">
                            <h3 id="admin-gallery-upload-title">Upload Gallery Photos</h3>
                            <button type="button" className="modal-close" onClick={() => setShowUploadModal(false)} aria-label="Close">
                              <i className="fas fa-times" aria-hidden="true"></i>
                            </button>
                          </div>
                          <form onSubmit={handleUpload} className="upload-form admin-gallery-upload-form">
                            <div className="admin-gallery-modal-scroll">
                              <div className="form-group">
                                <label htmlFor="admin-gallery-files">Select photos (multiple) *</label>
                                <input
                                  id="admin-gallery-files"
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="excel-input"
                                  required
                                />
                              </div>
                              <div className="form-row">
                                <div className="form-group">
                                  <label htmlFor="admin-gallery-category">Category *</label>
                                  <select
                                    id="admin-gallery-category"
                                    value={uploadData.category}
                                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                                    className="excel-input"
                                    required
                                  >
                                    {categories.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label htmlFor="admin-gallery-date">Date *</label>
                                  <input
                                    id="admin-gallery-date"
                                    type="date"
                                    value={uploadData.date}
                                    onChange={(e) => setUploadData({ ...uploadData, date: e.target.value })}
                                    className="excel-input"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="form-group">
                                <label htmlFor="admin-gallery-caption">Caption (optional)</label>
                                <input
                                  id="admin-gallery-caption"
                                  type="text"
                                  value={uploadData.caption}
                                  onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                                  className="excel-input"
                                  placeholder="Photo caption"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                            <div className="form-actions admin-gallery-form-actions">
                              <button type="submit" className="excel-btn primary" disabled={uploadMutation.isPending}>
                                <i className="fas fa-upload" aria-hidden="true"></i>{' '}
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload photos'}
                              </button>
                              <button type="button" onClick={() => setShowUploadModal(false)} className="excel-btn secondary">
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Gallery;
