/**
 * Marks Config Management Page
 * Configure month weights for a term - Matching Python Website Template
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './MarksConfigManagement.css';

const MarksConfigManagement = ({ formLevel }) => {
  const { year, stream, term } = useParams();
  const queryClient = useQueryClient();
  
  const [weights, setWeights] = useState({});
  const [total, setTotal] = useState(0);

  // Normalize form level
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';
  
  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  const normalizedStream = stream || 'A';

  // Get months for term - memoize to prevent infinite loops
  // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
  // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
  const getMonthsForTerm = React.useCallback((termParam) => {
    const isForm5Or6 = normalizedLevel && (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI');
    if (isForm5Or6) {
      return (termParam === 'Term I' || termParam === 'Term 1')
        ? ['August', 'September', 'October', 'November']
        : ['February', 'March', 'April', 'May'];
    } else {
      return (termParam === 'Term I' || termParam === 'Term 1')
        ? ['February', 'March', 'April', 'May']
        : ['August', 'September', 'October', 'November'];
    }
  }, [normalizedLevel]);

  const months = React.useMemo(() => getMonthsForTerm(term), [term, getMonthsForTerm]);

  // Helper function: update total - define before useEffect
  const updateTotal = React.useCallback((newWeights) => {
    const sum = Object.values(newWeights).reduce((acc, val) => {
      const numVal = parseFloat(val);
      return acc + (isNaN(numVal) ? 0 : numVal);
    }, 0);
    setTotal(sum);
  }, []);

  // Fetch current marks config
  const { data: marksConfig, isLoading } = useQuery({
    queryKey: ['marks-config', term],
    queryFn: async () => {
      const res = await studentsAPI.getMarksConfig();
      return res.data.month_weights || {};
    },
  });

  // Initialize weights from config
  useEffect(() => {
    if (marksConfig && Object.keys(marksConfig).length > 0) {
      const initialWeights = {};
      months.forEach(month => {
        initialWeights[month] = marksConfig[month] !== undefined ? marksConfig[month] : 0;
      });
      setWeights(initialWeights);
      updateTotal(initialWeights);
    } else if (!isLoading) {
      // Initialize with default values if no config exists
      const defaultWeights = {};
      const defaultWeight = 100 / months.length;
      months.forEach(month => {
        defaultWeights[month] = defaultWeight;
      });
      setWeights(defaultWeights);
      updateTotal(defaultWeights);
    }
  }, [marksConfig, term, isLoading, months, updateTotal]);

  const handleWeightChange = (month, value) => {
    const numValue = parseFloat(value) || 0;
    const validatedValue = Math.max(0, Math.min(100, numValue));
    const newWeights = { ...weights, [month]: validatedValue };
    setWeights(newWeights);
    updateTotal(newWeights);
  };

  // Auto-distribute weights equally
  const handleEqualDistribution = () => {
    const equalWeight = 100 / months.length;
    const newWeights = {};
    months.forEach(month => {
      newWeights[month] = equalWeight;
    });
    setWeights(newWeights);
    updateTotal(newWeights);
    toast.info(`Weights set to equal distribution: ${equalWeight.toFixed(2)}% each`);
  };

  // Auto-adjust to make total 100%
  const handleAutoAdjust = () => {
    if (total === 0) {
      handleEqualDistribution();
      return;
    }
    
    const adjustmentFactor = 100 / total;
    const adjustedWeights = {};
    months.forEach(month => {
      adjustedWeights[month] = (weights[month] || 0) * adjustmentFactor;
    });
    setWeights(adjustedWeights);
    updateTotal(adjustedWeights);
    toast.info('Weights automatically adjusted to total 100%');
  };

  // Save marks config mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return studentsAPI.saveMarksConfig({ month_weights: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marks-config']);
      toast.success('Marks configuration saved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save marks configuration');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Total weights must equal 100%. Current total: ${total.toFixed(2)}%`);
      return;
    }

    saveMutation.mutate(weights);
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/marks-config/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/marks-config/${formLevel}/years`;
    }
  };

  return (
    <AdminLayout>
      <div className="marks-config-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-cog"></i>
            Marks Configuration - {normalizedLevel} {normalizedStream && normalizedStream !== 'A' ? `Stream ${normalizedStream}` : ''} {year} - {term}
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i> Loading configuration...
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="marks-config-form">
                  {/* Configuration Info Section */}
                  <div className="config-section">
                    <h4><i className="fas fa-info-circle"></i> Configuration</h4>
                    <p>Edit the percentage weights for each month. Total should equal 100%.</p>
                    <div className="weight-summary">
                      <span>Total Weight: <strong id="total-weight-display" className={Math.abs(total - 100) < 0.01 ? 'valid' : 'invalid'}>{total.toFixed(2)}%</strong></span>
                      <span className={`config-status ${Math.abs(total - 100) < 0.01 ? 'saved' : 'changed'}`}>
                        {Math.abs(total - 100) < 0.01 ? '✓ Saved' : '• Changes pending'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="marks-config-actions-top">
                    <button
                      type="button"
                      className="excel-btn secondary"
                      onClick={handleEqualDistribution}
                      title="Set all months to equal weights"
                    >
                      <i className="fas fa-balance-scale"></i> Equal Distribution
                    </button>
                    {Math.abs(total - 100) > 0.01 && total > 0 && (
                      <button
                        type="button"
                        className="excel-btn secondary"
                        onClick={handleAutoAdjust}
                        title="Automatically adjust weights to total 100%"
                      >
                        <i className="fas fa-magic"></i> Auto-Adjust to 100%
                      </button>
                    )}
                  </div>
                  
                  {/* Main Configuration Table - Matching Python Template Structure */}
                  <div className="table-container">
                    <table className="excel-table comprehensive-marks-table">
                      <thead>
                        <tr>
                          <th rowSpan="2" className="table-header-min-width-60">S/N</th>
                          <th rowSpan="2" className="table-header-min-width-150">MONTH</th>
                          {months.map((month, idx) => (
                            <th key={month} colSpan="2" className="month-header">
                              {month.toUpperCase()}
                            </th>
                          ))}
                          <th rowSpan="2" className="table-header-min-width-100">TOTAL</th>
                        </tr>
                        <tr>
                          {months.map((month) => (
                            <React.Fragment key={month}>
                              <th className="raw-score-header">RAW SCORE</th>
                              <th className="weight-header">
                                <div className="weight-input-wrapper">
                                  <input
                                    type="number"
                                    id={`${month.toLowerCase()}_weight`}
                                    className={`weight-input-header ${weights[month] > 0 ? 'has-value' : ''}`}
                                    value={weights[month] !== undefined ? weights[month] : ''}
                                    onChange={(e) => handleWeightChange(month, e.target.value)}
                                    onBlur={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      handleWeightChange(month, value);
                                    }}
                                    min="0"
                                    max="100"
                                    step="0.0001"
                                    placeholder="0.0000"
                                    required
                                  />
                                  <span className="weight-percent-header">%</span>
                                </div>
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Month rows with visual indicators */}
                        {months.map((month, index) => (
                          <tr key={month} className={`month-row ${weights[month] > 0 ? 'has-weight' : ''}`}>
                            <td className="sn-cell">{index + 1}</td>
                            <td className="month-name-cell">
                              <strong>{month}</strong>
                              {index === 0 && <span className="month-label"> (First Month)</span>}
                              {index === months.length - 1 && <span className="month-label"> (Last Month)</span>}
                            </td>
                            {months.map((m) => (
                              <React.Fragment key={m}>
                                <td className="raw-score-cell">
                                  {m === month ? (
                                    <div className="weight-display-cell">
                                      <span className="weight-value-display">{weights[month] !== undefined ? weights[month].toFixed(4) : '0.0000'}</span>
                                    </div>
                                  ) : (
                                    <span className="empty-cell">-</span>
                                  )}
                                </td>
                                <td className="weighted-score-cell">
                                  {m === month ? (
                                    <div className="weight-indicator-cell">
                                      <div 
                                        className="weight-bar" 
                                        style={{ width: `${Math.min(weights[month] || 0, 100)}%` }}
                                      ></div>
                                      <span className="weight-percentage">{weights[month] !== undefined ? weights[month].toFixed(2) : '0.00'}%</span>
                                    </div>
                                  ) : (
                                    <span className="empty-cell">-</span>
                                  )}
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="total-cell">
                              <strong>{weights[month] !== undefined ? weights[month].toFixed(2) : '0.00'}%</strong>
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="total-row">
                          <td colSpan="2" className="total-label-cell">
                            <strong>TOTAL WEIGHT</strong>
                            <div className="total-help-text">
                              {Math.abs(total - 100) < 0.01 
                                ? '✓ Valid configuration' 
                                : `Need ${(100 - total).toFixed(2)}% more`}
                            </div>
                          </td>
                          {months.map((month) => (
                            <React.Fragment key={month}>
                              <td className="empty-cell">-</td>
                              <td className="empty-cell">-</td>
                            </React.Fragment>
                          ))}
                          <td className="total-value-cell">
                            <div className="total-display">
                              <strong className={Math.abs(total - 100) < 0.01 ? 'valid-total' : 'invalid-total'}>
                                {total.toFixed(2)}%
                              </strong>
                              {Math.abs(total - 100) < 0.01 && (
                                <span className="check-icon">✓</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Error Message */}
                  {Math.abs(total - 100) > 0.01 && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i> Total must equal 100%. Current total: {total.toFixed(2)}%
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="marks-config-actions">
                    <button
                      type="button"
                      className="excel-btn secondary"
                      onClick={() => {
                        const resetWeights = {};
                        months.forEach(month => {
                          resetWeights[month] = 0;
                        });
                        setWeights(resetWeights);
                        updateTotal(resetWeights);
                      }}
                      title="Reset all weights to zero"
                    >
                      <i className="fas fa-undo"></i> Reset
                    </button>
                    <button
                      type="submit"
                      className="excel-btn primary"
                      disabled={saveMutation.isLoading || Math.abs(total - 100) > 0.01}
                    >
                      <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarksConfigManagement;
