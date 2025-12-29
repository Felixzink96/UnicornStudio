// ============================================
// AI FIELD GENERATION API
// Natural Language → Field Structure
// ============================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import {
  FIELD_GENERATION_SYSTEM_PROMPT,
  parseFieldGenerationResponse,
  buildFieldGenerationPrompt,
  type GeneratedField,
  type ContentTypeFlags,
} from '@/lib/ai/field-generation'

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
      contentTypeName,
      contentTypeId,
      siteId,
      existingFields,
    } = body as {
      prompt: string
      contentTypeName?: string
      contentTypeId?: string
      siteId: string
      existingFields?: GeneratedField[]
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

    // Fetch content type flags if we have a contentTypeId
    let contentTypeFlags: ContentTypeFlags | undefined

    if (contentTypeId) {
      const { data: contentType } = await supabase
        .from('content_types')
        .select('has_title, has_slug, has_content, has_excerpt, has_featured_image, has_author, has_published_date, has_seo')
        .eq('id', contentTypeId)
        .single()

      if (contentType) {
        contentTypeFlags = {
          has_title: contentType.has_title ?? true,
          has_slug: contentType.has_slug ?? true,
          has_content: contentType.has_content ?? false,
          has_excerpt: contentType.has_excerpt ?? false,
          has_featured_image: contentType.has_featured_image ?? false,
          has_author: contentType.has_author ?? false,
          has_published_date: contentType.has_published_date ?? false,
          has_seo: contentType.has_seo ?? false,
        }
      }
    }

    // Build the user prompt with content type context
    const userPrompt = buildFieldGenerationPrompt(prompt, contentTypeName, existingFields, contentTypeFlags)

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
        systemInstruction: FIELD_GENERATION_SYSTEM_PROMPT,
        temperature: 1.0,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingBudget: 4096,
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
    const result = parseFieldGenerationResponse(responseText)

    // Return the generated fields
    return NextResponse.json({
      success: true,
      ...result,
    })

  } catch (error) {
    console.error('Field generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate fields',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
