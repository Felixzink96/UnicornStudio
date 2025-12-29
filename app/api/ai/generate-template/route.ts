// ============================================
// AI TEMPLATE GENERATION API
// Generate archive/single templates with AI
// ============================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import {
  buildTemplateSystemPrompt,
  parseTemplateResponse,
  type TemplateContext,
} from '@/lib/ai/template-system-prompt'
import type { ContentType, Field, TemplateType } from '@/types/cms'

// Initialize Google Generative AI
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
      contentTypeId,
      templateType,
      currentHtml,
      referencePageId,
      referenceData,
    } = body as {
      prompt: string
      siteId: string
      contentTypeId?: string
      templateType: TemplateType
      currentHtml?: string
      referencePageId?: string
      referenceData?: {
        pages?: Array<{ id: string; name: string; slug: string; html?: string }>
        components?: Array<{ id: string; name: string; position: string; html: string }>
      }
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      )
    }

    // Get content type and fields if specified
    let contentType: ContentType | null = null
    let fields: Field[] = []

    if (contentTypeId) {
      const { data: ctData } = await supabase
        .from('content_types')
        .select('*')
        .eq('id', contentTypeId)
        .single()

      if (ctData) {
        contentType = ctData as ContentType

        const { data: fieldsData } = await supabase
          .from('fields')
          .select('*')
          .eq('content_type_id', contentTypeId)
          .order('position', { ascending: true })

        fields = (fieldsData || []) as Field[]
      }
    }

    // Get design variables
    const { data: designVars } = await supabase
      .from('design_variables')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get available CMS components for this site
    const { data: cmsComponents } = await supabase
      .from('cms_components')
      .select('slug, name, description, type, ai_prompt')
      .eq('site_id', siteId)
      .not('slug', 'is', null)

    const availableComponents = (cmsComponents || [])
      .filter(c => c.slug)
      .map(c => ({
        slug: c.slug!,
        name: c.name,
        description: c.description,
        type: c.type,
        ai_prompt: c.ai_prompt,
      }))

    // Get reference page(s) to learn the site's style
    let siteStyleContext = ''

    // Priority 1: Use @-referenced pages from referenceData (with FULL HTML)
    if (referenceData?.pages && referenceData.pages.length > 0) {
      const refPages = referenceData.pages.filter((p) => p.html)
      if (refPages.length > 0) {
        siteStyleContext = '\n\n## STIL-REFERENZ (via @-Mention)'
        for (const page of refPages) {
          // Use FULL HTML, not truncated!
          siteStyleContext += `\n\n### Referenz: "${page.name}" (/${page.slug})
KRITISCH: Das Template MUSS EXAKT im gleichen Stil wie diese Seite gestaltet werden!

KOPIERE DIESE ELEMENTE 1:1 AUS DER REFERENZ:

1. CONTAINER/LAYOUT (SEHR WICHTIG!):
   - Finde die Container-Klassen (z.B. "max-w-7xl mx-auto", "container", "max-w-screen-xl")
   - Verwende EXAKT dieselben max-width Klassen!
   - Kopiere das padding-Pattern (z.B. "px-4 sm:px-6 lg:px-8")
   - Nutze dieselbe Grid-Struktur

2. STYLING:
   - Alle Tailwind-Klassen exakt übernehmen
   - CSS-Variablen (var(--color-brand-primary), etc.)
   - Schatten, Rundungen, Abstände

3. TYPOGRAFIE:
   - font-heading, font-body Klassen
   - Text-Größen und -Gewichte

4. KOMPONENTEN:
   - Karten-Styles (bg, shadow, border, rounded)
   - Button-Styles
   - Hover-Effekte

Hier ist das VOLLSTÄNDIGE HTML der Referenzseite - analysiere es genau:
\`\`\`html
${page.html}
\`\`\``
        }
      }
    }
    // Priority 2: Use specific reference page ID (legacy dropdown)
    else if (referencePageId) {
      const { data: referencePage } = await supabase
        .from('pages')
        .select('name, html_content')
        .eq('id', referencePageId)
        .single()

      if (referencePage?.html_content) {
        const sampleHtml = referencePage.html_content.substring(0, 8000)
        const pageName = referencePage.name || 'Referenzseite'
        siteStyleContext = `\n\n## STIL-REFERENZ: "${pageName}"
KRITISCH: Das Template MUSS EXAKT im gleichen Stil wie diese Referenzseite gestaltet werden!

KOPIERE DIESE ELEMENTE 1:1:

1. CONTAINER/LAYOUT (SEHR WICHTIG!):
   - Finde die Container-Klassen (z.B. "max-w-7xl mx-auto", "container")
   - Verwende EXAKT dieselben max-width Klassen!
   - Kopiere das padding-Pattern (z.B. "px-4 sm:px-6 lg:px-8")

2. STYLING:
   - Farb-Schema und CSS-Variablen (var(--color-...))
   - Schatten, Rundungen, Abstände

3. TYPOGRAFIE & KOMPONENTEN:
   - font-heading, font-body Klassen
   - Karten-Styles, Button-Styles, Hover-Effekte

\`\`\`html
${sampleHtml}
\`\`\``
      }
    }
    // Priority 3: Fallback to any existing page
    else {
      const { data: anyPage } = await supabase
        .from('pages')
        .select('name, html_content')
        .eq('site_id', siteId)
        .not('html_content', 'is', null)
        .limit(1)
        .single()

      if (anyPage?.html_content) {
        const sampleHtml = anyPage.html_content.substring(0, 4000)
        siteStyleContext = `\n\n## SITE-STIL (Beispiel)
\`\`\`html
${sampleHtml}
\`\`\``
      }
    }

    // Build context
    const dvColors = designVars?.colors as Record<string, Record<string, string>> | null | undefined
    const dvTypography = designVars?.typography as Record<string, string> | null | undefined

    const context: TemplateContext = {
      contentType: contentType || {
        id: '',
        site_id: siteId,
        name: 'content',
        label_singular: 'Eintrag',
        label_plural: 'Einträge',
        slug: 'content',
        icon: 'file',
        description: null,
        color: null,
        has_title: true,
        has_slug: true,
        has_content: true,
        has_excerpt: true,
        has_featured_image: true,
        has_author: true,
        has_published_date: true,
        has_seo: false,
        has_archive: templateType === 'archive',
        has_single: templateType === 'single',
        default_sort_field: 'created_at',
        default_sort_order: 'desc',
        menu_position: 0,
        show_in_menu: true,
        seo_template: null,
        created_at: '',
        updated_at: '',
      },
      fields,
      templateType: templateType as 'archive' | 'single' | 'page' | 'taxonomy',
      designTokens: designVars ? {
        primaryColor: dvColors?.brand?.primary || '#8b5cf6',
        secondaryColor: dvColors?.brand?.secondary || '#06b6d4',
        accentColor: dvColors?.brand?.accent || '#f59e0b',
        fontHeading: dvTypography?.fontHeading || 'Inter',
        fontBody: dvTypography?.fontBody || 'Inter',
      } : undefined,
      components: availableComponents.length > 0 ? availableComponents : undefined,
    }

    // Build system prompt with site style context
    const systemPrompt = buildTemplateSystemPrompt(context) + siteStyleContext

    // Build user prompt
    let userPrompt = prompt
    if (currentHtml) {
      userPrompt = `## BESTEHENDES TEMPLATE (NICHT UMSCHREIBEN!)

⚠️ WICHTIG: Dieses Template ist bereits fertig gestaltet. Ändere NUR was angefordert wird!

\`\`\`html
${currentHtml}
\`\`\`

## ÄNDERUNGSANFRAGE:
${prompt}

## ANWEISUNG:
- Kopiere das Template 1:1
- Ändere NUR die Stelle die für die Anfrage relevant ist
- Lass Hero, Sections, Styles, Klassen EXAKT wie sie sind
- Keine "Verbesserungen" oder Redesigns!`
    }

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
        temperature: 1.0,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingBudget: 8192,
        },
      },
    })

    // Extract text from response
    const responseText = response.text || ''

    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse the response
    const result = parseTemplateResponse(responseText)

    // Return the generated template (including optional css)
    return NextResponse.json({
      success: true,
      html: result.html,
      css: result.css || undefined,
      message: result.message,
      suggestions: result.suggestions,
    })

  } catch (error) {
    console.error('Template generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
