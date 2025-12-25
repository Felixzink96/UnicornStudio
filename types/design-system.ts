// ============================================
// DESIGN SYSTEM TYPES
// ============================================

/**
 * Das Design System enthält alle wiederverwendbaren
 * Komponenten-Styles für eine Site.
 *
 * Die KI generiert diese beim Site-Setup basierend auf:
 * - Gewähltem Archetyp (Craftsman, Innovator, etc.)
 * - Design Tokens (Farben, Fonts)
 * - Branche und Stil
 *
 * Die Werte sind Tailwind-Klassen-Strings.
 */
export interface SiteDesignSystem {
  id: string
  site_id: string

  // Buttons
  button_primary: string      // z.B. "bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors font-medium"
  button_secondary: string    // z.B. "border-2 border-primary text-primary px-6 py-3 rounded-lg hover:bg-primary hover:text-white transition-colors"
  button_cta: string          // z.B. "bg-accent text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
  button_ghost: string        // z.B. "text-foreground hover:text-primary px-4 py-2 transition-colors"
  button_link: string         // z.B. "text-primary hover:text-primary-hover underline underline-offset-4 transition-colors"

  // Form Elements
  input: string               // z.B. "w-full px-4 py-3 border border-border rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
  textarea: string            // z.B. "w-full px-4 py-3 border border-border rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px] resize-y"
  select_field: string        // z.B. "w-full px-4 py-3 border border-border rounded-lg bg-background focus:border-primary outline-none transition-all appearance-none"
  checkbox: string            // z.B. "w-5 h-5 border-2 border-border rounded text-primary focus:ring-primary"
  label: string               // z.B. "block text-sm font-medium text-foreground mb-1"

  // Cards & Containers
  card: string                // z.B. "bg-muted rounded-xl p-6 border border-border"
  card_hover: string          // z.B. "bg-muted rounded-xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all"
  section_padding: string     // z.B. "py-20 md:py-28 lg:py-32"
  container: string           // z.B. "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

  // Typography
  heading_1: string           // z.B. "text-4xl md:text-5xl lg:text-6xl font-heading font-bold tracking-tight"
  heading_2: string           // z.B. "text-3xl md:text-4xl font-heading font-bold"
  heading_3: string           // z.B. "text-2xl md:text-3xl font-heading font-semibold"
  heading_4: string           // z.B. "text-xl md:text-2xl font-heading font-semibold"
  body_text: string           // z.B. "text-base md:text-lg text-foreground/80 leading-relaxed"
  small_text: string          // z.B. "text-sm text-foreground/60"
  link_style: string          // z.B. "text-primary hover:text-primary-hover transition-colors"

  // Layout Elements
  badge: string               // z.B. "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
  divider: string             // z.B. "w-full h-px bg-border"
  overlay: string             // z.B. "absolute inset-0 bg-black/50"

  // Special Elements
  icon_wrapper: string        // z.B. "w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
  image_wrapper: string       // z.B. "overflow-hidden rounded-xl"

  // Metadata
  archetyp: string | null     // z.B. "craftsman", "innovator", etc.
  generated_at: string | null
  updated_at: string | null
  created_at: string | null
}

/**
 * Für die AI-Generierung - nur die Style-Felder
 */
export interface DesignSystemStyles {
  // Buttons
  button_primary: string
  button_secondary: string
  button_cta: string
  button_ghost: string
  button_link: string

  // Form Elements
  input: string
  textarea: string
  select_field: string
  checkbox: string
  label: string

  // Cards & Containers
  card: string
  card_hover: string
  section_padding: string
  container: string

  // Typography
  heading_1: string
  heading_2: string
  heading_3: string
  heading_4: string
  body_text: string
  small_text: string
  link_style: string

  // Layout Elements
  badge: string
  divider: string
  overlay: string

  // Special Elements
  icon_wrapper: string
  image_wrapper: string

  // Metadata
  archetyp: string
}

/**
 * Input für die AI Design System Generierung
 */
export interface DesignSystemGenerationInput {
  archetyp: string
  industry: string
  style: string
  colors: {
    primary: string
    primaryHover: string
    secondary: string
    accent: string
    background: string
    foreground: string
    muted: string
    border: string
  }
  fonts: {
    heading: string
    body: string
  }
}

/**
 * Die Archetypen für das Design System
 */
export type DesignArchetyp =
  | 'architect'
  | 'innovator'
  | 'brutalist'
  | 'organic'
  | 'craftsman'
  | 'minimal'
  | 'luxe'
  | 'bold'
  | 'warm'
  | 'clinical'
  | 'dynamic'
  | 'editorial'
  | 'playful'
  | 'vintage'
  | 'corporate'
