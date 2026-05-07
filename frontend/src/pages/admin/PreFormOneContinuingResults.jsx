/**
 * Pre-Form One Continuing Results Page
 * Displays and manages Pre-Form One continuing subjects test results with automatic calculation
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import preFormOneContinuingSubjectsService from '../../services/preFormOneContinuingSubjectsService';
import preFormOneStudentsService from '../../services/preFormOneStudentsService';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import './PreFormOneResults.css';

const PreFormOneContinuingResults = () => {
  const { year } = useParams();
  const queryClient = useQueryClient();
  
  const [results, setResults] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [subjectScores, setSubjectScores] = useState({});

  // Scoring criteria and grading constants
  const GRADING_SCALE = [
    { min: 75, grade: 'A', remarks: 'AMECHAGULIWA' },
    { min: 65, grade: 'B', remarks: 'AMECHAGULIWA' },
    { min: 50, grade: 'C', remarks: 'AMECHAGULIWA' },
    { min: 40, grade: 'D', remarks: 'HAJACHAGULIWA' },
    { min: 0, grade: 'F', remarks: 'HAJACHAGULIWA' },
  ];

  const PASS_MARK = 55;

  const calculateStudentMetrics = (scoresData) => {
    const scores = Object.values(scoresData).filter(score => score !== null && score !== undefined && score !== '');
    if (scores.length === 0) return { total_marks: 0, average: 0, grade: '-', remarks: '-' };

    const total_marks = scores.reduce((sum, score) => sum + Number(score), 0);
    const average = total_marks / scores.length;
    const gradeInfo = GRADING_SCALE.find(g => average >= g.min) || GRADING_SCALE[GRADING_SCALE.length - 1];
    const remarks = average >= PASS_MARK ? 'AMECHAGULIWA' : 'HAJACHAGULIWA';

    return { total_marks, average: Math.round(average * 100) / 100, grade: gradeInfo.grade, remarks };
  };

  const assignPositions = (resultsObj) => {
    const studentsWithAvg = Object.keys(resultsObj)
      .map(adm => ({ adm, avg: resultsObj[adm].average || 0 }))
      .filter(s => s.avg > 0)
      .sort((a, b) => b.avg - a.avg);

    studentsWithAvg.forEach((item, index) => {
      resultsObj[item.adm].position = index + 1;
    });
    return resultsObj;
  };

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const handleLogoError = (e) => {
    console.error('Logo image load error:', e.target.src);
    e.target.style.display = 'none';
  };

  const fetchScoresForSubject = async (subject, students) => {
    try {
      console.log('🔍 DEBUG: Fetching continuing scores for subject:', subject.subject_name, 'ID:', subject.id);
      const scoresResponse = await preFormOneStudentsService.getStudentScoresBySubject(subject.id, 'continuing');
      console.log('🔍 DEBUG: Scores response for subject:', subject.subject_name, scoresResponse?.data?.length || 0, 'scores');
      
      if (scoresResponse?.data && Array.isArray(scoresResponse.data)) {
        const scores = {};
        scoresResponse.data.forEach(scoreData => {
          const student = students.find(s => s.id === scoreData.student_id);
          if (student) {
            if (!scores[student.admission_number]) scores[student.admission_number] = {};
            scores[student.admission_number][subject.subject_code] = scoreData.score;
          }
        });
        console.log('🔍 DEBUG: Processed scores for subject:', subject.subject_name, 'students:', Object.keys(scores).length);
        return scores;
      }
    } catch (error) {
      console.error(`Error fetching scores for subject ${subject.subject_name}:`, error);
    }
    return {};
  };

  const downloadPDF = async (downloadFn, btnId, btnTextId, successMsg) => {
    const btn = document.getElementById(btnId);
    const btnText = document.getElementById(btnTextId);
    if (btn && btnText) {
      btn.disabled = true;
      btnText.textContent = 'Generating PDF...';
      btn.style.opacity = '0.7';
      btn.style.cursor = 'wait';
    }

    try {
      const response = await downloadFn(year);
      let blob;

      if (response.data instanceof Blob) blob = response.data;
      else if (response.data instanceof ArrayBuffer) blob = new Blob([response.data], { type: 'application/pdf' });
      else if (response.data instanceof Uint8Array) blob = new Blob([response.data], { type: 'application/pdf' });
      else throw new Error('Unexpected response data type');

      if (blob.size === 0) throw new Error('PDF file is empty');

      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      if (uint8Array.length >= 4 && (uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46)) {
        throw new Error('Downloaded file is not a valid PDF');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      link.download = `${successMsg.replace(/\s+/g, '_')}_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
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

  // Check authentication before making queries
  const { isAuthenticated: isAuth } = useAuth();
  const isAuthenticated = isAuth();

  // Fetch Pre-Form One students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['preform-one-students', year],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getStudents(year);
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        console.error('Error fetching Pre-Form One students:', error);
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load students');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch continuing subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['preform-one-continuing-subjects'],
    queryFn: async () => {
      try {
        const res = await preFormOneContinuingSubjectsService.getSubjects();
        return Array.isArray(res) ? res : (res?.data || []);
      } catch (error) {
        console.error('Error fetching continuing subjects:', error);
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load subjects');
        }
        return [];
      }
    },
    enabled: isAuthenticated,
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

  // Fetch continuing scores for all subjects
  useEffect(() => {
    if (subjects.length > 0 && students.length > 0) {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view scores');
        return;
      }

      const fetchScores = async () => {
        try {
          console.log('🔍 DEBUG: Fetching scores for subjects:', subjects.length);
          const scores = {};
          for (const subject of subjects) {
            console.log('🔍 DEBUG: Fetching scores for subject:', subject.subject_name);
            const subjectScores = await fetchScoresForSubject(subject, students);
            console.log('🔍 DEBUG: Subject scores fetched:', Object.keys(subjectScores).length, 'students');
            Object.keys(subjectScores).forEach(adm => {
              if (!scores[adm]) scores[adm] = {};
              scores[adm] = { ...scores[adm], ...subjectScores[adm] };
            });
          }
          console.log('🔍 DEBUG: Total scores fetched for', Object.keys(scores).length, 'students');
          setSubjectScores(scores);
        } catch (error) {
          if (error.response?.status === 401) {
            const errorMessage = error.response?.data?.message || 'Authentication required';
            if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('token expired')) {
              toast.error('Your session has expired. Please refresh the page and log in again.');
            } else {
              toast.error('Authentication required. Please log in again.');
            }
          } else if (error.response?.status === 404) {
            setSubjectScores({});
          } else {
            console.error('Error fetching continuing scores:', error);
            if (error.response?.status !== 404) {
              toast.error('Failed to load scores. Please try again.');
            }
          }
        }
      };
      
      fetchScores().catch((error) => {
        console.error('Unhandled error in fetchScores:', error);
      });
    }
  }, [subjects, students, year]);

  // Fetch continuing results
  const { data: existingResults = {}, isLoading: resultsLoading, error: resultsError } = useQuery({
    queryKey: ['preform-one-continuing-results', year],
    queryFn: async () => {
      try {
        console.log('🔍 DEBUG: Fetching continuing results, year:', year);
        const res = await preFormOneService.getContinuingResults(year);
        console.log('🔍 DEBUG: Continuing results response:', res);
        const results = res.data?.results || {};
        console.log('🔍 DEBUG: Continuing results data:', results);
        return results;
      } catch (error) {
        console.error('Error fetching continuing results:', error);
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load continuing results');
        }
        return {};
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Auto-calculate results when scores are available
  useEffect(() => {
    if (Object.keys(existingResults).length > 0) {
      setResults(existingResults);
    } else if (Object.keys(subjectScores).length > 0 && Object.keys(results).length === 0) {
      const autoCalculatedResults = Object.keys(subjectScores).reduce((acc, admissionNumber) => {
        const student = students.find(s => s.admission_number === admissionNumber);
        if (student && subjectScores[admissionNumber]) {
          acc[admissionNumber] = calculateStudentMetrics(subjectScores[admissionNumber]);
        } else {
          acc[admissionNumber] = {};
        }
        return acc;
      }, {});
      setResults(assignPositions(autoCalculatedResults));
    }
  }, [existingResults, subjectScores, students, results]);

  // Calculate results mutation
  const calculateResultsMutation = useMutation({
    mutationFn: async () => preFormOneService.calculateContinuingResults(year),
    onSuccess: (response) => {
      const calculatedResults = response.data?.results || {};
      const processedResults = Object.keys(calculatedResults).reduce((acc, admissionNumber) => {
        if (students.find(s => s.admission_number === admissionNumber) && subjectScores[admissionNumber]) {
          const metrics = calculateStudentMetrics(subjectScores[admissionNumber]);
          acc[admissionNumber] = { ...calculatedResults[admissionNumber], ...metrics };
        } else {
          acc[admissionNumber] = calculatedResults[admissionNumber];
        }
        return acc;
      }, {});
      setResults(assignPositions(processedResults));
      toast.success(response.data?.message || 'Continuing results calculated and saved successfully!');
      queryClient.invalidateQueries(['preform-one-continuing-results', year]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to calculate continuing results');
    },
  });

  // Save result mutation
  const saveResultMutation = useMutation({
    mutationFn: async (data) => preFormOneService.saveContinuingResult(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['preform-one-continuing-results', year]);
      toast.success('Continuing result saved successfully!');
      setEditingIndex(null);
      setEditForm({});
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save continuing result');
    },
  });

  // Delete result mutation
  const deleteResultMutation = useMutation({
    mutationFn: async (studentId) => preFormOneService.deleteContinuingResult(studentId, year),
    onSuccess: () => {
      queryClient.invalidateQueries(['preform-one-continuing-results', year]);
      toast.success('Continuing result deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete continuing result');
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
      year: parseInt(year),
      student_index: studentIndex,
      ...editForm,
    });
  };

  const handleDelete = (studentId) => {
    if (window.confirm('Are you sure you want to delete this continuing result?')) {
      deleteResultMutation.mutate(studentId);
      const student = students.find(s => s.id === studentId);
      if (student) {
        const newResults = { ...results };
        delete newResults[student.admission_number];
        setResults(newResults);
      }
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const formatSubjectScore = (value) => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return String(value);
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    return String(num).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  };

  // Sort students: by average from highest to lowest if results exist, otherwise alphabetically
  const sortedStudents = [...students].sort((a, b) => {
    const resultA = results[a.admission_number];
    const resultB = results[b.admission_number];

    const avgA = resultA?.average !== null && resultA?.average !== undefined ? Number(resultA.average) : null;
    const avgB = resultB?.average !== null && resultB?.average !== undefined ? Number(resultB.average) : null;

    const aHasAvg = avgA !== null && Number.isFinite(avgA);
    const bHasAvg = avgB !== null && Number.isFinite(avgB);

    if (aHasAvg && bHasAvg && avgA !== avgB) return avgB - avgA;
    if (aHasAvg && !bHasAvg) return -1;
    if (!aHasAvg && bHasAvg) return 1;

    const totalA = resultA?.total_marks !== null && resultA?.total_marks !== undefined ? Number(resultA.total_marks) : null;
    const totalB = resultB?.total_marks !== null && resultB?.total_marks !== undefined ? Number(resultB.total_marks) : null;

    const aHasTotal = totalA !== null && Number.isFinite(totalA);
    const bHasTotal = totalB !== null && Number.isFinite(totalB);

    if (aHasTotal && bHasTotal && totalA !== totalB) return totalB - totalA;
    if (aHasTotal && !bHasTotal) return -1;
    if (!aHasTotal && bHasTotal) return 1;

    if (a.first_name !== b.first_name) return a.first_name.localeCompare(b.first_name);
    if ((a.middle_name || '') !== (b.middle_name || '')) return (a.middle_name || '').localeCompare(b.middle_name || '');
    return a.surname.localeCompare(b.surname);
  });

  const handlePrint = () => downloadPDF(preFormOneService.downloadContinuingResultsPDF, 'downloadResultsBtn', 'downloadBtnText', 'PreFormOne_Continuing_Results');

  // CSV download function
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
    
    // Add title row
    csv.push([`PRE-FORM ONE CONTINUING RESULTS ${year}`]);
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
    
    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cols = row.querySelectorAll('td');
      const rowData = [];
      cols.forEach(col => {
        let cellText = col.textContent.trim();
        if (cellText === '-' && (col.classList.contains('result-col') || col.classList.contains('subject-col'))) {
          cellText = '';
        }
        rowData.push(cellText);
      });
      if (rowData.length > 0) {
        csv.push(rowData);
      }
    }
    
    // Convert to CSV string
    let csvContent = csv.map(row => {
      return row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    csvContent = BOM + csvContent;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `PreFormOne_Continuing_Results_${year}`.replace(/\s+/g, '_') + '.csv';
    
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
    <div className="preform-one-results-page-container">
      <div className="excel-card preform-one-results">
        <div className="excel-card-header">
          <i className="fas fa-chart-line"></i> PRE-FORM ONE CONTINUING RESULTS
          <div className="header-actions">
            <button
              type="button"
              onClick={handleCalculate}
              className="excel-btn primary small"
              disabled={calculateResultsMutation.isLoading}
            >
              <i className="fas fa-calculator"></i> {calculateResultsMutation.isLoading ? 'Calculating...' : 'Calculate Results'}
            </button>
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn secondary small">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
        <div className="excel-card-body">
          {studentsLoading || subjectsLoading || resultsLoading ? (
            <div className="loading-state">Loading...</div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users empty-icon"></i>
              <h3>No Pre-Form One Students Found</h3>
              <p>No students have been registered for Pre-Form One {year} yet.</p>
            </div>
          ) : (
            <>
              <div className="results-info">
                <div className="info-item"><strong>Students:</strong> {students.length}</div>
                <div className="info-item"><strong>Year:</strong> {year}</div>
                <div className="info-item"><strong>Subjects:</strong> {subjects.length}</div>
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
                    src={getLogoUrl(schoolLogoData.logo_image_path)}
                    alt="Arusha Catholic Seminary official school logo"
                    className="school-logo"
                    loading="eager"
                    onError={handleLogoError}
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
                    src={getLogoUrl(schoolLogoData.logo_image_path)}
                    alt="Arusha Catholic Seminary official school logo"
                    className="school-logo-right"
                    loading="eager"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="school-logo-placeholder">
                    <i className="fas fa-school"></i>
                  </div>
                )}
              </div>
            </div>
            <div className="test-info-bar">
              PRE-FORM ONE CONTINUING RESULTS {year}
            </div>
          </div>

          {/* Results Table */}
          <div className="results-table-container">
            <div className="results-table-wrapper">
              <table className="compact-results-table">
                <thead>
                  <tr>
                    <th className="sticky-col col-sn">S/N</th>
                    <th className="sticky-col col-adm">Adm No</th>
                    <th className="sticky-col col-fname">F.Name</th>
                    <th className="sticky-col col-mname">M.Name</th>
                    <th className="sticky-col col-sname">Surname</th>
                    <th className="sticky-col col-parish">Parish</th>
                    {subjects.map((subject) => (
                      <th key={subject.id} className="subject-col">
                        <div className="rotate-header">
                          {subject.subject_code}
                        </div>
                      </th>
                    ))}
                    <th className="result-col">TOT</th>
                    <th className="result-col">AVR</th>
                    <th className="result-col">GRD</th>
                    <th className="result-col">POS</th>
                    <th className="result-col">REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student, index) => {
                    const result = results[student.admission_number] || {};
                    const studentScores = subjectScores[student.admission_number] || {};
                    const gradeClass = result.grade || 'none';
                    const avgValue = result.average ? parseFloat(result.average) : null;
                    const gradeRowClass = gradeClass === 'C' && avgValue !== null && avgValue < 55
                      ? `grade-row-${gradeClass}-low`
                      : `grade-row-${gradeClass}`;

                    return (
                      <tr key={student.id} className={gradeRowClass}>
                        <td className="sticky-col col-sn">{index + 1}</td>
                        <td className="sticky-col col-adm">{student.admission_number}</td>
                        <td className="sticky-col col-fname">{student.first_name}</td>
                        <td className="sticky-col col-mname">{student.middle_name || '-'}</td>
                        <td className="sticky-col col-sname">{student.surname}</td>
                        <td className="sticky-col col-parish">{student.parish || '-'}</td>
                        {subjects.map((subject) => (
                          <td key={subject.id} className="subject-col">
                            {formatSubjectScore(studentScores[subject.subject_code])}
                          </td>
                        ))}
                        <td className="result-col tot-col">{formatSubjectScore(result.total_marks)}</td>
                        <td className="result-col">{result.average !== null && result.average !== undefined ? Math.round(result.average) : '-'}</td>
                        <td className="result-col grd-col">{result.grade || '-'}</td>
                        <td className="result-col">{result.position || '-'}</td>
                        <td className="result-col">{result.remarks || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="print-spacer-bottom"></div>

          <div className="back-margin">
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
            <button type="button" onClick={handleDownloadCSV} className="excel-btn csv-btn">
              <i className="fas fa-file-csv"></i> Download CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PreFormOneContinuingResults;
