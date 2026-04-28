import { toast as toastify } from 'react-toastify';
import { useSound } from './useSound';

// Store the playSuccess function globally
let playSuccessFn = null;

// Initialize the sound hook
export const initToastSound = (playSuccess) => {
  playSuccessFn = playSuccess;
};

// Custom toast functions that play sounds
export const toast = {
  success: (message, options = {}) => {
    if (playSuccessFn) {
      try {
        playSuccessFn();
      } catch (soundError) {
        // Ignore sound errors - don't block toast
        console.warn('Toast sound failed:', soundError);
      }
    }
    return toastify.success(message, options);
  },
  error: (message, options = {}) => {
    return toastify.error(message, options);
  },
  info: (message, options = {}) => {
    return toastify.info(message, options);
  },
  warning: (message, options = {}) => {
    return toastify.warning(message, options);
  },
};

// Export the original toastify for backward compatibility
export { toastify };
