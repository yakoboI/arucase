import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../utils/useSound';
import api from '../../services/api';
import './Dashboard.css';

// Module guidelines for non-admin users (static data outside component)
const MODULE_GUIDELINES = [
  { module: 'student_registration', icon: 'fa-user-plus', title: 'Student Registration', description: 'Register new students accurately. Enter complete information including names, forms, streams, and registration numbers. Verify all data before saving.' },
  { module: 'student_photo', icon: 'fa-camera', title: 'Student Photo', description: 'Upload clear, passport-size student photos. Ensure proper lighting and professional appearance. Photos are used in reports and official documents.' },
  { module: 'student_parishes', icon: 'fa-place-of-worship', title: 'Student Parishes', description: 'Assign students to their respective parishes. Maintain accurate parish records for spiritual guidance and communication with home parishes.' },
  { module: 'subjects', icon: 'fa-book', title: 'Subjects', description: 'Manage subject configurations for different form levels. Ensure all required subjects are properly set up for academic tracking and reporting.' },
  { module: 'individual_scores', icon: 'fa-graduation-cap', title: 'Individual Subject Score', description: 'Enter student scores accurately for each subject. Double-check marks before saving. These scores directly affect student reports and academic standing.' },
  { module: 'subject_teachers', icon: 'fa-chalkboard-teacher', title: 'Subject Teachers', description: 'Assign teachers to their subjects and classes. Maintain current teaching assignments to ensure proper responsibility tracking.' },
  { module: 'marks_config', icon: 'fa-calendar-alt', title: 'Month Selection & Marks Config', description: 'Configure monthly assessment periods and grading criteria. Set up marking schemes to maintain consistent evaluation standards across all forms.' },
  { module: 'sala_comments', icon: 'fa-comments', title: 'Sala Comments', description: 'Provide meaningful feedback on students\' prayer life and spiritual participation. Be constructive, encouraging, and specific in your observations.' },
  { module: 'huduma_comments', icon: 'fa-hands-helping', title: 'Huduma', description: 'Evaluate students\' service to the community. Comment on their willingness to help, teamwork, and contribution to school activities.' },
  { module: 'tabia_comments', icon: 'fa-user-check', title: 'Tabia Comments', description: 'Assess students\' behavior and character. Provide honest, fair comments that help students grow morally and socially.' },
  { module: 'michezo_comments', icon: 'fa-running', title: 'Michezo Comments', description: 'Comment on students\' sports and physical activities participation. Recognize athletic achievements and encourage active, healthy lifestyles.' },
  { module: 'mwalimu_taaluma_comments', icon: 'fa-user-graduate', title: 'Mwalimu wa Taaluma Comments', description: 'As the academic teacher, provide brief, specific academic guidance. Focus on study habits, class participation, and areas for improvement.' },
  { module: 'mkuu_shule_comments', icon: 'fa-crown', title: 'Mkuu wa Shule Comments', description: 'As headmaster, provide overall assessment and direction. Offer balanced, authoritative guidance that considers all aspects of student development.' },
  { module: 'taaluma_comments', icon: 'fa-book-open', title: 'Taaluma Comments', description: 'Provide comprehensive academic feedback. Comment on intellectual growth, academic strengths, and areas requiring focused attention.' },
  { module: 'tabia_mwenendo_comments', icon: 'fa-balance-scale', title: 'Tabia na Mwenendo', description: 'Evaluate behavior and conduct comprehensively. Use the rating system consistently: A (Excellent), B (Good), C (Satisfactory), D (Needs Improvement).' },
  { module: 'monthly_results', icon: 'fa-clipboard-list', title: 'Arucase Monthly Results', description: 'Enter and review monthly academic results. Ensure all assessments are recorded promptly and accurately for timely student progress tracking.' },
  { module: 'individual_debt', icon: 'fa-money-bill-wave', title: 'Individual Debt', description: 'Track student fee payments and outstanding balances. Handle financial information with confidentiality and sensitivity.' },
  { module: 'individual_report', icon: 'fa-file-alt', title: 'Individual Student Report', description: 'Generate comprehensive student report cards. Review all information before printing. Reports represent the school\'s official assessment.' },
  { module: 'bulk_report', icon: 'fa-copy', title: 'Student Bulk Report', description: 'Generate reports for entire classes efficiently. Verify that all student data is complete before bulk generation to avoid incomplete reports.' },
  { module: 'news_announcements', icon: 'fa-newspaper', title: 'News & Announcements', description: 'Post important school news and public announcements. Write clearly and professionally as these are visible to parents and the public.' },
  { module: 'fees_announcements', icon: 'fa-money-bill-wave', title: 'Fees Announcements', description: 'Communicate fee-related information to students and parents. Be clear about amounts, deadlines, and payment methods.' },
];

const ADMIN_LIKE_ROLES = ['admin', 'superadmin', 'rector', 'vice_rector', 'academic_master'];

const Dashboard = () => {
  const { user } = useAuth();
  const { isMuted, toggleMute } = useSound();
  const isAdmin = user?.role && ADMIN_LIKE_ROLES.includes(user.role);
  const formatCappedCoverage = useCallback((assigned, students) => {
    const totalStudents = Number(students) || 0;
    if (totalStudents <= 0) return '0.0%';
    const assignedCount = Number(assigned) || 0;
    const cappedAssigned = Math.min(assignedCount, totalStudents);
    return `${((cappedAssigned / totalStudents) * 100).toFixed(1)}%`;
  }, []);

  const formatPhotoCoverage = useCallback((photos, students) => {
    const totalStudents = Number(students) || 0;
    if (totalStudents <= 0) return '0.0%';
    const photoCount = Number(photos) || 0;
    return `${((photoCount / totalStudents) * 100).toFixed(1)}%`;
  }, []);

  // Heavy stats + activity log only for admin-like roles; teachers use the guidelines-only view
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    },
    enabled: !!(user?.role && ADMIN_LIKE_ROLES.includes(user.role)),
    refetchOnWindowFocus: false,
    staleTime: 60000, // Cache for 1 minute
    retry: (failureCount, err) => err?.response?.status !== 401 && failureCount < 1,
  });

  const stats = dashboardData?.stats || {};
  const userPermissions = useMemo(() => {
    const p = user?.permissions;
    if (!p) return { modules: [] };
    if (typeof p === 'string') {
      try { return JSON.parse(p); } catch { return { modules: [] }; }
    }
    return Array.isArray(p?.modules) ? p : { ...p, modules: p?.modules || [] };
  }, [user?.permissions]);

  
  const availableGuidelines = useMemo(() => {
    const modules = userPermissions.modules || [];
    if (modules.includes('all')) return MODULE_GUIDELINES;
    const hasRegistrationSplit =
      modules.includes('student_registration') ||
      modules.includes('student_registration_form_i_iv') ||
      modules.includes('student_registration_form_v_vi');
    return MODULE_GUIDELINES.filter((guideline) => {
      if (guideline.module === 'student_registration') return hasRegistrationSplit;
      return modules.includes(guideline.module);
    });
  }, [userPermissions.modules]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="dashboard-loading">
          <SkeletonLoader type="text" lines={1} width="50%" height="2rem" className="mb-3" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader key={i} type="card" height="90px" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="dashboard-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Error loading dashboard: {error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  // Non-Admin Dashboard (Teachers, etc.)
  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="teacher-dashboard-container">
          <div className="sky-background">
            <div className="welcome-overlay">
              <h1 className="welcome-title">Welcome, {user?.full_name || user?.username}!</h1>
              <p className="welcome-subtitle">Your dedicated workspace for managing student excellence</p>
            </div>
          </div>
          
          <div className="guidelines-section">
            <div className="guidelines-header-row">
              <h2 className="guidelines-header">
                <i className="fas fa-compass" aria-hidden="true"></i> Your Responsibilities & Guidelines
              </h2>
              <button
                onClick={toggleMute}
                className="mute-toggle-btn"
                aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              </button>
            </div>
            <p className="guidelines-intro">
              Click on any sidebar menu item to perform your assigned duties. Here are helpful guidelines for each module:
            </p>
            
            <div className="guidelines-grid">
              {availableGuidelines.length > 0 ? (
                availableGuidelines.map((guideline, index) => (
                  <div key={index} className="guideline-card">
                    <div className="guideline-icon">
                      <i className={`fas ${guideline.icon}`} aria-hidden="true"></i>
                    </div>
                    <h3>{guideline.title}</h3>
                    <p>{guideline.description}</p>
                  </div>
                ))
              ) : (
                <div className="guideline-card">
                  <div className="guideline-icon">
                    <i className="fas fa-info-circle" aria-hidden="true"></i>
                  </div>
                  <h3>No Modules Assigned</h3>
                  <p>Contact your administrator to assign modules to your account.</p>
                </div>
              )}
            </div>
            
            <div className="guidelines-footer">
              <p>
                <i className="fas fa-lightbulb"></i> <strong>Reminder:</strong> Always save your work regularly and verify data accuracy before submission. For assistance, contact the system administrator.
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Admin Dashboard
  return (
    <AdminLayout>
      <div className="dashboard-layout">
        {/* Welcome Section */}
        <div className="welcome-header">
          <div className="welcome-header-content">
            <div className="welcome-text">
              <h2>
                <i className="fas fa-graduation-cap" aria-hidden="true"></i> Welcome
              </h2>
            </div>
            <button
              onClick={toggleMute}
              className="mute-toggle-btn"
              aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-main-grid">
          {/* Left Column: Statistics */}
          <div className="dashboard-left-column">
            {/* Student Statistics Section */}
            <div className="dashboard-section">
              <h3 className="section-title">
                <i className="fas fa-users" aria-hidden="true"></i> Student Statistics
              </h3>
              {/* Exercise-box style table for per-year statistics */}
              {Array.isArray(stats.students_by_year) && stats.students_by_year.length > 0 && (
                <div className="year-table-container">
                  <div className="year-table-header">Yearly Student Distribution</div>
                  <div className="year-table">
                    <div className="year-table-row year-table-row--head">
                      <div className="year-table-cell year-table-cell--head">Year</div>
                      <div className="year-table-cell year-table-cell--head">Number of Students</div>
                    </div>
                    {stats.students_by_year.map(({ year, term, count }) => (
                      <div key={`students-${year}-${term}`} className="year-table-row">
                        <div className="year-table-cell year-table-cell--year">{year} ({term})</div>
                        <div className="year-table-cell year-table-cell--count">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise-box for detailed form/year distribution (Form as rows, Years as columns) */}
              {Array.isArray(stats.students_by_year_and_form) && stats.students_by_year_and_form.length > 0 && (() => {
                const rows = stats.students_by_year_and_form;
                const yearColumns = Array.from(
                  new Set(rows.map((r) => r.year))
                ).sort((a, b) => a - b);

                const forms = [
                  { key: 'form_i', label: 'Form I' },
                  { key: 'form_ii', label: 'Form II' },
                  { key: 'form_iii', label: 'Form III' },
                  { key: 'form_iv', label: 'Form IV' },
                  { key: 'form_v', label: 'Form V' },
                  { key: 'form_vi', label: 'Form VI' },
                ];

                const getCount = (rowYear, formKey) => {
                  // Aggregate across all terms for the same year
                  const yearRows = rows.filter((r) => r.year === rowYear);
                  if (yearRows.length === 0) return 0;
                  const total = yearRows.reduce((sum, row) => {
                    const value = row[formKey];
                    return sum + (typeof value === 'number' ? value : 0);
                  }, 0);
                  return total;
                };

                return (
                  <div className="year-table-container">
                    <div className="year-table-header">Form-wise Student Distribution (per Year)</div>
                    <div
                      className="year-table year-table--forms"
                      style={{ '--year-cols': yearColumns.length }}
                    >
                      <div className="year-table-row year-table-row--head">
                        <div className="year-table-cell year-table-cell--head">Form / Class</div>
                        {yearColumns.map((year) => (
                          <div
                            key={`header-${year}`}
                            className="year-table-cell year-table-cell--head"
                          >
                            {year}
                          </div>
                        ))}
                        <div className="year-table-cell year-table-cell--head">
                          Total Registered
                        </div>
                      </div>

                      {forms.map(({ key, label }) => (
                        <div key={key} className="year-table-row">
                          <div className="year-table-cell year-table-cell--year">
                            {label}
                          </div>
                          {yearColumns.map((year) => (
                            <div
                              key={`${key}-${year}`}
                              className="year-table-cell year-table-cell--count-no-suffix"
                            >
                              {getCount(year, key)}
                            </div>
                          ))}
                          <div className="year-table-cell year-table-cell--count-no-suffix">
                            {yearColumns.reduce((sum, year) => sum + getCount(year, key), 0)}
                          </div>
                        </div>
                      ))}

                      <div className="year-table-row year-table-row--footer">
                        <div className="year-table-cell year-table-cell--year">
                          <strong>Grand Total</strong>
                        </div>
                        {yearColumns.map((year) => {
                          // Aggregate total across all terms for the same year
                          const yearRows = rows.filter((r) => r.year === year);
                          const total = yearRows.reduce((sum, row) => {
                            return sum + (typeof row.total === 'number' ? row.total : 0);
                          }, 0);
                          return (
                            <div
                              key={`total-${year}`}
                              className="year-table-cell year-table-cell--count-no-suffix"
                            >
                              {total}
                            </div>
                          );
                        })}
                        <div className="year-table-cell year-table-cell--count-no-suffix">
                          {yearColumns.reduce((sum, year) => {
                            const row = rows.find((r) => r.year === year);
                            const total = row && typeof row.total === 'number' ? row.total : 0;
                            return sum + total;
                          }, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Academic Statistics Section */}
            <div className="dashboard-section">
              <h3 className="section-title">
                <i className="fas fa-book" aria-hidden="true"></i> Academic Statistics
              </h3>
              <div className="year-table-container">
                <div className="year-table-header">Academic Statistics Overview</div>
                <div className="year-table year-table--academic-grid">
                  <div className="year-table-row year-table-row--head">
                    <div className="year-table-cell year-table-cell--head">Metric</div>
                    <div className="year-table-cell year-table-cell--head">Form I</div>
                    <div className="year-table-cell year-table-cell--head">Form II</div>
                    <div className="year-table-cell year-table-cell--head">Form III</div>
                    <div className="year-table-cell year-table-cell--head">Form IV</div>
                    <div className="year-table-cell year-table-cell--head">Form V</div>
                    <div className="year-table-cell year-table-cell--head">Form VI</div>
                    <div className="year-table-cell year-table-cell--head">Total</div>
                  </div>

                  <div className="year-table-row">
                    <div className="year-table-cell year-table-cell--year">Total Subjects</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_i?.subjects || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_ii?.subjects || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_iii?.subjects || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_iv?.subjects || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_v?.subjects || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_vi?.subjects || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.total_subjects || 0}</div>
                  </div>

                  <div className="year-table-row">
                    <div className="year-table-cell year-table-cell--year">Photos Uploaded</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_i?.photos || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_ii?.photos || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_iii?.photos || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_iv?.photos || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_v?.photos || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_vi?.photos || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.total_photos || 0}</div>
                  </div>

                  <div className="year-table-row">
                    <div className="year-table-cell year-table-cell--year">Photo Coverage</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.academic_by_form?.form_i?.photos, stats.form_i_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.academic_by_form?.form_ii?.photos, stats.form_ii_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.academic_by_form?.form_iii?.photos, stats.form_iii_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.academic_by_form?.form_iv?.photos, stats.form_iv_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.academic_by_form?.form_v?.photos, stats.form_v_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.academic_by_form?.form_vi?.photos, stats.form_vi_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(stats.total_photos, stats.total_students)}</div>
                  </div>

                  <div className="year-table-row">
                    <div className="year-table-cell year-table-cell--year">Parish Assigned</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_i?.parishes || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_ii?.parishes || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_iii?.parishes || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_iv?.parishes || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_v?.parishes || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.academic_by_form?.form_vi?.parishes || 0}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{stats.parishes_assigned || 0}</div>
                  </div>

                  <div className="year-table-row">
                    <div className="year-table-cell year-table-cell--year">Parish Coverage</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.academic_by_form?.form_i?.parishes, stats.form_i_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.academic_by_form?.form_ii?.parishes, stats.form_ii_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.academic_by_form?.form_iii?.parishes, stats.form_iii_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.academic_by_form?.form_iv?.parishes, stats.form_iv_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.academic_by_form?.form_v?.parishes, stats.form_v_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.academic_by_form?.form_vi?.parishes, stats.form_vi_students)}</div>
                    <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(stats.parishes_assigned, stats.total_students)}</div>
                  </div>
                </div>
              </div>

              {Array.isArray(stats.academic_by_year) && stats.academic_by_year.length > 0 && stats.academic_by_year.map((yearStat) => (
                <div className="year-table-container" key={`academic-${yearStat.year}`}>
                  <div className="year-table-header">Academic Statistics Overview - {yearStat.year}</div>
                  <div className="year-table year-table--academic-grid">
                    <div className="year-table-row year-table-row--head">
                      <div className="year-table-cell year-table-cell--head">Metric</div>
                      <div className="year-table-cell year-table-cell--head">Form I</div>
                      <div className="year-table-cell year-table-cell--head">Form II</div>
                      <div className="year-table-cell year-table-cell--head">Form III</div>
                      <div className="year-table-cell year-table-cell--head">Form IV</div>
                      <div className="year-table-cell year-table-cell--head">Form V</div>
                      <div className="year-table-cell year-table-cell--head">Form VI</div>
                      <div className="year-table-cell year-table-cell--head">Total</div>
                    </div>

                    <div className="year-table-row">
                      <div className="year-table-cell year-table-cell--year">Total Subjects</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_i?.subjects || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_ii?.subjects || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_iii?.subjects || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_iv?.subjects || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_v?.subjects || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_vi?.subjects || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.totals?.subjects || 0}</div>
                    </div>

                    <div className="year-table-row">
                      <div className="year-table-cell year-table-cell--year">Photos Uploaded</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_i?.photos || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_ii?.photos || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_iii?.photos || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_iv?.photos || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_v?.photos || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_vi?.photos || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.totals?.photos || 0}</div>
                    </div>

                    <div className="year-table-row">
                      <div className="year-table-cell year-table-cell--year">Photo Coverage</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.by_form?.form_i?.photos, yearStat.by_form?.form_i?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.by_form?.form_ii?.photos, yearStat.by_form?.form_ii?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.by_form?.form_iii?.photos, yearStat.by_form?.form_iii?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.by_form?.form_iv?.photos, yearStat.by_form?.form_iv?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.by_form?.form_v?.photos, yearStat.by_form?.form_v?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.by_form?.form_vi?.photos, yearStat.by_form?.form_vi?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatPhotoCoverage(yearStat.totals?.photos, yearStat.totals?.students)}</div>
                    </div>

                    <div className="year-table-row">
                      <div className="year-table-cell year-table-cell--year">Parish Assigned</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_i?.parishes || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_ii?.parishes || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_iii?.parishes || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_iv?.parishes || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_v?.parishes || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.by_form?.form_vi?.parishes || 0}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{yearStat.totals?.parishes || 0}</div>
                    </div>

                    <div className="year-table-row">
                      <div className="year-table-cell year-table-cell--year">Parish Coverage</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.by_form?.form_i?.parishes, yearStat.by_form?.form_i?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.by_form?.form_ii?.parishes, yearStat.by_form?.form_ii?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.by_form?.form_iii?.parishes, yearStat.by_form?.form_iii?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.by_form?.form_iv?.parishes, yearStat.by_form?.form_iv?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.by_form?.form_v?.parishes, yearStat.by_form?.form_v?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.by_form?.form_vi?.parishes, yearStat.by_form?.form_vi?.students)}</div>
                      <div className="year-table-cell year-table-cell--count-no-suffix">{formatCappedCoverage(yearStat.totals?.parishes, yearStat.totals?.students)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
