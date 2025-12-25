import { GoogleGenAI } from '@google/genai'
import { buildSystemPrompt, type DesignTokensForAI, type GlobalComponentsForAI, type SiteIdentityForAI, type DesignSystemForAI } from '@/lib/ai/system-prompt'
import { createClient } from '@/lib/supabase/server'
import { darkenHex } from '@/lib/design/style-extractor'
// Note: Explicit caching disabled because it's incompatible with tools (Function Calling)
// Implicit caching via systemInstruction is used instead
import { htmlOperationTools } from '@/lib/ai/html-tools'

// Configure Google AI with longer timeout to prevent ETIMEDOUT on long generations
const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  httpOptions: {
    timeout: 5 * 60 * 1000, // 5 minutes timeout for long AI generations
  },
})

// Extract URLs from prompt for URL Context tool
function extractUrls(prompt: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  return prompt.match(urlRegex) || []
}

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
    const { prompt, existingHtml, context, selectedElement, model: modelId, referencedPages, references, thinkingEnabled, googleSearchEnabled, codeExecutionEnabled, images } = body as {
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
      // NEU: Aufgelöste Referenzen mit IDs für gezielte Updates
      references?: {
        pages?: Array<{ id: string; name: string; slug: string; isHome: boolean; html?: string }>
        menus?: Array<{ id: string; name: string; slug: string; position: string; items: Array<{ id: string; label: string; url: string; linkType: string; pageId?: string; children?: Array<{ id: string; label: string; url: string }> }> }>
        components?: Array<{ id: string; name: string; position: string; html: string; css?: string; js?: string }>
        sections?: Array<{ id: string; selector: string; tagName: string; html: string }>
        entries?: Array<{ id: string; title: string; slug: string; contentType: string; contentTypeId: string; data: Record<string, unknown> }>
        tokens?: Array<{ id: string; name: string; displayName: string; type: string; value: string; category: string }>
        contentTypes?: Array<{
          id: string
          name: string
          slug: string
          labelSingular: string
          labelPlural: string
          entryCount: number
          fields: Array<{ name: string; label: string; type: string; required: boolean; instructions?: string }>
          apiEndpoint: string
          syntaxExample: string
        }>
      }
      thinkingEnabled?: boolean
      // Gemini Tools
      googleSearchEnabled?: boolean
      codeExecutionEnabled?: boolean
      // Images for multimodal analysis
      images?: Array<{ base64: string; mimeType: string }>
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

        // ALWAYS send design tokens if we have design_variables for this site
        // This ensures AI uses our token classes (bg-primary, text-foreground, etc.)
        // instead of hardcoded Tailwind colors
        if (variables) {
          designTokens = {
            colors: {
              primary: colors?.brand?.primary || '#3b82f6',
              primaryHover: darkenHex(colors?.brand?.primary || '#3b82f6', 10),
              secondary: colors?.brand?.secondary || '#64748b',
              accent: colors?.brand?.accent || '#f59e0b',
              background: colors?.neutral?.['50'] || '#ffffff',
              foreground: colors?.neutral?.['900'] || '#0f172a',
              muted: colors?.neutral?.['100'] || '#f1f5f9',
              border: colors?.neutral?.['200'] || '#e2e8f0',
            },
            fonts: {
              heading: typography?.fontHeading || 'Inter',
              body: typography?.fontBody || 'Inter',
            },
          }
          console.log('Design tokens loaded for AI:', designTokens.colors.primary, designTokens.colors.accent)
        } else {
          // No design_variables record, use defaults but still tell AI to use token classes
          designTokens = {
            colors: {
              primary: '#3b82f6',
              primaryHover: '#2563eb',
              secondary: '#64748b',
              accent: '#f59e0b',
              background: '#ffffff',
              foreground: '#0f172a',
              muted: '#f1f5f9',
              border: '#e2e8f0',
            },
            fonts: {
              heading: 'Inter',
              body: 'Inter',
            },
          }
          console.log('Using default design tokens for AI')
        }
      } catch (error) {
        // No design tokens found, use defaults
        console.log('No design_variables for site, using defaults:', siteId)
        designTokens = {
          colors: {
            primary: '#3b82f6',
            primaryHover: '#2563eb',
            secondary: '#64748b',
            accent: '#f59e0b',
            background: '#ffffff',
            foreground: '#0f172a',
            muted: '#f1f5f9',
            border: '#e2e8f0',
          },
          fonts: {
            heading: 'Inter',
            body: 'Inter',
          },
        }
      }
    }

    // Load global components info to tell AI if header/footer already exist
    // FAILSAFE: Always initialize with defaults (never undefined!)
    const globalComponents: GlobalComponentsForAI = {
      hasGlobalHeader: false,
      hasGlobalFooter: false,
    }

    // Site Identity for Logo in Header
    let siteIdentity: SiteIdentityForAI | undefined
    // Design System for consistent styling
    let designSystem: DesignSystemForAI | undefined

    if (siteId) {
      try {
        const { data: site } = await supabase
          .from('sites')
          .select('name, global_header_id, global_footer_id, logo_url, logo_dark_url, tagline')
          .eq('id', siteId)
          .single()

        if (site) {
          globalComponents.hasGlobalHeader = !!site.global_header_id
          globalComponents.hasGlobalFooter = !!site.global_footer_id
          // Include IDs so AI can use COMPONENT_UPDATE format
          if (site.global_header_id) {
            globalComponents.headerId = site.global_header_id
          }
          if (site.global_footer_id) {
            globalComponents.footerId = site.global_footer_id
          }
          console.log('Global components status:', globalComponents)

          // Load Site Identity for AI (Logo, Tagline)
          if (site.logo_url) {
            siteIdentity = {
              logoUrl: site.logo_url,
              logoDarkUrl: site.logo_dark_url,
              siteName: site.name,
              tagline: site.tagline,
            }
            console.log('Site identity loaded for AI:', siteIdentity.logoUrl)
          }
        }
      } catch (error) {
        console.log('Could not load global components info:', error)
        // globalComponents stays with defaults (false, false)
      }

      // Load Design System for consistent styling across pages
      try {
        const { data: ds } = await supabase
          .from('site_design_system')
          .select('*')
          .eq('site_id', siteId)
          .single()

        if (ds) {
          designSystem = {
            button_primary: ds.button_primary,
            button_secondary: ds.button_secondary,
            button_cta: ds.button_cta,
            button_ghost: ds.button_ghost,
            button_link: ds.button_link,
            input: ds.input,
            textarea: ds.textarea,
            select_field: ds.select_field,
            label: ds.label,
            card: ds.card,
            card_hover: ds.card_hover,
            section_padding: ds.section_padding,
            container: ds.container,
            heading_1: ds.heading_1,
            heading_2: ds.heading_2,
            heading_3: ds.heading_3,
            heading_4: ds.heading_4,
            body_text: ds.body_text,
            small_text: ds.small_text,
            link_style: ds.link_style,
            badge: ds.badge,
            icon_wrapper: ds.icon_wrapper,
            image_wrapper: ds.image_wrapper,
            archetyp: ds.archetyp,
          }
          console.log('Design System loaded for AI:', ds.archetyp)
        }
      } catch (error) {
        console.log('No Design System found for site:', siteId)
        // designSystem stays undefined - AI will use default classes
      }
    }

    // Build the system prompt with context and design tokens
    const systemPrompt = buildSystemPrompt({
      siteType: context?.siteType,
      industry: context?.industry,
      style: context?.style,
      designTokens,
      globalComponents,
      siteIdentity,
      designSystem,
    })

    // Determine if page has content
    const hasExistingContent = existingHtml && existingHtml.includes('<section')

    // Build user message
    let userMessage = `ANFRAGE: ${prompt}\n\n`

    // NEU: Referenzierte Elemente hinzufügen (mit IDs für Updates)
    const hasReferences = references && (
      references.components?.length ||
      references.menus?.length ||
      references.sections?.length ||
      references.tokens?.length ||
      references.entries?.length ||
      references.contentTypes?.length
    )

    if (hasReferences) {
      userMessage += `## REFERENZIERTE ELEMENTE (AENDERE NUR DIESE!)\n\n`
      userMessage += `Der User hat spezifische Elemente referenziert. Aendere NUR diese Elemente!\n\n`

      // Components (Header/Footer)
      if (references.components && references.components.length > 0) {
        for (const comp of references.components) {
          userMessage += `### @${comp.name} (${comp.position.toUpperCase()} - ID: ${comp.id})\n`
          userMessage += `\`\`\`html\n${comp.html}\n\`\`\`\n\n`
        }
      }

      // Sections
      if (references.sections && references.sections.length > 0) {
        for (const section of references.sections) {
          userMessage += `### @${section.id} (SECTION - Selector: ${section.selector})\n`
          userMessage += `\`\`\`html\n${section.html}\n\`\`\`\n\n`
        }
      }

      // Menus
      if (references.menus && references.menus.length > 0) {
        for (const menu of references.menus) {
          userMessage += `### @${menu.name} (MENU - ID: ${menu.id})\n`
          userMessage += `Position: ${menu.position}\n`
          userMessage += `Items:\n`
          for (const item of menu.items) {
            userMessage += `  - ${item.label} -> ${item.url}\n`
            if (item.children) {
              for (const child of item.children) {
                userMessage += `    - ${child.label} -> ${child.url}\n`
              }
            }
          }
          userMessage += `\n`
        }
      }

      // Design Tokens
      if (references.tokens && references.tokens.length > 0) {
        userMessage += `### DESIGN TOKENS\n`
        userMessage += `⚠️ WICHTIG: Bei Änderungen an Design Tokens KEIN HTML generieren!\n`
        userMessage += `Verwende NUR das TOKEN_UPDATE Format um den Wert zu ändern.\n\n`
        for (const token of references.tokens) {
          userMessage += `- @${token.displayName} (${token.type}): ${token.value} [ID: ${token.id}]\n`
        }
        userMessage += `\n`
      }

      // Entries
      if (references.entries && references.entries.length > 0) {
        for (const entry of references.entries) {
          userMessage += `### @${entry.title} (${entry.contentType} - ID: ${entry.id})\n`
          userMessage += `Daten: ${JSON.stringify(entry.data, null, 2)}\n\n`
        }
      }

      // Content Types (für dynamische Entries-Anzeige)
      if (references.contentTypes && references.contentTypes.length > 0) {
        userMessage += `### CONTENT TYPES (für dynamische Inhalte)\n\n`
        userMessage += `⚠️ WICHTIG: Verwende die {{#entries:...}} Syntax um Inhalte dynamisch anzuzeigen!\n`
        userMessage += `Diese werden serverseitig gerendert (SEO-freundlich).\n\n`

        for (const ct of references.contentTypes) {
          userMessage += `#### @${ct.labelPlural} (Content Type: ${ct.name})\n`
          userMessage += `- Slug: \`${ct.slug}\`\n`
          userMessage += `- Einträge: ${ct.entryCount} veröffentlicht\n`
          userMessage += `- Felder:\n`
          for (const field of ct.fields) {
            userMessage += `  - \`${field.name}\` (${field.type})${field.required ? ' *required*' : ''}: ${field.label}\n`
          }
          userMessage += `\n**Syntax-Beispiel:**\n\`\`\`handlebars\n${ct.syntaxExample}\n\`\`\`\n\n`
          userMessage += `**Verfügbare Variablen im Loop:**\n`
          userMessage += `- \`{{title}}\` - Titel des Eintrags\n`
          userMessage += `- \`{{slug}}\` - URL-Slug\n`
          userMessage += `- \`{{url}}\` - Vollständige URL zum Eintrag\n`
          userMessage += `- \`{{excerpt}}\` - Kurztext\n`
          userMessage += `- \`{{featured_image}}\` - Bild-URL\n`
          userMessage += `- \`{{published_at}}\` - Veröffentlichungsdatum\n`
          userMessage += `- \`{{data.FELDNAME}}\` - Custom Fields (z.B. {{data.preis}}, {{data.datum}})\n\n`
          userMessage += `**Optionen:**\n`
          userMessage += `- \`limit=N\` - Anzahl der Einträge (z.B. limit=4)\n`
          userMessage += `- \`sort="feld:asc|desc"\` - Sortierung (z.B. sort="data.datum:asc")\n`
          userMessage += `- \`wrapper="div"\` - Wrapper-Element\n`
          userMessage += `- \`wrapperClass="grid grid-cols-4"\` - CSS-Klassen für Wrapper\n\n`
        }
      }

      // Antwort-Format für Referenz-Updates
      userMessage += `## ANTWORT-FORMAT FUER REFERENZ-UPDATES\n\n`
      userMessage += `Verwende folgendes Format wenn du referenzierte Elemente aenderst:\n\n`
      userMessage += `\`\`\`
MESSAGE: Beschreibung der Aenderung
---
COMPONENT_UPDATE:
id: "component-id"
type: "header" oder "footer"
---
<neues html>
---
\`\`\`

Fuer Sections:
\`\`\`
SECTION_UPDATE:
selector: "#section-id"
---
<neues section html>
---
\`\`\`

Fuer Design Tokens:
\`\`\`
TOKEN_UPDATE:
id: "token-id"
value: "neuer-wert"
---
\`\`\`

Fuer Menu-Aenderungen:
\`\`\`
MENU_UPDATE:
id: "menu-id"
action: "add" | "remove" | "reorder" | "update"
items:
  - label: "Label"
    page: "@SeitenName"
---
\`\`\`

Fuer Entry-Aenderungen:
\`\`\`
ENTRY_UPDATE:
id: "entry-id"
data:
  field: "neuer wert"
---
\`\`\`

Du kannst MEHRERE Updates in einer Antwort zurueckgeben wenn mehrere Elemente referenziert wurden!\n\n`
    }

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
    const selectedModel = modelId || 'gemini-3-flash-preview'

    // Build Gemini Tools array based on request settings
    const tools: Array<Record<string, unknown>> = []

    // Check if other tools are enabled (Function Calling can't be combined with these)
    // Note: URL Context CAN be combined with function calling
    const hasIncompatibleTools = googleSearchEnabled || codeExecutionEnabled

    // ONLY add HTML operation tools if no incompatible tools are enabled
    let useFunctionCalling = false
    if (!hasIncompatibleTools) {
      tools.push({
        functionDeclarations: htmlOperationTools
      })
      useFunctionCalling = true
      console.log('[AI] HTML Operation Tools enabled (Function Calling)')
    } else {
      console.log('[AI] Function Calling disabled - using text-based output (other tools active)')
    }

    // URL Context: Disabled for now - was causing issues with function calling
    // Only enable if user explicitly requests it in the future
    // const detectedUrls = extractUrls(prompt)
    // if (detectedUrls.length > 0) {
    //   tools.push({ urlContext: {} })
    //   console.log('URL Context enabled for:', detectedUrls)
    // }

    // Google Search Grounding
    if (googleSearchEnabled) {
      tools.push({ googleSearch: {} })
      console.log('Google Search enabled')
    }

    // Code Execution (Python)
    if (codeExecutionEnabled) {
      tools.push({ codeExecution: {} })
      console.log('Code Execution enabled')
    }

    // Build generation config
    const config: Record<string, unknown> = {
      temperature: 1.8,       // Kreativ aber noch konsistent
      topP: 0.92,             // Etwas fokussierter für bessere Konsistenz
      topK: 64,               // Größere Token-Auswahl für Kreativität
      maxOutputTokens: 65536, // Maximum für große Seiten
    }

    // Add tools if any are enabled
    if (tools.length > 0) {
      config.tools = tools

      // Force function calling when HTML tools are active
      // This ensures AI MUST call a function instead of returning free text
      if (useFunctionCalling) {
        config.toolConfig = {
          functionCallingConfig: {
            mode: 'ANY', // AI MUST call one of the available functions
          }
        }
        console.log('[AI] Function Calling Mode: ANY (forced)')
      }
    }

    // Always enable thinking on high for best results
    // WICHTIG: Gemini 3 verwendet 'thinkingLevel', ältere Modelle 'thinkingBudget'
    if (selectedModel.includes('gemini-3')) {
      // Gemini 3: thinking_level statt thinking_budget
      config.thinkingConfig = {
        includeThoughts: thinkingEnabled, // Nur anzeigen wenn User es will
        thinkingLevel: 'high' as const, // Immer high für beste Qualität
      }
    } else {
      // Gemini 2.5 und älter: thinking_budget
      config.thinkingConfig = {
        includeThoughts: thinkingEnabled,
        thinkingBudget: 32768,
      }
    }

    // Media resolution for image/video analysis - high for good quality/cost balance
    // Valid values: MEDIA_RESOLUTION_LOW, MEDIA_RESOLUTION_MEDIUM, MEDIA_RESOLUTION_HIGH
    config.mediaResolution = 'MEDIA_RESOLUTION_HIGH'

    // Use systemInstruction for system prompt
    // Note: Explicit caching (cachedContent) kann nicht mit tools kombiniert werden
    // Da wir htmlOperationTools standardmäßig verwenden, nutzen wir implicit caching via systemInstruction
    // Gemini cached systemInstruction automatisch bei wiederholten Anfragen
    config.systemInstruction = systemPrompt

    // Log prompt version for cache debugging
    const versionMatch = systemPrompt.match(/PROMPT_V:\s*([^\s->]+)/)
    const promptVersion = versionMatch ? versionMatch[1] : 'unknown'
    console.log(`[AI] System Prompt Version: ${promptVersion}`)
    console.log(`[AI] CACHING: ENABLED`)
    console.log(`[AI] System Prompt Length: ${systemPrompt.length} chars`)

    // Build user message parts (text + optional images)
    const userParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

    // Add images first if present
    if (images && images.length > 0) {
      for (const img of images) {
        userParts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType,
          }
        })
      }
      console.log(`[AI] Including ${images.length} image(s) in request`)
    }

    // Add text prompt
    userParts.push({ text: userMessage })

    // Generate with streaming using new SDK
    const response = await genAI.models.generateContentStream({
      model: selectedModel,
      contents: [
        // Only user message - system prompt is now in config
        { role: 'user', parts: userParts }
      ],
      config: Object.keys(config).length > 0 ? config : undefined,
    })

    // Create a ReadableStream that emits SSE events
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // Track controller state to avoid "Controller already closed" errors
        let isClosed = false
        let heartbeatInterval: ReturnType<typeof setInterval> | null = null

        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data)
            } catch {
              isClosed = true
            }
          }
        }

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            // Clear heartbeat interval
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval)
              heartbeatInterval = null
            }
            try {
              controller.close()
            } catch {
              // Already closed, ignore
            }
          }
        }

        // Start heartbeat to keep connection alive during long AI processing
        // SSE comment lines (starting with :) are ignored by clients but keep connection open
        heartbeatInterval = setInterval(() => {
          if (!isClosed) {
            safeEnqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`))
          }
        }, 8000) // Every 8 seconds (well under typical 30-60s proxy timeouts)

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

            // Handle Google Search grounding metadata
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const candidate = chunk.candidates?.[0] as any
            if (candidate?.groundingMetadata) {
              const gm = candidate.groundingMetadata
              const searchData = JSON.stringify({
                type: 'search_results',
                queries: gm.webSearchQueries || [],
                sources: gm.groundingChunks?.map((c: { web?: { title?: string; uri?: string } }) => ({
                  title: c.web?.title || 'Unknown',
                  uri: c.web?.uri || '',
                })) || [],
              })
              safeEnqueue(encoder.encode(`data: ${searchData}\n\n`))
            }

            // Check for thought parts when thinking is enabled
            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const anyPart = part as any

                // Handle Function Calls (HTML Operations)
                if (anyPart.functionCall) {
                  const functionCallData = JSON.stringify({
                    type: 'function_call',
                    name: anyPart.functionCall.name,
                    args: anyPart.functionCall.args,
                  })
                  safeEnqueue(encoder.encode(`data: ${functionCallData}\n\n`))
                  console.log('[AI] Function Call:', anyPart.functionCall.name)
                }
                // Handle thinking content
                else if (anyPart.thought && part.text) {
                  const thinkingData = JSON.stringify({ type: 'thinking', content: part.text })
                  safeEnqueue(encoder.encode(`data: ${thinkingData}\n\n`))
                }
                // Handle executable code from Code Execution tool
                else if (anyPart.executableCode?.code) {
                  const codeData = JSON.stringify({
                    type: 'executable_code',
                    language: anyPart.executableCode.language || 'python',
                    code: anyPart.executableCode.code,
                  })
                  safeEnqueue(encoder.encode(`data: ${codeData}\n\n`))
                }
                // Handle code execution results
                else if (anyPart.codeExecutionResult?.output) {
                  const resultData = JSON.stringify({
                    type: 'code_result',
                    output: anyPart.codeExecutionResult.output,
                  })
                  safeEnqueue(encoder.encode(`data: ${resultData}\n\n`))
                }
                // Handle regular text content
                else if (part.text) {
                  const data = JSON.stringify({ type: 'text', content: part.text })
                  safeEnqueue(encoder.encode(`data: ${data}\n\n`))
                }
              }
            } else if (chunk.text) {
              // Fallback for simple text response
              const data = JSON.stringify({ type: 'text', content: chunk.text })
              safeEnqueue(encoder.encode(`data: ${data}\n\n`))
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
          safeEnqueue(encoder.encode(`data: ${doneData}\n\n`))
          safeClose()
        } catch (error) {
          console.error('Streaming error:', error)
          // Clear heartbeat on error
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
          // Send error to client if stream is still open
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error && error.message.includes('ETIMEDOUT')
              ? 'Verbindung zur KI unterbrochen. Bitte erneut versuchen.'
              : String(error)
          })
          safeEnqueue(encoder.encode(`data: ${errorData}\n\n`))
          safeClose()
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
