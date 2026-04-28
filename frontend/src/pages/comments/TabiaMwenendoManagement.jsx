/**
 * Tabia & Mwenendo Management Page
 * 11-criteria evaluation grid with letter grades (A-F)
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import api from '../../services/api';
import './TabiaMwenendoManagement.css';

const CRITERIA_CODES = ['901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911'];
const VALID_GRADES = ['A', 'B', 'C', 'D', 'F'];

const TabiaMwenendoManagement = ({ formLevel }) => {
  const { year, stream, term } = useParams();
  const queryClient = useQueryClient();
  
  const [evaluations, setEvaluations] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveTimeouts, setSaveTimeouts] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Normalize form level
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  // Check if this is Form V or VI
  const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';

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

  // 11 Evaluation Criteria
  const criteria = [
    { code: '901', description: 'Kufanya kazi kwa bidii', english: 'Working diligently' },
    { code: '902', description: 'Ubora wa kazi', english: 'Quality of work' },
    { code: '903', description: 'Kuheshimu kazi', english: 'Respecting work' },
    { code: '904', description: 'Utunzaji wa mali ya shule / binafsi', english: 'Care of school/personal property' },
    { code: '905', description: 'Ushirikiano na wenzake', english: 'Cooperation with peers' },
    { code: '906', description: 'Heshima kwa wenzake / walimu / wafanyakazi', english: 'Respect for peers/teachers/staff' },
    { code: '907', description: 'Sifa za uongozi', english: 'Leadership qualities' },
    { code: '908', description: 'Kutii na kufuata maagizo', english: 'Obedience and following instructions' },
    { code: '909', description: 'Uaminifu', english: 'Honesty' },
    { code: '910', description: 'Usafi binafsi', english: 'Personal cleanliness' },
    { code: '911', description: 'Kushiriki katika Utamaduni / Michezo', english: 'Participation in Culture/Sports' },
  ];

  const validGrades = ['A', 'B', 'C', 'D', 'F'];

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

  // Fetch students for this class - sorted by name: first_name, then middle_name, then surname (A-Z)
  const { data: studentsData = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, year, ...(isFormVOrVI ? [normalizedTerm] : [])],
    queryFn: async () => {
      const res = await studentsAPI.getStudents({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        // For Form I-IV, don't filter by term - show all students for the year
        // For Form V/VI, filter by term
        ...(isFormVOrVI ? { term: normalizedTerm } : {}),
      });
      const students = res.data.students || [];
      // Sort students by name: first_name, then middle_name, then surname (A-Z)
      return sortStudentsByName(students);
    },
  });
  
  const students = studentsData;

  // Fetch existing evaluations
  const { data: existingEvaluations = {}, isLoading: evaluationsLoading } = useQuery({
    queryKey: ['tabia-mwenendo', normalizedLevel, normalizedStream, year, normalizedTerm],
    queryFn: async () => {
      const res = await studentsAPI.getTabiaMwenendo({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        term: normalizedTerm,
      });
      return res.data.evaluations || {};
    },
    enabled: students.length > 0,
  });

  // Initialize evaluations from existing data
  useEffect(() => {
    if (Object.keys(existingEvaluations).length > 0) {
      setEvaluations(existingEvaluations);
    }
  }, [existingEvaluations]);

  // Save evaluations mutation (batch). Payload: { evaluations: array } or just array; optional studentIndex for UI.
  const saveEvaluationsMutation = useMutation({
    mutationFn: async (payload) => {
      const evaluationsArray = Array.isArray(payload) ? payload : (payload?.evaluations ?? []);
      return api.post('/students/tabia-mwenendo', {
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        term: normalizedTerm,
        evaluations: evaluationsArray,
        replaceScope: payload?.replaceScope ?? false,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['tabia-mwenendo', normalizedLevel, normalizedStream, year, normalizedTerm]);
      // If saving a single student, show individual success
      if (variables.studentIndex !== undefined) {
        setSavingStates(prev => ({ ...prev, [variables.studentIndex]: 'saved' }));
        setTimeout(() => {
          setSavingStates(prev => {
            const newState = { ...prev };
            delete newState[variables.studentIndex];
            return newState;
          });
        }, 2000);
      } else {
        toast.success('Evaluations saved successfully!');
        setHasChanges(false);
      }
    },
    onError: (error, variables) => {
      if (variables.studentIndex !== undefined) {
        setSavingStates(prev => ({ ...prev, [variables.studentIndex]: 'error' }));
      }
      toast.error(error.response?.data?.message || 'Failed to save evaluations');
    },
  });

  // Save individual student's evaluations
  const saveStudentEvaluations = (studentIndex) => {
    const studentEvals = evaluations[studentIndex] || {};
    if (Object.keys(studentEvals).length === 0) {
      return; // Nothing to save
    }

    // Convert to array format
    const evaluationsArray = Object.entries(studentEvals).map(([criterion, evaluation]) => ({
      student_index: studentIndex,
      criterion: criterion,
      evaluation: evaluation,
    }));

    saveEvaluationsMutation.mutate({ evaluations: evaluationsArray, studentIndex });
  };

  const handleGradeChange = (studentIndex, criterion, grade) => {
    const newEvaluations = { ...evaluations };
    if (!newEvaluations[studentIndex]) {
      newEvaluations[studentIndex] = {};
    }
    if (grade === '') {
      delete newEvaluations[studentIndex][criterion];
      if (Object.keys(newEvaluations[studentIndex]).length === 0) {
        delete newEvaluations[studentIndex];
      }
    } else {
      newEvaluations[studentIndex][criterion] = grade;
    }
    setEvaluations(newEvaluations);
    setHasChanges(true);

    // Clear existing timeout for this student
    if (saveTimeouts[studentIndex]) {
      clearTimeout(saveTimeouts[studentIndex]);
    }

    // Set saving state
    setSavingStates(prev => ({ ...prev, [studentIndex]: 'saving' }));

    // Auto-save after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      saveStudentEvaluations(studentIndex);
    }, 3000);

    setSaveTimeouts(prev => ({ ...prev, [studentIndex]: timeout }));
  };

  // Handle blur - save immediately when clicking on another input
  const handleGradeBlur = (studentIndex) => {
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
    saveStudentEvaluations(studentIndex);
  };

  const handleSaveAll = () => {
    // Convert evaluations to array format
    const evaluationsArray = [];
    Object.entries(evaluations).forEach(([studentIndex, studentEvals]) => {
      Object.entries(studentEvals).forEach(([criterion, evaluation]) => {
        evaluationsArray.push({
          student_index: studentIndex,
          criterion: criterion,
          evaluation: evaluation,
        });
      });
    });

    if (evaluationsArray.length === 0) {
      toast.warning('No evaluations to save');
      return;
    }

    saveEvaluationsMutation.mutate(evaluationsArray);
  };

  const getBackPath = () => {
    if (isFormVOrVI) {
      return `/admin/tabia-mwenendo/${formLevel}/stream/${stream}/year/${year}/terms`;
    } else {
      return `/admin/tabia-mwenendo/${formLevel}/year/${year}/stream/${stream}/terms`;
    }
  };

  const getOtherTermPath = () => {
    const otherTerm = normalizedTerm === 'First Term' ? 'Second Term' : 'First Term';
    if (isFormVOrVI) {
      return `/admin/tabia-mwenendo/${formLevel}/stream/${stream}/year/${year}/term/${otherTerm}`;
    } else {
      return `/admin/tabia-mwenendo/${formLevel}/year/${year}/stream/${stream}/term/${otherTerm}`;
    }
  };

  // Link to registration actions for this class so user can add students for this level/stream/year
  const getRegisterStudentsPath = () => {
    if (isFormVOrVI) {
      return `/admin/students/registration/${formLevel}/stream/${stream}/year/${year}/actions`;
    }
    return `/admin/students/registration/${formLevel}/year/${year}/stream/${stream}/actions`;
  };

  // Calculate student index (position in sorted list)
  const getStudentIndex = (student) => {
    const sortedStudents = sortStudentsByName(students);
    return sortedStudents.findIndex(
      (s) => String(s.adm_no) === String(student.adm_no)
    ).toString();
  };

  const csvEscape = (val) => {
    const s = String(val ?? '').trim();
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

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
        out.push(cur.trim().replace(/^\uFEFF/, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur.trim().replace(/^\uFEFF/, ''));
    return out;
  };

  const normalizeAdmNo = (val) => {
    const s = String(val ?? '').trim();
    if (!s) return '';
    const num = Number(s);
    if (!Number.isNaN(num) && Number.isInteger(num)) return String(num);
    if (!Number.isNaN(num)) return String(Math.round(num));
    return s;
  };

  const findStudentByAdmNo = (admNoStr) => {
    const a = normalizeAdmNo(admNoStr);
    if (!a) return null;
    const byExact = students.find((s) => normalizeAdmNo(s.adm_no) === a || String(s.adm_no).trim() === a);
    if (byExact) return byExact;
    const aNum = Number(a);
    if (!Number.isNaN(aNum)) {
      return students.find((s) => Number(s.adm_no) === aNum || Number(normalizeAdmNo(s.adm_no)) === aNum);
    }
    return null;
  };

  const handleDownloadTemplate = () => {
    const headers = ['AdmNumber', 'first_name', 'middle_name', 'surname', ...CRITERIA_CODES];
    const rows = students.map((s) => {
      const studentIndex = getStudentIndex(s);
      const evals = evaluations[studentIndex] || {};
      const cells = [
        csvEscape(s.adm_no),
        csvEscape(s.first_name),
        csvEscape(s.middle_name),
        csvEscape(s.surname),
        ...CRITERIA_CODES.map((code) => csvEscape(evals[code] ?? '')),
      ];
      return cells.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabia_mwenendo_template_${year}_${stream}_${(normalizedTerm || '').replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded');
  };

  const handleUploadFilled = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    const run = async () => {
      try {
        let text = await file.text();
        text = text.replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          console.error('[Tabia Mwenendo CSV] Rejected: need header and at least one data row');
          toast.error('CSV must have a header row and at least one data row');
          setUploading(false);
          return;
        }
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') && firstLine.split('\t').length >= 2 ? '\t' : ',';
        const rawHeaderCells = parseLine(firstLine, delimiter);
        const header = rawHeaderCells.map((h) => String(h).trim().replace(/\uFEFF/g, '').replace(/\s/g, '').toLowerCase());
        const admNoIdx = header.findIndex((h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission'));
        if (admNoIdx === -1) {
          console.error('[Tabia Mwenendo CSV] Rejected: column AdmNumber not found. Raw:', rawHeaderCells);
          toast.error('CSV must have column "AdmNumber". Your first row: ' + (rawHeaderCells.join(', ') || '(empty)'));
          setUploading(false);
          return;
        }
        const criterionIndices = {};
        CRITERIA_CODES.forEach((code) => {
          const idx = header.findIndex((h) => h === code);
          if (idx !== -1) criterionIndices[code] = idx;
        });
        if (Object.keys(criterionIndices).length === 0) {
          toast.error('CSV must have at least one criterion column (901, 902, ... 911). Found: ' + rawHeaderCells.join(', '));
          setUploading(false);
          return;
        }
        const evaluationsArray = [];
        let skipped = 0;
        const skippedAdmNos = [];
        const maxSkippedSample = 5;
        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNoRaw = String(cells[admNoIdx] ?? '').trim();
          const admNo = normalizeAdmNo(admNoRaw);
          if (!admNo) continue;
          const student = findStudentByAdmNo(admNoRaw);
          if (!student) {
            skipped++;
            if (skippedAdmNos.length < maxSkippedSample) skippedAdmNos.push(admNoRaw || admNo);
            continue;
          }
          const studentIndex = getStudentIndex(student);
          Object.entries(criterionIndices).forEach(([code, colIdx]) => {
            const val = String(cells[colIdx] ?? '').trim().toUpperCase();
            if (VALID_GRADES.includes(val)) {
              evaluationsArray.push({ student_index: studentIndex, criterion: code, evaluation: val });
            }
          });
        }
        if (evaluationsArray.length === 0) {
          if (skipped > 0) {
            const classSample = students.slice(0, 5).map((s) => String(s.adm_no).trim());
            console.warn('[Tabia CSV] No valid rows. Sample CSV AdmNumber values:', skippedAdmNos, 'Sample class adm_no:', classSample);
            const ctx = `${level} ${stream} ${year} ${term}`;
            toast.warning(`No valid rows: ${skipped} row(s) had AdmNumber not in this class (${ctx}). Use the template downloaded from this page.`);
          } else {
            toast.warning('No valid grades in CSV. Use columns 901–911 with values A, B, C, D, or F.');
          }
          setUploading(false);
          return;
        }
        await api.post('/students/tabia-mwenendo', {
          level: normalizedLevel,
          stream: normalizedStream,
          year: parseInt(year),
          term: normalizedTerm,
          evaluations: evaluationsArray,
          replaceScope: true, // bulk upload wins: replace all data for this class/term with CSV
        });
        queryClient.invalidateQueries(['tabia-mwenendo', normalizedLevel, normalizedStream, year, normalizedTerm]);
        setEvaluations((prev) => {
          const next = { ...prev };
          for (let i = 1; i < lines.length; i++) {
            const cells = parseLine(lines[i], delimiter);
            const admNo = String(cells[admNoIdx] ?? '').trim();
            const student = findStudentByAdmNo(admNo);
            if (!student) continue;
            const studentIndex = getStudentIndex(student);
            if (!next[studentIndex]) next[studentIndex] = {};
            Object.entries(criterionIndices).forEach(([code, colIdx]) => {
              const val = String(cells[colIdx] ?? '').trim().toUpperCase();
              if (VALID_GRADES.includes(val)) next[studentIndex][code] = val;
            });
          }
          return next;
        });
        toast.success(`Upload complete: ${evaluationsArray.length} evaluation(s) saved.${skipped > 0 ? ` ${skipped} row(s) skipped.` : ''}`);
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        const msg = typeof data?.message === 'string' ? data.message : err?.message || 'Upload failed';
        const detail = data?.detail || data?.constraint || '';
        console.error('[Tabia Mwenendo CSV] Failure:', status, msg, detail || '', data);
        toast.error(detail ? `${msg} (${detail})` : msg);
      } finally {
        setUploading(false);
      }
    };
    const onRejection = (err) => {
      console.error('[Tabia Mwenendo CSV] Uncaught rejection:', err?.message || String(err), err?.response?.data);
      setUploading(false);
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
    };
    setTimeout(() => run().catch(onRejection), 0);
  };

  return (
    <AdminLayout>
      <div className="tabia-mwenendo-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-balance-scale"></i>
            {year} - Tabia na Mwenendo - {normalizedTerm}
            <div className="header-actions">
              <button
                type="button"
                className="excel-btn small secondary"
                onClick={handleDownloadTemplate}
                disabled={students.length === 0}
                title="Download CSV with AdmNumber and columns 901–911"
              >
                <i className="fas fa-download"></i> Download CSV template
              </button>
              <label className="excel-btn small secondary" style={{ marginBottom: 0, cursor: 'pointer' }}>
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
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || evaluationsLoading ? (
              <div className="loading-state">Loading...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-balance-scale empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students have been registered for this class yet.</p>
                <Link to={getRegisterStudentsPath()} className="excel-btn primary">
                  <i className="fas fa-plus"></i> Register Students
                </Link>
              </div>
            ) : (
              <>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="excel-btn primary"
                    onClick={handleSaveAll}
                    disabled={saveEvaluationsMutation.isLoading || !hasChanges}
                  >
                    <i className="fas fa-save"></i> {saveEvaluationsMutation.isLoading ? 'Saving...' : 'Save All Evaluations'}
                  </button>
                  <Link to={getOtherTermPath()} className="excel-btn secondary">
                    <i className="fas fa-exchange-alt"></i> Switch to {normalizedTerm === 'First Term' ? 'Second Term' : 'First Term'}
                  </Link>
                </div>

                <div className="table-container">
                  <table className="tabia-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">S/N</th>
                        <th rowSpan="2">First Name</th>
                        <th rowSpan="2">Middle Name</th>
                        <th rowSpan="2">Surname</th>
                        <th colSpan="11">TABIA NA MWENENDO</th>
                      </tr>
                      <tr>
                        {criteria.map((criterion) => (
                          <th key={criterion.code} title={criterion.description}>
                            {criterion.code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const studentIndex = getStudentIndex(student);
                        const studentEvals = evaluations[studentIndex] || {};
                        
                        return (
                          <tr key={student.adm_no}>
                            <td>{index + 1}</td>
                            <td>{student.first_name}</td>
                            <td>{student.middle_name || '-'}</td>
                            <td>{student.surname}</td>
                            {criteria.map((criterion) => {
                              const currentGrade = studentEvals[criterion.code] || '';
                              const savingState = savingStates[studentIndex];
                              return (
                                <td key={criterion.code}>
                                  <div className="grade-select-wrapper">
                                    <select
                                      className={`grade-select ${currentGrade ? `grade-${currentGrade.toLowerCase()}` : ''} ${savingState || ''}`}
                                      value={currentGrade}
                                      onChange={(e) => handleGradeChange(studentIndex, criterion.code, e.target.value)}
                                      onBlur={() => handleGradeBlur(studentIndex)}
                                    >
                                      <option value="">Select</option>
                                      {validGrades.map((grade) => (
                                        <option key={grade} value={grade}>
                                          {grade}
                                        </option>
                                      ))}
                                    </select>
                                    {savingState === 'saving' && (
                                      <span className="save-indicator saving">
                                        <i className="fas fa-spinner fa-spin"></i>
                                      </span>
                                    )}
                                    {savingState === 'saved' && (
                                      <span className="save-indicator saved">
                                        <i className="fas fa-check"></i>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="criteria-legend">
                  <h4>Evaluation Criteria:</h4>
                  <div className="criteria-list">
                    {criteria.map((criterion) => (
                      <div key={criterion.code} className="criterion-item">
                        <strong>{criterion.code}:</strong> {criterion.description} ({criterion.english})
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TabiaMwenendoManagement;

