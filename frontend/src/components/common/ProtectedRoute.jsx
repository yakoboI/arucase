import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({
  children,
  requiredRole = null,
  requiredPermission = null,
  requiredModule = null,
  requiredAnyOfModules = null,
  requiredAdmin = false,
}) => {
  const auth = useAuth();
  const { isAuthenticated, hasRole, hasPermission, hasModule, isAdminLike, loading, verifyToken } = auth;
  const [isVerifying, setIsVerifying] = useState(false);
  const location = useLocation();


  // Verify token on mount if we have a token but no user state
  useEffect(() => {
    const token = localStorage.getItem('token');
    const hasUser = isAuthenticated();
    
    // Token verification check
    if (token && !hasUser && !loading && !isVerifying) {
      setIsVerifying(true);
      verifyToken()
        .catch((error) => {
          // Token verification failed
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [loading, isAuthenticated, verifyToken, isVerifying, location.pathname]);

  if (loading || isVerifying) {
    return <Loading />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  // Non-admin must have at least one of these modules (e.g. registration landing)
  if (Array.isArray(requiredAnyOfModules) && requiredAnyOfModules.length > 0 && !isAdminLike()) {
    const allowed = requiredAnyOfModules.some((id) => hasModule(id));
    if (!allowed) {
      return <Navigate to="/admin" replace />;
    }
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
  requiredAnyOfModules: PropTypes.arrayOf(PropTypes.string),
  requiredAdmin: PropTypes.bool,
};

export default ProtectedRoute;

