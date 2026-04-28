/**
 * Subjects Year Selection Page for FORM V-VI (after stream selection)
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './SubjectsYearSelection.css';

const SubjectsFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const currentYear = new Date().getFullYear();
  
  // Generate years from 2025 to current year + 3
  const startYear = 2025;
  const endYear = currentYear + 3;
  const years = [];
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }
  years.reverse(); // Most recent first

  const getBackPath = () => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/subjects/${formMap[formLevel]}/streams`;
  };

  const getSubjectsManagementPath = (year) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/subjects/${formMap[formLevel]}/stream/${stream}/year/${year}`;
  };

  return (
    <AdminLayout>
      <div className="subjects-year-selection-page-container">
        <div className="subjects-year-selection-card">
          <div className="subjects-year-selection-card-header">
            <i className="fas fa-book"></i>
            <span>{formLevel} {stream} - Choose Year</span>
          </div>
          <div className="subjects-year-selection-card-body">
            <div className="subjects-year-selection-grid">
              {years.map((year) => (
                <Link
                  key={`${year}-subjects`}
                  to={getSubjectsManagementPath(year)}
                  className="subjects-year-selection-card-item"
                  aria-label={`${year} Subjects`}
                  data-current-year={year === currentYear}
                >
                  {year === currentYear ? (
                    <i className="fas fa-check subjects-year-status-icon current"></i>
                  ) : (
                    <i className="fas fa-times subjects-year-status-icon non-current"></i>
                  )}
                  <div className="subjects-year-selection-number">{year}</div>
                  <div className="subjects-year-selection-label">Subjects</div>
                </Link>
              ))}
            </div>
            <Link to={getBackPath()} className="subjects-year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectsFormVVIYearSelection;

