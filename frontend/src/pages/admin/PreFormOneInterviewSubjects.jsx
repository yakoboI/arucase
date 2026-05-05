import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './PreFormOneInterviewSubjects.css';
import { preFormOneInterviewSubjectsService } from '../../services/preFormOneInterviewSubjectsService';

const PreFormOneInterviewSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    is_active: true
  });

  // Load interview subjects on component mount
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setLoading(true);
        console.log('🔍 FRONTEND DEBUG: Loading interview subjects');
        const subjectsData = await preFormOneInterviewSubjectsService.getSubjects();
        console.log('🔍 FRONTEND DEBUG: Interview subjects loaded:', subjectsData);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch (error) {
        console.error('🔍 FRONTEND DEBUG: Error loading interview subjects:', error);
        toast.error('Error loading interview subjects. Please try again.');
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      subject_name: '',
      subject_code: '',
      description: '',
      max_marks: 100,
      interview_duration_minutes: 30,
      is_active: true
    });
    setEditingSubject(null);
    setShowAddForm(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔍 FRONTEND DEBUG: Form submission started');
    console.log('🔍 FRONTEND DEBUG: Form data:', formData);
    
    if (!formData.subject_name.trim() || !formData.subject_code.trim()) {
      console.log('🔍 FRONTEND DEBUG: Validation failed - missing fields');
      toast.error('Subject name and code are required');
      return;
    }
    
    console.log('🔍 FRONTEND DEBUG: Validation passed, proceeding with submission');
    
    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Submitting interview subject form:', formData);
      
      if (editingSubject) {
        console.log('🔍 FRONTEND DEBUG: Updating interview subject ID:', editingSubject.id);
        const updatedSubject = await preFormOneInterviewSubjectsService.updateSubject(editingSubject.id, formData);
        console.log('🔍 FRONTEND DEBUG: Interview subject updated successfully:', updatedSubject);
        
        if (updatedSubject && updatedSubject.data) {
          setSubjects(prev => prev.map(subject => 
            subject.id === editingSubject.id ? updatedSubject.data : subject
          ));
          toast.success('Interview subject updated successfully!');
        } else {
          console.error('🔍 FRONTEND DEBUG: Failed to update subject - no data returned');
          toast.error('Failed to update interview subject. Please try again.');
        }
      } else {
        console.log('🔍 FRONTEND DEBUG: Creating new interview subject');
        const newSubject = await preFormOneInterviewSubjectsService.createSubject(formData);
        console.log('🔍 FRONTEND DEBUG: Interview subject created successfully:', newSubject);
        
        if (newSubject && newSubject.data) {
          setSubjects(prev => [...prev, newSubject.data]);
          toast.success('Interview subject created successfully!');
        } else {
          console.error('🔍 FRONTEND DEBUG: Failed to create subject - no data returned');
          toast.error('Failed to create interview subject. Please try again.');
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error saving interview subject:', error);
      console.error('🔍 FRONTEND DEBUG: Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error saving interview subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (subject) => {
    console.log('🔍 FRONTEND DEBUG: Editing interview subject:', subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      description: subject.description || '',
      max_marks: subject.max_marks || 100,
      interview_duration_minutes: subject.interview_duration_minutes || 30,
      is_active: subject.is_active !== undefined ? subject.is_active : true
    });
    setEditingSubject(subject);
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (subject) => {
    if (window.confirm(`Are you sure you want to delete "${subject.subject_name}"? This action cannot be undone.`)) {
      try {
        setLoading(true);
        console.log('🔍 FRONTEND DEBUG: Deleting interview subject:', subject);
        
        await preFormOneInterviewSubjectsService.deleteSubject(subject.id);
        console.log('🔍 FRONTEND DEBUG: Interview subject deleted successfully');
        
        setSubjects(prev => prev.filter(s => s.id !== subject.id));
        toast.success('Interview subject deleted successfully!');
      } catch (error) {
        console.error('🔍 FRONTEND DEBUG: Error deleting interview subject:', error);
        toast.error(error.response?.data?.message || 'Error deleting interview subject. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Toggle active status
  const handleToggleActive = async (subject) => {
    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Toggling active status for subject:', subject);
      
      const updatedSubject = await preFormOneInterviewSubjectsService.updateSubject(subject.id, {
        ...subject,
        is_active: !subject.is_active
      });
      
      setSubjects(prev => prev.map(s => 
        s.id === subject.id ? updatedSubject.data : s
      ));
      
      toast.success(`Interview subject ${subject.is_active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error toggling active status:', error);
      toast.error('Error updating interview subject status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Exporting interview subjects to Excel');
      await preFormOneInterviewSubjectsService.exportSubjects();
      toast.success('Interview subjects exported successfully!');
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error exporting interview subjects:', error);
      toast.error('Error exporting interview subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interview-subjects-page-container">
      <div className="interview-subjects-page-header">
        <h2>
          <i className="fas fa-graduation-cap"></i>
          Pre-Form One Interview Subjects
        </h2>
        <div className="header-buttons">
          <button 
            onClick={() => setShowAddForm(true)}
            className="form-btn primary"
            disabled={loading}
          >
            <i className="fas fa-plus"></i>
            Add Subject
          </button>
          <button 
            onClick={exportToExcel}
            className="form-btn secondary"
            disabled={loading}
          >
            <i className="fas fa-file-excel"></i>
            Export to Excel
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="interview-subjects-form-card">
          <div className="interview-subjects-form-header">
            <h3>
              <i className="fas fa-edit"></i>
              {editingSubject ? 'Edit Interview Subject' : 'Add Interview Subject'}
            </h3>
            <button 
              onClick={resetForm}
              className="form-btn secondary small"
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="interview-subjects-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="subject_name">Subject Name *</label>
                <input
                  type="text"
                  id="subject_name"
                  name="subject_name"
                  value={formData.subject_name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Mathematics"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject_code">Subject Code *</label>
                <input
                  type="text"
                  id="subject_code"
                  name="subject_code"
                  value={formData.subject_code}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., MATH"
                  maxLength={50}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="form-btn primary"
                disabled={loading}
              >
                <i className="fas fa-save"></i>
                {loading ? 'Saving...' : (editingSubject ? 'Update Subject' : 'Add Subject')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="interview-subjects-list-card">
        <div className="interview-subjects-list-header">
          <h3>
            <i className="fas fa-list"></i>
            Interview Subjects ({subjects.length})
          </h3>
        </div>

        {loading && subjects.length === 0 ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            Loading interview subjects...
          </div>
        ) : subjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h3>No Interview Subjects Found</h3>
            <p>Start by adding your first interview subject using the "Add Subject" button above.</p>
          </div>
        ) : (
          <div className="interview-subjects-table-container">
            <table className="interview-subjects-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Max Marks</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(subject => (
                  <tr key={subject.id} className={!subject.is_active ? 'inactive-row' : ''}>
                    <td>
                      <strong>{subject.subject_name}</strong>
                    </td>
                    <td>
                      <span className="subject-code">{subject.subject_code}</span>
                    </td>
                    <td>
                      <span className="subject-description">
                        {subject.description || 'No description'}
                      </span>
                    </td>
                    <td>{subject.max_marks}</td>
                    <td>{subject.interview_duration_minutes} min</td>
                    <td>
                      <span className={`status-badge ${subject.is_active ? 'active' : 'inactive'}`}>
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleToggleActive(subject)}
                          className={`form-btn small ${subject.is_active ? 'secondary' : 'primary'}`}
                          title={subject.is_active ? 'Deactivate' : 'Activate'}
                          disabled={loading}
                        >
                          <i className={`fas fa-${subject.is_active ? 'pause' : 'play'}`}></i>
                        </button>
                        <button 
                          onClick={() => handleEdit(subject)}
                          className="form-btn primary small"
                          title="Edit subject"
                          disabled={loading}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(subject)}
                          className="form-btn secondary small"
                          title="Delete subject"
                          disabled={loading}
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
  );
};

export default PreFormOneInterviewSubjects;
