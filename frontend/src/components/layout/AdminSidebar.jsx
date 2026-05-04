import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminSidebar.css';

const AdminSidebar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const navigate = useNavigate();

  // Accordion: expanded category indices (initialized in useEffect to avoid TDZ)
  const [expandedCategories, setExpandedCategories] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('adminSidebarExpanded');
      if (saved) {
        setExpandedCategories(JSON.parse(saved));
        return;
      }
    } catch {}
    setExpandedCategories(navigationItems.map((_, i) => i));
  }, []);

  const toggleCategory = (index) => {
    setExpandedCategories((prev) => {
      const next = prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index];
      localStorage.setItem('adminSidebarExpanded', JSON.stringify(next));
      return next;
    });
  };
  const { logout, user } = useAuth();

  // Helper: get modules array from user.permissions
  const getUserModules = () => {
    if (!user?.permissions) return [];
    try {
      const perms = typeof user.permissions === 'string'
        ? JSON.parse(user.permissions)
        : user.permissions;
      return Array.isArray(perms.modules) ? perms.modules : [];
    } catch {
      return [];
    }
  };

  const userModules = getUserModules();
  const isAdminLike = user?.role === 'admin' || user?.role === 'superadmin';

  // Check if current user can see a given navigation item
  // - Admin/Superadmin: see everything
  // - Non-admin: must have the item's moduleId (or 'all') if provided
  const canSeeItem = (item) => {
    if (!user) return false;
    if (isAdminLike) return true;

    if (!item.moduleId) {
      // Items without moduleId are admin-only
      return false;
    }

    return userModules.includes('all') || userModules.includes(item.moduleId);
  };

  // Admin navigation items organized by category (matching Python website structure)
  const navigationItems = [
    { 
      category: 'Dashboard',
      items: [
        { path: '/admin', label: 'Dashboard', icon: 'fa-tachometer-alt' }
      ]
    },
    {
      category: 'Student Management',
      items: [
        { path: '/admin/students/registration', label: 'Registration', icon: 'fa-user-plus', moduleId: 'student_registration' },
        { path: '/students/list', label: 'Student List', icon: 'fa-list', moduleId: 'student_registration' },
        { path: '/admin/students/photos', label: 'Photos', icon: 'fa-camera', moduleId: 'student_photo' },
        { path: '/admin/students/parishes', label: 'Parishes', icon: 'fa-place-of-worship', moduleId: 'student_parishes' }
      ]
    },
    {
      category: 'Academic Management',
      items: [
        { path: '/admin/subjects', label: 'Subjects', icon: 'fa-book' },
        { path: '/admin/score-entry', label: 'Score Entry', icon: 'fa-graduation-cap', moduleId: 'individual_scores' },
        { path: '/admin/dta-monitor', label: 'DTA Monitor', icon: 'fa-history', moduleId: 'dta_monitor' },
        { path: '/admin/teachers', label: 'Teachers', icon: 'fa-chalkboard-teacher' },
        { path: '/admin/grades', label: 'Grades', icon: 'fa-award' },
        { path: '/admin/marks-config', label: 'Marks Config', icon: 'fa-calendar-alt' }
      ]
    },
    {
      category: 'Comments & Assessment',
      items: [
        { path: '/admin/sala', label: 'Sala', icon: 'fa-comments', moduleId: 'sala_comments' },
        { path: '/admin/huduma', label: 'Huduma', icon: 'fa-hands-helping', moduleId: 'huduma_comments' },
        { path: '/admin/tabia', label: 'Tabia', icon: 'fa-user-check', moduleId: 'tabia_comments' },
        { path: '/admin/michezo', label: 'Michezo', icon: 'fa-running', moduleId: 'michezo_comments' },
        { path: '/admin/taaluma', label: 'Taaluma', icon: 'fa-book-open', moduleId: 'taaluma_comments' },
        { path: '/admin/mwalimu-comments', label: 'Mwalimu Comments', icon: 'fa-user-graduate', moduleId: 'mwalimu_taaluma_comments' },
        { path: '/admin/mkuu-comments', label: 'Mkuu Comments', icon: 'fa-crown', moduleId: 'mkuu_shule_comments' },
        { path: '/admin/tabia-mwenendo', label: 'Tabia & Mwenendo', icon: 'fa-balance-scale', moduleId: 'tabia_mwenendo_comments' }
      ]
    },
    {
      category: 'Results & Reports',
      items: [
        { path: '/admin/results/monthly', label: 'Results', icon: 'fa-clipboard-list', moduleId: 'monthly_results' },
        { path: '/reports/individual', label: 'Student Report', icon: 'fa-file-alt', moduleId: 'individual_report' },
        { path: '/reports/bulk', label: 'Bulk Report', icon: 'fa-copy', moduleId: 'bulk_report' }
      ]
    },
    {
      category: 'Announcements & Communication',
      items: [
        { path: '/admin/news', label: 'News', icon: 'fa-newspaper' },
        { path: '/admin/fees', label: 'Fees', icon: 'fa-money-bill-wave', moduleId: 'fees_announcements' },
        { path: '/admin/debts', label: 'Debts', icon: 'fa-money-bill-wave', moduleId: 'individual_debt' }
      ]
    },
    {
      category: 'Analytics',
      items: [
        { path: '/admin/analytics', label: 'Analytics', icon: 'fa-chart-line', moduleId: 'analytics' }
      ]
    },
    {
      category: 'School Branding',
      items: [
        { path: '/admin/branding/logo', label: 'Logo', icon: 'fa-image' },
        { path: '/admin/branding/stamp', label: 'Stamp', icon: 'fa-stamp' },
        { path: '/admin/branding/authority', label: 'Authority', icon: 'fa-shield-alt' }
      ]
    },
    {
      category: 'Administration',
      items: [
        { path: '/admin/administrators', label: 'Admin', icon: 'fa-user-shield' },
        { path: '/admin/users', label: 'Users', icon: 'fa-users-cog' },
        { path: '/admin/promotion', label: 'Promotion', icon: 'fa-graduation-cap' },
        { path: '/admin/pre-form-one', label: 'Pre-Form One', icon: 'fa-child' }
      ]
    },
    {
      category: 'AI Matters',
      items: [
        { path: '/admin/ai-matters', label: 'AI Matters', icon: 'fa-robot' }
      ]
    },
    {
      category: 'Public Website',
      items: [
        { path: '/admin/public-pages', label: 'Public Pages', icon: 'fa-globe' },
        { path: '/admin/necta-urls', label: 'NECTA URLs', icon: 'fa-link' },
        { path: '/admin/school-branding', label: 'School Branding', icon: 'fa-palette' },
        { path: '/admin/announcements', label: 'Announcements', icon: 'fa-bullhorn' },
        { path: '/admin/gallery', label: 'Gallery', icon: 'fa-images' },
        { path: '/admin/admission-applications', label: 'Admissions Apps', icon: 'fa-file-signature' },
        { path: '/admin/staff-profiles', label: 'Staff Profiles', icon: 'fa-id-badge' },
        { path: '/admin/pass-ids', label: 'Pass ID', icon: 'fa-key' },
        { path: '/admin/faqs', label: 'FAQs', icon: 'fa-question-circle' },
        { path: '/admin/department-contacts', label: 'Department Contacts', icon: 'fa-address-book' }
      ]
    }
  ];

  // Filter navigation items based on permissions
  const filteredNavigationItems = navigationItems
    .map(category => {
      const visibleItems = category.items.filter(canSeeItem);
      return { ...category, items: visibleItems };
    })
    .filter(category => category.items.length > 0);


  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Close menu when clicking outside
  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        className="admin-mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle admin menu"
        aria-expanded={mobileMenuOpen}
      >
        <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        <span className="menu-toggle-text">{mobileMenuOpen ? 'Close' : 'Menu'}</span>
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="admin-mobile-menu-overlay" 
          onClick={handleOverlayClick}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="fas fa-shield-alt"></i>
            {!sidebarCollapsed && <span>Admin Panel</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            <i className={`fas ${sidebarCollapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* Desktop Navigation - Grouped by Category */}
          <div className="sidebar-nav-desktop">
            {filteredNavigationItems.map((category, catIndex) => {
              const isExpanded = expandedCategories.includes(catIndex);
              return (
                <div key={catIndex} className={`nav-category ${isExpanded ? 'expanded' : ''}`}>
                  {!sidebarCollapsed && (
                    <button
                      className="category-header"
                      onClick={() => toggleCategory(catIndex)}
                      aria-expanded={isExpanded}
                    >
                      <span className="category-title-text">{category.category}</span>
                      <i className={`fas fa-chevron-right category-chevron ${isExpanded ? 'rotated' : ''}`}></i>
                    </button>
                  )}
                  {sidebarCollapsed && (
                    <div className="category-title">{category.category}</div>
                  )}
                  <ul className={`nav-items category-items ${isExpanded ? 'open' : ''}`}>
                  {category.items.map((item) => (
                    <li key={item.path}>
                      <Link 
                        to={item.path} 
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        title={item.label}
                      >
                        <i className={`fas ${item.icon}`}></i>
                        {!sidebarCollapsed && <span className="nav-item-text">{item.label}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
            })}
          </div>

          {/* Mobile Navigation - Accordion Categories */}
          <div className="sidebar-nav-mobile">
            {filteredNavigationItems.map((category, catIndex) => {
              const isExpanded = expandedCategories.includes(catIndex);
              return (
                <div key={catIndex} className={`mobile-nav-category ${isExpanded ? 'expanded' : ''}`}>
                  <button
                    className="mobile-category-header"
                    onClick={() => toggleCategory(catIndex)}
                    aria-expanded={isExpanded}
                  >
                    <span className="category-title-text">{category.category}</span>
                    <i className={`fas fa-chevron-right category-chevron ${isExpanded ? 'rotated' : ''}`}></i>
                  </button>
                  <ul className={`mobile-nav-items mobile-category-items ${isExpanded ? 'open' : ''}`}>
                    {category.items.map((item) => (
                      <li key={item.path}>
                        <Link 
                          to={item.path} 
                          className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className={`fas ${item.icon}`}></i>
                          <span className="nav-item-text">{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="sidebar-footer">
          <div className="user-info">
            {!sidebarCollapsed && (
              <>
                <div className="user-name">{user?.full_name || user?.username || 'Admin'}</div>
                <div className="user-role">{user?.role || 'Administrator'}</div>
              </>
            )}
          </div>
          <button 
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <i className="fas fa-sign-out-alt"></i>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

