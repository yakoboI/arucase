/**
 * Pre-Form One Continuing Reports Page
 * Generate and manage continuing reports
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import './PreFormOneResults.css';

const PreFormOneContinuingReports = () => {
  const { year } = useParams();
  const { isAuthenticated } = useAuth();
  const [isGenerating, setIsGenerating] = useState({});
  const queryClient = useQueryClient();

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      return logoPath;
    }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const handleLogoError = (e) => {
    e.target.style.display = 'none';
  };

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['preform-one-students', year],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getStudents(year);
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load students');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch continuing results
  const { data: continuingResults = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ['preform-one-continuing-results', year],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getContinuingResults(year);
        return res.data?.results || {};
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load continuing results');
        }
        return {};
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Generate individual student PDF report
  const generateStudentPDF = async (student) => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsGenerating(prev => ({ ...prev, [student.id]: true }));
    try {
      const response = await preFormOneService.downloadContinuingResultsPDF(year);
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PreFormOne_Continuing_Report_${student.admission_number}_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${student.first_name} ${student.surname}'s report downloaded successfully!`);
    } catch (error) {
      toast.error(`Failed to generate report for ${student.first_name} ${student.surname}`);
    } finally {
      setIsGenerating(prev => ({ ...prev, [student.id]: false }));
    }
  };


  // Sort students by name
  const sortedStudents = [...students].sort((a, b) => {
    if (a.first_name !== b.first_name) return a.first_name.localeCompare(b.first_name);
    if ((a.middle_name || '') !== (b.middle_name || '')) return (a.middle_name || '').localeCompare(b.middle_name || '');
    return a.surname.localeCompare(b.surname);
  });

  return (
    <div className="preform-one-results-page-container">
      <div className="excel-card preform-one-results">
        <div className="excel-card-header">
          <i className="fas fa-file-invoice"></i> PRE-FORM ONE CONTINUING REPORTS
          <div className="header-actions">
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn secondary small">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
        <div className="excel-card-body">
          {studentsLoading || resultsLoading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <h3>Loading...</h3>
              <p>Please wait while we load the student data.</p>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users empty-icon"></i>
              <h3>No Pre-Form One Students Found</h3>
              <p>No students have been registered for Pre-Form One {year} yet.</p>
            </div>
          ) : (
            <>
              <div className="results-info">
                <div className="info-item"><strong>Total Students:</strong> {students.length}</div>
                <div className="info-item"><strong>Year:</strong> {year}</div>
                <div className="info-item"><strong>Reports Available:</strong> {Object.keys(continuingResults).length}</div>
              </div>
              <div className="print-spacer-bottom"></div>
              
              {/* Students List with PDF Generation Buttons */}
              <div className="students-reports-container">
                <h3 className="section-title">
                  <i className="fas fa-users"></i> Student Reports - {year}
                </h3>
                <div className="students-list">
                  {sortedStudents.map((student, index) => {
                    const result = continuingResults[student.admission_number];
                    const hasReport = result && result.total_marks !== null && result.total_marks !== undefined;
                    
                    return (
                      <div key={student.id} className="student-report-card">
                        <div className="student-info">
                          <div className="student-details">
                            <span className="student-number">{index + 1}</span>
                            <div className="student-name">
                              <strong>{student.first_name} {student.middle_name || ''} {student.surname}</strong>
                            </div>
                            <div className="student-meta">
                              <span className="adm-number">Adm: {student.admission_number}</span>
                              {student.parish && <span className="parish">Parish: {student.parish}</span>}
                            </div>
                          </div>
                          <div className="student-status">
                            {hasReport ? (
                              <div className="report-status available">
                                <i className="fas fa-check-circle"></i>
                                <span>Report Available</span>
                                <div className="report-summary">
                                  Grade: {result.grade || '-'} | Average: {result.average || '-'}
                                </div>
                              </div>
                            ) : (
                              <div className="report-status unavailable">
                                <i className="fas fa-exclamation-circle"></i>
                                <span>No Report</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="student-actions">
                          <button
                            type="button"
                            onClick={() => generateStudentPDF(student)}
                            className="excel-btn primary small"
                            disabled={isGenerating[student.id] || !hasReport}
                            title={hasReport ? `Generate PDF report for ${student.first_name} ${student.surname}` : 'No report data available'}
                          >
                            <i className="fas fa-file-pdf"></i>
                            {isGenerating[student.id] ? 'Generating...' : 'Generate PDF'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="print-spacer-bottom"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreFormOneContinuingReports;
