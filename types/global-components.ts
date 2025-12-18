// ============================================
// GLOBAL COMPONENTS SYSTEM - TYPES
// ============================================

export type ComponentPosition = 'header' | 'footer' | 'content';

// ============================================
// GLOBAL COMPONENT
// ============================================

export interface GlobalComponent {
  id: string;
  site_id: string;
  name: string;
  description?: string | null;
  category?: string | null;

  // Content
  html: string | null;
  css?: string | null;
  js?: string | null;

  // Legacy (für Kompatibilität)
  content?: Record<string, unknown>;

  // Global Settings
  is_global: boolean;
  auto_include: boolean;
  position: ComponentPosition;

  // Stats
  usage_count: number;
  thumbnail_url?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface GlobalComponentInsert {
  site_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  html: string;
  css?: string | null;
  js?: string | null;
  is_global?: boolean;
  auto_include?: boolean;
  position?: ComponentPosition;
  thumbnail_url?: string | null;
}

export interface GlobalComponentUpdate {
  name?: string;
  description?: string | null;
  category?: string | null;
  html?: string;
  css?: string | null;
  js?: string | null;
  is_global?: boolean;
  auto_include?: boolean;
  position?: ComponentPosition;
  thumbnail_url?: string | null;
}

// ============================================
// COMPONENT USAGE TRACKING
// ============================================

export interface ComponentUsage {
  id: string;
  component_id: string;
  page_id: string;
  position_index: number;
  created_at: string;
}

// ============================================
// PAGE WITH GLOBALS
// ============================================

export interface PageWithGlobals {
  page_id: string;
  page_name: string;
  page_slug: string;
  page_html: string | null;
  page_custom_css: string | null;
  page_settings: Record<string, unknown> | null;
  page_seo: Record<string, unknown> | null;
  hide_header: boolean;
  hide_footer: boolean;

  // Header Component
  header_id: string | null;
  header_html: string | null;
  header_css: string | null;
  header_js: string | null;

  // Footer Component
  footer_id: string | null;
  footer_html: string | null;
  footer_css: string | null;
  footer_js: string | null;
}

// ============================================
// COMPONENT LIBRARY ITEM
// ============================================

export interface ComponentLibraryItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  component_position: string;  // Renamed from 'position' (reserved word in PostgreSQL) - string from DB
  position?: string;           // Alias for backwards compatibility
  is_global: boolean;
  auto_include: boolean;
  usage_count: number;
  thumbnail_url: string | null;
  html: string | null;
  css: string | null;
  js: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// SITE WITH GLOBAL COMPONENTS
// ============================================

export interface SiteGlobalSettings {
  global_header_id: string | null;
  global_footer_id: string | null;
}

// ============================================
// PAGE COMPONENT SETTINGS
// ============================================

export interface PageComponentSettings {
  hide_header: boolean;
  hide_footer: boolean;
  custom_header_id: string | null;
  custom_footer_id: string | null;
}

// ============================================
// AI COMPONENT DETECTION
// ============================================

export interface DetectedComponent {
  type: ComponentPosition;
  confidence: number;
  html: string;
  suggestedName: string;
}

export interface ComponentDetectionResult {
  isHeader: boolean;
  isFooter: boolean;
  confidence: number;
  indicators: string[];
}

// ============================================
// CREATE COMPONENT REQUEST
// ============================================

export interface CreateGlobalComponentRequest {
  site_id: string;
  name: string;
  html: string;
  css?: string;
  js?: string;
  position?: ComponentPosition;
  description?: string;
  category?: string;
  set_as_site_default?: boolean;
}

// ============================================
// RENDERED PAGE
// ============================================

export interface RenderedPage {
  html: string;
  css: string;
  js: string;
  header?: {
    id: string;
    html: string;
  } | null;
  footer?: {
    id: string;
    html: string;
  } | null;
}

// ============================================
// COMPONENT LIBRARY FILTER
// ============================================

export interface ComponentLibraryFilter {
  position?: ComponentPosition;
  is_global?: boolean;
  category?: string;
  search?: string;
}

// ============================================
// WORDPRESS SYNC
// ============================================

export interface WordPressComponentData {
  id: string;
  name: string;
  html: string;
  css: string | null;
  js: string | null;
  position: ComponentPosition;
  is_global: boolean;
}
