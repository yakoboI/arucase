import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './PreFormOneParishes.css';
import { preFormOneService } from '../../services/preFormOneService';

const PreFormOneParishes = () => {
  const { year } = useParams();
  const [students, setStudents] = useState([]);
  const [csvData, setCsvData] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParish, setFilterParish] = useState('all');
  const [sortBy, setSortBy] = useState('admission_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingParish, setEditingParish] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load registered students from database on component mount
  useEffect(() => {
    const loadRegisteredStudents = async () => {
      try {
        setLoading(true);
        const response = await preFormOneService.getStudents(year);
        // Ensure we always set an array
        setStudents(Array.isArray(response) ? response : (response?.data || []));
      } catch (error) {
        console.error('Error loading registered students:', error);
        // Handle error gracefully
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadRegisteredStudents();
  }, [year]);

  // Generate admission number
  const generateAdmissionNumber = (serialNumber) => {
    return `789ABC${serialNumber}`;
  };

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    // Ensure students is always an array
    let filtered = Array.isArray(students) ? students : [];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student && 
        student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parish?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply parish filter
    if (filterParish !== 'all') {
      filtered = filtered.filter(student => student && student.parish === filterParish);
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1;
      
      if (sortBy === 'admission_number') {
        // Convert to string and handle undefined safely
        const aStr = String(aValue || '');
        const bStr = String(bValue || '');
        aValue = parseInt(aStr.replace('789ABC', '')) || 0;
        bValue = parseInt(bStr.replace('789ABC', '')) || 0;
      }
      
            
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [students, searchTerm, filterParish, sortBy, sortOrder]);

  // Get unique parishes for filter dropdown
  const uniqueParishes = useMemo(() => {
    const parishes = [...new Set(students.map(s => s.parish).filter(p => p))];
    return parishes.sort();
  }, [students]);

  // Handle parish input change
  const handleParishChange = (e) => {
    setEditingParish(e.target.value);
  };

  // Save parish assignment
  const handleSaveParish = async () => {
    console.log('🔍 FRONTEND DEBUG: Parish save initiated');
    console.log('🔍 FRONTEND DEBUG: Editing ID:', editingId);
    console.log('🔍 FRONTEND DEBUG: Editing parish:', editingParish);
    
    if (!editingId || !editingParish.trim()) {
      console.log('🔍 FRONTEND DEBUG: Parish save validation failed');
      console.log('🔍 FRONTEND DEBUG: Missing fields:', {
        editingId: !editingId,
        editingParish: !editingParish.trim()
      });
      toast.error('Please select a student and enter a parish name');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Calling API to update parish');
      
      const updatedStudent = await preFormOneService.updateStudentParish(editingId, editingParish.trim());
      console.log('🔍 FRONTEND DEBUG: API response - updated student:', updatedStudent);
      
      // Update local state with the updated student
      setStudents(prev => {
        console.log('🔍 FRONTEND DEBUG: Updating local state with parish update');
        console.log('🔍 FRONTEND DEBUG: Student to update ID:', editingId);
        
        const updatedStudents = prev.map(student => {
          if (student.id === editingId) {
            console.log('🔍 FRONTEND DEBUG: Found student to update:', student);
            console.log('🔍 FRONTEND DEBUG: Updated to:', updatedStudent);
            return updatedStudent;
          }
          return student;
        });
        
        console.log('🔍 FRONTEND DEBUG: State update completed');
        return updatedStudents;
      });

      // Refresh data from database to ensure UI is in sync
      try {
        console.log('🔍 FRONTEND DEBUG: Refreshing data from database after parish update');
        const freshData = await preFormOneService.getStudents(year);
        const studentsArray = Array.isArray(freshData) ? freshData : (freshData?.data || []);
        console.log('🔍 FRONTEND DEBUG: Fresh data loaded:', studentsArray);
        setStudents(studentsArray);
        console.log('🔍 FRONTEND DEBUG: UI state refreshed with latest database data');
      } catch (refreshError) {
        console.error('🔍 FRONTEND DEBUG: Error refreshing data:', refreshError);
      }

      toast.success('Parish updated successfully!');
      
      // Reset editing state
      console.log('🔍 FRONTEND DEBUG: Resetting editing state');
      setEditingParish('');
      setEditingId(null);
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error updating parish:', error);
      console.error('🔍 FRONTEND DEBUG: Error details:', error.response?.data || error.message);
      toast.error('Error updating parish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingParish('');
    setEditingId(null);
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

  // Improved CSV parsing function to handle quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // Process CSV data for parish updates
  const processCsvData = async (csvText) => {
    console.log('🔍 FRONTEND DEBUG: Parish CSV processing initiated');
    console.log('🔍 FRONTEND DEBUG: CSV text length:', csvText.length);
    console.log('🔍 FRONTEND DEBUG: CSV text preview:', csvText.substring(0, 200));
    
    if (!csvText.trim()) {
      console.log('🔍 FRONTEND DEBUG: Parish CSV validation failed - empty text');
      toast.error('Please enter CSV data');
      return;
    }

    try {
      setLoading(true);
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = parseCSVLine(lines[0]);
      const dataLines = lines.slice(1);
      
      console.log('🔍 FRONTEND DEBUG: Parish CSV parsed - lines:', lines.length);
      console.log('🔍 FRONTEND DEBUG: Parish CSV headers:', headers);
      console.log('🔍 FRONTEND DEBUG: Parish CSV data lines count:', dataLines.length);

      const updates = [];
      const seenSerialNumbers = new Set();

      dataLines.forEach((line, index) => {
        const values = parseCSVLine(line);
        let serialNumber = '';
        let parish = '';

        headers.forEach((header, i) => {
          const field = header.toLowerCase().replace(/\s+/g, '');
          if (field === 'serialnumber' || field === 's/n') serialNumber = values[i] || '';
          else if (field === 'parish') parish = values[i] || '';
        });
        
        console.log(`🔍 FRONTEND DEBUG: Processing parish CSV line ${index + 1}:`, {
          serialNumber,
          parish,
          rawValues: values
        });

        // Validate serial number format (basic validation)
        if (serialNumber && !/^[A-Za-z0-9\-_]+$/.test(serialNumber)) {
          console.warn(`🔍 FRONTEND DEBUG: Invalid serial number format at line ${index + 2}: ${serialNumber}`);
          return;
        }

        // Check for duplicates
        if (serialNumber && seenSerialNumbers.has(serialNumber)) {
          console.warn(`🔍 FRONTEND DEBUG: Duplicate serial number found: ${serialNumber}`);
          return;
        }

        // Add to updates array if both serial number and parish are provided
        if (serialNumber && parish) {
          seenSerialNumbers.add(serialNumber);
          updates.push({
            serial_number: serialNumber,
            parish: parish.trim()
          });
          console.log(`🔍 FRONTEND DEBUG: Added valid update ${updates.length}:`, {
            serial_number: serialNumber,
            parish: parish.trim()
          });
        }
      });
      
      console.log('🔍 FRONTEND DEBUG: Total valid parish updates:', updates.length);
      console.log('🔍 FRONTEND DEBUG: Updates data:', updates);

      if (updates.length === 0) {
        console.log('🔍 FRONTEND DEBUG: No valid parish updates found in CSV');
        toast.error('No valid parish updates found in CSV');
        return;
      }

      const result = await preFormOneService.bulkUpdateParishes(updates);
      console.log('🔍 FRONTEND DEBUG: Bulk parish update API response:', result);
      
      // Update local state with the updated students
      setStudents(prev => {
        console.log('🔍 FRONTEND DEBUG: Updating local state with bulk parish updates');
        console.log('🔍 FRONTEND DEBUG: Previous students count:', prev.length);
        
        const updatedStudents = [...prev];
        const updatedCount = result.students?.length || 0;
        
        result.students?.forEach(updatedStudent => {
          const index = updatedStudents.findIndex(s => s.id === updatedStudent.id);
          if (index !== -1) {
            console.log(`🔍 FRONTEND DEBUG: Updating student at index ${index}:`, {
              before: updatedStudents[index],
              after: updatedStudent
            });
            updatedStudents[index] = updatedStudent;
          } else {
            console.log('🔍 FRONTEND DEBUG: Student not found in local state:', updatedStudent);
          }
        });
        
        console.log('🔍 FRONTEND DEBUG: Bulk parish state update completed');
        console.log('🔍 FRONTEND DEBUG: Updated students count:', updatedCount);
        return updatedStudents;
      });
      
      toast.success(`Successfully updated parish for ${result.students?.length || 0} students from CSV!`);
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error processing parish CSV data:', error);
      console.error('🔍 FRONTEND DEBUG: Error details:', error.response?.data || error.message);
      toast.error('Error processing CSV data. Please check the file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit student parish
  const handleEditStudent = (student) => {
    setEditingParish(student.parish || '');
    setEditingId(student.id);
  };

  // Delete student (remove from parish assignment)
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to remove the parish assignment for this student?')) {
      try {
        setLoading(true);
        const updatedStudent = await preFormOneService.updateStudentParish(studentId, '');
        console.log('🔍 FRONTEND DEBUG: Parish removal API response:', updatedStudent);
        
        // Refresh data from database to ensure UI is in sync
        try {
          console.log('🔍 FRONTEND DEBUG: Refreshing data from database after parish removal');
          const freshData = await preFormOneService.getStudents(year);
          const studentsArray = Array.isArray(freshData) ? freshData : (freshData?.data || []);
          console.log('🔍 FRONTEND DEBUG: Fresh data loaded after parish removal:', studentsArray);
          console.log('🔍 FRONTEND DEBUG: Student with removed parish:', studentsArray.find(s => s.id === studentId));
          setStudents(studentsArray);
          console.log('🔍 FRONTEND DEBUG: UI state refreshed after parish removal');
        } catch (refreshError) {
          console.error('🔍 FRONTEND DEBUG: Error refreshing data after parish removal:', refreshError);
          // Fallback to local state update if refresh fails
          setStudents(prev => prev.map(student => 
            student.id === studentId ? updatedStudent : student
          ));
        }
        
        toast.success('Parish assignment removed successfully!');
      } catch (error) {
        console.error('Error removing parish assignment:', error);
        toast.error('Error removing parish assignment. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export to CSV
  const exportToCsv = async () => {
    try {
      setLoading(true);
      await preFormOneService.exportStudents(year);
    } catch (error) {
      console.error('Error exporting students:', error);
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
    const templateHeaders = ['S/N', 'FirstName', 'MiddleName', 'Surname', 'Sex', 'Parish'];
    const templateData = [
      templateHeaders.join(','),
      'SN001,John,Doe,Smith,Male,St. Mary\'s Parish',
      'SN002,Jane,Marie,Johnson,Female,St. Joseph\'s Parish'
    ].join('\n');

    const blob = new Blob([templateData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `preform-one-parishes-template-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="registration-form-page-container">
      {/* Edit Parish Card */}
      {editingId && (
        <div className="registration-form-card">
          <div className="registration-form-card-header">
            <i className="fas fa-church"></i>
            <span>Edit Parish Assignment - {year}</span>
            <span className="academic-year-info">
              <small>Student: {students.find(s => s.id === editingId)?.admission_number}</small>
            </span>
          </div>
          <div className="registration-form-card-body">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveParish(); }} className="registration-form">
              <div className="student-info-display">
                <div className="student-details-grid">
                  <div className="detail-item">
                    <label>Admission Number:</label>
                    <span>{students.find(s => s.id === editingId)?.admission_number}</span>
                  </div>
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{students.find(s => s.id === editingId)?.first_name} {students.find(s => s.id === editingId)?.surname}</span>
                  </div>
                  <div className="detail-item">
                    <label>Sex:</label>
                    <span>{students.find(s => s.id === editingId)?.sex}</span>
                  </div>
                </div>
              </div>
              
              <div className="registration-form-grid">
                <div className="form-field">
                  <div className="form-group">
                    <label htmlFor="parish">
                      Parish Assignment <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      id="parish"
                      value={editingParish}
                      onChange={handleParishChange}
                      placeholder="Enter parish name"
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-field form-actions-field">
                  <button type="submit" className="form-btn primary">
                    <i className="fas fa-save"></i>
                    <span className="btn-text">Save Parish</span>
                  </button>
                </div>
                
                <div className="form-field form-actions-field">
                  <button type="button" onClick={handleCancelEdit} className="form-btn secondary">
                    <i className="fas fa-times"></i>
                    <span className="btn-text">Cancel</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Card */}
      <div className="bulk-upload-card">
        <div className="bulk-upload-card-header">
          <i className="fas fa-file-csv"></i>
          <span>Bulk Parish Operations</span>
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
                <strong>Instructions:</strong> Download template, fill in parish data, then upload CSV file. 
                Required columns: S/N, First Name, Surname, Sex, Parish. 
                Middle Name is optional.
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Registered Students Card */}
      <div className="registered-students-card">
        <div className="registered-students-card-header">
          <i className="fas fa-table"></i>
          <span>Registered Students ({filteredAndSortedStudents.length})</span>
        </div>
        <div className="registered-students-card-body">
          {/* Search and Filter Controls */}
          <div className="students-controls">
            <div className="search-filter">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="form-input"
              />
            </div>
            <div className="filter-controls">
              <select
                value={filterParish}
                onChange={(e) => setFilterParish(e.target.value)}
                className="form-input"
              >
                <option value="all">All Parishes</option>
                {uniqueParishes.map(parish => (
                  <option key={parish} value={parish}>{parish}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-input"
              >
                <option value="admission_number">Sort by Admission No</option>
                <option value="first_name">Sort by First Name</option>
                <option value="surname">Sort by Surname</option>
                <option value="parish">Sort by Parish</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="form-btn secondary"
              >
                <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                <span className="btn-text">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading students...</p>
            </div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-slash"></i>
              <p>No students found matching your criteria</p>
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
                    <th>Parish</th>
                    <th>Actions</th>
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
                        <span className="parish-badge">
                          {student.parish || 'Not Assigned'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleEditStudent(student)}
                            className="form-btn primary small"
                            title="Edit parish"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(student.id)}
                            className="form-btn secondary small"
                            title="Remove parish assignment"
                          >
                            <i className="fas fa-times"></i>
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
  );
};

export default PreFormOneParishes;
