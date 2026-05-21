/**
 * DTA Monitor - Score Change Audit Trail
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteMarkedModal, setShowDeleteMarkedModal] = useState(false);
  const [isDeletingMarked, setIsDeletingMarked] = useState(false);

  const queryClient = useQueryClient();
  const { isAdminLike } = useAuth();

  // Admin/superadmin only (matches backend bulk-delete); use AuthContext, not localStorage
  const isAdmin = isAdminLike();

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
    setSelectedIds(new Set());
  };

  const handleResetFilters = () => {
    setSelectedIds(new Set());
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

  const parseChangeHistory = (history) => {
    if (!history) return [];
    if (Array.isArray(history)) return history;
    if (typeof history === 'string') {
      try {
        const parsed = JSON.parse(history);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getDisplayChangeCount = (change) => {
    const historyLen = parseChangeHistory(change.change_history).length;
    const stored = parseInt(change.change_count, 10) || 0;
    return Math.max(stored, historyLen);
  };

  const pageIds = changes.map((c) => c.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteMarked = async () => {
    if (!isAdmin) {
      toast.error('Only admins can delete records');
      return;
    }

    const ids = [...selectedIds];
    if (ids.length === 0) {
      toast.error('No records selected');
      return;
    }

    setIsDeletingMarked(true);
    try {
      const res = await api.delete('/dta-monitor/changes/bulk', { data: { ids } });
      toast.success(`Deleted ${res.data.deletedCount} record(s)`);
      setShowDeleteMarkedModal(false);
      clearSelection();
      await queryClient.invalidateQueries({ queryKey: ['dta-changes'] });
      await queryClient.invalidateQueries({ queryKey: ['dta-statistics'] });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete selected records');
    } finally {
      setIsDeletingMarked(false);
    }
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
          {isAdmin && selectedIds.size > 0 && (
            <div className="bulk-actions-bar">
              <span className="bulk-actions-count">
                {selectedIds.size} record{selectedIds.size === 1 ? '' : 's'} marked
              </span>
              <div className="bulk-actions-buttons">
                <button type="button" onClick={clearSelection} className="btn-secondary">
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteMarkedModal(true)}
                  className="btn-danger"
                >
                  Delete marked
                </button>
              </div>
            </div>
          )}
          {changesLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    {isAdmin && (
                      <th className="col-select">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = somePageSelected && !allPageSelected;
                          }}
                          onChange={toggleSelectAllOnPage}
                          aria-label="Select all on this page"
                        />
                      </th>
                    )}
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
                      <td colSpan={isAdmin ? 11 : 10} className="no-data">No changes found</td>
                    </tr>
                  ) : (
                    changes.map((change) => (
                      <tr
                        key={change.id}
                        className={selectedIds.has(change.id) ? 'row-selected' : undefined}
                      >
                        {isAdmin && (
                          <td className="col-select">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(change.id)}
                              onChange={() => toggleSelectRow(change.id)}
                              aria-label={`Mark ${change.student_name || change.student_adm_no}`}
                            />
                          </td>
                        )}
                        <td>{change.student_name}</td>
                        <td>{change.student_adm_no}</td>
                        <td>{change.level} - {change.stream} ({change.year})</td>
                        <td>{change.subject_name}</td>
                        <td>{change.initial_score ?? '-'}</td>
                        <td>{change.current_score ?? '-'}</td>
                        <td className="change-count">{getDisplayChangeCount(change)}</td>
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
                  <p><strong>Total Changes:</strong> {getDisplayChangeCount(selectedChange)}</p>
                </div>
                <h3>Change Timeline</h3>
                {parseChangeHistory(selectedChange.change_history).length > 0 ? (
                  <div className="timeline">
                    {parseChangeHistory(selectedChange.change_history).map((entry, index) => (
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

        {/* Delete Marked Modal */}
        {showDeleteMarkedModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteMarkedModal(false)}>
            <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete marked records</h2>
                <button onClick={() => setShowDeleteMarkedModal(false)} className="btn-close">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="clear-warning">
                  <p><strong>Warning:</strong> This action cannot be undone!</p>
                  <p>
                    You are about to permanently delete <strong>{selectedIds.size}</strong> score
                    audit record{selectedIds.size === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="clear-actions">
                  <button
                    onClick={() => setShowDeleteMarkedModal(false)}
                    className="btn-secondary"
                    disabled={isDeletingMarked}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteMarked}
                    className="btn-danger"
                    disabled={isDeletingMarked}
                  >
                    {isDeletingMarked ? 'Deleting...' : 'Delete marked'}
                  </button>
                </div>
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
