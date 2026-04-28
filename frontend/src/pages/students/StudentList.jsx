/**
 * Student List Page - Full Functionality with Quality Tables
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import DataTable from '../../components/common/DataTable';
import api from '../../services/api';
import { studentsAPI } from '../../services/students';
import { requiresSpecialAcademicYearLogic, getApiYearForFormVVI } from '../../utils/academicYearUtils';
import './StudentList.css';

const STUDENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRANSFERRED', label: 'Transferred' },
];

const StudentList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('ACTIVE');
  const [selectByStatus, setSelectByStatus] = useState('ACTIVE');
  const [tableKey, setTableKey] = useState(0);
  
  // Normalize level from URL (handle URL encoding: "FORM+I" -> "FORM I", ensure uppercase)
  const normalizeLevelFromURL = (levelParam) => {
    if (!levelParam) return '';
    // Decode URL encoding (+ becomes space, %20 becomes space)
    const decoded = decodeURIComponent(levelParam.replace(/\+/g, ' '));
    // Ensure uppercase to match database format
    return decoded.toUpperCase().trim();
  };
  
  const [filters, setFilters] = useState({
    level: normalizeLevelFromURL(searchParams.get('level')) || '',
    stream: searchParams.get('stream') || '',
    year: searchParams.get('year') || new Date().getFullYear().toString(),
    term: searchParams.get('term') || 'First Term',
    search: ''
  });

  // Standard streams for FORM I-IV
  const standardStreams = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' }
  ];

  // Combination streams for FORM V-VI
  const combinationStreams = [
    { value: 'PCB', label: 'PCB - Physics, Chemistry, Biology' },
    { value: 'PCM', label: 'PCM - Physics, Chemistry, Mathematics' },
    { value: 'EGM', label: 'EGM - Economics, Geography, Mathematics' },
    { value: 'HGE', label: 'HGE - History, Geography, Economics' },
    { value: 'HGL', label: 'HGL - History, Geography, Literature' }
  ];

  // Get available streams based on selected level
  const getAvailableStreams = () => {
    const level = filters.level;
    if (level === 'Form V' || level === 'FORM V' || level === 'Form VI' || level === 'FORM VI') {
      return combinationStreams;
    } else if (level === 'Form I' || level === 'FORM I' || 
               level === 'Form II' || level === 'FORM II' ||
               level === 'Form III' || level === 'FORM III' ||
               level === 'Form IV' || level === 'FORM IV') {
      return standardStreams;
    } else {
      // Show all streams when no level is selected
      return [...standardStreams, ...combinationStreams];
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Reset stream filter when level changes
  const handleLevelChange = (level) => {
    handleFilterChange('level', level);
    // Reset stream if it's not valid for the new level
    const availableStreams = level === 'Form V' || level === 'FORM V' || level === 'Form VI' || level === 'FORM VI'
      ? combinationStreams
      : standardStreams;
    
    if (filters.stream && !availableStreams.find(s => s.value === filters.stream)) {
      handleFilterChange('stream', '');
    }
  };

  // Fetch students
  const { data, isLoading, error } = useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filters.level && filters.level.trim()) {
          // Normalize level to uppercase and encode properly
          const normalizedLevel = filters.level.trim().toUpperCase();
          params.append('level', normalizedLevel);
        }
        if (filters.stream && filters.stream.trim()) {
          const normalizedStream = filters.stream.trim();
          // Skip if stream is 'NA' (not a valid stream)
          if (normalizedStream !== 'NA') {
            params.append('stream', normalizedStream);
          }
        }
        if (filters.year && filters.year.toString().trim()) {
          const yearNum = parseInt(filters.year);
          if (!isNaN(yearNum) && yearNum > 0) {
            // Use calendar year directly for Form V/VI (no academic year conversion)
            // Form V First Term (Jul-Dec 2025) -> year 2025
            // Form V Second Term (Jan-Jun 2026) -> year 2026
            // Form VI First Term (Jul-Dec 2026) -> year 2026
            // Form VI Second Term (Jan-Jun 2027) -> year 2027
            params.append('year', yearNum.toString());
          }
        }
        // For Form I-IV, don't filter by term - show all students for the year
        // For Form V/VI, filter by term
        const isFormVOrVI = filters.level === 'Form V' || filters.level === 'FORM V' ||
                           filters.level === 'Form VI' || filters.level === 'FORM VI';
        if (filters.term && filters.term.trim() && isFormVOrVI) {
          params.append('term', filters.term.trim());
        }
        if (filters.search && filters.search.trim()) {
          params.append('search', filters.search.trim());
        }
        
        const queryString = params.toString();
        const url = `/students${queryString ? `?${queryString}` : ''}`;
        
        const res = await api.get(url);
        
        // Ensure we return an array
        if (!res.data) {
          console.warn('No data in response:', res);
          return [];
        }
        
        const students = Array.isArray(res.data.students) ? res.data.students : [];
        
        // Sort students by name: first_name, then middle_name, then surname (A-Z)
        // This applies to all student pages except result templates
        return students.sort((a, b) => {
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
      } catch (err) {
        // Don't let query errors trigger logout - let the interceptor handle auth errors
        // Only log non-authentication errors to reduce console noise
        if (err?.response?.status !== 401) {
          console.error('Error fetching students:', err);
          console.error('Error details:', {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            config: err.config
          });
        }
        throw err;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (authentication errors)
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    // Enable query even if filters are empty
    enabled: true
  });

  const queryClient = useQueryClient();
  const updateStatusMutation = useMutation({
    mutationFn: ({ student, status }) =>
      studentsAPI.updateStudent(student.adm_no, { status }, {
        level: student.level,
        stream: student.stream,
        year: String(student.year),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['students', filters]);
      toast.success('Student status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  const handleStatusChange = (student, newStatus) => {
    if (student.status === newStatus) return;
    updateStatusMutation.mutate({ student, status: newStatus });
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ students, status }) => {
      const results = await Promise.allSettled(
        students.map((student) =>
          studentsAPI.updateStudent(student.adm_no, { status }, {
            level: student.level,
            stream: student.stream,
            year: String(student.year),
          })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) throw new Error(`${failed} update(s) failed`);
      return results;
    },
    onSuccess: (_, { students }) => {
      queryClient.invalidateQueries(['students', filters]);
      toast.success(`${students.length} student(s) marked successfully`);
      setSelectedStudents([]);
      setTableKey((k) => k + 1);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update some students');
    },
  });

  const handleBulkStatusApply = () => {
    if (selectedStudents.length === 0) return;
    bulkStatusMutation.mutate({ students: selectedStudents, status: bulkStatus });
  };

  const handleSelectAll = () => {
    if (data && data.length > 0) setSelectedStudents([...data]);
  };

  const handleSelectByStatus = () => {
    if (!data || data.length === 0) return;
    const filtered = data.filter((s) => (s.status || 'PENDING') === selectByStatus);
    setSelectedStudents(filtered);
    if (filtered.length === 0) toast.info(`No students with status "${STUDENT_STATUS_OPTIONS.find((o) => o.value === selectByStatus)?.label}"`);
  };

  const handleDownloadPDF = async (student) => {
    try {
      const res = await api.get(
        `/reports/individual/${student.level}/${student.stream}/${student.year}/Term I/${student.adm_no}/pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${student.adm_no}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      // Try to extract error message from blob response if available
      let errorMessage = 'Failed to download PDF report';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse, use default message
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error toast
      toast.error(errorMessage);
    }
  };

  const columns = [
    {
      key: 'adm_no',
      header: 'Admission No',
      width: '120px',
      sortable: true
    },
    {
      key: 'full_name',
      header: 'Full Name',
      width: '250px',
      accessor: (row) => `${row.first_name} ${row.middle_name || ''} ${row.surname}`.trim(),
      sortable: true
    },
    {
      key: 'sex',
      header: 'Gender',
      width: '100px',
      render: (value) => (
        <span className={`gender-badge gender-${value.toLowerCase()}`}>
          {value}
        </span>
      )
    },
    {
      key: 'level',
      header: 'Level',
      width: '100px'
    },
    {
      key: 'stream',
      header: 'Stream',
      width: '120px'
    },
    {
      key: 'year',
      header: 'Year',
      width: '100px'
    },
    {
      key: 'status',
      header: 'Status',
      width: '160px',
      render: (value, row) => {
        const isUpdating = updateStatusMutation.isLoading && updateStatusMutation.variables?.student?.adm_no === row.adm_no;
        return (
          <select
            className={`status-select status-${(value || 'PENDING').toLowerCase()}`}
            value={value || 'PENDING'}
            onChange={(e) => handleStatusChange(row, e.target.value)}
            disabled={isUpdating}
            title="Change student status"
          >
            {STUDENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '150px',
      render: (value, row) => (
        <div className="action-buttons">
          <button
            type="button"
            onClick={() => handleDownloadPDF(row)}
            className="btn btn-sm btn-primary"
            title="Download Report PDF"
          >
            📄 PDF
          </button>
        </div>
      )
    }
  ];

  // Handle authentication errors
  useEffect(() => {
    if (error?.isTokenExpired) {
      toast.error(error.expirationMessage || 'Your session has expired. Please log in again.');
    }
  }, [error]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="loading">
          <SkeletonLoader type="table" />
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Error loading students';
    const statusCode = error?.response?.status;
    
    return (
      <AdminLayout>
        <div className="error" style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Error Loading Students</h2>
          <p style={{ marginBottom: '10px' }}>{errorMessage}</p>
          {statusCode === 401 && (
            <p style={{ color: '#ef4444', marginTop: '10px' }}>
              Your session may have expired. Please try refreshing the page or logging in again.
            </p>
          )}
          {statusCode === 500 && (
            <p style={{ color: '#ef4444', marginTop: '10px' }}>
              Server error. Please check the backend logs or try again later.
            </p>
          )}
          {!statusCode && (
            <p style={{ color: '#ef4444', marginTop: '10px' }}>
              Network error. Please check your connection and try again.
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#01a72b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="student-list-page">
      <div className="page-header">
        <h1>Student List</h1>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Level</label>
          <select
            value={filters.level}
            onChange={(e) => handleLevelChange(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="FORM I">FORM I</option>
            <option value="FORM II">FORM II</option>
            <option value="FORM III">FORM III</option>
            <option value="FORM IV">FORM IV</option>
            <option value="FORM V">FORM V</option>
            <option value="FORM VI">FORM VI</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Stream</label>
          <select
            value={filters.stream}
            onChange={(e) => handleFilterChange('stream', e.target.value)}
          >
            <option value="">All Streams</option>
            {getAvailableStreams().map((stream) => (
              <option key={stream.value} value={stream.value}>
                {stream.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Year</label>
          <input
            type="number"
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            min="2020"
            max="2030"
          />
        </div>

        <div className="filter-group">
          <label>Term</label>
          <select
            value={filters.term}
            onChange={(e) => handleFilterChange('term', e.target.value)}
          >
            <option value="First Term">First Term (Jul-Dec)</option>
            <option value="Second Term">Second Term (Jan-Jun)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Select students bar - when list has data */}
      {data && data.length > 0 && (
        <div className="select-students-bar">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSelectAll}
          >
            Select all ({data.length}) students
          </button>
          <span className="select-by-status-label">Select by status:</span>
          <select
            className="select-by-status-dropdown"
            value={selectByStatus}
            onChange={(e) => setSelectByStatus(e.target.value)}
          >
            {STUDENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSelectByStatus}
          >
            Select
          </button>
        </div>
      )}

      {/* Bulk status bar - when some students selected */}
      {selectedStudents.length > 0 && (
        <div className="bulk-status-bar">
          <span className="bulk-status-count">
            {selectedStudents.length} selected
          </span>
          <select
            className="bulk-status-select"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            disabled={bulkStatusMutation.isLoading}
          >
            {STUDENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary btn-sm bulk-status-btn"
            onClick={handleBulkStatusApply}
            disabled={bulkStatusMutation.isLoading}
          >
            {bulkStatusMutation.isLoading ? 'Updating...' : `Mark as ${STUDENT_STATUS_OPTIONS.find((o) => o.value === bulkStatus)?.label}`}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setSelectedStudents([]); setTableKey((k) => k + 1); }}
            disabled={bulkStatusMutation.isLoading}
          >
            Clear selection
          </button>
        </div>
      )}

      {data && data.length > 0 ? (
        <DataTable
          key={tableKey}
          data={data}
          columns={columns}
          title={`Students (${data.length})`}
          searchable={false}
          sortable
          pagination
          pageSize={25}
          exportable
          selectable
          onRowSelect={(rows) => setSelectedStudents(rows)}
          onRowClick={(row) => {
            // Navigate to student detail or open modal
            console.log('Student clicked:', row);
          }}
        />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }}></i>
          <h3 style={{ marginBottom: '8px', color: '#1e293b' }}>No Students Found</h3>
          <p>No students match your current filters. Try adjusting the filters or add new students.</p>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default StudentList;
