/**
 * Stream Normalization Utility
 * Converts "NA" stream values to "A" for consistency
 */

/**
 * Normalize stream value: NA -> A
 * @param {string} stream - Stream value to normalize
 * @returns {string} Normalized stream value
 */
function normalizeStream(stream) {
  if (!stream || typeof stream !== 'string') {
    return stream;
  }
  
  const trimmed = stream.trim().toUpperCase();
  if (trimmed === 'NA') {
    return 'A';
  }
  if (trimmed === 'ALL') {
    return 'ALL';
  }
  
  return stream.trim();
}

/**
 * Normalize stream in query parameters
 * @param {object} params - Query parameters object
 * @param {string[]} streamKeys - Keys that contain stream values (default: ['stream'])
 * @returns {object} Normalized parameters
 */
function normalizeStreamInParams(params, streamKeys = ['stream']) {
  if (!params || typeof params !== 'object') {
    return params;
  }
  
  const normalized = { ...params };
  
  for (const key of streamKeys) {
    if (normalized[key] !== undefined && normalized[key] !== null) {
      normalized[key] = normalizeStream(normalized[key]);
    }
  }
  
  // Also handle stream variations
  const streamVariations = ['from_stream', 'to_stream', 'current_stream', 'previous_stream'];
  for (const key of streamVariations) {
    if (normalized[key] !== undefined && normalized[key] !== null) {
      normalized[key] = normalizeStream(normalized[key]);
    }
  }
  
  return normalized;
}

/**
 * Normalize stream in WHERE clause
 * Handles both direct stream = 'NA' and stream IN ('NA', ...) cases
 * @param {string} streamValue - Stream value from query
 * @returns {string|string[]} Normalized stream value(s)
 */
function normalizeStreamForQuery(streamValue) {
  if (Array.isArray(streamValue)) {
    return streamValue.map(normalizeStream);
  }
  
  return normalizeStream(streamValue);
}

module.exports = {
  normalizeStream,
  normalizeStreamInParams,
  normalizeStreamForQuery
};
