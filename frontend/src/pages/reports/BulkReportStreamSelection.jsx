/**
 * Bulk Report - Step 4: Stream Selection (for Forms V/VI)
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './BulkReport.css';

const BulkReportStreamSelection = () => {
  const { form, stream, year, term } = useParams();
  const navigate = useNavigate();

  const streams = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];

  const handleStreamClick = (selectedStream) => {
    navigate(`/reports/bulk/${encodeURIComponent(form)}/${encodeURIComponent(selectedStream)}/${encodeURIComponent(year)}/${encodeURIComponent(term)}/generate`);
  };

  const handleAllStreamsClick = () => {
    navigate(`/reports/bulk/${encodeURIComponent(form)}/all/${encodeURIComponent(year)}/${encodeURIComponent(term)}/generate`);
  };

  return (
    <AdminLayout>
      <div className="bulk-report-page">
        <div className="breadcrumb">
          <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
          <Link to={`/reports/bulk/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/year`}>{form}</Link> &gt;{' '}
          <Link to={`/reports/bulk/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`}>{year}</Link> &gt; {term}
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-stream"></i> Bulk Report - Select Stream
          </div>
          <div className="excel-card-body">
            <div className="info-banner">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>{form} - {year} - {term}</strong>
                <p>Select a stream to generate bulk reports, or choose "All Streams" to generate reports for all students across all streams.</p>
              </div>
            </div>
            
            <div className="stream-grid">
              {/* All Streams Option */}
              <button
                type="button"
                onClick={handleAllStreamsClick}
                className="stream-card all-streams"
              >
                <div className="stream-icon">
                  <i className="fas fa-layer-group"></i>
                </div>
                <div className="stream-name">All Streams</div>
                <div className="stream-subtitle">Generate reports for all streams</div>
              </button>
              
              {/* Individual Streams */}
              {streams.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => handleStreamClick(s)}
                  className="stream-card"
                >
                  <div className="stream-icon">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <div className="stream-name">{s}</div>
                  <div className="stream-subtitle">{form} {s}</div>
                </button>
              ))}
            </div>
            
            <div className="action-buttons mt-20">
              <Link
                to={`/reports/bulk/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`}
                className="excel-btn"
              >
                <i className="fas fa-arrow-left"></i> Back to Term Selection
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BulkReportStreamSelection;

