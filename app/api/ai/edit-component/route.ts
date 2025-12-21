// ============================================
// AI COMPONENT EDITING API
// Edit existing components with AI
// ============================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
})

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      prompt,
      siteId,
      componentId,
      currentHtml,
      currentCss,
      currentJs,
      slug,
      referenceData,
    } = body as {
      prompt: string
      siteId: string
      componentId: string
      currentHtml?: string
      currentCss?: string
      currentJs?: string
      slug?: string
      referenceData?: {
        pages?: Array<{ id: string; name: string; slug: string; html?: string }>
        components?: Array<{ id: string; name: string; html: string; css?: string; js?: string }>
      }
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Get content types and their fields for context
    let fieldsDoc = ''
    if (siteId) {
      const { data: contentTypes } = await supabase
        .from('content_types')
        .select('id, name, label_plural, slug')
        .eq('site_id', siteId)

      if (contentTypes) {
        for (const ct of contentTypes) {
          const { data: fields } = await supabase
            .from('fields')
            .select('name, label, type, sub_fields')
            .eq('content_type_id', ct.id)
            .order('position')

          if (fields && fields.length > 0) {
            fieldsDoc += `\n### ${ct.label_plural || ct.name} (/${ct.slug})\n`
            for (const field of fields) {
              if (field.type === 'repeater' && field.sub_fields) {
                const subFields = field.sub_fields as Array<{ name: string; label: string }>
                fieldsDoc += `- **${field.label}** (repeater): {{#each entry.data.${field.name}}} ... {{/each}}\n`
                fieldsDoc += `  Unterfelder: ${subFields.map(sf => sf.name).join(', ')}\n`
              } else if (field.type === 'richtext') {
                fieldsDoc += `- **${field.label}**: {{{entry.data.${field.name}}}} (HTML)\n`
              } else {
                fieldsDoc += `- **${field.label}**: {{entry.data.${field.name}}}\n`
              }
            }
          }
        }
      }
    }

    // Build system prompt
    const systemPrompt = `Du bist ein Frontend-Entwickler der UI-Komponenten bearbeitet.
Du erhältst eine bestehende Komponente und eine Änderungsanfrage.

## WICHTIGE REGELN

### BEI ÄNDERUNGEN - MINIMAL INVASIV!
1. Ändere NUR was angefordert wird
2. Behalte die bestehende Struktur bei
3. Keine unaufgeforderten "Verbesserungen"
4. Copy-Paste den bestehenden Code und ändere nur die relevante Stelle

### CSS-VARIABLEN NUTZEN
- var(--color-brand-primary), var(--color-brand-secondary)
- var(--color-neutral-background), var(--color-neutral-foreground)
- var(--color-neutral-muted), var(--color-neutral-border)
- var(--font-heading), var(--font-body)
- var(--radius-sm), var(--radius-lg), var(--shadow-md)

### CONTENT-STRUKTUR FÜR JS
Wenn die Komponente mit Content arbeitet (wie TOC), nutze robuste Selektoren:
\`\`\`javascript
const contentArea = document.querySelector('.entry-content')
  || document.querySelector('article')
  || document.querySelector('main')
  || document.body;
\`\`\`

### DATA-ATTRIBUTE
Nutze data-component="${slug || 'component'}" für JavaScript-Selektion.
${fieldsDoc ? `
## VERFÜGBARE ACF-FELDER
Du kannst auf diese Felder in der Komponente zugreifen (Handlebars-Syntax):
${fieldsDoc}

Prüfe immer ob Felder existieren: {{#if entry.data.feldname}}...{{/if}}
` : ''}
## ANTWORT-FORMAT

Antworte mit einem JSON-Objekt:
{
  "html": "<!-- Aktualisiertes HTML -->",
  "css": "/* Aktualisiertes CSS oder null */",
  "js": "// Aktualisiertes JavaScript oder null",
  "message": "Kurze Beschreibung was geändert wurde"
}

WICHTIG: Nur valides JSON zurückgeben!`

    // Build user prompt with current code and optional reference context
    let userPrompt = `## AKTUELLE KOMPONENTE

### HTML:
\`\`\`html
${currentHtml || '<!-- Kein HTML -->'}
\`\`\`

${currentCss ? `### CSS:\n\`\`\`css\n${currentCss}\n\`\`\`\n` : ''}
${currentJs ? `### JavaScript:\n\`\`\`javascript\n${currentJs}\n\`\`\`\n` : ''}`

    // Add reference context if provided
    if (referenceData) {
      let refContext = '\n## KONTEXT (Referenzen)\n'

      if (referenceData.pages?.length) {
        refContext += '\n### Referenzierte Seiten:\n'
        referenceData.pages.forEach((page) => {
          refContext += `\n**${page.name}** (/${page.slug})\n`
          if (page.html) {
            refContext += `\`\`\`html\n${page.html.slice(0, 2000)}\n\`\`\`\n`
          }
        })
      }

      if (referenceData.components?.length) {
        refContext += '\n### Referenzierte Komponenten:\n'
        referenceData.components.forEach((comp) => {
          refContext += `\n**${comp.name}**\n`
          refContext += `HTML:\n\`\`\`html\n${comp.html}\n\`\`\`\n`
          if (comp.css) refContext += `CSS:\n\`\`\`css\n${comp.css}\n\`\`\`\n`
          if (comp.js) refContext += `JS:\n\`\`\`javascript\n${comp.js}\n\`\`\`\n`
        })
      }

      userPrompt += refContext
    }

    userPrompt += `
## ÄNDERUNGSANFRAGE:
${prompt}

## ANWEISUNG:
- Behalte die bestehende Struktur bei
- Ändere NUR was für die Anfrage relevant ist
- Gib das komplette aktualisierte HTML/CSS/JS zurück`

    // Call Google Generative AI
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    })

    const responseText = response.text || ''

    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse response
    let result: {
      html?: string
      css?: string | null
      js?: string | null
      message?: string
    }

    try {
      let jsonStr = responseText

      // Remove markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }

      // Find JSON object
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        jsonStr = objectMatch[0]
      }

      result = JSON.parse(jsonStr)
    } catch {
      // Fallback: try to extract HTML directly
      const htmlMatch = responseText.match(/<[^>]+>[\s\S]*<\/[^>]+>/i)
      result = {
        html: htmlMatch ? htmlMatch[0] : currentHtml,
        message: 'Komponente wurde aktualisiert.',
      }
    }

    return NextResponse.json({
      success: true,
      html: result.html || currentHtml,
      css: result.css,
      js: result.js,
      message: result.message || 'Komponente wurde aktualisiert.',
    })

  } catch (error) {
    console.error('Component edit error:', error)

    return NextResponse.json(
      {
        error: 'Failed to edit component',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
