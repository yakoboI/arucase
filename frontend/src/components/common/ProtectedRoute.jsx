import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null, requiredModule = null, requiredAdmin = false }) => {
  const auth = useAuth();
  const { isAuthenticated, hasRole, hasPermission, hasModule, isAdminLike, loading, verifyToken } = auth;
  const [isVerifying, setIsVerifying] = useState(false);
  const location = useLocation();


  // Verify token on mount if we have a token but no user state
  useEffect(() => {
    const token = localStorage.getItem('token');
    const hasUser = isAuthenticated();
    
    console.log('🔍 PROTECTED ROUTE DEBUG: Token verification check', {
      hasToken: !!token,
      hasUser,
      loading,
      isVerifying,
      currentPath: location.pathname
    });
    
    // If we have a token but no user state, verify it
    if (token && !hasUser && !loading && !isVerifying) {
      console.log('🔍 PROTECTED ROUTE DEBUG: Starting token verification');
      setIsVerifying(true);
      verifyToken().finally(() => {
        setIsVerifying(false);
        console.log('🔍 PROTECTED ROUTE DEBUG: Token verification completed');
      });
    }
  }, [loading, isAuthenticated, verifyToken, isVerifying, location.pathname]);

  if (loading || isVerifying) {
    return <Loading />;
  }

  if (!isAuthenticated()) {
    console.log('🔍 PROTECTED ROUTE DEBUG: Not authenticated, redirecting to login');
    console.log('🔍 PROTECTED ROUTE DEBUG: Current path:', location.pathname);
    console.log('🔍 PROTECTED ROUTE DEBUG: Has token:', !!localStorage.getItem('token'));
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  // Non-admin without the required module (e.g. registration) cannot access
  if (requiredModule && !isAdminLike() && !hasModule(requiredModule)) {
    // Redirect to admin dashboard instead of specific score entry
    return <Navigate to="/admin" replace />;
  }

  // Admin-only routes (e.g. subjects management)
  if (requiredAdmin && !isAdminLike()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  requiredPermission: PropTypes.string,
  requiredModule: PropTypes.string,
  requiredAdmin: PropTypes.bool,
};

export default ProtectedRoute;

