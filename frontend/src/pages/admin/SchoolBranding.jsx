/**
 * School Branding Management
 */
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/admin';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './SchoolBranding.css';

const SchoolBranding = () => {
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();
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
    enabled: !authLoading,
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
    enabled: !authLoading,
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
      queryClient.invalidateQueries({ queryKey: ['school-logo'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
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
    enabled: !authLoading,
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
      queryClient.invalidateQueries({ queryKey: ['patron-saint-image'] });
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

  const getLogoUrl = () =>
    logoData?.logo_image_path ? resolveStaticUrl(logoData.logo_image_path) : null;

  const getPatronSaintUrl = () =>
    patronSaintData ? resolveStaticUrl(patronSaintData) : null;

  const saveTextBrandingMutation = useMutation({
    mutationFn: async () => {
      return adminAPI.saveSchoolBranding({
        school_name: schoolName,
        tagline,
        banner_text: bannerText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-branding'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
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
      <div className="school-branding-page">
        <div className="excel-card school-branding-root-card">
          <div className="excel-card-header">
            <i className="fas fa-school" aria-hidden="true"></i>
            School Branding Management
            <div className="header-actions">
              <Link to="/admin" className="excel-btn secondary small">
                <i className="fas fa-arrow-left" aria-hidden="true"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <p className="school-branding-intro">
              Manage school name, logos, tagline, and banner text
            </p>

            <div className="branding-container">
              {/* Text Branding Section */}
              <div className="branding-card">
                <div className="branding-card-header">
                  <h3>
                    <i className="fas fa-text-height" aria-hidden="true"></i> Text Branding
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
                    type="button"
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
                <div className="branding-card-header">
                  <h3>
                    <i className="fas fa-images" aria-hidden="true"></i> Logos &amp; Images
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
                        type="button"
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
                        type="button"
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
