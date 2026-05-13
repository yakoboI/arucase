/**
 * Pre-Form One Promotion Component
 * Handles promotion of Pre-Form One students to Form One
 */
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { preFormOnePromotionService } from '../../services/preFormOnePromotionService';
import AdminLayout from '../../components/layout/AdminLayout';
import './PreFormOnePromotion.css';

const PreFormOnePromotion = () => {
  const { year } = useParams();
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [promotionStatus, setPromotionStatus] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [targetStreams, setTargetStreams] = useState({});
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [activeTab, setActiveTab] = useState('eligible');

  // Load eligible students and promotion status
  useEffect(() => {
    loadData();
  }, [year]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleStudentSelection = useCallback((studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedStudents(prev => {
      if (prev.length === eligibleStudents.length) {
        return [];
      } else {
        return eligibleStudents.map(student => student.id);
      }
    });
  }, [eligibleStudents]);

  const handleStreamChange = useCallback((studentId, stream) => {
    setTargetStreams(prev => ({
      ...prev,
      [studentId]: stream
    }));
  }, []);

  const handlePromotion = useCallback(async (promoteAll = false) => {
    try {
      setPromoting(true);
      
      const promotionData = {
        selectedStudents: promoteAll ? [] : selectedStudents,
        targetStreams: promoteAll ? targetStreams : targetStreams,
        promoteAll: promoteAll
      };

      const response = await preFormOnePromotionService.promoteStudents(year, promotionData);
      
      if (response.success) {
        const { promoted, errors, summary } = response.data;
        
        // Show success message
        toast.success(`Promotion completed: ${summary.successful} students promoted successfully`);
        
        // Show errors if any
        if (errors && errors.length > 0) {
          errors.forEach(error => {
            toast.error(`${error.name}: ${error.error}`);
          });
        }

        // Reload data
        await loadData();
        
        // Clear selection
        setSelectedStudents([]);
        setTargetStreams({});
      } else {
        toast.error(response.message || 'Promotion failed');
      }
    } catch (error) {
      console.error('Error promoting students:', error);
      toast.error('Failed to promote students');
    } finally {
      setPromoting(false);
    }
  }, [year, selectedStudents, targetStreams]);

  // Memoized data loading function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load eligible students
      const studentsResponse = await preFormOnePromotionService.getEligibleStudents(year);
      if (studentsResponse.success) {
        setEligibleStudents(studentsResponse.data || []);
      }

      // Load promotion status
      const statusResponse = await preFormOnePromotionService.getPromotionStatus(year);
      if (statusResponse.success) {
        setPromotionStatus(statusResponse.data);
      }
    } catch (error) {
      console.error('Error loading promotion data:', error);
      toast.error('Failed to load promotion data');
    } finally {
      setLoading(false);
    }
  }, [year]);

  // Memoized computed values
  const isAllSelected = useMemo(() => 
    selectedStudents.length === eligibleStudents.length && eligibleStudents.length > 0,
    [selectedStudents.length, eligibleStudents.length]
  );

  const selectedCount = useMemo(() => selectedStudents.length, [selectedStudents.length]);

  const getDefaultStream = useCallback((student) => {
    if (targetStreams[student.id]) {
      return targetStreams[student.id];
    }
    return student.sex === 'Male' ? 'A' : 'B';
  }, [targetStreams]);

  // Memoized Student Row Component
  const StudentRow = memo(({ student, isSelected, onSelection, onStreamChange, defaultStream }) => {
    return (
      <tr className={isSelected ? 'selected' : ''}>
        <td className="select-column">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onSelection(student.id)}
          />
        </td>
        <td>{student.admission_number}</td>
        <td>
          {student.first_name} {student.middle_name} {student.surname}
        </td>
        <td>{student.sex}</td>
        <td>{student.parish || 'Not assigned'}</td>
        <td>
          <select 
            value={defaultStream}
            onChange={(e) => onStreamChange(student.id, e.target.value)}
            className="stream-select"
          >
            <option value="A">Stream A</option>
            <option value="B">Stream B</option>
          </select>
        </td>
      </tr>
    );
  });

  StudentRow.displayName = 'StudentRow';

  // Memoized table body
  const tableBody = useMemo(() => {
    return eligibleStudents.map(student => (
      <StudentRow
        key={student.id}
        student={student}
        isSelected={selectedStudents.includes(student.id)}
        onSelection={handleStudentSelection}
        onStreamChange={handleStreamChange}
        defaultStream={getDefaultStream(student)}
      />
    ));
  }, [eligibleStudents, selectedStudents, handleStudentSelection, handleStreamChange, getDefaultStream]);

  if (loading) {
    return (
      <AdminLayout>
      <div className="promotion-page-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <h3>Loading Promotion Data...</h3>
          <p>Please wait while we load the promotion information.</p>
        </div>
      </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="promotion-page-container">
      {/* Header */}
      <div className="promotion-header">
        <h1>Pre-Form One Promotion - {year}</h1>
        <p>Promote Pre-Form One students to Form One for {parseInt(year) + 1}</p>
        <Link to={`/admin/pre-form-one/${year}`} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Modules
        </Link>
      </div>

      {/* Promotion Status */}
      {promotionStatus && (
        <div className="promotion-status-card">
          <div className="status-header">
            <i className="fas fa-info-circle"></i>
            <h3>Promotion Status</h3>
          </div>
          <div className="status-content">
            <div className="status-item">
              <span className="label">Source Year:</span>
              <span className="value">{promotionStatus.sourceYear}</span>
            </div>
            <div className="status-item">
              <span className="label">Target Year:</span>
              <span className="value">{promotionStatus.targetYear}</span>
            </div>
            <div className="status-item">
              <span className="label">Total Pre-Form One Students:</span>
              <span className="value">{promotionStatus.totalPreFormOneStudents}</span>
            </div>
            <div className="status-item">
              <span className="label">Already Promoted:</span>
              <span className="value">{promotionStatus.alreadyPromoted}</span>
            </div>
            <div className="status-item">
              <span className="label">Status:</span>
              <span className={`value ${promotionStatus.promotionCompleted ? 'completed' : 'pending'}`}>
                {promotionStatus.promotionCompleted ? 'Completed' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="promotion-tabs">
        <button 
          className={`tab-button ${activeTab === 'eligible' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligible')}
        >
          <i className="fas fa-users"></i>
          Eligible Students ({eligibleStudents.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-history"></i>
          Promotion History
        </button>
      </div>

      {/* Eligible Students Tab */}
      {activeTab === 'eligible' && (
        <div className="promotion-content">
          {eligibleStudents.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-slash" />
              <h3>No Students Found</h3>
              <p>No Pre-Form One students found for year {year}</p>
            </div>
          ) : (
            <>
              {/* Actions Bar */}
              <div className="promotion-actions">
                <div className="selection-actions">
                  <button 
                    className="select-all-btn"
                    onClick={handleSelectAll}
                  >
                    <i className="fas fa-check-square"></i>
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="selection-count">
                    {selectedCount} of {eligibleStudents.length} selected
                  </span>
                </div>
                <div className="promotion-buttons">
                  <button 
                    className="promote-selected-btn"
                    onClick={() => handlePromotion(false)}
                    disabled={selectedStudents.length === 0 || promoting}
                  >
                    <i className="fas fa-arrow-up"></i>
                    {promoting ? 'Promoting...' : 'Promote Selected'}
                  </button>
                  <button 
                    className="promote-all-btn"
                    onClick={() => handlePromotion(true)}
                    disabled={promoting}
                  >
                    <i className="fas fa-users"></i>
                    {promoting ? 'Promoting...' : 'Promote All'}
                  </button>
                </div>
              </div>

              {/* Students Table */}
              <div className="students-table-container">
                <table className="promotion-table">
                  <thead>
                    <tr>
                      <th className="select-column">
                        <input 
                          type="checkbox" 
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Admission Number</th>
                      <th>Name</th>
                      <th>Sex</th>
                      <th>Parish</th>
                      <th>Target Stream</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableBody}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="promotion-content">
          <PromotionHistory />
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

// Promotion History Component
const PromotionHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await preFormOnePromotionService.getPromotionHistory();
      if (response.success) {
        setHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error loading promotion history:', error);
      toast.error('Failed to load promotion history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin"></i>
        <h3>Loading History...</h3>
      </div>
    );
  }

  return (
    <div className="history-container">
      {history.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-history"></i>
          <h3>No Promotion History</h3>
          <p>No promotion activities have been recorded yet.</p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Promoted By</th>
                <th>From Year</th>
                <th>To Year</th>
                <th>Promoted Count</th>
                <th>Failed Count</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, index) => (
                <tr key={index}>
                  <td>{new Date(record.created_at).toLocaleDateString()}</td>
                  <td>{record.promoted_by || 'Unknown'}</td>
                  <td>{record.source_year}</td>
                  <td>{record.target_year}</td>
                  <td>{record.promoted_count}</td>
                  <td>{record.failed_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PreFormOnePromotion;
