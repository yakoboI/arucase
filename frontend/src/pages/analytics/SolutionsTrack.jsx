/**
 * Solutions Track - Data-driven Recommendations
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { 
  normalizeFormLabel
} from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const SolutionsTrack = () => {
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

  // Get solutions/recommendations
  const { data: solutionsData, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['solutions', formLabel, selectedStream, selectedYear],
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
      const res = await analyticsAPI.getSolutions(params);
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

  const recommendations = solutionsData?.recommendations || {
    subjectSpecific: [],
    classLevel: [],
    studentLevel: [],
    teachingStrategies: [],
    resourceAllocation: []
  };

  const categoryConfigs = [
    {
      key: 'subjectSpecific',
      title: 'Subject-specific Recommendations',
      icon: 'fa-book',
      description: 'Targeted suggestions for improving performance in specific subjects',
      recommendations: recommendations.subjectSpecific || []
    },
    {
      key: 'classLevel',
      title: 'Class-level Recommendations',
      icon: 'fa-users',
      description: 'Strategies for improving overall class performance',
      recommendations: recommendations.classLevel || []
    },
    {
      key: 'studentLevel',
      title: 'Individual Student Recommendations',
      icon: 'fa-user-graduate',
      description: 'Personalized recommendations for specific students',
      recommendations: recommendations.studentLevel || []
    },
    {
      key: 'teachingStrategies',
      title: 'Teaching Strategy Suggestions',
      icon: 'fa-chalkboard-teacher',
      description: 'Recommendations for teaching methods and approaches',
      recommendations: recommendations.teachingStrategies || []
    },
    {
      key: 'resourceAllocation',
      title: 'Resource Allocation Suggestions',
      icon: 'fa-tasks',
      description: 'Guidance on allocating resources effectively',
      recommendations: recommendations.resourceAllocation || []
    }
  ];

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  const renderRecommendationCard = (recommendation, index) => {
    return (
      <div key={index} className="recommendation-card">
        <div className="recommendation-card-header">
          <div className="recommendation-title-section">
            <h4>{recommendation.title}</h4>
            <span className={`priority-badge ${getPriorityBadgeClass(recommendation.priority)}`}>
              {recommendation.priority.toUpperCase()} PRIORITY
            </span>
          </div>
        </div>
        <div className="recommendation-card-body">
          <p className="recommendation-description">{recommendation.description}</p>
          
          {recommendation.details && Object.keys(recommendation.details).length > 0 && (
            <div className="recommendation-details">
              <h5>Details:</h5>
              <ul>
                {Object.entries(recommendation.details).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>{' '}
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {recommendation.actions && recommendation.actions.length > 0 && (
            <div className="recommendation-actions">
              <h5>Recommended Actions:</h5>
              <ul>
                {recommendation.actions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCategorySection = (config) => {
    const isExpanded = expandedCategory === config.key;
    const recommendationCount = config.recommendations.length;

    return (
      <div key={config.key} className="category-section">
        <div 
          className="category-header"
          onClick={() => setExpandedCategory(isExpanded ? null : config.key)}
          style={{ cursor: 'pointer' }}
        >
          <div className="category-header-left">
            <i className={`fas ${config.icon} category-icon`}></i>
            <div className="category-content">
              <h3>{config.title}</h3>
              <p className="text-muted">{config.description}</p>
            </div>
          </div>
          <div className="category-header-right">
            <span className="student-count-badge">{recommendationCount} {recommendationCount === 1 ? 'Recommendation' : 'Recommendations'}</span>
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
          </div>
        </div>

        {isExpanded && (
          <div className="category-students">
            {recommendationCount === 0 ? (
              <div className="empty-state">
                <i className="fas fa-info-circle empty-icon"></i>
                <p>No recommendations in this category</p>
                <p className="text-muted">Performance is satisfactory in this area.</p>
              </div>
            ) : (
              <div className="recommendations-grid">
                {config.recommendations.map((recommendation, index) => 
                  renderRecommendationCard(recommendation, index)
                )}
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
            <i className="fas fa-lightbulb"></i>
            Solutions - {formLabel}
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
                  min={new Date().getFullYear() - 10}
                  max={new Date().getFullYear() + 5}
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Analyzing performance data and generating recommendations...</p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="error-state">
                <i className="fas fa-exclamation-circle error-icon"></i>
                <p>Error loading recommendations: {error?.message || 'Unknown error'}</p>
                <button onClick={() => refetch()} className="excel-btn secondary small">
                  <i className="fas fa-redo"></i> Retry
                </button>
              </div>
            )}

            {/* Data Display */}
            {!isLoading && !isError && solutionsData && (
              <>
                <div className="summary-section">
                  <h3>Recommendations Summary</h3>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <span className="summary-label">Total Recommendations:</span>
                      <span className="summary-value">{solutionsData.summary?.totalRecommendations || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">High Priority:</span>
                      <span className="summary-value priority-high-value">{solutionsData.summary?.highPriority || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Subject-specific:</span>
                      <span className="summary-value">{recommendations.subjectSpecific?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Class-level:</span>
                      <span className="summary-value">{recommendations.classLevel?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Student-level:</span>
                      <span className="summary-value">{recommendations.studentLevel?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Teaching Strategies:</span>
                      <span className="summary-value">{recommendations.teachingStrategies?.length || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-label">Resource Allocation:</span>
                      <span className="summary-value">{recommendations.resourceAllocation?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="solutions-section">
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

export default SolutionsTrack;
