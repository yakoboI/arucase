import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { preFormOneService } from '../../services/preFormOneService';
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
  const [sortBy, setSortBy] = useState('admissionNumber');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(false);

  // Load students from database on component mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const data = await preFormOneService.getStudents(year);
        setStudents(data);
      } catch (error) {
        console.error('Error loading students:', error);
        // Handle error gracefully - maybe show a notification
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [year]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.admissionNumber.toLowerCase().includes(searchLower) ||
        student.firstName.toLowerCase().includes(searchLower) ||
        student.middleName.toLowerCase().includes(searchLower) ||
        student.surname.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sex filter
    if (filterSex !== 'all') {
      filtered = filtered.filter(student => student.sex.toLowerCase() === filterSex.toLowerCase());
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'admissionNumber') {
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
    return `${prefix}${serialNumber}`;
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
      
      // Update local state with the new student
      setStudents(prev => [...prev, createdStudent]);
      
      toast.success(`${createdStudent.first_name} ${createdStudent.surname} registered successfully!`);
    } catch (error) {
      console.error('Error registering student:', error);
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
      setStudents(prev => [...prev, ...result.students]);
      
      toast.success(`${result.students.length} students registered successfully from CSV!`);
    } catch (error) {
      console.error('Error processing CSV data:', error);
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
      console.error('Error exporting students:', error);
      alert('Error exporting students. Please try again.');
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
    <div className="registration-form-page-container">
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
          <form onSubmit={handleSingleRegistration} className="registration-form">
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
                <button type="submit" className="form-btn primary" disabled={loading}>
                  <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i>
                  <span className="btn-text">{loading ? 'Adding...' : 'Add Student'}</span>
                </button>
              </div>
              
              <div className="form-field form-actions-field">
                <Link to={`/admin/pre-form-one/${year}`} className="form-btn secondary">
                  <i className="fas fa-arrow-left"></i>
                  <span className="btn-text">Back</span>
                </Link>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id}>
                      <td>{student.admissionNumber}</td>
                      <td>{student.serialNumber}</td>
                      <td>{`${student.firstName} ${student.middleName || ''} ${student.surname}`.trim()}</td>
                      <td>
                        <span className={`sex-badge ${student.sex.toLowerCase()}`}>
                          {student.sex}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => setCurrentStudent(student)}
                            className="form-btn primary small"
                            title="Edit student"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Delete student ${student.admissionNumber}?`)) {
                                setStudents(prev => prev.filter(s => s.id !== student.id));
                              }
                            }}
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
            <div className="bulk-upload-help">
              <small>
                <strong>Instructions:</strong> Download template, fill in student data, then upload CSV file. 
                Required columns: S/N, First Name, Surname, Sex (Male/Female). 
                Middle Name is optional.
              </small>
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
  );
};

export default PreFormOneRegistration;
