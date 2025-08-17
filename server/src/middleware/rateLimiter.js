const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { RateLimitError } = require('../utils/errorHandler');

// Initialize Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected for rate limiting');
});

// Different limits for different operation types
const limits = {
  // Strict limits for creation/deletion
  create: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 creates per window
    message: 'Too many creation requests. Please wait before creating more items.'
  },
  
  // Moderate limits for updates
  update: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 updates per window
    message: 'Too many update requests. Please slow down.'
  },
  
  // Relaxed limits for reads
  read: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 reads per minute
    message: 'Too many requests. Please try again later.'
  },
  
  // Very strict for authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts. Account temporarily locked.'
  },
  
  // API key based limits (more generous)
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute for API users
    message: 'API rate limit exceeded. Please slow down.'
  }
};

const createLimiter = (type) => {
  const config = limits[type] || limits.read;
  
  // Create limiter with or without Redis based on availability
  const limiterConfig = {
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit violations
      console.warn(`Rate limit exceeded: ${req.ip} - ${req.path} - User: ${req.user?.id || 'anonymous'}`);
      
      const retryAfter = Math.ceil(config.windowMs / 1000);
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: config.message,
        retryAfter: retryAfter
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      
      // Skip for service accounts (if using service key)
      if (req.headers['x-service-key'] === process.env.SERVICE_KEY) {
        return true;
      }
      
      return false;
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      return `ip:${req.ip}`;
    }
  };

  // Use Redis store if connected
  if (redisClient.status === 'ready') {
    limiterConfig.store = new RedisStore({
      client: redisClient,
      prefix: `rl:${type}:`
    });
  }

  return rateLimit(limiterConfig);
};

// Create specific limiters
const limiters = {
  createLimiter: createLimiter('create'),
  updateLimiter: createLimiter('update'),
  readLimiter: createLimiter('read'),
  authLimiter: createLimiter('auth'),
  apiLimiter: createLimiter('api')
};

// Dynamic rate limiter based on request method and path
const dynamicRateLimiter = (req, res, next) => {
  // Determine which limiter to use based on method and path
  if (req.method === 'POST' && req.path.includes('/auth')) {
    return limiters.authLimiter(req, res, next);
  }
  
  if (req.method === 'POST') {
    return limiters.createLimiter(req, res, next);
  }
  
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return limiters.updateLimiter(req, res, next);
  }
  
  if (req.method === 'DELETE') {
    return limiters.createLimiter(req, res, next); // Use strict limits for deletion
  }
  
  // Default to read limiter for GET requests
  return limiters.readLimiter(req, res, next);
};

// Per-user rate limiting with different tiers
const tieredRateLimiter = (req, res, next) => {
  if (!req.user) {
    return dynamicRateLimiter(req, res, next);
  }
  
  // Check user's subscription tier
  const tier = req.user.subscriptionTier || 'free';
  
  const tierLimits = {
    free: { windowMs: 60000, max: 60 },
    pro: { windowMs: 60000, max: 300 },
    enterprise: { windowMs: 60000, max: 1000 }
  };
  
  const config = tierLimits[tier] || tierLimits.free;
  
  const tierLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    keyGenerator: (req) => `tier:${req.user.id}`,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Your ${tier} plan allows ${config.max} requests per minute`,
        upgradeUrl: '/pricing'
      });
    }
  });
  
  tierLimiter(req, res, next);
};

module.exports = {
  createLimiter: limiters.createLimiter,
  updateLimiter: limiters.updateLimiter,
  readLimiter: limiters.readLimiter,
  authLimiter: limiters.authLimiter,
  apiLimiter: limiters.apiLimiter,
  dynamicRateLimiter,
  tieredRateLimiter,
  redisClient
};