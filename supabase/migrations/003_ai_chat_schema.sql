-- Migration: AI Chat Schema for Unicorn Studio v2
-- This adds chat_messages table and updates pages for HTML content

-- ============================================
-- UPDATE PAGES TABLE
-- ============================================

-- Add html_content column if not exists
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS html_content text;

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,

  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,

  -- For Assistant Messages
  generated_html text,

  -- Metadata
  model text,
  tokens_used integer,

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_page ON chat_messages(page_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_site ON chat_messages(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view chat messages for pages they have access to
CREATE POLICY "Users can view chat messages for their organization's pages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      JOIN sites s ON p.site_id = s.id
      JOIN profiles pr ON s.organization_id = pr.organization_id
      WHERE p.id = chat_messages.page_id
      AND pr.id = auth.uid()
    )
  );

-- Users can insert chat messages for pages they have access to
CREATE POLICY "Users can insert chat messages for their organization's pages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      JOIN sites s ON p.site_id = s.id
      JOIN profiles pr ON s.organization_id = pr.organization_id
      WHERE p.id = chat_messages.page_id
      AND pr.id = auth.uid()
    )
  );

-- Users can delete their own chat messages
CREATE POLICY "Users can delete chat messages for their organization's pages"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages p
      JOIN sites s ON p.site_id = s.id
      JOIN profiles pr ON s.organization_id = pr.organization_id
      WHERE p.id = chat_messages.page_id
      AND pr.id = auth.uid()
    )
  );

-- ============================================
-- PROMPT TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,
  category text,

  prompt_template text NOT NULL,
  variables jsonb,

  example_output text,
  thumbnail_url text,

  is_public boolean DEFAULT true,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_public ON prompt_templates(is_public);

-- RLS for prompt templates
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view public templates
CREATE POLICY "Anyone can view public prompt templates"
  ON prompt_templates FOR SELECT
  USING (is_public = true);

-- Users can view their organization's templates
CREATE POLICY "Users can view their organization's prompt templates"
  ON prompt_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = prompt_templates.organization_id
    )
  );

-- Users can create templates for their organization
CREATE POLICY "Users can create prompt templates for their organization"
  ON prompt_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = prompt_templates.organization_id
    )
  );
