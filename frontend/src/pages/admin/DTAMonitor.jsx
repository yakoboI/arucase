/**
 * DTA Monitor - Score Change Audit Trail
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';
import './DTAMonitor.css';

const DTAMonitor = () => {
  const [filters, setFilters] = useState({
    student_adm_no: '',
    level: '',
    stream: '',
    year: '',
    month: '',
    subject_code: '',
    changed_by: '',
    date_from: '',
    date_to: '',
    change_count_min: ''
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selectedChange, setSelectedChange] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDateFrom, setClearDateFrom] = useState('');
  const [clearDateTo, setClearDateTo] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  // Check if user is admin
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  // Fetch statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dta-statistics'],
    queryFn: async () => {
      const res = await api.get('/dta-monitor/statistics');
      return res.data;
    }
  });

  // Fetch changes with filters
  const { data: changesData, isLoading: changesLoading, refetch } = useQuery({
    queryKey: ['dta-changes', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('page', page);
      params.append('limit', limit);
      const res = await api.get(`/dta-monitor/changes?${params}`);
      return res.data;
    }
  });

  const changes = changesData?.changes || [];
  const pagination = changesData?.pagination || { total: 0, totalPages: 0 };

  const stats = statsData || {
    totalChanges: 0,
    mostChangedSubjects: [],
    mostActiveUsers: [],
    todayChanges: 0,
    changesByLevel: []
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      student_adm_no: '',
      level: '',
      stream: '',
      year: '',
      month: '',
      subject_code: '',
      changed_by: '',
      date_from: '',
      date_to: '',
      change_count_min: ''
    });
    setPage(1);
  };

  const handleViewHistory = (change) => {
    setSelectedChange(change);
    setShowHistoryModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getScoreChangeColor = (oldScore, newScore) => {
    if (newScore > oldScore) return 'text-green-600';
    if (newScore < oldScore) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleClearRecords = async () => {
    if (!isAdmin) {
      toast.error('Only admins can clear records');
      return;
    }

    setIsClearing(true);
    try {
      const params = new URLSearchParams();
      if (clearDateFrom) params.append('date_from', clearDateFrom);
      if (clearDateTo) params.append('date_to', clearDateTo);

      const res = await api.delete(`/dta-monitor/clear?${params}`);
      toast.success(`Cleared ${res.data.deletedCount} records successfully`);
      setShowClearModal(false);
      setClearDateFrom('');
      setClearDateTo('');
      // Refresh data
      refetch();
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear records');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="dta-monitor-page">
        <div className="page-header">
          <h1>DTA Monitor</h1>
          <p className="page-description">Track all score modifications and changes</p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-header">
              <span className="stat-icon">&#128260;</span>
              <span className="stat-label">Total Changes</span>
            </div>
            <div className="stat-value">{stats.totalChanges}</div>
          </div>
          <div className="stat-card stat-card-success">
            <div className="stat-header">
              <span className="stat-icon">&#128197;</span>
              <span className="stat-label">Today</span>
            </div>
            <div className="stat-value">{stats.todayChanges}</div>
          </div>
          <div className="stat-card stat-card-info">
            <div className="stat-header">
              <span className="stat-icon">&#128218;</span>
              <span className="stat-label">Top Subject</span>
            </div>
            <div className="stat-value" title={stats.mostChangedSubjects[0]?.subject_name || '-'}>
              {stats.mostChangedSubjects[0]?.subject_name || '-'}
            </div>
          </div>
          <div className="stat-card stat-card-warning">
            <div className="stat-header">
              <span className="stat-icon">&#128100;</span>
              <span className="stat-label">Top User</span>
            </div>
            <div className="stat-value" title={stats.mostActiveUsers[0]?.last_changed_by || '-'}>
              {stats.mostActiveUsers[0]?.last_changed_by || '-'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-row">
            <input
              type="text"
              name="student_adm_no"
              placeholder="Admission No"
              value={filters.student_adm_no}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <select
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
              className="filter-input"
            >
              <option value="">All Levels</option>
              <option value="FORM I">FORM I</option>
              <option value="FORM II">FORM II</option>
              <option value="FORM III">FORM III</option>
              <option value="FORM IV">FORM IV</option>
              <option value="FORM V">FORM V</option>
              <option value="FORM VI">FORM VI</option>
            </select>
            <input
              type="text"
              name="stream"
              placeholder="Stream"
              value={filters.stream}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <input
              type="number"
              name="year"
              placeholder="Year"
              value={filters.year}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <input
              type="text"
              name="month"
              placeholder="Month"
              value={filters.month}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          <div className="filter-row">
            <input
              type="text"
              name="subject_code"
              placeholder="Subject Code"
              value={filters.subject_code}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <input
              type="text"
              name="changed_by"
              placeholder="Changed By"
              value={filters.changed_by}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <input
              type="number"
              name="change_count_min"
              placeholder="Min Changes"
              value={filters.change_count_min}
              onChange={handleFilterChange}
              className="filter-input"
            />
            <button onClick={handleResetFilters} className="btn-secondary">
              Reset
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowClearModal(true)}
                className="btn-clear"
                title="Clear all DTA records"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          {changesLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Adm No</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Initial Score</th>
                    <th>Current Score</th>
                    <th>Changes</th>
                    <th>Last Changed By</th>
                    <th>Last Changed At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="no-data">No changes found</td>
                    </tr>
                  ) : (
                    changes.map((change) => (
                      <tr key={change.id}>
                        <td>{change.student_name}</td>
                        <td>{change.student_adm_no}</td>
                        <td>{change.level} - {change.stream} ({change.year})</td>
                        <td>{change.subject_name}</td>
                        <td>{change.initial_score ?? '-'}</td>
                        <td>{change.current_score ?? '-'}</td>
                        <td className="change-count">{change.change_count}</td>
                        <td>{change.last_changed_by || '-'}</td>
                        <td>{formatDate(change.last_changed_at)}</td>
                        <td>
                          <button
                            onClick={() => handleViewHistory(change)}
                            className="btn-view-history"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-page"
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {page} of {pagination.totalPages} ({pagination.total} total)
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="btn-page"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* History Modal */}
        {showHistoryModal && selectedChange && (
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Change History</h2>
                <button onClick={() => setShowHistoryModal(false)} className="btn-close">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="history-info">
                  <p><strong>Student:</strong> {selectedChange.student_name} ({selectedChange.student_adm_no})</p>
                  <p><strong>Class:</strong> {selectedChange.level} - {selectedChange.stream} ({selectedChange.year})</p>
                  <p><strong>Subject:</strong> {selectedChange.subject_name}</p>
                  <p><strong>Initial Score:</strong> {selectedChange.initial_score ?? '-'}</p>
                  <p><strong>Current Score:</strong> {selectedChange.current_score ?? '-'}</p>
                  <p><strong>Total Changes:</strong> {selectedChange.change_count}</p>
                </div>
                <h3>Change Timeline</h3>
                {selectedChange.change_history && selectedChange.change_history.length > 0 ? (
                  <div className="timeline">
                    {selectedChange.change_history.map((entry, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-time">{formatDate(entry.timestamp)}</div>
                        <div className="timeline-user">By: {entry.username}</div>
                        <div className="timeline-change">
                          <span className={getScoreChangeColor(entry.old_score, entry.new_score)}>
                            {entry.old_score ?? '-'} → {entry.new_score ?? '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-history">No change history recorded</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clear Records Modal */}
        {showClearModal && (
          <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
            <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Clear DTA Records</h2>
                <button onClick={() => setShowClearModal(false)} className="btn-close">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="clear-warning">
                  <p><strong>Warning:</strong> This action cannot be undone!</p>
                  <p>You can clear all records or specify a date range.</p>
                </div>
                <div className="clear-filters">
                  <div className="filter-row">
                    <label>From Date:</label>
                    <input
                      type="date"
                      value={clearDateFrom}
                      onChange={(e) => setClearDateFrom(e.target.value)}
                      className="filter-input"
                    />
                  </div>
                  <div className="filter-row">
                    <label>To Date:</label>
                    <input
                      type="date"
                      value={clearDateTo}
                      onChange={(e) => setClearDateTo(e.target.value)}
                      className="filter-input"
                    />
                  </div>
                  <p className="clear-hint">
                    Leave dates empty to clear <strong>ALL</strong> records.
                  </p>
                </div>
                <div className="clear-actions">
                  <button
                    onClick={() => setShowClearModal(false)}
                    className="btn-secondary"
                    disabled={isClearing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearRecords}
                    className="btn-danger"
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Clear Records'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DTAMonitor;
