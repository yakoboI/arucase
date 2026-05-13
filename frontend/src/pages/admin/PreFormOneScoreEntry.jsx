/**
 * Pre-Form One Score Entry Component
 * Main interface with Excel-style sharp-edged design
 * Shows Interview Score and Continuing Score cards
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { preFormOneInterviewSubjectsService } from '../../services/preFormOneInterviewSubjectsService';
import preFormOneContinuingSubjectsService from '../../services/preFormOneContinuingSubjectsService';
import preFormOneStudentsService from '../../services/preFormOneStudentsService';
import gradeSystemService from '../../services/gradeSystemService';
import dataPersistenceManager from '../../utils/dataPersistenceManager';
import AdminLayout from '../../components/layout/AdminLayout';
import './PreFormOneScoreEntry.css';

const PreFormOneScoreEntry = () => {
  const { year, subjectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine if we're on subjects list or subject detail page
  const isSubjectsList = !subjectId;
  const isSubjectDetail = !!subjectId;
  const [interviewSubjects, setInterviewSubjects] = useState([]);
  const [continuingSubjects, setContinuingSubjects] = useState([]);
  const [preFormOneStudents, setPreFormOneStudents] = useState([]);
  const [studentScores, setStudentScores] = useState({});
  const [gradeConfig, setGradeConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null); // 'interview' or 'continuing'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isVirtualScrollEnabled, setIsVirtualScrollEnabled] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const tableRef = useRef(null);
  const virtualListRef = useRef(null);

  // Use all students directly since search functionality is removed
  const filteredStudents = preFormOneStudents;

  // Paginate students for performance
  const paginatedStudents = useMemo(() => {
    if (isVirtualScrollEnabled) {
      return filteredStudents;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [preFormOneStudents, currentPage, itemsPerPage, isVirtualScrollEnabled]);

  // Enable virtual scrolling for large datasets
  useEffect(() => {
    setIsVirtualScrollEnabled(preFormOneStudents.length > 100);
  }, [preFormOneStudents.length]);

  
  // Keyboard navigation - temporarily disabled to fix reference errors
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            break;
          case 'e':
            event.preventDefault();
            break;
        }
      }
      
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup auto-save when navigating away and manage auto-save lifecycle
  useEffect(() => {
    return () => {
      stopAutoSave();
      // Final save before unmount
      if (selectedSubject && selectedCard && Object.keys(studentScores).length > 0) {
        saveScoresToPersistence(selectedSubject.id, selectedCard, studentScores);
      }
    };
  }, []);

  // Restart auto-save when subject changes
  useEffect(() => {
    stopAutoSave();
    if (selectedSubject && selectedCard && !loading) {
      startAutoSave();
    }
  }, [selectedSubject, selectedCard, loading]);

  // Auto-select subject and card when on subject detail page
  useEffect(() => {
    if (isSubjectDetail && subjectId) {
      // Find the subject and auto-select it
      const findSubject = (subjects) => {
        return subjects.find(s => s.id === parseInt(subjectId) || s.id === subjectId);
      };
      
      const interviewSubject = findSubject(interviewSubjects);
      const continuingSubject = findSubject(continuingSubjects);
      
      if (interviewSubject) {
        setSelectedCard('interview');
        setSelectedSubject(interviewSubject);
        // Trigger score loading for auto-selected subject
        handleSubjectClick(interviewSubject);
      } else if (continuingSubject) {
        setSelectedCard('continuing');
        setSelectedSubject(continuingSubject);
        // Trigger score loading for auto-selected subject
        handleSubjectClick(continuingSubject);
      }
    } else if (isSubjectsList) {
      // On subjects list page, show both cards
      setSelectedCard(null);
      setSelectedSubject(null);
    }
  }, [isSubjectDetail, isSubjectsList, subjectId, interviewSubjects, continuingSubjects]);

  // Load grade configuration, subjects and students on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load system grade configuration
        try {
          const gradeConfigData = await gradeSystemService.getSystemGradeConfig();
          setGradeConfig(gradeConfigData.data);
        } catch (gradeError) {
          // Continue with default grade configuration
          setGradeConfig({
            oLevel: [
              { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
              { grade: 'B', min: 70, max: 84, description: 'Vizuri Sana' },
              { grade: 'C', min: 50, max: 69, description: 'Vizuri' },
              { grade: 'D', min: 40, max: 49, description: 'Dhaifu' },
              { grade: 'F', min: 0, max: 39, description: 'Feli' }
            ]
          });
        }
        
        // Load interview subjects
        const interviewData = await preFormOneInterviewSubjectsService.getSubjects();
        if (interviewData && interviewData.data) {
          setInterviewSubjects(interviewData.data);
        } else if (interviewData && Array.isArray(interviewData)) {
          setInterviewSubjects(interviewData);
        } else {
          setInterviewSubjects([]);
        }
        
        // Load continuing subjects
        const continuingData = await preFormOneContinuingSubjectsService.getSubjects();
        if (continuingData && continuingData.data) {
          setContinuingSubjects(continuingData.data);
        } else if (continuingData && Array.isArray(continuingData)) {
          setContinuingSubjects(continuingData);
        } else {
          setContinuingSubjects([]);
        }
        
        // Load Pre-Form One students from registration
        try {
          const studentsData = await preFormOneStudentsService.getPreFormOneStudentsByYear(year);
          
          if (studentsData && studentsData.data) {
            setPreFormOneStudents(studentsData.data);
          } else if (studentsData && Array.isArray(studentsData)) {
            setPreFormOneStudents(studentsData);
          } else {
            setPreFormOneStudents([]);
          }
        } catch (studentError) {
          setPreFormOneStudents([]);
          toast.warning('Could not load Pre-Form One students. Please check registration data.');
        }
        
      } catch (error) {
        toast.error('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [year]);

  // Handle card click
  const handleCardClick = (cardType) => {
    setSelectedCard(cardType);
    setSelectedSubject(null); // Reset selected subject when switching cards
  };  

  // Handle subject click
  const handleSubjectClick = async (subject) => {
    // Set selected subject first
    setSelectedSubject(subject);
    
    // Load existing scores for this subject
    try {
      setLoading(true);
      const scoresData = await preFormOneStudentsService.getStudentScoresBySubject(subject.id, selectedCard);
      
      // Process scores into a map for easy access
      const scoresMap = {};
      if (scoresData && scoresData.data) {
        scoresData.data.forEach(score => {
          scoresMap[score.student_id] = {
            score: score.score,
            grade: score.grade
          };
        });
      } else {
      }
      
      // Load scores from comprehensive persistence layers
      const persistenceScores = await loadScoresFromPersistence(subject.id, selectedCard);
      
      // Preserve any existing unsaved scores by merging with loaded scores
      // Backend scores take priority, but persistence scores fill in gaps
      const mergedScores = { ...persistenceScores, ...scoresMap };
      setStudentScores(mergedScores);
      startAutoSave();
      
      // Navigate to subject detail page using React Router
      navigate(`/admin/pre-form-one/${year}/score-entry/${subject.id}`);
      
    } catch (error) {
      toast.error('Error loading existing scores. Please try again.');
      setStudentScores({});
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    const breadcrumbs = [];
    
    if (isSubjectDetail && selectedSubject) {
      breadcrumbs.push({ label: 'Pre-Form One', path: `/admin/pre-form-one/${year}` });
      breadcrumbs.push({ label: 'Score Entry', path: `/admin/pre-form-one/${year}/score-entry` });
      breadcrumbs.push({ 
        label: selectedCard === 'interview' ? 'Interview Subjects' : 'Continuing Subjects', 
        path: `/admin/pre-form-one/${year}/score-entry` 
      });
      breadcrumbs.push({ 
        label: selectedSubject?.subject_name || 'Subject', 
        path: `/admin/pre-form-one/${year}/score-entry/${selectedSubject?.id}` 
      });
    } else if (selectedCard && !selectedSubject) {
      breadcrumbs.push({ label: 'Pre-Form One', path: `/admin/pre-form-one/${year}` });
      breadcrumbs.push({ label: 'Score Entry', path: `/admin/pre-form-one/${year}/score-entry` });
      breadcrumbs.push({ 
        label: selectedCard === 'interview' ? 'Interview Subjects' : 'Continuing Subjects', 
        path: `/admin/pre-form-one/${year}/score-entry` 
      });
    } else {
      breadcrumbs.push({ label: 'Pre-Form One', path: `/admin/pre-form-one/${year}` });
      breadcrumbs.push({ label: 'Score Entry', path: `/admin/pre-form-one/${year}/score-entry` });
    }
    
    return breadcrumbs;
  };

  // Handle back to cards
  const handleBackToCards = () => {
    // Stop auto-save before navigating away
    stopAutoSave();
    
    // Clear any unsaved data persistence
    if (selectedSubject && selectedCard) {
      clearScoresFromPersistence(selectedSubject.id, selectedCard);
    }
    
    // Reset navigation state
    setSelectedSubject(null);
    setSelectedCard(null);
    
    // Navigate to cards view
    navigate(`/admin/pre-form-one/${year}/score-entry`);
    
    // Show feedback to user
    toast.info('Returned to score type selection');
  };

  // Handle back to subjects
  const handleBackToSubjects = () => {
    // Stop auto-save before navigating away
    stopAutoSave();
    
    // Clear any unsaved data persistence
    if (selectedSubject && selectedCard) {
      clearScoresFromPersistence(selectedSubject.id, selectedCard);
    }
    
    // Reset only subject state, keep the card selection
    setSelectedSubject(null);
    
    // Navigate to subjects list view
    navigate(`/admin/pre-form-one/${year}/score-entry`);
    
    // Show feedback to user
    toast.info(`Returned to ${selectedCard === 'interview' ? 'Interview' : 'Continuing'} subjects`);
  };

  // Enhanced navigation state management
  const handleNavigation = (destination, options = {}) => {
    // Stop any ongoing auto-save
    stopAutoSave();
    
    // Clear data persistence if specified
    if (options.clearPersistence && selectedSubject && selectedCard) {
      clearScoresFromPersistence(selectedSubject.id, selectedCard);
    }
    
    // Handle different navigation destinations
    switch (destination) {
      case 'cards':
        setSelectedSubject(null);
        setSelectedCard(null);
        navigate(`/admin/pre-form-one/${year}/score-entry`);
        if (options.showFeedback !== false) {
          toast.info('Returned to score type selection');
        }
        break;
        
      case 'subjects':
        setSelectedSubject(null);
        navigate(`/admin/pre-form-one/${year}/score-entry`);
        if (options.showFeedback !== false) {
          toast.info(`Returned to ${selectedCard === 'interview' ? 'Interview' : 'Continuing'} subjects`);
        }
        break;
        
      case 'home':
        setSelectedSubject(null);
        setSelectedCard(null);
        navigate(`/admin/pre-form-one/${year}`);
        if (options.showFeedback !== false) {
          toast.info('Returned to Pre-Form One dashboard');
        }
        break;
        
      default:
    }
  };

  // Enhanced back button handler with context awareness
  const handleBack = () => {
    // Determine appropriate back action based on current state
    if (isSubjectDetail && selectedSubject) {
      // We're in subject detail, go back to subjects list
      handleNavigation('subjects');
    } else if (selectedCard && !selectedSubject) {
      // We're on cards view, go back to Pre-Form One dashboard
      handleNavigation('home');
    } else {
      // Default fallback
      handleNavigation('home');
    }
  };

  // Calculate grade from score using system grade configuration
  const calculateGrade = (score) => {
    if (!gradeConfig || !gradeConfig.oLevel) {
      // Fallback to default calculation
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    }
    
    // Use system grade configuration for O-Level (Pre-Form One)
    const grades = gradeConfig.oLevel;
    
    for (const grade of grades) {
      if (score >= grade.min && score <= grade.max) {
        return grade.grade;
      }
    }
    
    // Default to F if no grade found
    return 'F';
  };


  // Calculate score statistics for display
  const scoreStats = useMemo(() => {
    const scored = Object.values(studentScores).filter(s => s.score && s.score > 0).length;
    const pending = preFormOneStudents.length - scored;
    
    return {
      scored,
      pending,
      total: preFormOneStudents.length
    };
  }, [studentScores, preFormOneStudents]);

  // Handle score input change
  const handleScoreChange = (studentId, field, value) => {
    setStudentScores(prev => {
      const updated = { ...prev };
      
      if (!updated[studentId]) {
        updated[studentId] = {};
      }
      
      if (field === 'score') {
        const score = parseInt(value) || 0;
        
        if (score < 0 || score > 100) {
          toast.error('Score must be between 0 and 100');
          return prev;
        }
        
        updated[studentId].score = score;
        updated[studentId].grade = calculateGrade(score);
      } else {
        updated[studentId][field] = value;
      }
      
      // Save to persistence if subject is selected
      if (selectedSubject && selectedCard) {
        saveScoresToPersistence(selectedSubject.id, selectedCard, updated);
      }
    });
  };

  // Memoized student name and admission display
  const getStudentDisplayName = useCallback((student) => {
    return student.first_name && student.surname 
      ? `${student.first_name} ${student.surname}` 
      : student.name || student.student_name || 'Unknown Student';
  }, []);

  const getStudentAdmissionNumber = useCallback((student) => {
    return student.admission_number || student.admission_no || student.student_number || `PF2025-${student.id || student.student_id}`;
  }, []);

  // Virtual scrolling item renderer
  const renderVirtualItem = useCallback((student, index) => {
    const studentScore = studentScores[student.id] || {};
    const displayScore = studentScore.score;
    const displayGrade = studentScore.grade;
    const hasScore = displayScore || displayGrade;
    
    const studentName = getStudentDisplayName(student);
    const admissionNumber = getStudentAdmissionNumber(student);
    
    return (
      <tr key={student.id} className={hasScore ? 'scored-row' : 'pending-row'}>
        <td className="admission-number">
          <span className="student-id">{admissionNumber}</span>
        </td>
        <td className="student-name">
          <div className="student-info">
            <span className="name">{studentName}</span>
            <span className="status-indicator">
              {hasScore ? 
                <i className="fas fa-check-circle scored"></i> : 
                <i className="fas fa-clock pending"></i>
              }
            </span>
          </div>
        </td>
        <td className="score-input">
          <input
            type="number"
            className="form-input small"
            placeholder="0-100"
            min="0"
            max="100"
            value={displayScore || ''}
            onChange={(e) => handleScoreChange(student.id, 'score', e.target.value)}
            aria-label={`Score for ${studentName}`}
          />
        </td>
        <td className="grade-select">
          <select 
            className="form-input small"
            value={displayGrade || ''}
            onChange={(e) => handleScoreChange(student.id, 'grade', e.target.value)}
            aria-label={`Grade for ${studentName}`}
          >
            <option value="">-</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="F">F</option>
          </select>
        </td>
        <td className="status-cell">
          <span className={`status-badge ${hasScore ? 'completed' : 'pending'}`}>
            {hasScore ? 'Completed' : 'Pending'}
          </span>
        </td>
        <td className="actions-cell">
          <div className="action-buttons-row">
            <button 
              className="excel-btn primary small"
              onClick={() => saveIndividualScore(student.id)}
              disabled={saving || loading}
              aria-label={`Save score for ${studentName}`}
            >
              <i className="fas fa-save"></i>
              Save
            </button>
            <button 
              className="excel-btn secondary small"
              onClick={() => viewStudentDetails(student.id)}
              aria-label={`View details for ${studentName}`}
            >
              <i className="fas fa-eye"></i>
              Details
            </button>
          </div>
        </td>
      </tr>
    );
  }, [studentScores, handleScoreChange, saving, loading, getStudentDisplayName, getStudentAdmissionNumber]);

  
  // Memoized render function to prevent infinite re-renders
  const renderStudentScoreEntry = useCallback(() => {
    if (!selectedSubject || !preFormOneStudents.length) return null;
    
    if (!selectedSubject || !selectedCard || !preFormOneStudents || preFormOneStudents.length === 0) {
      return (
        <div className="score-entry-content">
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h3>Loading...</h3>
            <p>Please wait while we load the data.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="score-entry-content">
        {/* Subject header with back button */}
        <div className="subject-header">
          <button 
            onClick={handleBack}
            className="excel-btn secondary"
            disabled={loading}
          >
            <i className="fas fa-arrow-left"></i>
            Back to {selectedCard === 'interview' ? 'Interview' : 'Continuing'} Subjects
          </button>
          <div className="subject-info">
            <h3>{selectedSubject.subject_name}</h3>
            <p>{selectedSubject.subject_code}</p>
          </div>
          <div className="subject-actions">
            <button 
              onClick={saveAllScores}
              className="excel-btn primary"
              disabled={saving || loading}
            >
              <i className="fas fa-save"></i>
              Save All Scores
            </button>
            <button 
              onClick={exportScores}
              className="excel-btn secondary"
              disabled={loading}
            >
              <i className="fas fa-download"></i>
              Export
            </button>
          </div>
        </div>

        {/* Score statistics */}
        <div className="score-stats">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{scoreStats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Scored:</span>
            <span className="stat-value">{scoreStats.scored}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value">{scoreStats.pending}</span>
          </div>
        </div>

        {/* Students table */}
        <div className="students-table-container">
          <table className="students-table" ref={tableRef}>
            <thead>
              <tr>
                <th scope="col">Admission Number</th>
                <th scope="col">Student Name</th>
                <th scope="col">Score (0-100)</th>
                <th scope="col">Grade</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-students-message">
                    <div className="empty-state">
                      <i className="fas fa-user-graduate"></i>
                      <h3>No Pre-Form One Students Found</h3>
                      <p>No registered Pre-Form One students found for score entry. Please register students first.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(renderVirtualItem)
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [selectedSubject, selectedCard, preFormOneStudents, loading, scoreStats, paginatedStudents, handleBack, renderVirtualItem]);

  // Save individual student score
  const saveIndividualScore = async (studentId) => {
    try {
      setSaving(true);
      const scoreData = studentScores[studentId];
      
      if (!scoreData || !scoreData.score) {
        toast.warning('Please enter a score before saving');
        return;
      }
      
      const payload = {
        student_id: studentId,
        subject_id: selectedSubject.id,
        subject_type: selectedCard,
        score: scoreData.score
      };
      
      const result = await preFormOneStudentsService.saveStudentScores(payload);
      
      toast.success('Score saved successfully!');
      
      // Update the local state immediately with the saved score
      setStudentScores(prev => {
        const updated = {
          ...prev,
          [studentId]: {
            score: scoreData.score,
            grade: calculateGrade(scoreData.score)
          }
        };
        return updated;
      });
      
      // Clear comprehensive persistence after successful save
      clearScoresFromPersistence(selectedSubject.id, selectedCard);
      
      
    } catch (error) {
      toast.error('Error saving score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save all scores
  const saveAllScores = async () => {
    try {
      setSaving(true);
      
      const scoresToSave = [];
      Object.keys(studentScores).forEach(studentId => {
        const scoreData = studentScores[studentId];
        if (scoreData && scoreData.score) {
          scoresToSave.push({
            student_id: parseInt(studentId),
            subject_id: selectedSubject.id,
            subject_type: selectedCard,
            score: scoreData.score
          });
        }
      });
      
      if (scoresToSave.length === 0) {
        toast.warning('No scores to save. Please enter at least one score.');
        return;
      }
      
      const result = await preFormOneStudentsService.saveBulkStudentScores(scoresToSave);
      
      toast.success(`${scoresToSave.length} scores saved successfully!`);
      
      // Update the local state immediately with all saved scores
      const updatedScores = {};
      scoresToSave.forEach(score => {
        updatedScores[score.student_id] = {
          score: score.score,
          grade: calculateGrade(score.score)
        };
      });
      
      setStudentScores(prev => ({
        ...prev,
        ...updatedScores
      }));
      
      // Clear comprehensive persistence after successful save
      clearScoresFromPersistence(selectedSubject.id, selectedCard);
      
    } catch (error) {
      toast.error('Error saving scores. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Export scores to CSV
  const exportScores = async () => {
    try {
      const response = await preFormOneStudentsService.exportScores(selectedSubject.id, selectedCard);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `preformone_${selectedCard}_scores_${selectedSubject.subject_code}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Scores exported successfully!');
      
    } catch (error) {
      toast.error('Error exporting scores. Please try again.');
    }
  };

  // View student details
  const viewStudentDetails = (studentId) => {
    const student = preFormOneStudents.find(s => s.id === studentId);
    const score = studentScores[studentId];
    
    const details = `
      Student: ${student.first_name && student.surname ? `${student.first_name} ${student.surname}` : student.name || student.student_name || 'Unknown Student'}
      Admission: ${student.admission_number || student.admission_no || student.student_number || `PF2025-${student.id || student.student_id}`}
      Score: ${score?.score || 'Not entered'}
      Grade: ${score?.grade || 'Not graded'}
    `;
    
    toast.info(details, { autoClose: 5000 });
  };

  // Comprehensive data persistence functions
  const saveScoresToPersistence = async (subjectId, scoreType, scores) => {
    try {
      const success = await dataPersistenceManager.saveData(subjectId, scoreType, { scores });
      if (!success) {
        toast.warning('Some data protection features are not available, but your scores are still saved locally.');
      }
    } catch (error) {
      toast.error('Error saving scores to backup storage.');
    }
  };

  const loadScoresFromPersistence = async (subjectId, scoreType) => {
    try {
      const scores = await dataPersistenceManager.loadData(subjectId, scoreType);
      return scores;
    } catch (error) {
      toast.error('Error loading scores from backup storage.');
      return {};
    }
  };

  const clearScoresFromPersistence = (subjectId, scoreType) => {
    try {
      dataPersistenceManager.clearData(subjectId, scoreType);
    } catch (error) {
    }
  };

  // Auto-save functionality
  const startAutoSave = () => {
    if (selectedSubject && selectedCard) {
      dataPersistenceManager.startAutoSave(selectedSubject.id, selectedCard, () => {
        saveScoresToPersistence(selectedSubject.id, selectedCard, studentScores);
      });
    }
  };

  const stopAutoSave = () => {
    dataPersistenceManager.stopAutoSave();
  };

  // Render subject cards for score entry
  const renderSubjectCards = (subjects, title) => {
    const activeSubjects = subjects.filter(subject => subject.is_active);
    
    return (
      <div className="score-entry-subjects-container">
        <div className="score-entry-subjects-header">
          <button 
            onClick={() => handleNavigation('cards')}
            className="excel-btn secondary"
            disabled={loading}
          >
            <i className="fas fa-arrow-left"></i>
            Back to Score Types
          </button>
          <h3>
            <i className="fas fa-book"></i>
            {title}
          </h3>
          <div className="subject-count">
            {activeSubjects.length} Subjects
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h3>Loading Subjects...</h3>
            <p>Please wait while we load the subjects data.</p>
          </div>
        ) : activeSubjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h3>No Active Subjects Found</h3>
            <p>No active subjects available for score entry.</p>
          </div>
        ) : (
          <div className="subject-cards-grid">
            {activeSubjects.map((subject) => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => handleSubjectClick(subject)}
              >
                <div className="subject-card-header">
                  <h4>{subject.subject_name}</h4>
                  <span className="subject-code">{subject.subject_code}</span>
                </div>
                <div className="subject-card-body">
                  <div className="subject-icon">
                    <i className="fas fa-edit"></i>
                  </div>
                  <div className="subject-status">
                    <span className="status-badge active">Active</span>
                  </div>
                </div>
                <div className="subject-card-footer">
                  <button className="excel-btn primary full-width">
                    <i className="fas fa-plus"></i>
                    Enter Scores
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  
  // Main render function
  return (
    <AdminLayout>
    <div className="pre-form-one-score-entry">
      {/* Page Header */}
      <div className="score-entry-page-header">
        <h2>
          <i className="fas fa-graduation-cap"></i>
          Pre-Form One Score Entry
        </h2>
        <div className="header-info">
          <span className="year-badge">2025</span>
          <span className="status-badge active">Active</span>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-navigation">
        {getBreadcrumbs().map((crumb, index) => (
          <span key={index} className="breadcrumb-item">
            {index > 0 && <i className="fas fa-chevron-right"></i>}
            <a href={crumb.path} className="breadcrumb-link">
              {crumb.label}
            </a>
          </span>
        ))}
      </div>

      {/* Main Content */}
      <div className="score-entry-content">
        {/* Score Type Cards - Show on main page */}
        {isSubjectsList && !selectedCard && (
          <div className="score-type-cards-container">
            {/* Interview Score Card */}
            <div
              className="score-type-card interview"
              onClick={() => handleCardClick('interview')}
            >
              <div className="score-type-card-header">
                <div className="score-type-icon">
                  <i className="fas fa-clipboard-list"></i>
                </div>
                <h4>Interview Score</h4>
              </div>
              <div className="score-type-card-body">
                <p>Enter interview assessment scores for prospective students</p>
              </div>
              <div className="score-type-card-footer">
                <button className="excel-btn primary full-width">
                  <i className="fas fa-arrow-right"></i>
                  Select Interview Score
                </button>
              </div>
            </div>

            {/* Continuing Score Card */}
            <div
              className="score-type-card continuing"
              onClick={() => handleCardClick('continuing')}
            >
              <div className="score-type-card-header">
                <div className="score-type-icon">
                  <i className="fas fa-book-open"></i>
                </div>
                <h4>Continuing Score</h4>
              </div>
              <div className="score-type-card-body">
                <p>Enter continuing assessment scores for ongoing evaluation</p>
              </div>
              <div className="score-type-card-footer">
                <button className="excel-btn primary full-width">
                  <i className="fas fa-arrow-right"></i>
                  Select Continuing Score
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subject Cards - Show when card selected but no subject */}
        {selectedCard && !selectedSubject && renderSubjectCards(selectedCard === 'interview' ? interviewSubjects : continuingSubjects, selectedCard === 'interview' ? 'Interview Subjects' : 'Continuing Subjects')}

        {/* Student Score Entry - Show when subject selected */}
        {isSubjectDetail && selectedSubject && renderStudentScoreEntry(selectedSubject, selectedCard, preFormOneStudents, loading, scoreStats, paginatedStudents, handleBack, saveAllScores, exportScores, renderVirtualItem)}

        {/* Loading State */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <h3>Loading...</h3>
              <p>Please wait while we load the data.</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="back-navigation-bottom">
        <Link to={`/admin/pre-form-one/${year}`} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Modules
        </Link>
      </div>
    </div>
    </AdminLayout>
  );

};

export default PreFormOneScoreEntry;
