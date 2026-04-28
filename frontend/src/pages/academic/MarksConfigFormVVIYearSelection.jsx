/**
 * Marks Config Year Selection Page for FORM V-VI (after stream)
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './SubjectsYearSelection.css';

const MarksConfigFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const currentYear = new Date().getFullYear();
  
  const startYear = 2025;
  const endYear = currentYear + 3;
  const years = [];
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }
  years.reverse();

  const getBackPath = () => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/marks-config/${formMap[formLevel]}/streams`;
  };

  const getYearDetailPath = (year) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/marks-config/${formMap[formLevel]}/stream/${stream}/year/${year}/terms`;
  };

  return (
    <AdminLayout>
      <div className="subjects-year-selection-page-container">
        <div className="subjects-year-selection-card">
          <div className="subjects-year-selection-card-header">
            <i className={`fas fa-${formLevel === 'FORM V' ? '5' : '6'}`}></i>
            {formLevel} {stream} - Choose Year
          </div>
          <div className="subjects-year-selection-card-body">
            <div className="subjects-year-selection-grid">
              {years.map((year) => (
                <Link
                  key={`${year}-marks-config`}
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
                  <div className="subjects-year-selection-label">Marks Config</div>
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

export default MarksConfigFormVVIYearSelection;

