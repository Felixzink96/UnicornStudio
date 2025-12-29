import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { buildEntrySystemPrompt, parseEntryContentResponse, ComponentInfo } from '@/lib/ai/entry-system-prompt'
import type { ContentType, Field } from '@/types/cms'

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      prompt,
      siteId,
      contentTypeId,
      fields,
      currentTitle,
    } = body as {
      prompt: string
      siteId: string
      contentTypeId: string
      fields: Array<{
        name: string
        label: string
        type: string
        required?: boolean
        settings?: Record<string, unknown>
        sub_fields?: Array<{ name: string; type: string; label: string }>
      }>
      currentTitle?: string
    }

    if (!prompt || !siteId || !contentTypeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get content type
    const { data: contentType } = await supabase
      .from('content_types')
      .select('*')
      .eq('id', contentTypeId)
      .single()

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type not found' },
        { status: 404 }
      )
    }

    // Get design variables
    const { data: designVars } = await supabase
      .from('design_variables')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get components for this content type
    // Components are available if content_type_ids is empty OR contains this content type
    const { data: components } = await supabase
      .from('cms_components')
      .select('slug, name, description, html, is_required, ai_prompt')
      .eq('site_id', siteId)
      .not('slug', 'is', null)

    // Filter components that are available for this content type
    const availableComponents: ComponentInfo[] = (components || [])
      .filter(c => {
        // Component is available if no content_type_ids specified OR contentTypeId is in the array
        // Since we can't easily filter arrays in Supabase, we do it here
        return c.slug // Only include components with a slug
      })
      .map(c => ({
        slug: c.slug!,
        name: c.name,
        description: c.description,
        html: c.html,
        is_required: c.is_required || false,
        ai_prompt: c.ai_prompt,
      }))

    // Build system prompt
    const colors = designVars?.colors as Record<string, Record<string, string>> | null | undefined
    const typography = designVars?.typography as Record<string, string> | null | undefined

    const systemPrompt = buildEntrySystemPrompt({
      contentType: contentType as ContentType,
      fields: fields as unknown as Field[],
      entryTitle: currentTitle,
      designTokens: designVars ? {
        primaryColor: colors?.brand?.primary || '#8b5cf6',
        secondaryColor: colors?.brand?.secondary || '#06b6d4',
        fontHeading: typography?.fontHeading || 'Inter',
        fontBody: typography?.fontBody || 'Inter',
      } : undefined,
      components: availableComponents,
    })

    // Call Google Gemini
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 1.0,
        maxOutputTokens: 16384,
        topP: 0.95,
        topK: 40,
        thinkingConfig: {
          thinkingBudget: 8192,
        },
      },
    })

    // Extract text content
    const responseText = response.text || ''
    if (!responseText) {
      throw new Error('No text response from AI')
    }

    // Parse response
    const parsed = parseEntryContentResponse(responseText)

    return NextResponse.json({
      title: parsed.title,
      excerpt: parsed.excerpt,
      content: parsed.content,
      data: parsed.data,
      message: parsed.message,
      suggestions: parsed.suggestions,
    })

  } catch (error) {
    console.error('Entry generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate entry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
