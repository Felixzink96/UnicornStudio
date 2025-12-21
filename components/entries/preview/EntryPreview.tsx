'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useEntryEditorStore } from '@/stores/entry-editor-store'
import type { Breakpoint } from '@/types/editor'

const BREAKPOINT_WIDTHS: Record<Breakpoint, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export function EntryPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeKey, setIframeKey] = useState(0)

  const breakpoint = useEntryEditorStore((s) => s.breakpoint)
  const designVariables = useEntryEditorStore((s) => s.designVariables)
  const globalHeader = useEntryEditorStore((s) => s.globalHeader)
  const globalFooter = useEntryEditorStore((s) => s.globalFooter)
  const getPreviewHtml = useEntryEditorStore((s) => s.getPreviewHtml)
  const title = useEntryEditorStore((s) => s.title)
  const slug = useEntryEditorStore((s) => s.slug)
  const content = useEntryEditorStore((s) => s.content)
  const excerpt = useEntryEditorStore((s) => s.excerpt)
  const featuredImageUrl = useEntryEditorStore((s) => s.featuredImageUrl)
  const data = useEntryEditorStore((s) => s.data)

  // Use central design tokens CSS generator (same as site editor)
  const designTokensCss = useMemo(() => {
    if (!designVariables) return ''
    const { generateDesignTokensCSS } = require('@/lib/css/design-tokens')
    return generateDesignTokensCSS(designVariables)
  }, [designVariables])

  // Build full preview HTML
  const buildPreviewHtml = useCallback(() => {
    const previewContent = getPreviewHtml()

    // Get fonts for Google Fonts
    const typography = designVariables?.typography as Record<string, string> | undefined
    const fontHeading = typography?.fontHeading || 'Inter'
    const fontBody = typography?.fontBody || 'Inter'
    const fonts = [...new Set([fontHeading, fontBody])].filter(f => f && f !== 'system-ui')
    const googleFontsUrl = fonts.length > 0
      ? `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')}&display=swap`
      : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsUrl}" rel="stylesheet">
  <style id="unicorn-design-tokens">
    ${designTokensCss}
  </style>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--font-body);
      background-color: var(--color-neutral-background);
      color: var(--color-neutral-foreground);
      min-height: 100vh;
    }
    img { max-width: 100%; height: auto; }
    .prose { max-width: 65ch; }
    .prose h1, .prose h2, .prose h3, .prose h4 { font-family: var(--font-heading); font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; }
    .prose p { margin-bottom: 1em; line-height: 1.75; }
    .prose ul, .prose ol { margin-bottom: 1em; padding-left: 1.5em; }
  </style>
</head>
<body>
  ${globalHeader?.html || ''}
  ${previewContent}
  ${globalFooter?.html || ''}
</body>
</html>
`
  }, [getPreviewHtml, designTokensCss, designVariables, globalHeader, globalFooter])

  // Refresh iframe when any field changes
  useEffect(() => {
    setIframeKey((prev) => prev + 1)
  }, [title, slug, content, excerpt, featuredImageUrl, data])

  const previewHtml = buildPreviewHtml()
  const iframeWidth = BREAKPOINT_WIDTHS[breakpoint]
  const isResponsive = breakpoint !== 'desktop'

  return (
    <div className="h-full w-full bg-zinc-950 flex items-center justify-center overflow-auto relative">
      <div
        className={`h-full transition-all duration-300 ${isResponsive ? 'my-4 rounded-lg overflow-hidden shadow-2xl border border-zinc-700' : ''}`}
        style={{
          width: iframeWidth,
          maxWidth: '100%',
        }}
      >
        <iframe
          key={iframeKey}
          ref={iframeRef}
          srcDoc={previewHtml}
          className="w-full h-full border-0 block"
          sandbox="allow-scripts allow-same-origin"
          title="Entry Preview"
        />
      </div>
    </div>
  )
}
