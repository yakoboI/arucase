/**
 * Student Photo Management Page
 * Allows uploading, viewing, and deleting student photos
 * Uses special academic year logic for Form 5 & 6 streams
 */
import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import api from '../../services/api';
import { requiresSpecialAcademicYearLogic, getAcademicYearRange, getCurrentTerm, getApiYearForFormVVI } from '../../utils/academicYearUtils';
import './PhotoManagement.css';

const PhotoManagement = ({ formLevel: formLevelProp }) => {
  const params = useParams();
  const queryClient = useQueryClient();

  // Extract parameters - handle both URL patterns:
  // FORM I-IV: /photos/form-i/year/:year/stream/:stream
  // FORM V-VI: /photos/form-v/stream/:stream/year/:year/term/:term
  const { formLevel: formLevelParam, year, stream, term } = params;
  
  // Use prop if provided, otherwise use URL params
  // Only extract from pathname if we're on a route that should have these params
  const formLevel = formLevelProp || formLevelParam || (() => {
    // Only try to extract from pathname if we have year or stream params
    // This prevents false positives on the base /admin/students/photos route
    if (year && stream) {
      const pathParts = window.location.pathname.split('/');
      const formIndex = pathParts.indexOf('photos');
      return formIndex >= 0 && pathParts[formIndex + 1] ? pathParts[formIndex + 1] : '';
    }
    return '';
  })();

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [deleteStudent, setDeleteStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [photosVersion, setPhotosVersion] = useState(0); // Increment on upload/delete to bust image cache
  const [selectedTerm, setSelectedTerm] = useState(term || 'First Term');

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const uploadFormRef = useRef(null);

  // Update selectedTerm when URL term parameter changes
  useEffect(() => {
    if (term) {
      setSelectedTerm(term);
    }
  }, [term]);

  // Normalize form level from URL param (convert to uppercase: "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';

  // Check if this is Form V or VI
  const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';

  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = year ? (typeof year === 'number' ? year : parseInt(year, 10)) : null;
  
  // Ensure year is a number for API calls - handle both string and number inputs
  const yearNum = apiYear;
  
  // Validate that we have all required parameters
  // Must have formLevel, stream, and valid year
  // Also ensure we have actual URL params (year and stream from useParams), not just pathname parsing
  const hasValidParams = Boolean(
    normalizedLevel && 
    stream && 
    yearNum && 
    !isNaN(yearNum) && 
    yearNum > 0 &&
    params.year && // Ensure year came from URL params
    params.stream && // Ensure stream came from URL params
    (formLevelProp || formLevelParam || (year && stream)) // formLevel can come from prop, param, or pathname if we have year+stream
  );

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

  // Fetch students for this class - works for ALL forms (FORM I-VI) and ALL years
  // Students are sorted by name: first_name, then middle_name, then surname (A-Z)
  const { data: studentsData = [], isLoading, error: studentsError } = useQuery({
    queryKey: ['students-photos', normalizedLevel, stream, apiYear, selectedTerm],
    queryFn: async () => {
      if (!hasValidParams) {
        console.warn('PhotoManagement: Invalid params', {
          normalizedLevel,
          stream,
          apiYear,
          hasValidParams,
          formLevel,
          formLevelParam,
          formLevelProp,
          params
        });
        return [];
      }
      try {
        console.log('PhotoManagement: Fetching students with params', {
          level: normalizedLevel,
          stream: stream,
          year: apiYear,
          term: selectedTerm
        });
        // Normalize stream: ensure uppercase (backend expects uppercase)
        const normalizedStream = stream ? stream.trim().toUpperCase() : stream;
        
        const res = await studentsAPI.getStudents({
          level: normalizedLevel,
          stream: normalizedStream,
          year: apiYear,
          // For Form I-IV, don't filter by term - show all students for the year
          // For Form V/VI, filter by term
          ...(isFormVOrVI ? { term: selectedTerm } : {}),
        });
        const students = res.data.students || [];
        console.log(`PhotoManagement: Found ${students.length} students for ${normalizedLevel} ${stream} ${apiYear}`);
        // Sort students by name: first_name, then middle_name, then surname (A-Z)
        return sortStudentsByName(students);
      } catch (error) {
        // Don't swallow 401 – let caller show session-expired message
        if (error.response?.status === 401) {
          throw error;
        }
        console.error('PhotoManagement: Error fetching students:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          params: {
            level: normalizedLevel,
            stream: stream,
            year: apiYear
          }
        });
        return [];
      }
    },
    enabled: hasValidParams, // Only fetch when all params are valid
    retry: false, // Don't retry on error
  });
  
  // Use sorted students
  const students = studentsData;

  // Fetch photos for this class - works for ALL forms (FORM I-VI) and ALL years
  const { data: photosData = {} } = useQuery({
    queryKey: ['student-photos-list', normalizedLevel, stream, apiYear],
    queryFn: async () => {
      if (!hasValidParams) {
        return {};
      }
      try {
        const res = await api.get('/students/photos/list', {
          params: { 
            level: normalizedLevel, 
            stream: stream, 
            year: apiYear 
          }
        });
        const photosMap = {};
        (res.data.photos || []).forEach(photo => {
          photosMap[photo.student_index] = photo;
        });
        return photosMap;
      } catch (error) {
        // Only log non-401 errors (401 means unauthorized, which is expected if params are invalid)
        if (error.response?.status !== 401) {
          console.error('Error fetching photos:', error);
        }
        return {};
      }
    },
    enabled: hasValidParams, // Only fetch when all params are valid
    retry: false, // Don't retry on error
  });

  // Upload photo mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ admNo, formData }) => {
      return studentsAPI.uploadPhoto(admNo, formData);
    },
    onSuccess: async () => {
      // Invalidate and refetch queries to get updated photo list (use apiYear to match query keys)
      const queryKey = ['student-photos-list', normalizedLevel, stream, apiYear];
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ['students-photos', normalizedLevel, stream, apiYear] });
      
      // Refetch the photos list immediately (React Query v5 object API)
      await queryClient.refetchQueries({ queryKey });
      
      // Bump version to bust browser cache for displayed images
      setPhotosVersion(v => v + 1);
      
      // Clear failed images cache for this student
      setFailedImages(prev => {
        const newSet = new Set(prev);
        photosData[selectedStudent?.index]?.photo_filename && newSet.delete(photosData[selectedStudent.index].photo_filename);
        return newSet;
      });
      toast.success('Photo uploaded successfully!');
      closePhotoModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    },
  });

  // Delete photo mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ admNo, studentIndex }) => {
      return api.delete(`/students/${admNo}/photo`, {
        params: {
          level: normalizedLevel,
          stream: stream,
          year: apiYear,
          student_index: studentIndex
        }
      });
    },
    onSuccess: async () => {
      const queryKey = ['student-photos-list', normalizedLevel, stream, apiYear];
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ['students-photos', normalizedLevel, stream, apiYear] });
      await queryClient.refetchQueries({ queryKey });
      setPhotosVersion(v => v + 1);
      setFailedImages(prev => {
        const newSet = new Set(prev);
        photosData[deleteStudent?.index]?.photo_filename && newSet.delete(photosData[deleteStudent.index].photo_filename);
        return newSet;
      });
      toast.success('Photo deleted successfully!');
      closeDeleteModal();
    },
    onError: (error) => {
      // 404 = no photo to delete (e.g. already deleted or stale cache) — refresh UI and close
      if (error.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['student-photos-list', normalizedLevel, stream, apiYear] });
        queryClient.invalidateQueries({ queryKey: ['students-photos', normalizedLevel, stream, apiYear] });
        queryClient.refetchQueries({ queryKey: ['student-photos-list', normalizedLevel, stream, apiYear] });
        setPhotosVersion(v => v + 1);
        closeDeleteModal();
        toast.info('No photo to delete.');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to delete photo');
    },
  });

  const openPhotoModal = (student) => {
    // Get student index based on sorted position
    const studentIndex = getStudentIndex(student);
    setSelectedStudent({ ...student, index: studentIndex });
    setActiveTab('upload');
    setCapturedPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    stopCamera();
  };

  const closePhotoModal = () => {
    setSelectedStudent(null);
    setCapturedPhoto(false);
    stopCamera();
  };

  const openViewModal = (student, photoFilename) => {
    setViewPhoto({ student, filename: photoFilename });
  };

  const closeViewModal = () => {
    setViewPhoto(null);
  };

  const openDeleteModal = (student) => {
    // Get student index based on sorted position
    const studentIndex = getStudentIndex(student);
    setDeleteStudent({ ...student, index: studentIndex });
  };

  const closeDeleteModal = () => {
    setDeleteStudent(null);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !fileInputRef.current?.files[0]) {
      toast.error('Please select a photo file');
      return;
    }

    // Recalculate student index to ensure it matches current sorted order
    const currentStudentIndex = getStudentIndex(selectedStudent);

    const formData = new FormData();
    formData.append('photo', fileInputRef.current.files[0]);
    formData.append('level', normalizedLevel);
    formData.append('stream', stream);
    formData.append('year', apiYear);
    formData.append('student_index', currentStudentIndex.toString());

    uploadMutation.mutate({
      admNo: selectedStudent.adm_no,
      formData
    });
  };

  const handleDeletePhoto = async () => {
    if (!deleteStudent) return;
    
    deleteMutation.mutate({
      admNo: deleteStudent.adm_no,
      studentIndex: deleteStudent.index
    });
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera access is not supported in your browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setCameraStream(stream);
      setCapturedPhoto(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error('Error accessing camera: ' + (error.message || 'Permission denied'));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    stopCamera();
    setCapturedPhoto(true);
  };

  const saveCameraPhoto = async () => {
    if (!canvasRef.current || !selectedStudent) return;
    
    // Recalculate student index to ensure it matches current sorted order
    const currentStudentIndex = getStudentIndex(selectedStudent);
    
    canvasRef.current.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('photo', blob, 'camera-photo.jpg');
      formData.append('level', normalizedLevel);
      formData.append('stream', stream);
      formData.append('year', apiYear);
      formData.append('student_index', currentStudentIndex.toString());

      uploadMutation.mutate({
        admNo: selectedStudent.adm_no,
        formData
      });
    }, 'image/jpeg', 0.8);
  };

  const getPhotoUrl = (filename) => {
    if (!filename) return null;
    
    // Check for Cloudinary URLs first
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return photosVersion > 0 ? `${filename}?v=${photosVersion}` : filename;
    }
    
    const base = (() => {
      if (import.meta.env.DEV) return `/static/uploads/photos/${filename}`;
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) return `${apiUrl.replace('/api', '')}/static/uploads/photos/${filename}`;
      return `/static/uploads/photos/${filename}`;
    })();
    // Cache-bust so newly uploaded photos display immediately
    return photosVersion > 0 ? `${base}?v=${photosVersion}` : base;
  };

  // Get student index based on sorted position
  // Students are sorted by name: first_name, then middle_name, then surname (A-Z)
  const getStudentIndex = (student) => {
    const sortedStudents = sortStudentsByName(students);
    return sortedStudents.findIndex(s => s.adm_no === student.adm_no);
  };

  const hasPhoto = (studentIndex) => {
    return photosData[studentIndex]?.photo_filename;
  };

  const handleImageError = (photoFilename, studentIndex) => {
    // Track failed images to prevent repeated attempts
    setFailedImages(prev => new Set([...prev, photoFilename]));
    // Silently handle the error - the placeholder will show
  };

  const isImageFailed = (photoFilename) => {
    return failedImages.has(photoFilename);
  };

  const getBackPath = () => {
    // Handle back navigation for all forms
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      // FORM V-VI: Go back to year selection
      return `/admin/students/photos/${formLevel}/stream/${stream}/years`;
    } else {
      // FORM I-IV: Go back to stream selection
      return `/admin/students/photos/${formLevel}/year/${yearNum}/streams`;
    }
  };

  const handleDownloadPhotoEntryForm = async () => {
    try {
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const response = await studentsAPI.downloadPhotoEntryFormPDF(
        normalizedLevel,
        stream,
        yearNum,
        currentMonth,
        selectedTerm
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo_entry_form_${normalizedLevel.replace(/\s+/g, '_')}_${stream}_${yearNum}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Photo Entry Form downloaded successfully!');
    } catch (error) {
      console.error('Error downloading Photo Entry Form:', error);
      toast.error(error.response?.data?.message || 'Failed to download Photo Entry Form');
    }
  };

  return (
    <AdminLayout>
      <div className="photos-mgmt-page-container">
        <div className="photos-mgmt-card">
          <div className="photos-mgmt-card-header">
            <i className="fas fa-camera"></i>
            <span>
              Student Photos Management - {normalizedLevel} {stream} {yearNum}
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '14px' }}
              >
                <option value="First Term">First Term (Jul-Dec)</option>
                <option value="Second Term">Second Term (Jan-Jun)</option>
              </select>
            </span>
          </div>
          <div className="photos-mgmt-card-body">
            {!hasValidParams ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>Invalid Parameters</h3>
                <p>Please ensure you have selected a valid form, year, and stream.</p>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Form: {normalizedLevel || 'Not set'} | Stream: {stream || 'Not set'} | Year: {yearNum || 'Not set'}
                </p>
              </div>
            ) : isLoading ? (
              <div className="loading-state">Loading students...</div>
            ) : studentsError?.response?.status === 401 ? (
              <div className="empty-state">
                <i className="fas fa-lock empty-icon"></i>
                <h3>Session expired</h3>
                <p>Your session may have expired. Please log in again to manage photos.</p>
                <Link to="/login" className="excel-btn primary small" style={{ marginTop: '0.75rem' }}>
                  <i className="fas fa-sign-in-alt"></i> Log in
                </Link>
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-camera empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students registered for {normalizedLevel} {stream} {yearNum} yet.</p>
                {studentsError && (
                  <p style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                    Error: {studentsError.message || 'Failed to fetch students'}
                  </p>
                )}
                {!hasValidParams && (
                  <p style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                    Invalid parameters - Level: "{normalizedLevel}", Stream: "{stream}", Year: {yearNum}
                  </p>
                )}
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Please register students first before uploading photos.
                </p>
              </div>
            ) : (
              <>
                <div className="photos-mgmt-table-container">
                  <table className="photos-mgmt-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Adm No</th>
                        <th>First Name</th>
                        <th>Middle Name</th>
                        <th>Surname</th>
                        <th>Sex</th>
                        <th>Year</th>
                        <th>Photo</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        // Get student index based on sorted position (for photo lookup)
                        const studentIndex = getStudentIndex(student);
                        const photoFilename = hasPhoto(studentIndex);
                        return (
                          <tr key={`${student.adm_no}-${student.level}-${student.stream}-${student.year}`}>
                            <td>{index + 1}</td>
                            <td>{student.adm_no}</td>
                            <td>{student.first_name}</td>
                            <td>{student.middle_name || '-'}</td>
                            <td>{student.surname}</td>
                            <td>{student.sex}</td>
                            <td>{student.year}</td>
                            <td style={{ position: 'relative', textAlign: 'center' }}>
                              {photoFilename && !isImageFailed(photoFilename) ? (
                                <img
                                  key={`photo-${studentIndex}-${photoFilename}`}
                                  src={getPhotoUrl(photoFilename)}
                                  alt={`${student.first_name} ${student.surname}`}
                                  className="student-photo"
                                  width={50}
                                  height={50}
                                  loading="lazy"
                                  style={{ display: 'block', margin: '0 auto' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    handleImageError(photoFilename, studentIndex);
                                    // Show placeholder
                                    const placeholder = e.target.parentElement.querySelector('.photo-placeholder');
                                    if (placeholder) {
                                      placeholder.classList.remove('hidden');
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`photo-placeholder ${photoFilename && !isImageFailed(photoFilename) ? 'hidden' : ''}`} style={{ display: photoFilename && !isImageFailed(photoFilename) ? 'none' : 'flex' }}>
                                <i className="fas fa-user"></i>
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  type="button"
                                  className="photo-btn small primary"
                                  onClick={() => openPhotoModal(student)}
                                  title="Add Photo"
                                >
                                  <i className="fas fa-camera"></i> Add
                                </button>
                                {photoFilename && !isImageFailed(photoFilename) && (
                                  <>
                                    <button
                                      type="button"
                                      className="photo-btn small"
                                      onClick={() => openViewModal(student, photoFilename)}
                                      title="View Photo"
                                    >
                                      <i className="fas fa-eye"></i> View
                                    </button>
                                    <button
                                      type="button"
                                      className="photo-btn small danger"
                                      onClick={() => openDeleteModal(student)}
                                      title="Delete Photo"
                                    >
                                      <i className="fas fa-trash"></i> Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Download Photo Entry Form */}
                <div className="download-section">
                  <h3>Photo Entry Form</h3>
                  <p>Download a printable form with all student photos and information</p>
                  <button
                    type="button"
                    className="download-btn"
                    onClick={handleDownloadPhotoEntryForm}
                  >
                    <i className="fas fa-download"></i> Download Photo Entry Form
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link to={getBackPath()} className="photos-mgmt-back-btn">
          <i className="fas fa-arrow-left"></i> Back
        </Link>

        {/* Photo Upload Modal */}
        {selectedStudent && (
          <div className="modal-overlay" onClick={closePhotoModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Photo for {selectedStudent.first_name} {selectedStudent.surname}</h3>
                <button type="button" className="close-btn" onClick={closePhotoModal} aria-label="Close">
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <div className="photo-upload-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('upload'); stopCamera(); }}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('camera');
                      setCapturedPhoto(false);
                      stopCamera();
                    }}
                  >
                    Take Photo
                  </button>
                </div>

                {activeTab === 'upload' && (
                  <form ref={uploadFormRef} onSubmit={handleFileUpload} className="tab-content active">
                    <div className="form-group">
                      <label>Select Photo File</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="form-input"
                        required
                      />
                      <small className="text-muted">
                        Upload max 5MB. Photos are saved passport-style (35×45 mm proportions, ~413×531px) and compressed for reports and fast loading.
                      </small>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="photo-btn secondary" onClick={closePhotoModal}>
                        Cancel
                      </button>
                      <button type="submit" className="photo-btn primary" disabled={uploadMutation.isPending}>
                        <i className="fas fa-upload"></i> {uploadMutation.isPending ? 'Uploading...' : 'Upload Photo'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'camera' && (
                  <div className="tab-content active">
                    <div className="camera-container">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={`camera-video ${cameraStream && !capturedPhoto ? '' : 'hidden'}`}
                      />
                      <canvas
                        ref={canvasRef}
                        className={`camera-canvas ${capturedPhoto ? '' : 'hidden'}`}
                      />
                      {!cameraStream && !capturedPhoto && (
                        <div className="camera-placeholder">
                          <i className="fas fa-camera"></i>
                          <p>Click "Start Camera" to take a photo</p>
                        </div>
                      )}
                    </div>
                    <div className="modal-actions">
                      {!cameraStream && !capturedPhoto && (
                        <button type="button" className="photo-btn primary" onClick={startCamera}>
                          <i className="fas fa-video"></i> Start Camera
                        </button>
                      )}
                      {cameraStream && !capturedPhoto && (
                        <button type="button" className="photo-btn primary" onClick={capturePhoto}>
                          <i className="fas fa-camera"></i> Capture Photo
                        </button>
                      )}
                      {capturedPhoto && (
                        <button type="button" className="photo-btn primary" onClick={saveCameraPhoto} disabled={uploadMutation.isPending}>
                          <i className="fas fa-save"></i> {uploadMutation.isPending ? 'Saving...' : 'Save Photo'}
                        </button>
                      )}
                      <button type="button" className="photo-btn secondary" onClick={closePhotoModal}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Photo Modal */}
        {viewPhoto && (
          <div className="modal-overlay" onClick={closeViewModal}>
            <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{viewPhoto.student.first_name} {viewPhoto.student.surname}</h3>
                <button type="button" className="close-btn" onClick={closeViewModal} aria-label="Close">
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <div className="photo-view-container">
                  {isImageFailed(viewPhoto.filename) ? (
                    <div className="photo-error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      <p>Photo not found</p>
                      <p className="text-muted">The photo file may have been deleted or moved.</p>
                    </div>
                  ) : (
                    <img
                      src={getPhotoUrl(viewPhoto.filename)}
                      alt={`${viewPhoto.student.first_name} ${viewPhoto.student.surname}`}
                      className="view-photo"
                      width={400}
                      height={300}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        handleImageError(viewPhoto.filename, null);
                        // Show error message safely
                        const container = e.target.parentElement;
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'photo-error-message';
                        errorDiv.innerHTML = `
                          <i class="fas fa-exclamation-triangle"></i>
                          <p>Photo not found</p>
                          <p class="text-muted">The photo file may have been deleted or moved.</p>
                        `;
                        container.appendChild(errorDiv);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Photo Confirmation Modal */}
        {deleteStudent && (
          <div className="modal-overlay" onClick={closeDeleteModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Photo</h3>
                <button type="button" className="close-btn" onClick={closeDeleteModal} aria-label="Close">
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this photo?</p>
                <p className="text-muted">This action cannot be undone.</p>
                <div className="modal-actions">
                  <button type="button" className="photo-btn secondary" onClick={closeDeleteModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="photo-btn danger"
                    onClick={handleDeletePhoto}
                    disabled={deleteMutation.isPending}
                  >
                    <i className="fas fa-trash"></i> {deleteMutation.isPending ? 'Deleting...' : 'Delete Photo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PhotoManagement;

