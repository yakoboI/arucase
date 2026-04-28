/**
 * School Branding Management
 */
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './SchoolBranding.css';

const SchoolBranding = () => {
  const queryClient = useQueryClient();
  const logoFileInputRef = useRef(null);
  const patronSaintFileInputRef = useRef(null);
  
  const [schoolName, setSchoolName] = useState('Arusha Catholic Seminary');
  const [tagline, setTagline] = useState('');
  const [bannerText, setBannerText] = useState('');

  // Fetch current text branding
  const { data: brandingData } = useQuery({
    queryKey: ['school-branding'],
    queryFn: async () => {
      const res = await adminAPI.getSchoolBranding();
      return res.data?.branding || null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!brandingData) return;
    setSchoolName(brandingData.school_name || 'Arusha Catholic Seminary');
    setTagline(brandingData.tagline || '');
    setBannerText(brandingData.banner_text || '');
  }, [brandingData]);

  // Fetch current logo
  const { data: logoData, isLoading: logoLoading } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolLogo();
        return res.data.logo || null;
      } catch (error) {
        console.error('[SchoolBranding] Error fetching logo:', error);
        return null;
      }
    },
    retry: false,
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('logo_file', file);
      return adminAPI.uploadSchoolLogo(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['school-logo']);
      toast.success('Logo uploaded successfully!');
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    },
  });

  // Fetch current patron saint image
  const { data: patronSaintData, isLoading: patronSaintLoading } = useQuery({
    queryKey: ['patron-saint-image'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getPatronSaintImage();
        return res.data.patron_saint_image || null;
      } catch (error) {
        console.error('[SchoolBranding] Error fetching patron saint image:', error);
        return null;
      }
    },
    retry: false,
  });

  // Upload patron saint image mutation
  const uploadPatronSaintMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('patron_saint_file', file);
      return adminAPI.uploadPatronSaintImage(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['patron-saint-image']);
      toast.success('Patron Saint image uploaded successfully!');
      if (patronSaintFileInputRef.current) {
        patronSaintFileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    },
  });

  const handleLogoFileSelect = (file) => {
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

    uploadLogoMutation.mutate(file);
  };

  const handlePatronSaintFileSelect = (file) => {
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

    uploadPatronSaintMutation.mutate(file);
  };

  const handleLogoInputChange = (e) => {
    const file = e.target.files[0];
    handleLogoFileSelect(file);
  };

  const handlePatronSaintInputChange = (e) => {
    const file = e.target.files[0];
    handlePatronSaintFileSelect(file);
  };

  const handleLogoUploadClick = () => {
    logoFileInputRef.current?.click();
  };

  const handlePatronSaintUploadClick = () => {
    patronSaintFileInputRef.current?.click();
  };

  const getLogoUrl = () => {
    if (!logoData?.logo_image_path) return null;
    
    const path = logoData.logo_image_path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const getPatronSaintUrl = () => {
    if (!patronSaintData) return null;
    
    const path = patronSaintData;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const saveTextBrandingMutation = useMutation({
    mutationFn: async () => {
      return adminAPI.saveSchoolBranding({
        school_name: schoolName,
        tagline,
        banner_text: bannerText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['school-branding']);
      queryClient.invalidateQueries(['homepage']); // public header/footer/settings use this
      toast.success('Text branding saved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save text branding');
    },
  });

  const handleSaveTextBranding = () => {
    if (!schoolName.trim()) {
      toast.error('School Name is required');
      return;
    }
    saveTextBrandingMutation.mutate();
  };

  return (
    <AdminLayout>
      <div style={{ padding: '2rem' }}>
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-school"></i>
            School Branding Management
            <div className="header-actions">
              <Link to="/admin" className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <p style={{ marginBottom: '2rem', color: '#656d76', textAlign: 'center' }}>
              Manage school name, logos, tagline, and banner text
            </p>

            <div className="branding-container">
              {/* Text Branding Section */}
              <div className="branding-card">
                <div className="branding-card-header blue-gradient">
                  <h3>
                    <i className="fas fa-text-height"></i> Text Branding
                  </h3>
                </div>
                <div className="branding-card-body">
                  <div className="branding-form-group">
                    <label className="branding-form-label">School Name:</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="branding-form-control"
                      required
                    />
                  </div>

                  <div className="branding-form-group">
                    <label className="branding-form-label">Tagline:</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="branding-form-control"
                      placeholder="Enter school tagline"
                    />
                  </div>

                  <div className="branding-form-group">
                    <label className="branding-form-label">Banner Text:</label>
                    <input
                      type="text"
                      value={bannerText}
                      onChange={(e) => setBannerText(e.target.value)}
                      className="branding-form-control"
                      placeholder="Enter banner text"
                    />
                  </div>

                  <button 
                    className="branding-btn-primary"
                    onClick={handleSaveTextBranding}
                    disabled={saveTextBrandingMutation.isPending}
                  >
                    {saveTextBrandingMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i> Save Text Branding
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Logos Section */}
              <div className="branding-card">
                <div className="branding-card-header green-gradient">
                  <h3>
                    <i className="fas fa-images"></i> Logos & Images
                  </h3>
                </div>
                <div className="branding-card-body">
                  <div className="branding-grid">
                    {/* School Logo */}
                    <div>
                      <h4 className="branding-section-title">School Logo</h4>
                      {logoLoading ? (
                        <div className="branding-empty-state">
                          <i className="fas fa-spinner fa-spin"></i>
                          <p>Loading...</p>
                        </div>
                      ) : getLogoUrl() ? (
                        <div className="branding-image-preview">
                          <img
                            src={getLogoUrl()}
                            alt="School Logo"
                            className="branding-preview-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const placeholder = e.target.nextElementSibling;
                              if (placeholder) placeholder.style.display = 'block';
                            }}
                          />
                          <div className="branding-empty-state" style={{ display: 'none' }}>
                            <i className="fas fa-image"></i>
                            <p>Logo image not found</p>
                          </div>
                        </div>
                      ) : (
                        <div className="branding-empty-state">
                          <i className="fas fa-image"></i>
                          <p>No logo uploaded</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="branding-file-input"
                        ref={logoFileInputRef}
                        onChange={handleLogoInputChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="branding-btn-success"
                        onClick={handleLogoUploadClick}
                        disabled={uploadLogoMutation.isPending}
                      >
                        {uploadLogoMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload"></i> Upload Logo
                          </>
                        )}
                      </button>
                    </div>

                    {/* Patron Saint Image */}
                    <div>
                      <h4 className="branding-section-title">Patron Saint Image</h4>
                      {patronSaintLoading ? (
                        <div className="branding-empty-state">
                          <i className="fas fa-spinner fa-spin"></i>
                          <p>Loading...</p>
                        </div>
                      ) : getPatronSaintUrl() ? (
                        <div className="branding-image-preview">
                          <img
                            src={getPatronSaintUrl()}
                            alt="Patron Saint"
                            className="branding-preview-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const placeholder = e.target.nextElementSibling;
                              if (placeholder) placeholder.style.display = 'block';
                            }}
                          />
                          <div className="branding-empty-state" style={{ display: 'none' }}>
                            <i className="fas fa-image"></i>
                            <p>Image not found</p>
                          </div>
                        </div>
                      ) : (
                        <div className="branding-empty-state">
                          <i className="fas fa-image"></i>
                          <p>No image uploaded</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="branding-file-input"
                        ref={patronSaintFileInputRef}
                        onChange={handlePatronSaintInputChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="branding-btn-success"
                        onClick={handlePatronSaintUploadClick}
                        disabled={uploadPatronSaintMutation.isPending}
                      >
                        {uploadPatronSaintMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload"></i> Upload Image
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SchoolBranding;
