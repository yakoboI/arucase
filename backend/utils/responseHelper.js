/**
 * Response Helper Utility
 * Standardizes API responses with consistent structure
 */

const sendSuccess = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  res.status(statusCode).json(response);
  return response;
};

const sendError = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message,
    error: error?.message || error?.toString() || 'Unknown error',
    timestamp: new Date().toISOString()
  };
  
  res.status(statusCode).json(response);
  return response;
};

module.exports = {
  sendSuccess,
  sendError
};
