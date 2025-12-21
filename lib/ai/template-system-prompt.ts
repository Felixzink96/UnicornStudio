// ============================================
// TEMPLATE GENERATION SYSTEM PROMPT
// For generating archive and single templates
// ============================================

import type { Field, ContentType, CMSComponent } from '@/types/cms'

export interface TemplateComponentInfo {
  slug: string
  name: string
  description: string | null
  type: string
  ai_prompt: string | null
}

export interface TemplateContext {
  contentType: ContentType
  fields: Field[]
  templateType: 'archive' | 'single' | 'page' | 'taxonomy'
  designTokens?: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    fontHeading: string
    fontBody: string
  }
  components?: TemplateComponentInfo[]
}

/**
 * Build template variables documentation from content type fields
 */
export function buildTemplateVariables(fields: Field[] | null | undefined, contentType: ContentType | null | undefined): string {
  const variables: string[] = []

  // Standard entry variables
  variables.push('## STANDARD-VARIABLEN:')
  variables.push('{{entry.title}} - Titel des Eintrags')
  variables.push('{{entry.slug}} - URL-Slug')
  variables.push('{{{entry.content}}} - Rich Text Inhalt (PFLICHT für Single!)')
  variables.push('{{entry.excerpt}} - Kurzbeschreibung/Auszug')
  variables.push('{{entry.featured_image}} - Beitragsbild URL')
  variables.push('{{entry.author}} - Autor Name')
  variables.push('{{entry.published_at}} - Veröffentlichungsdatum')
  variables.push('{{entry.url}} - Link zur Einzelseite')
  variables.push('')

  // Custom field variables
  if (fields && fields.length > 0) {
    variables.push('## CUSTOM FIELDS:')
    for (const field of fields) {
      const path = `{{entry.data.${field.name}}}`
      let desc = field.label

      if (field.type === 'repeater') {
        variables.push(`{{#each entry.data.${field.name}}} ... {{/each}} - ${desc} (Liste)`)
        if (field.sub_fields) {
          for (const sub of field.sub_fields) {
            variables.push(`  {{${sub.name}}} - ${sub.label}`)
          }
        }
      } else if (field.type === 'group') {
        variables.push(`${path} - ${desc} (Gruppe)`)
        if (field.sub_fields) {
          for (const sub of field.sub_fields) {
            variables.push(`  {{entry.data.${field.name}.${sub.name}}} - ${sub.label}`)
          }
        }
      } else if (field.type === 'richtext') {
        variables.push(`{{{entry.data.${field.name}}}} - ${desc} (HTML, unescaped)`)
      } else {
        variables.push(`${path} - ${desc}`)
      }
    }
    variables.push('')
  }

  return variables.join('\n')
}

/**
 * Build component documentation for templates
 */
function buildComponentDocumentation(components: TemplateComponentInfo[] | undefined): string {
  if (!components || components.length === 0) {
    return ''
  }

  let doc = `## WIEDERVERWENDBARE KOMPONENTEN

Du kannst vorgefertigte Komponenten mit diesem Syntax einbinden:
\`\`\`handlebars
{{component:slug}}
\`\`\`

Die Komponente wird automatisch durch ihren HTML-Code ersetzt.
CSS und JavaScript werden automatisch geladen.

### VERFÜGBARE KOMPONENTEN:
`

  components.forEach(c => {
    doc += `\n**{{component:${c.slug}}}** - ${c.name}`
    if (c.description) doc += `\n  ${c.description}`
    if (c.ai_prompt) doc += `\n  Empfehlung: ${c.ai_prompt}`
    doc += '\n'
  })

  doc += `
### BEISPIEL-VERWENDUNG:
\`\`\`html
<article>
  <h1>{{entry.title}}</h1>

  <!-- Inhaltsverzeichnis einfügen -->
  {{component:toc}}

  <div class="content">
    {{{entry.content}}}
  </div>

  <!-- Call-to-Action am Ende -->
  {{component:cta}}
</article>
\`\`\`

WICHTIG: Nutze Komponenten wo sinnvoll! Sie sind getestet und konsistent.
`

  return doc
}

/**
 * Build dummy data for template preview
 */
export function buildDummyData(fields: Field[] | null | undefined, contentType: ContentType | null | undefined): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (!fields || fields.length === 0) return data

  for (const field of fields) {
    switch (field.type) {
      case 'text':
        data[field.name] = `Beispiel ${field.label}`
        break
      case 'textarea':
        data[field.name] = `Dies ist ein Beispieltext für ${field.label}. Lorem ipsum dolor sit amet.`
        break
      case 'richtext':
        data[field.name] = `<p>Dies ist ein <strong>formatierter</strong> Beispieltext für ${field.label}.</p>`
        break
      case 'number':
        data[field.name] = field.settings?.min ? Number(field.settings.min) + 10 : 42
        break
      case 'image':
        data[field.name] = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800'
        break
      case 'select':
      case 'radio':
        data[field.name] = field.settings?.options?.[0]?.value || 'option1'
        break
      case 'toggle':
      case 'checkbox':
        data[field.name] = true
        break
      case 'date':
        data[field.name] = new Date().toISOString().split('T')[0]
        break
      case 'email':
        data[field.name] = 'beispiel@email.de'
        break
      case 'url':
      case 'link':
        data[field.name] = 'https://example.com'
        break
      case 'repeater':
        data[field.name] = [
          buildSubFieldDummy(field.sub_fields || [], 1),
          buildSubFieldDummy(field.sub_fields || [], 2),
          buildSubFieldDummy(field.sub_fields || [], 3),
        ]
        break
      case 'group':
        data[field.name] = buildSubFieldDummy(field.sub_fields || [], 1)
        break
      default:
        data[field.name] = `Beispiel ${field.label}`
    }
  }

  return data
}

function buildSubFieldDummy(subFields: Field['sub_fields'], index: number): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (!subFields) return data

  for (const field of subFields) {
    switch (field.type) {
      case 'text':
        data[field.name] = `${field.label} ${index}`
        break
      case 'textarea':
        data[field.name] = `Beschreibung ${index}`
        break
      case 'richtext':
        data[field.name] = `<p>Inhalt ${index}</p>`
        break
      case 'number':
        data[field.name] = index * 10
        break
      case 'image':
        data[field.name] = `https://picsum.photos/400/300?random=${index}`
        break
      default:
        data[field.name] = `${field.label} ${index}`
    }
  }

  return data
}

/**
 * Build complete dummy entry for preview
 */
export function buildDummyEntry(contentType: ContentType | null | undefined, fields: Field[] | null | undefined): Record<string, unknown> {
  const label = contentType?.label_singular || 'Eintrag'
  const slug = contentType?.slug || 'eintrag'

  return {
    title: `Beispiel ${label}`,
    slug: 'beispiel-eintrag',
    content: '<p>Dies ist der Hauptinhalt des Eintrags. Hier kann der Autor seinen Text mit <strong>Formatierungen</strong> und <a href="#">Links</a> schreiben.</p><p>Ein weiterer Absatz mit mehr Inhalt.</p>',
    excerpt: `Dies ist ein Beispiel-Auszug für ${label}.`,
    featured_image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200',
    author: 'Max Mustermann',
    published_at: new Date().toISOString(),
    url: `/${slug}/beispiel-eintrag`,
    data: buildDummyData(fields, contentType),
  }
}

/**
 * Build dummy entries list for archive preview
 */
export function buildDummyEntries(contentType: ContentType | null | undefined, fields: Field[] | null | undefined, count = 6): Record<string, unknown>[] {
  const entries = []
  const label = contentType?.label_singular || 'Eintrag'
  const slug = contentType?.slug || 'eintrag'
  const images = [
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
    'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800',
    'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800',
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=800',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800',
  ]

  for (let i = 1; i <= count; i++) {
    entries.push({
      title: `${label} Beispiel ${i}`,
      slug: `beispiel-${i}`,
      excerpt: `Dies ist ein Beispiel-Auszug für ${label} Nummer ${i}.`,
      featured_image: images[(i - 1) % images.length],
      author: i % 2 === 0 ? 'Maria Musterfrau' : 'Max Mustermann',
      published_at: new Date(Date.now() - i * 86400000).toISOString(),
      url: `/${slug}/beispiel-${i}`,
      data: buildDummyData(fields, contentType),
    })
  }

  return entries
}

/**
 * Build the template system prompt
 */
export function buildTemplateSystemPrompt(context: TemplateContext): string {
  const { contentType, fields, templateType, designTokens, components } = context
  const variablesDoc = buildTemplateVariables(fields, contentType)
  const componentsDoc = buildComponentDocumentation(components)

  const isArchive = templateType === 'archive'
  const isSingle = templateType === 'single'

  return `Du bist ein kreativer Web-Designer. Du hast VOLLE KREATIVE FREIHEIT!
Erstelle ein ${isArchive ? 'ARCHIV' : 'EINZELSEITEN'}-Template für "${contentType.label_plural}".

## BASICS
- Template = NUR Inhalt (kein DOCTYPE/html/head/body)
- Texte auf Deutsch

## WICHTIG: ÄNDERUNGEN AN BESTEHENDEN TEMPLATES

⚠️ Wenn ein "Aktuelles Template" übergeben wird, gelten STRENGE REGELN:

1. **NUR DIE ANGEFORDERTE ÄNDERUNG MACHEN** - Nichts anderes!
2. **STRUKTUR BEIBEHALTEN** - Alle Sections, Klassen, Styles exakt so lassen
3. **NICHT "VERBESSERN"** - Keine unaufgeforderten Optimierungen, Redesigns oder Umstrukturierungen
4. **MINIMAL INVASIV** - So wenig wie möglich ändern, so viel wie nötig

### BEISPIEL:
Anfrage: "Füge eine Sidebar mit TOC hinzu"

❌ FALSCH: Komplettes Template neu schreiben, Layout ändern, Hero umgestalten
✅ RICHTIG: Nur ein Grid erstellen und die Sidebar neben den Content setzen

### SO GEHST DU VOR:
1. Identifiziere die EXAKTE Stelle für die Änderung
2. Füge NUR das neue Element ein
3. Passe NUR die umgebende Struktur an wenn unbedingt nötig (z.B. Grid-Wrapper)
4. Lass ALLES ANDERE unverändert - jeden Klassennamen, jeden Style, jeden Text

**Bei Änderungen: Copy-Paste das Original und ändere nur die relevante Stelle!**

## HINTERGRUND-REGEL - WICHTIG!

⛔ NIEMALS Hintergrundfarbe auf <article> oder Haupt-Container setzen!
✅ Hintergrundfarbe kommt vom <body> (wird automatisch via CSS-Variable gesetzt)

### WARUM?
Atmosphere-Layers (bg-noise, animate-aurora) liegen über dem Content.
Wenn <article> eine Hintergrundfarbe hat, werden sie trotzdem verdeckt.

### RICHTIG:
\`\`\`html
<!-- Atmosphere-Layers: z-[100] = ÜBER dem Content -->
<div class="fixed inset-0 pointer-events-none z-[100] opacity-[0.07] bg-noise"></div>

<!-- Artikel: KEINE Hintergrundfarbe! -->
<article class="relative text-[var(--color-neutral-foreground)]">
\`\`\`

### FALSCH:
\`\`\`html
<!-- ❌ Hintergrund verdeckt Effekte -->
<article class="bg-[var(--color-neutral-background)] ...">
\`\`\`

## CSS-VARIABLEN - ABSOLUT PFLICHT!

⛔ VERBOTEN: text-gray-*, bg-gray-*, border-gray-*, text-slate-*, bg-slate-*, etc.
⛔ KEINE hardcoded Tailwind-Grautöne!
✅ NUR diese CSS-Variablen verwenden:

### BRAND-FARBEN:
- var(--color-brand-primary) - Primärfarbe (Buttons, Links, Akzente)
- var(--color-brand-primary-hover) - Primär Hover
- var(--color-brand-secondary) - Sekundärfarbe
- var(--color-brand-accent) - Akzentfarbe
- var(--color-brand-primary-rgb) - Für Opacity: rgba(var(--color-brand-primary-rgb), 0.5)

### NEUTRALE FARBEN:
- var(--color-neutral-background) - Seiten-Hintergrund
- var(--color-neutral-foreground) - Haupttext (statt text-gray-800/900)
- var(--color-neutral-muted) - Gedämpfter Hintergrund (statt bg-gray-50/100/200)
- var(--color-neutral-border) - Rahmen (statt border-gray-200/300)
- var(--color-neutral-foreground-rgb) - Für Opacity: rgba(var(--color-neutral-foreground-rgb), 0.6)

### SEMANTISCHE FARBEN:
- var(--color-semantic-success) - Erfolg/Grün
- var(--color-semantic-warning) - Warnung/Orange
- var(--color-semantic-error) - Fehler/Rot
- var(--color-semantic-info) - Info/Blau

### TYPOGRAFIE:
- var(--font-heading) - Überschriften
- var(--font-body) - Fließtext
- var(--font-mono) - Code/Monospace

### ABSTÄNDE & RADIEN:
- var(--radius-sm), var(--radius-default), var(--radius-lg), var(--radius-xl), var(--radius-2xl), var(--radius-full)
- var(--spacing-section) - Abschnitt-Abstand
- var(--spacing-container) - Container-Breite

### SCHATTEN:
- var(--shadow-sm), var(--shadow-md), var(--shadow-lg), var(--shadow-xl)

### TRANSITIONS:
- var(--transition-fast), var(--transition-normal), var(--transition-slow)

### UTILITY-KLASSEN (ohne var()):
- bg-primary, bg-secondary, bg-accent, bg-background, bg-muted
- text-primary, text-secondary, text-accent, text-foreground
- border-primary, border-secondary, border-border
- font-heading, font-body, font-mono

### BEISPIELE:
❌ FALSCH: class="text-gray-800 bg-gray-50 border-gray-300"
✅ RICHTIG: class="text-[var(--color-neutral-foreground)] bg-[var(--color-neutral-muted)] border-[var(--color-neutral-border)]"

❌ FALSCH: class="text-gray-500"
✅ RICHTIG: class="text-[var(--color-neutral-foreground)]/60" oder class="opacity-60 text-[var(--color-neutral-foreground)]"

❌ FALSCH: class="bg-gray-900 text-gray-100"
✅ RICHTIG: class="bg-[var(--color-neutral-foreground)] text-[var(--color-neutral-background)]"

**Einzige Ausnahme:** text-white/text-black NUR für Kontrast auf farbigen var()-Hintergründen.

${designTokens ? `Site-Farben: Primary ${designTokens.primaryColor}, Secondary ${designTokens.secondaryColor}, Fonts: ${designTokens.fontHeading}/${designTokens.fontBody}` : ''}

## WENN EINE SEITE REFERENZIERT WIRD (@Seitenname)

**Kopiere ALLES 1:1 - den kompletten Vibe, alle Effekte, die ganze Atmosphäre!**

Das Template muss aussehen als wäre es TEIL dieser Website:
- Gleiche Hintergrund-Effekte (Grids, Blurs, Noise, Scan-Lines)
- Gleiche Animationen und Hover-Effekte
- Gleiche Typografie-Größen und Styles
- Gleiche Custom CSS Klassen
- Gleiche interaktive Elemente (cursor-trigger, data-hover)

Schau dir den <style> Block der Referenz an und kopiere ALLE relevanten CSS-Definitionen ins "css" Feld!

## VERFÜGBARE DATEN

${isArchive ? `### ARCHIV - Zeigt mehrere Einträge

Loop über Einträge:
\`\`\`handlebars
{{#each entries}}
  {{title}} - Titel
  {{excerpt}} - Kurzbeschreibung
  {{featured_image}} - Bild-URL
  {{url}} - Link zur Detailseite
  {{published_at}} - Datum (nutze: {{formatDate published_at "DD.MM.YYYY"}})
  {{author}} - Autor
{{/each}}
\`\`\`

Pagination (optional):
\`\`\`handlebars
{{#if pagination}}
  {{pagination.current}} - Aktuelle Seite
  {{pagination.total}} - Gesamtseiten
  {{#if pagination.prev}}<a href="{{pagination.prev}}">Zurück</a>{{/if}}
  {{#if pagination.next}}<a href="{{pagination.next}}">Weiter</a>{{/if}}
{{/if}}
\`\`\`
` : `### EINZELSEITE - Zeigt einen Eintrag

\`\`\`handlebars
{{entry.title}} - Titel
{{entry.excerpt}} - Kurzbeschreibung
{{entry.featured_image}} - Bild-URL
{{entry.author}} - Autor
{{entry.published_at}} - Datum (nutze: {{formatDate entry.published_at "DD.MM.YYYY"}})
{{{entry.content}}} - HAUPTINHALT (3 Klammern für HTML!)
\`\`\`

Ähnliche Einträge (optional):
\`\`\`handlebars
{{#each related_entries}}
  {{title}}, {{url}}, {{featured_image}}, {{excerpt}}
{{/each}}
\`\`\`
`}

### Custom Fields
${variablesDoc}
${componentsDoc}
## HANDLEBARS SYNTAX
- {{variable}} - Text (escaped)
- {{{variable}}} - HTML (unescaped, für content!)
- {{#each items}}...{{/each}} - Loop
- {{#if condition}}...{{else}}...{{/if}} - Bedingung
- {{formatDate published_at "DD.MM.YYYY"}} - Datum formatieren

## ANTWORT-FORMAT

\`\`\`json
{
  "html": "<!-- Template HTML -->",
  "css": "/* Custom CSS aus der Referenz-Seite kopieren! */",
  "message": "Kurze Beschreibung",
  "suggestions": ["Idee 1", "Idee 2"]
}
\`\`\`

**WICHTIG:** Wenn du Custom Klassen verwendest (glitch-text, glass-panel, reveal-up, scan-beam, etc.), MUSS das CSS dafür im "css" Feld stehen! Kopiere es aus dem <style> der Referenz-Seite.`
}

/**
 * Parse template generation response
 */
export function parseTemplateResponse(response: string): {
  html: string
  css?: string
  message: string
  suggestions?: string[]
} {
  try {
    // Try to extract JSON from response
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
      html: String(parsed.html || ''),
      css: parsed.css ? String(parsed.css) : undefined,
      message: String(parsed.message || 'Template wurde generiert.'),
      suggestions: parsed.suggestions as string[] | undefined,
    }
  } catch (error) {
    // If JSON parsing fails, try to extract HTML directly
    const htmlMatch = response.match(/<(?:section|article|div)[^>]*>[\s\S]*<\/(?:section|article|div)>/i)
    if (htmlMatch) {
      return {
        html: htmlMatch[0],
        message: 'Template wurde generiert.',
      }
    }

    throw new Error('Failed to parse template response')
  }
}
