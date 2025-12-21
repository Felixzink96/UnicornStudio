// ============================================
// ENTRY CONTENT GENERATION SYSTEM PROMPT
// For generating content within entries
// ============================================

import type { Field, ContentType, CMSComponent } from '@/types/cms'

export interface ComponentInfo {
  slug: string
  name: string
  description: string | null
  html: string
  is_required: boolean
  ai_prompt: string | null
}

export interface EntryContext {
  contentType: ContentType
  fields: Field[]
  entryTitle?: string
  designTokens?: {
    primaryColor: string
    secondaryColor: string
    fontHeading: string
    fontBody: string
  }
  components?: ComponentInfo[]
}

/**
 * Build detailed field documentation for AI
 */
function buildFieldDocumentation(fields: Field[], indent = ''): string {
  return fields.map(field => {
    let doc = `${indent}- "${field.name}" (${field.type}): ${field.label}`

    if (field.required) {
      doc += ' [PFLICHT]'
    }

    // Add type-specific hints
    switch (field.type) {
      case 'text':
        doc += ' → String'
        break
      case 'textarea':
        doc += ' → Längerer Text (mehrzeilig)'
        break
      case 'richtext':
        doc += ' → HTML Content'
        break
      case 'number':
        doc += ' → Zahl'
        if (field.settings?.unit) {
          doc += ` (Einheit: ${field.settings.unit})`
        }
        break
      case 'select':
      case 'radio':
        if (field.settings?.options) {
          const options = field.settings.options.map((o: { value: string; label: string }) => o.value).join(', ')
          doc += ` → Wähle aus: [${options}]`
        }
        break
      case 'toggle':
      case 'checkbox':
        doc += ' → true/false'
        break
      case 'date':
        doc += ' → Datum (YYYY-MM-DD)'
        break
      case 'repeater':
        doc += ' → Array von Objekten:'
        if (field.sub_fields && field.sub_fields.length > 0) {
          doc += '\n' + buildFieldDocumentation(field.sub_fields as Field[], indent + '    ')
        }
        break
      case 'group':
        doc += ' → Objekt mit:'
        if (field.sub_fields && field.sub_fields.length > 0) {
          doc += '\n' + buildFieldDocumentation(field.sub_fields as Field[], indent + '    ')
        }
        break
    }

    return doc
  }).join('\n')
}

/**
 * Build component documentation for AI
 */
function buildComponentDocumentation(components: ComponentInfo[]): string {
  if (!components || components.length === 0) {
    return ''
  }

  const requiredComponents = components.filter(c => c.is_required)
  const optionalComponents = components.filter(c => !c.is_required)

  let doc = `\n## VERFÜGBARE KOMPONENTEN - NUR DIESE VERWENDEN!

⚠️ WICHTIG: Erfinde KEINE eigenen HTML-Strukturen! Nutze NUR die definierten Komponenten.
`

  if (requiredComponents.length > 0) {
    doc += `\n### PFLICHT-KOMPONENTEN (müssen im Artikel vorkommen):\n`
    requiredComponents.forEach(c => {
      doc += `\n**${c.slug}** - ${c.name}\n`
      if (c.description) doc += `  Beschreibung: ${c.description}\n`
      if (c.ai_prompt) doc += `  Anweisung: ${c.ai_prompt}\n`
      doc += `  HTML-Template:\n\`\`\`html\n${c.html}\n\`\`\`\n`
    })
  }

  if (optionalComponents.length > 0) {
    doc += `\n### OPTIONALE KOMPONENTEN (nutze passend zum Inhalt):\n`
    optionalComponents.forEach(c => {
      doc += `\n**${c.slug}** - ${c.name}\n`
      if (c.description) doc += `  Beschreibung: ${c.description}\n`
      if (c.ai_prompt) doc += `  Anweisung: ${c.ai_prompt}\n`
      doc += `  HTML-Template:\n\`\`\`html\n${c.html}\n\`\`\`\n`
    })
  }

  return doc
}

/**
 * Build the entry content system prompt
 */
export function buildEntrySystemPrompt(context: EntryContext): string {
  const { contentType, fields, entryTitle, designTokens, components } = context

  const fieldDocs = buildFieldDocumentation(fields)
  const componentDocs = buildComponentDocumentation(components || [])

  // Build example for repeater fields
  const repeaterExample = fields.find(f => f.type === 'repeater')
  let repeaterExampleJson = ''
  if (repeaterExample) {
    const subFields = repeaterExample.sub_fields || []
    const exampleItem: Record<string, unknown> = {}
    subFields.forEach((sf: { name: string; type: string }) => {
      if (sf.type === 'text') exampleItem[sf.name] = 'Beispielwert'
      else if (sf.type === 'number') exampleItem[sf.name] = 100
      else exampleItem[sf.name] = 'Wert'
    })
    repeaterExampleJson = `
Beispiel für "${repeaterExample.name}" (Repeater):
"${repeaterExample.name}": [
  ${JSON.stringify(exampleItem, null, 2).split('\n').join('\n  ')},
  ...weitere Einträge
]`
  }

  return `Du bist ein Content-Autor für "${contentType.label_plural}". Du erstellst vollständige Einträge mit allen Feldern.

## DEINE AUFGABE
Erstelle einen vollständigen "${contentType.label_singular}" Eintrag${entryTitle ? ` für "${entryTitle}"` : ''}.
Du füllst ALLE Felder mit passenden Inhalten aus!

## VERFÜGBARE FELDER (ACF)
${fieldDocs || '- Keine zusätzlichen Felder'}
${repeaterExampleJson}

## CONTENT-FELD
Das "content" Feld enthält den Hauptartikel als HTML:
- Nutze h2, h3 für Überschriften
- p für Absätze
- ul/ol für Listen
- Tailwind CSS für Styling

## CSS-VARIABLEN - ABSOLUT PFLICHT!

⛔ VERBOTEN: text-gray-*, bg-gray-*, border-gray-*, text-slate-*, bg-slate-*, etc.
⛔ KEINE hardcoded Tailwind-Grautöne!
✅ NUR diese CSS-Variablen verwenden:

### BRAND-FARBEN:
- var(--color-brand-primary) - Primärfarbe
- var(--color-brand-primary-hover) - Primär Hover
- var(--color-brand-secondary) - Sekundärfarbe
- var(--color-brand-accent) - Akzentfarbe

### NEUTRALE FARBEN:
- var(--color-neutral-background) - Seiten-Hintergrund
- var(--color-neutral-foreground) - Haupttext (statt text-gray-800/900)
- var(--color-neutral-muted) - Gedämpfter Hintergrund (statt bg-gray-50/100/200)
- var(--color-neutral-border) - Rahmen (statt border-gray-200/300)

### SEMANTISCHE FARBEN:
- var(--color-semantic-success) - Erfolg/Grün
- var(--color-semantic-warning) - Warnung/Orange
- var(--color-semantic-error) - Fehler/Rot
- var(--color-semantic-info) - Info/Blau

### TYPOGRAFIE:
- var(--font-heading), var(--font-body), var(--font-mono)

### SCHATTEN & RADIEN:
- var(--shadow-sm), var(--shadow-md), var(--shadow-lg), var(--shadow-xl)
- var(--radius-sm), var(--radius-default), var(--radius-lg), var(--radius-xl)

### BEISPIELE:
❌ FALSCH: class="text-gray-800 bg-gray-50 border-gray-300"
✅ RICHTIG: class="text-[var(--color-neutral-foreground)] bg-[var(--color-neutral-muted)] border-[var(--color-neutral-border)]"

❌ FALSCH: class="text-gray-500"
✅ RICHTIG: class="text-[var(--color-neutral-foreground)]/60"

**Einzige Ausnahme:** text-white/text-black NUR für Kontrast auf farbigen var()-Hintergründen.

${designTokens ? `Site-Farben: Primary ${designTokens.primaryColor}, Secondary ${designTokens.secondaryColor}` : ''}
${componentDocs}
## OUTPUT FORMAT
Antworte mit einem JSON-Objekt das ALLE Felder enthält:
{
  "title": "Titel des Eintrags",
  "excerpt": "Kurze Beschreibung (1-2 Sätze)",
  "content": "<dein HTML Artikel hier>",
  "data": {
    // HIER ALLE ACF-FELDER mit Werten!
    "feldname1": "wert1",
    "feldname2": 123,
    "repeater_feld": [
      { "sub_feld1": "wert", "sub_feld2": 10 },
      { "sub_feld1": "wert2", "sub_feld2": 20 }
    ]
  },
  "message": "Kurze Beschreibung was generiert wurde"
}

## WICHTIGE REGELN
1. Fülle ALLE Pflichtfelder aus
2. Bei Repeatern: Erstelle mehrere sinnvolle Einträge
3. Bei Select/Radio: Wähle einen der verfügbaren Werte
4. Schreibe auf Deutsch
5. Sei kreativ und detailliert

WICHTIG: Nur valides JSON zurückgeben!`
}

export interface ParsedEntryResponse {
  title?: string
  excerpt?: string
  content: string
  data?: Record<string, unknown>
  message: string
  suggestions?: string[]
}

/**
 * Parse entry content generation response
 */
export function parseEntryContentResponse(response: string): ParsedEntryResponse {
  try {
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

    return {
      title: parsed.title as string | undefined,
      excerpt: parsed.excerpt as string | undefined,
      content: String(parsed.content || ''),
      data: parsed.data as Record<string, unknown> | undefined,
      message: String(parsed.message || 'Eintrag wurde generiert.'),
      suggestions: parsed.suggestions as string[] | undefined,
    }
  } catch (error) {
    // If JSON parsing fails, treat the whole response as content
    // Remove any markdown formatting
    let content = response
      .replace(/```html\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    return {
      content,
      message: 'Content wurde generiert.',
    }
  }
}
