/**
 * Individual Student Report - Step 2: Year Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './IndividualReport.css';

const IndividualReportYearSelection = () => {
  const { form, stream } = useParams();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Generate years list from 2025 to current year + 3
  const startYear = 2025;
  const endYear = currentYear + 3;
  const generatedYears = [];
  for (let i = startYear; i <= endYear; i++) {
    generatedYears.push(i);
  }
  generatedYears.reverse(); // Most recent first

  const availableYears = generatedYears;

  const handleYearClick = (year) => {
    navigate(`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`);
  };

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="breadcrumb">
          <Link to="/reports/individual">Individual Student Report</Link> &gt; {form}
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-alt"></i> Select Academic Year
          </div>
          <div className="excel-card-body">
            <div className="year-grid">
                {availableYears.map((year) => (
                  <button
                    type="button"
                    key={`individual-${year}`}
                    onClick={() => handleYearClick(year)}
                    className="year-card"
                  >
                    {year === currentYear ? (
                      <i className="fas fa-check-circle year-status-icon year-current"></i>
                    ) : (
                      <i className="fas fa-times-circle year-status-icon year-not-current"></i>
                    )}
                    <div className="year-icon">
                      <i className="fas fa-calendar"></i>
                    </div>
                    <div className="year-title">{year}</div>
                    <div className="year-subtitle">Academic Year {year}</div>
                  </button>
                ))}
              </div>
            <div className="promotion-select-actions mt-20">
              <Link to="/reports/individual" className="excel-btn">
                <nobr><i className="fas fa-arrow-left"></i> Back to Forms</nobr>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportYearSelection;


