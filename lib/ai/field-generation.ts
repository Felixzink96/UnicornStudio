// ============================================
// AI FIELD GENERATION
// Natural Language → Field Structure
// ============================================

import type { FieldType, FieldInsert, FieldSettings, SubField } from '@/types/cms'

// Field type detection keywords
const FIELD_TYPE_KEYWORDS: Record<FieldType, string[]> = {
  text: ['text', 'name', 'titel', 'title', 'bezeichnung', 'kurztext', 'eingabe', 'feld'],
  textarea: ['beschreibung', 'description', 'langtext', 'notizen', 'notes', 'kommentar', 'bio'],
  richtext: ['inhalt', 'content', 'artikel', 'text mit formatierung', 'rich text', 'editor', 'html'],
  number: ['nummer', 'number', 'zahl', 'anzahl', 'menge', 'preis', 'price', 'kosten', 'dauer', 'minuten', 'stunden', 'jahre', 'alter', 'bewertung', 'rating'],
  range: ['bereich', 'range', 'slider', 'skala'],
  image: ['bild', 'image', 'foto', 'photo', 'avatar', 'profilbild', 'logo', 'icon', 'thumbnail'],
  gallery: ['galerie', 'gallery', 'bilder', 'images', 'fotos', 'photos', 'bildergalerie'],
  file: ['datei', 'file', 'dokument', 'document', 'pdf', 'download', 'anhang', 'attachment'],
  video: ['video', 'film', 'clip', 'youtube', 'vimeo'],
  select: ['auswahl', 'select', 'dropdown', 'option', 'typ', 'type', 'kategorie', 'status', 'stufe', 'level', 'schwierigkeit', 'difficulty'],
  radio: ['radio', 'einzelauswahl', 'single choice'],
  checkbox: ['checkbox', 'mehrfachauswahl', 'multiple', 'optionen', 'features', 'eigenschaften'],
  toggle: ['toggle', 'schalter', 'an/aus', 'on/off', 'aktiv', 'active', 'verfügbar', 'available', 'empfohlen', 'featured'],
  date: ['datum', 'date', 'tag', 'day', 'geburtstag', 'birthday', 'veröffentlichung', 'published'],
  datetime: ['datum und zeit', 'datetime', 'termin', 'appointment', 'zeitpunkt'],
  time: ['zeit', 'time', 'uhrzeit', 'dauer'],
  color: ['farbe', 'color', 'farbcode'],
  link: ['link', 'url', 'website', 'webseite', 'adresse', 'social'],
  email: ['email', 'e-mail', 'mail', 'kontakt'],
  url: ['url', 'webadresse', 'homepage', 'website'],
  relation: ['beziehung', 'relation', 'verknüpfung', 'referenz', 'related', 'verbunden'],
  taxonomy: ['kategorie', 'category', 'tag', 'taxonomie', 'schlagwort', 'klassifizierung'],
  group: ['gruppe', 'group', 'zusammen', 'block', 'abschnitt', 'section', 'info', 'details', 'kontaktdaten', 'adresse', 'address', 'nährwerte', 'nutrition'],
  repeater: ['liste', 'list', 'mehrere', 'multiple', 'wiederholen', 'repeater', 'einträge', 'items', 'schritte', 'steps', 'zutaten', 'ingredients', 'team', 'mitglieder', 'members', 'faq', 'fragen', 'vorteile', 'features', 'punkte', 'skills', 'erfahrungen', 'experiences'],
  flexible: ['flexibel', 'flexible', 'dynamisch', 'dynamic', 'baukasten', 'blocks', 'module'],
}

// Common field patterns with their complete configuration
interface FieldPattern {
  keywords: string[]
  type: FieldType
  label: string
  name: string
  settings?: FieldSettings
  subFields?: SubField[]
  required?: boolean
}

const COMMON_FIELD_PATTERNS: FieldPattern[] = [
  // Rezepte
  {
    keywords: ['zutaten', 'ingredients'],
    type: 'repeater',
    label: 'Zutaten',
    name: 'zutaten',
    settings: { buttonLabel: 'Zutat hinzufügen', minRows: 1 },
    subFields: [
      { name: 'zutat', label: 'Zutat', type: 'text', required: true },
      { name: 'menge', label: 'Menge', type: 'number' },
      { name: 'einheit', label: 'Einheit', type: 'select', settings: { options: [
        { value: 'g', label: 'Gramm (g)' },
        { value: 'kg', label: 'Kilogramm (kg)' },
        { value: 'ml', label: 'Milliliter (ml)' },
        { value: 'l', label: 'Liter (l)' },
        { value: 'stueck', label: 'Stück' },
        { value: 'el', label: 'Esslöffel (EL)' },
        { value: 'tl', label: 'Teelöffel (TL)' },
        { value: 'prise', label: 'Prise' },
      ]}},
    ],
  },
  {
    keywords: ['zubereitungsschritte', 'schritte', 'anleitung', 'steps', 'instructions'],
    type: 'repeater',
    label: 'Zubereitungsschritte',
    name: 'schritte',
    settings: { buttonLabel: 'Schritt hinzufügen', minRows: 1 },
    subFields: [
      { name: 'beschreibung', label: 'Beschreibung', type: 'richtext', required: true },
      { name: 'bild', label: 'Bild (optional)', type: 'image' },
      { name: 'tipp', label: 'Tipp (optional)', type: 'text' },
    ],
  },
  {
    keywords: ['zubereitungszeit', 'zeit', 'dauer', 'time'],
    type: 'number',
    label: 'Zubereitungszeit',
    name: 'zubereitungszeit',
    settings: { suffix: 'min', min: 1 },
  },
  {
    keywords: ['schwierigkeit', 'difficulty', 'schwierigkeitsgrad', 'level'],
    type: 'select',
    label: 'Schwierigkeitsgrad',
    name: 'schwierigkeit',
    settings: { options: [
      { value: 'einfach', label: 'Einfach' },
      { value: 'mittel', label: 'Mittel' },
      { value: 'schwer', label: 'Schwer' },
    ]},
  },
  {
    keywords: ['portionen', 'servings', 'personen'],
    type: 'number',
    label: 'Portionen',
    name: 'portionen',
    settings: { min: 1, max: 50 },
  },
  {
    keywords: ['nährwerte', 'nutrition', 'kalorien', 'nährstoffe'],
    type: 'group',
    label: 'Nährwerte',
    name: 'naehrwerte',
    subFields: [
      { name: 'kalorien', label: 'Kalorien', type: 'number', settings: { suffix: 'kcal' }},
      { name: 'protein', label: 'Protein', type: 'number', settings: { suffix: 'g' }},
      { name: 'kohlenhydrate', label: 'Kohlenhydrate', type: 'number', settings: { suffix: 'g' }},
      { name: 'fett', label: 'Fett', type: 'number', settings: { suffix: 'g' }},
    ],
  },

  // Team / Personen
  {
    keywords: ['team', 'mitglieder', 'members', 'personen'],
    type: 'repeater',
    label: 'Team-Mitglieder',
    name: 'team',
    settings: { buttonLabel: 'Mitglied hinzufügen' },
    subFields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'position', label: 'Position', type: 'text' },
      { name: 'bild', label: 'Foto', type: 'image' },
      { name: 'bio', label: 'Kurz-Bio', type: 'textarea' },
      { name: 'email', label: 'E-Mail', type: 'email' },
      { name: 'linkedin', label: 'LinkedIn', type: 'url' },
    ],
  },

  // FAQ
  {
    keywords: ['faq', 'fragen', 'questions', 'häufige fragen'],
    type: 'repeater',
    label: 'FAQ',
    name: 'faq',
    settings: { buttonLabel: 'Frage hinzufügen' },
    subFields: [
      { name: 'frage', label: 'Frage', type: 'text', required: true },
      { name: 'antwort', label: 'Antwort', type: 'richtext', required: true },
    ],
  },

  // Features / Vorteile
  {
    keywords: ['vorteile', 'features', 'eigenschaften', 'benefits'],
    type: 'repeater',
    label: 'Vorteile',
    name: 'vorteile',
    settings: { buttonLabel: 'Vorteil hinzufügen' },
    subFields: [
      { name: 'titel', label: 'Titel', type: 'text', required: true },
      { name: 'beschreibung', label: 'Beschreibung', type: 'textarea' },
      { name: 'icon', label: 'Icon', type: 'text', placeholder: 'z.B. check, star, heart' },
    ],
  },

  // Kontakt / Adresse
  {
    keywords: ['adresse', 'address', 'standort', 'location', 'kontaktdaten'],
    type: 'group',
    label: 'Adresse',
    name: 'adresse',
    subFields: [
      { name: 'strasse', label: 'Straße', type: 'text' },
      { name: 'hausnummer', label: 'Hausnummer', type: 'text', width: '25%' },
      { name: 'plz', label: 'PLZ', type: 'text', width: '25%' },
      { name: 'stadt', label: 'Stadt', type: 'text', width: '50%' },
      { name: 'land', label: 'Land', type: 'text' },
    ],
  },

  // Social Links
  {
    keywords: ['social', 'social media', 'soziale medien', 'netzwerke'],
    type: 'group',
    label: 'Social Media',
    name: 'social',
    subFields: [
      { name: 'facebook', label: 'Facebook', type: 'url' },
      { name: 'instagram', label: 'Instagram', type: 'url' },
      { name: 'twitter', label: 'Twitter/X', type: 'url' },
      { name: 'linkedin', label: 'LinkedIn', type: 'url' },
      { name: 'youtube', label: 'YouTube', type: 'url' },
      { name: 'tiktok', label: 'TikTok', type: 'url' },
    ],
  },

  // Preis
  {
    keywords: ['preis', 'price', 'kosten', 'cost'],
    type: 'number',
    label: 'Preis',
    name: 'preis',
    settings: { suffix: '€', min: 0, step: 0.01 },
  },

  // Bewertung
  {
    keywords: ['bewertung', 'rating', 'sterne', 'stars'],
    type: 'range',
    label: 'Bewertung',
    name: 'bewertung',
    settings: { min: 1, max: 5, step: 0.5 },
  },

  // Lesezeit
  {
    keywords: ['lesezeit', 'reading time', 'lesedauer'],
    type: 'number',
    label: 'Lesezeit',
    name: 'lesezeit',
    settings: { suffix: 'min', min: 1 },
  },
]

/**
 * Detect field type from a keyword/description
 */
export function detectFieldType(description: string): FieldType {
  const lowerDesc = description.toLowerCase()

  // Check for exact pattern matches first
  for (const pattern of COMMON_FIELD_PATTERNS) {
    if (pattern.keywords.some(kw => lowerDesc.includes(kw))) {
      return pattern.type
    }
  }

  // Then check general keywords
  for (const [type, keywords] of Object.entries(FIELD_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      return type as FieldType
    }
  }

  // Default to text
  return 'text'
}

/**
 * Find matching field pattern
 */
export function findFieldPattern(description: string): FieldPattern | null {
  const lowerDesc = description.toLowerCase()

  for (const pattern of COMMON_FIELD_PATTERNS) {
    if (pattern.keywords.some(kw => lowerDesc.includes(kw))) {
      return pattern
    }
  }

  return null
}

/**
 * Generate slug from label
 */
export function generateFieldSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * AI Field Generation Result
 */
export interface GeneratedField {
  name: string
  label: string
  type: FieldType
  instructions?: string
  placeholder?: string
  required?: boolean
  settings?: FieldSettings
  sub_fields?: SubField[]
  width?: '100%' | '50%' | '33%' | '25%'
}

export interface FieldGenerationResult {
  fields: GeneratedField[]
  message: string
  suggestions?: string[]
}

/**
 * System prompt for field generation
 */
export const FIELD_GENERATION_SYSTEM_PROMPT = `Du bist ein Experte für Content-Strukturierung und ACF (Advanced Custom Fields).
Der User beschreibt, welche Daten er für seinen Content-Type braucht. Du analysierst die Anforderung und erstellst die optimale Feldstruktur.

## WICHTIG: STANDARD-FELDER NICHT DUPLIZIEREN!

Der Content-Type hat bereits diese STANDARD-FELDER (die du NIEMALS als ACF-Felder vorschlagen sollst):
- TITEL → bereits vorhanden als Standard-Feld
- SLUG → bereits vorhanden als URL-Slug
- INHALT / CONTENT → bereits vorhanden als Rich Text Editor (Hauptinhalt)
- AUSZUG / ZUSAMMENFASSUNG / EXCERPT → bereits vorhanden als Standard-Feld
- BEITRAGSBILD / FEATURED IMAGE → bereits vorhanden als Standard-Feld
- AUTOR / AUTHOR → bereits vorhanden als Standard-Feld
- VERÖFFENTLICHUNGSDATUM / PUBLISHED DATE → bereits vorhanden als Standard-Feld

## WICHTIG: TAXONOMIEN NICHT ALS FELDER!

Kategorien und Tags sollten als TAXONOMIEN erstellt werden, NICHT als ACF-Felder.
Schlage NIEMALS Felder vom Typ "taxonomy" für Kategorien oder Tags vor - diese werden separat erstellt.

## WELCHE FELDER SINNVOLL SIND:

Nur ZUSÄTZLICHE Daten, die nicht durch Standard-Felder abgedeckt sind:
- Lesezeit (number mit Suffix "min")
- Video-URL / YouTube-Link (url)
- Externe Links / Quellen (repeater mit url, label)
- Sponsor/Partner-Name (text)
- Related Posts Override (relation)
- Call-to-Action Button (group mit text, url)
- Custom Layout Optionen (select)
- SEO-Fokus-Keyword (text) - nur wenn has_seo nicht aktiviert
- Rezept-spezifisch: Zutaten, Schritte, Zeit, Portionen, Nährwerte
- Produkt-spezifisch: Preis, SKU, Verfügbarkeit
- Event-spezifisch: Datum, Ort, Tickets

## VERFÜGBARE FELDTYPEN:
- text: Einzeiliger Text
- textarea: Mehrzeiliger Text (ohne Formatierung)
- richtext: Rich Text Editor mit Formatierung (HTML) - NUR für zusätzliche formatierte Bereiche
- number: Zahlen (mit optionaler Einheit wie min, €, kg)
- range: Slider zwischen min und max
- image: Einzelnes Bild (zusätzlich zum Featured Image)
- gallery: Bildergalerie (mehrere Bilder)
- file: Datei-Upload (PDF, etc.)
- video: Video-Embed (YouTube, Vimeo URL)
- select: Dropdown-Auswahl
- radio: Radio-Buttons (Einzelauswahl)
- checkbox: Checkboxen (Mehrfachauswahl)
- toggle: An/Aus Schalter
- date: Datum (zusätzlich zum Veröffentlichungsdatum)
- datetime: Datum und Zeit
- time: Uhrzeit
- color: Farbauswahl
- link: URL mit Label
- email: E-Mail-Adresse
- url: URL/Webadresse
- relation: Beziehung zu anderem Content-Type
- group: Gruppierte Felder (einmalig)
- repeater: Wiederholbare Gruppe von Feldern (Liste)
- flexible: Flexible Content Blöcke (verschiedene Layouts)

## REGELN:
1. NIEMALS Standard-Felder duplizieren (Titel, Inhalt, Auszug, Autor, Datum, Beitragsbild)
2. NIEMALS Kategorien/Tags als Felder - diese sind Taxonomien
3. Wähle den passendsten Feldtyp für jeden Zweck
4. Nutze "repeater" für Listen (Zutaten, Schritte, Team-Mitglieder, FAQ)
5. Nutze "group" für zusammengehörige einmalige Daten (Adresse, Nährwerte, Kontakt)
6. Setze sinnvolle Standardwerte und settings
7. Markiere wichtige Felder als required: true
8. Generiere deutsche Labels und Namen in snake_case
9. Bei Blog-Beiträgen: Nur Extra-Felder wie Lesezeit, Video-URL, etc.
10. Bei einfachen Inhalten: Lieber KEINE Felder als redundante

## ANTWORT FORMAT (JSON):
{
  "fields": [
    {
      "name": "feldname_snake_case",
      "label": "Feld-Label",
      "type": "text|number|repeater|...",
      "instructions": "Hilfetext für den User",
      "placeholder": "Platzhalter-Text",
      "required": true|false,
      "settings": {
        // number: { min, max, step, suffix, prefix }
        // select/radio/checkbox: { options: [{value, label}] }
      },
      "sub_fields": [
        // Nur für group/repeater
        { "name": "...", "label": "...", "type": "...", ... }
      ],
      "width": "100%"|"50%"|"33%"|"25%"
    }
  ],
  "message": "Beschreibung was erstellt wurde",
  "suggestions": ["Hinweis: Kategorien/Tags als Taxonomien erstellen"]
}

Wenn keine zusätzlichen Felder nötig sind, antworte mit: {"fields": [], "message": "Keine zusätzlichen ACF-Felder nötig. Die Standard-Felder (Titel, Inhalt, Auszug, Beitragsbild, Autor, Datum) decken alles ab.", "suggestions": ["Erstelle Taxonomien für Kategorien und Tags"]}

Antworte NUR mit validem JSON!`

/**
 * Parse AI response to field structure
 */
export function parseFieldGenerationResponse(response: string): FieldGenerationResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    // Try to find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }

    const parsed = JSON.parse(jsonStr)

    // Validate structure
    if (!parsed.fields || !Array.isArray(parsed.fields)) {
      throw new Error('Invalid response structure: missing fields array')
    }

    // Validate each field
    const validatedFields: GeneratedField[] = parsed.fields.map((field: Record<string, unknown>) => ({
      name: generateFieldSlug(String(field.name || field.label || 'field')),
      label: String(field.label || field.name || 'Feld'),
      type: (field.type as FieldType) || 'text',
      instructions: field.instructions ? String(field.instructions) : undefined,
      placeholder: field.placeholder ? String(field.placeholder) : undefined,
      required: Boolean(field.required),
      settings: (field.settings as FieldSettings) || undefined,
      sub_fields: (field.sub_fields as SubField[]) || undefined,
      width: (field.width as GeneratedField['width']) || '100%',
    }))

    return {
      fields: validatedFields,
      message: String(parsed.message || 'Felder wurden generiert.'),
      suggestions: parsed.suggestions as string[] | undefined,
    }
  } catch (error) {
    console.error('Error parsing field generation response:', error)
    throw new Error('Failed to parse AI response')
  }
}

/**
 * Content Type Flags for field generation context
 */
export interface ContentTypeFlags {
  has_title?: boolean
  has_slug?: boolean
  has_content?: boolean
  has_excerpt?: boolean
  has_featured_image?: boolean
  has_author?: boolean
  has_published_date?: boolean
  has_seo?: boolean
}

/**
 * Build user prompt for field generation
 */
export function buildFieldGenerationPrompt(
  userPrompt: string,
  contentTypeName?: string,
  existingFields?: GeneratedField[],
  contentTypeFlags?: ContentTypeFlags
): string {
  let prompt = userPrompt

  if (contentTypeName) {
    prompt = `Content-Type: "${contentTypeName}"\n\nAnforderung: ${userPrompt}`
  }

  // Add context about which standard fields are already enabled
  if (contentTypeFlags) {
    const enabledStandard: string[] = []
    const disabledStandard: string[] = []

    if (contentTypeFlags.has_title !== false) enabledStandard.push('Titel')
    if (contentTypeFlags.has_slug !== false) enabledStandard.push('Slug')
    if (contentTypeFlags.has_content) enabledStandard.push('Inhalt (Rich Text)')
    else disabledStandard.push('Inhalt')
    if (contentTypeFlags.has_excerpt) enabledStandard.push('Auszug/Zusammenfassung')
    else disabledStandard.push('Auszug')
    if (contentTypeFlags.has_featured_image) enabledStandard.push('Beitragsbild')
    else disabledStandard.push('Beitragsbild')
    if (contentTypeFlags.has_author) enabledStandard.push('Autor')
    else disabledStandard.push('Autor')
    if (contentTypeFlags.has_published_date) enabledStandard.push('Veröffentlichungsdatum')
    else disabledStandard.push('Veröffentlichungsdatum')
    if (contentTypeFlags.has_seo) enabledStandard.push('SEO-Felder')

    if (enabledStandard.length > 0) {
      prompt += `\n\n📌 BEREITS AKTIVIERTE STANDARD-FELDER (NICHT duplizieren!):\n${enabledStandard.map(f => `✓ ${f}`).join('\n')}`
    }

    if (disabledStandard.length > 0) {
      prompt += `\n\n⚠️ Nicht aktivierte Standard-Felder (könnten als ACF-Felder sinnvoll sein):\n${disabledStandard.map(f => `- ${f}`).join('\n')}`
    }
  }

  if (existingFields && existingFields.length > 0) {
    const existingList = existingFields.map(f => `- ${f.label} (${f.type})`).join('\n')
    prompt += `\n\n📋 Bereits vorhandene ACF-Felder:\n${existingList}\n\nFüge nur NEUE Felder hinzu, die noch nicht existieren.`
  }

  // Add specific hints based on content type name
  const lowerName = (contentTypeName || '').toLowerCase()

  if (lowerName.includes('blog') || lowerName.includes('beitrag') || lowerName.includes('artikel') || lowerName.includes('post')) {
    prompt += `\n\n💡 HINWEIS für Blog/Beiträge:
- Standard-Felder decken bereits 95% ab
- Sinnvolle Extra-Felder: Lesezeit, Video-URL, Quellen-Links
- Kategorien & Tags als TAXONOMIEN erstellen, NICHT als Felder!
- Bei keinem Bedarf: Leere Feld-Liste zurückgeben`
  }

  if (lowerName.includes('rezept') || lowerName.includes('recipe')) {
    prompt += `\n\n💡 HINWEIS für Rezepte:
- Sinnvolle Felder: Zutaten (repeater), Schritte (repeater), Zeit, Portionen, Schwierigkeit, Nährwerte (group)
- Kategorien (Küche, Mahlzeit) als TAXONOMIEN erstellen`
  }

  if (lowerName.includes('produkt') || lowerName.includes('product')) {
    prompt += `\n\n💡 HINWEIS für Produkte:
- Sinnvolle Felder: Preis, SKU, Verfügbarkeit, Galerie, Varianten
- Kategorien als TAXONOMIEN erstellen`
  }

  if (lowerName.includes('event') || lowerName.includes('veranstaltung')) {
    prompt += `\n\n💡 HINWEIS für Events:
- Sinnvolle Felder: Event-Datum (date/datetime), Ort (group mit Adresse), Tickets (group mit Preis/URL)
- Standard-Veröffentlichungsdatum ist NICHT das Event-Datum!`
  }

  return prompt
}
