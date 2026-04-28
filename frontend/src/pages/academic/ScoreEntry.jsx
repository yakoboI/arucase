/**
 * Score Entry Landing Page
 * Shows FORM I-VI cards for navigation.
 * Non-admin users only see forms (classes) they are allocated to; no links to Registration or Subjects if they lack those modules.
 */
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './ScoreEntry.css';

const ALL_FORMS = [
  { id: 'FORM I', label: 'FORM I', path: '/admin/score-entry/form-i/years', icon: 'fa-1' },
  { id: 'FORM II', label: 'FORM II', path: '/admin/score-entry/form-ii/years', icon: 'fa-2' },
  { id: 'FORM III', label: 'FORM III', path: '/admin/score-entry/form-iii/years', icon: 'fa-3' },
  { id: 'FORM IV', label: 'FORM IV', path: '/admin/score-entry/form-iv/years', icon: 'fa-4' },
  { id: 'FORM V', label: 'FORM V', path: '/admin/score-entry/form-v/streams', icon: 'fa-5' },
  { id: 'FORM VI', label: 'FORM VI', path: '/admin/score-entry/form-vi/streams', icon: 'fa-6' },
];

const TOGETHER_FORMS = [
  { id: 'FORM V TOGETHER', label: 'FORM V TOGETHER', path: '/admin/score-entry/form-v/together/years', icon: 'fa-layer-group' },
  { id: 'FORM VI TOGETHER', label: 'FORM VI TOGETHER', path: '/admin/score-entry/form-vi/together/years', icon: 'fa-layer-group' },
];

const FORM_V_STREAMS = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];

const ScoreEntry = () => {
  const { isAdminLike, hasClass } = useAuth();

  const forms = useMemo(() => {
    if (isAdminLike()) return ALL_FORMS;
    return ALL_FORMS.filter((form) => {
      if (form.id === 'FORM I' || form.id === 'FORM II' || form.id === 'FORM III' || form.id === 'FORM IV') {
        return hasClass(form.id);
      }
      if (form.id === 'FORM V' || form.id === 'FORM VI') {
        return FORM_V_STREAMS.some((stream) => hasClass(`${form.id} ${stream}`));
      }
      return false;
    });
  }, [isAdminLike, hasClass]);

  const togetherForms = useMemo(() => {
    if (isAdminLike()) return TOGETHER_FORMS;
    // Show together card if the corresponding regular form card is shown
    // This ensures consistency: if you can access Form V, you can access Form V Together
    return TOGETHER_FORMS.filter((form) => {
      const formId = form.id.replace(' TOGETHER', '');
      return forms.some(f => f.id === formId);
    });
  }, [isAdminLike, forms]);

  return (
    <AdminLayout>
      <div className="individual-score-page-container">
        <div className="individual-score-card">
          <div className="individual-score-card-header">
            <div className="individual-score-card-header-title">
              <i className="fas fa-graduation-cap"></i>
              <span>Individual Subject Score Entrance</span>
            </div>
            <div className="individual-score-header-info">
              <span>Select a form to enter subject scores</span>
            </div>
          </div>
          <div className="individual-score-card-body">
            {forms.length === 0 && togetherForms.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-lock empty-icon"></i>
                <h3>No classes allocated</h3>
                <p>You do not have any class or subject allocated for score entry. Contact an administrator to assign your classes and subjects.</p>
              </div>
            ) : (
              <>
                {/* Regular Forms */}
                {forms.length > 0 && (
                  <>
                    <h3 className="section-subtitle">By Stream (Form V & VI) or By Year (Form I-IV)</h3>
                    <div className="individual-score-grid">
                      {forms.map((form) => (
                        <Link
                          key={form.id}
                          to={form.path}
                          className="individual-score-form-card"
                          data-form={form.id}
                          aria-label={`${form.id} - Enter Subject Scores`}
                        >
                          <i className={`fas ${form.icon} individual-score-form-icon`}></i>
                          <div className="individual-score-form-content">
                            <h3>{form.label}</h3>
                            <p>{form.id === 'FORM V' || form.id === 'FORM VI' ? 'Select stream to enter scores' : 'Select year to enter scores'}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                {/* Together Forms */}
                {togetherForms.length > 0 && (
                  <>
                    <h3 className="section-subtitle" style={{ marginTop: '2rem' }}>All Streams Together (Form V & VI)</h3>
                    <div className="individual-score-grid">
                      {togetherForms.map((form) => (
                        <Link
                          key={form.id}
                          to={form.path}
                          className="individual-score-form-card together-card"
                          data-form={form.id}
                          aria-label={`${form.id} - Enter Subject Scores`}
                        >
                          <i className={`fas ${form.icon} individual-score-form-icon`}></i>
                          <div className="individual-score-form-content">
                            <h3>{form.label}</h3>
                            <p>Select year to enter scores for all streams together</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntry;
