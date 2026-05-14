import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import AdminLayout from '../../components/layout/AdminLayout';
import './PreFormOneRegistration.css';

const PreFormOneRegistration = () => {
  const { year } = useParams();
  const [students, setStudents] = useState([]);
  const [currentStudent, setCurrentStudent] = useState({
    serialNumber: '',
    firstName: '',
    middleName: '',
    surname: '',
    sex: '',
    year: year
  });
  const [csvData, setCsvData] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSex, setFilterSex] = useState('all');
  const [sortBy, setSortBy] = useState('admission_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(false);

  // Load students from database on component mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const response = await preFormOneService.getStudents(year);
        
        // Ensure we always set an array
        const studentsData = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        
        setStudents(studentsData);
      } catch (error) {
        // Handle error gracefully - set empty array
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [year]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    // Ensure students is always an array
    let filtered = Array.isArray(students) ? students : [];
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student && 
        (student.admission_number?.toLowerCase().includes(searchLower) ||
        student.first_name?.toLowerCase().includes(searchLower) ||
        student.middle_name?.toLowerCase().includes(searchLower) ||
        student.surname?.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sex filter
    if (filterSex !== 'all') {
      filtered = filtered.filter(student => student && student.sex?.toLowerCase() === filterSex.toLowerCase());
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'admission_number') {
        aVal = aVal.replace('789ABC', '');
        bVal = bVal.replace('789ABC', '');
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [students, searchTerm, filterSex, sortBy, sortOrder]);

  // Generate automatic admission number
  const generateAdmissionNumber = (serialNumber) => {
    const prefix = '789ABC';
    const timestamp = Date.now().toString(36); // Base36 timestamp for uniqueness
    const random = Math.random().toString(36).substring(2, 5); // 3 random chars
    return `${prefix}${serialNumber}-${timestamp}-${random}`;
  };

  // Handle single student input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate student data
  const validateStudentData = (student) => {
    const errors = [];

    if (!student.serialNumber) {
      errors.push('Serial Number is required');
    }

    if (!student.firstName) {
      errors.push('First Name is required');
    }

    if (!student.surname) {
      errors.push('Surname is required');
    }

    if (!student.sex) {
      errors.push('Sex is required');
    }

    return errors;
  };

  // Handle student update
  const handleUpdateStudent = async () => {
    
    // Validate form data
    const validationErrors = validateStudentData(currentStudent);
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      setLoading(true);
      
      if (!currentStudent.id) {
        toast.error('Student ID missing for update');
        return;
      }

      const studentData = {
        serial_number: currentStudent.serialNumber,
        first_name: currentStudent.firstName,
        middle_name: currentStudent.middleName,
        surname: currentStudent.surname,
        sex: currentStudent.sex,
        parish: currentStudent.parish || ''
      };

      const updatedStudent = await preFormOneService.updateStudent(currentStudent.id, studentData);

      // Check if the response indicates success
      if (updatedStudent && updatedStudent.success) {
        // Update local state with the updated student
        setStudents(prev => {
          const newStudents = prev.map(s => s.id === currentStudent.id ? updatedStudent.data : s);
          return newStudents;
        });
        
        // Clear form
        setCurrentStudent({
          serialNumber: '',
          firstName: '',
          middleName: '',
          surname: '',
          sex: '',
          year: year
        });
        
        toast.success(`${updatedStudent.data.first_name} ${updatedStudent.data.surname} updated successfully!`);
      } else {
        // Handle specific error messages from backend
        toast.error(updatedStudent.message || 'Error updating student. Please try again.');
      }
    } catch (error) {
      toast.error('Error updating student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle student deletion
  const handleDeleteStudent = async (student) => {
    
    if (!student.id) {
      toast.error('Cannot delete student - missing ID');
      return;
    }
    
    if (!window.confirm(`Delete student ${student.admission_number}?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const deleteResult = await preFormOneService.deleteStudent(student.id);
      // Check if the response indicates success
      if (deleteResult && deleteResult.success) {
        
        // Update local state by removing the deleted student
        setStudents(prev => {
          const newStudents = prev.filter(s => s.id !== student.id);
          return newStudents;
        });
        
        toast.success('Student deleted successfully!');
      } else {
        // Handle specific error messages from backend
        const errorMessage = deleteResult?.message || 'Error deleting student. Please try again.';
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting student. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle single student registration
  const handleSingleRegistration = async () => {
    // Validate form data
    const validationErrors = validateStudentData(currentStudent);
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      setLoading(true);
      const admissionNumber = generateAdmissionNumber(currentStudent.serialNumber);
      
      const studentData = {
        admission_number: admissionNumber,
        serial_number: currentStudent.serialNumber,
        first_name: currentStudent.firstName,
        middle_name: currentStudent.middleName,
        surname: currentStudent.surname,
        sex: currentStudent.sex,
        parish: '', // Initialize parish as empty string
        year: parseInt(year)
      };

      const createdStudent = await preFormOneService.createStudent(studentData);
      
      // Check if the response indicates success
      if (createdStudent && createdStudent.success) {
        // Update local state with the new student
        setStudents(prev => {
          const newStudents = [...prev, createdStudent.data];
          return newStudents;
        });
        
        toast.success(`${createdStudent.data.first_name} ${createdStudent.data.surname} registered successfully!`);
      } else {
        // Handle specific error messages from backend
        toast.error(createdStudent.message || 'Error registering student. Please try again.');
      }
    } catch (error) {
      toast.error('Error registering student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      processCsvData(csvText);
    };
    reader.readAsText(file);
  };

  // Process CSV data
  const processCsvData = async (csvText) => {
    if (!csvText.trim()) {
      toast.error('Please enter CSV data');
      return;
    }

    try {
      setLoading(true);
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const dataLines = lines.slice(1);

      const studentsToCreate = dataLines.map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const student = {
          admission_number: generateAdmissionNumber(values[0] || `SN${students.length + index + 1}`),
          serial_number: values[0] || `SN${students.length + index + 1}`,
          first_name: values[1] || '',
          middle_name: values[2] || '',
          surname: values[3] || '',
          sex: values[4] || '',
          parish: '', // Initialize parish as empty
          year: parseInt(year)
        };

        // Map headers to values dynamically
        headers.forEach((header, i) => {
          const field = header.toLowerCase().replace(/\s+/g, '');
          if (field === 'serialnumber' || field === 's/n') student.serial_number = values[i] || '';
          else if (field === 'firstname') student.first_name = values[i] || '';
          else if (field === 'middlename') student.middle_name = values[i] || '';
          else if (field === 'surname') student.surname = values[i] || '';
          else if (field === 'sex') student.sex = values[i] || '';
        });
        
                return student;
      }).filter(student => student.serial_number && student.first_name && student.surname && student.sex);
      
      if (studentsToCreate.length === 0) {
        toast.error('No valid student data found in CSV');
        return;
      }

      const result = await preFormOneService.createBulkStudents(studentsToCreate);
      
      // Update local state with the new students
      setStudents(prev => {
        const newStudents = [...prev, ...(result.students || [])];
        return newStudents;
      });
      
      toast.success(`${result.students?.length || 0} students registered successfully from CSV!`);
    } catch (error) {
      toast.error('Error processing CSV data. Please check file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export data to CSV
  const exportToCsv = async () => {
    try {
      setLoading(true);
      await preFormOneService.exportStudents(year);
    } catch (error) {
      toast.error('Error exporting students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear all students
  const clearAllStudents = () => {
    if (window.confirm('Are you sure you want to clear all registered students? This action cannot be undone.')) {
      setStudents([]);
      toast.success('All students cleared successfully');
    }
  };

  // Download CSV template
  const downloadCsvTemplate = () => {
    const templateHeaders = ['S/N', 'FirstName', 'MiddleName', 'Surname', 'Sex'];
    const templateData = [
      templateHeaders.join(','),
      'SN001,John,Doe,Smith,Male',
      'SN002,Jane,Marie,Johnson,Female'
    ].join('\n');

    const blob = new Blob([templateData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `preform-one-template-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
    <div className="preform-one-registration-route registration-form-page-container">
      {/* Registration Form Card */}
      <div className="registration-form-card">
        <div className="registration-form-card-header">
          <i className="fas fa-user-plus"></i>
          <span>Pre-Form One Registration - {year}</span>
          <span className="academic-year-info">
            <small>Academic Year: {year}</small>
          </span>
        </div>
        <div className="registration-form-card-body">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (currentStudent.id) {
              handleUpdateStudent();
            } else {
              handleSingleRegistration();
            }
          }} className="registration-form">
            <div className="registration-form-grid">
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="serialNumber">
                    Serial Number (S/N) <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    value={currentStudent.serialNumber}
                    onChange={handleInputChange}
                    placeholder="Enter serial number"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="firstName">
                    First Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={currentStudent.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="middleName">Middle Name</label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={currentStudent.middleName}
                    onChange={handleInputChange}
                    placeholder="Enter middle name"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="surname">
                    Surname <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="surname"
                    name="surname"
                    value={currentStudent.surname}
                    onChange={handleInputChange}
                    placeholder="Enter surname"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="sex">
                    Sex <span className="req">*</span>
                  </label>
                  <select
                    id="sex"
                    name="sex"
                    value={currentStudent.sex}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="form-field form-actions-field">
                <div className="form-group">
                  <span className="form-actions-label-gap" aria-hidden="true">
                    &nbsp;
                  </span>
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="form-btn primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          <span className="btn-text">Processing...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          <span className="btn-text">
                            {currentStudent.id ? 'Update' : 'Register'}
                          </span>
                        </>
                      )}
                    </button>

                    {currentStudent.id && (
                      <button
                        type="button"
                        onClick={() => setCurrentStudent({
                          serialNumber: '',
                          firstName: '',
                          middleName: '',
                          surname: '',
                          sex: '',
                          parish: '',
                          year: year
                        })}
                        className="form-btn secondary"
                        disabled={loading}
                      >
                        <i className="fas fa-times"></i>
                        <span className="btn-text">Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Registered Students Card */}
      <div className="registered-students-card">
        <div className="registered-students-card-header">
          <i className="fas fa-table"></i>
          <span>Registered ({students.length})</span>
        </div>
        <div className="registered-students-card-body">
          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-slash"></i>
              <p>No students registered yet</p>
            </div>
          ) : (
            <div className="students-table-container">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Admission No</th>
                    <th>Serial No</th>
                    <th>Name</th>
                    <th>Sex</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedStudents.map((student, index) => (
                    <tr key={student.id || `student-${index}`}>
                      <td>{student.admission_number || 'N/A'}</td>
                      <td>{student.serial_number || 'N/A'}</td>
                      <td>{`${student.first_name || ''} ${student.middle_name || ''} ${student.surname || ''}`.trim() || 'N/A'}</td>
                      <td>
                        <span className={`sex-badge ${student.sex?.toLowerCase() || 'unknown'}`}>
                          {student.sex || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => {
                              // Populate form with student data for editing
                              setCurrentStudent({
                                serialNumber: student.serial_number,
                                firstName: student.first_name,
                                middleName: student.middle_name,
                                surname: student.surname,
                                sex: student.sex,
                                parish: student.parish,
                                year: year,
                                id: student.id // Store ID for update
                              });
                            }}
                            className="form-btn primary small"
                            title="Edit student"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(student)}
                            className="form-btn secondary small"
                            title="Delete student"
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

      {/* Bulk Upload Card */}
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
                onClick={downloadCsvTemplate}
                disabled={loading}
              >
                <i className="fas fa-download"></i>
                <span className="btn-text">Download Template</span>
              </button>
              <button 
                type="button"
                className="form-btn secondary" 
                onClick={exportToCsv}
                disabled={loading || students.length === 0}
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
                  onChange={handleCsvUpload}
                  disabled={loading}
                />
                <label htmlFor="csv-file" className={`file-label ${loading ? 'disabled' : ''}`}>
                  <span>
                    <i className="fas fa-folder-open"></i> Choose CSV File
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="back-navigation-bottom">
        <Link to={`/admin/pre-form-one/${year}`} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Modules
        </Link>
      </div>
    </div>
    </AdminLayout>
  );
};

export default PreFormOneRegistration;
