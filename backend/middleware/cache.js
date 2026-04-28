/**
 * Caching Middleware
 * Uses node-cache for in-memory caching of frequently accessed data
 */
const NodeCache = require('node-cache');

// Create cache instance with default TTL of 5 minutes
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Don't clone data for performance
});

// Cache configuration
const CACHE_TTL = {
  SHORT: 60, // 1 minute - frequently changing data
  MEDIUM: 300, // 5 minutes - moderately changing data
  LONG: 600, // 10 minutes - rarely changing data
  VERY_LONG: 3600 // 1 hour - static data
};

// Generate cache key
const generateKey = (prefix, params) => {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${paramString}`;
};

// Cache middleware factory
const cacheMiddleware = (prefix, ttl = CACHE_TTL.MEDIUM) => {
  return (req, res, next) => {
    // Skip caching in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateKey(prefix, req.query);

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Clear cache by pattern
const clearCachePattern = (pattern) => {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.startsWith(pattern)) {
      cache.del(key);
    }
  });
};

// Clear all cache
const clearAllCache = () => {
  cache.flushAll();
};

// Get cache stats
const getCacheStats = () => {
  return cache.getStats();
};

// Manual cache helpers
const cacheSet = (key, value, ttl) => cache.set(key, value, ttl);
const cacheGet = (key) => cache.get(key);
const cacheDel = (key) => cache.del(key);

// Pre-configured cache middleware for common routes
const cacheRoutes = {
  // Student lists (cache for 5 minutes)
  studentList: cacheMiddleware('students:list', CACHE_TTL.MEDIUM),
  
  // Student years (cache for 10 minutes)
  studentYears: cacheMiddleware('students:years', CACHE_TTL.LONG),
  
  // Subjects (cache for 10 minutes)
  subjects: cacheMiddleware('subjects', CACHE_TTL.LONG),
  
  // Marks config (cache for 10 minutes)
  marksConfig: cacheMiddleware('marks:config', CACHE_TTL.LONG),
  
  // Dashboard stats (cache for 1 minute)
  dashboardStats: cacheMiddleware('dashboard:stats', CACHE_TTL.SHORT),
  
  // Public data (cache for 1 hour)
  publicData: cacheMiddleware('public:data', CACHE_TTL.VERY_LONG)
};

module.exports = {
  cacheMiddleware,
  cacheRoutes,
  clearCachePattern,
  clearAllCache,
  getCacheStats,
  cacheSet,
  cacheGet,
  cacheDel,
  CACHE_TTL,
  generateKey
};
