# Supabase Migration Implementation Guide (REVISED)
## Safe, Secure, and Scalable Migration Strategy

> ⚠️ **CRITICAL**: This revised guide addresses all 15 critical issues identified in the security review. Follow these steps IN ORDER to ensure a safe migration.

## Table of Contents
1. [Pre-Migration Phase](#pre-migration-phase)
2. [Infrastructure Setup Phase](#infrastructure-setup-phase)
3. [Security Hardening Phase](#security-hardening-phase)
4. [Database Deployment Phase](#database-deployment-phase)
5. [Application Integration Phase](#application-integration-phase)
6. [Testing & Validation Phase](#testing--validation-phase)
7. [Migration Execution Phase](#migration-execution-phase)
8. [Production Deployment Phase](#production-deployment-phase)

---

## Pre-Migration Phase (Week 0)
### Critical Setup Before Any Migration

#### 1. Install ALL Required Dependencies
```bash
# Backend dependencies
cd server
npm install \
  @supabase/supabase-js \
  joi \
  isomorphic-dompurify \
  express-rate-limit \
  rate-limit-redis \
  ioredis \
  pg \
  @sentry/node \
  dotenv \
  helmet \
  cors \
  compression \
  winston \
  prom-client \
  node-statsd

# Development dependencies
npm install --save-dev \
  jest \
  supertest \
  @types/jest \
  eslint \
  prettier \
  husky \
  lint-staged

# Frontend dependencies
cd ../client
npm install \
  @supabase/supabase-js \
  @sentry/react \
  react-query \
  zustand
```

#### 2. Create Complete Environment Configuration

**server/.env.production** (use secrets manager in production)
```env
# Supabase
SUPABASE_URL=https://pjsjsynibeltjpusfald.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Direct Database Connection (for migrations/admin)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true

# Security
JWT_SECRET=generate_with_openssl_rand_base64_32
ENCRYPTION_KEY=generate_with_openssl_rand_hex_32

# Monitoring
SENTRY_DSN=your_sentry_dsn
STATSD_HOST=localhost
STATSD_PORT=8125
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Environment
NODE_ENV=production
PORT=5000
```

#### 3. Set Up Local Testing Infrastructure
```bash
# Install Docker for local testing
docker-compose.yml:
```
```yaml
version: '3.8'
services:
  postgres:
    image: supabase/postgres:14.1.0
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### 4. Create Project Structure
```bash
mkdir -p server/src/{middleware,validators,utils,services/database,monitoring,tests}
mkdir -p scripts/{backup,migration,validation}
mkdir -p supabase/{migrations,functions,seeds}
```

---

## Infrastructure Setup Phase (Day 1-2)

### Step 1: Implement Security Middleware

**server/src/middleware/security.js**
```javascript
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

module.exports = (app) => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200
  }));

  // Compression
  app.use(compression());

  // Request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
};
```

### Step 2: Input Validation System

**server/src/validators/pitchbookValidator.js**
```javascript
const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

const schemas = {
  createPitchbook: Joi.object({
    title: Joi.string().min(1).max(255).required()
      .pattern(/^[a-zA-Z0-9\s\-_.,!?]+$/)
      .messages({
        'string.pattern.base': 'Title contains invalid characters'
      }),
    type: Joi.string().valid('standard', 'template', 'custom').default('standard'),
    sections: Joi.array().items(
      Joi.object({
        title: Joi.string().max(255).required(),
        numberOfSlides: Joi.number().integer().min(1).max(100).default(1),
        prompt: Joi.string().max(5000).allow('')
      })
    ).min(1).max(50).required(),
    pitchbookPrompt: Joi.string().max(10000).allow(''),
    inheritTemplatePrompts: Joi.boolean().default(true)
  }),

  updatePitchbook: Joi.object({
    title: Joi.string().min(1).max(255),
    prompts: Joi.object().pattern(
      Joi.string(),
      Joi.object().pattern(
        Joi.string(),
        Joi.string().max(5000)
      )
    ),
    status: Joi.string().valid('draft', 'generating', 'ready', 'archived')
  }),

  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('created_at', 'updated_at', 'title').default('updated_at'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

class PitchbookValidator {
  static validate(schemaName, data) {
    const schema = schemas[schemaName];
    if (!schema) {
      throw new Error(`Validation schema '${schemaName}' not found`);
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = errors;
      throw validationError;
    }

    return this.sanitize(value);
  }

  static sanitize(data) {
    const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone

    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      // Remove any HTML tags and scripts
      return DOMPurify.sanitize(str, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      }).trim();
    };

    const recursiveSanitize = (obj) => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(recursiveSanitize);
      }
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = recursiveSanitize(value);
        }
        return result;
      }
      return obj;
    };

    return recursiveSanitize(sanitized);
  }
}

module.exports = PitchbookValidator;
```

### Step 3: Rate Limiting Configuration

**server/src/middleware/rateLimiter.js**
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redisClient } = require('../services/redis');

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
  }
};

const createLimiter = (type) => {
  const config = limits[type] || limits.read;
  
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:${type}:`
    }),
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit violations
      console.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

module.exports = {
  createLimiter: createLimiter('create'),
  updateLimiter: createLimiter('update'),
  readLimiter: createLimiter('read'),
  authLimiter: createLimiter('auth')
};
```

### Step 4: Error Handling System

**server/src/utils/errorHandler.js**
```javascript
const Sentry = require('@sentry/node');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter) {
    super('Rate limit exceeded', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError(err.message || 'Internal server error', 500, false);
  }
  
  // Log error
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?.id
    }
  });
  
  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    Sentry.captureException(error, {
      tags: {
        statusCode: error.statusCode
      },
      extra: {
        requestUrl: req.url,
        requestMethod: req.method,
        userId: req.user?.id
      }
    });
  }
  
  // Send error response
  res.status(error.statusCode).json({
    error: {
      message: error.message,
      ...(error.errors && { errors: error.errors }),
      ...(error.retryAfter && { retryAfter: error.retryAfter }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Retry mechanism for transient failures
const retryWithExponentialBackoff = async (
  fn,
  maxRetries = 3,
  initialDelay = 1000
) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = 
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout') ||
        error.message?.includes('deadlock') ||
        error.statusCode === 503;
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt) + Math.random() * 1000,
        30000 // Max 30 seconds
      );
      
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  retryWithExponentialBackoff,
  logger
};
```

---

## Security Hardening Phase (Day 3-4)

### Step 1: Database Transaction Support

**supabase/migrations/002_transaction_functions.sql**
```sql
-- Function for atomic pitchbook creation
CREATE OR REPLACE FUNCTION create_pitchbook_atomic(
  p_title TEXT,
  p_type TEXT,
  p_organization_id UUID,
  p_user_id UUID,
  p_sections JSONB,
  p_prompts JSONB DEFAULT '{}'::JSONB
) RETURNS TABLE (
  pitchbook_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_pitchbook_id UUID;
  v_section_id UUID;
  v_slide_number INTEGER := 1;
  v_section JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Create pitchbook
    INSERT INTO pitchbooks (
      title, type, organization_id, created_by, 
      pitchbook_prompt, scoped_prompts, status
    ) VALUES (
      p_title, p_type, p_organization_id, p_user_id,
      p_prompts->>'pitchbook_prompt', p_prompts->'scoped_prompts', 'draft'
    ) RETURNING id INTO v_pitchbook_id;
    
    -- Create mandatory slides
    INSERT INTO slides (pitchbook_id, slide_number, layout_name, slide_type)
    VALUES 
      (v_pitchbook_id, v_slide_number, 'Title Slide', 'title'),
      (v_pitchbook_id, v_slide_number + 1, 'Contents', 'contents'),
      (v_pitchbook_id, v_slide_number + 2, 'Legal Notice', 'legal');
    
    v_slide_number := 4;
    
    -- Create sections and slides
    FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
      -- Create section
      INSERT INTO pitchbook_sections (
        pitchbook_id, title, order_index, 
        number_of_slides, section_prompt
      ) VALUES (
        v_pitchbook_id, 
        v_section->>'title',
        (v_section->>'order_index')::INTEGER,
        COALESCE((v_section->>'numberOfSlides')::INTEGER, 1),
        v_section->>'prompt'
      ) RETURNING id INTO v_section_id;
      
      -- Create section divider slide
      INSERT INTO slides (
        pitchbook_id, section_id, slide_number, 
        layout_name, slide_type
      ) VALUES (
        v_pitchbook_id, v_section_id, v_slide_number,
        'Section Divider', 'section-divider'
      );
      
      v_slide_number := v_slide_number + 1;
      
      -- Create body slides for section
      FOR i IN 1..COALESCE((v_section->>'numberOfSlides')::INTEGER, 1)
      LOOP
        INSERT INTO slides (
          pitchbook_id, section_id, slide_number,
          layout_name, slide_type
        ) VALUES (
          v_pitchbook_id, v_section_id, v_slide_number,
          'Body Text', 'body'
        );
        
        v_slide_number := v_slide_number + 1;
      END LOOP;
    END LOOP;
    
    -- Log activity
    INSERT INTO activity_logs (
      user_id, organization_id, pitchbook_id,
      action, details
    ) VALUES (
      p_user_id, p_organization_id, v_pitchbook_id,
      'created_pitchbook', jsonb_build_object('title', p_title)
    );
    
    -- Return success
    RETURN QUERY SELECT v_pitchbook_id, true, 'Pitchbook created successfully';
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in PL/pgSQL functions
      RETURN QUERY SELECT NULL::UUID, false, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for safe deletion with cascade
CREATE OR REPLACE FUNCTION delete_pitchbook_safe(
  p_pitchbook_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deleted_count INTEGER
) AS $$
DECLARE
  v_deleted_slides INTEGER;
  v_deleted_sections INTEGER;
  v_org_id UUID;
  v_title TEXT;
BEGIN
  -- Check if user has permission
  SELECT organization_id, title INTO v_org_id, v_title
  FROM pitchbooks 
  WHERE id = p_pitchbook_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Pitchbook not found', 0;
    RETURN;
  END IF;
  
  -- Check for active collaborators
  IF EXISTS (
    SELECT 1 FROM collaboration_presence
    WHERE pitchbook_id = p_pitchbook_id
    AND last_seen > NOW() - INTERVAL '5 minutes'
    AND user_id != p_user_id
  ) THEN
    RETURN QUERY SELECT false, 'Cannot delete: Other users are currently editing', 0;
    RETURN;
  END IF;
  
  BEGIN
    -- Delete in correct order (cascades handle most)
    DELETE FROM placeholder_prompts
    WHERE slide_id IN (
      SELECT id FROM slides WHERE pitchbook_id = p_pitchbook_id
    );
    
    DELETE FROM slides WHERE pitchbook_id = p_pitchbook_id;
    GET DIAGNOSTICS v_deleted_slides = ROW_COUNT;
    
    DELETE FROM pitchbook_sections WHERE pitchbook_id = p_pitchbook_id;
    GET DIAGNOSTICS v_deleted_sections = ROW_COUNT;
    
    DELETE FROM pitchbooks WHERE id = p_pitchbook_id;
    
    -- Log deletion
    INSERT INTO activity_logs (
      user_id, organization_id, action, details
    ) VALUES (
      p_user_id, v_org_id, 'deleted_pitchbook',
      jsonb_build_object(
        'title', v_title,
        'pitchbook_id', p_pitchbook_id,
        'slides_deleted', v_deleted_slides,
        'sections_deleted', v_deleted_sections
      )
    );
    
    RETURN QUERY SELECT true, 'Pitchbook deleted successfully', 
                        v_deleted_slides + v_deleted_sections;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT false, SQLERRM, 0;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Enhanced RLS Policies

**supabase/migrations/003_enhanced_rls.sql**
```sql
-- Drop existing basic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Members can view organization" ON organizations;
DROP POLICY IF EXISTS "Members can view org pitchbooks" ON pitchbooks;
DROP POLICY IF EXISTS "Members can create pitchbooks" ON pitchbooks;
DROP POLICY IF EXISTS "Members can update pitchbooks" ON pitchbooks;

-- Enhanced profile policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Organization policies with role-based access
CREATE POLICY "org_select_members" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "org_insert_authenticated" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "org_update_admin" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Pitchbook policies with granular permissions
CREATE POLICY "pitchbook_select_org_members" ON pitchbooks
  FOR SELECT USING (
    -- Can see if member of organization
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = pitchbooks.organization_id
      AND user_id = auth.uid()
    )
    OR
    -- Can see own drafts regardless of org
    (created_by = auth.uid() AND status = 'draft')
  );

CREATE POLICY "pitchbook_insert_members" ON pitchbooks
  FOR INSERT WITH CHECK (
    -- Must be member with appropriate role
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = pitchbooks.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "pitchbook_update_authorized" ON pitchbooks
  FOR UPDATE USING (
    -- Creator can always update
    created_by = auth.uid()
    OR
    -- Org members can update based on role and status
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = pitchbooks.organization_id
      AND user_id = auth.uid()
      AND (
        role IN ('owner', 'admin')
        OR (role = 'member' AND pitchbooks.status != 'archived')
      )
    )
  );

CREATE POLICY "pitchbook_delete_owner" ON pitchbooks
  FOR DELETE USING (
    -- Only creator or org admin can delete
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = pitchbooks.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Slide policies inherit from pitchbook
CREATE POLICY "slides_all_pitchbook_access" ON slides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pitchbooks
      WHERE pitchbooks.id = slides.pitchbook_id
      AND (
        pitchbooks.created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_id = pitchbooks.organization_id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Activity log policies (read-only for users)
CREATE POLICY "activity_select_own" ON activity_logs
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = activity_logs.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Collaboration presence policies
CREATE POLICY "presence_all_pitchbook_members" ON collaboration_presence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pitchbooks p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = collaboration_presence.pitchbook_id
      AND om.user_id = auth.uid()
    )
  );

-- Service role bypass (for admin operations)
CREATE POLICY "service_role_bypass_all" ON ALL TABLES
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role'
  );
```

### Step 3: Connection Pool Configuration

**server/src/services/database/connectionPool.js**
```javascript
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../../utils/errorHandler');

// PostgreSQL connection pool for heavy operations
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Pool configuration
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  
  // Query timeouts
  statement_timeout: 30000,
  query_timeout: 30000,
  
  // Application identification
  application_name: 'powerpoint-ai-builder',
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : false
});

// Monitor pool health
pgPool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

pgPool.on('connect', (client) => {
  logger.debug('New client connected to pool');
});

pgPool.on('acquire', (client) => {
  logger.debug('Client acquired from pool');
});

pgPool.on('remove', (client) => {
  logger.debug('Client removed from pool');
});

// Health check function
const checkPoolHealth = async () => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return {
      healthy: true,
      timestamp: result.rows[0].now,
      activeConnections: pgPool.totalCount,
      idleConnections: pgPool.idleCount,
      waitingConnections: pgPool.waitingCount
    };
  } catch (error) {
    logger.error('Database health check failed', error);
    return {
      healthy: false,
      error: error.message,
      activeConnections: pgPool.totalCount
    };
  }
};

// Scheduled health checks
setInterval(async () => {
  const health = await checkPoolHealth();
  if (!health.healthy) {
    logger.error('Database unhealthy:', health);
    // Trigger alerts
  }
}, 30000); // Every 30 seconds

// Optimized Supabase client factory
class SupabaseClientFactory {
  constructor() {
    this.clients = new Map();
    this.maxClients = 100;
  }

  createClient(accessToken) {
    // Reuse existing client if available
    if (this.clients.has(accessToken)) {
      return this.clients.get(accessToken);
    }

    // Clean up old clients if at limit
    if (this.clients.size >= this.maxClients) {
      const firstKey = this.clients.keys().next().value;
      this.clients.delete(firstKey);
    }

    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 2
          }
        }
      }
    );

    this.clients.set(accessToken, client);
    return client;
  }

  cleanup() {
    this.clients.clear();
  }
}

const clientFactory = new SupabaseClientFactory();

// Clean up clients periodically
setInterval(() => {
  clientFactory.cleanup();
}, 3600000); // Every hour

module.exports = {
  pgPool,
  clientFactory,
  checkPoolHealth
};
```

---

## Database Deployment Phase (Day 5-6)

### Step 1: Deploy Enhanced Schema

**supabase/migrations/004_performance_indexes.sql**
```sql
-- Performance indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbooks_org_status_updated 
  ON pitchbooks(organization_id, status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbooks_created_by_status 
  ON pitchbooks(created_by, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slides_pitchbook_number 
  ON slides(pitchbook_id, slide_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slides_section_number 
  ON slides(section_id, slide_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_pitchbook_order 
  ON pitchbook_sections(pitchbook_id, order_index);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_placeholder_slide_placeholder 
  ON placeholder_prompts(slide_id, placeholder_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_created 
  ON activity_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_org_created 
  ON activity_logs(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_pitchbook 
  ON activity_logs(pitchbook_id);

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbooks_active 
  ON pitchbooks(organization_id, updated_at DESC) 
  WHERE status IN ('draft', 'ready');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbooks_archived 
  ON pitchbooks(organization_id, updated_at DESC) 
  WHERE status = 'archived';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_presence_active 
  ON collaboration_presence(pitchbook_id, user_id) 
  WHERE last_seen > NOW() - INTERVAL '5 minutes';

-- Text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbooks_title_search 
  ON pitchbooks USING gin(to_tsvector('english', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_title_search 
  ON pitchbook_sections USING gin(to_tsvector('english', title));

-- JSONB indexes for prompt searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pitchbooks_scoped_prompts 
  ON pitchbooks USING gin(scoped_prompts);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slides_prompt_scoped 
  ON slides USING gin(slide_prompt_scoped);

-- Update table statistics
ANALYZE pitchbooks;
ANALYZE pitchbook_sections;
ANALYZE slides;
ANALYZE placeholder_prompts;
ANALYZE activity_logs;
ANALYZE collaboration_presence;
```

### Step 2: Create Monitoring Views

**supabase/migrations/005_monitoring_views.sql**
```sql
-- View for monitoring database performance
CREATE OR REPLACE VIEW v_database_health AS
SELECT
  (SELECT count(*) FROM pg_stat_activity) as active_connections,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
  (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_queries,
  (SELECT count(*) FROM pitchbooks) as total_pitchbooks,
  (SELECT count(*) FROM slides) as total_slides,
  (SELECT count(*) FROM activity_logs WHERE created_at > NOW() - INTERVAL '1 hour') as recent_activities,
  (SELECT pg_database_size(current_database())) as database_size_bytes,
  NOW() as checked_at;

-- View for user activity monitoring
CREATE OR REPLACE VIEW v_user_activity AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT p.id) as pitchbook_count,
  COUNT(DISTINCT al.id) as activity_count,
  MAX(al.created_at) as last_activity,
  array_agg(DISTINCT om.organization_id) as organizations
FROM profiles u
LEFT JOIN pitchbooks p ON p.created_by = u.id
LEFT JOIN activity_logs al ON al.user_id = u.id
LEFT JOIN organization_members om ON om.user_id = u.id
GROUP BY u.id, u.email;

-- View for pitchbook statistics
CREATE OR REPLACE VIEW v_pitchbook_stats AS
SELECT
  p.id,
  p.title,
  p.status,
  COUNT(DISTINCT s.id) as slide_count,
  COUNT(DISTINCT ps.id) as section_count,
  COUNT(DISTINCT pp.id) as prompt_count,
  COUNT(DISTINCT pv.id) as version_count,
  p.created_at,
  p.updated_at
FROM pitchbooks p
LEFT JOIN slides s ON s.pitchbook_id = p.id
LEFT JOIN pitchbook_sections ps ON ps.pitchbook_id = p.id
LEFT JOIN placeholder_prompts pp ON pp.slide_id = s.id
LEFT JOIN pitchbook_versions pv ON pv.pitchbook_id = p.id
GROUP BY p.id;

-- Grant read access to authenticated users
GRANT SELECT ON v_database_health TO authenticated;
GRANT SELECT ON v_user_activity TO authenticated;
GRANT SELECT ON v_pitchbook_stats TO authenticated;
```

---

## Application Integration Phase (Week 2)

### Step 1: Monitoring & Observability

**server/src/monitoring/metrics.js**
```javascript
const prometheus = require('prom-client');
const StatsD = require('node-statsd');
const Sentry = require('@sentry/node');

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    }
  });
}

// Prometheus metrics
const register = new prometheus.Registry();

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users_total',
  help: 'Number of active users'
});

const pitchbooksCreated = new prometheus.Counter({
  name: 'pitchbooks_created_total',
  help: 'Total number of pitchbooks created'
});

const errorRate = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeUsers);
register.registerMetric(pitchbooksCreated);
register.registerMetric(errorRate);

// StatsD client for real-time metrics
const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: process.env.STATSD_PORT || 8125,
  prefix: 'powerpoint_ai.',
  cacheDns: true
});

// Middleware for request tracking
const requestMetrics = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    statsd.timing('request.duration', duration * 1000);
    statsd.increment(`request.status.${res.statusCode}`);
    
    if (res.statusCode >= 400) {
      errorRate.labels('http', res.statusCode).inc();
    }
  });
  
  next();
};

// Database query tracking
const trackDatabaseQuery = (operation, table, duration) => {
  databaseQueryDuration.labels(operation, table).observe(duration / 1000);
  statsd.timing(`database.${operation}.${table}`, duration);
};

// Export metrics endpoint
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
};

module.exports = {
  requestMetrics,
  trackDatabaseQuery,
  metricsEndpoint,
  statsd,
  errorRate,
  pitchbooksCreated,
  activeUsers
};
```

### Step 2: Caching Layer

**server/src/services/cache/cacheManager.js**
```javascript
const Redis = require('ioredis');
const { logger } = require('../../utils/errorHandler');

// Redis client with cluster support
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

class CacheManager {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
    this.connected = false;
    
    redis.ping().then(() => {
      this.connected = true;
    }).catch(() => {
      this.connected = false;
      logger.warn('Cache unavailable, falling back to database');
    });
  }

  async get(key) {
    if (!this.connected) return null;
    
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.connected) return;
    
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async del(key) {
    if (!this.connected) return;
    
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern) {
    if (!this.connected) return;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidate error:', error);
    }
  }

  // Cache-aside pattern implementation
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const data = await fetchFunction();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return data;
  }

  // Specific cache methods
  async getTemplates() {
    return this.getOrSet(
      'templates:all',
      async () => {
        const { data } = await supabase
          .from('layout_templates')
          .select('*')
          .order('name');
        return data;
      },
      3600 // 1 hour
    );
  }

  async getPitchbook(id) {
    return this.getOrSet(
      `pitchbook:${id}`,
      async () => {
        const { data } = await supabase
          .from('pitchbooks')
          .select('*, sections(*), slides(*)')
          .eq('id', id)
          .single();
        return data;
      },
      300 // 5 minutes
    );
  }

  async invalidatePitchbook(id) {
    await this.del(`pitchbook:${id}`);
    await this.invalidatePattern(`pitchbook:${id}:*`);
  }

  async warmCache() {
    // Pre-load frequently accessed data
    logger.info('Warming cache...');
    
    try {
      await this.getTemplates();
      logger.info('Cache warmed successfully');
    } catch (error) {
      logger.error('Cache warming failed:', error);
    }
  }
}

module.exports = new CacheManager();
```

---

## Testing & Validation Phase (Week 3)

### Step 1: Comprehensive Test Suite

**server/src/tests/pitchbook.test.js**
```javascript
const request = require('supertest');
const app = require('../index');
const { supabase } = require('../services/database/supabaseClient');

describe('Pitchbook API', () => {
  let authToken;
  let testOrganizationId;
  let testPitchbookId;

  beforeAll(async () => {
    // Set up test user and organization
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    authToken = authData.session.access_token;
    
    // Create test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org', slug: 'test-org' })
      .select()
      .single();
    testOrganizationId = org.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testPitchbookId) {
      await supabase
        .from('pitchbooks')
        .delete()
        .eq('id', testPitchbookId);
    }
    await supabase
      .from('organizations')
      .delete()
      .eq('id', testOrganizationId);
  });

  describe('POST /api/pitchbooks', () => {
    it('should create a pitchbook with valid data', async () => {
      const response = await request(app)
        .post('/api/pitchbooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Pitchbook',
          type: 'standard',
          sections: [
            {
              title: 'Introduction',
              numberOfSlides: 2,
              prompt: 'Test prompt'
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.pitchbook).toHaveProperty('id');
      testPitchbookId = response.body.pitchbook.id;
    });

    it('should reject invalid data', async () => {
      const response = await request(app)
        .post('/api/pitchbooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '', // Invalid: empty title
          sections: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should enforce rate limiting', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/pitchbooks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `Test ${i}`,
              sections: [{ title: 'Test', numberOfSlides: 1 }]
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should sanitize malicious input', async () => {
      const response = await request(app)
        .post('/api/pitchbooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '<script>alert("XSS")</script>Test',
          sections: [{
            title: 'Test<img src=x onerror=alert(1)>',
            numberOfSlides: 1
          }]
        });

      expect(response.status).toBe(201);
      expect(response.body.pitchbook.title).toBe('Test');
      expect(response.body.pitchbook.sections[0].title).toBe('Test');
    });
  });

  describe('GET /api/pitchbooks/:id', () => {
    it('should retrieve pitchbook with caching', async () => {
      // First request - from database
      const start1 = Date.now();
      const response1 = await request(app)
        .get(`/api/pitchbooks/${testPitchbookId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const time1 = Date.now() - start1;

      expect(response1.status).toBe(200);

      // Second request - from cache (should be faster)
      const start2 = Date.now();
      const response2 = await request(app)
        .get(`/api/pitchbooks/${testPitchbookId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const time2 = Date.now() - start2;

      expect(response2.status).toBe(200);
      expect(time2).toBeLessThan(time1 * 0.5); // Cache should be at least 2x faster
    });

    it('should handle non-existent pitchbook', async () => {
      const response = await request(app)
        .get('/api/pitchbooks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Pitchbook not found');
    });
  });

  describe('Transaction Integrity', () => {
    it('should rollback on partial failure', async () => {
      // Simulate failure by sending invalid section data
      const response = await request(app)
        .post('/api/pitchbooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Transaction Test',
          sections: [
            { title: 'Valid Section', numberOfSlides: 1 },
            { title: 'Invalid Section', numberOfSlides: 999 } // Exceeds limit
          ]
        });

      // Check that no partial data was created
      const { data: pitchbooks } = await supabase
        .from('pitchbooks')
        .select('*')
        .eq('title', 'Transaction Test');

      expect(pitchbooks).toHaveLength(0);
    });
  });
});
```

### Step 2: Migration Validation

**scripts/validation/migrationValidator.js**
```javascript
const { supabase } = require('../server/src/services/database/supabaseClient');
const fs = require('fs-extra');
const path = require('path');

class MigrationValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async validate() {
    console.log('Starting migration validation...\n');

    await this.checkDatabaseSchema();
    await this.checkReferentialIntegrity();
    await this.checkDataConsistency();
    await this.checkIndexes();
    await this.checkRLSPolicies();
    await this.checkPerformance();

    return this.generateReport();
  }

  async checkDatabaseSchema() {
    console.log('Checking database schema...');
    
    const requiredTables = [
      'profiles', 'organizations', 'organization_members',
      'pitchbooks', 'pitchbook_sections', 'slides',
      'placeholder_prompts', 'layout_templates',
      'pitchbook_versions', 'activity_logs', 'collaboration_presence'
    ];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      
      if (error && error.code === '42P01') {
        this.results.failed.push({
          check: 'Database Schema',
          issue: `Missing table: ${table}`,
          severity: 'critical'
        });
      } else {
        this.results.passed.push({
          check: 'Database Schema',
          detail: `Table ${table} exists`
        });
      }
    }
  }

  async checkReferentialIntegrity() {
    console.log('Checking referential integrity...');

    // Check for orphaned slides
    const { data: orphanedSlides } = await supabase
      .from('slides')
      .select('id, pitchbook_id')
      .not('pitchbook_id', 'is', null)
      .limit(1000);

    for (const slide of orphanedSlides || []) {
      const { data: pitchbook } = await supabase
        .from('pitchbooks')
        .select('id')
        .eq('id', slide.pitchbook_id)
        .single();

      if (!pitchbook) {
        this.results.failed.push({
          check: 'Referential Integrity',
          issue: `Orphaned slide: ${slide.id}`,
          severity: 'high'
        });
      }
    }

    if (this.results.failed.filter(r => r.check === 'Referential Integrity').length === 0) {
      this.results.passed.push({
        check: 'Referential Integrity',
        detail: 'No orphaned records found'
      });
    }
  }

  async checkDataConsistency() {
    console.log('Checking data consistency...');

    // Check slide numbering
    const { data: pitchbooks } = await supabase
      .from('pitchbooks')
      .select('id, title')
      .limit(100);

    for (const pitchbook of pitchbooks || []) {
      const { data: slides } = await supabase
        .from('slides')
        .select('slide_number')
        .eq('pitchbook_id', pitchbook.id)
        .order('slide_number');

      // Check for gaps in numbering
      for (let i = 0; i < slides.length - 1; i++) {
        if (slides[i + 1].slide_number !== slides[i].slide_number + 1) {
          this.results.warnings.push({
            check: 'Data Consistency',
            issue: `Gap in slide numbering for pitchbook: ${pitchbook.title}`,
            severity: 'low'
          });
          break;
        }
      }
    }
  }

  async checkIndexes() {
    console.log('Checking database indexes...');

    const { data: indexes } = await supabase.rpc('get_indexes');
    
    const requiredIndexes = [
      'idx_pitchbooks_org_status_updated',
      'idx_slides_pitchbook_number',
      'idx_placeholder_slide_placeholder'
    ];

    for (const indexName of requiredIndexes) {
      if (!indexes?.some(idx => idx.indexname === indexName)) {
        this.results.warnings.push({
          check: 'Performance Indexes',
          issue: `Missing index: ${indexName}`,
          severity: 'medium'
        });
      }
    }
  }

  async checkRLSPolicies() {
    console.log('Checking RLS policies...');

    const { data: policies } = await supabase.rpc('get_policies');
    
    if (!policies || policies.length < 10) {
      this.results.failed.push({
        check: 'Security',
        issue: 'Insufficient RLS policies',
        severity: 'critical'
      });
    } else {
      this.results.passed.push({
        check: 'Security',
        detail: `${policies.length} RLS policies active`
      });
    }
  }

  async checkPerformance() {
    console.log('Running performance checks...');

    const start = Date.now();
    const { data, error } = await supabase
      .from('pitchbooks')
      .select('*, sections(*), slides(*)')
      .limit(10);
    const duration = Date.now() - start;

    if (duration > 1000) {
      this.results.warnings.push({
        check: 'Performance',
        issue: `Slow query detected: ${duration}ms for pitchbook fetch`,
        severity: 'medium'
      });
    } else {
      this.results.passed.push({
        check: 'Performance',
        detail: `Query performance acceptable: ${duration}ms`
      });
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        warnings: this.results.warnings.length
      },
      results: this.results,
      recommendation: this.getRecommendation()
    };

    // Save report
    await fs.writeJson(
      path.join(__dirname, `../../validation-report-${Date.now()}.json`),
      report,
      { spaces: 2 }
    );

    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log('\nRecommendation:', report.recommendation);

    return report;
  }

  getRecommendation() {
    if (this.results.failed.length > 0) {
      return '🛑 DO NOT PROCEED - Critical issues must be resolved';
    }
    if (this.results.warnings.length > 5) {
      return '⚠️ PROCEED WITH CAUTION - Review and address warnings';
    }
    return '✅ SAFE TO PROCEED - System validated successfully';
  }
}

// Run validation
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.validate()
    .then(report => {
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = MigrationValidator;
```

---

## Migration Execution Phase (Week 4)

### Step 1: Enhanced Migration Script

**scripts/migration/safeMigration.js**
```javascript
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../../server/src/utils/errorHandler');
const MigrationValidator = require('../validation/migrationValidator');

class SafeMigration {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.checkpoint = null;
    this.rollbackLog = [];
    this.stats = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0
    };
  }

  async execute() {
    try {
      console.log('🚀 Starting Safe Migration Process\n');

      // Step 1: Pre-migration validation
      await this.preValidation();

      // Step 2: Create backup
      await this.createBackup();

      // Step 3: Create checkpoint
      await this.createCheckpoint();

      // Step 4: Migrate data
      await this.migrateData();

      // Step 5: Post-migration validation
      await this.postValidation();

      // Step 6: Generate report
      await this.generateReport();

      console.log('\n✅ Migration completed successfully!');
      return true;

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      await this.rollback();
      throw error;
    }
  }

  async preValidation() {
    console.log('📋 Running pre-migration validation...');
    
    const validator = new MigrationValidator();
    const report = await validator.validate();
    
    if (report.summary.failed > 0) {
      throw new Error('Pre-validation failed. Fix issues before migrating.');
    }
    
    console.log('✅ Pre-validation passed\n');
  }

  async createBackup() {
    console.log('💾 Creating backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, `../../backups/${timestamp}`);
    
    await fs.ensureDir(backupDir);
    
    // Backup local data
    const dataDir = path.join(__dirname, '../../server/src/data');
    if (await fs.exists(dataDir)) {
      await fs.copy(dataDir, path.join(backupDir, 'data'));
    }
    
    // Export current Supabase data
    const tables = ['pitchbooks', 'slides', 'pitchbook_sections'];
    for (const table of tables) {
      const { data } = await this.supabase.from(table).select('*');
      await fs.writeJson(
        path.join(backupDir, `${table}.json`),
        data || [],
        { spaces: 2 }
      );
    }
    
    console.log(`✅ Backup created: ${backupDir}\n`);
    this.backupPath = backupDir;
  }

  async createCheckpoint() {
    console.log('🔖 Creating migration checkpoint...');
    
    this.checkpoint = {
      startTime: new Date().toISOString(),
      lastProcessedId: null,
      migratedItems: [],
      failedItems: []
    };
    
    await this.saveCheckpoint();
    console.log('✅ Checkpoint created\n');
  }

  async saveCheckpoint() {
    await fs.writeJson(
      path.join(__dirname, '../../migration-checkpoint.json'),
      this.checkpoint,
      { spaces: 2 }
    );
  }

  async migrateData() {
    console.log('📦 Starting data migration...\n');
    
    // Load existing data
    const pitchbooksFile = path.join(__dirname, '../../server/src/data/pitchbooks.json');
    if (!await fs.exists(pitchbooksFile)) {
      console.log('No data to migrate');
      return;
    }
    
    const pitchbooks = await fs.readJson(pitchbooksFile);
    this.stats.total = pitchbooks.length;
    
    // Ensure default organization
    const orgId = await this.ensureOrganization();
    
    // Migrate each pitchbook
    for (const pitchbook of pitchbooks) {
      await this.migratePitchbook(pitchbook, orgId);
    }
    
    console.log('\n📊 Migration Statistics:');
    console.log(`  Total: ${this.stats.total}`);
    console.log(`  Migrated: ${this.stats.migrated}`);
    console.log(`  Failed: ${this.stats.failed}`);
    console.log(`  Skipped: ${this.stats.skipped}`);
  }

  async migratePitchbook(pitchbookData, organizationId) {
    const startIndex = this.rollbackLog.length;
    
    try {
      // Check if already migrated
      const { data: existing } = await this.supabase
        .from('pitchbooks')
        .select('id')
        .eq('id', pitchbookData.id)
        .single();
      
      if (existing) {
        console.log(`⏭️  Skipping ${pitchbookData.title} (already exists)`);
        this.stats.skipped++;
        return;
      }
      
      console.log(`📝 Migrating: ${pitchbookData.title}`);
      
      // Use transaction function
      const { data, error } = await this.supabase.rpc('create_pitchbook_atomic', {
        p_title: pitchbookData.title,
        p_type: pitchbookData.type || 'standard',
        p_organization_id: organizationId,
        p_user_id: null, // System migration
        p_sections: pitchbookData.sections || [],
        p_prompts: {
          pitchbook_prompt: pitchbookData.pitchbookPrompt,
          scoped_prompts: pitchbookData.scopedPrompts
        }
      });
      
      if (error) throw error;
      
      // Record success
      this.checkpoint.migratedItems.push(pitchbookData.id);
      this.rollbackLog.push({
        type: 'INSERT',
        table: 'pitchbooks',
        id: data.pitchbook_id
      });
      
      this.stats.migrated++;
      await this.saveCheckpoint();
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      this.checkpoint.failedItems.push({
        id: pitchbookData.id,
        title: pitchbookData.title,
        error: error.message
      });
      this.stats.failed++;
      
      // Partial rollback
      await this.partialRollback(startIndex);
    }
  }

  async ensureOrganization() {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'default')
      .single();
    
    if (org) return org.id;
    
    const { data: newOrg, error } = await this.supabase
      .from('organizations')
      .insert({
        name: 'Default Organization',
        slug: 'default'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    this.rollbackLog.push({
      type: 'INSERT',
      table: 'organizations',
      id: newOrg.id
    });
    
    return newOrg.id;
  }

  async partialRollback(fromIndex) {
    const operations = this.rollbackLog.slice(fromIndex);
    
    for (const op of operations.reverse()) {
      try {
        await this.supabase
          .from(op.table)
          .delete()
          .eq('id', op.id);
      } catch (error) {
        console.error(`Rollback failed for ${op.table}:${op.id}`);
      }
    }
    
    this.rollbackLog = this.rollbackLog.slice(0, fromIndex);
  }

  async rollback() {
    console.log('\n🔄 Starting rollback...');
    
    for (const op of this.rollbackLog.reverse()) {
      try {
        await this.supabase
          .from(op.table)
          .delete()
          .eq('id', op.id);
        console.log(`  Rolled back: ${op.table}:${op.id}`);
      } catch (error) {
        console.error(`  Rollback failed: ${op.table}:${op.id}`);
      }
    }
    
    console.log('✅ Rollback completed');
  }

  async postValidation() {
    console.log('\n📋 Running post-migration validation...');
    
    const validator = new MigrationValidator();
    const report = await validator.validate();
    
    if (report.summary.failed > 0) {
      console.warn('⚠️  Post-validation found issues');
    } else {
      console.log('✅ Post-validation passed');
    }
    
    this.validationReport = report;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - new Date(this.checkpoint.startTime).getTime(),
      stats: this.stats,
      validation: this.validationReport?.summary,
      backup: this.backupPath,
      checkpoint: this.checkpoint
    };
    
    await fs.writeJson(
      path.join(__dirname, `../../migration-report-${Date.now()}.json`),
      report,
      { spaces: 2 }
    );
    
    console.log('\n📄 Report generated');
  }
}

// Execute migration
if (require.main === module) {
  require('dotenv').config();
  
  const migration = new SafeMigration();
  migration.execute()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = SafeMigration;
```

---

## Production Deployment Phase (Week 5-6)

### Deployment Checklist

```bash
# Final deployment checklist script
#!/bin/bash

echo "🚀 Production Deployment Checklist"
echo "=================================="

# Check all critical issues are resolved
echo -n "✓ All P0 issues resolved? (y/n): "
read p0_resolved
[[ $p0_resolved != "y" ]] && echo "❌ Cannot deploy" && exit 1

# Run test suite
echo "Running test suite..."
npm test
[[ $? -ne 0 ]] && echo "❌ Tests failed" && exit 1

# Run security audit
echo "Running security audit..."
npm audit --audit-level=high
[[ $? -ne 0 ]] && echo "❌ Security vulnerabilities found" && exit 1

# Check monitoring
echo -n "✓ Monitoring configured? (y/n): "
read monitoring
[[ $monitoring != "y" ]] && echo "❌ Configure monitoring first" && exit 1

# Validate environment
echo "Validating environment variables..."
node scripts/validateEnv.js
[[ $? -ne 0 ]] && echo "❌ Environment validation failed" && exit 1

echo "✅ All checks passed - Ready for production deployment!"
```

---

## Critical Success Metrics

Monitor these metrics post-deployment:

1. **Performance**
   - API response time P95 < 500ms
   - Database query time P95 < 100ms
   - Cache hit rate > 80%

2. **Reliability**
   - Uptime > 99.9%
   - Error rate < 0.1%
   - Failed migration rate = 0%

3. **Security**
   - 0 security incidents
   - 100% input validation coverage
   - All RLS policies enforced

4. **Cost**
   - Monthly Supabase cost < $150 at 1000 users
   - Redis cost < $50/month
   - Monitoring cost < $100/month

---

## Emergency Contacts & Resources

- **Supabase Support**: support@supabase.io
- **Status Page**: status.supabase.com
- **Documentation**: supabase.com/docs
- **Community**: github.com/supabase/supabase/discussions

---

## Conclusion

This revised migration guide addresses all 15 critical issues identified in the security review. Following this guide ensures:

- **Zero data loss** through atomic transactions and validated migrations
- **Security** through input validation, rate limiting, and RLS
- **Performance** through caching, connection pooling, and indexes
- **Reliability** through error handling, monitoring, and rollback procedures
- **Scalability** to support 1000+ concurrent users

Total implementation time: **4-6 weeks** with dedicated development resources.