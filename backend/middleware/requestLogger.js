/**
 * Comprehensive Request Logger Middleware
 * Logs all API requests with full details for filtering
 */

const { query } = require('../config/database');
const { saveUserActivity } = require('../utils/activityLogger');

// Log to database (app_logs table) - Non-blocking, fire and forget
// DISABLED IN PRODUCTION to fix performance bottleneck
const logToDatabase = async (logData) => {
  // In production, skip database logging entirely for performance
  // Only log errors to console
  if (process.env.NODE_ENV === 'production') {
    const code = logData.statusCode;
    const isAuthChallenge = code === 401 || code === 403;
    // 401/403 are normal when staff tabs are open after logout or bots hit /api; don't spam ERROR.
    const isServerError = logData.level === 'ERROR' || (code != null && code >= 500);
    const isClientErrorWorthLogging =
      code != null && code >= 400 && code < 500 && !isAuthChallenge;
    if (isServerError) {
      console.error(
        `[PROD ERROR] ${logData.method} ${logData.endpoint} - ${logData.errorMessage || 'Server error'} - ${logData.responseTime}ms`
      );
    } else if (isClientErrorWorthLogging && logData.errorMessage) {
      console.warn(
        `[PROD WARN] ${logData.method} ${logData.endpoint} - ${logData.errorMessage} - ${logData.responseTime}ms`
      );
    }
    return;
  }

  // Don't await - make it non-blocking
  setImmediate(async () => {
    try {
      // Skip logging response body for PDF/blob responses (too large and not useful)
      const isBlobResponse = logData.contentType?.includes('application/pdf') ||
                            logData.contentType?.includes('application/octet-stream') ||
                            logData.contentType?.includes('blob') ||
                            Buffer.isBuffer(logData.responseBody);

      // Limit response body size (max 10KB) to prevent slow inserts
      let responseBodyToLog = null;
      if (!isBlobResponse && logData.responseBody) {
        try {
          const bodyStr = typeof logData.responseBody === 'string'
            ? logData.responseBody
            : JSON.stringify(logData.responseBody);
          // Limit to 10KB
          if (bodyStr.length > 10000) {
            responseBodyToLog = bodyStr.substring(0, 10000) + '... [truncated]';
          } else {
            responseBodyToLog = bodyStr;
          }
        } catch (e) {
          responseBodyToLog = '[Unable to serialize response body]';
        }
      } else if (isBlobResponse) {
        responseBodyToLog = `[${logData.contentType || 'binary'} response - ${logData.responseSize || 'unknown size'}]`;
      }

      // Limit request body size as well
      let requestBodyToLog = null;
      if (logData.requestBody) {
        try {
          const bodyStr = typeof logData.requestBody === 'string'
            ? logData.requestBody
            : JSON.stringify(logData.requestBody);
          if (bodyStr.length > 5000) {
            requestBodyToLog = bodyStr.substring(0, 5000) + '... [truncated]';
          } else {
            requestBodyToLog = bodyStr;
          }
        } catch (e) {
          requestBodyToLog = '[Unable to serialize request body]';
        }
      }

      await query(
        `INSERT INTO app_logs (
          username, level, method, endpoint, url,
          ip_address, user_agent, status_code,
          response_time_ms, request_body, response_body,
          error_message, activity_type, filters_applied,
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          logData.username || 'anonymous',
          logData.level || 'INFO',
          logData.method,
          logData.endpoint,
          logData.url,
          logData.ip,
          logData.userAgent,
          logData.statusCode || null,
          logData.responseTime || null,
          requestBodyToLog,
          responseBodyToLog,
          logData.errorMessage || null,
          logData.activityType || 'api_request',
          logData.filtersApplied ? JSON.stringify(logData.filtersApplied) : null
        ]
      );
    } catch (error) {
      // Silently fail - logging shouldn't break the main flow
      // Only log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error logging to database:', error.message);
      }
    }
  });
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Capture request details
  const requestData = {
    method: req.method,
    endpoint: req.path,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    username: req.user?.username || 'anonymous',
    queryParams: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? '***' : null, // Hide token
    }
  };

  // Capture response
  let responseBody = null;
  let contentType = null;
  let responseSize = null;
  
  res.send = function(data) {
    responseBody = data;
    contentType = res.getHeader('content-type') || res.get('content-type');
    
    // Calculate response size if possible
    if (Buffer.isBuffer(data)) {
      responseSize = data.length;
    } else if (typeof data === 'string') {
      responseSize = Buffer.byteLength(data, 'utf8');
    }
    
    return originalSend.call(this, data);
  };

  // Log after response - Non-blocking
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Skip detailed logging for PDF responses (too large and slow)
    const isPDFResponse = contentType?.includes('application/pdf');
    
    // Determine log level
    let level = 'INFO';
    if (statusCode >= 500) level = 'ERROR';
    else if (statusCode >= 400) level = 'WARN';
    else if (statusCode >= 300) level = 'INFO';
    
    // Determine activity type from endpoint
    let activityType = 'api_request';
    if (req.path.includes('/login')) activityType = 'login';
    else if (req.path.includes('/logout')) activityType = 'logout';
    else if (req.path.includes('/students')) activityType = 'student_operation';
    else if (req.path.includes('/admin')) activityType = 'admin_operation';
    else if (req.path.includes('/reports')) activityType = 'report_generation';
    else if (req.path.includes('/analytics')) activityType = 'analytics';
    
    // Extract filters from query params
    const filtersApplied = {
      level: req.query.level,
      stream: req.query.stream,
      year: req.query.year,
      search: req.query.search,
      limit: req.query.limit,
      page: req.query.page,
      ...Object.fromEntries(
        Object.entries(req.query).filter(([key]) => 
          !['level', 'stream', 'year', 'search', 'limit', 'page'].includes(key)
        )
      )
    };

    // Parse response body only if not PDF and small enough
    let parsedResponseBody = null;
    if (!isPDFResponse && responseBody) {
      try {
        if (typeof responseBody === 'string') {
          // Only parse if it looks like JSON and is small
          if (responseBody.length < 50000 && (responseBody.trim().startsWith('{') || responseBody.trim().startsWith('['))) {
            parsedResponseBody = JSON.parse(responseBody);
          } else {
            parsedResponseBody = responseBody.substring(0, 1000); // Truncate large strings
          }
        } else {
          parsedResponseBody = responseBody;
        }
      } catch (e) {
        // If parsing fails, use as-is but truncate
        parsedResponseBody = typeof responseBody === 'string' ? responseBody.substring(0, 1000) : '[Non-serializable response]';
      }
    }

    // Log to database (non-blocking, fire and forget)
    logToDatabase({
      username: requestData.username,
      level,
      method: requestData.method,
      endpoint: requestData.endpoint,
      url: requestData.url,
      ip: requestData.ip,
      userAgent: requestData.userAgent,
      statusCode,
      responseTime,
      requestBody: requestData.body,
      responseBody: parsedResponseBody,
      contentType: contentType,
      responseSize: responseSize,
      errorMessage: statusCode >= 400 ? (parsedResponseBody?.message || 'Request failed') : null,
      activityType,
      filtersApplied: Object.keys(filtersApplied).length > 0 ? filtersApplied : null
    });
  });

  next();
};

module.exports = requestLogger;

