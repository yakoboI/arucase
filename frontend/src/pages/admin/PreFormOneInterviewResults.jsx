/**
 * Pre-Form One Interview Results Page
 * Displays and manages Pre-Form One interview results with individual student report generation
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import { preFormOneInterviewSubjectsService } from '../../services/preFormOneInterviewSubjectsService';
import preFormOneStudentsService from '../../services/preFormOneStudentsService';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import YearMonthFilter from '../../components/common/YearMonthFilter';
import './PreFormOneResults.css';

const PreFormOneInterviewResults = () => {
  const { year } = useParams();
  const { isAuthenticated } = useAuth();
  const [isGenerating, setIsGenerating] = useState({});
  const [filter, setFilter] = useState({
    year: year || '',
    month: 'all'
  });

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
        const res = await preFormOneStudentsService.getPreFormOneStudents();
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

  // Fetch interview subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['preform-one-interview-subjects', year],
    queryFn: async () => {
      try {
        const res = await preFormOneInterviewSubjectsService.getSubjects();
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load subjects');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch interview results
  const { data: results = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ['preform-one-interview-results', year],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getInterviewResults(year);
        return res.data || {};
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load interview results');
        }
        return {};
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch scores for each subject
  const fetchScoresForSubject = async (subject, students) => {
    try {
      const scoresResponse = await preFormOneStudentsService.getStudentScoresBySubject(subject.id, 'interview');
      
      if (scoresResponse?.data && Array.isArray(scoresResponse.data)) {
        const scores = {};
        scoresResponse.data.forEach(scoreData => {
          const student = students.find(s => s.id === scoreData.student_id);
          if (student) {
            if (!scores[student.admission_number]) scores[student.admission_number] = {};
            scores[student.admission_number][subject.subject_code] = scoreData.score;
          }
        });
        return scores;
      }
    } catch (error) {
      // Error fetching scores for subject
    }
    return {};
  };

  const [subjectScores, setSubjectScores] = useState({});

  // Load all subject scores
  useEffect(() => {
    const loadAllScores = async () => {
      if (students.length > 0 && subjects.length > 0) {
        const allScores = {};
        for (const subject of subjects) {
          const scores = await fetchScoresForSubject(subject, students);
          Object.assign(allScores, scores);
        }
        setSubjectScores(allScores);
      }
    };

    if (students.length > 0 && subjects.length > 0) {
      loadAllScores().catch(() => {});
    }
  }, [filter.year, students.length, subjects.length]);

  // Format score display
  const formatSubjectScore = (score) => {
    if (score === null || score === undefined) return '-';
    if (typeof score === 'number') return score;
    return score;
  };

  // Sort students by name
  const sortedStudents = [...students].sort((a, b) => {
    if (a.first_name !== b.first_name) return a.first_name.localeCompare(b.first_name);
    if ((a.middle_name || '') !== (b.middle_name || '')) return (a.middle_name || '').localeCompare(b.middle_name || '');
    return a.surname.localeCompare(b.surname);
  });

  const generateStudentPDF = async (student) => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsGenerating(prev => ({ ...prev, [student.id]: true }));
    try {
      const response = await preFormOneService.downloadInterviewResultsPDF(filter.year);
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PreFormOne_Interview_Report_${student.admission_number}_${filter.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${student.first_name} ${student.surname}'s interview report downloaded successfully!`);
    } catch (error) {
      toast.error(`Failed to generate interview report for ${student.first_name} ${student.surname}`);
    } finally {
      setIsGenerating(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  return (
    <div className="preform-one-results-page-container">
      <div className="excel-card preform-one-results">
        <div className="excel-card-header">
          <i className="fas fa-chart-line"></i> PRE-FORM ONE INTERVIEW RESULTS
          <div className="header-actions">
            <Link to={`/admin/pre-form-one/${filter.year || year}`} className="excel-btn secondary small">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
        <YearMonthFilter
          onFilterChange={handleFilterChange}
          initialYear={filter.year || year}
          initialMonth={filter.month}
          usePreFormOneMonths={true}
          disabled={studentsLoading || subjectsLoading}
        />
        <div className="excel-card-body">
          {studentsLoading || subjectsLoading || resultsLoading ? (
            <div className="loading-state">Loading...</div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users empty-icon"></i>
              <h3>No Pre-Form One Students Found</h3>
              <p>No students have been registered for Pre-Form One {year} yet.</p>
            </div>
          ) : (
            <>
              <div className="results-info">
                <div className="info-item"><strong>Students:</strong> {students.length}</div>
                <div className="info-item"><strong>Year:</strong> {filter.year}</div>
                <div className="info-item"><strong>Month:</strong> {filter.month === 'all' ? 'All Months' : filter.month}</div>
                <div className="info-item"><strong>Subjects:</strong> {subjects.length}</div>
              </div>
              <div className="print-spacer-bottom"></div>
            </>
          )}
        </div>
      </div>

      {!studentsLoading && !subjectsLoading && !resultsLoading && students.length > 0 && (
        <>
          {/* Student Selection - Each Student on Separate Line with PDF Button */}
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-users"></i> Select Student
            </div>
            <div className="excel-card-body">
              <p className="instruction-text">Click on a student to generate their interview report</p>
              
              <div className="students-list">
                {sortedStudents.map((student, index) => {
                  const result = results[student.admission_number] || {};
                  const hasResults = result && result.total_marks !== null && result.total_marks !== undefined;
                  
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
                          {hasResults ? (
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
                          disabled={isGenerating[student.id] || !hasResults}
                          title={hasResults ? `Generate PDF report for ${student.first_name} ${student.surname}` : 'No report data available'}
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
          </div>

          <div className="print-spacer-bottom"></div>

          <div className="back-margin">
            <Link to={`/admin/pre-form-one/${filter.year || year}`} className="excel-btn">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default PreFormOneInterviewResults;
