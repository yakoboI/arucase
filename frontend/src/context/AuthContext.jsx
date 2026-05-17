import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Howl } from 'howler';

/** Staff app areas that may use httpOnly cookies without a localStorage JWT. */
function shouldRestoreStaffSession(pathname) {
  if (pathname === '/login' || pathname === '/student-login') return false;
  if (localStorage.getItem('token')) return true;
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/students/') ||
    pathname.startsWith('/reports/')
  );
}

const AuthContext = createContext(null);

/** Normalize API error bodies (string, { message }, validation arrays) for login UI. */
function pickAuthErrorMessage(data, fallback = 'Invalid response from server.') {
  if (data == null || data === '') return fallback;
  if (typeof data === 'string') {
    const t = data.trim();
    return t || fallback;
  }
  const direct = data.message ?? data.error ?? data.msg;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const first = Array.isArray(data.errors) ? data.errors[0] : null;
  if (first && typeof first.msg === 'string' && first.msg.trim()) return first.msg.trim();
  return fallback;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Play logout sound directly using Howl
  const playLogoutSound = () => {
    const isMuted = localStorage.getItem('uiSoundsMuted') === 'true';
    if (isMuted) return;

    const logoutSound = new Howl({
      src: ['/sounds/logout.mp3'],
      volume: 0.3,
    });
    logoutSound.play();
  };

  useEffect(() => {
    // Listen for logout events from API interceptor
    const handleLogout = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:logout', handleLogout);

    const pathname = window.location.pathname;
    const isAuthScreen = pathname === '/login' || pathname === '/student-login';

    // Avoid noisy /auth/me checks on login screens (especially double-run in StrictMode).
    if (isAuthScreen) {
      setLoading(false);
      return () => window.removeEventListener('auth:logout', handleLogout);
    }

    let cancelled = false;

    if (!shouldRestoreStaffSession(pathname)) {
      setLoading(false);
      return () => window.removeEventListener('auth:logout', handleLogout);
    }

    window.__verifyingToken = true;
    api
      .get('/auth/me')
      .then((response) => {
        if (cancelled) return;
        if (response?.status === 401 || response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          return;
        }
        const u = response?.data?.user;
        setUser(u ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => {
        window.__verifyingToken = false;
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const verifyToken = async () => {
    try {
      // Add a flag to prevent interceptor from logging out during verification
      window.__verifyingToken = true;
      const response = await api.get('/auth/me');
      window.__verifyingToken = false;
      
      // Handle 401 responses that are now resolved by the interceptor
      if (response.status === 401 || response.status === 403) {
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        return false;
      }

      setUser(response.data?.user ?? null);
      return true;
    } catch (error) {
      // Network errors or other unexpected errors
      window.__verifyingToken = false;
      console.error('Token verification failed:', error);
      
      // Clear invalid token on any verification error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      return false;
    }
  };

  const login = async (username, password) => {
    try {
      // Try enhanced login first (with refresh tokens)
      const response = await api.post('/auth/login-enhanced', { username, password });
      const status = response?.status ?? 0;
      const data = response?.data;

      // Interceptor may resolve 401/403 as a response object instead of throwing
      if (status === 401 || status === 403) {
        return {
          success: false,
          error: pickAuthErrorMessage(data, status === 403 ? 'Access denied.' : 'Invalid credentials.'),
        };
      }

      // Handle 2xx responses that indicate failure (e.g. code 403 in body)
      if (data && (data.code === 403 || data.success === false)) {
        const msg = pickAuthErrorMessage(data, 'Access denied.');
        return { success: false, error: msg };
      }

      const user = data?.user;
      if (!user) {
        return { success: false, error: pickAuthErrorMessage(data) };
      }
      
      setUser(user);
      return { success: true };
    } catch (error) {
      // If enhanced login fails, fall back to regular login
      if (error?.response?.status === 404) {
        try {
          const fallbackResponse = await api.post('/auth/login', { username, password });
          const fbStatus = fallbackResponse?.status ?? 0;
          const fallbackData = fallbackResponse?.data;

          if (fbStatus === 401 || fbStatus === 403) {
            return {
              success: false,
              error: pickAuthErrorMessage(fallbackData, fbStatus === 403 ? 'Access denied.' : 'Invalid credentials.'),
            };
          }

          if (fallbackData && (fallbackData.code === 403 || fallbackData.success === false)) {
            return { success: false, error: pickAuthErrorMessage(fallbackData, 'Access denied.') };
          }

          const user = fallbackData?.user;
          const token = fallbackData?.token;
          if (!user) {
            return { success: false, error: pickAuthErrorMessage(fallbackData) };
          }
          
          // Store token in localStorage for fallback
          if (token) {
            localStorage.setItem('token', token);
          }
          
          setUser(user);
          return { success: true };
        } catch (fallbackError) {
          const body = fallbackError?.response?.data;
          const msg = pickAuthErrorMessage(body, '') || fallbackError?.message;
          return {
            success: false,
            error: msg && String(msg).trim() ? String(msg).trim() : 'Login failed. Please try again.',
          };
        }
      }

      const body = error?.response?.data;
      const msg = pickAuthErrorMessage(body, '') || error?.message;
      return {
        success: false,
        error: msg && String(msg).trim() ? String(msg).trim() : 'Login failed. Please try again.',
      };
    }
  };

  const logout = async () => {
    playLogoutSound();
    try {
      // Try enhanced logout first (clears refresh tokens from database)
      await api.post('/auth/logout-enhanced');
    } catch (error) {
      // If enhanced logout fails, try regular logout
      try {
        await api.post('/auth/logout');
      } catch (fallbackError) {
        // Even if logout API fails, continue with client-side logout
        console.error('Logout API error:', fallbackError);
      }
    }
    // Clear token from localStorage (for fallback auth)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  // Stable reference so SocketProvider (and others) don't re-run effects every AuthProvider render
  const isAuthenticated = useCallback(() => {
    return !!user;
  }, [user]);

  const hasRole = (role) => {
    if (!user?.role) return false;
    if (Array.isArray(role)) return role.some((r) => user.role === r);
    return user.role === role;
  };

  const hasPermission = (permission) => {
    if (!user?.permissions) return false;
    try {
      const permissions = typeof user.permissions === 'string'
        ? JSON.parse(user.permissions)
        : user.permissions;
      return permissions[permission] === true;
    } catch {
      return false;
    }
  };

  const isAdminLike = () => {
    const role = user?.role?.toLowerCase?.() ?? user?.role;
    return role === 'admin' || role === 'superadmin';
  };

  const getParsedPermissions = () => {
    if (!user?.permissions) return {};
    try {
      return typeof user.permissions === 'string'
        ? JSON.parse(user.permissions)
        : user.permissions;
    } catch {
      return {};
    }
  };

  /** For non-admin: returns allowed years for a class, or null = all years, or [] = no access */
  const getAllowedYearsForClass = (className) => {
    if (isAdminLike()) return null;
    const perms = getParsedPermissions();
    const hasAccess = (perms.class_subjects && Object.keys(perms.class_subjects).includes(className)) ||
      (perms.classes || []).includes(className);
    if (!hasAccess) return [];
    const cp = perms.class_permissions || {};
    const years = cp[className]?.years;
    if (Array.isArray(years) && years.length > 0) return years.map((y) => Number(y));
    return null;
  };

  /** For non-admin: returns allowed subject names (union of all classes), or null = all subjects */
  const getAllowedSubjects = () => {
    if (isAdminLike()) return null;
    const perms = getParsedPermissions();
    if (perms.class_subjects && typeof perms.class_subjects === 'object') {
      const union = new Set();
      Object.values(perms.class_subjects).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach((s) => union.add(s));
      });
      return union.size ? Array.from(union) : [];
    }
    return perms.subjects || [];
  };

  /** For non-admin: returns allowed subject names for a specific class, or null = all subjects for that class */
  const getAllowedSubjectsForClass = (className) => {
    if (isAdminLike()) return null;
    const perms = getParsedPermissions();
    if (perms.class_subjects && perms.class_subjects[className]) {
      const list = perms.class_subjects[className];
      return Array.isArray(list) ? list : [];
    }
    if ((perms.classes || []).includes(className)) return perms.subjects || [];
    return [];
  };

  /** For non-admin: returns allowed score-entry month names, or null = all months allowed */
  const getAllowedScoreEntryMonths = () => {
    if (isAdminLike()) return null;
    const perms = getParsedPermissions();
    const months = perms.score_entry_months;
    if (!Array.isArray(months) || months.length === 0) return null;
    return months;
  };

  /** True if user has access to this class (admin always true) */
  const hasClass = (className) => {
    if (isAdminLike()) return true;
    const perms = getParsedPermissions();
    if (perms.class_subjects && Object.keys(perms.class_subjects).includes(className)) return true;
    if ((perms.classes || []).includes(className)) return true;
    
    // For FORM V/VI, also check if user has any subject permissions for streams of that form
    // This enables together mode access for users with subject permissions
    if (className === 'FORM V' || className === 'FORM VI') {
      const streams = ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM'];
      for (const stream of streams) {
        const streamClass = `${className} ${stream}`;
        if (perms.class_subjects && perms.class_subjects[streamClass]) {
          const subjects = perms.class_subjects[streamClass];
          if (Array.isArray(subjects) && subjects.length > 0) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  /** True if user has the given module (admin/superadmin always have all). Used for registration, etc. */
  const hasModule = (moduleId) => {
    if (isAdminLike()) return true;
    const perms = getParsedPermissions();
    const modules = perms.modules;
    if (!Array.isArray(modules)) return false;
    return modules.includes('all') || modules.includes(moduleId);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    verifyToken,
    isAuthenticated,
    hasRole,
    hasPermission,
    isAdminLike,
    getParsedPermissions,
    getAllowedYearsForClass,
    getAllowedSubjects,
    getAllowedSubjectsForClass,
    getAllowedScoreEntryMonths,
    hasClass,
    hasModule,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

