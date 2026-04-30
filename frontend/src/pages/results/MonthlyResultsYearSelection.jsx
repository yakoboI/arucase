/**
 * Monthly Results Year Selection Page for FORM I-IV
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import '../academic/SubjectsYearSelection.css';

const MonthlyResultsYearSelection = ({ formLevel }) => {
  const currentYear = new Date().getFullYear();
  
  const startYear = currentYear - 10;
  const endYear = currentYear + 3;
  const years = [];
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }
  years.reverse();

  const getBackPath = () => {
    return '/admin/results/monthly';
  };

  const getYearDetailPath = (year) => {
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/results/monthly/${formMap[formLevel]}/year/${year}/streams`;
  };

  return (
    <AdminLayout>
      <div className="subjects-year-selection-page-container">
        <div className="subjects-year-selection-card">
          <div className="subjects-year-selection-card-header">
            <i className={`fas fa-${formLevel === 'FORM I' ? '1' : formLevel === 'FORM II' ? '2' : formLevel === 'FORM III' ? '3' : '4'}`}></i>
            {formLevel} - Choose Year
          </div>
          <div className="subjects-year-selection-card-body">
            <div className="subjects-year-selection-grid">
              {years.map((year) => (
                <Link
                  key={`monthly-${year}`}
                  to={getYearDetailPath(year)}
                  className="subjects-year-selection-card-item"
                  data-current-year={year === currentYear}
                >
                  {year === currentYear ? (
                    <i className="fas fa-check subjects-year-status-icon current"></i>
                  ) : (
                    <i className="fas fa-times subjects-year-status-icon non-current"></i>
                  )}
                  <div className="subjects-year-selection-number">{year}</div>
                  <div className="subjects-year-selection-label">Monthly Results</div>
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

export default MonthlyResultsYearSelection;

