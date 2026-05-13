import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './PreFormOneYear.css';

const PreFormOneYear = () => {
  const { year } = useParams();

  const navigationItems = [
    {
      title: 'Registration',
      description: 'Manage student registrations',
      icon: 'fa-user-plus',
      path: `/admin/pre-form-one/${year}/registration`,
    },
    {
      title: 'Parishes',
      description: 'Manage student parish information',
      icon: 'fa-place-of-worship',
      path: `/admin/pre-form-one/${year}/parishes`,
    },
    {
      title: 'Interview Subjects',
      description: 'Manage interview subjects',
      icon: 'fa-book',
      path: `/admin/pre-form-one/${year}/interview-subjects`,
    },
    {
      title: 'Continuing Subjects',
      description: 'Manage continuing subjects',
      icon: 'fa-book-open',
      path: `/admin/pre-form-one/${year}/continuing-subjects`,
    },
    {
      title: 'Score Entry',
      description: 'Enter and manage scores',
      icon: 'fa-edit',
      path: `/admin/pre-form-one/${year}/score-entry`,
    },
    {
      title: 'Interview Results',
      description: 'View interview results',
      icon: 'fa-clipboard-check',
      path: `/admin/pre-form-one/${year}/interview-results`,
    },
    {
      title: 'Continuing Results',
      description: 'View continuing results',
      icon: 'fa-chart-line',
      path: `/admin/pre-form-one/${year}/continuing-results`,
    },
    {
      title: 'Interview Reports',
      description: 'Generate interview reports',
      icon: 'fa-file-alt',
      path: `/admin/pre-form-one/${year}/interview-reports`,
    },
    {
      title: 'Continuing Reports',
      description: 'Generate continuing reports',
      icon: 'fa-file-invoice',
      path: `/admin/pre-form-one/${year}/continuing-reports`,
    },
    {
      title: 'Promotion',
      description: 'Promote students to Form One',
      icon: 'fa-graduation-cap',
      path: `/admin/pre-form-one/${year}/promotion`,
    },
  ];

  return (
    <AdminLayout>
    <div className="pre-form-one-year-page">
      <div className="pre-form-one-year-header">
        <div className="pre-form-one-year-header-top">
          <Link to="/admin/pre-form-one" className="back-button">
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            Back to Years
          </Link>
        </div>
        <h1 className="pre-form-one-year-lead">
          Select a module to manage Pre-Form One activities for {year}
        </h1>
      </div>

      <div className="navigation-grid">
        {navigationItems.map((item, index) => (
          <Link 
            key={index}
            to={item.path}
            className="navigation-card"
            aria-label={`${item.title}: ${item.description}`}
          >
            <div className="navigation-card-content">
              <div className="navigation-icon">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div className="navigation-info">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <div className="navigation-arrow">
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="back-navigation-bottom">
        <Link to="/admin/pre-form-one" className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Years
        </Link>
      </div>
    </div>
    </AdminLayout>
  );
};

export default PreFormOneYear;
