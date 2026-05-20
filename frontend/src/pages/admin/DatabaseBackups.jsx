import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import DataTable from '../../components/common/DataTable';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { adminAPI } from '../../services/admin';
import { getAxiosBaseURL } from '../../utils/backendUrl';
import { toast } from '../../utils/toast';
import './DatabaseBackups.css';

/** Download via query param (works with cookies + optional Bearer token). */
async function fetchBackupBlob(filename) {
  const base = getAxiosBaseURL().replace(/\/$/, '');
  const url = `${base}/admin/database-backups/download?${new URLSearchParams({ filename })}`;
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { credentials: 'include', headers });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  return res.blob();
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString();
}

function triggerBrowserDownload(blob, filename) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

const DatabaseBackups = () => {
  const queryClient = useQueryClient();
  const [markedForDelete, setMarkedForDelete] = useState(() => new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['database-backups'],
    queryFn: async () => {
      const res = await adminAPI.getDatabaseBackups();
      return res.data || {};
    },
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => adminAPI.runDatabaseBackup(),
    onSuccess: (response) => {
      toast.success('Database backup created successfully');
      const createdBackup = response?.data?.backup;
      if (!createdBackup?.name) {
        queryClient.invalidateQueries({ queryKey: ['database-backups'] });
        return;
      }

      queryClient.setQueryData(['database-backups'], (oldData) => {
        const previous = oldData || {};
        const prevBackups = Array.isArray(previous.backups) ? previous.backups : [];
        const nextBackups = [createdBackup, ...prevBackups.filter((item) => item.name !== createdBackup.name)];
        return {
          ...previous,
          backups: nextBackups.slice(0, 20),
        };
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create backup');
    },
  });

  const downloadBackupMutation = useMutation({
    retry: false,
    mutationFn: async (filename) => {
      const blob = await fetchBackupBlob(filename);
      return { filename, blob };
    },
    onSuccess: ({ filename, blob }) => {
      triggerBrowserDownload(blob, filename);
      toast.success(`Download started: ${filename}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to download backup');
    },
  });

  const deleteBackupsMutation = useMutation({
    mutationFn: async (filenames) => {
      await Promise.all(filenames.map((name) => adminAPI.deleteDatabaseBackup(name)));
      return filenames;
    },
    onSuccess: (deletedFiles) => {
      const deletedSet = new Set(deletedFiles);
      queryClient.setQueryData(['database-backups'], (oldData) => {
        const previous = oldData || {};
        const prevBackups = Array.isArray(previous.backups) ? previous.backups : [];
        return {
          ...previous,
          backups: prevBackups.filter((item) => !deletedSet.has(item.name)),
        };
      });
      setMarkedForDelete((prev) => {
        const next = new Set(prev);
        deletedFiles.forEach((name) => next.delete(name));
        return next;
      });
      toast.success(`${deletedFiles.length} backup file(s) deleted`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete selected backups');
    },
  });

  const toggleMarkForDelete = (filename) => {
    setMarkedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const confirmDeleteMarked = () => {
    const names = [...markedForDelete];
    if (names.length === 0) return;

    const preview =
      names.length <= 5
        ? names.join('\n')
        : `${names.slice(0, 5).join('\n')}\n… and ${names.length - 5} more`;

    const ok = window.confirm(
      `Permanently delete ${names.length} backup file(s) from the server?\n\n${preview}`
    );
    if (!ok) return;

    deleteBackupsMutation.mutate(names);
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Backup File',
        render: (value) => (
          <span className="db-backups-filename" title={value}>
            <i className="fas fa-file-archive" aria-hidden />
            {value}
          </span>
        ),
      },
      {
        key: 'sizeBytes',
        header: 'Size',
        render: (value) => <span className="db-backups-size">{formatBytes(value)}</span>,
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (value) => <span className="db-backups-date">{formatDate(value)}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (_, row) => (
          <div className="db-backups-row-actions">
            <button
              type="button"
              className={`excel-btn small db-backups-btn-mark ${markedForDelete.has(row.name) ? 'is-marked' : ''}`}
              onClick={() => toggleMarkForDelete(row.name)}
              disabled={deleteBackupsMutation.isPending}
              aria-pressed={markedForDelete.has(row.name)}
            >
              <i className="fas fa-trash-alt" aria-hidden />
              {markedForDelete.has(row.name) ? 'Marked' : 'Mark'}
            </button>
            <button
              type="button"
              className="excel-btn secondary small"
              onClick={() => downloadBackupMutation.mutate(row.name)}
              disabled={downloadBackupMutation.isPending}
            >
              <i className="fas fa-download" aria-hidden />
              Download
            </button>
          </div>
        ),
      },
    ],
    [deleteBackupsMutation.isPending, downloadBackupMutation, markedForDelete]
  );

  const backups = data?.backups || [];
  const runBackupPending = runBackupMutation.isPending;
  const markedCount = markedForDelete.size;
  const scheduleDays = data?.schedule?.daysOfMonth?.join(', ') || '1, 8, 15, 22';
  const scheduleTz = data?.schedule?.timezone || 'Africa/Dar_es_Salaam';

  return (
    <AdminLayout>
      <div className="database-backups-page">
        <div className="excel-card db-backups-card">
          <div className="excel-card-header">
            <i className="fas fa-database" aria-hidden />
            <span className="admin-page-title">Database Backups</span>
            <div className="header-actions">
              <button
                type="button"
                className="excel-btn secondary small"
                onClick={() => runBackupMutation.mutate()}
                disabled={runBackupPending}
              >
                <i className={`fas ${runBackupPending ? 'fa-spinner fa-spin' : 'fa-plus-circle'}`} aria-hidden />
                {runBackupPending ? 'Generating…' : 'Generate Backup'}
              </button>
            </div>
          </div>

          <div className="excel-card-body db-backups-body">
            <p className="admin-page-description">
              Scheduled backups run four times per month (days {scheduleDays} at 02:00,{' '}
              {scheduleTz}). Only the latest {data?.retention?.maxFiles || 20} files are kept on
              the server.
            </p>

            <div className="db-backups-stats" role="list" aria-label="Backup summary">
              <article className="db-backups-stat db-backups-stat--schedule" role="listitem">
                <div className="db-backups-stat-icon" aria-hidden>
                  <i className="fas fa-calendar-check" />
                </div>
                <div className="db-backups-stat-content">
                  <span className="db-backups-stat-label">Schedule</span>
                  <strong>{data?.schedule?.frequency || '4 per month'}</strong>
                  <span className="db-backups-stat-hint">Days {scheduleDays}</span>
                </div>
              </article>
              <article className="db-backups-stat db-backups-stat--retention" role="listitem">
                <div className="db-backups-stat-icon" aria-hidden>
                  <i className="fas fa-layer-group" />
                </div>
                <div className="db-backups-stat-content">
                  <span className="db-backups-stat-label">Retention</span>
                  <strong>Latest {data?.retention?.maxFiles || 20} files</strong>
                  <span className="db-backups-stat-hint">Older files removed automatically</span>
                </div>
              </article>
              <article className="db-backups-stat db-backups-stat--count" role="listitem">
                <div className="db-backups-stat-icon" aria-hidden>
                  <i className="fas fa-hdd" />
                </div>
                <div className="db-backups-stat-content">
                  <span className="db-backups-stat-label">On Server</span>
                  <strong>{isLoading ? '…' : backups.length}</strong>
                  <span className="db-backups-stat-hint">
                    {backups.length === 1 ? 'backup file' : 'backup files'}
                  </span>
                </div>
              </article>
            </div>

            <section className="db-backups-panel" aria-labelledby="db-backups-list-heading">
              <div className="db-backups-panel-header">
                <div className="db-backups-panel-title-wrap">
                  <h2 id="db-backups-list-heading" className="db-backups-panel-title">
                    <i className="fas fa-list" aria-hidden />
                    Available Backups
                  </h2>
                  {markedCount > 0 && (
                    <span className="db-backups-marked-badge">
                      {markedCount} marked for deletion
                    </span>
                  )}
                </div>
                <div className="db-backups-panel-actions">
                  <button
                    type="button"
                    className="excel-btn danger small"
                    disabled={markedCount === 0 || deleteBackupsMutation.isPending}
                    onClick={confirmDeleteMarked}
                  >
                    <i
                      className={`fas ${deleteBackupsMutation.isPending ? 'fa-spinner fa-spin' : 'fa-trash'}`}
                      aria-hidden
                    />
                    {deleteBackupsMutation.isPending
                      ? 'Deleting…'
                      : markedCount > 0
                        ? `Delete Marked (${markedCount})`
                        : 'Delete Marked'}
                  </button>
                </div>
              </div>

              <div className="db-backups-table-frame">
                {isError ? (
                  <div className="db-backups-error" role="alert">
                    <i className="fas fa-exclamation-circle" aria-hidden />
                    <p>
                      {error?.response?.data?.message ||
                        error?.message ||
                        'Failed to load backups'}
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="db-backups-loading">
                    <SkeletonLoader type="card" height="120px" />
                    <SkeletonLoader type="card" height="120px" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="db-backups-empty">
                    <i className="fas fa-database" aria-hidden />
                    <h3>No backups yet</h3>
                    <p>Use &quot;Generate Backup&quot; to create your first database snapshot.</p>
                    <button
                      type="button"
                      className="excel-btn secondary small"
                      onClick={() => runBackupMutation.mutate()}
                      disabled={runBackupPending}
                    >
                      <i className="fas fa-plus-circle" aria-hidden />
                      Generate Backup
                    </button>
                  </div>
                ) : (
                  <DataTable
                    data={backups}
                    columns={columns}
                    searchable={false}
                    exportable
                    title=""
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseBackups;
