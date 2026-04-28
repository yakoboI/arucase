/**
 * Student Dashboard - View Monthly Results
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import PublicLayout from '../../components/layout/PublicLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { publicAPI } from '../../services/public';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [viewMode, setViewMode] = useState('select'); // 'select' or 'results'
  const [reportTerm, setReportTerm] = useState('Term I');

  useEffect(() => {
    // Get student data from sessionStorage
    const stored = sessionStorage.getItem('studentData');
    if (!stored) {
      toast.error('Please login first');
      navigate('/student-login');
      return;
    }
    const data = JSON.parse(stored);
    setStudentData(data);
    setSelectedYear(data.year);
  }, [navigate]);

  // Get available months and terms
  const { data: monthsData, isLoading: monthsLoading } = useQuery({
    queryKey: ['student-months', studentData?.adm_no, selectedYear],
    queryFn: async () => {
      const res = await publicAPI.getStudentMonths(studentData.adm_no, selectedYear);
      return {
        months: res.data.months || [],
        terms: res.data.terms || [],
        years: res.data.years || []
      };
    },
    enabled: !!studentData && selectedYear != null,
  });

  const { data: reportScoresData, isLoading: reportScoresLoading } = useQuery({
    queryKey: ['student-report-scores', studentData?.adm_no, selectedYear, reportTerm],
    queryFn: async () => {
      const res = await publicAPI.getStudentReportScores(studentData.adm_no, selectedYear, reportTerm);
      return res.data;
    },
    enabled: !!studentData && selectedYear != null && !!reportTerm,
  });

  // Get results for selected month
  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['student-results', studentData?.adm_no, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await publicAPI.getStudentResults(studentData.adm_no, selectedMonth, selectedYear);
      return res.data;
    },
    enabled: !!studentData && !!selectedMonth && selectedYear != null,
  });

  // Get student photo
  const { data: photoData } = useQuery({
    queryKey: ['student-photo', studentData?.adm_no, studentData?.level, studentData?.stream, studentData?.year],
    queryFn: async () => {
      const res = await publicAPI.getStudentPhoto(
        studentData.adm_no,
        studentData.level,
        studentData.stream,
        studentData.year
      );
      return res.data;
    },
    enabled: !!studentData && !!studentData.level && !!studentData.stream && !!studentData.year,
  });

  // Helper function to get photo URL
  const getPhotoUrl = (filename) => {
    if (!filename) return null;
    // In development, use relative URL (Vite proxy handles it)
    if (import.meta.env.DEV) {
      return `/static/uploads/photos/${filename}`;
    }
    // Production: use VITE_API_URL if available
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      const baseUrl = apiUrl.replace('/api', '');
      return `${baseUrl}/static/uploads/photos/${filename}`;
    }
    return `/static/uploads/photos/${filename}`;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('studentData');
    navigate('/student-login');
  };

  const handleViewResults = (month) => {
    setSelectedMonth(month);
    setViewMode('results');
  };

  const handleBackToMonths = () => {
    setViewMode('select');
    setSelectedMonth(null);
  };

  if (!studentData) {
    return (
      <PublicLayout>
        <div className="student-dashboard">
          <div className="dashboard-container">
            <SkeletonLoader type="card" height="80px" className="mb-3" />
            <SkeletonLoader type="text" lines={2} className="mb-3" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonLoader key={i} type="card" height="100px" />
              ))}
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="student-dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div className="student-info">
              <div className="student-avatar">
                {photoData?.photo?.photo_filename && (
                  <img 
                    src={getPhotoUrl(photoData.photo.photo_filename)} 
                    alt={studentData.name}
                    className="student-photo"
                    width={64}
                    height={64}
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.target.style.display = 'none';
                      const icon = e.target.parentElement.querySelector('.avatar-icon');
                      if (icon) icon.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      // Hide icon when photo loads successfully
                      e.target.style.display = 'block';
                      const icon = e.target.parentElement.querySelector('.avatar-icon');
                      if (icon) icon.style.display = 'none';
                    }}
                  />
                )}
                <i className="fas fa-user-circle avatar-icon" style={{ display: photoData?.photo?.photo_filename ? 'none' : 'flex' }}></i>
              </div>
              <div className="student-details">
                <h2>Welcome, {studentData.name}</h2>
                <div className="student-meta">
                  <span><i className="fas fa-graduation-cap"></i> {studentData.level}</span>
                  <span><i className="fas fa-layer-group"></i> Stream {studentData.stream}</span>
                  <span><i className="fas fa-calendar"></i> Year {selectedYear ?? studentData.year}</span>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-button">
              <i className="fas fa-power-off"></i> Logout
            </button>
          </div>

          {viewMode === 'select' ? (
            <div className="months-selection">
              <div className="report-year-bar">
                <label htmlFor="student-dashboard-year" className="report-year-label">
                  Academic year
                </label>
                <select
                  id="student-dashboard-year"
                  className="report-year-select"
                  value={selectedYear ?? ''}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  disabled={!monthsData?.years?.length && !studentData?.year}
                >
                  {(monthsData?.years?.length
                    ? monthsData.years
                    : studentData?.year != null
                      ? [studentData.year]
                      : []
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="section-header">
                <div className="section-title-group centered">
                  <div className="section-icon-wrapper">
                    <i className="fas fa-file-contract"></i>
                  </div>
                  <div>
                    <h3>Term report scores</h3>
                    <p className="section-description">
                      Monthly marks and weights used on your official term report ({reportTerm})
                    </p>
                  </div>
                </div>
              </div>

              <div className="report-term-toggle" role="group" aria-label="Select term">
                {['Term I', 'Term II'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`report-term-btn${reportTerm === t ? ' active' : ''}`}
                    onClick={() => setReportTerm(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {reportScoresLoading ? (
                <div className="results-skeleton mb-4">
                  <SkeletonLoader type="text" lines={2} className="mb-3" />
                  <SkeletonLoader type="table" />
                </div>
              ) : reportScoresData?.subjects && reportScoresData.subjects.length > 0 ? (
                <>
                  <div className="summary-card report-summary-card">
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-percent"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Term average</span>
                        <span className="summary-value">
                          {reportScoresData.summary?.average != null
                            ? Number(reportScoresData.summary.average).toFixed(1)
                            : '—'}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-award"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall grade</span>
                        <span className="summary-value">
                          {reportScoresData.summary?.overall_grade ? (
                            <span className={`grade-badge grade-${reportScoresData.summary.overall_grade}`}>
                              {reportScoresData.summary.overall_grade}
                            </span>
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-trophy"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Class position</span>
                        <span className="summary-value">
                          {reportScoresData.summary?.position != null
                            ? `${reportScoresData.summary.position}${
                                reportScoresData.summary.position === 1
                                  ? 'st'
                                  : reportScoresData.summary.position === 2
                                    ? 'nd'
                                    : reportScoresData.summary.position === 3
                                      ? 'rd'
                                      : 'th'
                              }${reportScoresData.summary?.total_students ? ` / ${reportScoresData.summary.total_students}` : ''}`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="table-scroll-hint">
                    <i className="fas fa-arrows-left-right" aria-hidden="true" />
                    Swipe sideways to see all columns
                  </p>
                  <div
                    className="results-table-container report-scores-table-wrap"
                    role="region"
                    aria-label="Term report scores table"
                    tabIndex={0}
                  >
                    <table className="results-table report-scores-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          {(reportScoresData.months || []).map((m) => (
                            <th key={m} title={`Weight ${reportScoresData.marks_config?.month_weights?.[m] ?? 0}%`}>
                              {m.slice(0, 3)}
                              <span className="th-weight">
                                {' '}
                                ({reportScoresData.marks_config?.month_weights?.[m] ?? 0}%)
                              </span>
                            </th>
                          ))}
                          <th>Weighted total</th>
                          <th>Grade</th>
                          <th>Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportScoresData.subjects.map((row) => (
                          <tr key={row.subject_code}>
                            <td>
                              <span className="subject-name">{row.subject_name}</span>
                              <span className="subject-code">{row.subject_code}</span>
                            </td>
                            {(reportScoresData.months || []).map((m) => (
                              <td key={m}>
                                {row.month_scores?.[m] != null
                                  ? Number(row.month_scores[m]).toFixed(1)
                                  : '—'}
                              </td>
                            ))}
                            <td>
                              <strong>{Number(row.weighted_total || 0).toFixed(1)}</strong>
                            </td>
                            <td>
                              <span className={`grade-badge grade-${row.grade}`}>{row.grade}</span>
                            </td>
                            <td>{row.rank ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : !reportScoresLoading ? (
                <div className="empty-state empty-state-compact">
                  <i className="fas fa-info-circle"></i>
                  <p>No subjects found for this year. Check the academic year above or contact the school.</p>
                </div>
              ) : null}

              <div className="section-header section-header-spaced">
                <div className="section-title-group centered">
                  <div className="section-icon-wrapper">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <div>
                    <h3>View Monthly Results</h3>
                    <p className="section-description">
                      Select a month to view your results and recommendations
                    </p>
                  </div>
                </div>
              </div>

              {monthsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonLoader key={i} type="card" height="100px" />
                  ))}
                </div>
              ) : !monthsData || ((!monthsData.months || monthsData.months.length === 0) && (!monthsData.terms || monthsData.terms.length === 0)) ? (
                <div className="empty-state">
                  <i className="fas fa-calendar-times"></i>
                  <h4>No Results Available</h4>
                  <p>No monthly results or assessments found for your account. Please contact the school administration.</p>
                </div>
              ) : (
                <>
                  {/* Monthly Results */}
                  {monthsData.months && monthsData.months.length > 0 && (
                    <div className="section-group">
                      <div className="section-subtitle">
                        <i className="fas fa-file-chart-line"></i>
                        <span>Monthly Academic Results</span>
                      </div>
                      <div className="months-grid">
                        {monthsData.months.map((monthData, index) => (
                          <div 
                            key={`month-${index}`} 
                            className="month-card"
                            onClick={() => handleViewResults(monthData.month)}
                          >
                            <div className="month-icon">
                              <i className="fas fa-calendar-check"></i>
                            </div>
                            <div className="month-info">
                              <h4>{monthData.month}</h4>
                              <p><i className="fas fa-calendar-days"></i> Year {monthData.year}</p>
                            </div>
                            <div className="month-action">
                              <i className="fas fa-arrow-right"></i>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          ) : (
            <div className="results-view">
              <button onClick={handleBackToMonths} className="back-button">
                <i className="fas fa-arrow-left"></i> Back to Months
              </button>

              <div className="results-header">
                <div className="results-title-group centered">
                  <div className="results-icon-wrapper">
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div>
                    <h3>Results for {selectedMonth} {selectedYear ?? studentData.year}</h3>
                    <p className="results-subtitle">Your academic performance overview</p>
                  </div>
                </div>
              </div>

              {resultsLoading ? (
                <div className="results-skeleton">
                  <SkeletonLoader type="text" lines={2} className="mb-3" />
                  <SkeletonLoader type="table" />
                </div>
              ) : resultsData ? (
                <>
                  {/* Summary Card */}
                  <div className="summary-card">
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-star"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Total</span>
                        <span className="summary-value">{resultsData.summary?.totalScore?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-percent"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Average</span>
                        <span className="summary-value">{resultsData.summary?.average?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-award"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Grade</span>
                        <span className="summary-value">
                          {resultsData.summary?.grade ? (
                            <span className={`grade-badge grade-${resultsData.summary.grade}`}>
                              {resultsData.summary.grade}
                            </span>
                          ) : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-trophy"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Position</span>
                        <span className="summary-value">
                          {resultsData.summary?.position ? (
                            <>
                              {resultsData.summary.position}
                              {resultsData.summary.position === 1 ? 'st' : 
                               resultsData.summary.position === 2 ? 'nd' : 
                               resultsData.summary.position === 3 ? 'rd' : 'th'}
                              {resultsData.summary?.totalStudents && ` / ${resultsData.summary.totalStudents}`}
                            </>
                          ) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  {resultsData.results && resultsData.results.length > 0 ? (
                    <>
                      <p className="table-scroll-hint">
                        <i className="fas fa-arrows-left-right" aria-hidden="true" />
                        Swipe sideways to see all columns
                      </p>
                      <div
                        className="results-table-container"
                        role="region"
                        aria-label="Monthly results by subject"
                        tabIndex={0}
                      >
                        <table className="results-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Total</th>
                              <th>Grade</th>
                              <th>Rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultsData.results.map((result, index) => (
                              <tr key={index}>
                                <td>{result.subject_code}</td>
                                <td>{parseFloat(result.total || 0).toFixed(1)}</td>
                                <td>
                                  <span className={`grade-badge grade-${result.grade}`}>
                                    {result.grade}
                                  </span>
                                </td>
                                <td>{result.rank || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                    </>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-info-circle"></i>
                      <p>No results found for this month</p>
                    </div>
                  )}

                </>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>Unable to load results. Please try again later.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default StudentDashboard;

