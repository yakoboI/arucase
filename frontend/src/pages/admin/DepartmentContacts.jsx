/**
 * Site & department contacts — website_settings (phones, emails, URLs, hours)
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import { EMPTY_SITE_CONTACT_FORM, SITE_CONTACT_FIELD_GROUPS } from './departmentContactFields';
import './PublicWebsite.css';

const DepartmentContacts = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(EMPTY_SITE_CONTACT_FORM);
  const [errors, setErrors] = useState({});

  const emailKeys = SITE_CONTACT_FIELD_GROUPS.flatMap((g) =>
    g.fields.filter((f) => f.type === 'email').map((f) => f.key)
  );

  const isValidEmail = (value) => {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = (data) => {
    const nextErrors = {};
    emailKeys.forEach((key) => {
      const label = SITE_CONTACT_FIELD_GROUPS.flatMap((g) => g.fields).find((f) => f.key === key)?.label;
      if (!isValidEmail((data[key] || '').trim())) {
        nextErrors[key] = `${label || key} email is invalid`;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['admin-department-contacts'],
    queryFn: async () => {
      const res = await adminAPI.getDepartmentContacts();
      return res.data.contacts || {};
    },
  });

  useEffect(() => {
    if (!contactsData) return;
    setFormData({ ...EMPTY_SITE_CONTACT_FORM, ...contactsData });
  }, [contactsData]);

  const saveMutation = useMutation({
    mutationFn: (data) => adminAPI.updateDepartmentContacts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-department-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      toast.success('Site and department contacts saved.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save contacts');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm(formData)) {
      toast.error('Fix invalid email address(es) before saving.');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleFieldChange = (key, value) => {
    const next = { ...formData, [key]: value };
    setFormData(next);
    if (errors[key]) validateForm(next);
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-address-book" />
            Site &amp; Department Contacts
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading…</div>
            ) : (
              <form onSubmit={handleSubmit} className="department-contacts-form">
                {SITE_CONTACT_FIELD_GROUPS.map((group) => (
                  <div key={group.title} className="form-section">
                    <h3>{group.title}</h3>
                    {group.description ? (
                      <p className="section-description">{group.description}</p>
                    ) : null}
                    {group.fields.map((field) => (
                      <div key={field.key} className="form-group">
                        <label htmlFor={field.key}>{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            id={field.key}
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="excel-input"
                            rows={3}
                            placeholder={field.placeholder || ''}
                          />
                        ) : (
                          <input
                            id={field.key}
                            type={field.type === 'url' ? 'url' : field.type}
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="excel-input"
                            placeholder={field.placeholder || ''}
                          />
                        )}
                        {errors[field.key] ? (
                          <small style={{ color: '#dc2626' }}>{errors[field.key]}</small>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="submit" className="excel-btn primary" disabled={saveMutation.isPending}>
                    <i className="fas fa-save" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
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
