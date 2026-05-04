import axios from 'axios';

// Use Vite proxy in development to avoid CORS issues
// In production, use the full API URL from env
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    // Use relative URL to leverage Vite proxy
    return 'http://localhost:5000/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds - increased for complex queries
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
    url.startsWith('/analytics/')
  );
}

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Short-circuit protected calls when session is already gone.
    // This avoids noisy browser 401 network errors during logout/session-expiry transitions.
    if (!token && isProtectedApiRequest(config) && !isAuthEndpoint(config)) {
      const authError = new Error('Authentication required');
      authError.config = config;
      authError.response = { status: 401, data: { message: 'Authentication required' } };
      authError.isAxiosError = true;
      return Promise.reject(authError);
    }
    // Only set Authorization if caller didn't set it (supports other auth flows)
    // Never attach staff token to /public/* — avoids confusing servers and keeps admissions/student flows clean
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

    // For auth endpoints (login), don't reject on 403 - let the component handle it
    if (isAuthEndpoint(error.config || {})) {
      if (error.response?.status === 403) {
        // Return the error response instead of rejecting
        return Promise.resolve(error.response);
      }
    }

    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Authentication required';
      const isTokenExpired = errorMessage.toLowerCase().includes('expired') ||
                            errorMessage.toLowerCase().includes('token expired');
      const requestIsPublic = isPublicApiRequest(error.config || {});
      const requestIsAuth = isAuthEndpoint(error.config || {});

      // Don't logout if we're verifying token (let AuthContext handle it)
      // or if we're already on the login page
      if (!window.__verifyingToken && window.location.pathname !== '/login' && !requestIsPublic && !requestIsAuth) {
        const token = localStorage.getItem('token');

        // Set flags so components know about the error
        error.isTokenExpired = isTokenExpired || errorMessage.toLowerCase().includes('invalid token');
        error.expirationMessage = 'Your session has expired. Please log in again.';

        // For protected endpoints, a 401 means this session is unusable now.
        // Clear immediately to stop repeated unauthorized requests.
        if (token || error.isTokenExpired) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
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

