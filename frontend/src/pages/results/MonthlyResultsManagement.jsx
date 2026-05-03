/**
 * Monthly Results Management Page
 * Displays and manages monthly test results with automatic calculation
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import './MonthlyResultsManagement.css';

const MonthlyResultsManagement = ({ formLevel }) => {
  const { year, stream, month } = useParams();
  const queryClient = useQueryClient();
  
  const [results, setResults] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [subjectScores, setSubjectScores] = useState({}); // {adm_no: {subject_code: score}}

  // Normalize form level to uppercase (e.g., "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').toUpperCase()
    : '';
  
  const normalizedStream = stream || 'NA';

  // Check if this is Form V or VI
  const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';

  // Determine term from month
  const getTermFromMonth = (month) => {
    const firstTermMonths = ['January', 'February', 'March', 'April', 'May', 'June'];
    const secondTermMonths = ['July', 'August', 'September', 'October', 'November', 'December'];
    if (firstTermMonths.includes(month)) return 'First Term';
    if (secondTermMonths.includes(month)) return 'Second Term';
    return 'First Term'; // default
  };

  const currentTerm = getTermFromMonth(month);

  // Determine test type based on month
  const getTestType = (month, level) => {
    const normalizedLevel = level.toUpperCase();
    const isALevel = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');
    
    const testTypes = {
      'February': 'MONTHLY TEST',
      'March': 'MID-TERM TEST',
      'April': 'MONTHLY TEST',
      'May': isALevel ? 'ANNUAL' : 'TERMINAL',
      'June': 'MONTHLY TEST',
      'July': 'MONTHLY TEST',
      'August': 'MONTHLY TEST',
      'September': 'MID-TERM TEST',
      'October': 'MONTHLY TEST',
      'November': isALevel ? 'TERMINAL' : 'ANNUAL',
    };
    
    return testTypes[month] || 'MONTHLY TEST';
  };

  // Check authentication before making queries
  const { isAuthenticated: isAuth } = useAuth();
  const isAuthenticated = isAuth();

  // Fetch students for this class
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, year, ...(isFormVOrVI ? [currentTerm] : [])],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getStudents({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          ...(isFormVOrVI ? { term: currentTerm } : {}),
        });
        return res.data.students || [];
      } catch (error) {
        console.error('Error fetching students:', error);
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load students');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!normalizedLevel && !!normalizedStream && !!year,
    retry: false,
  });

  // Fetch subjects for this class
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
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
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load subjects');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!normalizedLevel && !!normalizedStream && !!year,
    retry: false,
  });

  // Fetch school logo
  const { data: schoolLogoData } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolLogo();
        return res.data?.logo || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch individual scores for all subjects (using batch endpoint to reduce API calls)
  useEffect(() => {
    if (subjects.length > 0 && students.length > 0 && month) {
      // Check if user is authenticated before making requests
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view scores');
        return;
      }

      const fetchScores = async () => {
        try {
          // Use batch endpoint to fetch all scores in one API call
          const res = await studentsAPI.getBatchScores({
            level: normalizedLevel,
            stream: normalizedStream,
            year: year,
            month: month,
          });
          const scores = res.data.scores || {};
          setSubjectScores(scores);
        } catch (error) {
          // Check if it's an authentication error
          if (error.response?.status === 401) {
            const errorMessage = error.response?.data?.message || 'Authentication required';
            if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('token expired')) {
              toast.error('Your session has expired. Please refresh the page and log in again.');
            } else {
              toast.error('Authentication required. Please log in again.');
            }
          } else if (error.response?.status === 429) {
            toast.error('Too many requests. Please wait a moment and refresh the page.');
          } else if (error.response?.status === 404) {
            // No scores found yet - this is okay, don't show error
            setSubjectScores({});
          } else {
            console.error('Error fetching scores:', error);
            // Only show error if it's not a 404
            if (error.response?.status !== 404) {
              toast.error('Failed to load scores. Please try again.');
            }
          }
        }
      };
      
      // Wrap in promise to catch any unhandled rejections
      fetchScores().catch((error) => {
        console.error('Unhandled error in fetchScores:', error);
      });
    }
  }, [subjects, students, month, normalizedLevel, normalizedStream, year]);

  // Fetch existing monthly results
  const { data: existingResults = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ['monthly-results', normalizedLevel, normalizedStream, year, month],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getMonthlyResults({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          month: month,
        });
        return res.data.results || {};
      } catch (error) {
        console.error('Error fetching monthly results:', error);
        // Don't show toast for 404 errors (no results yet) or 401 errors (auth handled elsewhere)
        if (error.response?.status !== 404 && error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load monthly results');
        }
        return {};
      }
    },
    enabled: isAuthenticated && students.length > 0 && !!month,
    retry: false,
  });

  // Initialize results from existing data
  // Use a ref to prevent infinite loops
  const prevResultsRef = useRef(JSON.stringify(existingResults));
  
  useEffect(() => {
    const currentResultsStr = JSON.stringify(existingResults);
    // Only update if results actually changed
    if (prevResultsRef.current !== currentResultsStr) {
      prevResultsRef.current = currentResultsStr;
      if (Object.keys(existingResults).length > 0) {
        setResults(existingResults);
      } else {
        // Clear results if no existing data
        setResults({});
      }
    }
  }, [existingResults]);

  // Combined mode (stream=ALL): ensure there is data to display.
  // If the backend has no combined monthly_results yet, calculate once automatically.
  const didAutoCalculateRef = useRef(false);
  useEffect(() => {
    const isCombinedAll = normalizedStream && normalizedStream.toUpperCase() === 'ALL';
    if (!isCombinedAll) return;
    if (!month) return;
    if (!isAuthenticated) return;
    if (didAutoCalculateRef.current) return;
    if (studentsLoading || subjectsLoading || resultsLoading) return;
    if (Object.keys(existingResults || {}).length > 0) return;

    didAutoCalculateRef.current = true;
    // Ensure rejections from the auto-calculate path are handled
    // to prevent "Uncaught (in promise)" console noise.
    calculateResultsMutation.mutateAsync().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    normalizedStream,
    month,
    isAuthenticated,
    studentsLoading,
    subjectsLoading,
    resultsLoading,
    existingResults,
  ]);

  // Calculate results mutation
  const calculateResultsMutation = useMutation({
    mutationFn: async () => {
      try {
        const params = {
          level: normalizedLevel,
          stream: normalizedStream,
          year: parseInt(year),
          month: month,
        };
        // For Form V/VI, include term parameter
        if (isFormVOrVI) {
          params.term = currentTerm;
        }
        return await studentsAPI.calculateMonthlyResults(params);
      } catch (error) {
        console.error('Error calculating results:', error);
        throw error;
      }
    },
    onSuccess: (response) => {
      const calculatedResults = response.data.results || {};
      setResults(calculatedResults);
      toast.success(response.data.message || 'Results calculated and saved successfully!');
      // Invalidate and refetch to ensure we have the latest data
      queryClient.invalidateQueries(['monthly-results', normalizedLevel, normalizedStream, year, month]);
      queryClient.refetchQueries(['monthly-results', normalizedLevel, normalizedStream, year, month]);
    },
    onError: (error) => {
      console.error('Calculate results error:', error);
      toast.error(error.response?.data?.message || 'Failed to calculate results');
    },
  });

  // Save result mutation
  const saveResultMutation = useMutation({
    mutationFn: async (data) => {
      try {
        return await studentsAPI.saveMonthlyResult(data);
      } catch (error) {
        console.error('Error saving result:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-results', normalizedLevel, normalizedStream, year, month]);
      toast.success('Result saved successfully!');
      setEditingIndex(null);
      setEditForm({});
    },
    onError: (error) => {
      console.error('Save result error:', error);
      toast.error(error.response?.data?.message || 'Failed to save result');
    },
  });

  // Delete result mutation
  const deleteResultMutation = useMutation({
    mutationFn: async (params) => {
      try {
        return await studentsAPI.deleteMonthlyResult(params);
      } catch (error) {
        console.error('Error deleting result:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-results', normalizedLevel, normalizedStream, year, month]);
      toast.success('Result deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete result error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete result');
    },
  });

  const handleCalculate = () => {
    calculateResultsMutation.mutate();
  };

  const handleEdit = (studentIndex) => {
    setEditingIndex(studentIndex);
    setEditForm(results[studentIndex] || {});
  };

  const handleSave = (studentIndex) => {
    saveResultMutation.mutate({
      level: normalizedLevel,
      stream: normalizedStream,
      year: parseInt(year),
      month: month,
      student_index: studentIndex,
      ...editForm,
    });
  };

  const handleDelete = (studentIndex) => {
    if (window.confirm('Are you sure you want to delete this result?')) {
      deleteResultMutation.mutate({
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        month: month,
        student_index: studentIndex,
      });
      
      // Remove from local state
      const newResults = { ...results };
      delete newResults[studentIndex];
      setResults(newResults);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const getBackPath = () => {
    if (isFormVOrVI) {
      return `/admin/results/monthly/${formLevel}/stream/${stream}/year/${year}/months`;
    } else {
      return `/admin/results/monthly/${formLevel}/year/${year}/stream/${stream}/months`;
    }
  };

  // Memoize student index map to avoid O(n²) recalculations
  const studentIndexMap = useMemo(() => {
    const sorted = [...students].sort((a, b) => a.adm_no.localeCompare(b.adm_no));
    const map = {};
    sorted.forEach((s, i) => { map[s.adm_no] = i.toString(); });
    return map;
  }, [students]);

  const getStudentIndex = (student) => {
    return studentIndexMap[student.adm_no] || '0';
  };

  // Format subject scores:
  // - remove trailing ".00" (e.g. 12.00 -> 12)
  // - keep real decimals when present (e.g. 12.50 -> 12.5)
  const formatSubjectScore = (value) => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return String(value);
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    return String(num)
      .replace(/(\.\d*?[1-9])0+$/, '$1')
      .replace(/\.0+$/, '');
  };

  // Render COM display text (database stores Sc/Ss/Ui, UI shows requested labels)
  const formatComDisplay = (value) => {
    const code = String(value || '').trim();
    if (!code) return '-';
    if (code === 'Sc') return 'Science';
    if (code === 'Ss') return 'Art';
    if (code === 'Ui') return 'Under investigation';
    return code; // fallback: show raw stored code
  };

  // A-Level (FORM V/VI): DB stores the registered combination as a shortform like PCM/HGE/HGL.
  const formatComCombination = (value) => {
    const code = String(value || '').trim().toUpperCase();
    return code || '-';
  };

  // Sort students: by position if results exist, otherwise alphabetically
  const sortedStudents = [...students].sort((a, b) => {
    const indexA = getStudentIndex(a);
    const indexB = getStudentIndex(b);
    const resultA = results[indexA];
    const resultB = results[indexB];

    // Sort by AVR (average) desc only.
    const avgA = resultA?.average !== null && resultA?.average !== undefined ? Number(resultA.average) : null;
    const avgB = resultB?.average !== null && resultB?.average !== undefined ? Number(resultB.average) : null;

    const aHasAvg = avgA !== null && Number.isFinite(avgA);
    const bHasAvg = avgB !== null && Number.isFinite(avgB);

    if (aHasAvg && bHasAvg && avgA !== avgB) return avgB - avgA;

    // If AVR ties, rank by TOT desc so POS aligns chronologically.
    // (Backend uses total_marks as tie-breaker for AVR ties.)
    if (aHasAvg && bHasAvg && avgA === avgB) {
      const totA = resultA?.total_marks !== null && resultA?.total_marks !== undefined ? Number(resultA.total_marks) : null;
      const totB = resultB?.total_marks !== null && resultB?.total_marks !== undefined ? Number(resultB.total_marks) : null;

      const aHasTot = totA !== null && Number.isFinite(totA);
      const bHasTot = totB !== null && Number.isFinite(totB);

      if (aHasTot && bHasTot && totA !== totB) return totB - totA;
    }
    if (aHasAvg && !bHasAvg) return -1;
    if (!aHasAvg && bHasAvg) return 1;

    // If averages missing, sort alphabetically by first_name, then middle_name, then surname
    if (a.first_name !== b.first_name) {
      return a.first_name.localeCompare(b.first_name);
    }
    if ((a.middle_name || '') !== (b.middle_name || '')) {
      return (a.middle_name || '').localeCompare(b.middle_name || '');
    }
    return a.surname.localeCompare(b.surname);
  });

  const testType = getTestType(month, normalizedLevel);
  const className = `${normalizedLevel} ${normalizedStream} ${year}`;
  const isALevel = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');

  const formatALevelSubjectHeader = (label) => {
    const s = String(label || '').trim();
    if (!s) return s;

    // Database may store A-level advanced subjects with prefixes like "A/BIO"
    // but printed results expect: BIO, CHE, ACOM, DIV, HTM, MAT, PHY.
    const m1 = s.match(/^A\/(BIO|CHE|COM|DIV|HTM|MAT|PHY)$/i);
    if (m1) {
      const code = m1[1].toUpperCase();
      return code === 'COM' ? 'ACOM' : code;
    }

    const m2 = s.match(/^A_(BIO|CHE|COM|DIV|HTM|MAT|PHY)$/i);
    if (m2) {
      const code = m2[1].toUpperCase();
      return code === 'COM' ? 'ACOM' : code;
    }

    return s;
  };

  // Generate PDF function - Using window.print() with CSS page breaks
  const handlePrint = async () => {
    const btn = document.getElementById('downloadResultsBtn');
    const btnText = document.getElementById('downloadBtnText');
    if (btn && btnText) {
      btn.disabled = true;
      btnText.textContent = 'Generating PDF...';
      btn.style.opacity = '0.7';
      btn.style.cursor = 'wait';
    }
    
    try {
      // Call the backend PDF generation endpoint
      const response = await studentsAPI.downloadMonthlyResultsPDF({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        month: month
      }).catch((error) => {
        console.error('PDF download promise error:', error);
        throw error;
      });
      
      // Check if response data exists
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Check if it's actually a PDF (first 4 bytes should be %PDF)
      const data = response.data;
      let blobData = data;
      
      // If it's an ArrayBuffer, convert to Uint8Array
      if (data instanceof ArrayBuffer) {
        blobData = new Uint8Array(data);
      }
      
      // Check PDF signature
      if (blobData instanceof Uint8Array) {
        if (blobData.length < 4 || 
            blobData[0] !== 0x25 || // %
            blobData[1] !== 0x50 || // P
            blobData[2] !== 0x44 || // D
            blobData[3] !== 0x46) { // F
          // Might be an error JSON response
          const text = new TextDecoder().decode(blobData.slice(0, 200));
          if (text.trim().startsWith('{') || text.trim().startsWith('<!')) {
            throw new Error('Server returned an error instead of PDF. Check console for details.');
          }
          throw new Error('Downloaded file is not a valid PDF');
        }
      }
      
      // Create blob from response
      const blob = new Blob([data], { type: 'application/pdf' });
      
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      const filename = `Monthly_Results_${normalizedLevel}_${normalizedStream}_${year}_${month}.pdf`.replace(/\s+/g, '_');
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.response);
      
      // If error response contains JSON, try to parse it
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          toast.error('Failed to generate PDF: ' + (errorData.message || 'Unknown error'));
        } catch {
          toast.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
        }
      } else {
        toast.error('Failed to generate PDF: ' + (error.response?.data?.message || error.message || 'Unknown error'));
      }
    } finally {
      if (btn && btnText) {
        btn.disabled = false;
        btnText.textContent = 'Download Result (PDF)';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }
  };

  // CSV download function - Enhanced to include all required data
  const handleDownloadCSV = () => {
    const table = document.querySelector('.compact-results-table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    let csv = [];
    
    // Add school header information
    csv.push(['CATHOLIC ARCHDIOCESE OF ARUSHA']);
    csv.push(['ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU']);
    csv.push(['P.O BOX 3102 Arusha, Tanzania']);
    csv.push(['+255 754 92 60 22 / +255 765 394 802']);
    csv.push(['Email: arucase@gmail.com']);
    csv.push([]);
    
    // Add title row with formatted test type
    // Test types: MONTHLY TEST, MID-TERM TEST, ANNUAL, TERMINAL
    let formattedTestTypeCSV = testType
      .replace('MID-TERM', 'MIDTERM')
      .replace(' TEST', '')
      .trim();
    // Add RESULTS suffix
    formattedTestTypeCSV = formattedTestTypeCSV + ' RESULTS';
    csv.push([`${normalizedLevel} ${formattedTestTypeCSV} ${month ? month.toUpperCase() : ''} ${year}`]);
    csv.push([]);
    
    // Process header row
    const headerRow = rows[0];
    const headers = [];
    headerRow.querySelectorAll('th').forEach(th => {
      const rotatedHeader = th.querySelector('.rotate-header');
      if (rotatedHeader) {
        headers.push(rotatedHeader.textContent.trim());
      } else {
        headers.push(th.textContent.trim());
      }
    });
    csv.push(headers);
    
    // Process data rows - include all students
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cols = row.querySelectorAll('td');
      const rowData = [];
      cols.forEach(col => {
        let cellText = col.textContent.trim();
        // Replace '-' with empty string for numeric fields if needed
        if (cellText === '-' && (col.classList.contains('result-col') || col.classList.contains('subject-col'))) {
          cellText = '';
        }
        rowData.push(cellText);
      });
      if (rowData.length > 0) {
        csv.push(rowData);
      }
    }
    
    // Convert to CSV string with proper escaping
    let csvContent = csv.map(row => {
      return row.map(cell => {
        const cellStr = String(cell);
        // Escape cells containing comma, quote, or newline
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    // Add BOM for Excel compatibility (UTF-8)
    const BOM = '\uFEFF';
    csvContent = BOM + csvContent;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `${className}_${testType}_${month}_${year}`.replace(/\s+/g, '_') + '.csv';
    
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, filename);
    } else {
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV file downloaded successfully!');
    }
  };

  return (
    <AdminLayout>
      <div className="monthly-results-mgmt-page-container monthly-results-management">
        <div className="excel-card monthly-results-management">
          <div className="excel-card-header">
            <i className="fas fa-chart-bar"></i> MONTHLY RESULTS MANAGEMENT
            <div className="header-actions">
              <button
                type="button"
                onClick={handleCalculate}
                className="excel-btn primary small"
                disabled={calculateResultsMutation.isLoading}
              >
                <i className="fas fa-calculator"></i> {calculateResultsMutation.isLoading ? 'Calculating...' : 'Calculate Results'}
              </button>
              <Link to={getBackPath()} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || subjectsLoading || resultsLoading ? (
              <div className="loading-state">Loading...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-chart-bar empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students have been registered for this class yet.</p>
              </div>
            ) : (
              <>
                <div className="results-info">
                  <div className="info-item"><strong>Students:</strong> {students.length}</div>
                  <div className="info-item"><strong>Month:</strong> {month}</div>
                  <div className="info-item"><strong>Year:</strong> {year}</div>
                  <div className="info-item">
                    <strong>Grading:</strong> {isALevel ? 'A-Level' : 'O-Level'}
                  </div>
                </div>
                <div className="print-spacer-bottom"></div>
              </>
            )}
          </div>
        </div>

        {!studentsLoading && !subjectsLoading && !resultsLoading && students.length > 0 && (
          <>
            <div className="print-button-container">
              <button type="button" onClick={handlePrint} id="downloadResultsBtn" className="download-btn-monthly">
                <i className="fas fa-file-pdf"></i> <span id="downloadBtnText">Download Result (PDF)</span>
              </button>
              <button type="button" onClick={handleDownloadCSV} className="download-btn-monthly" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                <i className="fas fa-file-csv"></i> Download CSV
              </button>
            </div>

            {/* Report Header */}
            <div className="report-header-section">
              <div className="report-header">
                <div className="logo-section">
                  {schoolLogoData?.logo_image_path ? (
                    <img
                      src={(() => {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                        const baseUrl = apiUrl.replace('/api', '');
                        const cleanPath = schoolLogoData.logo_image_path.startsWith('/') 
                          ? schoolLogoData.logo_image_path.substring(1) 
                          : schoolLogoData.logo_image_path;
                        return `${baseUrl}/static/${cleanPath}`;
                      })()}
                      alt="Arusha Catholic Seminary official school logo"
                      className="school-logo"
                      loading="eager"
                      onError={(e) => {
                        console.error('[MonthlyResults] Logo image load error:', e.target.src);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="school-logo-placeholder">
                      <i className="fas fa-school"></i>
                    </div>
                  )}
                </div>
                <div className="school-info">
                  <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
                  <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
                  <div className="contact-info">
                    <p>P.O BOX 3102 Arusha, Tanzania</p>
                    <p>+255 754 92 60 22 / +255 765 394 802</p>
                    <p>Email: arucase@gmail.com</p>
                  </div>
                </div>
                <div className="logo-section-right">
                  {schoolLogoData?.logo_image_path ? (
                    <img
                      src={(() => {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                        const baseUrl = apiUrl.replace('/api', '');
                        const cleanPath = schoolLogoData.logo_image_path.startsWith('/') 
                          ? schoolLogoData.logo_image_path.substring(1) 
                          : schoolLogoData.logo_image_path;
                        return `${baseUrl}/static/${cleanPath}`;
                      })()}
                      alt="Arusha Catholic Seminary official school logo"
                      className="school-logo-right"
                      loading="eager"
                      onError={(e) => {
                        console.error('[MonthlyResults] Logo image load error:', e.target.src);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="school-logo-placeholder">
                      <i className="fas fa-school"></i>
                    </div>
                  )}
                </div>
              </div>
              <div className="test-info-bar">
                {(() => {
                  // Extract just the form level (e.g., "FORM III" from "FORM III A 2025")
                  const formLevelOnly = normalizedLevel;
                  // Format test type: remove hyphen from MID-TERM and remove TEST, then add RESULTS
                  // Test types: MONTHLY TEST, MID-TERM TEST, ANNUAL, TERMINAL
                  let formattedTestType = testType
                    .replace('MID-TERM', 'MIDTERM')
                    .replace(' TEST', '')
                    .trim();
                  // Add RESULTS suffix
                  formattedTestType = formattedTestType + ' RESULTS';
                  return `${formLevelOnly} ${formattedTestType} ${month ? month.toUpperCase() : ''} ${year}`;
                })()}
              </div>
            </div>

            {/* Results Table */}
            <div className="results-table-container">
              <div className="results-table-wrapper">
                <table className="compact-results-table">
                  <thead>
                    <tr>
                      <th className="sticky-col col-sn">S/N</th>
                      <th className="sticky-col col-fname">F.Name</th>
                      <th className="sticky-col col-mname">M.Name</th>
                      <th className="sticky-col col-sname">Surname</th>
                      {subjects.map((subject) => (
                        <th key={subject.subject_code} className="subject-col">
                          <div className="rotate-header">
                            {isALevel
                              ? formatALevelSubjectHeader(subject.subject_abbreviation || subject.subject_code)
                              : (subject.subject_abbreviation || subject.subject_code)}
                          </div>
                        </th>
                      ))}
                      <th className="result-col">TOT</th>
                      <th className="result-col">AVR</th>
                      <th className="result-col">GRD</th>
                      <th className="result-col">POS</th>
                      <th className="comb-col">COM</th>
                      <th className="remarks-col">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student, index) => {
                      const studentIndex = getStudentIndex(student);
                      const result = results[studentIndex] || {};
                      const studentScores = subjectScores[student.adm_no] || {};
                      const gradeClass = result.grade || 'none';
                      const avgValue = result.average ? parseFloat(result.average) : null;
                      // Grade C-low only applies to O-Level when average < 55
                      const gradeRowClass = gradeClass === 'C' && avgValue !== null && avgValue < 55 && !isALevel
                        ? `grade-row-${gradeClass}-low`
                        : `grade-row-${gradeClass}${isALevel ? ' a-level' : ''}`;
                      
                      return (
                        <tr key={student.adm_no} className={gradeRowClass}>
                          <td className="sticky-col col-sn">{index + 1}</td>
                          <td className="sticky-col col-fname">{student.first_name}</td>
                          <td className="sticky-col col-mname">{student.middle_name || '-'}</td>
                          <td className="sticky-col col-sname">{student.surname}</td>
                          {subjects.map((subject) => {
                            // Match Flask template: use abbreviation if available, otherwise use code
                            const subjectKey = subject.subject_abbreviation || subject.subject_code;
                            // Try both abbreviation and code to match scores
                            const score = studentScores[subjectKey] || studentScores[subject.subject_code];
                            return (
                              <td key={subject.subject_code} className="subject-col">
                                {formatSubjectScore(score)}
                              </td>
                            );
                          })}
                          <td className="result-col tot-col">
                            {formatSubjectScore(result.total_marks)}
                          </td>
                          <td className="result-col">
                            {result.average !== null && result.average !== undefined 
                              ? Math.round(result.average) 
                              : '-'}
                          </td>
                          <td className="result-col grd-col">{result.grade || '-'}</td>
                          <td className="result-col">{result.position || '-'}</td>
                          <td className="comb-col">
                            {isALevel
                              ? formatComCombination(student.com || student.stream)
                              : formatComDisplay(student.com)}
                          </td>
                          <td className="remarks-col">{result.remarks || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print-spacer-bottom"></div>

            <div className="back-margin">
              <Link to={getBackPath()} className="excel-btn">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
              <button type="button" onClick={handleDownloadCSV} className="excel-btn csv-btn">
                <i className="fas fa-file-csv"></i> Download CSV
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default MonthlyResultsManagement;

