/**
 * Administrators Management
 */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import DataTable from '../../components/common/DataTable';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './Administrators.css';

const Administrators = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    year_started: '',
    display_order: 0,
    active: true
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Fetch administrators
  const { data: administratorsData, isLoading, error } = useQuery({
    queryKey: ['administrators'],
    queryFn: async () => {
      const res = await adminAPI.getAdministrators();
      return res.data.administrators || [];
    },
  });

  const administrators = administratorsData || [];

  // Save administrator mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData();
      formDataToSend.append('id', data.id || '');
      formDataToSend.append('name', data.name);
      formDataToSend.append('title', data.title);
      formDataToSend.append('year_started', data.year_started || '');
      formDataToSend.append('display_order', data.display_order || 0);
      formDataToSend.append('active', data.active);
      
      if (data.photo) {
        formDataToSend.append('photo', data.photo);
      }
      
      return adminAPI.saveAdministrator(formDataToSend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['administrators']);
      toast.success(`Administrator ${editingAdmin ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save administrator');
    },
  });

  // Delete administrator mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteAdministrator(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['administrators']);
      toast.success('Administrator deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete administrator');
    },
  });

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name || '',
        title: admin.title || '',
        year_started: admin.year_started || '',
        display_order: admin.display_order || 0,
        active: admin.active !== false
      });
      setPhotoPreview(admin.photo ? getPhotoUrl(admin.photo) : null);
      setSelectedPhoto(null);
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        title: '',
        year_started: '',
        display_order: 0,
        active: true
      });
      setPhotoPreview(null);
      setSelectedPhoto(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({
      name: '',
      title: '',
      year_started: '',
      display_order: 0,
      active: true
    });
    setPhotoPreview(null);
    setSelectedPhoto(null);
    setDragActive(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.title.trim()) {
      toast.error('Name and title are required');
      return;
    }

    saveMutation.mutate({
      ...formData,
      id: editingAdmin?.id,
      photo: selectedPhoto
    });
  };

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

    setSelectedPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
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

  const handleDelete = (admin) => {
    if (window.confirm(`Are you sure you want to delete "${admin.name}"?`)) {
      deleteMutation.mutate(admin.id);
    }
  };

  const getPhotoUrl = (photoPath) => (photoPath ? resolveStaticUrl(photoPath) : null);

  const columns = [
    { key: 'display_order', label: 'Order' },
    { 
      key: 'photo', 
      label: 'Photo', 
      render: (value) => (
        value ? (
          <img src={getPhotoUrl(value)} alt="Admin" className="admin-photo-preview" onError={(e) => e.target.style.display = 'none'} />
        ) : (
          <div className="admin-photo-placeholder">
            <i className="fas fa-user"></i>
          </div>
        )
      )
    },
    { key: 'name', label: 'Name' },
    { key: 'title', label: 'Title' },
    { key: 'year_started', label: 'Year Started' },
    { 
      key: 'active', 
      label: 'Status', 
      render: (value) => (
        <span className={`status-badge ${value ? 'active' : 'inactive'}`}>
          <i className={`fas fa-${value ? 'check' : 'times'}-circle`}></i>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-action-btn edit"
            onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}
            title="Edit"
          >
            <i className="fas fa-edit"></i> Edit
          </button>
          <button
            type="button"
            className="admin-action-btn delete"
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            title="Delete"
          >
            <i className="fas fa-trash-alt"></i> Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="administrators-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-user-tie"></i>
            <span className="admin-page-title">Administrators Management</span>
            <div className="header-actions">
              <button onClick={() => handleOpenModal()} className="excel-btn secondary small">
                <i className="fas fa-plus-circle"></i> Add New
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            <p className="admin-page-description">
              Manage school leadership and administration team
            </p>

            {isLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i> Loading administrators...
              </div>
            ) : error ? (
              <div className="error-state">
                <i className="fas fa-exclamation-circle"></i> Error loading administrators: {error.message}
              </div>
            ) : (
              <>
                <div className="admin-info-row">
                  <span className="admin-info-badge">
                    <i className="fas fa-info-circle"></i> Total: <strong>{administrators.length}</strong>
                  </span>
                </div>

                {administrators.length === 0 ? (
                  <div className="admin-empty-state">
                    <i className="fas fa-user-tie"></i>
                    <h3>No Administrators Yet</h3>
                    <p>Tap &quot;Add New&quot; to add school leadership team members.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop: table */}
                    <div className="admin-table-container">
                      <DataTable
                        data={administrators}
                        columns={columns}
                      />
                    </div>
                    {/* Mobile: card list */}
                    <div className="admin-mobile-list">
                      {administrators.map((admin) => (
                        <div key={admin.id} className="admin-mobile-card">
                          <div className="admin-mobile-card-top">
                            <div className="admin-mobile-photo-wrap">
                              {admin.photo ? (
                                <img src={getPhotoUrl(admin.photo)} alt="" className="admin-mobile-photo" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.add('show'); }} />
                              ) : null}
                              <div className={`admin-mobile-photo-placeholder ${!admin.photo ? 'show' : ''}`}><i className="fas fa-user"></i></div>
                            </div>
                            <div className="admin-mobile-info">
                              <div className="admin-mobile-name">{admin.name}</div>
                              <div className="admin-mobile-title">{admin.title}</div>
                              {admin.year_started && <div className="admin-mobile-year">From {admin.year_started}</div>}
                              <span className={`status-badge ${admin.active ? 'active' : 'inactive'}`}>
                                {admin.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="admin-mobile-card-actions">
                            <button type="button" className="admin-action-btn edit" onClick={() => handleOpenModal(admin)}>
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button type="button" className="admin-action-btn delete" onClick={() => handleDelete(admin)}>
                              <i className="fas fa-trash-alt"></i> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingAdmin ? 'Edit Administrator' : 'Add New Administrator'}</h3>
                <button onClick={handleCloseModal} className="modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="excel-input"
                    required
                    placeholder="e.g., Rev. Fr. Moses Assey"
                  />
                </div>

                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="excel-input"
                    required
                    placeholder="e.g., The Seminary Rector"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year Started</label>
                    <input
                      type="text"
                      value={formData.year_started}
                      onChange={(e) => setFormData({ ...formData, year_started: e.target.value })}
                      className="excel-input"
                      placeholder="e.g., 2020"
                    />
                  </div>

                  <div className="form-group">
                    <label>Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="excel-input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>

                <div className="form-group">
                  <label>Photo</label>
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
                    {photoPreview ? (
                      <div className="photo-preview-container">
                        <img src={photoPreview} alt="Preview" className="photo-preview" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoPreview(null);
                            setSelectedPhoto(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="remove-photo-btn"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt upload-icon"></i>
                        <p className="upload-text">
                          {dragActive ? 'Drop photo here' : 'Click or drag photo to upload'}
                        </p>
                        <p className="upload-hint">
                          Supported formats: PNG, JPG, JPEG, WEBP (Max 5MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleCloseModal} className="excel-btn secondary">
                    Cancel
                  </button>
                  <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                    <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : (editingAdmin ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Administrators;
