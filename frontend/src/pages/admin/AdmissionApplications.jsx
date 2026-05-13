import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';
import './AdmissionApplications.css';

const AdmissionApplications = () => {
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');

  // Load all applications once; status chips filter client-side so stats (Total/Pending/…) stay correct
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['admin-admission-applications'],
    queryFn: async () => {
      const res = await adminAPI.getAdmissionApplications({});
      return res.data?.applications || [];
    },
    enabled: !authLoading,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, feedback }) => adminAPI.updateAdmissionApplicationStatus(id, status, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admission-applications'] });
      toast.success('Application updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update application'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => adminAPI.deleteAdmissionApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admission-applications'] });
      setSelected(null);
      setFeedback('');
      toast.success('Application deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete application'),
  });

  const selectedId = selected?.id;
  const selectedStatus = (selected?.status || 'pending').toLowerCase();

  const normalizedSearch = (search || '').trim().toLowerCase();

  const counts = useMemo(() => {
    const all = applications || [];
    const byStatus = (s) => all.filter((a) => (a.status || '').toLowerCase() === s).length;
    return {
      total: all.length,
      pending: byStatus('pending'),
      approved: byStatus('approved'),
      rejected: byStatus('rejected'),
    };
  }, [applications]);

  const filtered = useMemo(() => {
    const all = applications || [];
    let rows = all;
    if (statusFilter) {
      const s = statusFilter.toLowerCase();
      rows = rows.filter((a) => (a.status || '').toLowerCase() === s);
    }
    if (!normalizedSearch) return rows;
    return rows.filter((a) => {
      const hay = [
        a.full_name,
        a.email,
        a.phone,
        a.desired_entry,
        a.education_level,
        a.previous_school,
        a.region,
        a.district,
        a.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(normalizedSearch);
    });
  }, [applications, statusFilter, normalizedSearch]);

  const open = (app) => {
    setSelected(app);
    setFeedback(app.admin_feedback || '');
  };

  const applyStatus = (status) => {
    if (!selectedId) return;
    if (status === 'approved' && !window.confirm('Approve this application? The applicant will see your feedback.')) return;
    if (status === 'rejected' && !window.confirm('Reject this application? The applicant will see your feedback.')) return;
    updateMutation.mutate({ id: selectedId, status, feedback: feedback || null });
  };

  const confirmDeleteApplication = () => {
    if (!selectedId || !selected) return;
    const name = selected.full_name || 'this applicant';
    if (
      !window.confirm(
        `Permanently delete this application for "${name}"? The applicant record stays; only this submission is removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(selectedId);
  };

  const actionsBusy = updateMutation.isPending || deleteMutation.isPending;

  const pillClass = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved') return 'status-pill pill-approved';
    if (s === 'rejected') return 'status-pill pill-rejected';
    return 'status-pill pill-pending';
  };

  return (
    <AdminLayout>
      <div className="admin-page admissions-apps-page">
        <div className="page-header">
          <div className="page-title">
            <h1>Admissions Applications</h1>
            <p>Review submissions, write feedback, and approve/reject.</p>
          </div>
        </div>

        <div className="content-card admissions-apps-toolbar">
          <div className="admissions-apps-stats">
            <span className="admissions-stat">Total: {counts.total}</span>
            <span className="admissions-stat">Pending: {counts.pending}</span>
            <span className="admissions-stat">Approved: {counts.approved}</span>
            <span className="admissions-stat">Rejected: {counts.rejected}</span>
          </div>

          <div className="admissions-filters">
            <div className="admissions-status-chips">
              <button
                type="button"
                className={`status-chip ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending <span className="count">{counts.pending}</span>
              </button>
              <button
                type="button"
                className={`status-chip ${statusFilter === 'approved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('approved')}
              >
                Approved <span className="count">{counts.approved}</span>
              </button>
              <button
                type="button"
                className={`status-chip ${statusFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected <span className="count">{counts.rejected}</span>
              </button>
              <button
                type="button"
                className={`status-chip ${statusFilter === '' ? 'active' : ''}`}
                onClick={() => setStatusFilter('')}
              >
                All <span className="count">{counts.total}</span>
              </button>
            </div>

            <div className="admissions-search">
              <input
                className="excel-input small"
                placeholder="Search name, email, phone, entry, message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="admissions-layout">
          <div className="apps-list-panel">
            <div className="panel-header">
              <div className="left">
                <div className="title">Inbox</div>
                <div className="subtitle">{isLoading ? 'Loading…' : `${filtered.length} result(s)`}</div>
              </div>
              {selected ? (
                <div className={pillClass(selected.status)}>
                  {selected.status || 'pending'}
                </div>
              ) : null}
            </div>

            <div className="apps-list">
              {authLoading || isLoading ? (
                <div className="apps-empty">Loading applications…</div>
              ) : filtered.length === 0 ? (
                <div className="apps-empty">
                  No applications found{normalizedSearch ? ' for your search.' : '.'}
                </div>
              ) : (
                filtered.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className={`app-row ${selectedId === app.id ? 'selected' : ''}`}
                    onClick={() => open(app)}
                  >
                    <div className="app-row-top">
                      <div className="app-name">{app.full_name || 'Applicant'}</div>
                      <div className="app-row-badges">
                        {app.is_reapplication ? (
                          <span className="status-pill pill-pending" title="This applicant submitted again">
                            Re-applied{app.application_no ? ` #${app.application_no}` : ''}
                          </span>
                        ) : null}
                        <div className={pillClass(app.status)}>{app.status || 'pending'}</div>
                      </div>
                    </div>
                    <div className="app-meta">
                      {app.email} · {app.phone}
                    </div>
                    <div className="app-meta">
                      <span className="app-meta-label">Entry:</span> {app.desired_entry || '-'} ·{' '}
                      <span className="app-meta-label">Edu:</span> {app.education_level || '-'}{' '}
                      {app.is_transfer ? '(transfer)' : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="detail-panel">
            <div className="panel-header">
              <div className="left">
                <div className="title">Application detail</div>
                <div className="subtitle">
                  {selected ? 'Write feedback and update status.' : 'Select an application from the list.'}
                </div>
              </div>
              {selected ? (
                <div className={pillClass(selected.status)}>
                  {selected.status || 'pending'}
                </div>
              ) : null}
            </div>

            <div className="detail-body">
              {!selected ? (
                <div className="detail-hint">
                  Tip: use search to quickly find an applicant by phone number.
                </div>
              ) : (
                <>
                  <div className="detail-section">
                    <h2>Applicant</h2>
                    <div className="kv-grid">
                      <div className="kv">
                        <div className="k">Name</div>
                        <div className="v">{selected.full_name || '-'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Phone</div>
                        <div className="v">{selected.phone || '-'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Email</div>
                        <div className="v">{selected.email || '-'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Location</div>
                        <div className="v">{[selected.region, selected.district].filter(Boolean).join(' / ') || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h2>Application</h2>
                    <div className="kv-grid">
                      <div className="kv">
                        <div className="k">Application #</div>
                        <div className="v">{selected.application_no || 1}{selected.is_reapplication ? ' (Re-applied)' : ''}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Education level</div>
                        <div className="v">{selected.education_level || '-'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Transfer</div>
                        <div className="v">{selected.is_transfer ? 'Yes' : 'No'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Previous school</div>
                        <div className="v">{selected.previous_school || '-'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Desired entry</div>
                        <div className="v">{selected.desired_entry || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h2>Message</h2>
                    <div className="message-box">{selected.message || '—'}</div>
                  </div>

                  <div className="detail-section">
                    <label className="feedback-label">
                      Feedback (visible to applicant)
                      <small>Write clear next steps (documents needed, date to visit, etc.).</small>
                      <textarea
                        className="excel-input"
                        rows={5}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Type feedback for the applicant…"
                      />
                    </label>
                  </div>

                  <div className="detail-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => applyStatus('approved')}
                      disabled={actionsBusy}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => applyStatus('rejected')}
                      disabled={actionsBusy}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => applyStatus('pending')}
                      disabled={actionsBusy}
                    >
                      Set Pending
                    </button>
                    <div className="detail-hint">
                      Current status: {selectedStatus}
                    </div>
                  </div>

                  <div className="detail-actions detail-actions-delete">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={confirmDeleteApplication}
                      disabled={actionsBusy}
                    >
                      Delete application
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdmissionApplications;

