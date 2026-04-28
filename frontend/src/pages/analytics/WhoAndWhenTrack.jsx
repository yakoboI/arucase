/**
 * Who and When Track - Performance Category Identification
 */
import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Line } from 'react-chartjs-2';
import '../../utils/chartConfig';
import { 
  normalizeFormLabel, 
  sortMonthlyData,
  getCommonChartOptions
} from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const WhoAndWhenTrack = () => {
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
    if (!formLabel) return standardStreams;
    if (formLabel.includes('FORM V') || formLabel.includes('FORM VI')) {
      return combinationStreams;
    }
    return standardStreams;
  };

  const availableStreams = getAvailableStreams();
  
  // Initialize from URL params or defaults
  const [selectedStream, setSelectedStream] = useState(() => {
    const urlStream = searchParams.get('stream');
    if (urlStream && availableStreams && availableStreams.find(s => s.value === urlStream)) {
      return urlStream;
    }
    return availableStreams && availableStreams.length > 0 ? availableStreams[0].value : 'A';
  });
  
  const [selectedYear, setSelectedYear] = useState(() => {
    const urlYear = searchParams.get('year');
    if (urlYear) {
      const yearNum = parseInt(urlYear);
      if (!isNaN(yearNum) && yearNum > 0) {
        return yearNum;
      }
    }
    return null; // Optional - null means all years
  });
  
  const [expandedCategory, setExpandedCategory] = useState(null);

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
    setSearchParams(newParams, { replace: true });
  }, [selectedStream, selectedYear]);

  // Get who-and-when analytics
  const { data: whoAndWhenData, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['who-and-when', formLabel, selectedStream, selectedYear],
    queryFn: async () => {
      const params = {
        form: formLabel,
        stream: selectedStream,
      };
      if (selectedYear) {
        // Use calendar year directly for Form V/VI (no academic year conversion)
        params.year = selectedYear;
      }
      params.term = 'First Term'; // Default to First Term
      const res = await analyticsAPI.getWhoAndWhen(params);
      if (!res.data) {
        throw new Error('No data received from server');
      }
      return res.data;
    },
    enabled: !!selectedStream,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const categories = whoAndWhenData?.categories || {
    highPerformers: [],
    strugglingStudents: [],
    improvingStudents: [],
    decliningStudents: [],
    inconsistentPerformers: []
  };

  const categoryConfigs = [
    {
      key: 'highPerformers',
      title: 'High Performers',
      icon: 'fa-star',
      iconClass: 'high',
      description: 'Students with consistently high scores (Average ≥ 75)',
      students: categories.highPerformers || []
    },
    {
      key: 'strugglingStudents',
      title: 'Struggling Students',
      icon: 'fa-exclamation-triangle',
      iconClass: 'struggling',
      description: 'Students with consistently low scores (Average < 50)',
      students: categories.strugglingStudents || []
    },
    {
      key: 'improvingStudents',
      title: 'Improving Students',
      icon: 'fa-arrow-up',
      iconClass: 'improving',
      description: 'Students showing upward trend',
      students: categories.improvingStudents || []
    },
    {
      key: 'decliningStudents',
      title: 'Declining Students',
      icon: 'fa-arrow-down',
      iconClass: 'declining',
      description: 'Students showing downward trend',
      students: categories.decliningStudents || []
    },
    {
      key: 'inconsistentPerformers',
      title: 'Inconsistent Performers',
      icon: 'fa-chart-line',
      iconClass: 'inconsistent',
      description: 'Students with variable performance (High variance)',
      students: categories.inconsistentPerformers || []
    }
  ];

  const renderStudentChart = (student) => {
    const sortedMonthly = sortMonthlyData(student.monthlyAverages || []);
    if (sortedMonthly.length === 0) return null;

    const chartData = {
      labels: sortedMonthly.map(m => `${m.month} ${m.year}`),
      datasets: [{
        label: 'Average Score',
        data: sortedMonthly.map(m => m.average),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    };

    const chartOptions = {
      ...getCommonChartOptions(),
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Score'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      },
      plugins: {
        ...getCommonChartOptions().plugins,
        title: {
          display: false
        },
        legend: {
          display: false
        }
      }
    };

    return (
      <div className="student-chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>
    );
  };

  const renderCategorySection = (config) => {
    const isExpanded = expandedCategory === config.key;
    const studentCount = config.students.length;

    return (
      <div key={config.key} className="category-section">
        <div 
          className="category-header"
          onClick={() => setExpandedCategory(isExpanded ? null : config.key)}
          style={{ cursor: 'pointer' }}
        >
          <div className="category-header-left">
            <i className={`fas ${config.icon} category-icon ${config.iconClass}`}></i>
            <div className="category-content">
              <h3>{config.title}</h3>
              <p className="text-muted">{config.description}</p>
            </div>
          </div>
          <div className="category-header-right">
            <span className="student-count-badge">{studentCount} {studentCount === 1 ? 'Student' : 'Students'}</span>
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
          </div>
        </div>

        {isExpanded && (
          <div className="category-students">
            {studentCount === 0 ? (
              <div className="empty-state">
                <i className="fas fa-info-circle empty-icon"></i>
                <p>No students found in this category</p>
              </div>
            ) : (
              <div className="students-list">
                {config.students.map((studentData, index) => (
                  <div key={studentData.student.admNo} className="student-card">
                    <div className="student-header">
                      <div className="student-info">
                        <h4>
                          {studentData.student.firstName} {studentData.student.middleName} {studentData.student.surname}
                        </h4>
                        <p className="student-details">
                          <span>Adm No: {studentData.student.admNo}</span>
                          <span>Stream: {studentData.student.stream}</span>
                          <span>Year: {studentData.student.year}</span>
                        </p>
                      </div>
                      <div className="student-stats">
                        <div className="stat-item">
                          <span className="stat-label">Overall Average:</span>
                          <span className="stat-value">{studentData.overallAverage.toFixed(1)}%</span>
                        </div>
                        {studentData.standardDeviation && (
                          <div className="stat-item">
                            <span className="stat-label">Std Deviation:</span>
                            <span className="stat-value">{studentData.standardDeviation.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="stat-item">
                          <span className="stat-label">Data Points:</span>
                          <span className="stat-value">{studentData.monthlyAverages.length}</span>
                        </div>
                      </div>
                    </div>
                    {renderStudentChart(studentData)}
                    <div className="student-timeline">
                      <h5>Performance Timeline:</h5>
                      <div className="timeline-items">
                        {sortMonthlyData(studentData.monthlyAverages).map((month, idx) => (
                          <div key={idx} className="timeline-item">
                            <span className="timeline-month">{month.month} {month.year}</span>
                            <span className="timeline-score">{month.average.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="analytics-track-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-search"></i>
            Who and When - {formLabel}
            <div className="header-actions">
              <Link to={`/admin/analytics/${encodeURIComponent(form)}`} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {/* Filters */}
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
                <label>Year (Optional - leave empty for all years):</label>
                <input
                  type="number"
                  value={selectedYear || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedYear(value ? parseInt(value) : null);
                  }}
                  className="filter-input"
                  placeholder="All years"
                  min="2020"
                  max={new Date().getFullYear() + 5}
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading performance categories...</p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="error-state">
                <i className="fas fa-exclamation-circle error-icon"></i>
                <p>Error loading data: {error?.message || 'Unknown error'}</p>
                <button onClick={() => refetch()} className="excel-btn secondary small">
                  <i className="fas fa-redo"></i> Retry
                </button>
              </div>
            )}

            {/* Data Display */}
            {!isLoading && !isError && whoAndWhenData && (
              <>
                <div className="summary-section">
                  <h3>Summary</h3>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <span className="summary-label">Total Students:</span>
                      <span className="summary-value">{whoAndWhenData.totalStudents || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">High Performers:</span>
                      <span className="summary-value">{categories.highPerformers?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Struggling:</span>
                      <span className="summary-value">{categories.strugglingStudents?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Improving:</span>
                      <span className="summary-value">{categories.improvingStudents?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Declining:</span>
                      <span className="summary-value">{categories.decliningStudents?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Inconsistent:</span>
                      <span className="summary-value">{categories.inconsistentPerformers?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="performance-categories">
                  {categoryConfigs.map(config => renderCategorySection(config))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default WhoAndWhenTrack;
