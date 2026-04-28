/**
 * NECTA Results URLs Management Page
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const NECTAUrls = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUrl, setEditingUrl] = useState(null);
  const [formData, setFormData] = useState({
    exam_type: 'ftna',
    year: new Date().getFullYear(),
    url: '',
    description: '',
    active: true,
  });

  // Fetch all NECTA URLs
  const { data: urls = [], isLoading } = useQuery({
    queryKey: ['admin-necta-urls'],
    queryFn: async () => {
      const res = await adminAPI.getNECTAUrls();
      return res.data.urls || [];
    },
  });

  // Save URL mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.saveNECTAUrl(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-necta-urls']);
      toast.success(`NECTA URL ${editingUrl ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save NECTA URL');
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      return adminAPI.toggleNECTAUrlStatus(id, active);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-necta-urls']);
      toast.success('NECTA URL status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteNECTAUrl(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-necta-urls']);
      toast.success('NECTA URL deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete NECTA URL');
    },
  });

  const resetForm = () => {
    setFormData({
      exam_type: 'ftna',
      year: new Date().getFullYear(),
      url: '',
      description: '',
      active: true,
    });
    setEditingUrl(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (url) => {
    setEditingUrl(url);
    setFormData({
      exam_type: url.exam_type || 'ftna',
      year: url.year || new Date().getFullYear(),
      url: url.url || '',
      description: url.description || '',
      active: url.active !== false,
    });
    setShowModal(true);
  };

  const handleToggle = (url) => {
    toggleMutation.mutate({ id: url.id, active: !url.active });
  };

  const handleDelete = (url) => {
    if (window.confirm(`Are you sure you want to delete this NECTA URL?\n\n${url.exam_type.toUpperCase()} ${url.year}`)) {
      deleteMutation.mutate(url.id);
    }
  };

  const importMutation = useMutation({
    mutationFn: ({ exam_type, year }) => adminAPI.importNECTAResults(exam_type, year),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-necta-urls']);
      const msg = res.data?.imported != null ? `Imported ${res.data.imported} candidates.` : (res.data?.message || 'Import completed.');
      toast.success(msg);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Import failed');
    },
  });

  const handleImport = (examType, year) => {
    if (window.confirm(`Fetch and store NECTA results for ${examType.toUpperCase()} ${year}? This will replace any previously imported data for this exam/year.`)) {
      importMutation.mutate({ exam_type: examType, year });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.exam_type.trim() || !formData.year || !formData.url.trim()) {
      toast.error('Exam type, year, and URL are required');
      return;
    }
    
    // Validate URL format
    try {
      new URL(formData.url);
    } catch (e) {
      toast.error('Invalid URL format. Please enter a valid URL (e.g., https://...)');
      return;
    }
    
    saveMutation.mutate({
      id: editingUrl?.id,
      ...formData,
    });
  };

  const generateDefaultUrl = (examType, year) => {
    const yearInt = parseInt(year);
    if (yearInt >= 2020 && yearInt <= 2021) {
      const examUpper = examType.toUpperCase();
      const schoolCode = examType === 'csee' ? 's0171' : 'S0171';
      return `https://maktaba.tetea.org/exam-results/${examUpper}${yearInt}/${schoolCode}.htm`;
    } else {
      const schoolCode = examType === 'ftna' ? 'S0171' : 's0171';
      return `https://onlinesys.necta.go.tz/results/${yearInt}/${examType}/results/${schoolCode}.htm`;
    }
  };

  const handleGenerateUrl = () => {
    const generatedUrl = generateDefaultUrl(formData.exam_type, formData.year);
    setFormData({ ...formData, url: generatedUrl });
    toast.info('Default URL generated. You can modify it if needed.');
  };

  const examTypes = [
    { value: 'ftna', label: 'FTNA (Form II)' },
    { value: 'csee', label: 'CSEE (Form IV)' },
    { value: 'acsee', label: 'ACSEE (Form VI)' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);
  const allYears = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020-2030

  // Group URLs by exam type
  const groupedUrls = urls.reduce((acc, url) => {
    if (!acc[url.exam_type]) {
      acc[url.exam_type] = {};
    }
    acc[url.exam_type][url.year] = url;
    return acc;
  }, {});

  // Helper to check if URL exists for a year
  const getUrlForYear = (examType, year) => {
    return groupedUrls[examType]?.[year] || null;
  };

  // Helper to generate default URL
  const generateDefaultUrlForYear = (examType, year) => {
    const yearInt = parseInt(year);
    if (yearInt >= 2020 && yearInt <= 2021) {
      const examUpper = examType.toUpperCase();
      const schoolCode = examType === 'csee' ? 's0171' : 'S0171';
      return `https://maktaba.tetea.org/exam-results/${examUpper}${yearInt}/${schoolCode}.htm`;
    } else {
      const schoolCode = examType === 'ftna' ? 'S0171' : 's0171';
      return `https://onlinesys.necta.go.tz/results/${yearInt}/${examType}/results/${schoolCode}.htm`;
    }
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-link"></i>
            NECTA Results URLs Management
            <div className="header-actions">
              <button onClick={handleAdd} className="excel-btn primary small">
                <i className="fas fa-plus"></i> Add URL
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading NECTA URLs...</div>
            ) : (
              <>
                {/* Show URLs organized by exam type and year */}
                {examTypes.map((examType) => {
                  const examUrls = groupedUrls[examType.value] || {};
                  return (
                    <div key={examType.value} style={{ marginBottom: '2rem' }}>
                      <div style={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        padding: '1rem 1.5rem',
                        borderRadius: '8px 8px 0 0',
                        marginBottom: '0'
                      }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className={`fas ${examType.value === 'ftna' ? 'fa-book' : examType.value === 'csee' ? 'fa-certificate' : 'fa-user-graduate'}`}></i>
                          {examType.label} - URL Management
                        </h3>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                          Manage custom URLs for each year. Years without custom URLs will use auto-generated URLs.
                        </p>
                      </div>
                      <div className="table-container" style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        <table className="excel-table">
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>URL</th>
                              <th>Description</th>
                              <th>Status</th>
                              <th>Actions</th>
                              <th>Import for AI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allYears.map((year) => {
                              const existingUrl = examUrls[year];
                              const defaultUrl = generateDefaultUrlForYear(examType.value, year);
                              return (
                                <tr key={`${examType.value}-${year}`}>
                                  <td>
                                    <strong>{year}</strong>
                                    {!existingUrl && (
                                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                        (Using generated URL)
                                      </div>
                                    )}
                                  </td>
                                  <td className="url-cell">
                                    {existingUrl ? (
                                      <a 
                                        href={existingUrl.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                          color: '#3b82f6', 
                                          textDecoration: 'underline',
                                          wordBreak: 'break-all'
                                        }}
                                      >
                                        {existingUrl.url.length > 60 ? `${existingUrl.url.substring(0, 60)}...` : existingUrl.url}
                                      </a>
                                    ) : (
                                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        <a 
                                          href={defaultUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          style={{ 
                                            color: '#9ca3af', 
                                            textDecoration: 'underline',
                                            wordBreak: 'break-all'
                                          }}
                                        >
                                          {defaultUrl.length > 60 ? `${defaultUrl.substring(0, 60)}...` : defaultUrl}
                                        </a>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                          Auto-generated
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td>{existingUrl?.description || '-'}</td>
                                  <td>
                                    {existingUrl ? (
                                      <span className={`status-badge ${existingUrl.active ? 'badge-active' : 'badge-inactive'}`}>
                                        {existingUrl.active ? 'Active' : 'Inactive'}
                                      </span>
                                    ) : (
                                      <span className="status-badge badge-warning" style={{ opacity: 0.6 }}>
                                        Auto
                                      </span>
                                    )}
                                  </td>
                                  <td className="actions-col">
                                    {existingUrl ? (
                                      <>
                                        <button onClick={() => handleEdit(existingUrl)} className="action-btn edit-btn" title="Edit URL">
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button onClick={() => handleToggle(existingUrl)} className="action-btn toggle-btn" title={existingUrl.active ? 'Deactivate' : 'Activate'}>
                                          <i className={`fas fa-${existingUrl.active ? 'eye-slash' : 'eye'}`}></i>
                                        </button>
                                        <button onClick={() => handleDelete(existingUrl)} className="action-btn delete-btn" title="Delete URL">
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setFormData({
                                            exam_type: examType.value,
                                            year: year,
                                            url: defaultUrl,
                                            description: '',
                                            active: true,
                                          });
                                          setShowModal(true);
                                        }} 
                                        className="action-btn edit-btn" 
                                        title="Add Custom URL"
                                      >
                                        <i className="fas fa-plus"></i> Add
                                      </button>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="excel-btn primary small"
                                      onClick={() => handleImport(examType.value, year)}
                                      disabled={importMutation.isPending}
                                      title="Fetch this year's results and store for AI (student search, GPA, rankings)"
                                    >
                                      {importMutation.isPending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-download" />}
                                      {' '}Import
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Modal for editing/creating URLs */}
                {showModal && (
                  <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>
                          <i className="fas fa-link"></i>
                          {editingUrl ? 'Edit' : 'Add'} NECTA Result URL
                        </h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                        <div className="form-group">
                          <label>Exam Type</label>
                          <select
                            value={formData.exam_type}
                            onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                            className="excel-input"
                            required
                          >
                            {examTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Year</label>
                          <select
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                            className="excel-input"
                            required
                          >
                            {allYears.map((year) => (
                              <option key={`necta-${year}`} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>
                            URL
                            <button
                              type="button"
                              onClick={handleGenerateUrl}
                              className="excel-btn secondary small"
                              style={{ marginLeft: '0.5rem', padding: '0.25rem 0.75rem' }}
                            >
                              <i className="fas fa-magic"></i> Generate Default
                            </button>
                          </label>
                          <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="excel-input"
                            placeholder="https://..."
                            required
                          />
                          <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
                            Enter the full URL to the NECTA results page. Click "Generate Default" to use the standard format.
                          </small>
                        </div>
                        <div className="form-group">
                          <label>Description (Optional)</label>
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="excel-input"
                            placeholder="e.g., Official NECTA results page"
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={formData.active}
                              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                              style={{ marginRight: '0.5rem' }}
                            />
                            Active (URL will be used on public page)
                          </label>
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                            <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save URL'}
                          </button>
                          <button type="button" className="excel-btn secondary" onClick={() => setShowModal(false)}>
                            <i className="fas fa-times"></i> Cancel
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

export default NECTAUrls;

