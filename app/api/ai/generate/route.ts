import { GoogleGenAI } from '@google/genai'
import { buildSystemPrompt, type DesignTokensForAI, type GlobalComponentsForAI } from '@/lib/ai/system-prompt'
import { createClient } from '@/lib/supabase/server'
import { darkenHex } from '@/lib/design/style-extractor'

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })

// Extract style summary from HTML to reduce token usage
// Instead of sending full page HTML (~10k tokens), send compact summary (~500 tokens)
function extractStyleSummary(html: string): string {
  const summary: string[] = []

  // Extract section IDs
  const sectionIds = html.match(/id=["']([^"']+)["']/g)?.map(m => m.match(/["']([^"']+)["']/)?.[1]).filter(Boolean) || []
  if (sectionIds.length > 0) {
    summary.push(`Sections: ${sectionIds.slice(0, 8).join(', ')}`)
  }

  // Extract color classes (most common)
  const bgColors = html.match(/\bbg-[a-z]+-\d{2,3}\b/g) || []
  const textColors = html.match(/\btext-[a-z]+-\d{2,3}\b/g) || []
  const uniqueBgColors = [...new Set(bgColors)].slice(0, 5)
  const uniqueTextColors = [...new Set(textColors)].slice(0, 5)

  if (uniqueBgColors.length > 0) {
    summary.push(`Hintergrund-Farben: ${uniqueBgColors.join(', ')}`)
  }
  if (uniqueTextColors.length > 0) {
    summary.push(`Text-Farben: ${uniqueTextColors.join(', ')}`)
  }

  // Extract button styles (first button found)
  const buttonMatch = html.match(/<button[^>]*class=["']([^"']+)["'][^>]*>/i)
  if (buttonMatch) {
    summary.push(`Button-Style: ${buttonMatch[1].split(' ').slice(0, 10).join(' ')}`)
  }

  // Extract gradient usage
  const gradients = html.match(/\bbg-gradient-to-[a-z]+\b/g)
  if (gradients && gradients.length > 0) {
    summary.push(`Gradients: ${[...new Set(gradients)].join(', ')}`)
  }

  // Extract spacing patterns
  const sectionPadding = html.match(/\bpy-\d+\b/g)
  if (sectionPadding) {
    const commonPadding = [...new Set(sectionPadding)].slice(0, 3)
    summary.push(`Section-Padding: ${commonPadding.join(', ')}`)
  }

  // Extract font classes
  const fontClasses = html.match(/\bfont-(sans|serif|mono|heading|body|[a-z]+)\b/g)
  if (fontClasses) {
    summary.push(`Fonts: ${[...new Set(fontClasses)].join(', ')}`)
  }

  // Extract border-radius patterns
  const rounded = html.match(/\brounded(-[a-z]+)?\b/g)
  if (rounded) {
    summary.push(`Border-Radius: ${[...new Set(rounded)].slice(0, 4).join(', ')}`)
  }

  // Extract one sample heading for context
  const h1Match = html.match(/<h1[^>]*>([^<]+)</i)
  const h2Match = html.match(/<h2[^>]*>([^<]+)</i)
  if (h1Match) {
    summary.push(`Haupt-Headline: "${h1Match[1].trim().substring(0, 50)}"`)
  } else if (h2Match) {
    summary.push(`Headline-Beispiel: "${h2Match[1].trim().substring(0, 50)}"`)
  }

  return summary.join('\n')
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { prompt, existingHtml, context, selectedElement, model: modelId, referencedPages, thinkingEnabled } = body as {
      prompt: string
      existingHtml?: string
      context?: {
        siteId?: string
        siteType?: string
        industry?: string
        style?: string
        colors?: Record<string, string>
        fonts?: Record<string, string>
      }
      selectedElement?: { outerHTML: string; selector?: string }
      model?: string
      referencedPages?: Array<{ name: string; html: string }>
      thinkingEnabled?: boolean
    }

    // Load design tokens from database if siteId is provided
    let designTokens: DesignTokensForAI | undefined
    const siteId = context?.siteId

    if (siteId) {
      try {
        const { data: variables } = await supabase
          .from('design_variables')
          .select('*')
          .eq('site_id', siteId)
          .single()

        // Type cast the JSON fields
        const colors = variables?.colors as Record<string, Record<string, string>> | null
        const typography = variables?.typography as Record<string, string> | null

        // Check if site has custom design tokens (not default)
        // Database default is #3b82f6 (blue-500)
        const defaultPrimary = '#3b82f6'
        if (variables && colors?.brand?.primary && colors.brand.primary !== defaultPrimary) {
          designTokens = {
            colors: {
              primary: colors.brand.primary,
              primaryHover: darkenHex(colors.brand.primary, 10),
              secondary: colors.brand.secondary || '#64748b',
              accent: colors.brand.accent || colors.brand.secondary || '#f59e0b',
              background: colors.neutral?.['50'] || '#ffffff',
              foreground: colors.neutral?.['900'] || '#0f172a',
              muted: colors.neutral?.['100'] || '#f1f5f9',
              border: colors.neutral?.['200'] || '#e2e8f0',
            },
            fonts: {
              heading: typography?.fontHeading || 'Inter',
              body: typography?.fontBody || 'Inter',
            },
          }
        }
      } catch (error) {
        // No design tokens found, continue without them
        console.log('No custom design tokens for site:', siteId)
      }
    }

    // Load global components info to tell AI if header/footer already exist
    // FAILSAFE: Always initialize with defaults (never undefined!)
    const globalComponents: GlobalComponentsForAI = {
      hasGlobalHeader: false,
      hasGlobalFooter: false,
    }

    if (siteId) {
      try {
        const { data: site } = await supabase
          .from('sites')
          .select('global_header_id, global_footer_id')
          .eq('id', siteId)
          .single()

        if (site) {
          globalComponents.hasGlobalHeader = !!site.global_header_id
          globalComponents.hasGlobalFooter = !!site.global_footer_id
          console.log('Global components status:', globalComponents)
        }
      } catch (error) {
        console.log('Could not load global components info:', error)
        // globalComponents stays with defaults (false, false)
      }
    }

    // Build the system prompt with context and design tokens
    const systemPrompt = buildSystemPrompt({
      siteType: context?.siteType,
      industry: context?.industry,
      style: context?.style,
      colors: context?.colors,
      fonts: context?.fonts,
      designTokens,
      globalComponents,
    })

    // Determine if page has content
    const hasExistingContent = existingHtml && existingHtml.includes('<section')

    // Build user message
    let userMessage = `ANFRAGE: ${prompt}\n\n`

    // Add referenced pages as style guide
    // FAILSAFE: Remove header/footer from referenced pages if global components exist
    if (referencedPages && referencedPages.length > 0) {
      userMessage += `REFERENZIERTE SEITEN (nutze diese als Style-Guide!):\n`
      for (const page of referencedPages) {
        let pageHtml = page.html

        // Strip header/footer from referenced pages to prevent AI from copying them
        if (globalComponents.hasGlobalHeader || globalComponents.hasGlobalFooter) {
          // Remove <header>...</header> tags
          if (globalComponents.hasGlobalHeader) {
            pageHtml = pageHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '<!-- HEADER ENTFERNT - GLOBAL VORHANDEN -->')
            // Also remove fixed navs at the start that act as headers
            pageHtml = pageHtml.replace(/(<body[^>]*>\s*)(<nav[^>]*class="[^"]*fixed[^"]*"[^>]*>[\s\S]*?<\/nav>)/gi, '$1<!-- NAV ENTFERNT -->')
          }

          // Remove <footer>...</footer> tags
          if (globalComponents.hasGlobalFooter) {
            pageHtml = pageHtml.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '<!-- FOOTER ENTFERNT - GLOBAL VORHANDEN -->')
          }
        }

        userMessage += `\n--- @${page.name} ---\n\`\`\`html\n${pageHtml}\n\`\`\`\n`
      }
      userMessage += `\nÜBERNIMM DAS DESIGN DIESER SEITE(N) EXAKT für die neue Seite/Section!\n`
      userMessage += `⚠️ WICHTIG: Header und Footer sind global und wurden entfernt - generiere NUR Content-Sections!\n\n`
    }

    if (hasExistingContent) {
      userMessage += `⚠️ WICHTIG: DIE SEITE HAT BEREITS INHALT!

BESTEHENDER HTML-CODE:
\`\`\`html
${existingHtml}
\`\`\`

🚫 VERBOTEN: replace_all oder kompletten HTML-Code mit <!DOCTYPE> ausgeben!
✅ PFLICHT: Nur OPERATION: add, modify oder delete verwenden!

DEINE AUFGABEN:
1. Analysiere den bestehenden Code und übernimm exakt das Design
2. Gib NUR den NEUEN/GEÄNDERTEN Teil aus - NICHT die ganze Seite!
3. Bei Löschungen: Verwende OPERATION: delete mit SELECTOR

BEISPIEL FÜR KORREKTEN OUTPUT:
\`\`\`
MESSAGE: Neue FAQ Section hinzugefügt
---
OPERATION: add
POSITION: end
---
<section id="faq" class="py-24 bg-white">
  ... NUR diese Section ...
</section>
\`\`\`

❌ FALSCH: <!DOCTYPE html>... komplette Seite
✅ RICHTIG: Nur <section>... neue Section ...</section>`
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

    // Always use the model selected by user in chat
    const selectedModel = modelId || 'gemini-2.0-flash'

    // Build generation config
    const config: Record<string, unknown> = {
      temperature: 1.2,       // Hoch = sehr kreativ
      topP: 0.85,             // Fokussiert aber nicht zu eingeschränkt
      topK: 40,               // Standard Token-Auswahl
      maxOutputTokens: 65536, // Maximum für große Seiten
    }

    // Add thinking config if enabled
    if (thinkingEnabled) {
      config.thinkingConfig = {
        includeThoughts: true,
        thinkingBudget: 8192,
      }
    }

    // Generate with streaming using new SDK
    const response = await genAI.models.generateContentStream({
      model: selectedModel,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMessage }] }
      ],
      config: Object.keys(config).length > 0 ? config : undefined,
    })

    // Create a ReadableStream that emits SSE events
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Track usage metadata from chunks
          let usageMetadata: {
            promptTokenCount?: number
            candidatesTokenCount?: number
            totalTokenCount?: number
            thoughtsTokenCount?: number
          } | null = null

          for await (const chunk of response) {
            // Capture usage metadata if available (usually on last chunk)
            if (chunk.usageMetadata) {
              usageMetadata = chunk.usageMetadata
            }

            // Check for thought parts when thinking is enabled
            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                if (part.thought && part.text) {
                  // Send thinking content
                  const thinkingData = JSON.stringify({ type: 'thinking', content: part.text })
                  controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`))
                } else if (part.text) {
                  // Send regular content
                  const data = JSON.stringify({ type: 'text', content: part.text })
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                }
              }
            } else if (chunk.text) {
              // Fallback for simple text response
              const data = JSON.stringify({ type: 'text', content: chunk.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }

          // Send done event with actual usage data
          const doneData = JSON.stringify({
            type: 'done',
            usage: {
              input_tokens: usageMetadata?.promptTokenCount || 0,
              output_tokens: usageMetadata?.candidatesTokenCount || 0,
              thinking_tokens: usageMetadata?.thoughtsTokenCount || 0,
              total_tokens: usageMetadata?.totalTokenCount || 0,
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
