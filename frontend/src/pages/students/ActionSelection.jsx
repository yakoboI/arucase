/**
 * Action Selection Page for Form I-IV
 * Shows options: New Student and Registered Students
 */
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import './ActionSelection.css';

const ActionSelection = ({ formLevel }) => {
  const { year, stream } = useParams();
  const navigate = useNavigate();
  
  // For Form I-IV, stream is always 'NA' in the URL but we use the actual stream from params
  const actualStream = stream || 'NA';
  const normalizedStream = String(actualStream).toUpperCase();
  
  const formMap = {
    'FORM I': 'form-i',
    'FORM II': 'form-ii',
    'FORM III': 'form-iii',
    'FORM IV': 'form-iv',
  };
  
  const formPath = formMap[formLevel];
  const backPath = `/admin/students/registration/${formPath}/year/${year}/streams`;

  useEffect(() => {
    // If someone manually opens /stream/ALL/actions for Form II-IV, redirect back.
    const isFormIIToIV = ['FORM II', 'FORM III', 'FORM IV'].includes(formLevel);
    const allowedStreams = ['A', 'B'];
    if (isFormIIToIV && (normalizedStream === 'ALL' || !allowedStreams.includes(normalizedStream))) {
      navigate(backPath, { replace: true });
    }
  }, [formLevel, normalizedStream, year, backPath, navigate]);
  
  const getBackPath = () => {
    return backPath;
  };
  
  const getNewStudentPath = () => {
    return `/admin/students/registration/${formPath}/year/${year}/stream/${actualStream}`;
  };

  
  const getRegisteredStudentsPath = () => {
    // For Form I-IV, we can use the StudentList component with filters
    return `/students/list?level=${encodeURIComponent(formLevel)}&stream=${encodeURIComponent(actualStream)}&year=${year}`;
  };

  return (
    <AdminLayout>
      <div className="action-selection-page-container">
        <div className="action-selection-card">
          <div className="action-selection-card-header">
            <i className="fas fa-tasks"></i>
            <span>
              {formLevel} {actualStream} {year} - Select Action
            </span>
          </div>
          <div className="action-selection-card-body">
            <div className="action-selection-grid">
              <Link
                to={getNewStudentPath()}
                className="action-selection-card-item new-student"
                aria-label="Register New Student"
              >
                <div className="action-selection-icon">
                  <i className="fas fa-user-plus"></i>
                </div>
                <div className="action-selection-title">New Student</div>
                <div className="action-selection-description">
                  Register a new student for this class
                </div>
              </Link>
              
              <Link
                to={getRegisteredStudentsPath()}
                className="action-selection-card-item registered-students"
                aria-label="View Registered Students"
              >
                <div className="action-selection-icon">
                  <i className="fas fa-list"></i>
                </div>
                <div className="action-selection-title">
                  Registered Students
                </div>
                <div className="action-selection-description">
                  View and manage registered students
                </div>
              </Link>
            </div>
            <Link to={getBackPath()} className="action-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActionSelection;

