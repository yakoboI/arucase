/**
 * Fees Announcements Management Page
 * Manage up to 10 announcements per class
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './FeesManagement.css';

const FeesManagement = ({ formLevel }) => {
  const { year, stream, term } = useParams();
  const queryClient = useQueryClient();
  
  const [announcements, setAnnouncements] = useState({});

  // Normalize form level
  const normalizedLevel = useMemo(() => {
    if (!formLevel) return '';
    return formLevel.split('-').map(w => {
      const lower = w.toLowerCase();
      if (['i', 'ii', 'iii', 'iv', 'v', 'vi'].includes(lower)) {
        return lower.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }, [formLevel]);
  
  // Normalize stream: NA -> A (match backend normalizeStream logic)
  const normalizedStream = useMemo(() => {
    return stream ? (stream.trim().toUpperCase() === 'NA' ? 'A' : stream.trim()) : 'A';
  }, [stream]);
  
  // Decode URL-encoded term parameter (e.g., "Term%20II" -> "Term II")
  const normalizedTerm = useMemo(() => {
    const decodedTerm = term ? decodeURIComponent(term) : null;
    return decodedTerm || 'Term I';
  }, [term]);

  // Fetch existing announcements
  const { data: existingAnnouncements = {}, isLoading, error } = useQuery({
    queryKey: ['fees-announcements', normalizedLevel, normalizedStream, year, normalizedTerm],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getFeesAnnouncements({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          term: normalizedTerm,
        });
        return res.data.announcements || {};
      } catch (error) {
        console.error('Error fetching fees announcements:', error);
        return {};
      }
    },
    enabled: !!normalizedLevel && !!normalizedStream && !!year && !!normalizedTerm && !!localStorage.getItem('token'),
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Initialize announcements from existing data
  useEffect(() => {
    try {
      // Always set announcements, even if empty (to clear previous term's data)
      setAnnouncements(existingAnnouncements || {});
    } catch (error) {
      console.error('Error initializing announcements:', error);
      setAnnouncements({});
    }
  }, [existingAnnouncements, normalizedTerm]);

  // Save announcements mutation
  const saveMutation = useMutation({
    mutationFn: async (announcementsData) => {
      return studentsAPI.saveFeesAnnouncements({
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        term: normalizedTerm,
        announcements: announcementsData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fees-announcements', normalizedLevel, normalizedStream, year, normalizedTerm]);
      toast.success('Fees announcements updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save announcements');
    },
  });

  const handleChange = useCallback((index, value) => {
    setAnnouncements(prev => ({ ...prev, [index]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    saveMutation.mutate(announcements);
  }, [announcements, saveMutation]);

  const getBackPath = useCallback(() => {
    const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';
    return isFormVOrVI
      ? `/admin/fees/${formLevel}/stream/${stream}/years`
      : `/admin/fees/${formLevel}/years`;
  }, [normalizedLevel, formLevel, stream]);

  const getOtherTermPath = useCallback(() => {
    const otherTerm = normalizedTerm === 'First Term' ? 'Second Term' : 'First Term';
    const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';
    const encodedTerm = encodeURIComponent(otherTerm);
    return isFormVOrVI
      ? `/admin/fees/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}`
      : `/admin/fees/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}`;
  }, [normalizedTerm, normalizedLevel, formLevel, stream, year]);

  return (
    <AdminLayout>
      <div className="fees-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-money-bill-wave"></i>
            Fees Announcements - {normalizedLevel} {normalizedStream} {year} - {normalizedTerm}
            <div className="header-actions">
              <Link to={getOtherTermPath()} className="excel-btn secondary small" style={{ pointerEvents: 'auto' }}>
                <i className="fas fa-exchange-alt"></i> Switch to {normalizedTerm === 'First Term' ? 'Second Term' : 'First Term'}
              </Link>
              <Link to={getBackPath()} className="excel-btn secondary small" style={{ pointerEvents: 'auto' }}>
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : error ? (
              <div className="error-state">
                <p>Error loading fees announcements. Please try again.</p>
                <p style={{ fontSize: '12px', color: '#666' }}>{error.message || 'Unknown error'}</p>
              </div>
            ) : (
              <>
                <p className="fees-description">Enter fees announcements and important information for students. These will appear in the instructions section of student reports.</p>

                <form onSubmit={handleSubmit} className="fees-form">
                  <div className="table-container">
                    <table className="excel-table announcements-table">
                      <thead>
                        <tr>
                          <th className="table-serial-number">S/N</th>
                          <th>MATANGAZO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((index) => (
                          <tr key={index}>
                            <td className="table-center">{index}</td>
                            <td>
                              <textarea
                                name={`announcement_${index}`}
                                className="announcement-input"
                                placeholder="Enter fees announcement or information..."
                                rows="2"
                                value={announcements[index.toString()] || ''}
                                onChange={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = e.target.scrollHeight + 'px';
                                  handleChange(index.toString(), e.target.value);
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="fees-actions">
                    <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                      <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Announcements'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FeesManagement;

