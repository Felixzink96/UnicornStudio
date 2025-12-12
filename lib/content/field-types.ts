import {
  Type,
  AlignLeft,
  FileText,
  Hash,
  SlidersHorizontal,
  Image,
  Images,
  File,
  Video,
  ChevronDown,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  Calendar,
  CalendarClock,
  Clock,
  Palette,
  ExternalLink,
  Mail,
  Link,
  Link2,
  Tags,
  Folder,
  ListPlus,
  Layers,
  LucideIcon,
} from 'lucide-react'
import { FieldType, FieldSettings } from '@/types/cms'

// ============================================
// FIELD TYPE CONFIGURATION
// ============================================

export interface FieldSettingConfig {
  name: keyof FieldSettings
  type: 'text' | 'number' | 'toggle' | 'select' | 'multiselect' | 'options-builder' | 'content-type-select' | 'taxonomy-select'
  label: string
  default?: unknown
  options?: { value: string; label: string }[]
}

export interface FieldTypeConfig {
  label: string
  icon: LucideIcon
  description: string
  category: 'text' | 'numbers' | 'media' | 'choice' | 'datetime' | 'special' | 'relational' | 'structured'
  settings: FieldSettingConfig[]
  defaultValue: unknown
  hasSubFields?: boolean
  hasLayouts?: boolean
}

export const FIELD_TYPES: Record<FieldType, FieldTypeConfig> = {
  // ════════════════════════════════════════════════════════════════
  // TEXT
  // ════════════════════════════════════════════════════════════════
  text: {
    label: 'Text',
    icon: Type,
    description: 'Einzeiliges Textfeld',
    category: 'text',
    settings: [
      { name: 'placeholder', type: 'text', label: 'Placeholder' },
      { name: 'maxLength', type: 'number', label: 'Max. Zeichen' },
      { name: 'prefix', type: 'text', label: 'Prefix' },
      { name: 'suffix', type: 'text', label: 'Suffix' },
    ],
    defaultValue: '',
  },

  textarea: {
    label: 'Textarea',
    icon: AlignLeft,
    description: 'Mehrzeiliges Textfeld',
    category: 'text',
    settings: [
      { name: 'placeholder', type: 'text', label: 'Placeholder' },
      { name: 'rows', type: 'number', label: 'Zeilen', default: 4 },
      { name: 'maxLength', type: 'number', label: 'Max. Zeichen' },
    ],
    defaultValue: '',
  },

  richtext: {
    label: 'Rich Text',
    icon: FileText,
    description: 'WYSIWYG Editor',
    category: 'text',
    settings: [
      {
        name: 'toolbar',
        type: 'multiselect',
        label: 'Toolbar',
        options: [
          { value: 'bold', label: 'Fett' },
          { value: 'italic', label: 'Kursiv' },
          { value: 'underline', label: 'Unterstrichen' },
          { value: 'link', label: 'Link' },
          { value: 'list', label: 'Liste' },
          { value: 'heading', label: 'Überschriften' },
          { value: 'image', label: 'Bilder' },
          { value: 'quote', label: 'Zitat' },
        ],
        default: ['bold', 'italic', 'link', 'list'],
      },
    ],
    defaultValue: '',
  },

  // ════════════════════════════════════════════════════════════════
  // NUMBERS
  // ════════════════════════════════════════════════════════════════
  number: {
    label: 'Zahl',
    icon: Hash,
    description: 'Numerisches Feld',
    category: 'numbers',
    settings: [
      { name: 'min', type: 'number', label: 'Minimum' },
      { name: 'max', type: 'number', label: 'Maximum' },
      { name: 'step', type: 'number', label: 'Schritte', default: 1 },
      { name: 'prefix', type: 'text', label: 'Prefix (z.B. €)' },
      { name: 'suffix', type: 'text', label: 'Suffix (z.B. kg)' },
    ],
    defaultValue: null,
  },

  range: {
    label: 'Slider',
    icon: SlidersHorizontal,
    description: 'Slider für Zahlenbereiche',
    category: 'numbers',
    settings: [
      { name: 'min', type: 'number', label: 'Minimum', default: 0 },
      { name: 'max', type: 'number', label: 'Maximum', default: 100 },
      { name: 'step', type: 'number', label: 'Schritte', default: 1 },
    ],
    defaultValue: 50,
  },

  // ════════════════════════════════════════════════════════════════
  // MEDIA
  // ════════════════════════════════════════════════════════════════
  image: {
    label: 'Bild',
    icon: Image,
    description: 'Einzelnes Bild',
    category: 'media',
    settings: [
      {
        name: 'allowedTypes',
        type: 'multiselect',
        label: 'Erlaubte Formate',
        options: [
          { value: 'jpg', label: 'JPG' },
          { value: 'jpeg', label: 'JPEG' },
          { value: 'png', label: 'PNG' },
          { value: 'gif', label: 'GIF' },
          { value: 'webp', label: 'WebP' },
          { value: 'svg', label: 'SVG' },
        ],
        default: ['jpg', 'jpeg', 'png', 'webp'],
      },
      { name: 'maxSize', type: 'number', label: 'Max. Größe (MB)', default: 5 },
    ],
    defaultValue: null,
  },

  gallery: {
    label: 'Galerie',
    icon: Images,
    description: 'Mehrere Bilder',
    category: 'media',
    settings: [
      { name: 'minImages', type: 'number', label: 'Min. Bilder' },
      { name: 'maxImages', type: 'number', label: 'Max. Bilder' },
    ],
    defaultValue: [],
  },

  file: {
    label: 'Datei',
    icon: File,
    description: 'Datei-Upload',
    category: 'media',
    settings: [
      {
        name: 'allowedTypes',
        type: 'multiselect',
        label: 'Erlaubte Formate',
        options: [
          { value: 'pdf', label: 'PDF' },
          { value: 'doc', label: 'DOC' },
          { value: 'docx', label: 'DOCX' },
          { value: 'xls', label: 'XLS' },
          { value: 'xlsx', label: 'XLSX' },
          { value: 'zip', label: 'ZIP' },
        ],
        default: ['pdf'],
      },
      { name: 'maxSize', type: 'number', label: 'Max. Größe (MB)', default: 10 },
    ],
    defaultValue: null,
  },

  video: {
    label: 'Video',
    icon: Video,
    description: 'Video URL oder Upload',
    category: 'media',
    settings: [
      {
        name: 'sources',
        type: 'multiselect',
        label: 'Erlaubte Quellen',
        options: [
          { value: 'youtube', label: 'YouTube' },
          { value: 'vimeo', label: 'Vimeo' },
          { value: 'upload', label: 'Upload' },
          { value: 'url', label: 'URL' },
        ],
        default: ['youtube', 'vimeo'],
      },
    ],
    defaultValue: null,
  },

  // ════════════════════════════════════════════════════════════════
  // CHOICE
  // ════════════════════════════════════════════════════════════════
  select: {
    label: 'Dropdown',
    icon: ChevronDown,
    description: 'Auswahl aus Optionen',
    category: 'choice',
    settings: [
      { name: 'options', type: 'options-builder', label: 'Optionen' },
      { name: 'multiple', type: 'toggle', label: 'Mehrfachauswahl', default: false },
      { name: 'searchable', type: 'toggle', label: 'Durchsuchbar', default: false },
    ],
    defaultValue: null,
  },

  radio: {
    label: 'Radio Buttons',
    icon: CircleDot,
    description: 'Eine Option wählen',
    category: 'choice',
    settings: [
      { name: 'options', type: 'options-builder', label: 'Optionen' },
      {
        name: 'layout',
        type: 'select',
        label: 'Layout',
        options: [
          { value: 'vertical', label: 'Vertikal' },
          { value: 'horizontal', label: 'Horizontal' },
        ],
        default: 'vertical',
      },
    ],
    defaultValue: null,
  },

  checkbox: {
    label: 'Checkboxen',
    icon: CheckSquare,
    description: 'Mehrere Optionen',
    category: 'choice',
    settings: [
      { name: 'options', type: 'options-builder', label: 'Optionen' },
    ],
    defaultValue: [],
  },

  toggle: {
    label: 'Toggle',
    icon: ToggleLeft,
    description: 'An/Aus Schalter',
    category: 'choice',
    settings: [
      { name: 'labelOn', type: 'text', label: 'Label An', default: 'Ja' },
      { name: 'labelOff', type: 'text', label: 'Label Aus', default: 'Nein' },
    ],
    defaultValue: false,
  },

  // ════════════════════════════════════════════════════════════════
  // DATE & TIME
  // ════════════════════════════════════════════════════════════════
  date: {
    label: 'Datum',
    icon: Calendar,
    description: 'Datumsauswahl',
    category: 'datetime',
    settings: [
      { name: 'format', type: 'text', label: 'Format', default: 'DD.MM.YYYY' },
    ],
    defaultValue: null,
  },

  datetime: {
    label: 'Datum & Zeit',
    icon: CalendarClock,
    description: 'Datum und Uhrzeit',
    category: 'datetime',
    settings: [
      { name: 'format', type: 'text', label: 'Format', default: 'DD.MM.YYYY HH:mm' },
    ],
    defaultValue: null,
  },

  time: {
    label: 'Zeit',
    icon: Clock,
    description: 'Nur Uhrzeit',
    category: 'datetime',
    settings: [
      {
        name: 'format',
        type: 'select',
        label: 'Format',
        options: [
          { value: '24h', label: '24 Stunden' },
          { value: '12h', label: '12 Stunden' },
        ],
        default: '24h',
      },
    ],
    defaultValue: null,
  },

  // ════════════════════════════════════════════════════════════════
  // SPECIAL
  // ════════════════════════════════════════════════════════════════
  color: {
    label: 'Farbe',
    icon: Palette,
    description: 'Farbauswahl',
    category: 'special',
    settings: [
      {
        name: 'format',
        type: 'select',
        label: 'Format',
        options: [
          { value: 'hex', label: 'HEX' },
          { value: 'rgb', label: 'RGB' },
        ],
        default: 'hex',
      },
    ],
    defaultValue: null,
  },

  link: {
    label: 'Link',
    icon: ExternalLink,
    description: 'URL mit Text',
    category: 'special',
    settings: [],
    defaultValue: { url: '', text: '', target: '_self' },
  },

  email: {
    label: 'E-Mail',
    icon: Mail,
    description: 'E-Mail Adresse',
    category: 'special',
    settings: [],
    defaultValue: '',
  },

  url: {
    label: 'URL',
    icon: Link,
    description: 'Website URL',
    category: 'special',
    settings: [],
    defaultValue: '',
  },

  // ════════════════════════════════════════════════════════════════
  // RELATIONAL
  // ════════════════════════════════════════════════════════════════
  relation: {
    label: 'Beziehung',
    icon: Link2,
    description: 'Verknüpfung zu Einträgen',
    category: 'relational',
    settings: [
      { name: 'contentType', type: 'content-type-select', label: 'Content Type' },
      { name: 'multiple', type: 'toggle', label: 'Mehrfachauswahl', default: false },
    ],
    defaultValue: null,
  },

  taxonomy: {
    label: 'Taxonomie',
    icon: Tags,
    description: 'Kategorien/Tags',
    category: 'relational',
    settings: [
      { name: 'taxonomy', type: 'taxonomy-select', label: 'Taxonomie' },
      { name: 'multiple', type: 'toggle', label: 'Mehrfachauswahl', default: true },
      { name: 'createNew', type: 'toggle', label: 'Neue erstellen', default: true },
    ],
    defaultValue: [],
  },

  // ════════════════════════════════════════════════════════════════
  // STRUCTURED
  // ════════════════════════════════════════════════════════════════
  group: {
    label: 'Gruppe',
    icon: Folder,
    description: 'Felder gruppieren',
    category: 'structured',
    settings: [],
    hasSubFields: true,
    defaultValue: {},
  },

  repeater: {
    label: 'Repeater',
    icon: ListPlus,
    description: 'Wiederholbare Felder',
    category: 'structured',
    settings: [
      { name: 'minRows', type: 'number', label: 'Min. Einträge' },
      { name: 'maxRows', type: 'number', label: 'Max. Einträge' },
      { name: 'buttonLabel', type: 'text', label: 'Button Text', default: 'Eintrag hinzufügen' },
    ],
    hasSubFields: true,
    defaultValue: [],
  },

  flexible: {
    label: 'Flexible Content',
    icon: Layers,
    description: 'Verschiedene Layouts',
    category: 'structured',
    settings: [
      { name: 'buttonLabel', type: 'text', label: 'Button Text', default: 'Layout hinzufügen' },
    ],
    hasLayouts: true,
    defaultValue: [],
  },
}

// ============================================
// FIELD TYPE CATEGORIES
// ============================================

export const FIELD_TYPE_CATEGORIES = {
  text: {
    label: 'Text',
    types: ['text', 'textarea', 'richtext'],
  },
  numbers: {
    label: 'Zahlen',
    types: ['number', 'range'],
  },
  media: {
    label: 'Medien',
    types: ['image', 'gallery', 'file', 'video'],
  },
  choice: {
    label: 'Auswahl',
    types: ['select', 'radio', 'checkbox', 'toggle'],
  },
  datetime: {
    label: 'Datum & Zeit',
    types: ['date', 'datetime', 'time'],
  },
  special: {
    label: 'Speziell',
    types: ['color', 'link', 'email', 'url'],
  },
  relational: {
    label: 'Verknüpfungen',
    types: ['relation', 'taxonomy'],
  },
  structured: {
    label: 'Strukturiert',
    types: ['group', 'repeater', 'flexible'],
  },
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the configuration for a field type
 */
export function getFieldTypeConfig(type: FieldType): FieldTypeConfig {
  return FIELD_TYPES[type]
}

/**
 * Get the default value for a field type
 */
export function getDefaultValue(type: FieldType): unknown {
  return FIELD_TYPES[type].defaultValue
}

/**
 * Get all field types grouped by category
 */
export function getFieldTypesByCategory(): Record<string, FieldType[]> {
  const result: Record<string, FieldType[]> = {}

  for (const [category, config] of Object.entries(FIELD_TYPE_CATEGORIES)) {
    result[category] = [...config.types] as FieldType[]
  }

  return result
}

/**
 * Check if a field type supports sub-fields
 */
export function hasSubFields(type: FieldType): boolean {
  return FIELD_TYPES[type].hasSubFields ?? false
}

/**
 * Check if a field type supports layouts (flexible content)
 */
export function hasLayouts(type: FieldType): boolean {
  return FIELD_TYPES[type].hasLayouts ?? false
}

/**
 * Generate a field name from a label
 */
export function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Validate a field value against its type and settings
 */
export function validateFieldValue(
  value: unknown,
  type: FieldType,
  required: boolean,
  settings: FieldSettings
): { valid: boolean; error?: string } {
  // Check required
  if (required) {
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: 'Dieses Feld ist erforderlich' }
    }
    if (Array.isArray(value) && value.length === 0) {
      return { valid: false, error: 'Mindestens ein Wert erforderlich' }
    }
  }

  // Type-specific validation
  switch (type) {
    case 'text':
    case 'textarea':
      if (settings.maxLength && typeof value === 'string' && value.length > settings.maxLength) {
        return { valid: false, error: `Maximal ${settings.maxLength} Zeichen erlaubt` }
      }
      break

    case 'number':
    case 'range':
      if (typeof value === 'number') {
        if (settings.min !== undefined && value < settings.min) {
          return { valid: false, error: `Minimum ist ${settings.min}` }
        }
        if (settings.max !== undefined && value > settings.max) {
          return { valid: false, error: `Maximum ist ${settings.max}` }
        }
      }
      break

    case 'email':
      if (value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Ungültige E-Mail-Adresse' }
        }
      }
      break

    case 'url':
      if (value && typeof value === 'string') {
        try {
          new URL(value)
        } catch {
          return { valid: false, error: 'Ungültige URL' }
        }
      }
      break

    case 'gallery':
      if (Array.isArray(value)) {
        if (settings.minImages && value.length < settings.minImages) {
          return { valid: false, error: `Mindestens ${settings.minImages} Bilder erforderlich` }
        }
        if (settings.maxImages && value.length > settings.maxImages) {
          return { valid: false, error: `Maximal ${settings.maxImages} Bilder erlaubt` }
        }
      }
      break

    case 'repeater':
      if (Array.isArray(value)) {
        if (settings.minRows && value.length < settings.minRows) {
          return { valid: false, error: `Mindestens ${settings.minRows} Einträge erforderlich` }
        }
        if (settings.maxRows && value.length > settings.maxRows) {
          return { valid: false, error: `Maximal ${settings.maxRows} Einträge erlaubt` }
        }
      }
      break
  }

  return { valid: true }
}
