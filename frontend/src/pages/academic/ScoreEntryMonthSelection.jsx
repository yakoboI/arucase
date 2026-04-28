/**
 * Score Entry Month Selection Page
 * Non-admin users may be restricted to specific months (admin setting).
 * Non-admin without access to this class is redirected to score entry.
 */
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './ScoreEntryMonthSelection.css';

const ALL_MONTHS = ['February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November'];

const ScoreEntryMonthSelection = ({ formLevel }) => {
  const { year, stream, subjectCode: subjectCodeParam } = useParams();
  const navigate = useNavigate();
  // Decode subject code to handle URL-encoded values (e.g., "A%2FPHY" -> "A/PHY")
  const subjectCode = subjectCodeParam ? decodeURIComponent(subjectCodeParam) : '';
  const { getAllowedScoreEntryMonths, hasClass, isAdminLike } = useAuth();

  // Use same normalization as other score-entry pages so hasClass() matches (FORM I not Form I)
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  // Note: All "NA" stream values have been normalized to "A" in the database
  const normalizedStream = (() => {
    const streamValue = (stream || 'A').toUpperCase();
    // Normalize 'NA' to 'A' for Form I-IV
    if (streamValue === 'NA' && normalizedLevel && !normalizedLevel.includes('FORM V') && !normalizedLevel.includes('FORM VI')) {
      return 'A';
    }
    return streamValue;
  })();
  const currentClassKey = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
    ? `${normalizedLevel} ${normalizedStream}`
    : normalizedLevel;

  if (!isAdminLike() && !hasClass(currentClassKey)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  // Restrict to allowed months for non-admin (when admin has set specific months)
  const allowedMonths = getAllowedScoreEntryMonths();
  const allMonths = allowedMonths === null ? ALL_MONTHS : ALL_MONTHS.filter((m) => allowedMonths.includes(m));

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/score-entry/${formLevel}/stream/${stream}/year/${year}/subjects`;
    } else {
      return `/admin/score-entry/${formLevel}/year/${year}/stream/${stream}/subjects`;
    }
  };

  const getMonthDetailPath = (month) => {
    // Always encode the subject code to handle forward slashes and special characters
    // React Router decodes URL params, so we need to re-encode when building paths
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    // URL encode month to handle any special characters (though month names are usually safe)
    const encodedMonth = encodeURIComponent(month);
    
    let path;
    if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
      path = `/admin/score-entry/${formLevel}/stream/${stream}/year/${year}/subject/${encodedSubjectCode}/month/${encodedMonth}/enter`;
    } else {
      path = `/admin/score-entry/${formLevel}/year/${year}/stream/${stream}/subject/${encodedSubjectCode}/month/${encodedMonth}/enter`;
    }
    
    return path;
  };

  return (
    <AdminLayout>
      <div className="score-entry-month-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-alt"></i>
            Select Month for Score Entry
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back to Subjects
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {allMonths.length === 0 ? (
              <div className="empty-state">
                <p>You are not allowed to enter scores for any month. Contact an administrator to assign score entry months in User Management.</p>
              </div>
            ) : (
            <div className="stats-grid">
              {allMonths.map((month) => {
                const monthPath = getMonthDetailPath(month);
                return (
                  <div
                    key={month}
                    className="stat-card"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(monthPath, { replace: false });
                    }}
                  >
                    <div className="stat-icon">
                      <i className="fas fa-calendar"></i>
                    </div>
                    <div className="stat-content">
                      <h3>{month}</h3>
                      <p>Enter {month} scores</p>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryMonthSelection;


