/**
 * Gallery Management Page
 */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const Gallery = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const hasToken = false; // Remove token requirement - let enhanced auth handle it
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    category: 'general',
    caption: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [dragActive, setDragActive] = useState(false);

  // Fetch gallery photos
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getGalleryPhotos();
        return res.data.photos || [];
      } catch (error) {
        // During auth/session transitions, avoid noisy unhandled object rejections.
        if (error?.response?.status === 401) return [];
        throw error;
      }
    },
    enabled: hasToken,
    retry: false,
  });

  // Upload photos mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return adminAPI.uploadGalleryPhotos(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-gallery']);
      toast.success('Photos uploaded successfully!');
      setShowUploadModal(false);
      resetUploadForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload photos');
    },
  });

  // Delete photo mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteGalleryPhoto(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-gallery']);
      toast.success('Photo deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete photo');
    },
  });

  // Delete all photos mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return adminAPI.deleteAllGalleryPhotos();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['admin-gallery']);
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
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-images"></i>
            Gallery Management
            <div className="header-actions">
              {photos.length > 0 && (
                <button 
                  onClick={handleDeleteAll} 
                  className="excel-btn danger small"
                  disabled={deleteAllMutation.isPending}
                  title="Delete all photos"
                >
                  <i className="fas fa-trash-alt"></i> {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All'}
                </button>
              )}
              <button onClick={() => setShowUploadModal(true)} className="excel-btn primary small">
                <i className="fas fa-upload"></i> Upload Photos
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading gallery...</div>
            ) : (
              <>
                <div className="gallery-grid">
                  {photos.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-images empty-icon"></i>
                      <p>No photos uploaded yet</p>
                      <button onClick={() => setShowUploadModal(true)} className="excel-btn primary">
                        Upload First Photo
                      </button>
                    </div>
                  ) : (
                    photos.map((photo) => (
                      <div key={photo.id} className="gallery-item">
                        <img
                          src={getPhotoUrl(photo.path)}
                          alt={photo.caption || 'Gallery photo'}
                          className="gallery-thumbnail"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div className="gallery-placeholder" style={{ display: 'none' }}>
                          <i className="fas fa-image"></i>
                        </div>
                        <div className="gallery-item-info">
                          <div className="gallery-item-category">{photo.category}</div>
                          {photo.caption && <div className="gallery-item-caption">{photo.caption}</div>}
                          <div className="gallery-item-date">{photo.date}</div>
                        </div>
                        <button onClick={() => handleDelete(photo)} className="gallery-delete-btn">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {showUploadModal && (
                  <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>Upload Gallery Photos</h3>
                        <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <form onSubmit={handleUpload} className="upload-form">
                        <div className="form-group">
                          <label>Select Photos (Multiple) *</label>
                          <input
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
                            <label>Category</label>
                            <select
                              value={uploadData.category}
                              onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                              className="excel-input"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Date</label>
                            <input
                              type="date"
                              value={uploadData.date}
                              onChange={(e) => setUploadData({ ...uploadData, date: e.target.value })}
                              className="excel-input"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Caption (Optional)</label>
                          <input
                            type="text"
                            value={uploadData.caption}
                            onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                            className="excel-input"
                            placeholder="Photo caption"
                          />
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="excel-btn primary" disabled={uploadMutation.isPending}>
                            <i className="fas fa-upload"></i> {uploadMutation.isPending ? 'Uploading...' : 'Upload Photos'}
                          </button>
                          <button type="button" onClick={() => setShowUploadModal(false)} className="excel-btn secondary">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
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
