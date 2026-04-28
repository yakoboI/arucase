/**
 * Promotion Preview Page
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './Promotion.css';

const PromotionPreview = ({ formLevel }) => {
  const { year, stream } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [excludedAdmNos, setExcludedAdmNos] = useState([]);
  const [selectedStream, setSelectedStream] = useState('');

  // Normalize form level
  const normalizedLevel = (formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '').toUpperCase();
  
  // In DB, FORM I-IV use stream = 'NA' (not A/B). For FORM V/VI, stream is PCM/PCB/etc.
  const normalizedStreamFromRoute = (stream ?? '').toString().trim().toUpperCase();
  const normalizedStream = (
    normalizedLevel === 'FORM I' ||
    normalizedLevel === 'FORM II' ||
    normalizedLevel === 'FORM III' ||
    normalizedLevel === 'FORM IV'
  )
    ? 'NA'
    : (normalizedStreamFromRoute || 'NA');

  // Get promotion preview data
  const { data: previewData, isLoading } = useQuery({
    queryKey: ['promotion-preview', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      const res = await adminAPI.getPromotionPreview({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      return res.data;
    },
  });

  // Initialize excluded students
  useEffect(() => {
    if (previewData?.excluded_adm_nos) {
      setExcludedAdmNos(previewData.excluded_adm_nos);
    }
  }, [previewData]);

  // Execute promotion mutation
  const executeMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.executePromotion(data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['promotion-sessions']);
      toast.success(response.data.message || 'Promotion completed successfully!');
      navigate('/admin/promotion');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to execute promotion');
    },
  });

  const handleToggleExclude = (admNo) => {
    setExcludedAdmNos(prev => 
      prev.includes(admNo)
        ? prev.filter(a => a !== admNo)
        : [...prev, admNo]
    );
  };

  const handleExecute = () => {
    if (!previewData) return;
    
    if (previewData.requires_stream_selection && !selectedStream) {
      toast.error('Please select a stream for the next level');
      return;
    }

    if (window.confirm(`Are you sure you want to promote ${previewData.students?.length - excludedAdmNos.length} students?`)) {
      executeMutation.mutate({
        from_level: normalizedLevel,
        from_stream: normalizedStream,
        from_year: parseInt(year),
        to_level: previewData.next_level,
        to_stream: previewData.requires_stream_selection ? selectedStream : previewData.next_stream,
        to_year: previewData.next_year,
        excluded_adm_nos: excludedAdmNos,
      });
    }
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/promotion/${formLevel}/streams`;
    } else {
      return `/admin/promotion/${formLevel}/years`;
    }
  };

  const formVVIStreams = ['PCM', 'PCB', 'EGM', 'HGE', 'HGL', 'PGM'];

  return (
    <AdminLayout>
      <div className="promotion-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            Promotion Preview - {normalizedLevel} {normalizedStream} {year}
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading promotion preview...</div>
            ) : previewData ? (
              <>
                {previewData.already_promoted && (
                  <div className="warning-banner">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Warning: Promotion has already been executed for this class!</span>
                  </div>
                )}

                <div className="promotion-info">
                  <div className="info-card">
                    <h4>From</h4>
                    <p>{normalizedLevel} {normalizedStream} {year}</p>
                  </div>
                  <div className="info-card">
                    <h4>To</h4>
                    <p>{previewData.next_level} {previewData.requires_stream_selection ? '(Select Stream)' : previewData.next_stream} {previewData.next_year}</p>
                  </div>
                  <div className="info-card">
                    <h4>Total Students</h4>
                    <p>{previewData.students?.length || 0}</p>
                  </div>
                  <div className="info-card">
                    <h4>To Promote</h4>
                    <p>{previewData.students?.length - excludedAdmNos.length}</p>
                  </div>
                </div>

                {previewData.requires_stream_selection && (
                  <div className="stream-selection">
                    <label>Select Stream for {previewData.next_level}:</label>
                    <select
                      value={selectedStream}
                      onChange={(e) => setSelectedStream(e.target.value)}
                      className="excel-input"
                    >
                      <option value="">Select Stream</option>
                      {formVVIStreams.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="students-list-section">
                  <h3>Students</h3>
                  <p className="section-hint">
                    Uncheck students to exclude them from promotion (repeaters)
                  </p>
                  <div className="students-table-container">
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={excludedAdmNos.length === 0 && previewData.students?.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExcludedAdmNos([]);
                                } else {
                                  setExcludedAdmNos(previewData.students?.map(s => s.adm_no) || []);
                                }
                              }}
                            />
                          </th>
                          <th>S/N</th>
                          <th>Adm No</th>
                          <th>First Name</th>
                          <th>Middle Name</th>
                          <th>Surname</th>
                          <th>Sex</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.students?.map((student, index) => {
                          const isExcluded = excludedAdmNos.includes(student.adm_no);
                          return (
                            <tr key={student.adm_no} className={isExcluded ? 'excluded-row' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => handleToggleExclude(student.adm_no)}
                                />
                              </td>
                              <td>{index + 1}</td>
                              <td>{student.adm_no}</td>
                              <td>{student.first_name}</td>
                              <td>{student.middle_name || '-'}</td>
                              <td>{student.surname}</td>
                              <td>{student.sex}</td>
                              <td>
                                {isExcluded ? (
                                  <span className="status-badge badge-inactive">Excluded</span>
                                ) : (
                                  <span className="status-badge badge-active">To Promote</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="promotion-actions">
                  <button
                    onClick={handleExecute}
                    className="excel-btn primary large"
                    disabled={executeMutation.isPending || (previewData.requires_stream_selection && !selectedStream)}
                  >
                    <i className="fas fa-graduation-cap"></i> {executeMutation.isPending ? 'Promoting...' : 'Promote Students'}
                  </button>
                </div>
              </>
            ) : (
              <div className="no-data">No preview data available</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PromotionPreview;

