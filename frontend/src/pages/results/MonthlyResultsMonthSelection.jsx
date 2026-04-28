/**
 * Monthly Results Month Selection Page
 */
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import '../academic/MarksConfigTermSelection.css';

const MonthlyResultsMonthSelection = ({ formLevel }) => {
  const { year, stream } = useParams();
  const navigate = useNavigate();
  
  // Assessment months for both terms
  const months = [
    'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November'
  ];

  const getBackPath = () => {
    const normalizedLevel = formLevel
      ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '';
    
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/results/monthly/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/results/monthly/${formLevel}/year/${year}/streams`;
    }
  };

  const getMonthDetailPath = (month) => {
    if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
      return `/admin/results/monthly/${formLevel}/stream/${stream}/year/${year}/month/${month}`;
    } else {
      return `/admin/results/monthly/${formLevel}/year/${year}/stream/${stream}/month/${month}`;
    }
  };

  return (
    <AdminLayout>
      <div className="marks-config-term-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-alt"></i>
            Select Month
            <div className="header-actions">
              <button type="button" onClick={() => navigate(-1)} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="term-selection-grid">
              {months.map((month) => (
                <Link
                  key={month}
                  to={getMonthDetailPath(month)}
                  className="term-selection-card-item"
                >
                  <div className="term-selection-name">{month}</div>
                  <div className="term-selection-subtitle">View/Edit Results</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MonthlyResultsMonthSelection;

