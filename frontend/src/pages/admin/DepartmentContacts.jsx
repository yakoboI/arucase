/**
 * Department Contacts Management Page
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const DepartmentContacts = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    admissions_email: '',
    academics_email: '',
    bursar_email: '',
    alumni_email: '',
    parents_email: '',
  });
  const [errors, setErrors] = useState({});

  const emailFields = [
    { key: 'admissions_email', label: 'Admissions' },
    { key: 'academics_email', label: 'Academics' },
    { key: 'bursar_email', label: 'Bursar' },
    { key: 'alumni_email', label: 'Alumni' },
    { key: 'parents_email', label: 'Parents' },
  ];

  const isValidEmail = (value) => {
    if (!value) return true; // Empty is allowed
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = (data) => {
    const nextErrors = {};
    emailFields.forEach(({ key, label }) => {
      const value = (data[key] || '').trim();
      if (!isValidEmail(value)) {
        nextErrors[key] = `${label} email is invalid`;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Fetch department contacts
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['admin-department-contacts'],
    queryFn: async () => {
      const res = await adminAPI.getDepartmentContacts();
      return res.data.contacts || {};
    },
  });

  // Initialize form data when contacts load
  useEffect(() => {
    if (contactsData) {
      setFormData({
        admissions_email: contactsData.admissions_email || '',
        academics_email: contactsData.academics_email || '',
        bursar_email: contactsData.bursar_email || '',
        alumni_email: contactsData.alumni_email || '',
        parents_email: contactsData.parents_email || '',
      });
    }
  }, [contactsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.updateDepartmentContacts(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-department-contacts']);
      toast.success('Department contacts updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update department contacts');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm(formData)) {
      toast.error('Please fix invalid email address(es) before saving');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleFieldChange = (key, value) => {
    const next = { ...formData, [key]: value };
    setFormData(next);

    // Real-time validation for cleaner UX
    if (errors[key]) {
      validateForm(next);
    }
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-building"></i>
            Department Contacts Management
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading department contacts...</div>
            ) : (
              <form onSubmit={handleSubmit} className="department-contacts-form">
                <div className="form-section">
                  <h3>Department Email Addresses</h3>
                  <p className="section-description">
                    Configure email addresses for different departments. These will be displayed on relevant public pages.
                  </p>
                  
                  <div className="form-group">
                    <label>Admissions Email</label>
                    <input
                      type="email"
                      value={formData.admissions_email}
                      onChange={(e) => handleFieldChange('admissions_email', e.target.value)}
                      className="excel-input"
                      placeholder="admissions@school.edu"
                    />
                    {errors.admissions_email && (
                      <small style={{ color: '#dc2626' }}>{errors.admissions_email}</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Academics Email</label>
                    <input
                      type="email"
                      value={formData.academics_email}
                      onChange={(e) => handleFieldChange('academics_email', e.target.value)}
                      className="excel-input"
                      placeholder="academics@school.edu"
                    />
                    {errors.academics_email && (
                      <small style={{ color: '#dc2626' }}>{errors.academics_email}</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Bursar Email</label>
                    <input
                      type="email"
                      value={formData.bursar_email}
                      onChange={(e) => handleFieldChange('bursar_email', e.target.value)}
                      className="excel-input"
                      placeholder="bursar@school.edu"
                    />
                    {errors.bursar_email && (
                      <small style={{ color: '#dc2626' }}>{errors.bursar_email}</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Alumni Email</label>
                    <input
                      type="email"
                      value={formData.alumni_email}
                      onChange={(e) => handleFieldChange('alumni_email', e.target.value)}
                      className="excel-input"
                      placeholder="alumni@school.edu"
                    />
                    {errors.alumni_email && (
                      <small style={{ color: '#dc2626' }}>{errors.alumni_email}</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Parents Email</label>
                    <input
                      type="email"
                      value={formData.parents_email}
                      onChange={(e) => handleFieldChange('parents_email', e.target.value)}
                      className="excel-input"
                      placeholder="parents@school.edu"
                    />
                    {errors.parents_email && (
                      <small style={{ color: '#dc2626' }}>{errors.parents_email}</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Preview</label>
                    <div className="content-preview">
                      <p><strong>Admissions:</strong> {formData.admissions_email || '—'}</p>
                      <p><strong>Academics:</strong> {formData.academics_email || '—'}</p>
                      <p><strong>Bursar:</strong> {formData.bursar_email || '—'}</p>
                      <p><strong>Alumni:</strong> {formData.alumni_email || '—'}</p>
                      <p><strong>Parents:</strong> {formData.parents_email || '—'}</p>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="excel-btn primary" disabled={saveMutation.isPending}>
                      <i className="fas fa-save"></i> {saveMutation.isPending ? 'Saving...' : 'Save Department Contacts'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DepartmentContacts;
