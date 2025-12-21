// ============================================
// AI ENTRY CONTENT GENERATION API
// Generate content for entries with AI
// ============================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import {
  buildEntrySystemPrompt,
  parseEntryContentResponse,
  type EntryContext,
} from '@/lib/ai/entry-system-prompt'
import type { ContentType, Field } from '@/types/cms'

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
      entryTitle,
      currentContent,
    } = body as {
      prompt: string
      siteId: string
      contentTypeId: string
      entryTitle?: string
      currentContent?: string
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!siteId || !contentTypeId) {
      return NextResponse.json(
        { error: 'Site ID and Content Type ID are required' },
        { status: 400 }
      )
    }

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

    // Get fields
    const { data: fieldsData } = await supabase
      .from('fields')
      .select('*')
      .eq('content_type_id', contentTypeId)
      .order('position', { ascending: true })

    const fields = (fieldsData || []) as Field[]

    // Get design variables
    const { data: designVars } = await supabase
      .from('design_variables')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Build context
    const dvColors = designVars?.colors as Record<string, Record<string, string>> | null | undefined
    const dvTypography = designVars?.typography as Record<string, string> | null | undefined

    const context: EntryContext = {
      contentType: contentType as ContentType,
      fields,
      entryTitle,
      designTokens: designVars ? {
        primaryColor: dvColors?.brand?.primary || '#8b5cf6',
        secondaryColor: dvColors?.brand?.secondary || '#06b6d4',
        fontHeading: dvTypography?.fontHeading || 'Inter',
        fontBody: dvTypography?.fontBody || 'Inter',
      } : undefined,
    }

    // Build system prompt
    const systemPrompt = buildEntrySystemPrompt(context)

    // Build user prompt
    let userPrompt = prompt
    if (currentContent) {
      userPrompt = `Aktueller Content:\n${currentContent}\n\nAnfrage: ${prompt}`
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
        temperature: 0.85,
        maxOutputTokens: 16384,
        topP: 0.95,
        topK: 40,
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
    const result = parseEntryContentResponse(responseText)

    // Return the generated content
    return NextResponse.json({
      success: true,
      ...result,
    })

  } catch (error) {
    console.error('Entry content generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
