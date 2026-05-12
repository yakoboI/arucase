/**
 * Bulk Report - Step 5: Generate and Display Reports
 * UX aligned with individual report: clear context, PDF controls, auth-aware fetch, refetch.
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { reportsAPI } from '../../services/reports';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import './BulkReport.css';

const enc = (s) => encodeURIComponent(s || '');

const BulkReportGenerate = () => {
  const { form, stream, year, term } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAllStreams = stream === 'all';
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const apiYear = parseInt(year, 10);

  const termSelectionPath = `/reports/bulk/${enc(form)}/${enc(stream)}/${enc(year)}/term`;
  const yearSelectionPath = `/reports/bulk/${enc(form)}/${enc(stream)}/year`;

  const { data: bulkData, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['bulk-report', form, stream, year, term],
    queryFn: async () => {
      try {
        const res = await reportsAPI.getBulkReport(
          form,
          apiYear,
          term,
          isAllStreams ? null : stream
        );
        return res.data;
      } catch (err) {
        if (err.response?.status === 401) {
          const msg = err.response.data?.message || 'Authentication required';
          const expired = msg.toLowerCase().includes('expired');
          toast.error(expired ? 'Your session has expired. Please log in again.' : 'Authentication required. Please log in again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          throw new Error(msg);
        }
        if (err.response?.data?.message) {
          toast.error(err.response.data.message);
        } else if (err.request) {
          toast.error('Network error: could not reach the server.');
        }
        throw err;
      }
    },
    enabled: !!form && !!year && !!term,
    retry: (failureCount, err) => err?.response?.status !== 401 && failureCount < 1,
    refetchOnWindowFocus: false
  });

  const monthsLabel = useMemo(() => {
    const m = bulkData?.months;
    if (!Array.isArray(m) || m.length === 0) return '—';
    return m.join(' · ');
  }, [bulkData?.months]);

  const subjectCount = bulkData?.subjects?.length ?? 0;

  const streamLabel = isAllStreams ? 'All streams' : stream || '—';

  const handleDownloadPDF = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    let blobUrl = null;

    try {
      const encodedForm = encodeURIComponent(form);
      const encodedTerm = encodeURIComponent(term);

      let pdfUrl = `/reports/bulk/${encodedForm}/${year}/${encodedTerm}/pdf`;
      if (!isAllStreams && stream) {
        pdfUrl += `?stream=${encodeURIComponent(stream)}`;
      }

      const res = await api.get(pdfUrl, {
        responseType: 'blob',
        timeout: 300000,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable && progressEvent.total && progressEvent.total > 0) {
            const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 90);
            setDownloadProgress(Math.min(percentCompleted, 90));
          } else if (progressEvent.loaded > 0) {
            const estimatedTotal = 5 * 1024 * 1024;
            const percentCompleted = Math.round((progressEvent.loaded / estimatedTotal) * 90);
            setDownloadProgress(Math.min(percentCompleted, 90));
          } else {
            setDownloadProgress((prev) => (prev < 90 ? Math.min(prev + 2, 90) : prev));
          }
        }
      });

      setDownloadProgress(90);

      if (!res.data) {
        throw new Error('No data received from server');
      }

      let blob;
      if (res.data instanceof Blob) {
        if (res.data.type && !res.data.type.includes('application/pdf')) {
          const text = await res.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Error generating PDF');
          } catch (parseError) {
            throw new Error('Invalid PDF file received from server');
          }
        }
        blob = res.data;
      } else {
        blob = new Blob([res.data], { type: 'application/pdf' });
      }

      if (blob.size < 10000) {
        if (blob.size < 5000) {
          const text = await blob.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Error generating PDF');
          } catch {
            throw new Error('PDF file appears to be corrupted or empty');
          }
        }
        throw new Error('PDF file appears to be corrupted or empty');
      }

      blobUrl = window.URL.createObjectURL(blob);

      const sanitizedTerm = term.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const sanitizedForm = form.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const filename = `bulk_report_${sanitizedForm}_${year}_${sanitizedTerm}${stream && stream !== 'all' ? '_' + stream : ''}.pdf`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        if (blobUrl) {
          window.URL.revokeObjectURL(blobUrl);
        }
      }, 100);

      setDownloadProgress(100);
      toast.success(`Bulk PDF downloaded (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, { autoClose: 5000 });
    } catch (error) {
      console.error('Bulk PDF Download Error:', error);

      let errorMessage = 'Error downloading bulk PDF';

      if (error.response) {
        if (error.response.status === 401) {
          const authMessage = error.response.data?.message || 'Authentication required';
          const isTokenExpired = authMessage.toLowerCase().includes('expired');
          errorMessage = isTokenExpired
            ? 'Your session has expired. Please log in again.'
            : 'Authentication required. Please log in again.';
          toast.error(errorMessage, { autoClose: 3000 });
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid request for bulk PDF generation.';
          const suggestion = error.response.data?.suggestion;
          if (suggestion) {
            errorMessage += `\n\n${suggestion}`;
          }
        } else if (error.response.status === 404) {
          errorMessage = 'No students found for this class.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error generating bulk PDF. For large classes this can take several minutes — try again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to download bulk reports.';
        } else if (error.response.status === 408 || error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Bulk PDF generation can take a long time — try again.';
        } else {
          errorMessage = `Download failed: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (error.response?.status !== 401) {
        toast.error(errorMessage, { autoClose: error.response?.status === 400 ? 10000 : 7000 });
      }
    } finally {
      if (blobUrl) {
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 500);
    }
  };

  const handleViewIndividual = (admNo, studentStream) => {
    const reportStream = studentStream || stream;
    navigate(`/reports/individual/${enc(form)}/${enc(reportStream)}/${enc(year)}/${enc(term)}/${enc(admNo)}`);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['bulk-report', form, stream, year, term] });
  };

  if (isLoading && !bulkData) {
    return (
      <AdminLayout>
        <div className="bulk-report-page bulk-report-generate">
          <div className="breadcrumb">
            <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
            <Link to={yearSelectionPath}>{form}</Link> &gt;{' '}
            <Link to={termSelectionPath}>{year}</Link> &gt; {term}
          </div>
          <div className="bulk-generate-skeleton excel-card">
            <div className="excel-card-header">
              <span className="bulk-generate-skeleton-line bulk-generate-skeleton-line--short" />
            </div>
            <div className="excel-card-body">
              <div className="bulk-generate-skeleton-grid">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="bulk-generate-skeleton-stat">
                    <span className="bulk-generate-skeleton-line bulk-generate-skeleton-line--tiny" />
                    <span className="bulk-generate-skeleton-line bulk-generate-skeleton-line--med" />
                  </div>
                ))}
              </div>
              <div className="bulk-generate-skeleton-toolbar">
                <span className="bulk-generate-skeleton-line bulk-generate-skeleton-line--btn" />
              </div>
              <div className="bulk-generate-skeleton-table">
                {[1, 2, 3, 4, 5, 6].map((r) => (
                  <div key={r} className="bulk-generate-skeleton-row">
                    <span className="bulk-generate-skeleton-line" />
                    <span className="bulk-generate-skeleton-line bulk-generate-skeleton-line--med" />
                    <span className="bulk-generate-skeleton-line bulk-generate-skeleton-line--short" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="bulk-generate-loading-hint">Loading class list and summaries…</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bulk-report-page bulk-report-generate">
          <div className="breadcrumb">
            <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
            <Link to={yearSelectionPath}>{form}</Link> &gt;{' '}
            <Link to={termSelectionPath}>{year}</Link> &gt; {term}
          </div>
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-exclamation-triangle" /> Could not load bulk report
            </div>
            <div className="excel-card-body">
              <p className="error">{error.message || 'Unknown error'}</p>
              <div className="bulk-generate-actions-row">
                <button type="button" className="excel-btn" onClick={() => refetch()}>
                  <i className="fas fa-redo" /> Try again
                </button>
                <Link to="/reports/bulk" className="excel-btn excel-btn--outline">
                  <i className="fas fa-arrow-left" /> Back to form selection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!bulkData || !bulkData.students || bulkData.students.length === 0) {
    return (
      <AdminLayout>
        <div className="bulk-report-page bulk-report-generate">
          <div className="breadcrumb">
            <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
            <Link to={yearSelectionPath}>{form}</Link> &gt;{' '}
            <Link to={termSelectionPath}>{year}</Link> &gt; {term}
          </div>
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-users-slash" /> No students found
            </div>
            <div className="excel-card-body">
              <p>
                No students found for <strong>{form}</strong> · <strong>{year}</strong> · <strong>{term}</strong>
                {stream && stream !== 'all' && (
                  <>
                    {' '}
                    · Stream <strong>{stream}</strong>
                  </>
                )}
                .
              </p>
              <p className="bulk-generate-help">
                Confirm registrations in <strong>Student Registration</strong> (level, year, stream). The database year
                must match <strong>{year}</strong>.
              </p>
              <div className="bulk-generate-actions-row">
                <Link to={termSelectionPath} className="excel-btn">
                  <i className="fas fa-calendar-alt" /> Change term
                </Link>
                <Link to="/reports/bulk" className="excel-btn excel-btn--outline">
                  <i className="fas fa-arrow-left" /> Back to form selection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const students = bulkData.students || [];
  const reports = bulkData.reports || [];
  const totalStudents = bulkData.total_students || students.length;

  return (
    <AdminLayout>
      <div className="bulk-report-page bulk-report-generate">
        <div className="breadcrumb">
          <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
          <Link to={yearSelectionPath}>{form}</Link> &gt;{' '}
          <Link to={termSelectionPath}>{year}</Link> &gt; <span className="breadcrumb-current">{term}</span> &gt;{' '}
          <span className="breadcrumb-current">Generate</span>
        </div>

        <div className="page-header bulk-generate-page-header">
          <h1>
            <i className="fas fa-layer-group bulk-generate-title-icon" aria-hidden />
            Bulk student reports
          </h1>
          <p>
            Review summaries, open any student&apos;s full report, or download one PDF for the whole class. Same data
            pipeline as individual reports.
          </p>
        </div>

        <div className="bulk-generate-summary-grid" aria-label="Class summary">
          <div className="bulk-generate-stat">
            <span className="bulk-generate-stat-label">Students</span>
            <span className="bulk-generate-stat-value">{totalStudents}</span>
          </div>
          <div className="bulk-generate-stat">
            <span className="bulk-generate-stat-label">Subjects</span>
            <span className="bulk-generate-stat-value">{subjectCount}</span>
          </div>
          <div className="bulk-generate-stat bulk-generate-stat--wide">
            <span className="bulk-generate-stat-label">Assessment months (this term)</span>
            <span className="bulk-generate-stat-value bulk-generate-stat-value--small">{monthsLabel}</span>
          </div>
          <div className="bulk-generate-stat">
            <span className="bulk-generate-stat-label">Stream</span>
            <span className="bulk-generate-stat-value">{streamLabel}</span>
          </div>
        </div>

        <div className="excel-card bulk-generate-toolbar-card">
          <div className="excel-card-header">
            <i className="fas fa-file-pdf" /> Download &amp; refresh
          </div>
          <div className="excel-card-body">
            <div className="download-section">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="download-btn"
                disabled={isDownloading || isLoading || !bulkData}
                title={isDownloading ? 'Generating PDF…' : 'Download all reports as one PDF'}
              >
                {isDownloading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> Generating PDF…{' '}
                    {downloadProgress > 0 ? `${downloadProgress}%` : null}
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-download" /> Download all reports as PDF
                  </>
                )}
              </button>
              {isDownloading && downloadProgress > 0 && (
                <div className="download-progress-bar">
                  <div className="download-progress-fill" style={{ width: `${downloadProgress}%` }} />
                </div>
              )}
              <p className="bulk-generate-pdf-hint">
                Large classes can take several minutes. Keep this tab open until the download starts.
              </p>
            </div>

            <div className="bulk-generate-actions-row bulk-generate-actions-row--toolbar">
              <button
                type="button"
                className="excel-btn excel-btn--outline"
                onClick={handleRefresh}
                disabled={isFetching}
                title="Reload summaries from the server"
              >
                {isFetching ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sync-alt" />}{' '}
                {isFetching ? 'Refreshing…' : 'Refresh data'}
              </button>
              <Link to={termSelectionPath} className="excel-btn excel-btn--outline">
                <i className="fas fa-calendar-alt" /> Change term
              </Link>
              <Link to={yearSelectionPath} className="excel-btn excel-btn--outline">
                <i className="fas fa-calendar" /> Change year
              </Link>
              <Link to="/reports/individual" className="excel-btn excel-btn--ghost">
                <i className="fas fa-user" /> Individual report wizard
              </Link>
            </div>
          </div>
        </div>

        <div className="bulk-reports-list">
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-list" /> Students &amp; summaries
            </div>
            <div className="excel-card-body">
              <div className="excel-table-wrapper">
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th>Admission No.</th>
                      <th>Name</th>
                      <th>Stream</th>
                      <th>Average</th>
                      <th>Grade</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const report = reports.find((r) => r.student.adm_no === student.adm_no);
                      const summary = report?.summary_data || {};
                      let studentName = 'N/A';
                      if (student.first_name && student.surname) {
                        const parts = [student.first_name];
                        if (student.middle_name) {
                          parts.push(student.middle_name);
                        }
                        parts.push(student.surname);
                        studentName = parts.join(' ').trim();
                      } else if (student.first_name) {
                        studentName = student.first_name;
                      } else if (student.surname) {
                        studentName = student.surname;
                      } else if (student.name) {
                        studentName = student.name;
                      } else if (student.full_name) {
                        studentName = student.full_name;
                      }

                      return (
                        <tr key={student.adm_no}>
                          <td>{student.adm_no}</td>
                          <td>{studentName}</td>
                          <td>{student.stream || stream || 'N/A'}</td>
                          <td>{summary.average ?? '—'}</td>
                          <td>{summary.grade ?? '—'}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleViewIndividual(student.adm_no, student.stream)}
                              className="excel-btn small"
                            >
                              <i className="fas fa-file-alt" /> View report
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BulkReportGenerate;
