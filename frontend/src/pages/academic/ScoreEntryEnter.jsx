/**
 * Score Entry Page - Actual score input interface
 * Non-admin without access to this class is redirected to score entry.
 */
import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI } from '../../services/students';
import './ScoreEntryEnter.css';

const ScoreEntryEnter = ({ formLevel: formLevelProp }) => {
  const params = useParams();
  const navigate = useNavigate();
  // React Router v6 automatically decodes URL parameters, but we'll decode explicitly to be safe
  const formLevelParam = formLevelProp || params.formLevel;
  const year = params.year;
  const stream = params.stream;
  const subjectCodeParam = params.subjectCode;
  const monthParam = params.month;
  
  // Decode subject code to handle URL-encoded values (e.g., "A%2FPHY" -> "A/PHY")
  // React Router should decode automatically, but decodeURIComponent is safe (idempotent for already-decoded values)
  const subjectCode = subjectCodeParam ? decodeURIComponent(subjectCodeParam) : '';
  // Decode month to handle URL-encoded values
  const month = monthParam ? decodeURIComponent(monthParam) : '';
  
  // Derive term from month for Form V/VI
  // First Term: Jul-Dec (August, September, October, November)
  // Second Term: Jan-Jun (February, March, April, May)
  const getTermFromMonth = (month) => {
    const firstTermMonths = ['August', 'September', 'October', 'November'];
    const secondTermMonths = ['February', 'March', 'April', 'May'];
    
    if (firstTermMonths.includes(month)) {
      return 'First Term';
    } else if (secondTermMonths.includes(month)) {
      return 'Second Term';
    }
    return 'First Term'; // Default fallback
  };
  
  const currentTerm = getTermFromMonth(month);
  
  const queryClient = useQueryClient();
  const { getAllowedScoreEntryMonths, hasClass, isAdminLike, hasModule } = useAuth();
  
  const [scores, setScores] = useState({});
  const [saveTimeouts, setSaveTimeouts] = useState({});

  // Form V/VI combination to subjects mapping
  const combinationSubjects = {
    'PCB': ['PHY', 'CHE', 'BIO', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'PCM': ['PHY', 'CHE', 'MAT', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'CBG': ['CHE', 'BIO', 'GEO', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'PGM': ['PHY', 'GEO', 'MAT', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'HGE': ['HIS', 'GEO', 'ECO', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'HKL': ['HIS', 'KIS', 'ENG', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'HGK': ['HIS', 'GEO', 'KIS', 'BAM', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'EGM': ['ECO', 'GEO', 'MAT', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM'],
    'HGL': ['HIS', 'GEO', 'ENG', 'COM', 'A/COM', 'DIV', 'A/DIV', 'HTM', 'A/HTM']
  };

  // Determine if a combination includes the subject
  const doesCombinationTakeSubject = (combination, subjectCode) => {
    if (!combination || !subjectCode) return true; // Show all if can't determine
    const subjects = combinationSubjects[combination];
    if (!subjects) return true; // Show all if combination not found
    // Check if subject code matches any subject in the combination
    return subjects.some(s => subjectCode.includes(s) || s.includes(subjectCode));
  };

  // Normalize form level (convert to uppercase: "form-i" -> "FORM I")
  const normalizedLevel = formLevelParam
    ? formLevelParam.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  // For Form V-VI, use the actual stream value
  // For together mode (no stream in URL), use 'ALL' to fetch students from all streams
  const isTogetherMode = !stream; // Together mode has no stream parameter
  const normalizedStream = (() => {
    const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
    if (isFormVOrVI) {
      if (isTogetherMode) {
        return 'ALL'; // Together mode: fetch from all streams
      }
      return stream || '';
    }
    return stream || 'A';
  })();

  const currentClassKey = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
    ? isTogetherMode ? `${normalizedLevel} (All Streams)` : `${normalizedLevel} ${normalizedStream}`
    : normalizedLevel;

  // Validate required parameters before proceeding
  // If critical parameters are missing, show error instead of redirecting
  const hasRequiredParams = normalizedLevel && year && month && subjectCode;
  
  // For Form V-VI, stream is only required if NOT in together mode
  const isFormVOrVILevel = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
  const hasValidStream = isFormVOrVILevel ? (isTogetherMode || (normalizedStream && normalizedStream.trim() !== '')) : true;
  const allParamsValid = hasRequiredParams && hasValidStream;
  
  if (!allParamsValid) {
    console.error('ScoreEntryEnter: Missing required parameters', {
      normalizedLevel,
      year,
      month,
      subjectCode,
      normalizedStream,
      stream,
      hasValidStream,
      isFormVOrVILevel,
      params: params,
      pathname: window.location.pathname,
      formLevelParam
    });
  }

  // Only check access if we have valid parameters
  // This prevents false negatives when stream is missing for Form V-VI
  // For together mode, check if user has access to ANY stream for this form
  const FORM_V_STREAMS = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];
  const hasAccessToAnyStream = isTogetherMode
    ? FORM_V_STREAMS.some(stream => hasClass(`${normalizedLevel} ${stream}`))
    : hasClass(currentClassKey);

  if (allParamsValid && !isAdminLike() && !hasAccessToAnyStream) {
    console.warn('ScoreEntryEnter: User does not have access to this class', {
      isAdminLike: isAdminLike(),
      currentClassKey,
      hasClass: hasClass(currentClassKey),
      isTogetherMode,
      hasAccessToAnyStream,
      normalizedLevel,
      normalizedStream,
      stream
    });
    return <Navigate to="/admin/score-entry" replace />;
  }

  // Non-admin may be restricted to specific months; if so, block entry for other months
  const allowedMonths = getAllowedScoreEntryMonths();
  const isMonthAllowed = allowedMonths === null || allowedMonths.length === 0 || (month && allowedMonths.includes(month));
  
  // Validate required parameters
  useEffect(() => {
    if (!normalizedLevel || !year || !month || !subjectCode) {
      console.error('ScoreEntryEnter: Missing required parameters!', {
        normalizedLevel,
        year,
        month,
        subjectCode
      });
    }
  }, [normalizedLevel, year, month, subjectCode]);
  

  // Helper function to sort students by name: first_name, then middle_name, then surname (A-Z)
  const sortStudentsByName = (students) => {
    return [...students].sort((a, b) => {
      // Sort by first_name first
      const firstNameA = String(a.first_name || '').toLowerCase().trim();
      const firstNameB = String(b.first_name || '').toLowerCase().trim();
      const firstNameCompare = firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
      if (firstNameCompare !== 0) return firstNameCompare;
      
      // If first names are equal, sort by middle_name
      const middleNameA = String(a.middle_name || '').toLowerCase().trim();
      const middleNameB = String(b.middle_name || '').toLowerCase().trim();
      const middleNameCompare = middleNameA.localeCompare(middleNameB, undefined, { sensitivity: 'base' });
      if (middleNameCompare !== 0) return middleNameCompare;
      
      // If middle names are equal, sort by surname
      const surnameA = String(a.surname || '').toLowerCase().trim();
      const surnameB = String(b.surname || '').toLowerCase().trim();
      return surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
    });
  };

  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = parseInt(year, 10);

  // Fetch students for this class - sorted by name: first_name, then middle_name, then surname (A-Z)
  // For streams A, B, C, D: also fetch students from stream "NA"
  // For Form V-VI, use apiYear (academic year start) instead of display year
  // For together mode, fetch students from all streams
  const { data: studentsData = [], isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, apiYear, isTogetherMode],
    queryFn: async () => {
      if (!normalizedLevel || !apiYear) {
        console.warn('ScoreEntryEnter: Missing required params for getStudents', { normalizedLevel, apiYear, displayYear: year });
        return [];
      }

      let students = [];

      try {
        // For together mode, fetch students from all streams
        if (isTogetherMode) {
          const FORM_V_STREAMS = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];
          const studentPromises = FORM_V_STREAMS.map(async (stream) => {
            try {
              const res = await studentsAPI.getStudents({
                level: normalizedLevel,
                stream: stream,
                year: apiYear,
                // For Form I-IV, don't filter by term - show all students for the year
                // For Form V/VI, filter by term
                ...(isFormVOrVILevel ? { term: currentTerm } : {}),
              });
              return res.data.students || [];
            } catch (error) {
              // If a stream has no students, return empty array
              if (error.response?.status === 404 || error.response?.status === 400) {
                return [];
              }
              throw error;
            }
          });
          const studentArrays = await Promise.all(studentPromises);
          students = studentArrays.flat();
        } else {
          // Fetch students for the normalized stream
          // Note: All "NA" stream values have been normalized to "A" in the database
          // For Form V-VI, use apiYear (academic year start) instead of display year
          const res = await studentsAPI.getStudents({
            level: normalizedLevel,
            stream: normalizedStream,
            year: apiYear,
            // For Form I-IV, don't filter by term - show all students for the year
            // For Form V/VI, filter by term
            ...(isFormVOrVILevel ? { term: currentTerm } : {}),
            subject_code: isTogetherMode ? subjectCode : undefined,
          });

          students = res.data.students || [];
        }

        // Sort students by name: first_name, then middle_name, then surname (A-Z)
        const sorted = sortStudentsByName(students);
        return sorted;
      } catch (error) {
        // Only log non-401 errors to avoid spam
        if (error.response?.status !== 401) {
          console.error('ScoreEntryEnter: Error fetching students:', error);
          console.error('ScoreEntryEnter: Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
          });
        }
        // Don't throw error on 401 - just return empty array to prevent UI breakage
        if (error.response?.status === 401) {
          // Silently handle 401 - token will be cleared by interceptor
          return [];
        }
        throw error;
      }
    },
    enabled: !!normalizedLevel && !!year && !!apiYear && !!subjectCode && !!month,
    retry: false, // Prevent repeated failed requests
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false, // Prevent refetch on focus to avoid race conditions
  });
  
  const students = studentsData;

  // Filter students based on whether they take the subject
  // For Form V/VI together mode, always show only students who take the subject
  const filteredStudents = isFormVOrVILevel && isTogetherMode && students && students.length > 0
    ? students.filter(s => doesCombinationTakeSubject(s.stream, subjectCode))
    : students || [];

  // Fetch existing scores for this subject and month
  // For Form V-VI, use apiYear (academic year start) instead of display year
  const { data: existingScores = {}, isLoading: scoresLoading } = useQuery({
    queryKey: ['scores', normalizedLevel, normalizedStream, apiYear, month, subjectCode, students.length],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getClassScores({
          level: normalizedLevel,
          stream: normalizedStream,
          year: apiYear,
          month: month,
          subject_code: subjectCode,
        });
        
        const scores = res.data.scores || {};
        return scores;
      } catch (error) {
        // Only log non-401 errors to avoid spam
        if (error.response?.status !== 401) {
          console.error('ScoreEntryEnter: Error fetching scores:', error);
          console.error('ScoreEntryEnter: Score error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
          });
        }
        // Don't throw error on 401 - just return empty object to prevent UI breakage
        if (error.response?.status === 401) {
          // Silently handle 401 - token will be cleared by interceptor
          return {};
        }
        throw error; // Re-throw other errors
      }
    },
    enabled: students.length > 0 && !!normalizedLevel && !!apiYear && !!month && !!subjectCode && !!normalizedStream,
    retry: false, // Prevent repeated failed requests
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false, // Prevent refetch on focus to avoid race conditions
  });

  // Initialize scores from existing scores - filter to only include current students
  useEffect(() => {
    if (Object.keys(existingScores).length > 0 && students.length > 0) {
      // Filter scores to only include students that are currently in the class
      const studentAdmNos = new Set(students.map(s => s.adm_no));
      const filteredScores = {};
      Object.keys(existingScores).forEach(admNo => {
        if (studentAdmNos.has(admNo)) {
          filteredScores[admNo] = existingScores[admNo];
        }
      });
      setScores(filteredScores);
    } else if (students.length > 0) {
      // Initialize empty scores object for all students when no existing scores
      // Check if we need to initialize by comparing student count
      const currentStudentCount = Object.keys(scores).length;
      if (currentStudentCount !== students.length) {
        const emptyScores = {};
        students.forEach(student => {
          // Preserve existing scores if any
          emptyScores[student.adm_no] = scores[student.adm_no] ?? '';
        });
        setScores(emptyScores);
      }
    }
  }, [existingScores, students.length]); // Only depend on students.length to prevent loops

  // Save score mutation
  const saveScoreMutation = useMutation({
    mutationFn: async ({ admNo, score }) => {
      const numScore = typeof score === 'number' ? score : parseFloat(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 100) {
        throw new Error('Score must be between 0 and 100');
      }
      // For Form V-VI, use apiYear (academic year start) instead of display year
      const yearToUse = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
        ? parseInt(apiYear, 10)
        : parseInt(year, 10);
      
      return studentsAPI.saveScore(admNo, {
        level: normalizedLevel,
        stream: normalizedStream,
        year: yearToUse,
        month: month,
        subject_code: subjectCode,
        score: numScore,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scores', normalizedLevel, normalizedStream, apiYear, month, subjectCode]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save score');
    },
  });

  const handleScoreChange = (admNo, value) => {
    // Validate score is within 0-100 range
    if (value !== '' && value !== null && value !== undefined) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // Clamp value to 0-100 range
        const clampedValue = Math.max(0, Math.min(100, numValue));
        if (clampedValue !== numValue) {
          // Only update if value was clamped
          const newScores = { ...scores, [admNo]: clampedValue.toString() };
          setScores(newScores);
          value = clampedValue.toString();
        }
      }
    }

    const newScores = { ...scores, [admNo]: value };
    setScores(newScores);

    // Clear existing timeout for this student
    if (saveTimeouts[admNo]) {
      clearTimeout(saveTimeouts[admNo]);
    }

    // Auto-save after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      if (value !== '' && value !== null && value !== undefined) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          saveScoreMutation.mutate({ admNo, score: numValue });
        }
      }
    }, 3000);

    setSaveTimeouts(prev => ({ ...prev, [admNo]: timeout }));
  };

  // Handle blur - save immediately when clicking on another input
  const handleScoreBlur = (admNo, value) => {
    // Clear the timeout since we're saving now
    if (saveTimeouts[admNo]) {
      clearTimeout(saveTimeouts[admNo]);
      setSaveTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[admNo];
        return newTimeouts;
      });
    }

    // Validate and clamp score to 0-100 range
    if (value !== '' && value !== null && value !== undefined) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const clampedValue = Math.max(0, Math.min(100, numValue));
        // Update state with clamped value if needed
        if (clampedValue !== numValue) {
          const newScores = { ...scores, [admNo]: clampedValue.toString() };
          setScores(newScores);
          value = clampedValue.toString();
        }
        // Save the validated score
        saveScoreMutation.mutate({ admNo, score: clampedValue });
      }
    }
  };

  const handleSaveAll = async () => {
    const validScores = Object.entries(scores).filter(([admNo, score]) => {
      const numScore = parseFloat(score);
      return score !== '' && !isNaN(numScore) && numScore >= 0 && numScore <= 100;
    });

    if (validScores.length === 0) {
      toast.warning('No valid scores to save');
      return;
    }

    if (window.confirm(`Save ${validScores.length} scores?`)) {
      for (const [admNo, score] of validScores) {
        await saveScoreMutation.mutateAsync({ admNo, score });
      }
      toast.success(`Saved ${validScores.length} scores successfully!`);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all scores for displayed students? This action cannot be undone and will permanently delete scores from the database.')) {
      try {
        // For Form V-VI, use apiYear (academic year start) instead of display year
        const yearToUse = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
          ? parseInt(apiYear, 10)
          : parseInt(year, 10);

        // Get admission numbers of filtered students
        const admNos = filteredStudents.map(s => s.adm_no);

        await studentsAPI.clearScores({
          level: normalizedLevel,
          stream: normalizedStream,
          year: yearToUse,
          month: month,
          subject_code: subjectCode,
          admNos: JSON.stringify(admNos),
        });
        setScores({});
        queryClient.invalidateQueries(['scores', normalizedLevel, normalizedStream, apiYear, month, subjectCode]);
        toast.success(`Cleared scores for ${admNos.length} students permanently from database`);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to clear scores');
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // For Form V-VI, use apiYear (academic year start) instead of display year
      const yearToUse = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
        ? parseInt(apiYear, 10)
        : parseInt(year, 10);
      
      const res = await studentsAPI.getScoreEntryTemplate({
        level: normalizedLevel,
        stream: normalizedStream,
        year: yearToUse,
        month,
        subject_code: subjectCode,
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `score_entry_${normalizedLevel}_${normalizedStream}_${year}_${month}_${subjectCode}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download template');
    }
  };

  const uploadScoresCsvMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await studentsAPI.uploadScoresCsv(formData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['scores', normalizedLevel, normalizedStream, apiYear, month, subjectCode]);
      const msg = data.saved != null ? `Saved ${data.saved} score(s) from CSV.` : data.message || 'Upload complete.';
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${msg} ${data.errors.length} row(s) had errors.`);
      } else {
        toast.success(msg);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'CSV upload failed');
    },
  });

  const handleUploadCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      e.target.value = '';
      return;
    }
    // For Form V-VI, use apiYear (academic year start) instead of display year
    const yearToUse = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
      ? parseInt(apiYear, 10)
      : parseInt(year, 10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('level', normalizedLevel);
    formData.append('stream', normalizedStream);
    formData.append('year', yearToUse);
    formData.append('month', month);
    formData.append('subject_code', subjectCode);
    uploadScoresCsvMutation.mutate(formData, {
      onSettled: () => {
        e.target.value = '';
      },
    });
  };

  const getBackPath = () => {
    // Always encode subject code to handle special characters like forward slashes
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    if (isTogetherMode) {
      return `/admin/score-entry/${formLevelParam}/together/year/${year}/subject/${encodedSubjectCode}/months`;
    }
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/score-entry/${formLevelParam}/stream/${stream}/year/${year}/subject/${encodedSubjectCode}/months`;
    } else {
      return `/admin/score-entry/${formLevelParam}/year/${year}/stream/${stream}/subject/${encodedSubjectCode}/months`;
    }
  };

  const handleBackToMonths = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const backPath = getBackPath();
    console.log('Back to Months clicked, navigating to:', backPath);
    navigate(backPath, { replace: false });
  };

  const getRegistrationPath = () => {
    // Generate the correct registration URL based on form level
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      // FORM V-VI: /admin/students/registration/form-vi/stream/{stream}/year/{year}
      return `/admin/students/registration/${formLevelParam}/stream/${stream}/year/${year}`;
    } else {
      // FORM I-IV: /admin/students/registration/form-i/year/{year}/stream/{stream}
      return `/admin/students/registration/${formLevelParam}/year/${year}/stream/${normalizedStream}`;
    }
  };

  // Fetch subject info
  const { data: subjects = [], error: subjectsError } = useQuery({
    queryKey: ['subjects', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getSubjects({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
        });
        return res.data.subjects || [];
      } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
      }
    },
    enabled: !!normalizedLevel && !!year && allParamsValid,
  });

  const subject = subjects && subjects.length > 0 ? subjects.find(s => s.subject_code === subjectCode || s.subject_abbreviation === subjectCode) : null;

  // Show error if required parameters are missing
  if (!allParamsValid) {
    const missingParams = [];
    if (!normalizedLevel) missingParams.push('Form Level');
    if (!year) missingParams.push('Year');
    if (!month) missingParams.push('Month');
    if (!subjectCode) missingParams.push('Subject');
    if (isFormVOrVILevel && !hasValidStream) missingParams.push('Stream');
    
    return (
      <AdminLayout>
        <div className="score-entry-enter-page-container">
          <div className="excel-card">
            <div className="excel-card-header">
              <i className="fas fa-exclamation-triangle"></i>
              Missing Required Parameters
            </div>
            <div className="excel-card-body">
              <p style={{ color: '#f44336', marginBottom: '20px' }}>
                Some required parameters are missing from the URL. Please navigate back and try again.
              </p>
              {missingParams.length > 0 && (
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Missing: {missingParams.join(', ')}
                </p>
              )}
              {isFormVOrVILevel && !hasValidStream && (
                <p style={{ fontSize: '14px', color: '#f44336', marginBottom: '10px', fontWeight: 'bold' }}>
                  ⚠️ For {normalizedLevel}, a stream parameter is required in the URL.
                </p>
              )}
                            <Link to="/admin/score-entry" className="excel-btn primary" style={{ marginTop: '20px' }}>
                <i className="fas fa-arrow-left"></i> Back to Score Entry
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="score-entry-enter-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            {year} - {subject?.subject_name || subjectCode} - {month}
            {!isTogetherMode && normalizedStream && (
              <span className="score-entry-header-badge">
                {normalizedStream}
              </span>
            )}
            {students.length > 0 && (
              <span className="score-entry-header-badge">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} loaded
              </span>
            )}
            {!studentsLoading && students.length === 0 && (
              <span className="score-entry-header-badge error">No students found</span>
            )}
            <div className="header-actions">
              <button type="button" onClick={handleBackToMonths} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back to Months
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {!isMonthAllowed ? (
              <div className="empty-state">
                <i className="fas fa-calendar-times"></i>
                <h3>Score entry not allowed for this month</h3>
                <p>You are only allowed to enter scores for: {allowedMonths?.join(', ') || '—'}. Contact an administrator to change your score entry months in User Management.</p>
                <Link to={getBackPath()} className="excel-btn primary" style={{ marginTop: '1rem' }}>
                  <i className="fas fa-arrow-left"></i> Back to Months
                </Link>
              </div>
            ) : studentsError ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Students</h3>
                <p>{studentsError.message || 'Failed to load students. Please try again.'}</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  {normalizedLevel} | {normalizedStream} | {year}
                </p>
              </div>
            ) : studentsLoading ? (
              <div className="loading-state">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-user-graduate"></i>
                <h3>No Students Registered</h3>
                <p>No students have been registered for this class yet.</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  {normalizedLevel} | {normalizedStream} | {year} | Students loaded: {students.length}
                </p>
                {(isAdminLike() || hasModule('student_registration')) && (
                  <Link to={getRegistrationPath()} className="excel-btn primary">
                    <i className="fas fa-plus"></i> Register Students
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="score-entry-student-list table-container">
                  <table className="excel-table">
                      <thead>
                        <tr>
                          <th>S/N</th>
                          <th>Adm No</th>
                          <th>First Name</th>
                          <th>Middle Name</th>
                          <th>Surname</th>
                          <th>Sex</th>
                          <th>COMB</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student, index) => {
                          const studentScore = scores[student.adm_no];
                          return (
                            <tr key={student.adm_no}>
                              <td data-label="No."><span className="score-entry-cell-value">{index + 1}</span></td>
                              <td data-label="Adm No"><span className="score-entry-cell-value">{student.adm_no}</span></td>
                              <td data-label="First Name"><span className="score-entry-cell-value">{student.first_name}</span></td>
                              <td data-label="Middle Name"><span className="score-entry-cell-value">{student.middle_name || '-'}</span></td>
                              <td data-label="Surname"><span className="score-entry-cell-value">{student.surname}</span></td>
                              <td data-label="Sex"><span className="score-entry-cell-value">{student.sex}</span></td>
                              <td data-label="COMB"><span className="score-entry-cell-value">{student.stream || '-'}</span></td>
                              <td data-label="Score">
                                <span className="score-entry-cell-value">
                                <input
                                  type="number"
                                  className="score-input"
                                  id={`score_${student.adm_no}`}
                                  value={studentScore !== undefined && studentScore !== null ? studentScore : ''}
                                  onChange={(e) => handleScoreChange(student.adm_no, e.target.value)}
                                  onBlur={(e) => handleScoreBlur(student.adm_no, e.target.value)}
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="0.0"
                                />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                </div>

                {/* Mobile Card View (same style as Huduma) */}
                <div className="mobile-students-list">
                  {filteredStudents.map((student, index) => {
                    const studentScore = scores[student.adm_no];
                    return (
                      <div key={student.adm_no} className="mobile-student-card">
                        <div className="mobile-student-card-header">
                          <div className="student-info">
                            <div className="student-name">
                              {index + 1}. {student.first_name} {student.middle_name || ''} {student.surname}
                            </div>
                            <div className="student-adm">Adm No: {student.adm_no}</div>
                          </div>
                        </div>
                        <div className="mobile-student-card-body">
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Sex</span>
                            <span className="mobile-student-field-value">{student.sex}</span>
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">COMB</span>
                            <span className="mobile-student-field-value">{student.stream || '-'}</span>
                          </div>
                          <div className="mobile-student-field mobile-score-field">
                            <span className="mobile-student-field-label">Score</span>
                            <input
                              type="number"
                              className="score-input"
                              value={studentScore !== undefined && studentScore !== null ? studentScore : ''}
                              onChange={(e) => handleScoreChange(student.adm_no, e.target.value)}
                              onBlur={(e) => handleScoreBlur(student.adm_no, e.target.value)}
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="0.0"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bulk-actions">
                  <button
                    type="button"
                    className="excel-btn primary"
                    onClick={handleSaveAll}
                    disabled={saveScoreMutation.isLoading}
                  >
                    <i className="fas fa-save"></i> Save All Scores
                  </button>
                  <button
                    type="button"
                    className="excel-btn secondary"
                    onClick={handleClearAll}
                  >
                    <i className="fas fa-eraser"></i> Clear All Scores
                  </button>
                  <button
                    type="button"
                    className="excel-btn secondary"
                    onClick={handleDownloadTemplate}
                    title="Download CSV with Adm No, names, and Score column (fill scores and upload)"
                  >
                    <i className="fas fa-download"></i> Download CSV template
                  </button>
                  <label className="excel-btn secondary" style={{ marginBottom: 0 }}>
                    <i className="fas fa-upload"></i> Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
                      onChange={handleUploadCsv}
                      disabled={uploadScoresCsvMutation.isLoading}
                    />
                  </label>
                  {uploadScoresCsvMutation.isLoading && (
                    <span className="score-entry-upload-status">Uploading…</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryEnter;

