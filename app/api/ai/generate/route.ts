import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { prompt, existingHtml, context, selectedElement, model: modelId, referencedPages } = body as {
      prompt: string
      existingHtml?: string
      context?: { siteType?: string; industry?: string; style?: string; colors?: Record<string, string>; fonts?: Record<string, string> }
      selectedElement?: { outerHTML: string; selector?: string }
      model?: string
      referencedPages?: Array<{ name: string; html: string }>
    }

    // Build the system prompt with context
    const systemPrompt = buildSystemPrompt({
      siteType: context?.siteType,
      industry: context?.industry,
      style: context?.style,
      colors: context?.colors,
      fonts: context?.fonts,
    })

    // Determine if page has content
    const hasExistingContent = existingHtml && existingHtml.includes('<section')

    // Build user message
    let userMessage = `ANFRAGE: ${prompt}\n\n`

    // Add referenced pages as style guide
    if (referencedPages && referencedPages.length > 0) {
      userMessage += `REFERENZIERTE SEITEN (nutze diese als Style-Guide!):\n`
      for (const page of referencedPages) {
        userMessage += `\n--- @${page.name} ---\n\`\`\`html\n${page.html}\n\`\`\`\n`
      }
      userMessage += `\nÜBERNIMM DAS DESIGN DIESER SEITE(N) EXAKT für die neue Seite/Section!\n\n`
    }

    if (hasExistingContent) {
      userMessage += `BESTEHENDE SEITE - ANALYSIERE SIE GENAU:
\`\`\`html
${existingHtml}
\`\`\`

DEINE AUFGABEN:
1. Analysiere die bestehende Seite: Welches Thema? Welche Farben? Welcher Stil?
2. Erstelle Content der thematisch passt (KEIN generischer Text!)
3. Übernimm exakt das Farbschema und Design der bestehenden Sections
4. Verwende OPERATION: add um die neue Section hinzuzufügen

Die neue Section muss aussehen als wäre sie Teil der existierenden Seite!`
    } else {
      userMessage += `Die Seite ist leer. Verwende OPERATION: replace_all um eine komplette HTML-Seite zu erstellen.`
    }

    if (selectedElement) {
      userMessage = `ELEMENT BEARBEITEN:
\`\`\`html
${selectedElement.outerHTML}
\`\`\`

Selector: ${selectedElement.selector || 'unbekannt'}

ANFRAGE: ${prompt}

Verwende OPERATION: modify mit dem passenden SELECTOR.`
    }

    // Initialize Gemini model (no JSON schema - just text streaming)
    const model = genAI.getGenerativeModel({
      model: modelId || 'gemini-3-pro-preview',
      systemInstruction: systemPrompt,
    })

    // Generate with streaming
    const result = await model.generateContentStream(userMessage)

    // Create a ReadableStream that emits SSE events
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              const data = JSON.stringify({ type: 'text', content: text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }

          // Get final response for token count
          const response = await result.response

          const doneData = JSON.stringify({
            type: 'done',
            usage: {
              input_tokens: response.usageMetadata?.promptTokenCount || 0,
              output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
            }
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          const errorData = JSON.stringify({ type: 'error', message: String(error) })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI Generation Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate content', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
