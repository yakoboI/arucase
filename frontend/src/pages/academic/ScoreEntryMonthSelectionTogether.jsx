/**
 * Score Entry Month Selection - Form V/VI Together Mode
 * Shows all months for the selected form, year, and subject
 */
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './ScoreEntryMonthSelection.css';

const FORM_VVI_MONTHS = [
  'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November'
];

const ScoreEntryMonthSelectionTogether = () => {
  const { formLevel, year, subjectCode: subjectCodeParam } = useParams();
  const navigate = useNavigate();
  const { getAllowedScoreEntryMonths } = useAuth();

  // Normalize form level
  const normalizedForm = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';

  // Decode subject code
  const subjectCode = subjectCodeParam ? decodeURIComponent(subjectCodeParam) : '';

  // Get allowed months (non-admin may be restricted)
  const allowedMonths = getAllowedScoreEntryMonths();
  const allMonths = allowedMonths === null ? FORM_VVI_MONTHS : FORM_VVI_MONTHS.filter((m) => allowedMonths.includes(m));

  const getBackPath = () => {
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    return `/admin/score-entry/${formLevel}/together/year/${year}/subjects`;
  };

  const getMonthDetailPath = (month) => {
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    const encodedMonth = encodeURIComponent(month);
    return `/admin/score-entry/${formLevel}/together/year/${year}/subject/${encodedSubjectCode}/month/${encodedMonth}/enter`;
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

export default ScoreEntryMonthSelectionTogether;
