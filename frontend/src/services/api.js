import axios from 'axios';

// Use Vite proxy in development to avoid CORS issues
// In production, use the full API URL from env
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    // Use relative URL to leverage Vite proxy
    return 'http://localhost:3001/api';
  }
  return import.meta.env.VITE_API_URL || 'https://arucase-production.up.railway.app/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds - increased for better reliability
  withCredentials: true, // Required for cross-origin cookie support
});

// Paths that must not receive the staff/admin JWT (public site + alternate portals set their own auth)
function isPublicApiRequest(config) {
  const url = (config.url || '').split('?')[0];
  return url.startsWith('/public/');
}

function isAuthEndpoint(config) {
  const url = (config?.url || '').split('?')[0];
  return url.startsWith('/auth/login') || url.startsWith('/auth/me');
}

function isProtectedApiRequest(config) {
  const url = (config?.url || '').split('?')[0];
  return (
    url.startsWith('/admin/') ||
    url.startsWith('/students/') ||
    url.startsWith('/reports/') ||
    url.startsWith('/analytics/') ||
    url.startsWith('/pre-form-one/')
  );
}

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Debug logging for token usage
    if (isProtectedApiRequest(config)) {
      // Debug logging disabled
    }
    
    // For enhanced login (httpOnly cookies), we don't need localStorage token
    // The browser automatically sends cookies with requests
    // For fallback login (localStorage tokens), we need to set Authorization header
    const usingEnhancedAuth = !token; // If no localStorage token, assume using enhanced auth
    
    // Only set Authorization header if we have a localStorage token
    // Enhanced auth uses httpOnly cookies which are sent automatically
    if (token && !config.headers?.Authorization && !isPublicApiRequest(config)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // For FormData, remove Content-Type to let browser/Axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle blob error responses (when responseType is 'blob' but server returns JSON error)
    if (error.config?.responseType === 'blob' && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          // If not JSON, create a generic error message
          errorData = { message: 'An error occurred while processing the request' };
        }
        // Replace the blob with parsed error data for easier handling
        error.response.data = errorData;
      } catch (parseError) {
        // If we can't parse, leave it as is
        console.error('Error parsing blob error response:', parseError);
      }
    }

    // For auth endpoints, don't reject on 401/403 - let the component handle it
    // This prevents console errors for expected auth failures during token verification
    if (isAuthEndpoint(error.config || {})) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Return the error response instead of rejecting
        return Promise.resolve(error.response);
      }
    }

    // Handle 401 errors with automatic token refresh
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Authentication required';
      const isTokenExpired = errorMessage.toLowerCase().includes('expired') ||
                            errorMessage.toLowerCase().includes('token expired');
      const requestIsPublic = isPublicApiRequest(error.config || {});
      const requestIsAuth = isAuthEndpoint(error.config || {});

      // Don't attempt refresh for public endpoints or auth endpoints
      if (!requestIsPublic && !requestIsAuth && !window.__verifyingToken) {
        const token = localStorage.getItem('token');
        const usingEnhancedAuth = !token; // If no localStorage token, assume using enhanced auth
        
        // If token expired and we haven't tried refreshing yet, attempt refresh
        // This works for both enhanced auth (cookies) and fallback auth (localStorage)
        if (isTokenExpired && !error.config._retry) {
          error.config._retry = true;
          
          try {
            // Attempt to refresh the token
            const refreshResponse = await api.post('/auth/refresh');
            
            if (refreshResponse.data.message === 'Token refreshed successfully') {
              // Get the new access token from cookies (server sets it automatically)
              // The refresh mechanism works via httpOnly cookies, so we don't need to manually update localStorage
              
              // Retry the original request with the new token
              return api.request(error.config);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            
            // Refresh failed, clear auth and redirect to login
            if (window.location.pathname !== '/login') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:logout'));
              }
            }
            
            // Set flags so components know about the error
            error.isTokenExpired = true;
            error.expirationMessage = 'Your session has expired. Please log in again.';
            
            return Promise.reject(error);
          }
        }
      }

      // Don't logout if we're verifying token (let AuthContext handle it)
      // or if we're already on the login page
      if (!window.__verifyingToken && window.location.pathname !== '/login' && !requestIsPublic && !requestIsAuth) {
        const token = localStorage.getItem('token');
        const usingEnhancedAuth = !token; // If no localStorage token, assume using enhanced auth

        // Set flags so components know about the error
        error.isTokenExpired = isTokenExpired || errorMessage.toLowerCase().includes('invalid token');
        error.expirationMessage = 'Your session has expired. Please log in again.';

        // For protected endpoints, a 401 means this session is unusable now.
        // Clear immediately to stop repeated unauthorized requests.
        if (token || error.isTokenExpired) {
          // Clear localStorage tokens (for fallback auth)
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Dispatch logout event for both auth types
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
        }
      }
    }

    // Handle rate limiting errors (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
      const message = error.response?.data?.message || 'Too many requests. Please wait a moment and try again.';
      error.rateLimitMessage = retryAfter
        ? `${message} Please wait ${retryAfter} seconds.`
        : message;
      error.isRateLimit = true;
    }

    // Never expose server internals for 5xx: show generic message to the user
    if (error.response?.status >= 500 && error.response?.data) {
      error.response.data = { ...error.response.data, message: 'Something went wrong. Please try again later.' };
    }

    if (!error.response) {
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

