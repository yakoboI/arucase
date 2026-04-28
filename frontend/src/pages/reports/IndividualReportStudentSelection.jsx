/**
 * Individual Student Report - Step 4: Student Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';
import './IndividualReport.css';

const IndividualReportStudentSelection = () => {
  const { form, stream, year, term } = useParams();
  const navigate = useNavigate();

  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = parseInt(year);

  // Normalize form level
  const normalizedLevel = form
    ? form.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  // Check if this is Form V or VI
  const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';

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

  // Fetch students for this class
  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['report-students', form, stream, apiYear, ...(isFormVOrVI ? [normalizedTerm] : [])],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('level', form);
      if (stream && stream !== 'NA') {
        params.append('stream', stream);
      }
      params.append('year', apiYear);
      // For Form V/VI, filter by term
      if (isFormVOrVI) {
        params.append('term', normalizedTerm);
      }

      const res = await api.get(`/students?${params.toString()}`);
      return res.data.students || [];
    }
  });

  const handleStudentClick = (admNo) => {
    navigate(`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/${encodeURIComponent(term)}/${encodeURIComponent(admNo)}`);
  };

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="breadcrumb">
          <Link to="/reports/individual">Individual Student Report</Link> &gt;{' '}
          <Link to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/year`}>{form}</Link> &gt;{' '}
          <Link to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`}>{year}</Link> &gt; {term}
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-users"></i> Select Student
          </div>
          <div className="excel-card-body">
            <p className="instruction-text">Click on a student to generate their report</p>

            {isLoading ? (
              <div className="loading">Loading students...</div>
            ) : error ? (
              <div className="error">Error loading students: {error.message}</div>
            ) : students.length > 0 ? (
              <table className="excel-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>S/N</th>
                    <th style={{ width: '150px' }}>ADM NO</th>
                    <th>STUDENT NAME</th>
                    <th style={{ width: '150px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id || student.adm_no}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>
                        <strong>{student.adm_no}</strong>
                      </td>
                      <td>
                        <strong>
                          {student.first_name} {student.middle_name || ''} {student.surname}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleStudentClick(student.adm_no)}
                          className="excel-btn small"
                        >
                          <i className="fas fa-file-alt"></i> Generate Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No students found for {form} {stream !== 'NA' ? stream : ''} {year}</p>
              </div>
            )}
            <div className="action-buttons mt-20">
              <Link
                to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`}
                className="excel-btn"
              >
                <nobr><i className="fas fa-arrow-left"></i> Back to Terms</nobr>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportStudentSelection;


