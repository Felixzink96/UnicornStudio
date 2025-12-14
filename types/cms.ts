// ============================================
// CMS TYPES
// Content Types, Fields, Entries, Taxonomies, SEO
// ============================================

// ============================================
// CONTENT TYPES
// ============================================

export interface ContentType {
  id: string
  site_id: string

  // Naming
  name: string                    // "rezept" (slug, lowercase)
  label_singular: string          // "Rezept"
  label_plural: string            // "Rezepte"
  slug: string                    // "rezepte" (für URLs)

  // UI
  icon: string                    // Lucide icon name
  description: string | null
  color: string | null            // Accent color

  // Features
  has_title: boolean
  has_slug: boolean
  has_content: boolean            // Rich Text Editor
  has_excerpt: boolean
  has_featured_image: boolean
  has_author: boolean
  has_published_date: boolean
  has_seo: boolean

  // Archive/Single Pages
  has_archive: boolean
  has_single: boolean

  // Sorting
  default_sort_field: string
  default_sort_order: 'asc' | 'desc'

  // Menu
  menu_position: number
  show_in_menu: boolean

  // SEO Template
  seo_template: SEOTemplate | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface ContentTypeInsert {
  site_id: string
  name: string
  label_singular: string
  label_plural: string
  slug: string
  icon?: string
  description?: string
  color?: string
  has_title?: boolean
  has_slug?: boolean
  has_content?: boolean
  has_excerpt?: boolean
  has_featured_image?: boolean
  has_author?: boolean
  has_published_date?: boolean
  has_seo?: boolean
  has_archive?: boolean
  has_single?: boolean
  default_sort_field?: string
  default_sort_order?: 'asc' | 'desc'
  menu_position?: number
  show_in_menu?: boolean
  seo_template?: SEOTemplate
}

export interface ContentTypeUpdate extends Partial<ContentTypeInsert> {
  id: string
}

// ============================================
// FIELDS
// ============================================

export type FieldType =
  // Text
  | 'text'
  | 'textarea'
  | 'richtext'
  // Numbers
  | 'number'
  | 'range'
  // Media
  | 'image'
  | 'gallery'
  | 'file'
  | 'video'
  // Choice
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  // Date & Time
  | 'date'
  | 'datetime'
  | 'time'
  // Special
  | 'color'
  | 'link'
  | 'email'
  | 'url'
  // Relational
  | 'relation'
  | 'taxonomy'
  // Structured
  | 'group'
  | 'repeater'
  | 'flexible'

export type FieldWidth = '100%' | '50%' | '33%' | '25%'

export interface FieldSettings {
  // Text settings
  placeholder?: string
  maxLength?: number
  prefix?: string
  suffix?: string
  rows?: number
  toolbar?: string[]

  // Number settings
  min?: number
  max?: number
  step?: number

  // Media settings
  allowedTypes?: string[]
  maxSize?: number
  minImages?: number
  maxImages?: number
  sources?: string[]

  // Choice settings
  options?: { value: string; label: string }[]
  multiple?: boolean
  searchable?: boolean
  layout?: 'vertical' | 'horizontal'
  labelOn?: string
  labelOff?: string

  // Date/Time settings
  format?: string

  // Color settings
  // format already covered above

  // Relational settings
  contentType?: string
  taxonomy?: string
  createNew?: boolean

  // Repeater settings
  minRows?: number
  maxRows?: number
  buttonLabel?: string
}

export interface SubField {
  name: string
  label: string
  type: FieldType
  instructions?: string
  placeholder?: string
  required?: boolean
  settings?: FieldSettings
  width?: FieldWidth
}

export interface FlexibleLayout {
  name: string
  label: string
  subFields: SubField[]
}

export interface FieldCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'empty' | 'not_empty'
  value?: string | number | boolean
}

export interface Field {
  id: string
  site_id: string
  content_type_id: string

  // Field Definition
  name: string                    // "preis" (key)
  label: string                   // "Preis"
  type: FieldType

  // Help
  instructions: string | null
  placeholder: string | null

  // Validation
  required: boolean

  // Type-specific settings
  settings: FieldSettings

  // For group/repeater: Sub-Fields
  sub_fields: SubField[] | null

  // For flexible content: Layouts
  layouts: FlexibleLayout[] | null

  // Conditional Logic
  conditions: FieldCondition[] | null

  // Layout
  width: FieldWidth

  // Position
  position: number

  // Timestamps
  created_at: string
  updated_at: string
}

export interface FieldInsert {
  site_id: string
  content_type_id: string
  name: string
  label: string
  type: FieldType
  instructions?: string
  placeholder?: string
  required?: boolean
  settings?: FieldSettings
  sub_fields?: SubField[]
  layouts?: FlexibleLayout[]
  conditions?: FieldCondition[]
  width?: FieldWidth
  position?: number
}

export interface FieldUpdate extends Partial<FieldInsert> {
  id: string
}

// ============================================
// ENTRIES
// ============================================

export type EntryStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export interface Entry {
  id: string
  site_id: string
  content_type_id: string

  // Standard Fields
  title: string | null
  slug: string | null
  content: string | null          // HTML wenn has_content
  excerpt: string | null

  // Custom Field Values
  data: Record<string, unknown>

  // Featured Image
  featured_image_id: string | null

  // Status
  status: EntryStatus
  published_at: string | null
  scheduled_at: string | null

  // Author
  author_id: string | null

  // SEO
  seo: EntrySEO

  // Timestamps
  created_at: string
  updated_at: string
}

export interface EntryInsert {
  site_id: string
  content_type_id: string
  title?: string
  slug?: string
  content?: string
  excerpt?: string
  data?: Record<string, unknown>
  featured_image_id?: string
  status?: EntryStatus
  published_at?: string
  scheduled_at?: string
  author_id?: string
  seo?: EntrySEO
}

export interface EntryUpdate extends Partial<EntryInsert> {
  id: string
}

// Entry with relations for display
export interface EntryWithRelations extends Entry {
  content_type?: ContentType
  author?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  featured_image?: {
    id: string
    file_url: string
    alt_text: string | null
  }
  terms?: Term[]
}

// ============================================
// TAXONOMIES
// ============================================

export interface Taxonomy {
  id: string
  site_id: string

  name: string                    // "kategorie"
  label_singular: string          // "Kategorie"
  label_plural: string            // "Kategorien"
  slug: string

  hierarchical: boolean | null    // true = Parent/Child möglich

  // Which content types use this?
  content_type_ids: string[] | null

  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface TaxonomyInsert {
  site_id: string
  name: string
  label_singular: string
  label_plural: string
  slug: string
  hierarchical?: boolean
  content_type_ids?: string[]
}

export interface TaxonomyUpdate extends Partial<TaxonomyInsert> {
  id: string
}

// ============================================
// TERMS
// ============================================

export interface Term {
  id: string
  taxonomy_id: string

  name: string
  slug: string
  description: string | null

  parent_id: string | null

  image_id: string | null
  data: Record<string, unknown>

  position: number

  // Timestamps
  created_at: string
  updated_at: string
}

export interface TermInsert {
  taxonomy_id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  image_id?: string
  data?: Record<string, unknown>
  position?: number
}

export interface TermUpdate extends Partial<TermInsert> {
  id: string
}

// Term with children for hierarchical display
export interface TermWithChildren extends Term {
  children?: TermWithChildren[]
}

// ============================================
// CMS COMPONENTS
// ============================================

export type CMSComponentType = 'element' | 'block' | 'section' | 'layout'

export interface ComponentProp {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'color' | 'image' | 'select' | 'richtext'
  default_value?: string | number | boolean
  options?: { value: string; label: string }[]
  required?: boolean
}

export interface ComponentVariant {
  name: string
  label: string
  html: string
}

export interface CMSComponent {
  id: string
  site_id: string

  // Meta
  name: string
  description: string | null

  // Categorization
  type: CMSComponentType
  category: string | null
  tags: string[] | null

  // Code
  html: string

  // Variants
  variants: ComponentVariant[] | null
  default_variant: string | null

  // Props
  props: ComponentProp[] | null

  // Preview
  thumbnail_url: string | null

  // Usage
  usage_count: number | null

  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface CMSComponentInsert {
  site_id: string
  name: string
  description?: string | null
  type: CMSComponentType
  category?: string | null
  tags?: string[] | null
  html: string
  variants?: ComponentVariant[]
  default_variant?: string
  props?: ComponentProp[]
  thumbnail_url?: string | null
}

export interface CMSComponentUpdate extends Partial<Omit<CMSComponentInsert, 'site_id'>> {}

// ============================================
// TEMPLATES
// ============================================

export type TemplateType = 'page' | 'single' | 'archive' | 'taxonomy'

export interface TemplateCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than'
  value?: string | number | boolean
}

export interface Template {
  id: string
  site_id: string

  name: string
  description: string | null

  type: TemplateType

  // Content
  html: string

  // Conditions
  conditions: TemplateCondition[] | null

  priority: number | null
  is_default: boolean | null

  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface TemplateInsert {
  site_id: string
  name: string
  description?: string | null
  type: TemplateType
  html: string
  conditions?: TemplateCondition[] | null
  priority?: number
  is_default?: boolean
}

export interface TemplateUpdate extends Partial<Omit<TemplateInsert, 'site_id'>> {}

// ============================================
// DESIGN VARIABLES
// ============================================

export interface DesignVariables {
  id: string
  site_id: string

  colors: {
    brand: {
      primary: string
      secondary: string
      accent: string
      [key: string]: string
    }
    semantic: {
      success: string
      warning: string
      error: string
      info: string
      [key: string]: string
    }
    neutral: {
      [key: string]: string
    }
  }

  typography: {
    fontHeading: string
    fontBody: string
    fontMono: string
    fontSizes: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
      '4xl': string
      '5xl': string
      [key: string]: string
    }
    fontWeights: {
      light: string
      normal: string
      medium: string
      semibold: string
      bold: string
      [key: string]: string
    }
    lineHeights: {
      tight: string
      normal: string
      relaxed: string
      [key: string]: string
    }
  }

  spacing: {
    scale: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
      [key: string]: string
    }
    containerWidths: {
      sm: string
      md: string
      lg: string
      xl: string
      '2xl': string
      [key: string]: string
    }
  }

  borders: {
    radius: {
      none: string
      sm: string
      md: string
      lg: string
      xl: string
      '2xl': string
      full: string
      [key: string]: string
    }
    widths: {
      thin: string
      medium: string
      thick: string
      [key: string]: string
    }
  }

  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    [key: string]: string
  }

  // Gradients
  gradients?: {
    [key: string]: {
      from: string
      to: string
      via?: string // Optional middle color
      direction: 'to-r' | 'to-br' | 'to-b' | 'to-bl' | 'to-l' | 'to-tl' | 'to-t' | 'to-tr'
      enabled: boolean
    }
  }

  // Custom Colors (zusätzlich zu den Standard-Farben)
  customColors?: {
    [key: string]: string
  }

  // Timestamps
  created_at: string
  updated_at: string
}

export interface DesignVariablesUpdate {
  site_id: string
  colors?: Partial<DesignVariables['colors']>
  typography?: Partial<DesignVariables['typography']>
  spacing?: Partial<DesignVariables['spacing']>
  borders?: Partial<DesignVariables['borders']>
  shadows?: Partial<DesignVariables['shadows']>
  gradients?: DesignVariables['gradients']
  customColors?: DesignVariables['customColors']
}

// ============================================
// SEO TYPES
// ============================================

export interface SEOTemplate {
  title_pattern?: string
  description_pattern?: string
  schema_type?: string
}

export interface EntrySEO {
  // Basic Meta
  meta_title?: string
  meta_description?: string

  // Open Graph
  og_title?: string
  og_description?: string
  og_image?: string
  og_type?: string

  // Twitter
  twitter_card?: 'summary' | 'summary_large_image'
  twitter_title?: string
  twitter_description?: string
  twitter_image?: string

  // Robots
  robots_index?: boolean
  robots_follow?: boolean
  robots_advanced?: string[]

  // Canonical & Redirects
  canonical_url?: string
  redirect_url?: string
  redirect_type?: '301' | '302'

  // Schema
  schema_type?: string
  schema_data?: Record<string, unknown>

  // Analysis
  focus_keyword?: string
}

export interface GlobalSEOSettings {
  site_name: string
  title_separator: string
  title_format: string
  default_meta_description: string
  default_og_image: string | null

  favicon: string | null
  apple_touch_icon: string | null

  google_verification: string | null
  bing_verification: string | null

  google_analytics_id: string | null
  google_tag_manager_id: string | null
  facebook_pixel_id: string | null

  custom_scripts_head: string
  custom_scripts_body: string

  robots_txt: string
  sitemap_enabled: boolean

  social_profiles: {
    facebook: string | null
    twitter: string | null
    instagram: string | null
    linkedin: string | null
    youtube: string | null
  }

  local_business: {
    enabled: boolean
    type: string
    name: string
    address: {
      street: string
      city: string
      postal_code: string
      country: string
    }
    phone: string
    email: string
    geo?: { lat: number; lng: number }
  } | null
}

// ============================================
// SCHEMA TYPES
// ============================================

export const SCHEMA_TYPES = {
  Article: {
    label: 'Artikel',
    fields: ['author', 'datePublished', 'headline', 'image'],
  },
  BlogPosting: {
    label: 'Blog Post',
    fields: ['author', 'datePublished', 'headline', 'image'],
  },
  Product: {
    label: 'Produkt',
    fields: ['name', 'description', 'image', 'sku', 'brand', 'price', 'currency', 'availability'],
  },
  Recipe: {
    label: 'Rezept',
    fields: ['name', 'image', 'prepTime', 'cookTime', 'totalTime', 'recipeYield',
             'recipeCategory', 'recipeCuisine', 'recipeIngredient', 'recipeInstructions'],
  },
  Event: {
    label: 'Event',
    fields: ['name', 'startDate', 'endDate', 'location', 'description', 'offers'],
  },
  FAQPage: {
    label: 'FAQ',
    fields: ['mainEntity'],
  },
  HowTo: {
    label: 'Anleitung',
    fields: ['name', 'description', 'step', 'totalTime'],
  },
  Person: {
    label: 'Person',
    fields: ['name', 'image', 'jobTitle', 'worksFor'],
  },
  LocalBusiness: {
    label: 'Lokales Unternehmen',
    fields: ['name', 'address', 'telephone', 'openingHours', 'geo'],
  },
} as const

export type SchemaType = keyof typeof SCHEMA_TYPES
