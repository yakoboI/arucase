/**
 * Response Helper Utility
 * Standardizes API responses with consistent structure
 */

const sendSuccess = (res, statusCode, message, data = null) => {
  console.log(`🔍 DEBUG: Sending success response: ${message}`, data || {});
  
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
  console.log(`🔍 DEBUG: Sending error response: ${message}`, error || {});
  
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
