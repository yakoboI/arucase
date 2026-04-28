/**
 * Student Registration Form Page
 * Allows adding, editing, and deleting students for a specific class
 * Uses special academic year logic for Form 5 & 6 streams
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './RegistrationForm.css';

const RegistrationForm = () => {
  const { year, stream, term } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    adm_no: '',
    first_name: '',
    middle_name: '',
    surname: '',
    sex: '',
    term: term || 'First Term',
  });

  const [editingStudent, setEditingStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Update term in formData when URL term parameter changes
  useEffect(() => {
    if (term) {
      setFormData(prev => ({ ...prev, term }));
    }
  }, [term]);

  const normalizedLevel = useMemo(() => {
    const path = location.pathname;
    const match = path.match(/\/registration\/(form-[iv]+|form-v|form-vi)/i);
    if (match) {
      const formLevel = match[1].toLowerCase();
      return formLevel.split('-').map(w => w.toUpperCase()).join(' ');
    }
    return '';
  }, [location.pathname]);

  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = useMemo(() => parseInt(year), [year]);

  // Helper function to sort students by name: first_name, then middle_name, then surname (A-Z)
  const sortStudentsByName = useCallback((students) => {
    return [...students].sort((a, b) => {
      const firstNameA = String(a.first_name || '').toLowerCase().trim();
      const firstNameB = String(b.first_name || '').toLowerCase().trim();
      const firstNameCompare = firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
      if (firstNameCompare !== 0) return firstNameCompare;
      
      const middleNameA = String(a.middle_name || '').toLowerCase().trim();
      const middleNameB = String(b.middle_name || '').toLowerCase().trim();
      const middleNameCompare = middleNameA.localeCompare(middleNameB, undefined, { sensitivity: 'base' });
      if (middleNameCompare !== 0) return middleNameCompare;
      
      const surnameA = String(a.surname || '').toLowerCase().trim();
      const surnameB = String(b.surname || '').toLowerCase().trim();
      return surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
    });
  }, []);

  // Fetch students for this class - sorted by name: first_name, then middle_name, then surname (A-Z)
  const { data: studentsData = [], isLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, stream, apiYear, term],
    queryFn: async () => {
      if (!normalizedLevel || !stream || !apiYear) {
        throw new Error('Missing required parameters');
      }
      const res = await studentsAPI.getStudents({
        level: normalizedLevel,
        stream: stream,
        year: apiYear,
        term: term || 'First Term',
      });
      const students = res.data.students || [];
      // Sort students by name: first_name, then middle_name, then surname (A-Z)
      return sortStudentsByName(students);
    },
    enabled: !!normalizedLevel && !!stream && !!apiYear, // Only fetch when all params are available
    retry: false, // Don't retry on error to avoid multiple redirects
  });
  
  const students = studentsData;

  // Handle authentication errors
  useEffect(() => {
    if (studentsError?.isTokenExpired) {
      toast.error(studentsError.expirationMessage || 'Your session has expired. Please log in again.');
    }
  }, [studentsError]);

  const resetFormData = useCallback(() => {
    setFormData({
      adm_no: '',
      first_name: '',
      middle_name: '',
      surname: '',
      sex: '',
      term: term || 'First Term',
    });
  }, [term]);

  // Handle blob error responses
  const handleBlobError = useCallback(async (error, operationName) => {
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const errorData = JSON.parse(text);
        const errorMessage = errorData.message || `Failed to ${operationName}`;
        
        if (error.response?.status === 401 || errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('token')) {
          toast.error('Your session has expired. Please log in again.');
          return true;
        }
        
        toast.error(errorMessage);
      } catch (parseError) {
        toast.error(`Failed to ${operationName}`);
      }
    } else {
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${operationName}`;
      
      if (error.response?.status === 401 || errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('token')) {
        toast.error('Your session has expired. Please log in again.');
        return true;
      }
      
      toast.error(errorMessage);
    }
    return false;
  }, []);

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: (data) => studentsAPI.createStudent({
      ...data,
      level: normalizedLevel,
      stream: stream,
      year: apiYear,
      term: formData.term,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['students', normalizedLevel, stream, apiYear, term]);
      toast.success('Student added successfully!');
      resetFormData();
      setIsSubmitting(false);
    },
    onError: (error) => {
      // Handle 401 errors specifically - token might be expired
      if (error.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        // Let the API interceptor handle redirect after a delay
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }, 2000); // Give user time to see the error message
      } else {
        toast.error(error.response?.data?.message || 'Failed to add student');
      }
      setIsSubmitting(false);
    },
  });

  // Update student mutation
  const updateMutation = useMutation({
    mutationFn: ({ admNo, data }) => studentsAPI.updateStudent(admNo, {
      ...data,
      level: normalizedLevel,
      stream: stream,
      year: apiYear,
      term: formData.term,
    }, { level: normalizedLevel, stream: stream, year: apiYear, term: formData.term }),
    onSuccess: () => {
      queryClient.invalidateQueries(['students', normalizedLevel, stream, apiYear, formData.term]);
      toast.success('Student updated successfully!');
      setEditingStudent(null);
      setFormData({
        adm_no: '',
        first_name: '',
        middle_name: '',
        surname: '',
        sex: '',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update student');
    },
  });

  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: (admNo) => studentsAPI.deleteStudent(admNo, {
      level: normalizedLevel,
      stream: stream,
      year: apiYear,
      term: formData.term,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['students', normalizedLevel, stream, apiYear, formData.term]);
      toast.success('Student deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.adm_no || !formData.first_name || !formData.surname || !formData.sex) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    if (editingStudent) {
      updateMutation.mutate({
        admNo: editingStudent.adm_no,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      adm_no: student.adm_no,
      first_name: student.first_name,
      middle_name: student.middle_name || '',
      surname: student.surname,
      sex: student.sex,
      term: student.term || term || 'First Term',
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = useCallback(() => {
    setEditingStudent(null);
    resetFormData();
  }, [resetFormData]);

  const handleDelete = (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.first_name} ${student.surname} (${student.adm_no})?`)) {
      deleteMutation.mutate(student.adm_no);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      // Validate required parameters
      if (!normalizedLevel || !stream || !year) {
        console.error('Missing parameters:', { normalizedLevel, stream, year });
        toast.error(`Missing required parameters. Level: ${normalizedLevel || 'missing'}, Stream: ${stream || 'missing'}, Year: ${year || 'missing'}`);
        return;
      }

      console.log('Downloading template with params:', { level: normalizedLevel, stream, year });

      const res = await studentsAPI.downloadTemplate({
        level: normalizedLevel,
        stream: stream,
        year: year,
      });
      
      if (res.data instanceof Blob && res.data.type === 'application/json') {
        const text = await res.data.text();
        const errorData = JSON.parse(text);
        toast.error(errorData.message || 'Failed to download template');
        return;
      }
      
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `student_template_${normalizedLevel}_${stream}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully!');
    } catch (error) {
      await handleBlobError(error, 'download template');
    }
  };

  // Export students to CSV
  const handleExportCSV = async () => {
    try {
      // Validate required parameters
      if (!normalizedLevel || !stream || !year) {
        toast.error('Missing required parameters. Please ensure you are on the correct registration page.');
        return;
      }

      const res = await studentsAPI.exportCSV({
        level: normalizedLevel,
        stream: stream,
        year: year,
      });
      
      if (res.data instanceof Blob && res.data.type === 'application/json') {
        const text = await res.data.text();
        const errorData = JSON.parse(text);
        toast.error(errorData.message || 'Failed to export CSV');
        return;
      }
      
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registered_students_${normalizedLevel}_${stream}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully!');
    } catch (error) {
      await handleBlobError(error, 'export CSV');
    }
  };

  // Handle CSV file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setCsvFile(file);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('level', normalizedLevel);
      formData.append('stream', stream);
      formData.append('year', year);

      const res = await studentsAPI.bulkUpload(formData);

      // Refresh students list
      queryClient.invalidateQueries(['students', normalizedLevel, stream, apiYear, term]);
      
      // Show success message with details
      const { success_count, duplicate_count, error_count, errors } = res.data;
      let message = `Bulk upload completed: ${success_count} students added`;
      if (duplicate_count > 0) {
        message += `, ${duplicate_count} duplicates skipped`;
      }
      if (error_count > 0) {
        message += `, ${error_count} errors`;
      }
      
      toast.success(message);
      
      // Show errors if any
      if (errors && errors.length > 0) {
        const errorMessages = errors.slice(0, 5).map(err => 
          `Row ${err.row}: ${err.error}`
        ).join('\n');
        toast.warning(`Some rows had errors:\n${errorMessages}`, {
          autoClose: 10000,
        });
      }
      
      // Reset file input
      setCsvFile(null);
      const fileInput = document.getElementById('csv-file');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const getBackPath = useCallback(() => {
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    const formPath = formMap[normalizedLevel];
    
    const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
    return isFormVOrVI
      ? `/admin/students/registration/${formPath}/stream/${stream}/year/${year}/term/${term}/actions`
      : `/admin/students/registration/${formPath}/year/${year}/stream/${stream}/actions`;
  }, [normalizedLevel, stream, year, term]);

  // Validate required parameters
  if (!normalizedLevel || !stream || !year) {
    return (
      <AdminLayout>
        <div className="registration-form-page-container">
          <div className="registration-form-card">
            <div className="registration-form-card-header">
              <i className="fas fa-exclamation-triangle"></i>
              <span>Invalid Registration Page</span>
            </div>
            <div className="registration-form-card-body">
              <div className="empty-state" style={{ color: '#f44336' }}>
                <p>Missing required parameters to load registration page.</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  Level: {normalizedLevel || 'missing'} | Stream: {stream || 'missing'} | Year: {year || 'missing'}
                </p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  Path: {location.pathname}
                </p>
                <Link to="/admin/students/registration" className="excel-btn primary" style={{ marginTop: '20px' }}>
                  <i className="fas fa-arrow-left"></i> Back to Registration
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="registration-form-page-container">
        {/* Registration Form Card */}
        <div className="registration-form-card">
          <div className="registration-form-card-header">
            <i className="fas fa-user-plus"></i>
            <span>
              Register Students - {normalizedLevel} {stream} {year}
            </span>
          </div>
          <div className="registration-form-card-body">
            <form onSubmit={handleSubmit} className="registration-form" id="studentRegistrationForm">
              <div className="registration-form-grid">
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="adm_no">Adm No <span className="req">*</span></label>
                    <input
                      type="text"
                      id="adm_no"
                      inputMode="numeric"
                      name="adm_no"
                      className="form-input"
                      required
                      placeholder="Adm No"
                      value={formData.adm_no}
                      onChange={(e) => setFormData({ ...formData, adm_no: e.target.value })}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name <span className="req">*</span></label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      className="form-input"
                      required
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="middle_name">Middle Name</label>
                    <input
                      type="text"
                      id="middle_name"
                      name="middle_name"
                      className="form-input"
                      placeholder="Middle Name"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="surname">Surname <span className="req">*</span></label>
                    <input
                      type="text"
                      id="surname"
                      name="surname"
                      className="form-input"
                      required
                      placeholder="Surname"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="sex">Sex <span className="req">*</span></label>
                    <select
                      id="sex"
                      name="sex"
                      className="form-input"
                      required
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="term">Term <span className="req">*</span></label>
                    <select
                      id="term"
                      name="term"
                      className="form-input"
                      required
                      value={formData.term}
                      onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="First Term">First Term (Jul-Dec)</option>
                      <option value="Second Term">Second Term (Jan-Jun)</option>
                    </select>
                  </div>
                </div>
                <div className="form-field form-actions-field">
                  <button
                    type="submit"
                    className="form-btn primary"
                    id="submitBtn"
                    disabled={isSubmitting}
                  >
                    <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : editingStudent ? 'fa-save' : 'fa-plus'}`}></i>
                    <span className="btn-text">{isSubmitting ? (editingStudent ? 'Saving...' : 'Adding...') : (editingStudent ? 'Save' : 'Add')}</span>
                  </button>
                </div>
                {editingStudent && (
                  <div className="form-field form-actions-field">
                    <button
                      type="button"
                      className="form-btn secondary"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      <i className="fas fa-times"></i>
                      <span className="btn-text">Cancel</span>
                    </button>
                  </div>
                )}
                <div className="form-field form-actions-field">
                  <Link to={getBackPath()} className="form-btn secondary">
                    <i className="fas fa-arrow-left"></i>
                    <span className="btn-text">Back</span>
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="bulk-upload-card">
          <div className="bulk-upload-card-header">
            <i className="fas fa-file-csv"></i>
            <span>Bulk Operations</span>
          </div>
          <div className="bulk-upload-card-body">
            <div className="bulk-upload-content">
              <div className="bulk-upload-actions">
                <button 
                  type="button"
                  className="form-btn primary" 
                  onClick={handleDownloadTemplate}
                  disabled={isUploading}
                >
                  <i className="fas fa-download"></i>
                  <span className="btn-text">Download Template</span>
                </button>
                <button 
                  type="button"
                  className="form-btn secondary" 
                  onClick={handleExportCSV}
                  disabled={isUploading || students.length === 0}
                >
                  <i className="fas fa-file-export"></i>
                  <span className="btn-text">Export CSV</span>
                </button>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="csv-file"
                    accept=".csv"
                    className="file-input"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  <label htmlFor="csv-file" className={`file-label ${isUploading ? 'disabled' : ''}`}>
                    {csvFile ? (
                      <span>
                        <i className="fas fa-file-csv"></i> {csvFile.name}
                      </span>
                    ) : (
                      <span>
                        <i className="fas fa-folder-open"></i> Choose CSV File
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    className="form-btn primary"
                    onClick={handleBulkUpload}
                    disabled={isUploading || !csvFile}
                  >
                    <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                    <span className="btn-text">{isUploading ? 'Uploading...' : 'Upload'}</span>
                  </button>
                </div>
              </div>
              <div className="bulk-upload-help">
                <small>
                  <strong>Instructions:</strong> Download template, fill in student data, then upload CSV file. 
                  Required columns: Adm No, First Name, Surname, Sex (Male/Female). 
                  Middle Name is optional.
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Students Table */}
        <div className="registered-students-card">
          <div className="registered-students-card-header">
            <i className="fas fa-table"></i>
            <span>Registered ({students.length})</span>
          </div>
          <div className="registered-students-card-body">
            {studentsError ? (
              <div className="empty-state" style={{ color: '#f44336' }}>
                <i className="fas fa-exclamation-triangle"></i>
                <p>Error loading students: {studentsError.message || 'Failed to load students'}</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  className="form-btn primary"
                  onClick={() => queryClient.invalidateQueries(['students', normalizedLevel, stream, apiYear])}
                  style={{ marginTop: '12px' }}
                >
                  <i className="fas fa-sync-alt"></i> Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="loading-state">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-user-graduate"></i>
                <p>No students registered yet for {normalizedLevel} {stream} {year}.</p>
                <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                  Use the form above to register new students.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="registered-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Adm No</th>
                      <th>First Name</th>
                      <th>Middle Name</th>
                      <th>Surname</th>
                      <th>Sex</th>
                      <th>Year</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={`${student.adm_no}-${student.level}-${student.stream}-${student.year}`}>
                        <td>{index + 1}</td>
                        <td>
                          <button
                            type="button"
                            className="clickable-cell"
                            onClick={() => handleEdit(student)}
                            title="Click to edit"
                          >
                            {student.adm_no}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="clickable-cell"
                            onClick={() => handleEdit(student)}
                            title="Click to edit"
                          >
                            {student.first_name}
                          </button>
                        </td>
                        <td>{student.middle_name || '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="clickable-cell"
                            onClick={() => handleEdit(student)}
                            title="Click to edit"
                          >
                            {student.surname}
                          </button>
                        </td>
                        <td>{student.sex}</td>
                        <td>{student.year}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="form-btn small"
                              onClick={() => handleEdit(student)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              className="form-btn small danger"
                              onClick={() => handleDelete(student)}
                              title="Delete"
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
      </div>
    </AdminLayout>
  );
};

export default RegistrationForm;

