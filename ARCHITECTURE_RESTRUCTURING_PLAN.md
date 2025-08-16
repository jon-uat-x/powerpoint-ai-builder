# PowerPoint AI Builder - Architecture Restructuring Plan

## Executive Summary
This document outlines the strategic restructuring plan to migrate from local file-based storage to Supabase, addressing critical architectural limitations and enabling scalability, multi-user support, and real-time collaboration.

## Current Architecture Analysis

### Major Architectural Issues

1. **Data Persistence Layer**
   - **Issue**: JSON files stored on server filesystem
   - **Impact**: No scalability, no concurrent access, data loss risk, no backup strategy
   - **Location**: `server/src/routes/pitchbooks.js`, `server/src/data/*.json`

2. **No Authentication/Authorization**
   - **Issue**: Complete absence of user management
   - **Impact**: Single-user system, no data isolation, security vulnerabilities
   - **Location**: All API endpoints are unprotected

3. **Tight Filesystem Coupling**
   - **Issue**: Direct fs operations throughout backend
   - **Impact**: Cannot deploy to serverless, difficult testing, no transaction support
   - **Location**: `server/src/routes/*.js`

4. **Client-Side State Management**
   - **Issue**: Mixed localStorage drafts with API calls
   - **Impact**: Data sync issues, potential data loss, poor UX
   - **Location**: `client/src/contexts/PitchbookContext.jsx:141,181,231`

5. **No Real-time Capabilities**
   - **Issue**: Polling-based status checks, no live updates
   - **Impact**: Poor collaboration experience, unnecessary API calls
   - **Location**: Manual status polling in client

6. **Monolithic Service Structure**
   - **Issue**: All business logic in route handlers
   - **Impact**: Poor testability, no separation of concerns, difficult to maintain

## Proposed Supabase Architecture

### Database Schema Design

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Users and Authentication (leverages Supabase Auth)
-- auth.users table is managed by Supabase

-- User profiles for additional metadata
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations for team collaboration
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Pitchbooks main table
CREATE TABLE pitchbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'standard',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('draft', 'generating', 'ready', 'archived')) DEFAULT 'draft',
  
  -- Prompt fields with scope tracking
  pitchbook_prompt TEXT,
  scoped_prompts JSONB DEFAULT '{}',
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT FALSE,
  parent_template_id UUID REFERENCES pitchbooks(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pitchbook sections
CREATE TABLE pitchbook_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pitchbook_id UUID REFERENCES pitchbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  number_of_slides INTEGER DEFAULT 1,
  section_prompt TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pitchbook_id, order_index)
);

-- Slides table
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pitchbook_id UUID REFERENCES pitchbooks(id) ON DELETE CASCADE,
  section_id UUID REFERENCES pitchbook_sections(id) ON DELETE SET NULL,
  
  slide_number INTEGER NOT NULL,
  layout_name TEXT NOT NULL,
  slide_type TEXT,
  
  -- Slide-specific prompts
  slide_prompt TEXT,
  slide_prompt_scoped JSONB,
  
  -- Generated content
  generated_content JSONB,
  thumbnail_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pitchbook_id, slide_number)
);

-- Placeholder prompts (granular level)
CREATE TABLE placeholder_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  placeholder_id TEXT NOT NULL,
  prompt_text TEXT,
  
  -- Scoping information
  scope TEXT CHECK (scope IN ('placeholder', 'slide', 'section', 'pitchbook')),
  applies_to TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slide_id, placeholder_id)
);

-- Templates library
CREATE TABLE layout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  xml_content TEXT,
  placeholders JSONB,
  default_prompts JSONB,
  thumbnail_data TEXT,
  category TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history for collaboration
CREATE TABLE pitchbook_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pitchbook_id UUID REFERENCES pitchbooks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pitchbook_id, version_number)
);

-- Activity log for audit trail
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  pitchbook_id UUID REFERENCES pitchbooks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time collaboration presence
CREATE TABLE collaboration_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pitchbook_id UUID REFERENCES pitchbooks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  cursor_position JSONB,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pitchbook_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_pitchbooks_org ON pitchbooks(organization_id);
CREATE INDEX idx_pitchbooks_created_by ON pitchbooks(created_by);
CREATE INDEX idx_slides_pitchbook ON slides(pitchbook_id);
CREATE INDEX idx_slides_section ON slides(section_id);
CREATE INDEX idx_placeholder_slide ON placeholder_prompts(slide_id);
CREATE INDEX idx_activity_logs_pitchbook ON activity_logs(pitchbook_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitchbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitchbook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE placeholder_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitchbook_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples - need refinement based on requirements)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Organization members can view org pitchbooks" ON pitchbooks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_pitchbooks_updated_at 
  BEFORE UPDATE ON pitchbooks
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_slides_updated_at 
  BEFORE UPDATE ON slides
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

## Component Restructuring Plan

### Components to Rewrite Completely

1. **Backend Data Layer** (`server/src/routes/*.js`)
   - Replace file system operations with Supabase client
   - Implement proper service layer pattern
   - Add authentication middleware
   - Implement RLS-aware queries

2. **Authentication System** (NEW)
   - Implement Supabase Auth integration
   - Create auth context and hooks
   - Add protected routes
   - Implement session management

3. **Real-time Collaboration** (NEW)
   - Implement Supabase Realtime subscriptions
   - Create presence tracking
   - Add live cursor tracking
   - Implement conflict resolution

### Components to Refactor

1. **PitchbookContext** (`client/src/contexts/PitchbookContext.jsx`)
   - Remove localStorage operations
   - Add Supabase client integration
   - Implement optimistic updates
   - Add real-time subscriptions

2. **API Service Layer** (`client/src/services/api.js`)
   - Replace axios with Supabase client
   - Add authentication headers
   - Implement retry logic
   - Add offline support

3. **State Management**
   - Migrate to Zustand or Redux Toolkit
   - Implement normalized state structure
   - Add caching layer
   - Handle offline state

### New Components to Create

1. **Database Service Layer**
   ```javascript
   // server/src/services/database/
   - pitchbookService.js
   - slideService.js
   - templateService.js
   - organizationService.js
   - collaborationService.js
   ```

2. **Authentication Components**
   ```javascript
   // client/src/components/auth/
   - LoginForm.jsx
   - SignupForm.jsx
   - ForgotPassword.jsx
   - AuthGuard.jsx
   ```

3. **Collaboration Components**
   ```javascript
   // client/src/components/collaboration/
   - PresenceIndicator.jsx
   - LiveCursor.jsx
   - CollaboratorsList.jsx
   - ConflictResolver.jsx
   ```

## Phased Implementation Approach

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up Supabase infrastructure and authentication

1. **Database Setup**
   - Deploy schema to Supabase
   - Configure RLS policies
   - Set up backup strategy
   - Create migration scripts

2. **Authentication Integration**
   - Implement Supabase Auth
   - Create login/signup flows
   - Add session management
   - Implement protected routes

3. **Basic CRUD Migration**
   - Create database service layer
   - Migrate pitchbook CRUD
   - Update API endpoints
   - Maintain backward compatibility

**Deliverables**: Working auth system, basic CRUD via Supabase

### Phase 2: Data Migration (Week 3)
**Goal**: Migrate existing data and remove file system dependency

1. **Data Migration Scripts**
   - Create migration tools
   - Validate data integrity
   - Implement rollback strategy
   - Test migration process

2. **Remove File System Operations**
   - Replace fs operations with Supabase
   - Update all route handlers
   - Implement proper error handling
   - Add transaction support

3. **Client Integration**
   - Update PitchbookContext
   - Remove localStorage usage
   - Implement Supabase client
   - Add loading states

**Deliverables**: All data in Supabase, no file system dependency

### Phase 3: Real-time Features (Week 4-5)
**Goal**: Add collaboration and real-time capabilities

1. **Real-time Subscriptions**
   - Implement presence tracking
   - Add live updates
   - Create collaboration UI
   - Handle connection states

2. **Optimistic Updates**
   - Implement client-side cache
   - Add optimistic UI updates
   - Handle conflict resolution
   - Implement retry logic

3. **Performance Optimization**
   - Add database indexes
   - Implement query optimization
   - Add caching layer
   - Optimize bundle size

**Deliverables**: Real-time collaboration, optimized performance

### Phase 4: Advanced Features (Week 6)
**Goal**: Add enterprise features and polish

1. **Organization Management**
   - Implement teams/organizations
   - Add role-based access
   - Create invitation system
   - Add billing integration

2. **Version Control**
   - Implement version history
   - Add diff visualization
   - Create rollback mechanism
   - Add audit logging

3. **Advanced Collaboration**
   - Add commenting system
   - Implement mentions
   - Create notification system
   - Add activity feed

**Deliverables**: Enterprise-ready features

## Migration Checklist

### Backend Changes
- [ ] Create Supabase service layer
- [ ] Implement authentication middleware
- [ ] Migrate all CRUD operations
- [ ] Remove file system dependencies
- [ ] Add proper error handling
- [ ] Implement logging and monitoring
- [ ] Add rate limiting
- [ ] Create API documentation

### Frontend Changes
- [ ] Integrate Supabase client
- [ ] Implement auth context
- [ ] Update all API calls
- [ ] Remove localStorage usage
- [ ] Add real-time subscriptions
- [ ] Implement error boundaries
- [ ] Add loading/error states
- [ ] Create offline support

### Database Changes
- [ ] Deploy schema
- [ ] Configure RLS policies
- [ ] Create indexes
- [ ] Set up backups
- [ ] Implement monitoring
- [ ] Add performance tracking
- [ ] Create maintenance procedures

### DevOps Changes
- [ ] Update environment variables
- [ ] Configure Supabase project
- [ ] Set up CI/CD pipeline
- [ ] Add monitoring/alerting
- [ ] Create backup strategy
- [ ] Implement rollback procedures
- [ ] Add performance monitoring

## Risk Mitigation

1. **Data Loss Prevention**
   - Maintain backup of JSON files
   - Implement gradual migration
   - Add data validation checks
   - Create rollback procedures

2. **Performance Issues**
   - Profile database queries
   - Implement caching strategy
   - Add connection pooling
   - Monitor API response times

3. **User Disruption**
   - Maintain backward compatibility
   - Implement feature flags
   - Create migration notifications
   - Provide fallback options

## Success Metrics

- Zero data loss during migration
- < 200ms average API response time
- 99.9% uptime
- Support for 100+ concurrent users
- < 3 second initial page load
- Real-time updates < 100ms latency

## Next Steps

1. Review and approve plan
2. Set up Supabase project
3. Begin Phase 1 implementation
4. Create detailed technical specifications
5. Set up monitoring and alerting
6. Schedule stakeholder updates