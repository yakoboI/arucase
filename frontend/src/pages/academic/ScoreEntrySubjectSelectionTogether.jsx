/**
 * Score Entry Subject Selection - Form V/VI Together Mode
 * Shows all registered subjects for the selected form and year (all streams combined)
 */
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI } from '../../services/students';
import './ScoreEntrySubjectSelection.css';

const ScoreEntrySubjectSelectionTogether = () => {
  const { formLevel, year } = useParams();
  const { isAdminLike } = useAuth();

  // Normalize form level
  const normalizedForm = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';

  // Fetch all subjects for this form (all streams together)
  const { data: allSubjects = [], isLoading, error } = useQuery({
    queryKey: ['subjects-together', normalizedForm, year],
    queryFn: async () => {
      console.log('Together mode fetching subjects:', { level: normalizedForm, stream: 'ALL', year });
      try {
        const res = await studentsAPI.getSubjects({
          level: normalizedForm,
          stream: 'ALL',
          year: year,
        });
        console.log('Together mode subjects response:', res.data);
        return res.data.subjects || [];
      } catch (err) {
        // Suppress 403 errors (permission denied) - they'll be handled by the error state
        if (err?.code === 403 || err?.response?.status === 403) {
          console.warn('Permission denied fetching subjects:', err.message);
          throw err; // Re-throw to trigger error state in UI
        }
        throw err;
      }
    },
    enabled: !!normalizedForm && !!year && !!localStorage.getItem('token'),
    retry: false,
    onError: (err) => {
      // Prevent unhandled promise rejection
      if (err?.code === 403 || err?.response?.status === 403) {
        return Promise.resolve();
      }
    },
  });

  const getBackPath = () => {
    return `/admin/score-entry/${formLevel}/together/years`;
  };

  const getSubjectDetailPath = (subjectCode) => {
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    return `/admin/score-entry/${formLevel}/together/year/${year}/subject/${encodedSubjectCode}/months`;
  };

  return (
    <AdminLayout>
      <div className="score-entry-subject-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-layer-group"></i>
            {normalizedForm} (All Streams Together) {year} - Select Subject
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading subjects...</div>
            ) : error ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>Error Loading Subjects</h3>
                <p>{error.message || 'Failed to load subjects. Please try again.'}</p>
              </div>
            ) : allSubjects.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-book-open empty-icon"></i>
                <h3>No Subjects Available</h3>
                <p>No subjects have been added for this class yet. Please add subjects first.</p>
                {isAdminLike() && (
                  <Link to="/admin/subjects" className="excel-btn primary">
                    <i className="fas fa-plus"></i> Manage Subjects
                  </Link>
                )}
              </div>
            ) : (
              <div className="stats-grid">
                {allSubjects.map((subject) => (
                  <Link
                    key={subject.subject_code}
                    to={getSubjectDetailPath(subject.subject_code)}
                    className="stat-card"
                  >
                    <div className="stat-icon">
                      <i className="fas fa-book"></i>
                    </div>
                    <div className="stat-content">
                      <h3>{subject.subject_name}</h3>
                      <p>{subject.subject_code} - {subject.subject_abbreviation || subject.subject_code}</p>
                    </div>
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

export default ScoreEntrySubjectSelectionTogether;
