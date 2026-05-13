/**
 * Pre-Form One Continuing Subjects Management Component
 * Handles CRUD operations for continuing subjects with sharp-edged design
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import preFormOneContinuingSubjectsService from '../../services/preFormOneContinuingSubjectsService';
import './PreFormOneContinuingSubjects.css';
import AdminLayout from '../../components/layout/AdminLayout';

const PreFormOneContinuingSubjects = () => {
  const { year } = useParams();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    is_active: true
  });

  // Load continuing subjects on component mount
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setLoading(true);
        console.log('🔍 FRONTEND DEBUG: Loading continuing subjects');
        const subjectsData = await preFormOneContinuingSubjectsService.getSubjects();
        console.log('🔍 FRONTEND DEBUG: Continuing subjects loaded:', subjectsData);
        
        if (subjectsData && subjectsData.data) {
          setSubjects(subjectsData.data);
          console.log('🔍 FRONTEND DEBUG: Continuing subjects count:', subjectsData.data.length);
        } else {
          setSubjects([]);
          console.log('🔍 FRONTEND DEBUG: No continuing subjects data found');
        }
      } catch (error) {
        console.error('🔍 FRONTEND DEBUG: Error loading continuing subjects:', error);
        toast.error('Error loading continuing subjects. Please try again.');
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
      console.log('🔍 FRONTEND DEBUG: Submitting continuing subject form:', formData);
      
      if (editingSubject) {
        console.log('🔍 FRONTEND DEBUG: Updating continuing subject ID:', editingSubject.id);
        const updatedSubject = await preFormOneContinuingSubjectsService.updateSubject(editingSubject.id, formData);
        console.log('🔍 FRONTEND DEBUG: Continuing subject updated successfully:', updatedSubject);
        
        if (updatedSubject && updatedSubject.data) {
          setSubjects(prev => prev.map(subject => 
            subject.id === editingSubject.id ? updatedSubject.data : subject
          ));
          toast.success('Continuing subject updated successfully!');
        } else {
          console.error('🔍 FRONTEND DEBUG: Failed to update subject - no data returned');
          toast.error('Failed to update continuing subject. Please try again.');
        }
      } else {
        console.log('🔍 FRONTEND DEBUG: Creating new continuing subject');
        const newSubject = await preFormOneContinuingSubjectsService.createSubject(formData);
        console.log('🔍 FRONTEND DEBUG: Continuing subject created successfully:', newSubject);
        
        if (newSubject && newSubject.data) {
          setSubjects(prev => [...prev, newSubject.data]);
          toast.success('Continuing subject created successfully!');
        } else {
          console.error('🔍 FRONTEND DEBUG: Failed to create subject - no data returned');
          toast.error('Failed to create continuing subject. Please try again.');
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error saving continuing subject:', error);
      console.error('🔍 FRONTEND DEBUG: Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error saving continuing subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (subject) => {
    console.log('🔍 FRONTEND DEBUG: Editing continuing subject:', subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      is_active: subject.is_active
    });
    setEditingSubject(subject);
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (subject) => {
    if (!window.confirm(`Are you sure you want to delete "${subject.subject_name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Deleting continuing subject:', subject);
      
      await preFormOneContinuingSubjectsService.deleteSubject(subject.id);
      
      setSubjects(prev => prev.filter(s => s.id !== subject.id));
      toast.success('Continuing subject deleted successfully!');
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error deleting continuing subject:', error);
      toast.error('Error deleting continuing subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (subject) => {
    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Toggling active status for subject:', subject);
      
      const updatedData = {
        ...subject,
        is_active: !subject.is_active
      };
      
      const updatedSubject = await preFormOneContinuingSubjectsService.updateSubject(subject.id, updatedData);
      
      if (updatedSubject && updatedSubject.data) {
        setSubjects(prev => prev.map(s => 
          s.id === subject.id ? updatedSubject.data : s
        ));
        toast.success(`Continuing subject ${subject.is_active ? 'deactivated' : 'activated'} successfully!`);
      } else {
        console.error('🔍 FRONTEND DEBUG: Failed to toggle active status - no data returned');
        toast.error('Failed to update continuing subject status. Please try again.');
      }
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error toggling active status:', error);
      toast.error('Error updating continuing subject status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      subject_name: '',
      subject_code: '',
      is_active: true
    });
    setEditingSubject(null);
    setShowAddForm(false);
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setLoading(true);
      console.log('🔍 FRONTEND DEBUG: Exporting continuing subjects to Excel');
      await preFormOneContinuingSubjectsService.exportSubjects();
      toast.success('Continuing subjects exported successfully!');
    } catch (error) {
      console.error('🔍 FRONTEND DEBUG: Error exporting continuing subjects:', error);
      toast.error('Error exporting continuing subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
    <div className="continuing-subjects-page-container">
      <div className="continuing-subjects-page-header">
        <div className="continuing-subjects-page-title-block">
          <h2 className="continuing-subjects-page-heading">
            <i className="fas fa-book" aria-hidden="true"></i>
            Pre-Form One Continuing Subjects
          </h2>
          <p className="continuing-subjects-page-subtitle">
            Academic Year: {year}
          </p>
        </div>
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
        <div className="continuing-subjects-form-card">
          <div className="continuing-subjects-form-header">
            <h3>
              <i className="fas fa-edit"></i>
              {editingSubject ? 'Edit Continuing Subject' : 'Add Continuing Subject'}
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

          <form onSubmit={handleSubmit} className="continuing-subjects-form">
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
                {editingSubject ? 'Update Subject' : 'Add Subject'}
              </button>
              <button 
                type="button" 
                onClick={resetForm}
                className="form-btn secondary"
                disabled={loading}
              >
                <i className="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="continuing-subjects-list-card">
        <div className="continuing-subjects-list-header">
          <h3>
            <i className="fas fa-list"></i>
            Continuing Subjects ({subjects.length})
          </h3>
        </div>

        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h3>Loading Continuing Subjects...</h3>
            <p>Please wait while we load the continuing subjects data.</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h3>No Continuing Subjects Found</h3>
            <p>Start by adding your first continuing subject using the "Add Subject" button above.</p>
          </div>
        ) : (
          <div className="continuing-subjects-table-container">
            <table className="continuing-subjects-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Subject Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject.id}>
                    <td>{subject.subject_name}</td>
                    <td>{subject.subject_code}</td>
                    <td>
                      <span className={`status-badge ${subject.is_active ? 'active' : 'inactive'}`}>
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="action-btn edit"
                          title="Edit Subject"
                          disabled={loading}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleToggleActive(subject)}
                          className={`action-btn ${subject.is_active ? 'deactivate' : 'activate'}`}
                          title={subject.is_active ? 'Deactivate Subject' : 'Activate Subject'}
                          disabled={loading}
                        >
                          <i className={`fas fa-${subject.is_active ? 'toggle-off' : 'toggle-on'}`}></i>
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="action-btn delete"
                          title="Delete Subject"
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

export default PreFormOneContinuingSubjects;
