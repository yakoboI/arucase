/**
 * Score Entry Year Selection Page for FORM V-VI (after stream)
 * Non-admin users only see years allocated for this class (e.g. FORM V PCM).
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './ScoreEntryYearSelection.css';

const ScoreEntryFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const currentYear = new Date().getFullYear();
  const { getAllowedYearsForClass, hasClass, isAdminLike } = useAuth();

  const className = stream ? `${formLevel} ${stream}` : formLevel;
  if (!isAdminLike() && !hasClass(className)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  const startYear = 2025;
  const endYear = currentYear + 3;
  const fullYears = useMemo(() => {
    const arr = [];
    for (let i = startYear; i <= endYear; i++) arr.push(i);
    return arr.reverse();
  }, [endYear]);

  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(className);
    if (allowed === null) return fullYears;
    if (allowed.length === 0) return [];
    return fullYears.filter((y) => allowed.includes(y));
  }, [fullYears, className, getAllowedYearsForClass]);

  const getBackPath = () => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/score-entry/${formMap[formLevel]}/streams`;
  };

  const getYearDetailPath = (year) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/score-entry/${formMap[formLevel]}/stream/${stream}/year/${year}/subjects`;
  };

  return (
    <AdminLayout>
      <div className="score-entry-year-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className={`fas fa-${formLevel === 'FORM V' ? '5' : '6'}`}></i>
            {formLevel} {stream} - Choose Year
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {years.length === 0 ? (
              <div className="empty-state">
                <p>You do not have access to any years for this class, or no years have been allocated to you. Contact an administrator.</p>
              </div>
            ) : (
            <>
              <div className="year-selection-grid">
                {years.map((year) => (
                  <Link
                    key={`${year}-score`}
                    to={getYearDetailPath(year)}
                    className="year-selection-card-item"
                    aria-label={`${year} Score Entry`}
                    data-current-year={year === currentYear}
                  >
                    {year === currentYear ? (
                      <i className="fas fa-check year-status-icon current"></i>
                    ) : (
                      <i className="fas fa-times year-status-icon non-current"></i>
                    )}
                    <div className="year-selection-number">{year}</div>
                    <div className="year-selection-label">Enter Scores</div>
                  </Link>
                ))}
              </div>
            </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryFormVVIYearSelection;


