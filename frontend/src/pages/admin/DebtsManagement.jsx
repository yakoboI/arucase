/**
 * Individual Debt Management Page
 * Track and manage student debt records with CSV import/export
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './DebtsManagement.css';

const DebtsManagement = ({ formLevel }) => {
  const { year, stream, term } = useParams();
  const queryClient = useQueryClient();
  
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Normalize form level to uppercase (consistent with backend and other components)
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').toUpperCase()
    : '';

  const normalizedStream = stream || 'NA';

  // Normalize term to match backend format (First Term/Second Term)
  const normalizeTerm = (termParam) => {
    if (!termParam) return 'Term I';
    const t = termParam.trim();
    if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
    if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
    if (/^First\s+Term$/i.test(t)) return 'First Term';
    if (/^Second\s+Term$/i.test(t)) return 'Second Term';
    return t;
  };

  const normalizedTerm = normalizeTerm(term);

  // Check if this is Form V or VI
  const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';

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
  const { data: studentsData = [], isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, year, term],
    queryFn: async () => {
      const res = await studentsAPI.getStudents({
        // For Form I-IV, don't filter by term - show all students for the year
        // For Form V/VI, filter by term
        ...(isFormVOrVI ? { term: normalizedTerm } : {}),
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      const students = res.data.students || [];
      // Sort students by name: first_name, then middle_name, then surname (A-Z)
      return sortStudentsByName(students);
    },
  });
  
  const students = studentsData;

  // Fetch existing debt records
  const { data: existingDebt = {}, isLoading: debtLoading, error: debtError } = useQuery({
    queryKey: ['debt', normalizedLevel, normalizedStream, year, term],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getDebt({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          term: term || 'First Term',
        });
        return res.data.debt || {};
      } catch (error) {
        // Log error for debugging
        // Re-throw to let React Query handle it properly
        throw error;
      }
    },
    enabled: students.length > 0,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no debt records found is expected)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    onError: (error) => {
      // Handle error gracefully - React Query will set error state
      // Only log non-404 errors (404 means no debt records exist, which is fine)
      if (error?.response?.status !== 404) {
        // Log non-404 errors
      }
    },
  });

  // Log errors
  useEffect(() => {
    if (debtError) {
      // Only log non-404 errors (404 is expected when no debt records exist)
      if (debtError?.response?.status !== 404) {
        // Log non-404 errors
      }
    }
  }, [debtError]);

  // Save debt mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return studentsAPI.saveDebt({
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debt', normalizedLevel, normalizedStream, year]);
      toast.success('Debt record updated successfully!');
      setEditingIndex(null);
      setEditForm({});
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save debt record');
    },
  });

  // Delete debt mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentIndex) => {
      return studentsAPI.deleteDebt({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        student_index: studentIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debt', normalizedLevel, normalizedStream, year]);
      toast.success('Debt record deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete debt record');
    },
  });

  const handleEdit = (studentIndex) => {
    const debt = existingDebt[studentIndex] || {};
    setEditingIndex(studentIndex);
    setEditForm({
      student_index: studentIndex,
      amount: debt.amount || 0,
      description: debt.description || '',
    });
  };

  const handleSave = (studentIndex) => {
    if (editForm.amount < 0) {
      toast.error('Amount must be non-negative');
      return;
    }
    saveMutation.mutate(editForm);
  };

  const handleDelete = (studentIndex) => {
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      deleteMutation.mutate(studentIndex);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const formatAmount = (amount) => {
    if (!amount || amount === 0) return 'No debt';
    return new Intl.NumberFormat('en-TZ').format(amount);
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/debts/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/debts/${formLevel}/years`;
    }
  };

  // Calculate student index (position in sorted list)
  // Students are sorted by name: first_name, then middle_name, then surname (A-Z)
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

  const normalizeHeader = (h) =>
    String(h ?? '')
      .trim()
      .replace(/\uFEFF/g, '')
      .replace(/\s/g, '')
      .toLowerCase();

  const findStudentByAdmNo = (admNoStr) => {
    const a = String(admNoStr ?? '').trim();
    if (!a) return null;
    const byExact = students.find((s) => String(s.adm_no).trim() === a);
    if (byExact) return byExact;
    const aNum = Number(a);
    if (!Number.isNaN(aNum)) {
      return (
        students.find((s) => Number(s.adm_no) === aNum) ||
        students.find((s) => String(s.adm_no).trim() === String(aNum))
      );
    }
    return null;
  };

  const handleDownloadTemplate = () => {
    const headers = ['AdmNumber', 'amount', 'description'];
    const rows = students.map((s) => {
      const studentIndex = getStudentIndex(s);
      const debt = existingDebt[studentIndex] || {};
      return [
        csvEscape(s.adm_no),
        csvEscape(debt.amount ?? 0),
        csvEscape(debt.description ?? ''),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_debt_template_${normalizedLevel}_${normalizedStream}_${year}.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Debt CSV template downloaded');
  };

  const handleDownloadFilledCSV = () => {
    const headers = ['AdmNumber', 'amount', 'description'];
    const rows = students.map((s) => {
      const studentIndex = getStudentIndex(s);
      const debt = existingDebt[studentIndex] || {};
      return [
        csvEscape(s.adm_no),
        csvEscape(debt.amount ?? 0),
        csvEscape(debt.description ?? ''),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_debt_filled_${normalizedLevel}_${normalizedStream}_${year}.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Filled debt CSV downloaded');
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
        const header = rawHeaderCells.map(normalizeHeader);

        const admNoIdx = header.findIndex((h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission'));
        const amountIdx = header.findIndex((h) => h === 'amount' || h === 'debtamount' || h === 'debt');
        const descIdx = header.findIndex((h) => h === 'description' || h === 'desc');

        if (admNoIdx === -1 || amountIdx === -1) {
          toast.error('Upload rejected: CSV must include columns "AdmNumber" and "amount"');
          return;
        }

        const payload = [];
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNo = String(cells[admNoIdx] ?? '').trim();
          if (!admNo) continue;

          const student = findStudentByAdmNo(admNo);
          if (!student) {
            skipped++;
            continue;
          }

          const studentIndex = getStudentIndex(student);
          const amountRaw = String(cells[amountIdx] ?? '').trim();
          const amount = amountRaw === '' ? 0 : parseFloat(amountRaw);
          const description = descIdx >= 0 ? String(cells[descIdx] ?? '').trim() : '';

          payload.push({
            student_index: studentIndex,
            amount: Number.isNaN(amount) ? 0 : amount,
            description,
          });
        }

        if (payload.length === 0) {
          toast.warning('No valid rows found to upload');
          return;
        }

        const res = await studentsAPI.saveDebtsBulk({
          level: normalizedLevel,
          stream: normalizedStream,
          year: parseInt(year, 10),
          debts: payload,
        });

        queryClient.invalidateQueries(['debt', normalizedLevel, normalizedStream, year]);

        const failed = res.data?.failed ?? 0;
        const saved = res.data?.saved ?? 0;
        if (failed === 0) {
          toast.success(`Upload complete: ${saved} debt record(s) saved.`);
        } else {
          toast.warning(`Upload complete with issues: ${saved} saved, ${failed} failed.`);
        }

        if (skipped > 0) {
          // Skipped unknown adm_no rows
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };

    setTimeout(run, 0);
  };

  return (
    <AdminLayout>
      <div className="debts-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-money-bill-wave"></i>
            Student Debt - {normalizedLevel} {normalizedStream} {year}
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || debtLoading ? (
              <div className="loading-state">Loading...</div>
            ) : studentsError ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>Error Loading Students</h3>
                <p>{studentsError.response?.data?.message || studentsError.message || 'Failed to load students. Please try again.'}</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Level={normalizedLevel} | Stream={normalizedStream} | Year={year}
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-money-bill-wave empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students have been registered for this class yet.</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Level={normalizedLevel} | Stream={normalizedStream} | Year={year}
                </p>
              </div>
            ) : (
              <>
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
                        <th>Debt Amount (TZS)</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const studentIndex = getStudentIndex(student);
                        const debt = existingDebt[studentIndex];
                        const isEditing = editingIndex === studentIndex;
                        
                        return (
                          <tr key={student.adm_no}>
                            <td>{index + 1}</td>
                            <td>{student.adm_no}</td>
                            <td>{student.first_name}</td>
                            <td>{student.middle_name || '-'}</td>
                            <td>{student.surname}</td>
                            <td>{student.sex}</td>
                            <td>{student.year}</td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editForm.amount || 0}
                                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                  className="debt-input"
                                />
                              ) : (
                                <span className={debt?.amount > 0 ? 'debt-amount' : 'text-muted'}>
                                  {debt?.amount > 0 ? formatAmount(debt.amount) : 'No debt'}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  className="debt-input"
                                  placeholder="Description"
                                />
                              ) : (
                                <span className={debt?.description ? 'debt-text' : 'text-muted'}>
                                  {debt?.description || '-'}
                                </span>
                              )}
                            </td>
                            <td className="actions-col">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSave(studentIndex)}
                                    className="action-btn save-btn"
                                    disabled={saveMutation.isLoading}
                                  >
                                    <i className="fas fa-save"></i>
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="action-btn cancel-btn"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(studentIndex)}
                                    className="action-btn edit-btn"
                                  >
                                    <i className="fas fa-edit"></i> Edit
                                  </button>
                                  {debt?.amount > 0 && (
                                    <button
                                      onClick={() => handleDelete(studentIndex)}
                                      className="action-btn delete-btn"
                                    >
                                      <i className="fas fa-trash"></i> Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-students-list">
                  {students.map((student, index) => {
                    const studentIndex = getStudentIndex(student);
                    const debt = existingDebt[studentIndex];
                    const isEditing = editingIndex === studentIndex;
                    
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
                            <span className="mobile-student-field-label">Debt Amount</span>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.amount || 0}
                                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                className="debt-input"
                                style={{ maxWidth: '150px', textAlign: 'right' }}
                              />
                            ) : (
                              <span className={debt?.amount > 0 ? 'mobile-student-field-value debt-amount' : 'mobile-student-field-value text-muted'}>
                                {debt?.amount > 0 ? formatAmount(debt.amount) : 'No debt'}
                              </span>
                            )}
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Description</span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="debt-input"
                                placeholder="Description"
                                style={{ maxWidth: '200px' }}
                              />
                            ) : (
                              <span className={debt?.description ? 'mobile-student-field-value debt-text' : 'mobile-student-field-value text-muted'}>
                                {debt?.description || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mobile-student-actions">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(studentIndex)}
                                className="action-btn save-btn"
                                disabled={saveMutation.isLoading}
                              >
                                <i className="fas fa-save"></i> Save
                              </button>
                              <button
                                onClick={handleCancel}
                                className="action-btn cancel-btn"
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(studentIndex)}
                                className="action-btn edit-btn"
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              {debt?.amount > 0 && (
                                <button
                                  onClick={() => handleDelete(studentIndex)}
                                  className="action-btn delete-btn"
                                >
                                  <i className="fas fa-trash"></i> Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="csv-section">
                  <h3><i className="fas fa-file-csv"></i> CSV Bulk Operations</h3>
                  <div className="csv-actions">
                    <button
                      className="excel-btn primary"
                      onClick={handleDownloadTemplate}
                      disabled={students.length === 0 || uploading}
                    >
                      <i className="fas fa-download"></i> Download Template CSV
                    </button>

                    <label
                      className="excel-btn success"
                      style={{ cursor: students.length === 0 ? 'not-allowed' : 'pointer', opacity: students.length === 0 ? 0.6 : 1 }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleUploadFilled}
                        disabled={students.length === 0 || uploading}
                        style={{ display: 'none' }}
                      />
                      <i className="fas fa-upload"></i> {uploading ? 'Uploading...' : 'Upload CSV'}
                    </label>

                    <button
                      className="excel-btn secondary"
                      onClick={handleDownloadFilledCSV}
                      disabled={students.length === 0 || uploading}
                    >
                      <i className="fas fa-download"></i> Download Filled CSV
                    </button>
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

export default DebtsManagement;

