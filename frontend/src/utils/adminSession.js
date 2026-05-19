import { toast } from './toast';

/** Redirect staff to login after expired/invalid session on admin API calls. */
export function handleAdminSessionError(error, fallbackMessage = 'Request failed') {
  if (error?.response?.status === 401) {
    toast.error('Your session has expired. Please log in again.');
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }, 1500);
    return true;
  }
  toast.error(error?.response?.data?.message || fallbackMessage);
  return false;
}
