/**
 * Score Entry Year Selection - Form V/VI Together Mode
 * Shows all allowed years for the selected form (Form V or Form VI)
 * For "together" mode, all streams are combined
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './ScoreEntryYearSelection.css';

const FORM_V_STREAMS = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];

const ScoreEntryFormVVIYearSelectionTogether = () => {
  const { formLevel } = useParams();
  const { isAdminLike, getAllowedYearsForClass, hasClass } = useAuth();

  // Normalize form level
  const normalizedForm = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';

  // Check if user has access to any stream for this form
  const hasAccessToAnyStream = isAdminLike() || FORM_V_STREAMS.some(stream => hasClass(`${normalizedForm} ${stream}`));

  // For together mode, always show all years if user can access the page
  // The access control is already handled by the card visibility in ScoreEntry.jsx
  const allowedYears = isAdminLike() ? null : null; // null means show all years

  // Generate full year range (matching ScoreEntryYearSelection)
  const startYear = 2025;
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + 3;
  const fullYears = useMemo(() => {
    const arr = [];
    for (let i = startYear; i <= endYear; i++) arr.push(i);
    return arr.reverse();
  }, [endYear]);

  // For non-admin: only show years allocated for any stream of this form
  const years = useMemo(() => {
    if (allowedYears === null) return fullYears; // all years
    if (allowedYears.length === 0) return [];
    return fullYears.filter((y) => allowedYears.includes(y));
  }, [fullYears, allowedYears]);

  return (
    <AdminLayout>
      <div className="score-entry-year-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className={`fas fa-layer-group`}></i>
            {normalizedForm} (All Streams Together) - Choose Year
            <div className="header-actions">
              <Link to="/admin/score-entry" className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back to Forms
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {years.length === 0 ? (
              <div className="empty-state">
                <p>You do not have access to any years for this form, or no years have been allocated to you. Contact an administrator.</p>
              </div>
            ) : (
              <div className="year-selection-grid">
                {years.map((year) => {
                  const path = `/admin/score-entry/${formLevel}/together/year/${year}/subjects`;
                  return (
                    <Link
                      key={`${year}-score-together`}
                      to={path}
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

export default ScoreEntryFormVVIYearSelectionTogether;
