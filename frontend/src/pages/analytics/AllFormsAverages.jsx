/**
 * All Forms Averages - Cross-form Performance Comparison
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import '../../utils/chartConfig'; // Register Chart.js components
import { 
  sortMonthlyData,
  getCommonChartOptions,
  exportToCSV
} from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const AllFormsAverages = () => {
  // Get all forms averages
  const { data: formsData, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['all-forms-averages'],
    queryFn: async () => {
      const res = await analyticsAPI.getAllFormsAverages();
      if (!res.data || !res.data.forms) {
        throw new Error('No data received from server');
      }
      return res.data.forms || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
  
  // Process data to match Python version structure (memoized)
  const processedFormsData = useMemo(() => {
    try {
      if (!formsData || formsData.length === 0) return [];
      return formsData.map(form => {
        if (!form || !form.level) return null;
      const monthlyData = (form.averages || []).map(avg => ({
        month: avg.month,
        year: avg.year,
        monthYear: avg.monthYear || `${avg.month} ${avg.year}`,
        average: avg.class_average || avg.average || 0,
        student_count: avg.student_count || 0,
      }));
      
      // If no monthly_data but we have subject_averages, calculate monthly averages from subjects
      let finalMonthlyData = monthlyData;
      if (monthlyData.length === 0 && form.subject_averages && form.subject_averages.length > 0) {
        // Calculate monthly averages from subject_averages
        finalMonthlyData = form.subject_averages
          .filter(monthData => monthData && monthData.subjects && Object.keys(monthData.subjects).length > 0)
          .map(monthData => {
            try {
              const subjects = monthData.subjects || {};
              const subjectValues = Object.values(subjects).filter(s => s && typeof s === 'object');
              
              if (subjectValues.length === 0) return null;
              
              const validAverages = subjectValues
                .map(s => parseFloat(s.average) || 0)
                .filter(a => a > 0);
              
              const avg = validAverages.length > 0
                ? validAverages.reduce((sum, a) => sum + a, 0) / validAverages.length
                : 0;
              
              const studentCounts = subjectValues
                .map(s => parseInt(s.student_count) || 0)
                .filter(c => c > 0);
              
              const studentCount = studentCounts.length > 0
                ? Math.max(...studentCounts)
                : 0;
              
              return {
                month: monthData.month || '',
                year: monthData.year || 0,
                monthYear: monthData.monthYear || `${monthData.month || ''} ${monthData.year || 0}`.trim(),
                average: isNaN(avg) || !isFinite(avg) ? 0 : avg,
                student_count: isNaN(studentCount) || !isFinite(studentCount) ? 0 : studentCount,
              };
            } catch (error) {
              console.error(`Error processing month data for ${form.level}:`, error);
              return null;
            }
          })
          .filter(m => m !== null);
      }
      
      // Calculate overall_average from monthly_data or subject_averages
      let overallAvg = 0;
      try {
        if (finalMonthlyData.length > 0) {
          const validAverages = finalMonthlyData
            .map(m => parseFloat(m.average) || 0)
            .filter(a => a > 0);
          overallAvg = validAverages.length > 0
            ? validAverages.reduce((sum, a) => sum + a, 0) / validAverages.length
            : 0;
        } else if (form.subject_averages && form.subject_averages.length > 0) {
          // Fallback: calculate from subject averages
          const allSubjectAvgs = form.subject_averages
            .flatMap(m => Object.values(m.subjects || {}))
            .filter(s => s && typeof s === 'object')
            .map(s => parseFloat(s.average) || 0)
            .filter(a => a > 0);
          overallAvg = allSubjectAvgs.length > 0
            ? allSubjectAvgs.reduce((sum, a) => sum + a, 0) / allSubjectAvgs.length
            : 0;
        }
        overallAvg = isNaN(overallAvg) || !isFinite(overallAvg) ? 0 : overallAvg;
      } catch (error) {
        console.error(`Error calculating overall average for ${form.level}:`, error);
        overallAvg = 0;
      }
      
      // Calculate overall_student_count - prefer distinct_student_count from backend, otherwise use most recent month or max
      let overallStudentCount = 0;
      try {
        // First, try to use distinct_student_count from backend (most accurate)
        if (form.distinct_student_count && form.distinct_student_count > 0) {
          overallStudentCount = parseInt(form.distinct_student_count) || 0;
        } else if (finalMonthlyData.length > 0) {
          // Sort by year and month to get most recent
          const sortedData = [...finalMonthlyData].sort((a, b) => {
            const monthOrder = { 
              'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5,
              'February': 1, 'March': 2, 'April': 3, 'May': 4,
              'August': 5, 'September': 6, 'October': 7, 'November': 8
            };
            if (a.year !== b.year) return b.year - a.year; // Most recent year first
            return (monthOrder[b.month] || 99) - (monthOrder[a.month] || 99); // Most recent month first
          });
          
          // Use most recent month's student count, or max if that's higher
          const mostRecentCount = sortedData.length > 0 ? parseInt(sortedData[0].student_count) || 0 : 0;
          const allCounts = finalMonthlyData
            .map(m => parseInt(m.student_count) || 0)
            .filter(c => c > 0);
          const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 0;
          
          // Use the higher of most recent or max (to handle cases where student count increases)
          overallStudentCount = Math.max(mostRecentCount, maxCount);
        } else if (form.subject_averages && form.subject_averages.length > 0) {
          // Get distinct student counts from all subjects across all months
          const allStudentCounts = form.subject_averages
            .flatMap(m => Object.values(m.subjects || {}))
            .filter(s => s && typeof s === 'object')
            .map(s => parseInt(s.student_count) || 0)
            .filter(c => c > 0);
          overallStudentCount = allStudentCounts.length > 0 ? Math.max(...allStudentCounts) : 0;
        }
        overallStudentCount = isNaN(overallStudentCount) || !isFinite(overallStudentCount) ? 0 : overallStudentCount;
      } catch (error) {
        console.error(`Error calculating overall student count for ${form.level}:`, error);
        overallStudentCount = 0;
      }
      
      return {
        level: form.level,
        monthly_data: finalMonthlyData,
        subject_averages: form.subject_averages || [],
        overall_average: overallAvg,
        overall_student_count: overallStudentCount,
        overall_score_count: finalMonthlyData.reduce((sum, m) => sum + (m.student_count || 0), 0),
      };
      }).filter(form => form !== null);
    } catch (error) {
      console.error('[AllFormsAverages] Error processing forms data:', error);
      return [];
    }
  }, [formsData]);
  

  return (
    <AdminLayout>
      <div className="analytics-track-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-chart-bar"></i>
            All Forms Averages
            <div className="header-actions">
              <Link to="/admin/analytics" className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading forms averages...</p>
              </div>
            ) : isError ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle error-icon"></i>
                <h3>Error Loading Data</h3>
                <p>{error?.message || 'An error occurred while loading forms averages'}</p>
                <button type="button" onClick={() => refetch()} className="excel-btn">
                  <i className="fas fa-redo"></i> Retry
                </button>
              </div>
            ) : processedFormsData && processedFormsData.length > 0 && processedFormsData.some(f => 
              f && ((f.monthly_data && f.monthly_data.length > 0) || (f.subject_averages && f.subject_averages.length > 0))
            ) ? (
              <div className="forms-comparison">
                {/* Summary Table */}
                <div className="comparison-table">
                  <h3>Overall Summary</h3>
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>Form</th>
                        <th>Overall Average</th>
                        <th>Student Count</th>
                        <th>Total Scores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedFormsData.map((form) => (
                        <tr key={form.level}>
                          <td><strong>{form.level}</strong></td>
                          <td>{(form.overall_average || 0).toFixed(1)}</td>
                          <td>{form.overall_student_count || 0}</td>
                          <td>{form.overall_score_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Monthly Data Tables */}
                <div className="monthly-tables">
                  <h3>Monthly Breakdown by Form</h3>
                  {processedFormsData.map((form) => (
                    <div key={form.level} className="form-monthly-table">
                      <h4>{form.level} - Monthly Averages</h4>
                      <table className="excel-table">
                        <thead>
                          <tr>
                            <th>Month & Year</th>
                            <th>Average Score</th>
                            <th>Student Count</th>
                            <th>Total Scores</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.monthly_data && form.monthly_data.length > 0 ? (
                            form.monthly_data.map((monthData) => (
                              <tr key={`${form.level}-${monthData.monthYear}`}>
                                <td><strong>{monthData.monthYear}</strong></td>
                                <td>{monthData.average.toFixed(1)}</td>
                                <td>{monthData.student_count}</td>
                                <td>{monthData.score_count}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="no-monthly-data">No monthly data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                <div className="charts-section">
                  {/* Monthly Trend Charts - Line Chart for Each Form */}
                  <h3 className="section-title">Monthly Average Trends by Form</h3>
                  {processedFormsData.map((form) => {
                    if (!form.monthly_data || form.monthly_data.length === 0) return null;
                    
                    const sortedMonthly = sortMonthlyData(form.monthly_data);
                    
                    return (
                      <div key={`trend-${form.level}`} className="chart-container chart-section-container">
                        <h4 className="chart-title">{form.level} - Monthly Average Trend</h4>
                        <div className="chart-wrapper">
                          <Line
                            data={{
                              labels: sortedMonthly.map(m => m.monthYear),
                              datasets: [{
                                label: `${form.level} Average`,
                                data: sortedMonthly.map(m => m.average),
                                borderColor: 'rgba(59, 130, 246, 1)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4,
                              }],
                            }}
                            options={getCommonChartOptions({
                              plugins: {
                                title: {
                                  display: true,
                                  text: `${form.level} Monthly Average Performance Trend`
                                }
                              }
                            })}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <h3 className="section-title">Subject Performance Charts by Form</h3>
                  
                  {/* Individual Monthly Test Charts - One chart per month/test */}
                  <h3 className="section-title">Individual Monthly Test Charts - Subject Breakdown</h3>
                  {processedFormsData.map((form) => {
                    if (!form.subject_averages || form.subject_averages.length === 0) return null;
                    
                    // Sort months chronologically
                    const sortedMonths = form.subject_averages.slice().sort((a, b) => {
                      const monthOrder = { 
                        'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5,
                        'February': 1, 'March': 2, 'April': 3, 'May': 4,
                        'August': 5, 'September': 6, 'October': 7, 'November': 8
                      };
                      const getYear = (str) => parseInt(str.split(' ').pop()) || 0;
                      const getMonth = (str) => str.split(' ')[0];
                      const yearA = getYear(a.monthYear), yearB = getYear(b.monthYear);
                      if (yearA !== yearB) return yearA - yearB;
                      return (monthOrder[getMonth(a.monthYear)] || 99) - (monthOrder[getMonth(b.monthYear)] || 99);
                    });
                    
                    return (
                      <div key={`monthly-tests-${form.level}`}>
                        <h4 className="chart-title" style={{ marginTop: '30px', marginBottom: '20px' }}>
                          {form.level} - Individual Monthly Test Charts
                        </h4>
                        {sortedMonths.map((monthData) => {
                          if (!monthData.subjects || Object.keys(monthData.subjects).length === 0) return null;
                          
                          const subjects = Object.keys(monthData.subjects).sort();
                          const subjectData = subjects.map(subject => ({
                            subject,
                            average: monthData.subjects[subject].average || 0
                          }));
                          
                          // Generate colors
                          const subjectColors = [
                            'rgba(54, 162, 235, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(255, 206, 86, 0.7)',
                            'rgba(255, 99, 132, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                            'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(255, 99, 255, 0.7)',
                            'rgba(99, 255, 132, 0.7)', 'rgba(255, 205, 86, 0.7)', 'rgba(54, 162, 235, 0.7)'
                          ];
                          
                          // Calculate overall average for this month
                          const monthAverage = subjectData.length > 0
                            ? subjectData.reduce((sum, s) => sum + s.average, 0) / subjectData.length
                            : 0;
                          
                          return (
                            <div key={`${form.level}-${monthData.monthYear}`} className="chart-container chart-section-container">
                              <h5 className="chart-title" style={{ fontSize: '16px', marginBottom: '15px' }}>
                                {form.level} - {monthData.monthYear} Test
                                <span style={{ marginLeft: '15px', fontSize: '14px', color: '#666' }}>
                                  (Average: {monthAverage.toFixed(1)}%)
                                </span>
                              </h5>
                              <div className="chart-wrapper" style={{ height: '350px' }}>
                                <Bar
                                  data={{
                                    labels: subjects,
                                    datasets: [{
                                      label: 'Subject Average (%)',
                                      data: subjectData.map(s => s.average),
                                      backgroundColor: subjects.map((_, idx) => subjectColors[idx % subjectColors.length]),
                                      borderColor: subjects.map((_, idx) => subjectColors[idx % subjectColors.length].replace('0.7', '1')),
                                      borderWidth: 1,
                                      borderRadius: 4,
                                    }],
                                  }}
                                  options={getCommonChartOptions({
                                    plugins: {
                                      title: {
                                        display: true,
                                        text: `${form.level} - ${monthData.monthYear} Test Results`
                                      },
                                      legend: {
                                        display: false
                                      }
                                    },
                                    scales: {
                                      x: {
                                        ticks: {
                                          maxRotation: 45,
                                          minRotation: 45,
                                        }
                                      }
                                    }
                                  })}
                                />
                              </div>
                              {/* Subject averages table for this month */}
                              <div style={{ marginTop: '15px' }}>
                                <table className="excel-table" style={{ fontSize: '0.9rem' }}>
                                  <thead>
                                    <tr>
                                      <th>Subject</th>
                                      <th>Average (%)</th>
                                      <th>Student Count</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {subjectData.map((s) => (
                                      <tr key={s.subject}>
                                        <td><strong>{s.subject}</strong></td>
                                        <td>{s.average.toFixed(1)}%</td>
                                        <td>{monthData.subjects[s.subject].student_count || 0}</td>
                                      </tr>
                                    ))}
                                    <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                                      <td>Overall Average</td>
                                      <td>{monthAverage.toFixed(1)}%</td>
                                      <td>{monthData.subjects[subjects[0]]?.student_count || 0}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Subject Charts for each Form - Combined View */}
                  <h3 className="section-title">Subject Performance Charts by Form (All Months Combined)</h3>
                  
                  {/* Subject Charts for each Form */}
                  {processedFormsData.map((form) => {
                    if (!form.subject_averages || form.subject_averages.length === 0) return null;
                    
                    // Get all unique subjects across all months for this form
                    const allSubjects = new Set();
                    form.subject_averages.forEach(monthData => {
                      if (monthData.subjects) {
                        Object.keys(monthData.subjects).forEach(subject => allSubjects.add(subject));
                      }
                    });
                    const sortedSubjects = Array.from(allSubjects).sort();
                    
                    // Get all unique months for this form
                    const allMonths = form.subject_averages.map(m => m.monthYear).sort((a, b) => {
                      const monthOrder = { 
                        'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5,
                        'February': 1, 'March': 2, 'April': 3, 'May': 4,
                        'August': 5, 'September': 6, 'October': 7, 'November': 8
                      };
                      const getYear = (str) => parseInt(str.split(' ').pop()) || 0;
                      const getMonth = (str) => str.split(' ')[0];
                      const yearA = getYear(a), yearB = getYear(b);
                      if (yearA !== yearB) return yearA - yearB;
                      return (monthOrder[getMonth(a)] || 99) - (monthOrder[getMonth(b)] || 99);
                    });
                    
                    // Generate colors for subjects
                    const subjectColors = [
                      'rgba(54, 162, 235, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(255, 206, 86, 0.7)',
                      'rgba(255, 99, 132, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                      'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(255, 99, 255, 0.7)',
                      'rgba(99, 255, 132, 0.7)', 'rgba(255, 205, 86, 0.7)', 'rgba(54, 162, 235, 0.7)'
                    ];
                    
                    return (
                      <div key={form.level} className="chart-container chart-section-container">
                        <h4 className="chart-title">
                          {form.level} - Subject Averages by Month/Test
                        </h4>
                        <div className="chart-wrapper">
                          <Bar
                            data={{
                              labels: allMonths,
                              datasets: sortedSubjects.map((subject, idx) => {
                                // Create data array for this subject across all months
                                const subjectData = allMonths.map(monthYear => {
                                  const monthData = form.subject_averages.find(m => m.monthYear === monthYear);
                                  if (monthData && monthData.subjects && monthData.subjects[subject]) {
                                    return monthData.subjects[subject].average;
                                  }
                                  return null;
                                });
                                
                                return {
                                  label: subject,
                                  data: subjectData,
                                  backgroundColor: subjectColors[idx % subjectColors.length],
                                  borderColor: subjectColors[idx % subjectColors.length].replace('0.7', '1'),
                                  borderWidth: 1,
                                  borderRadius: 3,
                                };
                              }),
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              layout: {
                                padding: {
                                  bottom: 20,
                                  top: 10,
                                  left: 10,
                                  right: 10
                                }
                              },
                              plugins: {
                                legend: {
                                  display: true,
                                  position: 'top',
                                },
                                tooltip: {
                                  mode: 'index',
                                  intersect: false,
                                  callbacks: {
                                    label: function(context) {
                                      const value = context.parsed.y;
                                      return value !== null ? `${context.dataset.label}: ${value.toFixed(2)}%` : `${context.dataset.label}: No data`;
                                    },
                                  },
                                },
                                annotation: {
                                  annotations: {
                                    line55: {
                                      type: 'line',
                                      yMin: 55,
                                      yMax: 55,
                                      borderColor: 'red',
                                      borderWidth: 2,
                                      borderDash: [5, 5],
                                      label: {
                                        display: true,
                                        content: '55%',
                                        position: 'end',
                                        backgroundColor: 'red',
                                        color: 'white',
                                        font: {
                                          size: 12,
                                          weight: 'bold'
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  max: 100,
                                  title: {
                                    display: true,
                                    text: 'Average Score (%)',
                                  },
                                  ticks: {
                                    callback: function(value) {
                                      return value + '%';
                                    },
                                  },
                                },
                                x: {
                                  stacked: false,
                                  title: {
                                    display: true,
                                    text: 'Month/Test',
                                  },
                                  ticks: {
                                    maxRotation: 45,
                                    minRotation: 45,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Cross-Form Comparison Charts */}
                  <h3 className="section-title">Cross-Form Comparison Charts</h3>
                  
                  {/* Bar Chart - Monthly Averages by Form (Grouped) */}
                  <div className="chart-container chart-section-container">
                    <h4 className="chart-title">Class Average Performance - All Forms (FORM I - FORM VI)</h4>
                    <div className="chart-wrapper" style={{ height: '450px' }}>
                      {(() => {
                        // Ensure all forms are included (FORM I - FORM VI)
                        const allForms = ['FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM V', 'FORM VI'];
                        const formsMap = {};
                        processedFormsData.forEach(f => {
                          formsMap[f.level] = f;
                        });
                        
                        // Create entries for all forms, even if they don't have data
                        const allFormsData = allForms.map(formLevel => {
                          return formsMap[formLevel] || {
                            level: formLevel,
                            monthly_data: [],
                            overall_average: 0,
                            overall_student_count: 0,
                            overall_score_count: 0
                          };
                        });
                        
                        // Get all unique monthYear labels across all forms
                        const allMonthYears = new Set();
                        allFormsData.forEach(f => {
                          if (f.monthly_data && f.monthly_data.length > 0) {
                            f.monthly_data.forEach(m => allMonthYears.add(m.monthYear));
                          }
                        });
                        
                        const sortedMonthYears = Array.from(allMonthYears).sort((a, b) => {
                          const monthOrder = { 
                            'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5,
                            'February': 1, 'March': 2, 'April': 3, 'May': 4,
                            'August': 5, 'September': 6, 'October': 7, 'November': 8
                          };
                          const getYear = (str) => parseInt(str.split(' ').pop()) || 0;
                          const getMonth = (str) => str.split(' ')[0];
                          const yearA = getYear(a), yearB = getYear(b);
                          if (yearA !== yearB) return yearA - yearB;
                          return (monthOrder[getMonth(a)] || 99) - (monthOrder[getMonth(b)] || 99);
                        });
                        
                        const formColors = {
                          'FORM I': { bg: 'rgba(76, 114, 176, 0.7)', border: '#4C72B0' },
                          'FORM II': { bg: 'rgba(85, 168, 104, 0.7)', border: '#55A868' },
                          'FORM III': { bg: 'rgba(196, 78, 82, 0.7)', border: '#C44E52' },
                          'FORM IV': { bg: 'rgba(129, 114, 178, 0.7)', border: '#8172B2' },
                          'FORM V': { bg: 'rgba(237, 102, 93, 0.7)', border: '#ED665D' },
                          'FORM VI': { bg: 'rgba(255, 158, 74, 0.7)', border: '#FF9E4A' }
                        };
                        
                        return (
                          <Bar
                            data={{
                              labels: sortedMonthYears.length > 0 ? sortedMonthYears : ['No Data'],
                              datasets: allFormsData.map((form) => {
                                const monthMap = {};
                                if (form.monthly_data && form.monthly_data.length > 0) {
                                  form.monthly_data.forEach(m => {
                                    monthMap[m.monthYear] = m.average;
                                  });
                                }
                                
                                const colors = formColors[form.level] || { bg: 'rgba(128, 128, 128, 0.7)', border: '#808080' };
                                
                                return {
                                  label: form.level,
                                  data: sortedMonthYears.length > 0 
                                    ? sortedMonthYears.map(my => monthMap[my] || null)
                                    : [null],
                                  backgroundColor: colors.bg,
                                  borderColor: colors.border,
                                  borderWidth: 2,
                                  borderRadius: 4,
                                  borderSkipped: false,
                                };
                              }),
                            }}
                            options={getCommonChartOptions({
                              plugins: {
                                title: {
                                  display: true,
                                  text: 'Class Average Performance Across All Forms'
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function(context) {
                                      if (context.parsed.y === null) return `${context.dataset.label}: No data`;
                                      return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                                    },
                                  },
                                },
                              },
                              scales: {
                                x: {
                                  title: {
                                    display: true,
                                    text: 'Month/Test Period'
                                  },
                                  ticks: {
                                    maxRotation: 45,
                                    minRotation: 45,
                                  },
                                },
                                y: {
                                  title: {
                                    display: true,
                                    text: 'Average Score (%)'
                                  },
                                },
                              },
                            })}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Doughnut Chart - Student Distribution */}
                  <div className="chart-container chart-section-container">
                    <h4 className="chart-title">Student Distribution by Form</h4>
                    <div className="chart-wrapper" style={{ height: '400px', maxWidth: '600px', margin: '0 auto' }}>
                      {(() => {
                        // Ensure all forms are included (FORM I - FORM VI)
                        const allForms = ['FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM V', 'FORM VI'];
                        const formsMap = {};
                        processedFormsData.forEach(f => {
                          formsMap[f.level] = f;
                        });
                        
                        // Create entries for all forms, even if they don't have data
                        const allFormsData = allForms.map(formLevel => {
                          return formsMap[formLevel] || {
                            level: formLevel,
                            monthly_data: [],
                            overall_average: 0,
                            overall_student_count: 0,
                            overall_score_count: 0
                          };
                        });
                        
                        return (
                          <>
                            <Doughnut
                              data={{
                                labels: allFormsData.map(form => form.level),
                                datasets: [
                                  {
                                    label: 'Student Count',
                                    data: allFormsData.map(form => form.overall_student_count || 0),
                                    backgroundColor: [
                                      'rgba(76, 114, 176, 0.8)',
                                      'rgba(85, 168, 104, 0.8)',
                                      'rgba(196, 78, 82, 0.8)',
                                      'rgba(129, 114, 178, 0.8)',
                                      'rgba(237, 102, 93, 0.8)',
                                      'rgba(255, 158, 74, 0.8)',
                                    ],
                                    borderColor: [
                                      '#4C72B0',
                                      '#55A868',
                                      '#C44E52',
                                      '#8172B2',
                                      '#ED665D',
                                      '#FF9E4A',
                                    ],
                                    borderWidth: 3,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                aspectRatio: 1.5,
                                plugins: {
                                  legend: {
                                    display: true,
                                    position: 'right',
                                    labels: {
                                      padding: 15,
                                      font: {
                                        size: 12
                                      },
                                      generateLabels: function(chart) {
                                        const data = chart.data;
                                        if (data.labels.length && data.datasets.length) {
                                          const dataset = data.datasets[0];
                                          const total = dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
                                          return data.labels.map((label, i) => {
                                            const value = dataset.data[i] || 0;
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                            return {
                                              text: `${label}: ${value} (${percentage}%)`,
                                              fillStyle: dataset.backgroundColor[i],
                                              strokeStyle: dataset.borderColor[i],
                                              lineWidth: dataset.borderWidth,
                                              hidden: false,
                                              index: i
                                            };
                                          });
                                        }
                                        return [];
                                      }
                                    }
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = context.dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        return `${label}: ${value || 0} students (${percentage}%)`;
                                      },
                                    },
                                  },
                                  title: {
                                    display: true,
                                    text: 'Student Distribution Across All Forms',
                                    font: {
                                      size: 16,
                                      weight: 'bold'
                                    },
                                    padding: {
                                      top: 10,
                                      bottom: 20
                                    }
                                  }
                                },
                              }}
                            />
                            {/* Student count summary table */}
                            <div style={{ marginTop: '20px', maxWidth: '600px', margin: '20px auto 0' }}>
                              <table className="excel-table" style={{ fontSize: '0.9rem' }}>
                                <thead>
                                  <tr>
                                    <th>Form</th>
                                    <th>Student Count</th>
                                    <th>Percentage</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allFormsData.map((form) => {
                                    const total = allFormsData.reduce((sum, f) => sum + (f.overall_student_count || 0), 0);
                                    const percentage = total > 0 ? (((form.overall_student_count || 0) / total) * 100).toFixed(1) : 0;
                                    return (
                                      <tr key={form.level}>
                                        <td><strong>{form.level}</strong></td>
                                        <td>{form.overall_student_count || 0}</td>
                                        <td>{total > 0 ? `${percentage}%` : '0%'}</td>
                                      </tr>
                                    );
                                  })}
                                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                                    <td>Total</td>
                                    <td>{allFormsData.reduce((sum, f) => sum + (f.overall_student_count || 0), 0)}</td>
                                    <td>100%</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-chart-bar empty-icon"></i>
                <h3>No Data Available</h3>
                <p>No performance data available for comparison across forms.</p>
                <p className="text-muted">Data will appear here once scores are entered for students.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AllFormsAverages;

