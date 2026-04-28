/**
 * Student Parish Management Page
 * Allows assigning, viewing, and deleting student parish assignments
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import { useAuth } from '../../context/AuthContext';
import './ParishManagement.css';

const ParishManagement = ({ formLevel: formLevelProp }) => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [parishName, setParishName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const fileInputRef = useRef(null);

  // Extract parameters from URL
  const { year, stream } = params;
  
  // Use prop if provided, otherwise extract from URL params
  const formLevel = formLevelProp || params.formLevel || (() => {
    // Extract from pathname if not in params
    const pathParts = window.location.pathname.split('/');
    const parishIndex = pathParts.indexOf('parishes');
    return parishIndex >= 0 && pathParts[parishIndex + 1] ? pathParts[parishIndex + 1] : '';
  })();

  // Normalize form level from URL param (convert to uppercase: "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = year ? (typeof year === 'number' ? year : parseInt(year, 10)) : null;

  // Validate that we have all required parameters
  const hasValidParams = normalizedLevel && stream && apiYear != null && !isNaN(apiYear) && apiYear > 0;

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
  const { data: studentsData = [], isLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, stream, apiYear, selectedTerm],
    queryFn: async () => {
      if (!hasValidParams) {
        return [];
      }
      try {
        // For Form V/VI, filter by term to show only students registered for that term
        // For Form I-IV, term is not needed as students stay for the full year
        const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
        
        // For streams A, B, C, D: also fetch students from stream "NA"
        // This treats "NA" as containing students from all streams A-D
        let students = [];
        
        if (['A', 'B', 'C', 'D'].includes(stream.toUpperCase())) {
          // Fetch students from both the specific stream AND "NA" stream
          const [streamRes, naRes] = await Promise.all([
            studentsAPI.getStudents({
              level: normalizedLevel,
              stream: stream,
              year: apiYear,
              ...(isFormVOrVI && { term: selectedTerm })
            }),
            studentsAPI.getStudents({
              level: normalizedLevel,
              stream: 'NA',
              year: apiYear,
              ...(isFormVOrVI && { term: selectedTerm })
            })
          ]);
          
          const streamStudents = streamRes.data.students || [];
          const naStudents = naRes.data.students || [];
          
          // Combine and remove duplicates (by adm_no, level, stream, year)
          const allStudents = [...streamStudents, ...naStudents];
          const uniqueStudents = allStudents.filter((student, index, self) =>
            index === self.findIndex(s => 
              s.adm_no === student.adm_no && 
              s.level === student.level && 
              s.stream === student.stream && 
              s.year === student.year
            )
          );
          
          students = uniqueStudents;
        } else {
          // For other streams (including "NA"), fetch normally
          const res = await studentsAPI.getStudents({
            level: normalizedLevel,
            stream: stream,
            year: apiYear,
            ...(isFormVOrVI && { term: selectedTerm })
          });
          students = res.data.students || [];
        }
        
        // Sort students by name: first_name, then middle_name, then surname (A-Z)
        return sortStudentsByName(students);
      } catch (error) {
        console.error('ParishManagement: Error fetching students', error);
        throw error;
      }
    },
    enabled: Boolean(hasValidParams) && isAuthenticated(),
  });
  
  const students = studentsData;

  // Fetch parishes for this class
  const { data: parishesData = {}, isLoading: parishesLoading, error: parishesError } = useQuery({
    queryKey: ['student-parishes', normalizedLevel, stream, apiYear, selectedTerm, students.length],
    queryFn: async () => {
      if (!hasValidParams || !normalizedLevel) {
        console.log('[PARISHES] Invalid params, returning empty');
        return {};
      }
      
      if (students.length === 0) {
        console.log('[PARISHES] No students loaded yet, returning empty');
        return {};
      }
      
      try {
        console.log('[PARISHES] Fetching parishes:', { level: normalizedLevel, stream, year: apiYear, term: selectedTerm, studentsCount: students.length });
        const res = await studentsAPI.getParishes({
          level: normalizedLevel,
          stream: stream,
          year: apiYear,
          term: selectedTerm
        });
        const parishesMap = {};
        const parishes = res.data.parishes || [];
        console.log('[PARISHES] Received', parishes.length, 'parishes from API');
        
        // When viewing streams A, B, C, D: parishes include both that stream and "NA"
        // We need to map them to the combined student list
        // Create a map of student adm_no to their index in the sorted students array
        const studentIndexMap = new Map();
        students.forEach((student, index) => {
          const key = `${student.adm_no}-${student.level}-${student.stream}-${student.year}`;
          studentIndexMap.set(key, index);
        });
        
        // Map parishes by finding the student's position in the combined sorted list
        // The student_index in parishes refers to the position in the sorted list for that specific stream
        // We need to fetch the students for each stream separately, sort them, then map
        
        // Group students by stream
        const studentsByStream = {};
        students.forEach(student => {
          if (!studentsByStream[student.stream]) {
            studentsByStream[student.stream] = [];
          }
          studentsByStream[student.stream].push(student);
        });
        
        console.log('[PARISHES] Students by stream:', Object.keys(studentsByStream).map(s => `${s}: ${studentsByStream[s].length}`).join(', '));
        
        // Sort each stream's students (same way as database)
        Object.keys(studentsByStream).forEach(streamKey => {
          studentsByStream[streamKey] = sortStudentsByName(studentsByStream[streamKey]);
        });
        
        // Map parishes
        let mappedCount = 0;
        let skippedCount = 0;
        const skippedReasons = { invalidIndex: 0, noStudents: 0, indexOutOfRange: 0, studentNotFound: 0 };
        
        parishes.forEach((parish, idx) => {
          const parishStream = parish.stream;
          const parishIndex = parseInt(parish.student_index, 10);
          
          if (isNaN(parishIndex) || parishIndex < 0) {
            skippedCount++;
            skippedReasons.invalidIndex++;
            return;
          }
          
          // Get sorted students for this stream
          let sortedStreamStudents = studentsByStream[parishStream] || [];
          
          // Handle stream normalization: NA <-> A are equivalent for FORM I-IV
          // If parish is from "NA" stream but we have no "NA" students, 
          // try mapping to the current stream's students (A, B, C, or D)
          // This handles cases where students were migrated from "NA" to specific streams
          if (parishStream === 'NA' && sortedStreamStudents.length === 0 && ['A', 'B', 'C', 'D'].includes(stream.toUpperCase())) {
            sortedStreamStudents = studentsByStream[stream] || [];
          }
          
          // Also handle reverse: if parish is from "A" stream but we have "NA" students
          // (This can happen if parishes were created with stream "A" but students are stored as "NA")
          if (parishStream === 'A' && sortedStreamStudents.length === 0 && studentsByStream['NA'] && studentsByStream['NA'].length > 0) {
            sortedStreamStudents = studentsByStream['NA'] || [];
          }
          
          // If still no students found, skip this parish
          if (sortedStreamStudents.length === 0) {
            skippedCount++;
            skippedReasons.noStudents++;
            return;
          }
          
          // Get the student at the parish's index in that stream's sorted list
          if (parishIndex < sortedStreamStudents.length) {
            const studentAtParishIndex = sortedStreamStudents[parishIndex];
            
            // Find this student's position in the combined sorted students list
            const combinedIndex = students.findIndex(s => 
              s.adm_no === studentAtParishIndex.adm_no && 
              s.level === studentAtParishIndex.level && 
              s.stream === studentAtParishIndex.stream && 
              s.year === studentAtParishIndex.year
            );
            
            if (combinedIndex >= 0) {
              parishesMap[combinedIndex] = {
                ...parish,
                student_index: combinedIndex
              };
              mappedCount++;
            } else {
              skippedCount++;
              skippedReasons.studentNotFound++;
            }
          } else {
            skippedCount++;
            skippedReasons.indexOutOfRange++;
          }
        });
        
        console.log('[PARISHES] Skipped reasons:', JSON.stringify(skippedReasons, null, 2));
        console.log('[PARISHES] Mapping complete:', { 
          mappedCount, 
          skippedCount, 
          parishesMapSize: Object.keys(parishesMap).length,
          totalParishes: parishes.length,
          studentsByStreamKeys: Object.keys(studentsByStream),
          studentsByStreamCounts: Object.keys(studentsByStream).map(k => `${k}: ${studentsByStream[k].length}`)
        });
        return parishesMap;
      } catch (error) {
        console.error('[PARISHES] Error fetching parishes', error);
        return {};
      }
    },
    enabled: Boolean(hasValidParams && normalizedLevel && students.length > 0) && isAuthenticated(),
  });


  // Save parish mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return studentsAPI.saveParish(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear, selectedTerm]);
      toast.success('Parish assigned successfully!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign parish');
    },
  });

  // Delete parish mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ studentIndex }) => {
      const params = {
        level: normalizedLevel,
        stream: stream,
        year: apiYear,
        student_index: parseInt(studentIndex, 10) // Ensure it's a number
      };
      return studentsAPI.deleteParish(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear, selectedTerm]);
      toast.success('Parish assignment removed successfully!');
    },
    onError: (error) => {
      console.error('Delete parish error:', error);
      toast.error(error.response?.data?.message || 'Failed to remove parish assignment');
    },
  });

  const openModal = (student, index) => {
    setSelectedStudent({ ...student, index });
    const existingParish = parishesData[index];
    setParishName(existingParish?.parish_name || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setParishName('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!parishName.trim()) {
      toast.error('Parish name is required');
      return;
    }

    saveMutation.mutate({
      level: normalizedLevel,
      stream: stream,
      year: apiYear,
      student_index: selectedStudent.index,
      parish_name: parishName.trim()
    });
  };

  // CSV: escape cell for CSV (quote if contains comma, newline, or quote)
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
        out.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }

    out.push(cur.trim().replace(/^\uFEFF/, ''));
    return out;
  };

  const normalizeHeader = (h) =>
    String(h ?? '')
      .trim()
      .replace(/\uFEFF/g, '')
      .replace(/\s/g, '')
      .toLowerCase();

  const findStudentIndexByAdmNo = (admNoStr) => {
    const target = String(admNoStr ?? '').trim();
    if (!target) return -1;

    const exact = students.findIndex((s) => String(s.adm_no).trim() === target);
    if (exact >= 0) return exact;

    const tNum = Number(target);
    if (!Number.isNaN(tNum)) {
      return students.findIndex(
        (s) => Number(s.adm_no) === tNum || String(s.adm_no).trim() === String(tNum)
      );
    }

    return -1;
  };

  const handleDownloadTemplate = () => {
    const headers = ['AdmNumber', 'first_name', 'middle_name', 'surname', 'Parish'];
    const rows = students.map((s, index) => {
      const parish = getParishName(index) || '';
      return [
        csvEscape(s.adm_no),
        csvEscape(s.first_name),
        csvEscape(s.middle_name || ''),
        csvEscape(s.surname),
        csvEscape(parish),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `student_parishes_template_${normalizedLevel}_${stream}_${apiYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Parish CSV template downloaded');
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
          toast.error('CSV must have a header row and at least one data row');
          return;
        }

        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') && firstLine.split('\t').length >= 2 ? '\t' : ',';
        const rawHeaderCells = parseLine(firstLine, delimiter);
        const header = rawHeaderCells.map((h) => normalizeHeader(h));

        const admNoIdx = header.findIndex(
          (h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission')
        );
        const parishIdx = header.findIndex((h) => h === 'parish' || h === 'parish_name' || h === 'parishname');

        if (admNoIdx === -1 || parishIdx === -1) {
          toast.error('Upload rejected: CSV must include columns "AdmNumber" and "Parish"');
          return;
        }

        const payload = [];
        let skipped = 0;
        let skippedNoStudent = 0;

        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNo = String(cells[admNoIdx] ?? '').trim();
          const parishName = String(cells[parishIdx] ?? '').trim();

          if (!admNo) continue;
          if (!parishName) {
            skipped++;
            continue;
          }

          const studentIndex = findStudentIndexByAdmNo(admNo);
          if (studentIndex < 0) {
            skippedNoStudent++;
            continue;
          }

          payload.push({
            student_index: studentIndex,
            parish_name: parishName,
          });
        }

        if (payload.length === 0) {
          toast.warning(
            `No parishes to upload. ${skippedNoStudent ? `${skippedNoStudent} row(s) had unknown AdmNumber. ` : ''}${skipped ? `${skipped} row(s) were empty.` : ''}`.trim()
          );
          return;
        }

        const res = await studentsAPI.saveParishesBulk({
          level: normalizedLevel,
          stream: stream,
          year: apiYear,
          parishes: payload,
        });

        const saved = res.data?.saved ?? 0;
        const failed = res.data?.failed ?? 0;

        queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear, selectedTerm]);

        if (saved > 0 && failed === 0) {
          toast.success(`Upload complete: ${saved} parish(es) saved.`);
        } else if (failed > 0) {
          toast.warning(`Upload complete with issues: ${saved} saved, ${failed} failed.`);
        } else {
          toast.success('Upload complete');
        }
      } catch (err) {
        console.error('[Parish CSV upload] Failure:', err?.response?.data || err?.message || err);
        toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };

    setTimeout(run, 0);
  };

  const handleDelete = (student, index) => {
    if (window.confirm(`Are you sure you want to delete the parish assignment for ${student.first_name} ${student.surname}?`)) {
      deleteMutation.mutate({ studentIndex: index });
    }
  };

  const getParishName = (studentIndex) => {
    // Safety check: if parishesData is not loaded yet, return null
    if (!parishesData || typeof parishesData !== 'object') {
      return null;
    }
    
    // Ensure studentIndex is a number
    const index = parseInt(studentIndex, 10);
    if (isNaN(index) || index < 0) {
      return null;
    }
    
    // Get parish record for this student index
    const parish = parishesData[index];
    
    if (!parish) {
      // No parish record exists for this student index
      return null;
    }
    
    // Get parish name from the record
    const parishName = parish.parish_name;
    
    // Return null if parish_name is empty, null, or undefined
    // This handles cases where parish record exists but name was cleared
    if (!parishName || !parishName.trim()) {
      return null;
    }
    
    return parishName.trim();
  };

  // On 401, show message and redirect to login (auth interceptor will clear token)
  useEffect(() => {
    if (studentsError?.response?.status === 401) {
      toast.error(studentsError?.expirationMessage || 'Your session has expired. Please log in again.');
      navigate('/login', { replace: true });
    }
  }, [studentsError, navigate]);

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/students/parishes/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/students/parishes/${formLevel}/year/${year}/streams`;
    }
  };

  return (
    <AdminLayout>
      <div className="parish-mgmt-page-container">
        <div className="parish-mgmt-card">
          <div className="parish-mgmt-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>
              Student Parishes Management - {normalizedLevel} {stream} {apiYear}
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '14px' }}
              >
                <option value="First Term">First Term (Jul-Dec)</option>
                <option value="Second Term">Second Term (Jan-Jun)</option>
              </select>
            </span>
            <span style={{ marginLeft: '15px', fontSize: '14px', opacity: 0.8 }}>
              {parishesLoading ? '(Loading parishes...)' : 
               parishesError ? '(Error loading parishes)' :
               parishesData && typeof parishesData === 'object' && Object.keys(parishesData).length > 0 ? 
                 `(${Object.keys(parishesData).length} parish${Object.keys(parishesData).length !== 1 ? 'es' : ''} loaded)` :
                 '(No parishes loaded)'}
            </span>
          </div>
          <div className="parish-mgmt-card-body">
            <div className="action-buttons" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className="parish-btn small primary"
                onClick={handleDownloadTemplate}
                disabled={students.length === 0 || uploading}
                title="Download CSV template"
              >
                <i className="fas fa-download"></i> Download CSV Template
              </button>

              <label
                className="parish-btn small primary"
                style={{ cursor: 'pointer', opacity: uploading || students.length === 0 ? 0.6 : 1 }}
                title="Upload filled CSV"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadFilled}
                  disabled={uploading || students.length === 0}
                  style={{ display: 'none' }}
                />
                <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i> {uploading ? 'Uploading...' : 'Upload Filled CSV'}
              </label>
            </div>

            {studentsError ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>
                  {studentsError.response?.status === 401
                    ? 'Session expired'
                    : 'Error Loading Students'}
                </h3>
                <p>
                  {studentsError.response?.status === 401
                    ? (studentsError.expirationMessage || 'Your session has expired. Please log in again.')
                    : (studentsError.message || 'Failed to load students. Please try again.')}
                </p>
                {studentsError.response?.status !== 401 && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                    Debug: {normalizedLevel} | {stream} | {apiYear}
                  </p>
                )}
              </div>
            ) : isLoading ? (
              <div className="loading-state">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students registered for this class yet.</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Debug: {normalizedLevel} | {stream} | {apiYear}
                </p>
              </div>
            ) : (
              <div className="parish-mgmt-table-container">
                <table className="parish-mgmt-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Adm No</th>
                      <th>First Name</th>
                      <th>Middle Name</th>
                      <th>Surname</th>
                      <th>Sex</th>
                      <th>Parish</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      // Get parish name for this student (using array index which should match student_index)
                      const parish = getParishName(index);
                      
                      return (
                        <tr key={`${student.adm_no}-${student.level}-${student.stream}-${student.year}`}>
                          <td>{index + 1}</td>
                          <td>{student.adm_no}</td>
                          <td>{student.first_name}</td>
                          <td>{student.middle_name || '-'}</td>
                          <td>{student.surname}</td>
                          <td>{student.sex}</td>
                          <td>
                            {parish ? (
                              <span className="parish-badge">{parish}</span>
                            ) : (
                              <span className="no-parish">Not assigned</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="parish-btn small primary"
                                onClick={() => openModal(student, index)}
                                title="Assign/Edit Parish"
                              >
                                <i className="fas fa-edit"></i> {parish ? 'Edit' : 'Assign'}
                              </button>
                              {parish && (
                                <button
                                  type="button"
                                  className="parish-btn small danger"
                                  onClick={() => handleDelete(student, index)}
                                  title="Delete Parish"
                                >
                                  <i className="fas fa-trash"></i> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link to={getBackPath()} className="parish-mgmt-back-btn">
          <i className="fas fa-arrow-left"></i> Back
        </Link>

        {/* Parish Assignment Modal */}
        {showModal && selectedStudent && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Assign Parish for {selectedStudent.first_name} {selectedStudent.surname}</h3>
                <button type="button" className="close-btn" onClick={closeModal} aria-label="Close">
                  &times;
                </button>
              </div>
              <form onSubmit={handleSave} className="modal-body">
                <div className="form-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    value={`${selectedStudent.first_name} ${selectedStudent.middle_name || ''} ${selectedStudent.surname}`.trim()}
                    disabled
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Parish Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={parishName}
                    onChange={(e) => setParishName(e.target.value)}
                    placeholder="Enter parish name"
                    className="form-control"
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saveMutation.isLoading}>
                    {saveMutation.isLoading ? 'Saving...' : 'Save Parish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ParishManagement;

