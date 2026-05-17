/**
 * Centralized Logging Utility
 * Handles all debug, info, warn, and error logs throughout the application
 * 
 * Quick Debug Commands (available in browser console):
 * - window.logHelper.printRecentErrors() - Print recent errors
 * - window.logHelper.printErrorSummary() - Print error summary
 * - window.logHelper.getRecentErrors(10) - Get recent errors array
 * - window.logHelper.searchLogs('keyword') - Search logs by keyword
 * - console.getErrors() - Shortcut to print recent errors
 * - console.getErrorSummary() - Shortcut to print error summary
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Get log level from environment or default to DEBUG in development
const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  // Default: DEBUG in development, WARN in production
  return import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
};

const currentLogLevel = LOG_LEVELS.NONE; // Disable all logging output

// Store logs in memory (can be configured to send to backend)
let logStore = [];
const MAX_LOG_STORE_SIZE = 1000; // Maximum number of logs to keep in memory

// Log entry structure
const createLogEntry = (level, message, data = null, error = null) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : null,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
};

// Add log to store
const addToStore = (entry) => {
  logStore.push(entry);
  
  // Keep only the last MAX_LOG_STORE_SIZE logs
  if (logStore.length > MAX_LOG_STORE_SIZE) {
    logStore = logStore.slice(-MAX_LOG_STORE_SIZE);
  }
  
  // Optionally send to backend in production
  if (import.meta.env.PROD && entry.level === 'ERROR') {
    // Send critical errors to backend
    sendToBackend(entry).catch(err => {
      console.error('Failed to send log to backend:', err);
    });
  }
};

// Send log to backend
const sendToBackend = async (entry) => {
  try {
    // Use relative URL to work with proxy
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(entry),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send log: ${response.statusText}`);
    }
  } catch (error) {
    // Silently fail - don't break the app if logging fails
  }
};

// Format log message for console (always returns the prefix string)
const formatConsoleMessage = (level, message) => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}] [${level}]`;
  return `${prefix} ${message}`;
};

// Logger class
class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  debug(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const entry = createLogEntry('DEBUG', `[${this.context}] ${message}`, data);
      addToStore(entry);
      const msg = formatConsoleMessage('DEBUG', `[${this.context}] ${message}`);
      data != null ? console.debug(msg, data) : console.debug(msg);
    }
  }

  info(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const entry = createLogEntry('INFO', `[${this.context}] ${message}`, data);
      addToStore(entry);
      const msg = formatConsoleMessage('INFO', `[${this.context}] ${message}`);
      data != null ? console.info(msg, data) : console.info(msg);
    }
  }

  warn(message, data = null) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const entry = createLogEntry('WARN', `[${this.context}] ${message}`, data);
      addToStore(entry);
      const msg = formatConsoleMessage('WARN', `[${this.context}] ${message}`);
      data != null ? console.warn(msg, data) : console.warn(msg);
    }
  }

  error(message, error = null, data = null) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const entry = createLogEntry('ERROR', `[${this.context}] ${message}`, data, error);
      addToStore(entry);
      const msg = formatConsoleMessage('ERROR', `[${this.context}] ${message}`);
      if (error && data != null) {
        console.error(msg, error, data);
      } else if (error) {
        console.error(msg, error);
      } else if (data != null) {
        console.error(msg, data);
      } else {
        console.error(msg);
      }
    }
  }

  // Log API errors
  apiError(url, method, error, response = null) {
    const errorData = {
      url,
      method,
      status: response?.status,
      statusText: response?.statusText,
      responseData: response?.data,
    };
    
    this.error(`API Error: ${method} ${url}`, error, errorData);
  }

  // Log user actions
  userAction(action, details = null) {
    this.debug(`User Action: ${action}`, details);
  }

  // Log navigation
  navigation(from, to) {
    this.debug(`Navigation: ${from} → ${to}`);
  }
}

// Create default logger instance
const logger = new Logger('App');

// Export functions and class
export default logger;
export { Logger, LOG_LEVELS };

// Export utility functions
export const getLogs = (level = null, limit = null) => {
  let logs = [...logStore];
  
  if (level) {
    logs = logs.filter(log => log.level === level.toUpperCase());
  }
  
  if (limit) {
    logs = logs.slice(-limit);
  }
  
  return logs.reverse(); // Most recent first
};

export const clearLogs = () => {
  logStore = [];
};

export const exportLogs = () => {
  const logs = getLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `app-logs-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Unhandled Error', event.error, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Unhandled promise rejection handler
// Note: This handler logs errors but doesn't prevent default - main.jsx handler will prevent default
// This allows main.jsx to suppress known benign cases (401s, extension errors, etc.)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reqInfo = reason?.reqInfo;
  const url = reason?.config?.url || reason?.message || '';
  
  // Suppress known benign cases (same as main.jsx to avoid duplicate logging)
  if (
    url.includes('ERR_BLOCKED_BY_CLIENT') ||
    reason?.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
    reqInfo?.pathPrefix === '/writing' ||
    reqInfo?.path?.includes('/writing') ||
    (reason?.code === 403 && reason?.data?.code === 403 && reason?.data?.error === 'exceptions.UserAuthError') ||
    (reason?.code === 403 && (reason?.httpStatus === 200 || reason?.httpError === false)) ||
    reason?.code === 403 ||
    String(reason?.code) === '403' ||
    reason?.response?.status === 401
  ) {
    return;
  }
  
  // Only log unexpected errors
  logger.error('Unhandled Promise Rejection', event.reason, {
    promise: event.promise,
  });
});

