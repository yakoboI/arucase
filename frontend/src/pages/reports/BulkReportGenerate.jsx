/**
 * Bulk Report - Step 5: Generate and Display Reports
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { reportsAPI } from '../../services/reports';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import './BulkReport.css';

const BulkReportGenerate = () => {
  const { form, stream, year, term } = useParams();
  const navigate = useNavigate();
  const isAllStreams = stream === 'all';
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = parseInt(year);

  // Fetch students for bulk report
  const { data: bulkData, isLoading, error } = useQuery({
    queryKey: ['bulk-report', form, stream, year, term],
    queryFn: async () => {
      const res = await reportsAPI.getBulkReport(
        form,
        apiYear,
        term,
        isAllStreams ? null : stream
      );
      return res.data;
    },
    enabled: !!form && !!year && !!term
  });

  const handleDownloadPDF = async () => {
    if (isDownloading) return; // Prevent multiple simultaneous downloads
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    let blobUrl = null;
    
    try {
      // Show initial progress
      setDownloadProgress(0);
      
      // Encode parameters for URL
      const encodedForm = encodeURIComponent(form);
      const encodedStream = encodeURIComponent(isAllStreams ? '' : (stream || ''));
      const encodedTerm = encodeURIComponent(term);
      
      // Build URL with query parameters
      let pdfUrl = `/reports/bulk/${encodedForm}/${year}/${encodedTerm}/pdf`;
      if (!isAllStreams && stream) {
        pdfUrl += `?stream=${encodeURIComponent(stream)}`;
      }
      
      // Make request with timeout and progress tracking
      const res = await api.get(pdfUrl, {
        responseType: 'blob',
        timeout: 300000, // 5 minute timeout for bulk PDF generation
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable && progressEvent.total && progressEvent.total > 0) {
            // Calculate actual percentage from 0% to 90% (download phase)
            const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 90);
            setDownloadProgress(Math.min(percentCompleted, 90));
          } else if (progressEvent.loaded > 0) {
            // If we have loaded bytes but no total, estimate progress
            // Assume average bulk PDF is around 5MB, scale accordingly
            const estimatedTotal = 5 * 1024 * 1024; // 5MB estimate
            const percentCompleted = Math.round((progressEvent.loaded / estimatedTotal) * 90);
            setDownloadProgress(Math.min(percentCompleted, 90));
          } else {
            // Fallback: simulate progress incrementally
            setDownloadProgress(prev => {
              if (prev < 90) {
                return Math.min(prev + 2, 90);
              }
              return prev;
            });
          }
        }
      });
      
      setDownloadProgress(90);
      
      // Validate response
      if (!res.data) {
        throw new Error('No data received from server');
      }
      
      // Check if response is actually a PDF blob
      let blob;
      if (res.data instanceof Blob) {
        // Check content type
        if (res.data.type && !res.data.type.includes('application/pdf')) {
          // Might be an error JSON wrapped in blob
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
        // Fallback: create blob from data
        blob = new Blob([res.data], { type: 'application/pdf' });
      }
      
      // Validate blob size (should be reasonable for a bulk PDF - at least 10KB)
      if (blob.size < 10000) {
        // Check if it's an error message
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
      
      // Create download URL
      blobUrl = window.URL.createObjectURL(blob);
      
      // Generate filename with proper formatting
      const sanitizedTerm = term.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const sanitizedForm = form.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const filename = `bulk_report_${sanitizedForm}_${year}_${sanitizedTerm}${stream && stream !== 'all' ? '_' + stream : ''}.pdf`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        if (blobUrl) {
          window.URL.revokeObjectURL(blobUrl);
        }
      }, 100);
      
      setDownloadProgress(100);
      
      // Success notification
      toast.success(`Bulk PDF downloaded successfully! (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, {
        autoClose: 5000,
      });
      
    } catch (error) {
      console.error('Bulk PDF Download Error:', error);
      
      let errorMessage = 'Error downloading bulk PDF';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          const authMessage = error.response.data?.message || 'Authentication required';
          const isTokenExpired = authMessage.toLowerCase().includes('expired') || 
                                authMessage.toLowerCase().includes('token expired');
          
          if (isTokenExpired) {
            errorMessage = 'Your session has expired. Please log in again.';
            toast.error(errorMessage, { autoClose: 3000 });
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else {
            errorMessage = 'Authentication required. Please log in again.';
            toast.error(errorMessage, { autoClose: 3000 });
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        } else if (error.response.status === 400) {
          // Handle the specific case where monthly results are required instead of term-based
          errorMessage = error.response.data?.message || 'Invalid request for bulk PDF generation.';
          const suggestion = error.response.data?.suggestion;
          if (suggestion) {
            errorMessage += `\n\n${suggestion}`;
          }
        } else if (error.response.status === 404) {
          errorMessage = 'No students found for this class. Please verify the selection.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error generating bulk PDF. This may take a while for large classes. Please try again.';
        } else if (error.response.status === 403) {
          errorMessage = 'Permission denied. You may not have access to download bulk reports.';
        } else if (error.response.status === 408 || error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout. Bulk PDF generation takes time. Please try again or contact support.';
        } else {
          errorMessage = `Download failed: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        // Error in request setup or other error
        errorMessage = error.message;
      }
      
      if (error.response?.status !== 401) {
        const duration = error.response?.status === 400 ? 10000 : 7000; // Show 400 errors longer
        toast.error(errorMessage, {
          autoClose: duration,
        });
      }
      
    } finally {
      // Cleanup blob URL if it exists
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
    navigate(`/reports/individual/${form}/${reportStream}/${year}/${term}/${admNo}`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="bulk-report-page">
          <div className="loading">Loading bulk reports...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bulk-report-page">
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-exclamation-triangle"></i> Error
            </div>
            <div className="excel-card-body">
              <p className="error">Error loading bulk reports: {error.message}</p>
              <div className="action-buttons mt-20">
                <Link to="/reports/bulk" className="excel-btn">
                  <i className="fas fa-arrow-left"></i> Back to Form Selection
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
        <div className="bulk-report-page">
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-exclamation-triangle"></i> No Students Found
            </div>
            <div className="excel-card-body">
              <p>No students found for {form} {year} {term}.</p>
              <p style={{ marginTop: '12px', color: '#64748b', fontSize: '0.95rem', maxWidth: '520px' }}>
                Common causes: no students registered for this class and year in <strong>Student Registration</strong>,
                or the class year in the database does not match <strong>{year}</strong>.
                If you expect students here, confirm their <strong>level</strong>, <strong>year</strong>, and <strong>stream</strong> in the student list.
              </p>
              <div className="action-buttons mt-20">
                <Link to="/reports/bulk" className="excel-btn">
                  <i className="fas fa-arrow-left"></i> Back to Form Selection
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
      <div className="bulk-report-page">
        <div className="breadcrumb">
          <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
          <Link to={`/reports/bulk/${form}/${stream}/year`}>{form}</Link> &gt;{' '}
          <Link to={`/reports/bulk/${form}/${stream}/${year}/term`}>{year}</Link> &gt; {term}
        </div>

        <div className="bulk-report-actions">
          <button 
            type="button"
            onClick={handleDownloadPDF} 
            className="excel-btn" 
            style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
            disabled={isDownloading || isLoading || !bulkData}
            title={isDownloading ? 'Downloading...' : 'Download All Reports as PDF'}
          >
            {isDownloading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> 
                Downloading PDF... {downloadProgress > 0 && `${downloadProgress}%`}
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf"></i> Download All Reports as PDF
              </>
            )}
          </button>
          {isDownloading && downloadProgress > 0 && (
            <div className="download-progress-bar" style={{ marginTop: '10px', width: '100%', maxWidth: '400px', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                className="download-progress-fill" 
                style={{ 
                  width: `${downloadProgress}%`, 
                  height: '100%', 
                  backgroundColor: '#4caf50', 
                  transition: 'width 0.3s ease',
                  borderRadius: '4px'
                }}
              ></div>
            </div>
          )}
          <div className="bulk-report-info">
            <i className="fas fa-info-circle"></i>
            Showing {totalStudents} student{totalStudents !== 1 ? 's' : ''} for {form} {year} {term}
            {stream && stream !== 'all' && ` (Stream: ${stream})`}
            {isDownloading && (
              <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9rem' }}>
                Generating PDF for {totalStudents} student{totalStudents !== 1 ? 's' : ''}... This may take a few minutes.
              </span>
            )}
          </div>
        </div>

        <div className="bulk-reports-list">
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-list"></i> Students List
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
                    const report = reports.find(r => r.student.adm_no === student.adm_no);
                    const summary = report?.summary_data || {};
                    // Construct name from database fields: first_name, middle_name, surname
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
                        <td>{summary.average || '-'}</td>
                        <td>{summary.grade || '-'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleViewIndividual(student.adm_no, student.stream)}
                            className="excel-btn small"
                          >
                            <i className="fas fa-eye"></i> View Report
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

