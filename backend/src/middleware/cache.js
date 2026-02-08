// Simple in-memory cache middleware for GET requests
const responseCache = new Map();

export const cacheMiddleware = (ttlMs = 5000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.method}:${req.originalUrl}`;
    
    // Check if response is cached
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Intercept res.json to cache responses
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Cache the response
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        data,
      });
      
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

export const cacheHeaders = (req, res, next) => {
  if (req.method === 'GET') {
    // Default 5 second cache
    res.set('Cache-Control', 'public, max-age=5');
    res.set('Expires', new Date(Date.now() + 5000).toUTCString());
  } else {
    // Don't cache mutations
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
};

export const clearCache = (pattern) => {
  for (const key of responseCache.keys()) {
    if (pattern instanceof RegExp) {
      if (pattern.test(key)) responseCache.delete(key);
    } else if (typeof pattern === 'string') {
      if (key.includes(pattern)) responseCache.delete(key);
    }
  }
};
