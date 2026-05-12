/**
 * Year Selection Page for FORM I-IV
 * Non-admin users only see years allocated to them for this class.
 */
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './YearSelection.css';

const YearSelection = ({ formLevel }) => {
  const currentYear = new Date().getFullYear();
  const { getAllowedYearsForClass } = useAuth();

  const startYear = 2025;
  const endYear = currentYear + 3;
  const fullYears = useMemo(() => {
    const arr = [];
    for (let i = startYear; i <= endYear; i++) arr.push(i);
    return arr.reverse();
  }, [endYear]);

  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(formLevel);
    if (allowed === null) return fullYears;
    if (allowed.length === 0) return [];
    return fullYears.filter((y) => allowed.includes(y));
  }, [fullYears, formLevel, getAllowedYearsForClass]);

  const getBackPath = () => {
    return '/admin/students/registration';
  };

  const getYearDetailPath = (year) => {
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/students/registration/${formMap[formLevel]}/year/${year}/streams`;
  };

  return (
    <AdminLayout>
      <div className="year-selection-page-container">
        <div className="year-selection-card">
          <div className="year-selection-card-header">
            <i className="fas fa-calendar-alt"></i>
            <span>{formLevel} - Choose Year</span>
          </div>
          <div className="year-selection-card-body">
            {years.length === 0 ? (
              <p className="year-selection-empty">You do not have access to any years for this class. Contact an administrator.</p>
            ) : (
            <div className="year-selection-grid">
              {years.map((year) => (
                <Link
                  key={`year-${year}`}
                  to={getYearDetailPath(year)}
                  className="year-selection-card-item"
                  aria-label={`${year} Admissions`}
                  data-current-year={year === currentYear}
                >
                  <div className="year-selection-number">{year}</div>
                  <div className="year-selection-label">Admissions</div>
                </Link>
              ))}
            </div>
            )}
            <Link to={getBackPath()} className="year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Registration</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default YearSelection;

