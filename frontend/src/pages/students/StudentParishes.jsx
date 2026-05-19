/**
 * Student Parishes Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './StudentParishes.css';

const FORM_VVI_STREAMS = ['PCB', 'PCM', 'EGM', 'HGE', 'HGL', 'PGM'];

const StudentParishes = () => {
  const { hasClass, isAdminLike } = useAuth();
  const parishModule = { moduleId: 'student_parishes' };

  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/students/parishes/form-i/years' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/students/parishes/form-ii/years' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/students/parishes/form-iii/years' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/students/parishes/form-iv/years' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/students/parishes/form-v/streams' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/students/parishes/form-vi/streams' },
  ];

  const visibleForms = useMemo(() => {
    if (isAdminLike()) return forms;
    return forms.filter((form) => {
      if (form.id === 'FORM V' || form.id === 'FORM VI') {
        return FORM_VVI_STREAMS.some((code) => hasClass(`${form.id} ${code}`, parishModule));
      }
      return hasClass(form.id, parishModule);
    });
  }, [forms, hasClass, isAdminLike]);

  return (
    <AdminLayout>
      <div className="parish-page-container">
        <div className="parish-card">
          <div className="parish-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>Classes</span>
          </div>
          <div className="parish-card-body">
            {visibleForms.length === 0 ? (
              <p className="parish-selection-empty">
                You do not have access to any classes for parishes. Contact an administrator.
              </p>
            ) : (
              <div className="parish-grid">
                {visibleForms.map((form) => (
                  <Link
                    key={form.id}
                    to={form.path}
                    className="parish-form-card"
                    data-form={form.id}
                    aria-label={`${form.id} Student Parishes`}
                  >
                    <div className="parish-form-number">{form.id}</div>
                    <div className="parish-form-label">Student Parishes</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentParishes;
