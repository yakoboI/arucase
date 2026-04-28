/**
 * Subject Track - Subject-specific Analytics
 */
import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import '../../utils/chartConfig'; // Register Chart.js components
import { 
  normalizeFormLabel, 
  sortMonthlyData,
  getCommonChartOptions,
  calculateTrend,
  calculateStats,
  exportToCSV
} from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const SubjectTrack = () => {
  const { form } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const formLabel = normalizeFormLabel(form);
  
  // Standard streams for FORM I-IV
  const standardStreams = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' }
  ];

  // Combination streams for FORM V-VI
  const combinationStreams = [
    { value: 'PCB', label: 'PCB - Physics, Chemistry, Biology' },
    { value: 'PCM', label: 'PCM - Physics, Chemistry, Mathematics' },
    { value: 'EGM', label: 'EGM - Economics, Geography, Mathematics' },
    { value: 'HGE', label: 'HGE - History, Geography, Economics' },
    { value: 'HGL', label: 'HGL - History, Geography, Literature' }
  ];

  // Get available streams based on form
  const getAvailableStreams = () => {
    if (formLabel.includes('FORM V') || formLabel.includes('FORM VI')) {
      return combinationStreams;
    }
    return standardStreams;
  };

  const availableStreams = getAvailableStreams();
  
  // Initialize from URL params or defaults
  const [selectedSubject, setSelectedSubject] = useState(() => {
    return searchParams.get('subject') || '';
  });
  
  const [selectedStream, setSelectedStream] = useState(() => {
    const urlStream = searchParams.get('stream');
    if (urlStream && availableStreams.find(s => s.value === urlStream)) {
      return urlStream;
    }
    return availableStreams[0]?.value || 'A';
  });
  
  const [selectedYear, setSelectedYear] = useState(() => {
    const urlYear = searchParams.get('year');
    if (urlYear) {
      const yearNum = parseInt(urlYear);
      if (!isNaN(yearNum) && yearNum > 0) {
        return yearNum;
      }
    }
    return new Date().getFullYear();
  });

  // Update URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedStream) {
      newParams.set('stream', selectedStream);
    } else {
      newParams.delete('stream');
    }
    if (selectedYear) {
      newParams.set('year', selectedYear.toString());
    } else {
      newParams.delete('year');
    }
    if (selectedSubject) {
      newParams.set('subject', selectedSubject);
    } else {
      newParams.delete('subject');
    }
    setSearchParams(newParams, { replace: true });
  }, [selectedStream, selectedYear, selectedSubject]);

  // Get subjects for form
  const { data: subjectsData, isLoading: loadingSubjects, error: subjectsError, isError: isSubjectsError, refetch: refetchSubjects } = useQuery({
    queryKey: ['subjects-for-form', formLabel, selectedStream, selectedYear],
    queryFn: async () => {
      const params = {
        stream: selectedStream,
      };
      if (selectedYear) {
        // Use calendar year directly for Form V/VI (no academic year conversion)
        params.year = selectedYear;
      }
      const res = await analyticsAPI.getSubjectsForForm(formLabel, params);
      return res.data.subjects || [];
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Get subject performance
  const { data: subjectPerformance, isLoading: loadingPerformance, error: performanceError, isError: isPerformanceError, refetch: refetchPerformance } = useQuery({
    queryKey: ['subject-performance', formLabel, selectedSubject, selectedStream, selectedYear],
    queryFn: async () => {
      if (!selectedSubject) return null;
      const params = {
        form: formLabel,
        stream: selectedStream,
        subject_code: selectedSubject,
      };
      if (selectedYear) {
        // Use calendar year directly for Form V/VI (no academic year conversion)
        params.year = selectedYear;
      }
      params.term = 'First Term'; // Default to First Term
      const res = await analyticsAPI.getSubjectPerformance(params);
      if (!res.data) {
        throw new Error('No data received from server');
      }
      return res.data;
    },
    enabled: !!selectedSubject,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Calculate insights and sorted data (memoized)
  const sortedMonthly = useMemo(() => {
    return sortMonthlyData(subjectPerformance?.monthly_averages ?? []);
  }, [subjectPerformance]);

  const trend = useMemo(() => {
    return sortedMonthly.length > 0 ? calculateTrend(sortedMonthly) : null;
  }, [sortedMonthly]);

  const stats = useMemo(() => {
    return sortedMonthly.length > 0 ? calculateStats(sortedMonthly) : null;
  }, [sortedMonthly]);

  return (
    <AdminLayout>
      <div className="analytics-track-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-book"></i>
            Subject Track - {formLabel}
            <div className="header-actions">
              <Link to={`/admin/analytics/${form}`} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="filter-section">
              <div className="filter-group">
                <label>Stream:</label>
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="filter-select"
                >
                  {availableStreams.map((stream) => (
                    <option key={stream.value} value={stream.value}>
                      {stream.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Year:</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedYear(value ? parseInt(value) : new Date().getFullYear());
                  }}
                  className="filter-input"
                  min="2020"
                  max={new Date().getFullYear() + 5}
                />
              </div>
              <div className="filter-group">
                <label>Subject:</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Subject</option>
                  {subjectsData?.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingSubjects ? (
              <div className="loading-state">Loading subjects...</div>
            ) : !subjectsData || subjectsData.length === 0 ? (
              <div className="no-data">
                No subjects available for {formLabel}. 
                <br />
                <small>Form: {formLabel}, Stream: {selectedStream}, Year: {selectedYear}</small>
                <br />
                <small>Please check if there is data in the database for this combination.</small>
              </div>
            ) : !selectedSubject ? (
              <div className="no-data">Please select a subject to view analytics</div>
            ) : loadingPerformance ? (
              <div className="loading-state">Loading subject performance data...</div>
            ) : subjectPerformance ? (
              <div className="performance-data">
                {/* Performance Insights */}
                {stats && trend && (
                  <div className="insights-section">
                    <h4>Performance Insights - {selectedSubject}</h4>
                    <div className="insights-grid">
                      <div className="insight-card">
                        <div className="insight-label">Overall Average</div>
                        <div className="insight-value">{stats?.avg.toFixed(1) ?? '0.0'}%</div>
                      </div>
                      <div className="insight-card">
                        <div className="insight-label">Highest Score</div>
                        <div className="insight-value">{stats?.max.toFixed(1) ?? '0.0'}%</div>
                      </div>
                      <div className="insight-card">
                        <div className="insight-label">Lowest Score</div>
                        <div className="insight-value">{stats?.min.toFixed(1) ?? '0.0'}%</div>
                      </div>
                      <div className="insight-card">
                        <div className="insight-label">Trend</div>
                        <div className={`insight-value ${trend?.trend === 'improving' ? 'text-success' : trend?.trend === 'declining' ? 'text-danger' : 'text-muted'}`}>
                          {trend?.message ?? 'Insufficient data'}
                        </div>
                      </div>
                    </div>
                    <div className="insights-actions">
                      <button 
                        className="excel-btn secondary small"
                        onClick={() => exportToCSV(
                          sortedMonthly.map(m => ({
                            'Month/Year': m.monthYear || `${m.month} ${m.year || ''}`,
                            'Average Score': m.average.toFixed(1),
                            'Student Count': m.student_count
                          })),
                          `subject-performance-${selectedSubject}-${formLabel}-${selectedStream}-${selectedYear}.csv`
                        )}
                      >
                        <i className="fas fa-download"></i> Export Data
                      </button>
                    </div>
                  </div>
                )}

                <div className="performance-summary">
                  <div className="summary-card">
                    <h4>Monthly Averages</h4>
                    <div className="monthly-list">
                      {sortedMonthly.map((item) => (
                        <div key={`${item.month}-${item.year || ''}`} className="monthly-item">
                          <span className="month-name">{item.monthYear || `${item.month} ${item.year || ''}`}</span>
                          <span className="month-avg">{item.average.toFixed(1)}</span>
                          <span className="month-count">({item.student_count} students)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="summary-card">
                    <h4>Grade Distribution</h4>
                    <div className="grade-list">
                      {subjectPerformance.grade_distribution?.map((item) => (
                        <div key={item.grade} className="grade-item">
                          <span className="grade-name">Grade {item.grade}</span>
                          <span className="grade-count">{item.count} students</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="charts-section">
                  <h3 className="section-title">Subject Performance Charts</h3>
                  
                  {/* Monthly Averages Line Chart */}
                  {sortedMonthly.length > 0 && (
                    <div className="chart-container">
                      <h4 className="chart-title">Monthly Average Scores - {selectedSubject}</h4>
                      <div className="chart-wrapper">
                        <Line
                          data={{
                            labels: sortedMonthly.map(item => item.monthYear || `${item.month} ${item.year || ''}`),
                            datasets: [
                              {
                                label: 'Average Score',
                                data: sortedMonthly.map(item => item.average),
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                tension: 0.4,
                                fill: true,
                                pointRadius: 6,
                                pointHoverRadius: 8,
                              },
                            ],
                          }}
                          options={getCommonChartOptions({
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Average: ${context.parsed.y.toFixed(1)}% (${sortedMonthly[context.dataIndex].student_count} students)`;
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                title: {
                                  display: true,
                                  text: 'Average Score (%)',
                                },
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Month & Year',
                                },
                              },
                            },
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Grade Distribution Doughnut Chart */}
                  {subjectPerformance.grade_distribution && subjectPerformance.grade_distribution.length > 0 && (
                    <div className="chart-container">
                      <h4 className="chart-title">Grade Distribution - {selectedSubject}</h4>
                      <div className="chart-wrapper">
                        <Doughnut
                        data={{
                          labels: subjectPerformance.grade_distribution.map(item => `Grade ${item.grade}`),
                          datasets: [
                            {
                              label: 'Student Count',
                              data: subjectPerformance.grade_distribution.map(item => item.count),
                              backgroundColor: [
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(54, 162, 235, 0.6)',
                                'rgba(255, 206, 86, 0.6)',
                                'rgba(255, 99, 132, 0.6)',
                                'rgba(153, 102, 255, 0.6)',
                              ],
                              borderColor: [
                                'rgba(75, 192, 192, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(255, 99, 132, 1)',
                                'rgba(153, 102, 255, 1)',
                              ],
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'right',
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const label = context.label || '';
                                  const value = context.parsed || 0;
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return `${label}: ${value} students (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-chart-bar empty-icon"></i>
                <h3>No Performance Data Available</h3>
                <p>No performance data found for <strong>{selectedSubject}</strong> in {formLabel} - Stream {selectedStream} - Year {selectedYear}.</p>
                <p className="text-muted">Data will appear here once scores are entered for this subject.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectTrack;

