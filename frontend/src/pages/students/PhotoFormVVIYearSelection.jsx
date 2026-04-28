/**
 * Photo Year Selection Page for FORM V-VI (after stream selection)
 * Non-admin users only see years allocated for this class (e.g. FORM V PCM).
 * Uses special academic year logic for Form 5 & 6 streams.
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { getFormVVIYears, getFormVVIVearDisplay } from '../../utils/academicYearUtils';
import './PhotoYearSelection.css';

const PhotoFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const { getAllowedYearsForClass } = useAuth();

  // Use the new academic year logic for Form V/VI
  const availableYears = useMemo(() => getFormVVIYears(), []);

  const className = stream ? `${formLevel} ${stream}` : formLevel;
  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(className);
    if (allowed === null) return availableYears;
    if (allowed.length === 0) return [];
    return availableYears.filter((yearObj) => allowed.includes(yearObj.year));
  }, [availableYears, className, getAllowedYearsForClass]);

  const getBackPath = () => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/students/photos/${formMap[formLevel]}/streams`;
  };

  const getPhotoManagementPath = (year) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/students/photos/${formMap[formLevel]}/stream/${stream}/year/${year}/terms`;
  };

  return (
    <AdminLayout>
      <div className="photo-year-selection-page-container">
        <div className="photo-year-selection-card">
          <div className="photo-year-selection-card-header">
            <i className="fas fa-camera"></i>
            <span>{formLevel} {stream} - Choose Academic Year</span>
          </div>
          <div className="photo-year-selection-card-body">
            {years.length === 0 ? (
              <p className="photo-year-selection-empty">You do not have access to any years for this class. Contact an administrator.</p>
            ) : (
            <div className="photo-year-selection-grid">
              {years.map((yearObj) => (
                <Link
                  key={`${yearObj.year}-${yearObj.isEndYear ? 'end' : 'start'}`}
                  to={getPhotoManagementPath(yearObj.year)}
                  className="photo-year-selection-card-item"
                  aria-label={`${yearObj.displayRange} Student Photos`}
                  title={yearObj.fullDisplay}
                >
                  <div className="photo-year-selection-number">{yearObj.year}</div>
                  <div className="photo-year-selection-label">{yearObj.displayRange}</div>
                </Link>
              ))}
            </div>
            )}
            <Link to={getBackPath()} className="photo-year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PhotoFormVVIYearSelection;

