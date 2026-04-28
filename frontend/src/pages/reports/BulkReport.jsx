/**
 * Bulk Student Report - Multi-step Wizard
 * Step 1: Form Selection (with Stream for Form V/VI)
 */
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './BulkReport.css';

const BulkReport = () => {
  const navigate = useNavigate();
  const { form } = useParams();
  const location = useLocation();
  const isStreamSelection = location.pathname.includes('/stream');

  const forms = [
    { name: 'FORM I', code: 'FORM I', stream: 'NA', hasStreams: false },
    { name: 'FORM II', code: 'FORM II', stream: 'NA', hasStreams: false },
    { name: 'FORM III', code: 'FORM III', stream: 'NA', hasStreams: false },
    { name: 'FORM IV', code: 'FORM IV', stream: 'NA', hasStreams: false },
    { 
      name: 'FORM V', 
      code: 'FORM V', 
      hasStreams: true,
      streams: ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM']
    },
    { 
      name: 'FORM VI', 
      code: 'FORM VI', 
      hasStreams: true,
      streams: ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM']
    }
  ];

  const handleFormClick = (form) => {
    if (form.hasStreams) {
      navigate(`/reports/bulk/${encodeURIComponent(form.code)}/stream`);
    } else {
      navigate(`/reports/bulk/${encodeURIComponent(form.code)}/${encodeURIComponent(form.stream)}/year`);
    }
  };

  const handleStreamClick = (formCode, stream) => {
    navigate(`/reports/bulk/${encodeURIComponent(formCode)}/${encodeURIComponent(stream)}/year`);
  };

  // If we're on the stream selection route, show only streams for the selected form
  if (isStreamSelection && form) {
    const selectedForm = forms.find(f => f.code === form);
    if (!selectedForm || !selectedForm.hasStreams) {
      navigate('/reports/bulk');
      return null;
    }

    return (
      <AdminLayout>
        <div className="bulk-report-page">
          <div className="breadcrumb">
            <Link to="/reports/bulk">Bulk Student Report</Link> &gt; {form}
          </div>

          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-layer-group"></i> Select Stream
            </div>
            <div className="excel-card-body">
              <p className="instruction-text">Select a stream for {form}</p>
              <div className="streams-grid">
                {selectedForm.streams.map((stream) => (
                  <button
                    type="button"
                    key={stream}
                    onClick={() => handleStreamClick(selectedForm.code, stream)}
                    className="stream-card"
                  >
                    <i className="fas fa-check-circle bulk-report-hover-tick"></i>
                    <div className="stream-icon">
                      <i className="fas fa-layer-group"></i>
                    </div>
                    <div className="stream-info">
                      <h4>{stream}</h4>
                      <p>{selectedForm.name} - {stream}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Default: Show all forms
  return (
    <AdminLayout>
      <div className="bulk-report-page">
        <div className="page-header">
          <h1>Bulk Student Report</h1>
          <p>Generate reports for all students in a class</p>
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-copy"></i> Bulk Report - Select Form
          </div>
          <div className="excel-card-body">
            <p className="instruction-text">Select a form to generate bulk reports for all students</p>
            <div className="forms-grid">
              {forms.map((form) => (
                form.hasStreams ? (
                  <div key={form.code} className="form-card-with-streams">
                    <div 
                      className="form-card-header"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleFormClick(form)}
                      title="Click to view stream selection page"
                    >
                      <h3>{form.name}</h3>
                      <p>Select Stream:</p>
                    </div>
                    <div className="streams-grid">
                      {form.streams.map((stream) => (
                        <button
                          type="button"
                          key={stream}
                          onClick={() => handleStreamClick(form.code, stream)}
                          className="stream-card"
                        >
                          <i className="fas fa-check-circle bulk-report-hover-tick"></i>
                          <div className="stream-icon">
                            <i className="fas fa-layer-group"></i>
                          </div>
                          <div className="stream-info">
                            <h4>{stream}</h4>
                            <p>{form.name} - {stream}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    key={form.code}
                    onClick={() => handleFormClick(form)}
                    className="form-card"
                  >
                    <i className="fas fa-check-circle bulk-report-hover-tick"></i>
                    <div className="form-icon">
                      <i className="fas fa-graduation-cap"></i>
                    </div>
                    <div className="form-info">
                      <h3>{form.name}</h3>
                      <p>Click to select year and term</p>
                    </div>
                    <div className="form-arrow">
                      <i className="fas fa-chevron-right"></i>
                    </div>
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BulkReport;
