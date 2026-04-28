/**
 * User Management Page
 * Assign modules and tasks to non-admin roles (teacher, secretary, priest, discipline).
 * Reference: arucase456copy admin_users_enhanced.html
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { adminAPI } from '../../services/admin';
import DataTable from '../../components/common/DataTable';
import './Users.css';

// Non-admin roles that get custom permissions (modules, classes, subjects)
const ROLES_WITH_PERMISSIONS = ['teacher', 'secretary', 'priest', 'discipline'];

// Class options for assignment (match reference: FORM I–IV and FORM V/VI streams)
const CLASS_OPTIONS = [
  'FORM I', 'FORM II', 'FORM III', 'FORM IV',
  'FORM V PCM', 'FORM V PCB', 'FORM V EGM', 'FORM V HGE', 'FORM V HGL',
  'FORM VI PCM', 'FORM VI PCB', 'FORM VI EGM', 'FORM VI HGE', 'FORM VI HGL',
];

// Year options for class restrictions
// Generate years dynamically: from 2 years ago to 5 years in the future
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);

// Months allowed for score entry (restrict teacher to specific months)
const SCORE_ENTRY_MONTHS = ['February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November'];

// Term options for module group restrictions (Comments & Assessment, Reports, Other)
// System expects: "Term I" and "Term II" only
// Form I-IV: Term I: February, March, April, May; Term II: August, September, October, November
// Form V/VI: Term I (Jul-Dec): August, September, October, November; Term II (Jan-Jun): February, March, April, May
const TERM_OPTIONS = ['Term I', 'Term II'];

// Module groups for non-admin access (match reference: Academic, Comments, Reports, Other)
// groupKey: when set, this group gets optional years/terms allocation in user permissions
const MODULE_GROUPS = [
  {
    label: 'Academic',
    groupKey: null,
    modules: [
      { id: 'individual_scores', label: 'Individual Scores', icon: 'fa-graduation-cap' },
      { id: 'monthly_results', label: 'Monthly Results', icon: 'fa-clipboard-list' },
      { id: 'student_registration', label: 'Student Registration (View)', icon: 'fa-user-plus' },
      { id: 'student_photo', label: 'Student Photo (View)', icon: 'fa-camera' },
    ],
  },
  {
    label: 'Comments & Assessment',
    groupKey: 'comments_assessment',
    modules: [
      { id: 'sala_comments', label: 'Sala Comments', icon: 'fa-comments' },
      { id: 'huduma_comments', label: 'Huduma', icon: 'fa-hands-helping' },
      { id: 'tabia_comments', label: 'Tabia Comments', icon: 'fa-user-check' },
      { id: 'michezo_comments', label: 'Michezo Comments', icon: 'fa-running' },
      { id: 'mwalimu_taaluma_comments', label: 'Mwalimu wa Taaluma Comments', icon: 'fa-user-graduate' },
      { id: 'mkuu_shule_comments', label: 'Mkuu wa Shule Comments', icon: 'fa-crown' },
      { id: 'taaluma_comments', label: 'Taaluma Comments', icon: 'fa-book-open' },
      { id: 'tabia_mwenendo_comments', label: 'Tabia na Mwenendo Comments', icon: 'fa-balance-scale' },
    ],
  },
  {
    label: 'Reports',
    groupKey: 'reports',
    modules: [
      { id: 'individual_report', label: 'Individual Student Report (View)', icon: 'fa-file-alt' },
      { id: 'bulk_report', label: 'Bulk Report (View)', icon: 'fa-copy' },
    ],
  },
  {
    label: 'Analytics',
    groupKey: null,
    modules: [
      { id: 'analytics', label: 'Analytics (all: form selection, student/class/subject track, who & when, solutions, all forms averages)', icon: 'fa-chart-line' },
    ],
  },
  {
    label: 'Other',
    groupKey: 'other',
    modules: [
      { id: 'individual_debt', label: 'Individual Debt (View)', icon: 'fa-money-bill-wave' },
      { id: 'fees_announcements', label: 'Fees Announcements (View)', icon: 'fa-bullhorn' },
      { id: 'student_parishes', label: 'Student Parishes (View)', icon: 'fa-place-of-worship' },
    ],
  },
];

const defaultModuleGroupPermissions = () => ({
  comments_assessment: { years: [], terms: [] },
  reports: { years: [], terms: [] },
  other: { years: [], terms: [] },
});

const defaultPermissions = () => ({
  class_subjects: {},
  modules: [],
  class_permissions: {},
  score_entry_months: [],
  module_group_permissions: defaultModuleGroupPermissions(),
});

const Users = () => {
  const queryClient = useQueryClient();
  const modalContentRef = useRef(null);
  const modalOverlayRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'teacher',
    status: 'active',
    permissions: defaultPermissions(),
  });

  // Scroll permission form to top when modal opens and prevent body scroll
  useEffect(() => {
    if (showAddModal) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        modalOverlayRef.current?.scrollTo?.(0, 0);
        modalContentRef.current?.scrollTo?.(0, 0);
      });
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal]);

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await adminAPI.getUsers();
      return res.data.users || [];
    },
  });

  // Fetch subjects for permission management
  const { data: subjectsData = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const res = await adminAPI.getSubjectsList();
      return res.data.subjects || [];
    },
  });

  // Unique subject names (same subject can appear for different level/stream)
  const uniqueSubjects = useMemo(() => {
    const names = new Set((subjectsData || []).map((s) => s.subject_name).filter(Boolean));
    return Array.from(names).sort();
  }, [subjectsData]);

  const showPermissions = ROLES_WITH_PERMISSIONS.includes(formData.role);

  // Save user mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.saveUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success(`User ${editingUser ? 'updated' : 'created'} successfully!`);
      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save user');
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      username: '',
      full_name: '',
      password: '',
      role: 'teacher',
      status: 'active',
      permissions: defaultPermissions(),
    });
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setEditingUser(null);
    setShowAddModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((user) => {
    setEditingUser(user);
    const perms = user.permissions || defaultPermissions();
    let class_subjects = perms.class_subjects && typeof perms.class_subjects === 'object' ? perms.class_subjects : {};
    if (Object.keys(class_subjects).length === 0 && Array.isArray(perms.classes) && perms.classes.length > 0 && Array.isArray(perms.subjects)) {
      perms.classes.forEach((c) => { class_subjects[c] = [...(perms.subjects || [])]; });
    }
    const mgp = perms.module_group_permissions && typeof perms.module_group_permissions === 'object'
      ? { ...defaultModuleGroupPermissions(), ...perms.module_group_permissions }
      : defaultModuleGroupPermissions();
    setFormData({
      username: user.username,
      full_name: user.full_name,
      password: '',
      role: user.role,
      status: user.status || 'active',
      permissions: {
        class_subjects: class_subjects,
        modules: Array.isArray(perms.modules) ? perms.modules : [],
        class_permissions: perms.class_permissions && typeof perms.class_permissions === 'object' ? perms.class_permissions : {},
        score_entry_months: Array.isArray(perms.score_entry_months) ? perms.score_entry_months : [],
        module_group_permissions: mgp,
      },
    });
    setShowAddModal(true);
  }, []);

  const handleDelete = useCallback((user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.full_name}"?`)) {
      deleteMutation.mutate(user.id);
    }
  }, [deleteMutation]);

  const handleRoleChange = useCallback((role) => {
    setFormData((prev) => ({
      ...prev,
      role,
      ...(ROLES_WITH_PERMISSIONS.includes(role) ? {} : { permissions: defaultPermissions() }),
    }));
  }, []);

  const toggleClassSubject = useCallback((className, subjectName, checked) => {
    setFormData((prev) => {
      const cs = { ...(prev.permissions.class_subjects || {}) };
      if (!cs[className]) cs[className] = [];
      const list = cs[className];
      if (checked) {
        if (!list.includes(subjectName)) cs[className] = [...list, subjectName];
      } else {
        cs[className] = list.filter((s) => s !== subjectName);
      }
      if (cs[className].length === 0) delete cs[className];
      return { ...prev, permissions: { ...prev.permissions, class_subjects: cs } };
    });
  }, []);

  const toggleClassYear = useCallback((className, year, checked) => {
    setFormData((prev) => {
      const cp = { ...(prev.permissions.class_permissions || {}) };
      if (!cp[className]) cp[className] = { years: [] };
      const years = checked
        ? [...cp[className].years, year]
        : cp[className].years.filter((y) => y !== year);
      cp[className].years = years;
      if (years.length === 0) delete cp[className].years;
      if (Object.keys(cp[className]).length === 0) delete cp[className];
      return {
        ...prev,
        permissions: { ...prev.permissions, class_permissions: cp },
      };
    });
  }, []);

  const toggleModule = useCallback((moduleId, checked) => {
    setFormData((prev) => {
      const modules = checked
        ? [...(prev.permissions.modules || []), moduleId]
        : (prev.permissions.modules || []).filter((m) => m !== moduleId);
      return { ...prev, permissions: { ...prev.permissions, modules } };
    });
  }, []);

  const toggleScoreEntryMonth = useCallback((month, checked) => {
    setFormData((prev) => {
      const score_entry_months = checked
        ? [...(prev.permissions.score_entry_months || []), month]
        : (prev.permissions.score_entry_months || []).filter((m) => m !== month);
      return { ...prev, permissions: { ...prev.permissions, score_entry_months } };
    });
  }, []);

  const toggleModuleGroupYear = useCallback((groupKey, year, checked) => {
    setFormData((prev) => {
      const mgp = { ...(prev.permissions.module_group_permissions || defaultModuleGroupPermissions()) };
      if (!mgp[groupKey]) mgp[groupKey] = { years: [], terms: [] };
      const years = checked
        ? [...(mgp[groupKey].years || []), year]
        : (mgp[groupKey].years || []).filter((y) => y !== year);
      mgp[groupKey] = { ...mgp[groupKey], years };
      return { ...prev, permissions: { ...prev.permissions, module_group_permissions: mgp } };
    });
  }, []);

  const toggleModuleGroupTerm = useCallback((groupKey, term, checked) => {
    setFormData((prev) => {
      const mgp = { ...(prev.permissions.module_group_permissions || defaultModuleGroupPermissions()) };
      if (!mgp[groupKey]) mgp[groupKey] = { years: [], terms: [] };
      const terms = checked
        ? [...(mgp[groupKey].terms || []), term]
        : (mgp[groupKey].terms || []).filter((t) => t !== term);
      mgp[groupKey] = { ...mgp[groupKey], terms };
      return { ...prev, permissions: { ...prev.permissions, module_group_permissions: mgp } };
    });
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.full_name.trim()) {
      toast.error('Username and full name are required');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast.error('Password is required for new users');
      return;
    }
    saveMutation.mutate({
      id: editingUser?.id,
      ...formData,
    });
  }, [formData, editingUser, saveMutation]);

  const getRoleBadgeClass = useCallback((role) => {
    const roleMap = {
      superadmin: 'badge-superadmin',
      admin: 'badge-admin',
      teacher: 'badge-teacher',
      secretary: 'badge-secretary',
      priest: 'badge-priest',
      discipline: 'badge-discipline',
    };
    return roleMap[role] || 'badge-default';
  }, []);

  const getUserClasses = useCallback((user) => {
    if (user.role === 'admin' || user.role === 'superadmin') {
      return ['All Classes'];
    }
    const perms = user.permissions || {};
    if (perms.class_subjects && Object.keys(perms.class_subjects).length > 0) {
      return Object.keys(perms.class_subjects);
    }
    if (perms.classes && Array.isArray(perms.classes) && perms.classes.length > 0) {
      return perms.classes;
    }
    return [];
  }, []);

  const getUserSubjects = useCallback((user) => {
    if (user.role === 'admin' || user.role === 'superadmin') {
      return ['All Subjects'];
    }
    const perms = user.permissions || {};
    const subjects = new Set();
    
    if (perms.class_subjects && typeof perms.class_subjects === 'object') {
      Object.values(perms.class_subjects).forEach((subjList) => {
        if (Array.isArray(subjList)) {
          subjList.forEach((subj) => {
            if (typeof subj === 'string') {
              subjects.add(subj);
            } else if (subj && typeof subj === 'object' && subj.name) {
              subjects.add(subj.name);
            }
          });
        }
      });
    }
    
    if (perms.subjects && Array.isArray(perms.subjects)) {
      perms.subjects.forEach((subj) => {
        if (typeof subj === 'string') {
          subjects.add(subj);
        } else if (subj && typeof subj === 'object' && subj.name) {
          subjects.add(subj.name);
        }
      });
    }
    
    return Array.from(subjects);
  }, []);

  const getModuleLabel = useCallback((moduleId) => {
    for (const group of MODULE_GROUPS) {
      const module = group.modules.find((m) => m.id === moduleId);
      if (module) return module.label;
    }
    return moduleId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  const getUserModules = useCallback((user) => {
    const perms = user.permissions || {};
    if (perms.modules && perms.modules.includes('all')) {
      return ['All Modules'];
    }
    if (perms.modules && Array.isArray(perms.modules) && perms.modules.length > 0) {
      return perms.modules.map((m) => getModuleLabel(m));
    }
    return [];
  }, [getModuleLabel]);

  // Prepare columns for DataTable (memoized to prevent recreation on every render)
  const columns = useMemo(() => [
    { 
      key: 'username', 
      label: 'Username',
      render: (value) => <span className="username-cell">{value}</span>
    },
    { 
      key: 'full_name', 
      label: 'Full Name',
      render: (value) => <span className="fullname-cell">{value}</span>
    },
    { 
      key: 'role', 
      label: 'Role',
      render: (value) => (
        <span className={`role-badge ${getRoleBadgeClass(value)}`}>
          {value.toUpperCase()}
        </span>
      )
    },
    { 
      key: 'classes', 
      label: 'Classes',
      render: (value, user) => {
        const userClasses = getUserClasses(user);
        if (userClasses.length === 0) {
          return <span className="text-muted">None assigned</span>;
        }
        if (userClasses[0] === 'All Classes') {
          return <span className="text-muted">All Classes</span>;
        }
        return (
          <>
            {userClasses.map((className) => (
              <span key={className} className="class-badge">
                {className}
              </span>
            ))}
          </>
        );
      }
    },
    { 
      key: 'subjects', 
      label: 'Subjects',
      render: (value, user) => {
        const userSubjects = getUserSubjects(user);
        if (userSubjects.length === 0) {
          return <span className="text-muted">None assigned</span>;
        }
        if (userSubjects[0] === 'All Subjects') {
          return <span className="text-muted">All Subjects</span>;
        }
        return (
          <>
            {userSubjects.map((subject) => (
              <span key={subject} className="subject-badge" title={subject}>
                {subject}
                <i className="fas fa-info-circle"></i>
              </span>
            ))}
          </>
        );
      }
    },
    { 
      key: 'modules', 
      label: 'Modules Access',
      render: (value, user) => {
        const userModules = getUserModules(user);
        if (userModules.length === 0) {
          return <span className="text-muted">None assigned</span>;
        }
        if (userModules[0] === 'All Modules') {
          return (
            <span className="module-badge all-modules">
              All Modules ({MODULE_GROUPS.reduce((acc, g) => acc + g.modules.length, 0)})
            </span>
          );
        }
        if (userModules.length > 10) {
          return (
            <span className="module-badge all-modules">
              All Modules ({userModules.length})
            </span>
          );
        }
        return (
          <>
            {userModules.slice(0, 5).map((module) => (
              <span key={module} className="module-badge">
                {module.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            ))}
            {userModules.length > 5 && (
              <span className="more-badge">
                +{userModules.length - 5} more
              </span>
            )}
          </>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, user) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(user);
            }}
            className="excel-btn secondary small"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <i className="fas fa-edit"></i> Edit
          </button>
          {user.username !== 'admin' && user.role !== 'superadmin' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(user);
              }}
              className="excel-btn secondary small"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: '#ef4444', color: 'white' }}
            >
              <i className="fas fa-trash"></i> Delete
            </button>
          )}
        </div>
      )
    }
  ], [getRoleBadgeClass, getUserClasses, getUserSubjects, getUserModules, handleEdit, handleDelete]);

  return (
    <AdminLayout>
      <div style={{ padding: '2rem' }}>
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-users-cog"></i>
            User & Permission Management
            <div className="header-actions">
              <button onClick={handleAdd} className="excel-btn secondary small">
                <i className="fas fa-plus-circle"></i> Add New
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            <p style={{ marginBottom: '1.5rem', color: '#656d76' }}>
              Manage users, roles, and access permissions
            </p>

            {isLoading ? (
              <div className="admin-table-container">
                <SkeletonLoader type="table" />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="admin-info-badge">
                    <i className="fas fa-info-circle"></i> Total Users: <strong>{users.length}</strong>
                  </span>
                </div>

                {users.length === 0 ? (
                  <div className="admin-empty-state">
                    <i className="fas fa-users"></i>
                    <h3>No Users Yet</h3>
                    <p>Click "Add New" to add your first user.</p>
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <DataTable
                      data={users}
                      columns={columns}
                    />
                  </div>
                )}

              </>
            )}
          </div>
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div ref={modalContentRef} className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
                <button onClick={() => setShowAddModal(false)} className="modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="excel-input"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="excel-input"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Password {!editingUser && '*'}</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="excel-input"
                      required={!editingUser}
                      placeholder={editingUser ? 'Leave blank to keep current' : ''}
                    />
                  </div>

                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="excel-input"
                      required
                    >
                      <option value="teacher">Teacher (Custom Permissions)</option>
                      <option value="secretary">Secretary (Custom Permissions)</option>
                      <option value="priest">Priest (Custom Permissions)</option>
                      <option value="discipline">Discipline (Custom Permissions)</option>
                      <option value="admin">Admin (Full Access)</option>
                      <option value="superadmin">Superadmin (Full Access)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="excel-input"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                        {/* Permissions section: only for non-admin roles */}
                        {showPermissions && (
                          <div className="permissions-section">
                            <h4 className="permissions-section-title">
                              <i className="fas fa-lock"></i> User Permissions
                            </h4>
                            <p className="permissions-hint">
                              Assign classes, subjects, and module access for this user. Admin and Superadmin have full access and do not use these settings.
                            </p>

                            <div className="permissions-block">
                              <label className="permissions-block-label">Class & Subject assignments</label>
                              <p className="permissions-info">
                                <i className="fas fa-info-circle"></i> Assign this teacher to specific class–subject combinations. For each class, select the subjects they teach. Optionally restrict years per class (leave empty for all years).
                              </p>
                              {CLASS_OPTIONS.map((className) => {
                                const subjectsForClass = (formData.permissions.class_subjects || {})[className] || [];
                                const years = (formData.permissions.class_permissions || {})[className]?.years || [];
                                return (
                                  <div key={className} className="permission-class-subject-card">
                                    <div className="permission-class-subject-header">{className}</div>
                                    <div className="permission-class-subjects-row">
                                      <span className="permission-class-subjects-label">Subjects:</span>
                                      {uniqueSubjects.length === 0 ? (
                                        <span className="text-muted">No subjects in system.</span>
                                      ) : (
                                        <div className="permissions-subjects-inline">
                                          {uniqueSubjects.map((name) => (
                                            <label key={`${className}-${name}`} className="permission-check-label">
                                              <input
                                                type="checkbox"
                                                checked={subjectsForClass.includes(name)}
                                                onChange={(e) => toggleClassSubject(className, name, e.target.checked)}
                                              />
                                              <span>{name}</span>
                                            </label>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="class-years-row">
                                      <span className="class-years-label">Years (optional):</span>
                                      {YEAR_OPTIONS.map((y) => (
                                        <label key={y} className="permission-year-label">
                                          <input
                                            type="checkbox"
                                            checked={years.includes(y)}
                                            onChange={(e) => toggleClassYear(className, y, e.target.checked)}
                                          />
                                          {y}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="permissions-block">
                              <label className="permissions-block-label">Score entry – allowed months</label>
                              <p className="permissions-info">
                                <i className="fas fa-info-circle"></i> Restrict this user to entering scores only in selected months. Leave all unchecked for no restriction (all months).
                              </p>
                              <div className="permissions-months-grid">
                                {SCORE_ENTRY_MONTHS.map((month) => (
                                  <label key={month} className="permission-check-label">
                                    <input
                                      type="checkbox"
                                      checked={(formData.permissions.score_entry_months || []).includes(month)}
                                      onChange={(e) => toggleScoreEntryMonth(month, e.target.checked)}
                                    />
                                    <span>{month}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="permissions-block">
                              <label className="permissions-block-label">Module Access</label>
                              <p className="permissions-info">
                                <i className="fas fa-info-circle"></i> Grant access to specific admin modules. For Comments & Assessment, Reports, and Other you can optionally restrict by years and terms (leave empty for all).
                              </p>
                              {MODULE_GROUPS.map((group) => {
                                const groupPerms = (formData.permissions.module_group_permissions || defaultModuleGroupPermissions())[group.groupKey] || { years: [], terms: [] };
                                const groupYears = Array.isArray(groupPerms.years) ? groupPerms.years : [];
                                const groupTerms = Array.isArray(groupPerms.terms) ? groupPerms.terms : [];
                                return (
                                  <div key={group.label} className="permissions-module-group">
                                    <div className="permissions-module-group-title">{group.label}</div>
                                    <div className="permissions-modules-grid">
                                      {group.modules.map((mod) => (
                                        <label key={mod.id} className="permission-check-label">
                                          <input
                                            type="checkbox"
                                            checked={(formData.permissions.modules || []).includes(mod.id)}
                                            onChange={(e) => toggleModule(mod.id, e.target.checked)}
                                          />
                                          <span><i className={`fas ${mod.icon}`}></i> {mod.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                    {group.groupKey && (
                                      <>
                                        <div className="module-group-years-row">
                                          <span className="module-group-meta-label">Years (optional):</span>
                                          {YEAR_OPTIONS.map((y) => (
                                            <label key={y} className="permission-year-label">
                                              <input
                                                type="checkbox"
                                                checked={groupYears.includes(y)}
                                                onChange={(e) => toggleModuleGroupYear(group.groupKey, y, e.target.checked)}
                                              />
                                              {y}
                                            </label>
                                          ))}
                                        </div>
                                        <div className="module-group-terms-row">
                                          <span className="module-group-meta-label">Terms (optional):</span>
                                          {TERM_OPTIONS.map((t) => (
                                            <label key={t} className="permission-year-label">
                                              <input
                                                type="checkbox"
                                                checked={groupTerms.includes(t)}
                                                onChange={(e) => toggleModuleGroupTerm(group.groupKey, t, e.target.checked)}
                                              />
                                              {t}
                                            </label>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddModal(false)} className="excel-btn secondary">
                    Cancel
                  </button>
                  <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                    <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
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

export default Users;
