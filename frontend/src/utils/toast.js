import { toast as toastify } from 'react-toastify';
import { ensureToastStyles } from './ensureToastStyles';

// Store the playSuccess function globally
let playSuccessFn = null;

// Initialize the sound hook
export const initToastSound = (playSuccess) => {
  playSuccessFn = playSuccess;
};

function withToastStyles(fn) {
  return (...args) => {
    ensureToastStyles().catch(() => {});
    return fn(...args);
  };
}

// Custom toast functions that play sounds
export const toast = {
  success: withToastStyles((message, options = {}) => {
    if (playSuccessFn) {
      try {
        playSuccessFn();
      } catch (soundError) {
        // Ignore sound errors - don't block toast
        console.warn('Toast sound failed:', soundError);
      }
    }
    return toastify.success(message, options);
  }),
  error: withToastStyles((message, options = {}) => toastify.error(message, options)),
  info: withToastStyles((message, options = {}) => toastify.info(message, options)),
  warning: withToastStyles((message, options = {}) => toastify.warning(message, options)),
};

// Export the original toastify for backward compatibility
export { toastify };
