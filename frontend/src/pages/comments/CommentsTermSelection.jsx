/**
 * Comments Term Selection Page
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import '../academic/MarksConfigTermSelection.css';

const CommentsTermSelection = ({ formLevel, moduleName, basePath }) => {
  const { year, stream } = useParams();

  const terms = ['First Term', 'Second Term'];

  const getBackPath = () => {
    const normalizedLevel = formLevel
      ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '';

    const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';

    // Use custom basePath if provided (e.g., for student registration)
    if (basePath) {
      if (isFormVOrVI) {
        return `${basePath}/${formLevel}/stream/${stream}/years`;
      } else {
        return `${basePath}/${formLevel}/year/${year}/streams`;
      }
    }

    if (isFormVOrVI) {
      return `/admin/${moduleName}/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/${moduleName}/${formLevel}/year/${year}/streams`;
    }
  };

  const getTermDetailPath = (term) => {
    const encodedTerm = encodeURIComponent(term);
    // Use custom basePath if provided (e.g., for student registration)
    if (basePath) {
      if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
        return `${basePath}/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}`;
      } else {
        return `${basePath}/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}`;
      }
    }

    if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
      return `/admin/${moduleName}/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}`;
    } else {
      return `/admin/${moduleName}/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}`;
    }
  };

  return (
    <AdminLayout>
      <div className="marks-config-term-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-check"></i>
            Select Term
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="term-selection-grid">
              {terms.map((term) => (
                <Link
                  key={term}
                  to={getTermDetailPath(term)}
                  className="term-selection-card-item"
                >
                  <div className="term-selection-name">{term}</div>
                  <div className="term-selection-subtitle">Enter comments</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CommentsTermSelection;

