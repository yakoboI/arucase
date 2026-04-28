/**
 * Comments Management Page
 * Generic component for text-based comment modules (Sala, Huduma, Tabia, Michezo, Taaluma, Mwalimu, Mkuu)
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import api from '../../services/api';
import './CommentsManagement.css';

const CommentsManagement = ({ formLevel, moduleName, commentType, moduleLabel, icon }) => {
  const { year, stream, term } = useParams();
  const queryClient = useQueryClient();
  
  const [comments, setComments] = useState({});
  const [saveTimeouts, setSaveTimeouts] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [uploading, setUploading] = useState(false);
  const scrollPositionRef = useRef(0);
  const fileInputRef = useRef(null);

  // Normalize form level
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  // Check if this is Form V or VI
  const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';

  // Don't normalize stream here - let backend handle it
  const normalizedStream = stream || 'NA';

  // Normalize term to match backend format (First Term/Second Term)
  const normalizeTerm = (termParam) => {
    if (!termParam) return 'Term I';
    const t = termParam.trim();
    if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
    if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
    if (/^First\s+Term$/i.test(t)) return 'First Term';
    if (/^Second\s+Term$/i.test(t)) return 'Second Term';
    return t; // Return as-is if no match
  };

  const normalizedTerm = normalizeTerm(term);

  console.log(`[COMMENT MGMT] URL params: stream=${stream}, normalizedStream=${normalizedStream}, level=${normalizedLevel}, year=${year}, term=${term}, normalizedTerm=${normalizedTerm}, isFormVOrVI=${isFormVOrVI}, commentType=${commentType}`);

  // Grade to comment mapping for Mkuu comments
  const getGradeComment = (grade) => {
    if (commentType === 'mwalimu_taaluma') {
      const mwalimuGradeMap = {
        'A': 'Amefanya vizuri',
        'B': 'Amefanya vizuri',
        'C': 'Ufaulu wa wastani',
        'D': 'Ufaulu dhaifu. Aongeze bidii katika masomo',
        'E': 'Anahitaji kujitahidi zaidi',
        'F': 'Amefeli',
        'S': 'Kidogo. Anahitaji kuongeza juhudi'
      };
      return mwalimuGradeMap[grade?.toUpperCase()] || '';
    } else {
      const mkuuGradeMap = {
        'A': 'Pongezi kwa matokeo haya mazuri; dumu katika kiwango hiki.',
        'B': 'Amefanya vizuri,akazane kufikia kiwango cha juu zaidi.',
        'C': 'Uwezo upo, ongeza umakini ili kupata matokeo bora zaidi.',
        'D': 'Asikate tamaa; akiongeza juhudi atafanya vyema zaidi.',
        'E': 'Masomo yanahitaji muda na bidii yake zaidi.',
        'F': 'Ni lazima azingatie maelekezo ya walimu ili kufaulu.',
        'S': 'Jitihada zake bado hazitoshi; azingatie masomo sasa hivi.'
      };
      return mkuuGradeMap[grade?.toUpperCase()] || '';
    }
  };

  // Auto-fill comments based on grades (for Mkuu and Mwalimu comments)
  const handleAutoFillComments = () => {
    if (commentType !== 'mkuu_shule' && commentType !== 'mwalimu_taaluma') {
      toast.warning('Auto-fill is only available for Mkuu and Mwalimu comments');
      return;
    }

    if (Object.keys(classGrades).length === 0) {
      toast.warning('Class grades not available. Please ensure grades are calculated.');
      return;
    }

    const newComments = {};
    students.forEach((student) => {
      const studentIndex = getStudentIndex(student);
      const grade = classGrades[student.adm_no];
      if (grade) {
        newComments[studentIndex] = getGradeComment(grade);
      }
    });

    setComments(newComments);

    // Save all auto-filled comments to database
    Object.keys(newComments).forEach((studentIndex) => {
      const commentText = newComments[studentIndex];
      saveCommentMutation.mutate({ studentIndex, commentText });
    });

    toast.success('Comments auto-filled and saved based on grades');
  };

  // Helper function 

  // Fetch students for this class 
  // For FORM I-IV with stream 'A', fetch from BOTH streams to match report generation student_index calculation
  const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(normalizedLevel);
  const { data: studentsData = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, year, ...(isFormVOrVI ? [normalizedTerm] : [])],
    queryFn: async () => {
      const res = await studentsAPI.getStudents({
        // For Form I-IV, don't filter by term - show all students for the year
        // For Form V/VI, filter by term
        ...(isFormVOrVI ? { term: normalizedTerm } : {}),
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      console.log(`[COMMENT MGMT] API call params:`, {
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        term: isFormVOrVI ? normalizedTerm : 'not sent (Form I-IV)',
        isFormVOrVI: isFormVOrVI
      });
      const students = res.data.students || [];
      console.log(`[COMMENT MGMT] Fetched ${students.length} students for ${normalizedLevel} stream=${normalizedStream} year=${year}`);
      console.log(`[COMMENT MGMT] Students:`, students.map(s => ({ adm_no: s.adm_no, name: `${s.first_name} ${s.middle_name || ''} ${s.surname}`, stream: s.stream })));
      // Backend already sorts students by name (ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC)
      return students;
    },
  });
  
  const students = studentsData;

  // Fetch existing comments
  const { data: existingComments = {}, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', commentType, normalizedLevel, normalizedStream, year, normalizedTerm],
    queryFn: async () => {
      const res = await studentsAPI.getComments({
        comment_type: commentType,
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        term: normalizedTerm,
      });
      return res.data.comments || {};
    },
    enabled: students.length > 0,
  });

  // Fetch class grades (grade of average of weighted totals) for display between Year and Comments
  const { data: classGradesData = {}, isLoading: gradesLoading, isError: gradesError } = useQuery({
    queryKey: ['class-grades', normalizedLevel, normalizedStream, year, normalizedTerm],
    queryFn: async () => {
      const res = await studentsAPI.getClassGrades({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        term: normalizedTerm,
      });
      return res.data.grades || {};
    },
    enabled: students.length > 0,
    retry: false,
  });
  const classGrades = classGradesData;

  // Initialize comments from existing comments
  useEffect(() => {
    if (Object.keys(existingComments).length > 0) {
      setComments(existingComments);
    }
  }, [existingComments]);

  // Save comment mutation
  const saveCommentMutation = useMutation({
    mutationFn: async ({ studentIndex, commentText }) => {
      return api.post('/students/comments', {
        comment_type: commentType,
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        term: normalizedTerm,
        student_index: studentIndex,
        comment_text: commentText,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['comments', commentType, normalizedLevel, normalizedStream, year, normalizedTerm]);
      setSavingStates(prev => ({ ...prev, [variables.studentIndex]: 'saved' }));
      setTimeout(() => {
        setSavingStates(prev => {
          const newState = { ...prev };
          delete newState[variables.studentIndex];
          return newState;
        });
      }, 2000);
    },
    onError: (error, variables) => {
      // Don't show error toast for 401 errors - interceptor handles logout
      if (error.response?.status === 401) {
        setSavingStates(prev => {
          const newState = { ...prev };
          delete newState[variables.studentIndex];
          return newState;
        });
        return;
      }
      setSavingStates(prev => ({ ...prev, [variables.studentIndex]: 'error' }));
      toast.error(error.response?.data?.message || 'Failed to save comment');
    },
  });

  const handleCommentChange = (studentIndex, value) => {
    const newComments = { ...comments, [studentIndex]: value };
    setComments(newComments);

    // Clear existing timeout for this student
    if (saveTimeouts[studentIndex]) {
      clearTimeout(saveTimeouts[studentIndex]);
    }

    // Auto-save after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      saveCommentMutation.mutate({ studentIndex, commentText: value });
    }, 3000);

    setSaveTimeouts(prev => ({ ...prev, [studentIndex]: timeout }));
  };

  // Handle blur - save immediately when clicking on another input
  const handleCommentBlur = (studentIndex, value) => {
    // Clear the timeout since we're saving now
    if (saveTimeouts[studentIndex]) {
      clearTimeout(saveTimeouts[studentIndex]);
      setSaveTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[studentIndex];
        return newTimeouts;
      });
    }

    // Save immediately on blur (when clicking another input)
    // Set saving state
    setSavingStates(prev => ({ ...prev, [studentIndex]: 'saving' }));
    // Save immediately
    saveCommentMutation.mutate({ studentIndex, commentText: value });
  };

  // Save scroll position
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.pageYOffset;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`scroll_${commentType}_${year}_${stream}_${term}`);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition));
      }, 100);
    }
  }, [commentType, year, stream, term]);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return `/admin/${moduleName}/${formLevel}/stream/${stream}/year/${year}/terms`;
    } else {
      return `/admin/${moduleName}/${formLevel}/year/${year}/streams`;
    }
  };

  const getOtherTermPath = () => {
    const otherTerm = normalizedTerm === 'First Term' ? 'Second Term' : 'First Term';
    if (isFormVOrVI) {
      return `/admin/${moduleName}/${formLevel}/stream/${stream}/year/${year}/term/${otherTerm}`;
    } else {
      return `/admin/${moduleName}/${formLevel}/year/${year}/stream/${stream}/term/${otherTerm}`;
    }
  };

  // Calculate student index (position in sorted list)
  // Backend already sorts students by name (ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC)
  const getStudentIndex = (student, index) => {
    const studentIndex = students.findIndex(
      (s) => String(s.adm_no) === String(student.adm_no)
    ).toString();
    console.log(`[COMMENT MGMT] Student ${student.adm_no}: student_index=${studentIndex}, total_students=${students.length}, stream=${normalizedStream}, level=${normalizedLevel}`);
    return studentIndex;
  };

  // CSV: escape cell for CSV (quote if contains comma, newline, or quote)
  const csvEscape = (val) => {
    const s = String(val ?? '').trim();
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  // Download CSV template (system requirement) – columns expected for this class
  const handleDownloadTemplate = () => {
    const headers = ['AdmNumber', 'first_name', 'middle_name', 'surname', 'Comment'];
    const headerRow = headers.join(',');
    const rows = students.map((s) => {
      const idx = getStudentIndex(s);
      const comment = comments[idx] ?? '';
      return [csvEscape(s.adm_no), csvEscape(s.first_name), csvEscape(s.middle_name), csvEscape(s.surname), csvEscape(comment)].join(',');
    });
    const csv = [headerRow, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleName}_comments_template_${year}_${stream}_${(term || '').replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded');
  };

  // Parse a line by delimiter (',' or '\t'), respecting quoted fields for comma
  const parseLine = (line, delimiter = ',') => {
    if (delimiter === '\t') {
      return line.split('\t').map((cell) => String(cell).trim().replace(/^\uFEFF/, ''));
    }
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (inQuotes) {
        cur += c;
      } else if (c === delimiter) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur.trim().replace(/^\uFEFF/, ''));
    return out;
  };

  const parseCSVLine = (line) => parseLine(line, ',');

  // Find student by adm_no (exact or numeric match so Excel-stripped leading zeros still match)
  const findStudentByAdmNo = (admNoStr) => {
    const a = String(admNoStr ?? '').trim();
    if (!a) return null;
    const byExact = students.find((s) => String(s.adm_no).trim() === a);
    if (byExact) return byExact;
    const aNum = Number(a);
    if (!Number.isNaN(aNum)) {
      return students.find((s) => Number(s.adm_no) === aNum || String(s.adm_no).trim() === a);
    }
    return null;
  };

  // Upload filled CSV and save comments (deferred so change handler returns quickly)
  const handleUploadFilled = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    const run = async () => {
      try {
        let text = await file.text();
        text = text.replace(/^\uFEFF/, ''); // strip BOM
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          console.error('[Comments CSV upload] Rejected: file must have a header row and at least one data row. Lines found:', lines.length, 'First line:', lines[0] || '(none)');
          toast.error('CSV must have a header row and at least one data row');
          return;
        }
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') && firstLine.split('\t').length >= 2 ? '\t' : ',';
        const rawHeaderCells = parseLine(firstLine, delimiter);
        const header = rawHeaderCells.map((h) => String(h).trim().replace(/\uFEFF/g, '').replace(/\s/g, '').toLowerCase());
        const admNoIdx = header.findIndex((h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission'));
        const commentIdx = header.findIndex((h) => h === 'comment' || h === 'comments');
        if (admNoIdx === -1 || commentIdx === -1) {
          console.error('[Comments CSV upload] Rejected: required columns "AdmNumber" and "Comment" not found. Raw first row:', rawHeaderCells, 'Normalized headers:', header);
          toast.error(
            'Upload rejected: the system expects the first row to contain column headers "AdmNumber" and "Comment". Your first row: ' +
              (rawHeaderCells.join(', ') || '(empty)')
          );
          return;
        }
        const commentsPayload = [];
        let skipped = 0;
        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNo = String(cells[admNoIdx] ?? '').trim();
          const commentText = String(cells[commentIdx] ?? '').trim();
          if (!admNo) continue;
          const student = findStudentByAdmNo(admNo);
          if (!student) {
            skipped++;
            continue;
          }
          const studentIndex = getStudentIndex(student);
          commentsPayload.push({ student_index: String(studentIndex), comment_text: commentText });
        }
        if (commentsPayload.length === 0) {
          if (skipped > 0) {
            console.warn('[Comments CSV upload] No comments saved: all rows had adm_no not in this class. skipped:', skipped, 'Class students count:', students.length);
            toast.warning(`No comments saved: ${skipped} row(s) had adm_no not in this class. Use the downloaded template for this class.`);
          } else {
            console.warn('[Comments CSV upload] No comments saved: no valid data rows (empty adm_no or no matching rows). Total data rows:', lines.length - 1);
            toast.warning('No comments saved. Ensure the CSV has "AdmNumber" and "Comment" columns and adm numbers match this class.');
          }
          return;
        }
        const { data } = await studentsAPI.saveCommentsBulk({
          comment_type: commentType,
          level: normalizedLevel,
          stream: normalizedStream,
          year: parseInt(year),
          term: normalizedTerm,
          comments: commentsPayload,
        });
        const saved = data.saved ?? 0;
        const failed = data.failed ?? 0;
        if (data.errors?.length) {
          console.error('[Comments CSV upload] Some rows failed:', data.errors);
        }
        queryClient.invalidateQueries(['comments', commentType, normalizedLevel, normalizedStream, year, normalizedTerm]);
        if (saved > 0) {
          console.log('[Comments CSV upload] Done. saved:', saved, 'skipped:', skipped, 'failed:', failed);
          toast.success(`Upload complete: ${saved} comment(s) saved.${skipped > 0 ? ` ${skipped} row(s) skipped (adm_no not in this class).` : ''}${failed > 0 ? ` ${failed} failed.` : ''}`);
        } else if (failed > 0) {
          console.error('[Comments CSV upload] All row saves failed. Total failed:', failed, 'skipped:', skipped);
          toast.error(`${failed} row(s) failed to save. Check console and try again.`);
        } else {
          toast.warning('No comments saved.');
        }
      } catch (err) {
        console.error('[Comments CSV upload] Failure:', err?.response?.data || err?.message || err, err);
        toast.error(err.response?.data?.message || err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    setTimeout(run, 0);
  };

  return (
    <AdminLayout>
      <div className="comments-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className={`fas ${icon}`}></i>
            {year} - {moduleLabel} - {normalizedTerm}
            <div className="header-actions">
              <button
                type="button"
                className="excel-btn small secondary"
                onClick={handleDownloadTemplate}
                disabled={students.length === 0}
                title="Download CSV with columns: AdmNumber, first_name, middle_name, surname, Comment"
              >
                <i className="fas fa-download"></i> Download CSV template
              </button>
              <label className="excel-btn small secondary" style={{ marginBottom: 0 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadFilled}
                  disabled={students.length === 0 || uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                {uploading ? ' Uploading...' : ' Upload filled template'}
              </label>
              {(commentType === 'mkuu_shule' || commentType === 'mwalimu_taaluma') && (
                <button
                  type="button"
                  className="excel-btn small secondary"
                  onClick={handleAutoFillComments}
                  disabled={students.length === 0 || gradesLoading}
                  title="Auto-fill comments based on student grades"
                >
                  <i className="fas fa-magic"></i> Auto-fill Comments
                </button>
              )}
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || commentsLoading ? (
              <div className="loading-state">Loading...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className={`fas ${icon} empty-icon`}></i>
                <h3>No Students Found</h3>
                <p>No students have been registered for this class yet.</p>
                <Link to="/admin/students/registration" className="excel-btn primary">
                  <i className="fas fa-plus"></i> Register Students
                </Link>
              </div>
            ) : (
              <>
                <div className="action-buttons">
                  <Link to={getOtherTermPath()} className="excel-btn secondary switch-term-btn">
                    <i className="fas fa-exchange-alt"></i> Switch to {normalizedTerm === 'First Term' ? 'Second Term' : 'First Term'}
                  </Link>
                </div>
                
                {/* Desktop Table View */}
                <div className="table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Adm No</th>
                        <th>First Name</th>
                        <th>Middle Name</th>
                        <th>Surname</th>
                        <th>Sex</th>
                        <th>Year</th>
                        <th>Grade</th>
                        <th>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const studentIndex = getStudentIndex(student, index);
                        const commentText = comments[studentIndex] || '';
                        const savingState = savingStates[studentIndex];
                        
                        return (
                          <tr key={student.adm_no}>
                            <td>{index + 1}</td>
                            <td>{student.adm_no}</td>
                            <td>{student.first_name}</td>
                            <td>{student.middle_name || '-'}</td>
                            <td>{student.surname}</td>
                            <td>{student.sex}</td>
                            <td>{student.year}</td>
                            <td className="grade-cell">{gradesLoading ? '...' : gradesError ? '—' : (classGrades[student.adm_no] ?? '-')}</td>
                            <td>
                              <div className="comment-input-wrapper">
                                <textarea
                                  className={`comment-input ${savingState || ''}`}
                                  id={`comment_${index}`}
                                  value={commentText}
                                  onChange={(e) => {
                                    sessionStorage.setItem(`scroll_${commentType}_${year}_${stream}_${term}`, window.pageYOffset.toString());
                                    handleCommentChange(studentIndex, e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    handleCommentBlur(studentIndex, e.target.value);
                                  }}
                                  placeholder={`Enter ${moduleLabel.toLowerCase()} comment...`}
                                  rows="3"
                                />
                                {savingState === 'saving' && (
                                  <span className="save-indicator saving">
                                    <i className="fas fa-spinner fa-spin"></i> Saving...
                                  </span>
                                )}
                                {savingState === 'saved' && (
                                  <span className="save-indicator saved">
                                    <i className="fas fa-check"></i> Saved
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (same style as Debts page) */}
                <div className="mobile-students-list">
                  {students.map((student, index) => {
                    const studentIndex = getStudentIndex(student, index);
                    const commentText = comments[studentIndex] || '';
                    const savingState = savingStates[studentIndex];
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
                            <span className="mobile-student-field-label">Year</span>
                            <span className="mobile-student-field-value">{student.year}</span>
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Grade</span>
                            <span className="mobile-student-field-value">
                              {gradesLoading ? '...' : gradesError ? '—' : (classGrades[student.adm_no] ?? '-')}
                            </span>
                          </div>
                          <div className="mobile-student-field mobile-comment-field">
                            <span className="mobile-student-field-label">Comments</span>
                            <div className="mobile-comment-input-wrapper">
                              <textarea
                                className={`comment-input ${savingState || ''}`}
                                value={commentText}
                                onChange={(e) => {
                                  sessionStorage.setItem(`scroll_${commentType}_${year}_${stream}_${term}`, window.pageYOffset.toString());
                                  handleCommentChange(studentIndex, e.target.value);
                                }}
                                onBlur={(e) => handleCommentBlur(studentIndex, e.target.value)}
                                placeholder={`Enter ${moduleLabel.toLowerCase()} comment...`}
                                rows="3"
                              />
                              {savingState === 'saving' && (
                                <span className="save-indicator saving">
                                  <i className="fas fa-spinner fa-spin"></i> Saving...
                                </span>
                              )}
                              {savingState === 'saved' && (
                                <span className="save-indicator saved">
                                  <i className="fas fa-check"></i> Saved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CommentsManagement;

