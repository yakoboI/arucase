/**
 * Subjects Management Page
 * Allows creating, editing, and deleting subjects for a class
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import api from '../../services/api';
import './SubjectsManagement.css';

const SubjectsManagement = ({ formLevel: formLevelProp, stream: streamProp }) => {
  const params = useParams();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    subject_abbreviation: '',
  });

  // Extract parameters from URL
  const { formLevel: formLevelParam, year, stream: streamParam } = params;
  
  // Use prop if provided, otherwise extract from URL params
  const formLevel = formLevelProp || formLevelParam || (() => {
    // Extract from pathname if not in params
    const pathParts = window.location.pathname.split('/');
    const subjectsIndex = pathParts.indexOf('subjects');
    return subjectsIndex >= 0 && pathParts[subjectsIndex + 1] ? pathParts[subjectsIndex + 1] : '';
  })();

  // Normalize form level from URL param (convert to uppercase: "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Determine stream (use prop, then param, then default to A for Form I-IV only)
  // Note: All "NA" stream values are normalized to "A" in the database
  const normalizedStream = (() => {
    const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
    const stream = streamProp || streamParam || (isFormVOrVI ? '' : 'A');
    
    // For Form V-VI, stream is required
    if (isFormVOrVI && !stream) {
      return '';
    }
    
    // Normalize 'NA' to 'A' for Form I-IV only
    if (stream && stream.toUpperCase() === 'NA' && !isFormVOrVI) {
      return 'A';
    }
    
    return stream || '';
  })();

  // Fetch subjects for this class
  const { data: subjects = [], isLoading, error: subjectsError } = useQuery({
    queryKey: ['subjects', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      const params = {
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      };
      console.log('📚 Fetching subjects with params:', params);
      
      try {
        const res = await studentsAPI.getSubjects(params);
        console.log('📚 Subjects API response:', {
          subjectsCount: res.data?.subjects?.length || 0,
          subjects: res.data?.subjects || []
        });
        return res.data.subjects || [];
      } catch (error) {
        console.error('📚 Error fetching subjects:', error);
        console.error('📚 Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        });
        // Don't throw error on 401 - just return empty array to prevent UI breakage
        if (error.response?.status === 401) {
          console.warn('📚 Unauthorized access - returning empty subjects array');
          return [];
        }
        throw error;
      }
    },
    enabled: !!normalizedLevel && !!year && !!normalizedStream, // Enable query when level, year, and stream are available
    retry: false, // Don't retry on errors
  });

  // Log errors and debug info
  useEffect(() => {
    console.log('📊 Subjects Management Debug:', {
      formLevelProp,
      formLevelParam,
      formLevel,
      normalizedLevel,
      streamProp,
      streamParam,
      normalizedStream,
      year,
      subjectsCount: subjects.length,
      isLoading,
      hasError: !!subjectsError
    });
    
    if (subjectsError) {
      console.error('❌ Subjects query error:', subjectsError);
      console.error('Error details:', {
        message: subjectsError.message,
        response: subjectsError.response?.data,
        status: subjectsError.response?.status
      });
    }
    
    if (!isLoading && subjects.length === 0 && normalizedLevel && year) {
      console.warn('⚠️  No subjects found. Check backend logs for query details.');
      console.warn('Query params:', { level: normalizedLevel, stream: normalizedStream, year });
    }
  }, [formLevelProp, formLevelParam, formLevel, normalizedLevel, streamProp, streamParam, normalizedStream, year, subjects.length, isLoading, subjectsError]);

  // Save subject mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/students/subjects', {
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects', normalizedLevel, normalizedStream, year]);
      // Also invalidate together mode cache for Form V/VI
      if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
        queryClient.invalidateQueries(['subjects-together', normalizedLevel, year]);
      }
      toast.success('Subject saved successfully!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save subject');
    },
  });

  // Delete subject mutation
  const deleteMutation = useMutation({
    mutationFn: async (subjectCode) => {
      return api.delete('/students/subjects', {
        params: {
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          subject_code: subjectCode
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects', normalizedLevel, normalizedStream, year]);
      // Also invalidate together mode cache for Form V/VI
      if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
        queryClient.invalidateQueries(['subjects-together', normalizedLevel, year]);
      }
      toast.success('Subject deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete subject');
    },
  });

  const openModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        subject_abbreviation: subject.subject_abbreviation || '',
      });
    } else {
      setEditingSubject(null);
      setFormData({
        subject_name: '',
        subject_code: '',
        subject_abbreviation: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setFormData({
      subject_name: '',
      subject_code: '',
      subject_abbreviation: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.subject_name || !formData.subject_code || !formData.subject_abbreviation) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleDelete = (subject) => {
    if (window.confirm(`Are you sure you want to delete "${subject.subject_name}"? This may affect existing scores.`)) {
      deleteMutation.mutate(subject.subject_code);
    }
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/subjects/${formLevel}/stream/${normalizedStream}/years`;
    } else {
      return `/admin/subjects/${formLevel}/years`;
    }
  };

  return (
    <AdminLayout>
      <div className="subjects-mgmt-page-container">
        <div className="subjects-mgmt-card">
          <div className="subjects-mgmt-card-header">
            <div className="subjects-mgmt-card-header-title">
              <i className="fas fa-book"></i>
              <span>Subjects Management</span>
            </div>
            <div className="subjects-mgmt-header-actions">
              <button
                type="button"
                className="subjects-mgmt-add-btn"
                onClick={() => openModal()}
              >
                <i className="fas fa-plus"></i>
                <span>Add Subject</span>
              </button>
            </div>
          </div>
          <div className="subjects-mgmt-card-body">
            {isLoading ? (
              <div className="loading-state">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="subjects-mgmt-empty-state">
                <i className="fas fa-book"></i>
                <h3>No Subjects Found</h3>
                <p>No subjects have been added for {normalizedLevel} {normalizedStream && normalizedStream !== 'A' ? `stream ${normalizedStream}` : ''} {year} yet.</p>
                <button
                  type="button"
                  className="subjects-mgmt-add-btn"
                  onClick={() => openModal()}
                >
                  <i className="fas fa-plus"></i>
                  <span>Add First Subject</span>
                </button>
              </div>
            ) : (
              <div className="subjects-mgmt-table-container">
                <table className="subjects-mgmt-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Subject Name</th>
                      <th>Subject Code</th>
                      <th>Subject Abbreviation</th>
                      <th>Year</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject, index) => (
                      <tr key={`${subject.subject_code}-${subject.level}-${subject.stream}-${subject.year}`}>
                        <td>{index + 1}</td>
                        <td>{subject.subject_name}</td>
                        <td>
                          <span className="subject-code">{subject.subject_code}</span>
                        </td>
                        <td>
                          <span className="subject-abbreviation">{subject.subject_abbreviation || '-'}</span>
                        </td>
                        <td>{subject.year}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="excel-btn small"
                              onClick={() => openModal(subject)}
                              aria-label="Edit subject"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              className="excel-btn small danger"
                              onClick={() => handleDelete(subject)}
                              aria-label="Delete subject"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link to={getBackPath()} className="subjects-mgmt-back-btn">
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </Link>

        {/* Add/Edit Subject Modal */}
        {showModal && (
          <div className="subjects-mgmt-modal-overlay" onClick={closeModal}>
            <div className="subjects-mgmt-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="subjects-mgmt-modal-header">
                <h3>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                <button className="subjects-mgmt-modal-close" onClick={closeModal}>&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="subjects-mgmt-modal-body">
                <div className="subjects-mgmt-form-group">
                  <label htmlFor="subject_name">Subject Name <span className="req">*</span></label>
                  <input
                    type="text"
                    id="subject_name"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    placeholder="Enter subject name"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="subjects-mgmt-form-row">
                  <div className="subjects-mgmt-form-group">
                    <label htmlFor="subject_code">Subject Code <span className="req">*</span></label>
                    <input
                      type="text"
                      id="subject_code"
                      value={formData.subject_code}
                      onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                      placeholder="e.g., MATH"
                      required
                      disabled={!!editingSubject}
                      className="form-control"
                    />
                    {editingSubject && (
                      <small className="form-help">Subject code cannot be changed</small>
                    )}
                  </div>
                  <div className="subjects-mgmt-form-group">
                    <label htmlFor="subject_abbreviation">Subject Abbreviation <span className="req">*</span></label>
                    <input
                      type="text"
                      id="subject_abbreviation"
                      value={formData.subject_abbreviation}
                      onChange={(e) => setFormData({ ...formData, subject_abbreviation: e.target.value })}
                      placeholder="e.g., B/MAT"
                      required
                      className="form-control"
                    />
                  </div>
                </div>
                
                <div className="subjects-mgmt-form-group">
                  <label htmlFor="year">Year</label>
                  <input
                    type="number"
                    id="year"
                    value={year}
                    readOnly
                    className="form-control"
                  />
                </div>
                
                <div className="subjects-mgmt-modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saveMutation.isLoading}>
                    {saveMutation.isLoading ? 'Saving...' : 'Save Subject'}
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

export default SubjectsManagement;

