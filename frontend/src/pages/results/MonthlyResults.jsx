/**
 * Monthly Results Landing Page
 * Copied from arucase456copy Flask template
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './MonthlyResults.css';

const MonthlyResults = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/results/monthly/form-i/years' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/results/monthly/form-ii/years' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/results/monthly/form-iii/years' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/results/monthly/form-iv/years' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/results/monthly/form-v/streams' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/results/monthly/form-vi/streams' },
    {
      id: 'FORM V COMBINED',
      label: 'FORM V COMBINED',
      path: '/admin/results/monthly/form-v/streams?combined=1',
    },
    {
      id: 'FORM VI COMBINED',
      label: 'FORM VI COMBINED',
      path: '/admin/results/monthly/form-vi/streams?combined=1',
    },
  ];

  return (
    <AdminLayout>
      <div className="monthly-results">
        <div className="excel-card mb-30">
          <div className="excel-card-header monthly-results-header">
            <i className="fas fa-chart-line"></i> Classes
          </div>
          <div className="excel-card-body">
            <div className="stats-grid">
              {forms.map((form) => (
                <Link key={form.id} to={form.path} className="stat-card">
                  <i className="fas fa-check-circle monthly-results-hover-tick"></i>
                  <div className="stat-number">{form.label}</div>
                  <div className="stat-label">Monthly Results</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MonthlyResults;

