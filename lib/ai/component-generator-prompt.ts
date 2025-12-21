// ============================================
// AI COMPONENT GENERATOR SYSTEM PROMPT
// For generating component HTML, CSS, and JavaScript
// ============================================

export interface ContentTypeField {
  name: string
  label: string
  type: string
  sub_fields?: unknown[]
}

export interface ContentTypeWithFields {
  contentType: string
  slug: string
  fields: ContentTypeField[]
}

export interface ComponentGeneratorContext {
  description: string
  componentType?: 'element' | 'block' | 'section' | 'layout'
  existingComponents?: { name: string; slug: string; description: string | null }[]
  contentTypeFields?: ContentTypeWithFields[]
}

/**
 * Build the system prompt for AI component generation
 */
export function buildComponentGeneratorPrompt(context: ComponentGeneratorContext): string {
  const { componentType, existingComponents, contentTypeFields } = context

  const existingList = existingComponents?.length
    ? existingComponents.map(c => `- ${c.slug}: ${c.name}${c.description ? ` - ${c.description}` : ''}`).join('\n')
    : 'Keine'

  // Build ACF fields documentation
  let fieldsDoc = ''
  if (contentTypeFields && contentTypeFields.length > 0) {
    fieldsDoc = `

## VERFÜGBARE ACF-FELDER (Custom Fields)

Du kannst auf diese Felder in deiner Komponente zugreifen!
Komponenten werden in Templates eingebettet und haben Zugriff auf entry.data.

`
    for (const ct of contentTypeFields) {
      fieldsDoc += `### ${ct.contentType} (/${ct.slug})\n`
      for (const field of ct.fields) {
        if (field.type === 'repeater' && field.sub_fields) {
          const subFields = field.sub_fields as Array<{ name: string; label: string; type: string }>
          fieldsDoc += `- **${field.label}** (\`entry.data.${field.name}\`) - Repeater:\n`
          fieldsDoc += `  \`\`\`handlebars\n  {{#each entry.data.${field.name}}}\n`
          for (const sf of subFields) {
            fieldsDoc += `    {{${sf.name}}} <!-- ${sf.label} -->\n`
          }
          fieldsDoc += `  {{/each}}\n  \`\`\`\n`
        } else if (field.type === 'group' && field.sub_fields) {
          const subFields = field.sub_fields as Array<{ name: string; label: string }>
          fieldsDoc += `- **${field.label}** (\`entry.data.${field.name}\`) - Gruppe:\n`
          for (const sf of subFields) {
            fieldsDoc += `  - {{entry.data.${field.name}.${sf.name}}} - ${sf.label}\n`
          }
        } else if (field.type === 'richtext') {
          fieldsDoc += `- **${field.label}** (\`{{{entry.data.${field.name}}}}\`) - Rich Text (HTML)\n`
        } else {
          fieldsDoc += `- **${field.label}** (\`{{entry.data.${field.name}}}\`) - ${field.type}\n`
        }
      }
      fieldsDoc += '\n'
    }

    fieldsDoc += `### WICHTIG für Komponenten mit ACF-Feldern:
1. Prüfe immer ob das Feld existiert: \`{{#if entry.data.feldname}}...{{/if}}\`
2. Bei Repeater: \`{{#each entry.data.feldname}}...{{/each}}\`
3. Bei Rich Text: Drei geschweifte Klammern für HTML: \`{{{entry.data.feldname}}}\`
4. Komponenten werden VOR Handlebars-Processing eingefügt, daher funktionieren die Variablen!
`
  }

  return `Du bist ein Frontend-Entwickler der wiederverwendbare UI-Komponenten erstellt.
Du generierst Komponenten mit HTML, CSS und optional JavaScript.

## WICHTIGE REGELN

### CSS-VARIABLEN - ABSOLUT PFLICHT!
Nutze AUSSCHLIESSLICH diese CSS-Variablen. KEINE hardcoded Farben!

**Brand-Farben:**
- var(--color-brand-primary) - Primärfarbe
- var(--color-brand-primary-hover) - Primär Hover
- var(--color-brand-secondary) - Sekundärfarbe
- var(--color-brand-accent) - Akzentfarbe

**Neutrale Farben:**
- var(--color-neutral-background) - Hintergrund
- var(--color-neutral-foreground) - Text
- var(--color-neutral-muted) - Gedämpfter Hintergrund
- var(--color-neutral-muted-foreground) - Gedämpfter Text
- var(--color-neutral-border) - Rahmen

**Semantische Farben:**
- var(--color-semantic-success) - Grün/Erfolg
- var(--color-semantic-warning) - Orange/Warnung
- var(--color-semantic-error) - Rot/Fehler
- var(--color-semantic-info) - Blau/Info

**Typografie:**
- var(--font-heading) - Überschriften
- var(--font-body) - Fließtext
- var(--font-mono) - Code

**Schatten & Radien:**
- var(--shadow-sm), var(--shadow-md), var(--shadow-lg), var(--shadow-xl)
- var(--radius-sm), var(--radius-default), var(--radius-lg), var(--radius-xl), var(--radius-full)

### HTML-STRUKTUR
- Nutze data-component="slug" für JavaScript-Selektion
- Verwende Tailwind CSS Klassen für Layout und Sizing
- CSS-Variablen für Farben über arbitrary values: bg-[var(--color-brand-primary)]
- Semantische HTML-Elemente

### JAVASCRIPT (wenn nötig)
- Vanilla JavaScript, kein Framework
- document.querySelectorAll('[data-component="slug"]') zum Selektieren
- Modular und selbst-initialisierend

### CONTENT-STRUKTUR (WICHTIG!)
Unser CMS rendert Content in verschiedenen Containern. Dein JavaScript muss ROBUST sein:

**Content-Container (in dieser Reihenfolge suchen):**
\`\`\`javascript
const contentArea = document.querySelector('.entry-content')  // Haupt-Content
  || document.querySelector('article')                         // Artikel
  || document.querySelector('main')                            // Main-Bereich
  || document.querySelector('.content')                        // Fallback
  || document.body;                                            // Letzter Fallback
\`\`\`

**Template-Struktur:**
- Content wird in \`{{{entry.content}}}\` gerendert (oft in einem div mit class="entry-content")
- Templates können verschiedene Wrapper haben
- Überschriften (h2, h3) sind DIREKT im Content, nicht in article/main

**NIEMALS annehmen dass Content in \`article\` ist! Immer mehrere Selektoren als Fallback nutzen.**

### BEISPIEL: Inhaltsverzeichnis (TOC)
\`\`\`javascript
// RICHTIG - Robust gegen verschiedene Container:
(function() {
  const toc = document.querySelector('[data-component="toc"]');
  if (!toc) return;

  const list = toc.querySelector('.toc-list');

  // WICHTIG: Mehrere Fallbacks für Content-Container!
  const contentArea = document.querySelector('.entry-content')
    || document.querySelector('article')
    || document.querySelector('main')
    || document.querySelector('.content')
    || document.body;

  const headings = contentArea.querySelectorAll('h2, h3');

  if (headings.length === 0) {
    toc.style.display = 'none';
    return;
  }

  headings.forEach((h, i) => {
    if (!h.id) h.id = 'heading-' + i;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.className = 'toc-link' + (h.tagName === 'H3' ? ' toc-indent' : '');
    a.onclick = (e) => { e.preventDefault(); h.scrollIntoView({behavior: 'smooth'}); };
    li.appendChild(a);
    list.appendChild(li);
  });
})();
\`\`\`

${componentType ? `### KOMPONENTEN-TYP: ${componentType}` : ''}

### EXISTIERENDE KOMPONENTEN (zur Orientierung)
${existingList}
${fieldsDoc}
## OUTPUT FORMAT
Antworte mit einem JSON-Objekt:

{
  "name": "Komponenten-Name (deutsch)",
  "slug": "komponenten-slug",
  "description": "Kurze Beschreibung",
  "type": "${componentType || 'block'}",
  "category": "Kategorie (z.B. Navigation, Content, CTA)",
  "html": "<HTML-Code hier>",
  "css": ".klasse { /* CSS hier */ }",
  "js": "// JavaScript hier (oder null wenn nicht benötigt)",
  "js_init": "domready",
  "ai_prompt": "Anweisung für AI, wann diese Komponente verwendet werden soll"
}

WICHTIG: Nur valides JSON zurückgeben! Keine Erklärungen, nur das JSON-Objekt.`
}

export interface ParsedComponentResponse {
  name: string
  slug: string
  description: string
  type: 'element' | 'block' | 'section' | 'layout'
  category: string
  html: string
  css: string | null
  js: string | null
  js_init: 'immediate' | 'domready' | 'scroll' | 'interaction'
  ai_prompt: string | null
}

/**
 * Parse AI response for component generation
 */
export function parseComponentResponse(response: string): ParsedComponentResponse | null {
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
      name: String(parsed.name || ''),
      slug: String(parsed.slug || ''),
      description: String(parsed.description || ''),
      type: parsed.type || 'block',
      category: String(parsed.category || ''),
      html: String(parsed.html || ''),
      css: parsed.css || null,
      js: parsed.js || null,
      js_init: parsed.js_init || 'domready',
      ai_prompt: parsed.ai_prompt || null,
    }
  } catch (error) {
    console.error('Failed to parse component response:', error)
    return null
  }
}
