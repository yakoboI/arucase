/**
 * Year Selection Page for FORM V-VI (after stream selection)
 * Non-admin users only see years allocated for this class (e.g. FORM V PCM).
 * Uses special academic year logic for Form 5 & 6 streams.
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { getFormVVIYears, getFormVVIVearDisplay } from '../../utils/academicYearUtils';
import './YearSelection.css';

const FormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const { getAllowedYearsForClass } = useAuth();

  // Use the new academic year logic for Form V/VI
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
    return `/admin/students/registration/${formMap[formLevel]}/streams`;
  };

  const getYearDetailPath = (year) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/students/registration/${formMap[formLevel]}/stream/${stream}/year/${year}/terms`;
  };

  return (
    <AdminLayout>
      <div className="year-selection-page-container">
        <div className="year-selection-card">
          <div className="year-selection-card-header">
            <i className="fas fa-calendar-alt"></i>
            <span>{formLevel} {stream} - Choose Academic Year</span>
          </div>
          <div className="year-selection-card-body">
            {years.length === 0 ? (
              <p className="year-selection-empty">You do not have access to any years for this class. Contact an administrator.</p>
            ) : (
            <div className="year-selection-grid">
              {years.map((yearObj) => (
                <Link
                  key={`${yearObj.year}-${yearObj.isEndYear ? 'end' : 'start'}`}
                  to={getYearDetailPath(yearObj.year)}
                  className="year-selection-card-item"
                  aria-label={`${yearObj.displayRange} Students`}
                  title={yearObj.fullDisplay}
                >
                  <div className="year-selection-number">{yearObj.year}</div>
                  <div className="year-selection-label">
                    {yearObj.displayLabel || `(${yearObj.displayRange})`}
                  </div>
                </Link>
              ))}
            </div>
            )}
            <Link to={getBackPath()} className="year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FormVVIYearSelection;

