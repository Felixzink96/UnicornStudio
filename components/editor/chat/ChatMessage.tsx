'use client'

import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { useEditorStore } from '@/stores/editor-store'
import {
  Copy,
  Check,
  Loader2,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Code,
  Eye,
  Layers,
  Brain,
  Settings,
  Globe,
  ExternalLink,
  Terminal,
} from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/editor'
import type { DesignVariables } from '@/types/cms'
import { removeHeaderFooterFromHtml, extractGlobalComponents, injectCSSVariables } from '@/lib/ai/html-operations'
import type { ReferenceUpdate, ComponentUpdate, MenuUpdate } from '@/lib/ai/reference-operations'
import { executeMenuOperation } from '@/lib/ai/menu-operations'
import { createClient } from '@/lib/supabase/client'

interface ChatMessageProps {
  message: ChatMessageType
  onOpenSetup?: (prompt: string) => void
}

export function ChatMessage({ message, onOpenSetup }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [showThinking, setShowThinking] = useState(false)

  const applyGeneratedHtml = useEditorStore((s) => s.applyGeneratedHtml)
  const html = useEditorStore((s) => s.html)
  const deleteMessage = useEditorStore((s) => s.deleteMessage)
  const setMessageApplied = useEditorStore((s) => s.setMessageApplied)
  const save = useEditorStore((s) => s.save)
  const designVariables = useEditorStore((s) => s.designVariables)
  const globalHeader = useEditorStore((s) => s.globalHeader)
  const globalFooter = useEditorStore((s) => s.globalFooter)

  // Generate CSS variables from design tokens for preview
  const designTokensCSS = useMemo(() => {
    if (!designVariables) return ''

    const colors = designVariables.colors as Record<string, Record<string, string>> | undefined
    // Typography has nested objects, use unknown intermediate cast
    const typography = designVariables.typography as unknown as Record<string, string | Record<string, string>> | undefined

    const vars: string[] = []

    if (colors?.brand) {
      const primary = colors.brand.primary || '#3b82f6'
      vars.push(`--color-primary: ${primary}`)
      vars.push(`--color-primary-hover: ${primary}`) // simplified
      vars.push(`--color-secondary: ${colors.brand.secondary || '#64748b'}`)
      vars.push(`--color-accent: ${colors.brand.accent || '#f59e0b'}`)
    }

    if (colors?.neutral) {
      vars.push(`--color-background: ${colors.neutral['50'] || '#ffffff'}`)
      vars.push(`--color-foreground: ${colors.neutral['900'] || '#0f172a'}`)
      vars.push(`--color-muted: ${colors.neutral['100'] || '#f1f5f9'}`)
      vars.push(`--color-border: ${colors.neutral['200'] || '#e2e8f0'}`)
    }

    if (typography) {
      vars.push(`--font-heading: '${typography.fontHeading || 'Inter'}', system-ui, sans-serif`)
      vars.push(`--font-body: '${typography.fontBody || 'Inter'}', system-ui, sans-serif`)
    }

    if (vars.length === 0) return ''

    return `:root { ${vars.join('; ')} }
      .bg-primary { background-color: var(--color-primary) !important; }
      .hover\\:bg-primary-hover:hover { background-color: var(--color-primary-hover) !important; }
      .bg-secondary { background-color: var(--color-secondary) !important; }
      .bg-accent { background-color: var(--color-accent) !important; }
      .bg-background { background-color: var(--color-background) !important; }
      .bg-muted { background-color: var(--color-muted) !important; }
      .text-foreground { color: var(--color-foreground) !important; }
      .text-primary { color: var(--color-primary) !important; }
      .border-border { border-color: var(--color-border) !important; }
      .font-heading { font-family: var(--font-heading) !important; }
      .font-body { font-family: var(--font-body) !important; }`
  }, [designVariables])

  // Track if user has manually applied this message
  // Initialize based on isApplied from database
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied'>(
    message.isApplied ? 'applied' : 'idle'
  )

  // Extract HTML from content (for streaming preview)
  // New format: MESSAGE: ... --- OPERATION: ... --- <html>
  const streamingHtml = useMemo(() => {
    if (!message.content) return null

    // Try new format: after second ---
    const parts = message.content.split(/\n---\n/)
    if (parts.length >= 3) {
      let html = parts.slice(2).join('\n---\n')
      html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()
      // Clean up any operation metadata that leaked into HTML
      html = cleanOperationMetadata(html)
      if (html) return html
    }

    // Fallback: look for HTML starting with <
    const htmlMatch = message.content.match(/<(!DOCTYPE|html|section|div|header|nav)[^]*$/i)
    if (htmlMatch) {
      return cleanOperationMetadata(htmlMatch[0])
    }

    // Old format: ```html block
    const codeMatch = message.content.match(/```html\n([\s\S]*?)(?:```|$)/)
    return codeMatch ? cleanOperationMetadata(codeMatch[1]) : null
  }, [message.content])

  // Helper to remove operation metadata that leaked into HTML
  function cleanOperationMetadata(html: string): string {
    if (!html) return html
    return html
      // Remove operation block if it appears at start of HTML
      .replace(/^---\s*\nOPERATION:\s*\w+\s*\nPOSITION:\s*\w+\s*\n---\s*\n?/i, '')
      // Remove individual operation lines
      .replace(/\n?---\s*\n?OPERATION:\s*\w+\s*\n?/gi, '')
      .replace(/POSITION:\s*\w+\s*\n?---\s*\n?/gi, '')
      .replace(/OPERATION:\s*\w+\s*\n?/gi, '')
      .replace(/POSITION:\s*\w+\s*\n?/gi, '')
      .replace(/TARGET:\s*[^\n]+\n?/gi, '')
      .replace(/SELECTOR:\s*[^\n]+\n?/gi, '')
      .replace(/COMPONENT_TYPE:\s*\w+\s*\n?/gi, '')
      .replace(/COMPONENT_NAME:\s*[^\n]+\n?/gi, '')
      // Remove stray --- separators
      .replace(/^---\s*\n/gm, '')
      .replace(/\n---\s*$/gm, '')
      // Remove AI meta-comments that shouldn't be in HTML
      .replace(/<!--\s*Kein Code generiert[^>]*-->/gi, '')
      .replace(/<!--\s*No code generated[^>]*-->/gi, '')
      .replace(/<!--\s*Bitte wähle[^>]*-->/gi, '')
      .trim()
  }

  // Extract message text (before the HTML)
  const textContent = useMemo(() => {
    // New format: extract MESSAGE line
    const messageMatch = message.content.match(/MESSAGE:\s*([\s\S]+?)(?=\n---|\n\n)/)
    if (messageMatch) return messageMatch[1].trim()

    // Fallback: remove code blocks and operation metadata
    return message.content
      .replace(/```html[\s\S]*?(?:```|$)/g, '')
      .replace(/MESSAGE:[\s\S]*$/i, '')
      .replace(/OPERATION:[\s\S]*$/i, '')
      .trim()
  }, [message.content])

  const handleCopy = async () => {
    // Copy the preview content (section) not the full page
    const textToCopy = message.previewHtml || message.generatedHtml || streamingHtml || message.content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle applying Reference Updates (Header, Footer, Sections, Tokens, etc.)
  const handleApplyReferenceUpdates = async () => {
    if (!message.referenceUpdates || applyState === 'applying') return

    setApplyState('applying')

    try {
      const supabase = createClient()
      const updates = message.referenceUpdates as ReferenceUpdate[]

      for (const update of updates) {
        switch (update.type) {
          case 'component': {
            // Update Header/Footer in database
            const componentUpdate = update as ComponentUpdate
            console.log('Applying COMPONENT_UPDATE:', componentUpdate.id)

            const { error } = await supabase
              .from('components')
              .update({
                html: componentUpdate.html,
                updated_at: new Date().toISOString(),
              })
              .eq('id', componentUpdate.id)

            if (error) {
              console.error('Error updating component:', error)
              throw error
            }

            // Reload global components in editor store
            const loadGlobalComponents = useEditorStore.getState().loadGlobalComponents
            await loadGlobalComponents()
            break
          }

          case 'section': {
            // Update section in current page HTML
            const sectionUpdate = update as { type: 'section'; id: string; selector: string; html: string }
            console.log('Applying SECTION_UPDATE:', sectionUpdate.selector)

            // Replace section in current HTML
            const currentHtml = useEditorStore.getState().html
            const selectorRegex = new RegExp(
              `<(section|div|article)[^>]*id=["']${sectionUpdate.id}["'][^>]*>[\\s\\S]*?<\\/\\1>`,
              'gi'
            )
            const newHtml = currentHtml.replace(selectorRegex, sectionUpdate.html)

            if (newHtml !== currentHtml) {
              applyGeneratedHtml(newHtml)
              await new Promise(resolve => setTimeout(resolve, 50))
              await save()
            }
            break
          }

          case 'token': {
            // Update design token in database
            const tokenUpdate = update as { type: 'token'; id: string; value: string }
            console.log('Applying TOKEN_UPDATE:', tokenUpdate.id, tokenUpdate.value)

            // Parse token ID to get category and key
            // Format: "color-brand-primary" or "font-heading"
            const parts = tokenUpdate.id.split('-')
            const tokenType = parts[0] // color, font, spacing, etc.
            const category = parts[1] // brand, neutral, heading, body, etc.
            const key = parts.slice(2).join('-') || category

            const siteId = useEditorStore.getState().siteId
            if (!siteId) break

            // Get current design variables
            const { data: currentVars } = await supabase
              .from('design_variables')
              .select('*')
              .eq('site_id', siteId)
              .single()

            if (currentVars) {
              let updateData: Record<string, unknown> = {}

              if (tokenType === 'color') {
                const colors = (currentVars.colors as Record<string, Record<string, string>>) || {}
                if (!colors[category]) colors[category] = {}
                colors[category][key] = tokenUpdate.value
                updateData = { colors }
              } else if (tokenType === 'font') {
                const typography = (currentVars.typography as Record<string, string>) || {}
                typography[`font${category.charAt(0).toUpperCase()}${category.slice(1)}`] = tokenUpdate.value
                updateData = { typography }
              }

              const { data: updatedVars } = await supabase
                .from('design_variables')
                .update(updateData)
                .eq('site_id', siteId)
                .select()
                .single()

              // Update store with new design variables
              if (updatedVars) {
                // Cast from database Json types to DesignVariables
                useEditorStore.setState({ designVariables: updatedVars as unknown as DesignVariables })

                // Update HTML with new CSS variables
                const currentHtml = useEditorStore.getState().html
                // Cast to DesignVariables - injectCSSVariables handles null checks internally
                const newHtml = injectCSSVariables(currentHtml, updatedVars as DesignVariables)
                if (newHtml !== currentHtml) {
                  applyGeneratedHtml(newHtml)
                  await new Promise(resolve => setTimeout(resolve, 50))
                  await save()
                }
              }
            }
            break
          }

          case 'menu': {
            const menuUpdate = update as MenuUpdate
            const siteId = useEditorStore.getState().siteId
            const menus = useEditorStore.getState().menus
            const pages = useEditorStore.getState().pages

            if (!siteId) {
              console.warn('MENU_UPDATE: No siteId available')
              break
            }

            // Find the menu name from the id
            const targetMenu = menus.find(m => m.id === menuUpdate.id)
            const menuName = targetMenu?.name || menuUpdate.id

            console.log('Applying MENU_UPDATE:', menuUpdate.id, menuUpdate.action)

            // Convert MenuUpdate to MenuOperation format
            const menuOperation = {
              menu: menuName,
              action: menuUpdate.action,
              items: menuUpdate.items?.map(item => ({
                label: item.label,
                page: item.page,
                url: item.url,
                position: item.position
              }))
            }

            // Execute the menu operation
            const result = await executeMenuOperation(
              menuOperation,
              siteId,
              pages.map(p => ({ id: p.id, name: p.name, slug: p.slug })),
              menus.map(m => ({ id: m.id, name: m.name, slug: m.slug }))
            )

            console.log('MENU_UPDATE result:', result)

            // Reload menus in store after update
            if (result.success) {
              // Use any cast since menus table isn't in generated types
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: menusData } = await (supabase as any)
                .from('menus')
                .select(`
                  id,
                  name,
                  slug,
                  position,
                  settings,
                  menu_items (
                    id,
                    menu_id,
                    parent_id,
                    label,
                    link_type,
                    external_url,
                    anchor,
                    page_id,
                    content_type_slug,
                    icon,
                    description,
                    target,
                    position,
                    pages:page_id (slug, name)
                  )
                `)
                .eq('site_id', siteId)
                .order('name')

              if (menusData) {
                // Types for raw menu data from database
                interface RawMenuItem {
                  id: string
                  menu_id: string
                  parent_id: string | null
                  label: string
                  link_type: string
                  external_url: string | null
                  anchor: string | null
                  page_id: string | null
                  content_type_slug: string | null
                  icon: string | null
                  description: string | null
                  target: string
                  position: number
                  pages: { slug: string; name: string } | null
                }
                interface RawMenu {
                  id: string
                  name: string
                  slug: string
                  position: string
                  settings: Record<string, unknown> | null
                  menu_items: RawMenuItem[]
                }

                // Process raw data to MenuWithItems format
                const processedMenus = (menusData as RawMenu[]).map((menu) => {
                  const rawItems = (menu.menu_items || []) as RawMenuItem[]
                  const items = rawItems.map((item) => ({
                    id: item.id,
                    menuId: item.menu_id,
                    parentId: item.parent_id || undefined,
                    linkType: item.link_type as 'page' | 'external' | 'anchor' | 'archive',
                    pageId: item.page_id || undefined,
                    externalUrl: item.external_url || undefined,
                    anchor: item.anchor || undefined,
                    contentTypeSlug: item.content_type_slug || undefined,
                    label: item.label,
                    icon: item.icon || undefined,
                    description: item.description || undefined,
                    target: (item.target || '_self') as '_self' | '_blank',
                    position: item.position,
                    createdAt: '',
                    updatedAt: '',
                    pageSlug: item.pages?.slug,
                    pageName: item.pages?.name,
                  }))
                  return {
                    id: menu.id,
                    siteId,
                    name: menu.name,
                    slug: menu.slug,
                    description: undefined,
                    position: menu.position as 'header' | 'footer' | 'mobile' | 'custom',
                    settings: (menu.settings || {}) as Record<string, unknown>,
                    createdAt: '',
                    updatedAt: '',
                    items,
                  }
                })

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                useEditorStore.setState({ menus: processedMenus as any })
              }
            }
            break
          }

          case 'entry': {
            // Entry updates
            const entryUpdate = update as { type: 'entry'; id: string; data: Record<string, unknown> }
            console.log('Applying ENTRY_UPDATE:', entryUpdate.id)

            await supabase
              .from('entries')
              .update({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data: entryUpdate.data as any,
                updated_at: new Date().toISOString(),
              })
              .eq('id', entryUpdate.id)
            break
          }
        }
      }

      setApplyState('applied')
    } catch (error) {
      console.error('Apply reference updates error:', error)
      setApplyState('idle')
    }
  }

  const handleApply = async () => {
    // Check if this is a Reference Update
    if (message.hasReferenceUpdates && message.referenceUpdates) {
      return handleApplyReferenceUpdates()
    }

    // Normal page HTML apply
    const htmlToApply = message.generatedHtml || streamingHtml
    if (!htmlToApply || applyState === 'applying') return

    setApplyState('applying')

    try {
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 300))

      let finalHtml: string

      if (htmlToApply.includes('<!DOCTYPE') || htmlToApply.includes('<html')) {
        finalHtml = htmlToApply
      } else {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
        if (bodyMatch) {
          finalHtml = html.replace(
            /<body[^>]*>[\s\S]*<\/body>/,
            `<body class="bg-background text-foreground">\n${htmlToApply}\n</body>`
          )
        } else {
          finalHtml = htmlToApply
        }
      }

      // If global header/footer exist, remove them from the HTML being saved
      // They will be added back by the preview via insertGlobalComponents
      if (globalHeader || globalFooter) {
        const extracted = extractGlobalComponents(finalHtml)
        const hasNewHeader = extracted.header && extracted.header.confidence >= 50
        const hasNewFooter = extracted.footer && extracted.footer.confidence >= 50

        if ((hasNewHeader && globalHeader) || (hasNewFooter && globalFooter)) {
          console.log('Removing inline header/footer - global components will be used instead')
          finalHtml = removeHeaderFooterFromHtml(finalHtml, {
            removeHeader: !!(hasNewHeader && globalHeader),
            removeFooter: !!(hasNewFooter && globalFooter),
          })
        }
      }

      // Debug: Log what we're applying
      console.log('[Apply] Final HTML length:', finalHtml.length)
      console.log('[Apply] Has DOCTYPE:', finalHtml.includes('<!DOCTYPE'))
      console.log('[Apply] Has script tag:', finalHtml.includes('<script'))
      console.log('[Apply] Has header tag:', finalHtml.includes('<header'))
      console.log('[Apply] Has footer tag:', finalHtml.includes('<footer'))

      // Apply to editor
      applyGeneratedHtml(finalHtml)

      // Wait a tick for state to update, then save
      await new Promise(resolve => setTimeout(resolve, 50))
      await save()

      // Mark message as applied in database
      setMessageApplied(message.id, true)
      setApplyState('applied')
    } catch (error) {
      console.error('Apply error:', error)
      setApplyState('idle')
    }
  }

  const handleDelete = () => {
    deleteMessage?.(message.id)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  // Parse style reference from user message
  const { messageText, styleReferences } = useMemo(() => {
    const refMatch = message.content.match(/\[Style-Referenz:\s*([^\]]+)\]/)
    if (refMatch) {
      const refs = refMatch[1].split(',').map(r => r.trim())
      const text = message.content.replace(/\n*\[Style-Referenz:[^\]]+\]/, '').trim()
      return { messageText: text, styleReferences: refs }
    }
    return { messageText: message.content, styleReferences: [] }
  }, [message.content])

  // User Message - Figma Style: Light gray background, left-aligned
  if (message.role === 'user') {
    return (
      <div className="w-full">
        <div className="space-y-2">
          {/* Style References Badge */}
          {styleReferences.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium">
              <Layers className="h-3 w-3" />
              <span>Style von {styleReferences.join(', ')}</span>
            </div>
          )}
          {/* User message with light gray background - Figma Style */}
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word' }}>
              {messageText}
            </p>
          </div>
          {/* Minimal meta info */}
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {message.timestamp && <span>{formatTime(message.timestamp)}</span>}
            <button
              onClick={handleCopy}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition-colors"
              title="Kopieren"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Assistant Message
  // For Reference Updates, extract preview HTML from the first component/section update
  const referencePreviewHtml = useMemo(() => {
    if (!message.hasReferenceUpdates || !message.referenceUpdates) return null
    const updates = message.referenceUpdates as ReferenceUpdate[]
    for (const update of updates) {
      if (update.type === 'component' && (update as ComponentUpdate).html) {
        return (update as ComponentUpdate).html
      }
      if (update.type === 'section' && (update as { html: string }).html) {
        return (update as { html: string }).html
      }
    }
    return null
  }, [message.hasReferenceUpdates, message.referenceUpdates])

  // Extract non-HTML reference updates (tokens, menus, entries)
  const nonHtmlUpdates = useMemo(() => {
    if (!message.hasReferenceUpdates || !message.referenceUpdates) return null
    const updates = message.referenceUpdates as ReferenceUpdate[]

    const tokens = updates.filter(u => u.type === 'token') as Array<{ type: 'token'; id: string; value: string }>
    const menus = updates.filter(u => u.type === 'menu')
    const entries = updates.filter(u => u.type === 'entry')

    if (tokens.length === 0 && menus.length === 0 && entries.length === 0) return null

    return { tokens, menus, entries }
  }, [message.hasReferenceUpdates, message.referenceUpdates])

  // Use previewHtml (just the new section) if available, otherwise fall back to generatedHtml
  const rawPreviewHtml = referencePreviewHtml || message.previewHtml || message.generatedHtml || streamingHtml

  // Check if this is a partial update (just a section) vs full page
  const isPartialUpdate = rawPreviewHtml && !rawPreviewHtml.includes('<!DOCTYPE') && !rawPreviewHtml.includes('<html')

  // Wrap partial HTML with Tailwind for preview
  const displayHtml = useMemo(() => {
    if (!rawPreviewHtml) return null

    // CSS for preview - clean margins, allow hover but block clicks + design tokens
    const fitContentStyle = `<style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white;
      }
      body > *:last-child { margin-bottom: 0 !important; }
      ${designTokensCSS}
    </style>
    <script>
      document.addEventListener('click', (e) => e.preventDefault(), true);
      document.addEventListener('submit', (e) => e.preventDefault(), true);
    </script>`

    // If it's already a full document, inject our style
    if (rawPreviewHtml.includes('<!DOCTYPE') || rawPreviewHtml.includes('<html')) {
      if (rawPreviewHtml.includes('</head>')) {
        return rawPreviewHtml.replace('</head>', `${fitContentStyle}</head>`)
      }
      return rawPreviewHtml
    }

    // Wrap partial HTML (section, div, etc.) with Tailwind
    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  ${fitContentStyle}
</head>
<body>
${rawPreviewHtml}
</body>
</html>`
  }, [rawPreviewHtml, designTokensCSS])

  return (
    <div className="w-full overflow-hidden">
      <div className="space-y-3 overflow-hidden">
        {/* Loading State - nur wenn noch kein Content */}
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-2 py-3 min-h-[44px]">
            <div className="h-4 w-4 flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
            <span className="text-sm text-zinc-500">AI generiert...</span>
          </div>
        ) : (
          <>
            {/* Text Content (ohne HTML) */}
            {textContent && (() => {
              // Parse setup-button tag
              const setupButtonMatch = textContent.match(/<setup-button prompt="([^"]+)">([^<]+)<\/setup-button>/)
              const cleanText = textContent.replace(/<setup-button[^>]*>[^<]*<\/setup-button>/, '').trim()

              return (
                <div className="overflow-hidden" style={{ wordBreak: 'break-word' }}>
                  {cleanText && (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="text-sm text-zinc-700 leading-relaxed mb-2 last:mb-0">
                            {children}
                          </p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-zinc-900">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="text-sm text-zinc-700 mb-2 pl-4 list-disc space-y-1">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {cleanText}
                    </ReactMarkdown>
                  )}

                  {/* Setup Button */}
                  {setupButtonMatch && onOpenSetup && (
                    <button
                      onClick={() => onOpenSetup(decodeURIComponent(setupButtonMatch[1]))}
                      className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      {setupButtonMatch[2]}
                    </button>
                  )}
                </div>
              )
            })()}

            {/* Non-HTML Reference Updates (Tokens, Menus, Entries) */}
            {nonHtmlUpdates && !rawPreviewHtml && !message.isStreaming && (
              <div className="border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Card Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border-b border-purple-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs text-purple-700 font-medium">
                      {nonHtmlUpdates.tokens.length > 0 ? 'Design Token Update' :
                       nonHtmlUpdates.menus.length > 0 ? 'Menu Update' : 'Entry Update'}
                    </span>
                  </div>
                </div>

                {/* Token Updates Preview */}
                {nonHtmlUpdates.tokens.length > 0 && (
                  <div className="p-4 space-y-3">
                    {nonHtmlUpdates.tokens.map((token, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {/* Color Preview */}
                          {token.value.startsWith('#') || token.value.startsWith('rgb') ? (
                            <div
                              className="w-12 h-12 rounded-lg border-2 border-white shadow-md"
                              style={{ backgroundColor: token.value }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center">
                              <span className="text-xs text-zinc-500">Aa</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-800">
                            {token.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono truncate">
                            {token.value}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            Neu
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Menu Updates Preview */}
                {nonHtmlUpdates.menus.length > 0 && (
                  <div className="p-4">
                    <p className="text-sm text-zinc-600">
                      {nonHtmlUpdates.menus.length} Menü-Änderung(en)
                    </p>
                  </div>
                )}

                {/* Entry Updates Preview */}
                {nonHtmlUpdates.entries.length > 0 && (
                  <div className="p-4">
                    <p className="text-sm text-zinc-600">
                      {nonHtmlUpdates.entries.length} Eintrag-Änderung(en)
                    </p>
                  </div>
                )}

                {/* Apply Button */}
                <div className="px-3 py-2 bg-purple-50 border-t border-purple-200">
                  {applyState === 'applied' ? (
                    <button
                      disabled
                      className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-emerald-500 text-white cursor-default"
                    >
                      <Check className="h-4 w-4" />
                      Gespeichert
                    </button>
                  ) : applyState === 'applying' ? (
                    <button
                      disabled
                      className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-purple-400 text-white cursor-wait"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </button>
                  ) : (
                    <button
                      onClick={handleApply}
                      className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-purple-500 text-white hover:bg-purple-600"
                    >
                      Änderungen speichern
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Code/Preview Card - während UND nach Streaming */}
            {rawPreviewHtml && (
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Card Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    {message.isStreaming ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium">Schreibt Code...</span>
                      </div>
                    ) : message.hasReferenceUpdates ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-xs text-purple-700 font-medium">
                          {(() => {
                            const updates = message.referenceUpdates as ReferenceUpdate[]
                            const types = [...new Set(updates.map(u => u.type))]
                            if (types.includes('component')) return 'Component Update'
                            if (types.includes('section')) return 'Section Update'
                            if (types.includes('token')) return 'Token Update'
                            if (types.includes('menu')) return 'Menu Update'
                            if (types.includes('entry')) return 'Entry Update'
                            return 'Referenz Update'
                          })()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-zinc-600">Fertig</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle Preview/Code */}
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                    >
                      {showCode ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Vorschau</span>
                        </>
                      ) : (
                        <>
                          <Code className="h-3 w-3" />
                          <span>Code</span>
                        </>
                      )}
                    </button>

                    {/* Copy */}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                {showCode ? (
                  /* Code View - Live typing effect */
                  <div className="max-h-80 overflow-auto bg-zinc-900 p-4">
                    <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                      {rawPreviewHtml}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                      )}
                    </pre>
                  </div>
                ) : (
                  /* Preview - desktop view scaled to fit exactly */
                  <div
                    className="bg-white relative overflow-hidden w-full"
                    style={{ height: '250px' }}
                    ref={(el) => {
                      if (el) {
                        const containerWidth = el.clientWidth
                        const containerHeight = 250
                        const scale = containerWidth / 1200
                        const iframeHeight = containerHeight / scale
                        const iframe = el.querySelector('iframe')
                        if (iframe) {
                          iframe.style.transform = `scale(${scale})`
                          iframe.style.height = `${iframeHeight}px`
                        }
                      }
                    }}
                  >
                    <iframe
                      srcDoc={displayHtml ?? undefined}
                      className="border-0 absolute top-0 left-0"
                      style={{
                        width: '1200px',
                        height: '250px',
                        transformOrigin: 'top left'
                      }}
                      sandbox="allow-scripts allow-same-origin"
                      title="Preview"
                    />
                    {message.isStreaming && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>
                )}

                {/* Apply Button - nur wenn fertig */}
                {!message.isStreaming && (
                  <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-200">
                    {applyState === 'applied' ? (
                      <button
                        disabled
                        className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-emerald-500 text-white cursor-default"
                      >
                        <Check className="h-4 w-4" />
                        Angewendet
                      </button>
                    ) : applyState === 'applying' ? (
                      <button
                        disabled
                        className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-blue-400 text-white cursor-wait"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wird angewendet...
                      </button>
                    ) : (
                      <button
                        onClick={handleApply}
                        className={`w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                          message.hasReferenceUpdates
                            ? 'bg-purple-500 text-white hover:bg-purple-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {message.hasReferenceUpdates ? 'Änderungen speichern' : 'Anwenden'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Thinking Display - persisted in message */}
            {message.thinking && !message.isStreaming && (
              <div className="border border-purple-200 rounded-xl overflow-hidden bg-purple-50/30">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">AI Denkprozess</span>
                  </div>
                  {showThinking ? (
                    <ChevronUp className="h-4 w-4 text-purple-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-purple-500" />
                  )}
                </button>
                {showThinking && (
                  <div className="px-3 py-2 border-t border-purple-200 max-h-48 overflow-y-auto">
                    <p className="text-xs text-purple-800/80 whitespace-pre-wrap leading-relaxed">
                      {message.thinking}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Google Search Sources */}
            {message.searchSources && message.searchSources.length > 0 && !message.isStreaming && (
              <div className="border border-green-200 rounded-xl overflow-hidden bg-green-50/30">
                <div className="px-3 py-2 flex items-center gap-2 bg-green-100/50">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Quellen aus Google Search</span>
                </div>
                <div className="px-3 py-2 flex flex-wrap gap-2">
                  {message.searchSources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                    >
                      <span className="truncate max-w-40">{source.title}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Code Execution Output */}
            {message.executableCode && !message.isStreaming && (
              <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                <div className="px-3 py-2 flex items-center gap-2 bg-amber-100/50">
                  <Terminal className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Python Code ausgeführt</span>
                </div>
                <div className="bg-zinc-900 p-3 max-h-40 overflow-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                    {message.executableCode}
                  </pre>
                </div>
                {message.codeResult && (
                  <div className="px-3 py-2 border-t border-amber-200 bg-amber-50">
                    <div className="text-xs text-amber-700 font-medium mb-1">Output:</div>
                    <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap bg-white rounded p-2 border border-amber-200">
                      {message.codeResult}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Meta Info */}
            {!message.isStreaming && (
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {message.timestamp && (
                  <span>{formatTime(message.timestamp)}</span>
                )}
                {message.model && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span>{message.model}</span>
                  </>
                )}
                {message.tokensUsed && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span>{message.tokensUsed} tokens</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
