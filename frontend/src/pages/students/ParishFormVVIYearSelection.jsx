/**
 * Parish Year Selection Page for FORM V-VI (after stream selection)
 * Non-admin users only see years allocated for this class (e.g. FORM V PCM).
 * Uses same academic year logic as Registration and Photos: getFormVVIYears() so 2026 etc. show correctly.
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { getFormVVIYears } from '../../utils/academicYearUtils';
import './ParishYearSelection.css';

const ParishFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const { getAllowedYearsForClass } = useAuth();

  // Same as Registration and Photos: use Form V/VI academic year list (includes 2025, 2026, etc.)
  const availableYears = useMemo(() => getFormVVIYears(), []);

  const className = stream ? `${formLevel} ${stream}` : formLevel;
  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(className);
    if (allowed === null) return availableYears;
    if (allowed.length === 0) return [];
    return availableYears.filter((yearObj) => allowed.includes(yearObj.year));
  }, [availableYears, className, getAllowedYearsForClass]);

  const getBackPath = () => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/students/parishes/${formMap[formLevel]}/streams`;
  };

  const getParishManagementPath = (year) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/students/parishes/${formMap[formLevel]}/stream/${stream}/year/${year}`;
  };

  return (
    <AdminLayout>
      <div className="parish-year-selection-page-container">
        <div className="parish-year-selection-card">
          <div className="parish-year-selection-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>{formLevel} {stream} - Choose Academic Year</span>
          </div>
          <div className="parish-year-selection-card-body">
            {years.length === 0 ? (
              <p className="parish-year-selection-empty">You do not have access to any years for this class. Contact an administrator.</p>
            ) : (
            <div className="parish-year-selection-grid">
              {years.map((yearObj) => (
                <Link
                  key={`${yearObj.year}-${yearObj.isEndYear ? 'end' : 'start'}`}
                  to={getParishManagementPath(yearObj.year)}
                  className="parish-year-selection-card-item"
                  aria-label={`${yearObj.displayRange} Student Parishes`}
                  title={yearObj.fullDisplay}
                >
                  <div className="parish-year-selection-number">{yearObj.year}</div>
                  <div className="parish-year-selection-label">
                    {yearObj.displayLabel || `(${yearObj.displayRange})`}
                  </div>
                </Link>
              ))}
            </div>
            )}
            <Link to={getBackPath()} className="parish-year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ParishFormVVIYearSelection;

