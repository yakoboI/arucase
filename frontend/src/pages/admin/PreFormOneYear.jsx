import { useParams, Link } from 'react-router-dom';
import './PreFormOneYear.css';

const PreFormOneYear = () => {
  const { year } = useParams();

  const navigationItems = [
    {
      title: 'Pre-Form One Registration',
      description: 'Manage student registrations',
      icon: 'fa-user-plus',
      path: `/admin/pre-form-one/${year}/registration`,
      color: '#3b82f6'
    },
    {
      title: 'Pre-Form One Parishes',
      description: 'Manage student parish information',
      icon: 'fa-place-of-worship',
      path: `/admin/pre-form-one/${year}/parishes`,
      color: '#10b981'
    },
    {
      title: 'Pre-Form One Interview Subjects',
      description: 'Manage interview subjects',
      icon: 'fa-book',
      path: `/admin/pre-form-one/${year}/interview-subjects`,
      color: '#f59e0b'
    },
    {
      title: 'Pre-Form One Continuing Subjects',
      description: 'Manage continuing subjects',
      icon: 'fa-book-open',
      path: `/admin/pre-form-one/${year}/continuing-subjects`,
      color: '#8b5cf6'
    },
    {
      title: 'Pre-Form One Score Entry',
      description: 'Enter and manage scores',
      icon: 'fa-edit',
      path: `/admin/pre-form-one/${year}/score-entry`,
      color: '#ef4444'
    },
    {
      title: 'Pre-Form One Interview Results',
      description: 'View interview results',
      icon: 'fa-clipboard-check',
      path: `/admin/pre-form-one/${year}/interview-results`,
      color: '#06b6d4'
    },
    {
      title: 'Pre-Form One Continuing Results',
      description: 'View continuing results',
      icon: 'fa-chart-line',
      path: `/admin/pre-form-one/${year}/continuing-results`,
      color: '#84cc16'
    },
    {
      title: 'Pre-Form One Interview Reports',
      description: 'Generate interview reports',
      icon: 'fa-file-alt',
      path: `/admin/pre-form-one/${year}/interview-reports`,
      color: '#f97316'
    },
    {
      title: 'Pre-Form One Continuing Reports',
      description: 'Generate continuing reports',
      icon: 'fa-file-invoice',
      path: `/admin/pre-form-one/${year}/continuing-reports`,
      color: '#ec4899'
    }
  ];

  return (
    <div className="pre-form-one-year-page">
      <div className="pre-form-one-year-header">
        <h1>Pre-Form One - {year}</h1>
        <p>Select a module to manage Pre-Form One activities for {year}</p>
      </div>

      <div className="navigation-grid">
        {navigationItems.map((item, index) => (
          <Link 
            key={index}
            to={item.path}
            className="navigation-card"
            style={{ '--card-color': item.color }}
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
  );
};

export default PreFormOneYear;
