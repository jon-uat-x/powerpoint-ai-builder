-- PowerPoint AI Builder - Initial Schema Migration
-- This migration creates the foundational database structure for the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Basic RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Organization members can view organization
CREATE POLICY "Members can view organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Organization members can view org pitchbooks
CREATE POLICY "Members can view org pitchbooks" ON pitchbooks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Organization members can create pitchbooks
CREATE POLICY "Members can create pitchbooks" ON pitchbooks
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Organization members can update pitchbooks
CREATE POLICY "Members can update pitchbooks" ON pitchbooks
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pitchbooks_updated_at BEFORE UPDATE ON pitchbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slides_updated_at BEFORE UPDATE ON slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();