'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import type { Breakpoint } from '@/types/editor'

const BREAKPOINT_WIDTHS: Record<Breakpoint, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export function TemplatePreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeKey, setIframeKey] = useState(0)

  const html = useTemplateEditorStore((s) => s.html)
  const customCss = useTemplateEditorStore((s) => s.customCss)
  const breakpoint = useTemplateEditorStore((s) => s.breakpoint)
  const designVariables = useTemplateEditorStore((s) => s.designVariables)
  const globalHeader = useTemplateEditorStore((s) => s.globalHeader)
  const globalFooter = useTemplateEditorStore((s) => s.globalFooter)
  const templateType = useTemplateEditorStore((s) => s.templateType)
  const getPreviewHtml = useTemplateEditorStore((s) => s.getPreviewHtml)
  const viewMode = useTemplateEditorStore((s) => s.viewMode)
  const selectElement = useTemplateEditorStore((s) => s.selectElement)

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

    // Design mode script for element selection
    const designModeScript = viewMode === 'design' ? `
      <script>
        document.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          const el = e.target;
          if (!el || el === document.body || el === document.documentElement) return;

          const rect = el.getBoundingClientRect();
          const path = [];
          let current = el;
          while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) selector += '#' + current.id;
            else if (current.className && typeof current.className === 'string') {
              const classes = current.className.split(' ').filter(c => c && !c.startsWith('hover:')).slice(0, 2);
              if (classes.length) selector += '.' + classes.join('.');
            }
            path.unshift(selector);
            current = current.parentElement;
          }

          window.parent.postMessage({
            type: 'element-selected',
            data: {
              tagName: el.tagName,
              path: path,
              selector: path.join(' > '),
              className: el.className || '',
              textContent: el.textContent?.substring(0, 100) || '',
              innerHTML: el.innerHTML?.substring(0, 500) || '',
              outerHTML: el.outerHTML?.substring(0, 1000) || '',
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              }
            }
          }, '*');
        }, true);

        // Hover effect
        let lastHovered = null;
        document.addEventListener('mouseover', function(e) {
          if (lastHovered) {
            lastHovered.style.outline = '';
          }
          const el = e.target;
          if (el && el !== document.body && el !== document.documentElement) {
            el.style.outline = '2px solid rgba(139, 92, 246, 0.5)';
            lastHovered = el;
          }
        }, true);

        document.addEventListener('mouseout', function(e) {
          if (lastHovered) {
            lastHovered.style.outline = '';
          }
        }, true);
      </script>
    ` : ''

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
    ${viewMode === 'design' ? 'body { cursor: pointer; }' : ''}
  </style>
  ${customCss ? `<style id="template-custom-css">${customCss}</style>` : ''}
</head>
<body>
  ${globalHeader?.html || ''}
  ${previewContent}
  ${globalFooter?.html || ''}
  ${designModeScript}
</body>
</html>
`
  }, [getPreviewHtml, designTokensCss, designVariables, globalHeader, globalFooter, viewMode, customCss])

  // Listen for element selection from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'element-selected') {
        selectElement(event.data.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectElement])

  // Refresh iframe when HTML or CSS changes
  useEffect(() => {
    setIframeKey((prev) => prev + 1)
  }, [html, templateType, customCss])

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
          title="Template Preview"
        />
      </div>
    </div>
  )
}
