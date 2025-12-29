import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { buildComponentGeneratorPrompt, parseComponentResponse } from '@/lib/ai/component-generator-prompt'

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      prompt,
      siteId,
      componentType,
      referenceData,
    } = body as {
      prompt: string
      siteId: string
      componentType?: 'element' | 'block' | 'section' | 'layout'
      referenceData?: {
        pages?: Array<{ id: string; name: string; slug: string; html?: string }>
        components?: Array<{ id: string; name: string; html: string; css?: string; js?: string }>
      }
    }

    if (!prompt || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get existing components for context
    const { data: existingComponents } = await supabase
      .from('cms_components')
      .select('name, slug, description')
      .eq('site_id', siteId)
      .not('slug', 'is', null)
      .limit(20)

    // Filter and map to ensure slug is not null
    const filteredComponents = (existingComponents || [])
      .filter((c): c is { name: string; slug: string; description: string | null } => c.slug !== null)

    // Get content types and their fields for context
    const { data: contentTypes } = await supabase
      .from('content_types')
      .select('id, name, label_singular, label_plural, slug')
      .eq('site_id', siteId)

    // Get fields for each content type
    const contentTypeFields: Array<{
      contentType: string
      slug: string
      fields: Array<{ name: string; label: string; type: string; sub_fields?: unknown[] }>
    }> = []

    if (contentTypes) {
      for (const ct of contentTypes) {
        const { data: fields } = await supabase
          .from('fields')
          .select('name, label, type, sub_fields')
          .eq('content_type_id', ct.id)
          .order('position')

        if (fields && fields.length > 0) {
          contentTypeFields.push({
            contentType: ct.label_plural || ct.name,
            slug: ct.slug,
            fields: fields.map(f => ({
              name: f.name,
              label: f.label,
              type: f.type,
              sub_fields: f.sub_fields as unknown[] | undefined,
            })),
          })
        }
      }
    }

    // Build system prompt
    const systemPrompt = buildComponentGeneratorPrompt({
      description: prompt,
      componentType,
      existingComponents: filteredComponents,
      contentTypeFields,
    })

    // Build user message with optional reference context
    let userMessage = `Erstelle eine Komponente: ${prompt}`
    if (referenceData) {
      let refContext = '## KONTEXT (Referenzen)\n'

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

      userMessage = `${refContext}\n## AUFGABE\nErstelle eine Komponente: ${prompt}`
    }

    // Call Google Gemini
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 1.0,
        maxOutputTokens: 8192,
        topP: 0.9,
        topK: 40,
      },
    })

    // Extract text content
    const responseText = response.text || ''
    if (!responseText) {
      throw new Error('No text response from AI')
    }

    // Parse response
    const parsed = parseComponentResponse(responseText)

    if (!parsed) {
      throw new Error('Failed to parse AI response')
    }

    return NextResponse.json({
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      type: parsed.type,
      category: parsed.category,
      html: parsed.html,
      css: parsed.css,
      js: parsed.js,
      js_init: parsed.js_init,
      ai_prompt: parsed.ai_prompt,
      message: `Komponente "${parsed.name}" wurde erstellt.`,
    })

  } catch (error) {
    console.error('Component generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate component',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
