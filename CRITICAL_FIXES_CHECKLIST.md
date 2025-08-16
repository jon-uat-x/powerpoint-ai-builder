# Critical Fixes Implementation Checklist

## 🚨 IMMEDIATE ACTIONS (Do Today)

### 1. Add Package Dependencies
```bash
cd server
npm install joi isomorphic-dompurify express-rate-limit rate-limit-redis ioredis pg @sentry/node
npm install --save-dev jest supertest @types/jest

cd ../client  
npm install @sentry/react
```

### 2. Create .env.example Files

**server/.env.example**
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Database (for direct connection)
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (for rate limiting & caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring
SENTRY_DSN=your_sentry_dsn
STATSD_HOST=localhost

# Environment
NODE_ENV=development
```

**client/.env.example**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SENTRY_DSN=your_sentry_dsn
```

### 3. Quick Fix Scripts

Create these files immediately to patch critical issues:

**server/src/middleware/validateInput.js**
```javascript
const Joi = require('joi');

const schemas = {
  createPitchbook: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    type: Joi.string().valid('standard', 'template').default('standard'),
    sections: Joi.array().max(50).required()
  }),
  
  updatePitchbook: Joi.object({
    title: Joi.string().min(1).max(255),
    prompts: Joi.object(),
    status: Joi.string().valid('draft', 'ready', 'archived')
  })
};

module.exports = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next();
    }
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};
```

**server/src/middleware/rateLimiter.js**
```javascript
const rateLimit = require('express-rate-limit');

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const defaultLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: 'Too many requests, please try again later'
});

module.exports = { createLimiter, defaultLimiter };
```

### 4. Apply Emergency Patches

**Update server/src/routes/pitchbooks.js:**
```javascript
const validateInput = require('../middleware/validateInput');
const { createLimiter } = require('../middleware/rateLimiter');

// Add to POST route
router.post('/', 
  createLimiter,
  validateInput('createPitchbook'),
  async (req, res) => {
    // existing code
  }
);

// Add to PUT route  
router.put('/:id',
  validateInput('updatePitchbook'),
  async (req, res) => {
    // existing code
  }
);
```

### 5. Database Indexes (Run Immediately)

Connect to Supabase SQL Editor and run:
```sql
-- Critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slides_pitchbook_number 
  ON slides(pitchbook_id, slide_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbook_org_status 
  ON pitchbooks(organization_id, status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_placeholder_prompts_lookup 
  ON placeholder_prompts(slide_id, placeholder_id);

-- Analyze tables for query planner
ANALYZE pitchbooks;
ANALYZE slides;
ANALYZE placeholder_prompts;
```

### 6. Add Basic Error Tracking

**server/src/utils/errorTracker.js:**
```javascript
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1
  });
}

module.exports = {
  captureError: (error, context = {}) => {
    console.error('Error:', error);
    
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: context
      });
    }
  }
};
```

## 📋 Testing Commands

```bash
# Test rate limiting
for i in {1..15}; do curl -X POST http://localhost:5000/api/pitchbooks -H "Content-Type: application/json" -d '{"title":"Test"}'; done

# Test validation
curl -X POST http://localhost:5000/api/pitchbooks \
  -H "Content-Type: application/json" \
  -d '{"title":""}'

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor memory usage
node --expose-gc server/src/index.js &
PID=$!
while true; do ps -o pid,vsz,rss,comm -p $PID; sleep 5; done
```

## 🔄 Daily Checklist

- [ ] Check error logs for new issues
- [ ] Monitor database connection count
- [ ] Review rate limit hits
- [ ] Check response times
- [ ] Verify backup completed
- [ ] Test rollback procedure
- [ ] Review security alerts

## 🚀 Deployment Blockers

**DO NOT DEPLOY TO PRODUCTION UNTIL:**

1. ✅ All P0 issues from review are resolved
2. ✅ Test coverage is above 80%
3. ✅ Load testing completed (1000 concurrent users)
4. ✅ Security audit passed
5. ✅ Rollback procedure tested successfully
6. ✅ Monitoring dashboard operational
7. ✅ Backup strategy implemented and tested
8. ✅ Rate limiting active on all endpoints
9. ✅ Input validation on all user inputs
10. ✅ Database transactions for all multi-step operations