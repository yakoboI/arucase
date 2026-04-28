/**
 * Marks Config Term Selection Page
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './MarksConfigTermSelection.css';

const MarksConfigTermSelection = ({ formLevel }) => {
  const { year, stream } = useParams();
  
  const terms = ['Term I', 'Term II'];

  const getBackPath = () => {
    const normalizedLevel = formLevel
      ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '';

    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/marks-config/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/marks-config/${formLevel}/year/${year}/streams`;
    }
  };

  const getTermDetailPath = (term) => {
    if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
      return `/admin/marks-config/${formLevel}/stream/${stream}/year/${year}/term/${term}`;
    } else {
      return `/admin/marks-config/${formLevel}/year/${year}/stream/${stream}/term/${term}`;
    }
  };

  return (
    <AdminLayout>
      <div className="marks-config-term-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-alt"></i>
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
                  <div className="term-selection-subtitle">Configure month weights</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarksConfigTermSelection;

