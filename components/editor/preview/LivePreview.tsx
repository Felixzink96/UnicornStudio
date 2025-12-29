'use client'

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import type { SelectedElement, Breakpoint } from '@/types/editor'
import { insertGlobalComponents } from '@/lib/ai/html-operations'
import { injectMenusIntoHtml } from '@/lib/menus/render-menu'
import { darkenHex } from '@/lib/design/style-extractor'
import { ContextMenu } from '../context-menu/ContextMenu'
import { SaveComponentDialog } from '../context-menu/SaveComponentDialog'
import { ImagePicker } from '../assets/ImagePicker'
import { FullPageWireframe } from './FullPageWireframe'

// Helper: Convert hex to RGB string (space-separated for CSS)
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0 0 0'
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

const BREAKPOINT_WIDTHS: Record<Breakpoint, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

// Debounce hook for smooth preview updates during streaming
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function LivePreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Scroll-Position speichern für Wiederherstellung nach iframe-Update
  const savedScrollPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const html = useEditorStore((s) => s.html)
  const viewMode = useEditorStore((s) => s.viewMode)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const selectElement = useEditorStore((s) => s.selectElement)
  const selectedElement = useEditorStore((s) => s.selectedElement)
  const updateHtml = useEditorStore((s) => s.updateHtml)
  const globalHeader = useEditorStore((s) => s.globalHeader)
  const globalFooter = useEditorStore((s) => s.globalFooter)
  const menus = useEditorStore((s) => s.menus)
  const designVariables = useEditorStore((s) => s.designVariables)
  const siteId = useEditorStore((s) => s.siteId)
  const messages = useEditorStore((s) => s.messages)
  const activeBuildSection = useEditorStore((s) => s.activeBuildSection)

  // Prüfen ob gerade gestreamt wird (für Animation-Pause und Scroll-Restore)
  const lastMessage = messages[messages.length - 1]
  const isCurrentlyStreaming = lastMessage?.isStreaming || false

  // Wireframe nur bei komplett neuer Website zeigen, NICHT wenn bereits Header/Footer existieren
  const hasExistingContent = html.includes('<section') || html.includes('<main') || html.includes('<header')
  const hasGlobalComponents = !!globalHeader || !!globalFooter
  const showWireframe = isCurrentlyStreaming && !hasExistingContent && !hasGlobalComponents

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    element: { tagName: string; selector: string; outerHTML: string } | null
  } | null>(null)

  // Save component dialog
  const [showSaveComponent, setShowSaveComponent] = useState(false)
  const [componentHtml, setComponentHtml] = useState('')

  // Image picker for replace image action
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [imageSelector, setImageSelector] = useState<string | null>(null)

  // Clipboard for cut/copy/paste
  const [clipboard, setClipboard] = useState<string | null>(null)

  // Debounce HTML updates during streaming (400ms delay for smoother animations)
  // Verhindert Flackern bei schnellen Updates während des AI-Streamings
  const debouncedHtml = useDebouncedValue(html, 400)

  // Scroll-Position speichern BEVOR das HTML sich ändert
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      savedScrollPos.current = {
        x: iframe.contentWindow.scrollX || 0,
        y: iframe.contentWindow.scrollY || 0,
      }
    }
  }, [debouncedHtml]) // Triggert bevor srcDoc aktualisiert wird

  // Scroll-Position wiederherstellen NACHDEM iframe geladen hat
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      // Kurze Verzögerung damit DOM bereit ist
      requestAnimationFrame(() => {
        if (iframe.contentWindow && savedScrollPos.current.y > 0) {
          iframe.contentWindow.scrollTo(savedScrollPos.current.x, savedScrollPos.current.y)
        }
      })
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [])

  // Generate CSS variables from design tokens - using central function
  const designTokensCss = useMemo(() => {
    if (!designVariables) return ''
    // Import dynamically to avoid SSR issues
    const { generateDesignTokensCSS } = require('@/lib/css/design-tokens')
    return generateDesignTokensCSS(designVariables)
  }, [designVariables])

  // State for resolved entries HTML
  const [resolvedEntriesHtml, setResolvedEntriesHtml] = useState<string | null>(null)
  const [isResolvingEntries, setIsResolvingEntries] = useState(false)

  // Check if HTML has entries placeholders
  const hasEntriesPlaceholders = useMemo(() => {
    const hasPlaceholders = debouncedHtml.includes('{{#entries:') || debouncedHtml.includes('{{entries:')
    console.log('[LivePreview] hasEntriesPlaceholders:', hasPlaceholders)
    return hasPlaceholders
  }, [debouncedHtml])

  // Resolve entries placeholders via API
  useEffect(() => {
    if (!hasEntriesPlaceholders || !siteId || isCurrentlyStreaming) {
      setResolvedEntriesHtml(null)
      return
    }

    const resolveEntries = async () => {
      setIsResolvingEntries(true)
      try {
        const response = await fetch(`/api/v1/sites/${siteId}/preview/resolve-entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: debouncedHtml }),
        })
        const data = await response.json()
        console.log('[LivePreview] API response:', { resolved: data.resolved, htmlLength: data.html?.length })
        if (data.resolved) {
          console.log('[LivePreview] Setting resolved HTML, first 200 chars:', data.html?.slice(0, 200))
          setResolvedEntriesHtml(data.html)
        } else {
          console.log('[LivePreview] API returned resolved=false')
        }
      } catch (error) {
        console.error('[LivePreview] Failed to resolve entries:', error)
      } finally {
        setIsResolvingEntries(false)
      }
    }

    resolveEntries()
  }, [debouncedHtml, siteId, hasEntriesPlaceholders, isCurrentlyStreaming])

  // Combine page HTML with global header/footer and inject menus
  const previewHtml = useMemo(() => {
    // Use resolved entries HTML if available, otherwise use original
    const baseHtml = resolvedEntriesHtml || debouncedHtml
    console.log('[LivePreview] previewHtml using resolved:', !!resolvedEntriesHtml, 'baseHtml includes {{#entries:', baseHtml.includes('{{#entries:'))

    // First insert global components (header/footer)
    let htmlWithComponents = insertGlobalComponents(baseHtml, globalHeader, globalFooter)

    // Inject design tokens CSS if not present in HTML
    if (designTokensCss && !htmlWithComponents.includes('--color-brand-primary')) {
      // Check if there's already a :root or <style> in head
      if (htmlWithComponents.includes('</head>')) {
        htmlWithComponents = htmlWithComponents.replace(
          '</head>',
          `<style id="unicorn-design-tokens">\n${designTokensCss}</style>\n</head>`
        )
      } else if (htmlWithComponents.includes('<body')) {
        // No head, inject before body
        htmlWithComponents = htmlWithComponents.replace(
          '<body',
          `<style id="unicorn-design-tokens">\n${designTokensCss}</style>\n<body`
        )
      }
    }

    // ========================================
    // AUTO-INJECT REQUIRED SCRIPTS
    // Ensures all generated pages work correctly
    // ========================================

    // Check what's already included
    const hasTailwind = htmlWithComponents.includes('tailwindcss') || htmlWithComponents.includes('cdn.tailwindcss.com')
    const hasAlpine = htmlWithComponents.includes('alpinejs') || htmlWithComponents.includes('alpine.js') || htmlWithComponents.includes('Alpine')
    const hasGsap = htmlWithComponents.includes('gsap.min.js') || htmlWithComponents.includes('gsap@')
    const hasScrollTrigger = htmlWithComponents.includes('ScrollTrigger.min.js')

    // Build missing head scripts
    const missingHeadScripts: string[] = []
    if (!hasTailwind) {
      missingHeadScripts.push('<script src="https://cdn.tailwindcss.com"></script>')
    }
    if (!hasAlpine) {
      missingHeadScripts.push('<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.2/dist/cdn.min.js"></script>')
    }

    // Build missing body scripts (GSAP should be at end of body)
    const missingBodyScripts: string[] = []
    if (!hasGsap) {
      missingBodyScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.14.0/gsap.min.js"></script>')
    }
    if (!hasScrollTrigger) {
      missingBodyScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.14.0/ScrollTrigger.min.js"></script>')
    }

    // Inject head scripts
    if (missingHeadScripts.length > 0) {
      const headScriptsStr = '\n  ' + missingHeadScripts.join('\n  ')
      if (htmlWithComponents.includes('</head>')) {
        htmlWithComponents = htmlWithComponents.replace(
          '</head>',
          `${headScriptsStr}\n</head>`
        )
      } else if (htmlWithComponents.includes('<body')) {
        htmlWithComponents = htmlWithComponents.replace(
          '<body',
          `${headScriptsStr}\n<body`
        )
      }
    }

    // Inject body scripts (before </body>)
    if (missingBodyScripts.length > 0) {
      const bodyScriptsStr = '\n  ' + missingBodyScripts.join('\n  ')
      if (htmlWithComponents.includes('</body>')) {
        htmlWithComponents = htmlWithComponents.replace(
          '</body>',
          `${bodyScriptsStr}\n</body>`
        )
      } else {
        // No closing body tag, append at end
        htmlWithComponents += bodyScriptsStr
      }
    }

    // Auto-inject GSAP init script if GSAP is present but no init script exists
    const hasGsapInit = htmlWithComponents.includes('gsap.registerPlugin') ||
                        htmlWithComponents.includes('ScrollTrigger.create') ||
                        htmlWithComponents.includes('gsap.fromTo') ||
                        htmlWithComponents.includes('gsap.to(')
    const hasRevealElements = htmlWithComponents.includes('data-reveal') ||
                              htmlWithComponents.includes('opacity-0') ||
                              htmlWithComponents.includes('translate-y-')

    if (!hasGsapInit && hasRevealElements) {
      const gsapInitScript = `
  <script>
    // Auto-injected GSAP Init Script
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Animate elements with data-reveal attribute
        document.querySelectorAll('[data-reveal]').forEach(function(el) {
          var direction = el.getAttribute('data-reveal') || 'up';
          var fromVars = { opacity: 0, duration: 0.8, ease: 'power2.out' };

          if (direction === 'up') fromVars.y = 40;
          else if (direction === 'down') fromVars.y = -40;
          else if (direction === 'left') fromVars.x = 40;
          else if (direction === 'right') fromVars.x = -40;

          gsap.from(el, {
            ...fromVars,
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          });
        });

        // Animate elements with opacity-0 class (reveal on scroll)
        document.querySelectorAll('.opacity-0:not([x-cloak])').forEach(function(el, index) {
          // Skip if inside Alpine.js controlled element
          if (el.closest('[x-data]') && !el.hasAttribute('data-reveal')) return;

          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none'
            }
          });
        });
      }
    });
  </script>`

      if (htmlWithComponents.includes('</body>')) {
        htmlWithComponents = htmlWithComponents.replace(
          '</body>',
          `${gsapInitScript}\n</body>`
        )
      }
    }

    // Then replace {{menu:slug}} placeholders with actual menu HTML
    if (menus && menus.length > 0) {
      return injectMenusIntoHtml(htmlWithComponents, menus, {
        containerClass: 'flex items-center gap-6',
        linkClass: 'text-sm transition-colors hover:opacity-80',
      })
    }
    return htmlWithComponents
  }, [debouncedHtml, resolvedEntriesHtml, globalHeader, globalFooter, menus, designTokensCss])

  const getHtmlWithScript = useCallback((html: string, pauseAnimations: boolean): string => {
    if (viewMode !== 'design') return html

    // CSS um Animationen während Streaming zu pausieren (verhindert Flackern)
    const animationPauseCSS = pauseAnimations ? `
      /* Animationen pausieren während Streaming - verhindert Flackern */
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition: none !important;
      }
    ` : ''

    const selectionScript = `
    <style>
      ${animationPauseCSS}
      * { cursor: default !important; }
      a, button, input, select, textarea { pointer-events: auto !important; }
      .unicorn-hover-outline {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 0px !important;
        will-change: outline;
      }
      .unicorn-selected {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 0px !important;
      }
      .unicorn-editing {
        outline: 2px solid #8b5cf6 !important;
        outline-offset: 0px !important;
        cursor: text !important;
      }
      .unicorn-badge {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 2px;
        background: #3b82f6;
        color: white;
        font-size: 11px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 600;
        padding: 0;
        border-radius: 6px;
        z-index: 99999;
        pointer-events: auto;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        overflow: hidden;
        -webkit-font-smoothing: subpixel-antialiased;
      }
      .unicorn-badge-label {
        padding: 5px 10px;
        font-size: 12px;
      }
      .unicorn-badge-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: rgba(255,255,255,0.15);
        border: none;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.15s;
      }
      .unicorn-badge-btn:hover {
        background: rgba(255,255,255,0.25);
      }
      .unicorn-btn-delete:hover {
        background: #ef4444 !important;
      }
      .unicorn-badge-btn svg {
        width: 14px;
        height: 14px;
      }
      .unicorn-badge-drag {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 28px;
        background: rgba(255,255,255,0.1);
        color: white;
        cursor: grab;
        border-right: 1px solid rgba(255,255,255,0.15);
      }
      .unicorn-badge-drag:hover {
        background: rgba(255,255,255,0.2);
      }
      .unicorn-badge-drag:active {
        cursor: grabbing;
      }
      .unicorn-badge-drag svg {
        width: 12px;
        height: 12px;
      }
      .unicorn-margin-box {
        position: absolute;
        background: rgba(251, 146, 60, 0.3);
        pointer-events: none;
        z-index: 99990;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .unicorn-margin-label {
        background: #fb923c;
        color: white;
        font-size: 9px;
        font-family: system-ui, sans-serif;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 500;
      }
      .unicorn-padding-box {
        position: absolute;
        background: rgba(34, 197, 94, 0.3);
        pointer-events: none;
        z-index: 99991;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .unicorn-padding-label {
        background: #22c55e;
        color: white;
        font-size: 9px;
        font-family: system-ui, sans-serif;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 500;
      }
      /* Grid/Flex Overlay */
      .unicorn-layout-overlay {
        position: absolute;
        pointer-events: none;
        z-index: 99985;
        border: 1px dashed #a855f7;
        background: rgba(168, 85, 247, 0.05);
      }
      .unicorn-layout-label {
        position: absolute;
        top: 2px;
        left: 2px;
        background: #a855f7;
        color: white;
        font-size: 9px;
        font-family: system-ui, sans-serif;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 600;
      }
      .unicorn-grid-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .unicorn-grid-col {
        position: absolute;
        top: 0;
        bottom: 0;
        border-left: 1px dashed rgba(168, 85, 247, 0.5);
      }
      .unicorn-grid-row {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dashed rgba(168, 85, 247, 0.5);
      }
      .unicorn-flex-arrow {
        position: absolute;
        color: #a855f7;
        font-size: 20px;
        font-weight: bold;
      }
    </style>
    <script>
      (function() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', init);
        } else {
          init();
        }

        function init() {
          var hoveredElement = null;
          var selectedElement = null;
          var editingElement = null;
          var originalText = '';

          var badge = document.createElement('div');
          badge.id = 'unicorn-badge';
          badge.className = 'unicorn-badge';
          badge.innerHTML = '<div class="unicorn-badge-drag" id="unicorn-btn-drag" title="Verschieben"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg></div><span class="unicorn-badge-label">DIV</span><button class="unicorn-badge-btn" id="unicorn-btn-up" title="Parent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button><button class="unicorn-badge-btn" id="unicorn-btn-down" title="Child"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button><button class="unicorn-badge-btn unicorn-btn-delete" id="unicorn-btn-delete" title="Löschen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
          badge.style.display = 'none';
          document.body.appendChild(badge);
          var badgeLabel = badge.querySelector('.unicorn-badge-label');
          var btnUp = badge.querySelector('#unicorn-btn-up');
          var btnDown = badge.querySelector('#unicorn-btn-down');
          var btnDelete = badge.querySelector('#unicorn-btn-delete');
          var btnDrag = badge.querySelector('#unicorn-btn-drag');

          var marginBoxes = { top: null, right: null, bottom: null, left: null };
          var paddingBoxes = { top: null, right: null, bottom: null, left: null };
          ['top', 'right', 'bottom', 'left'].forEach(function(side) {
            var mBox = document.createElement('div');
            mBox.className = 'unicorn-margin-box';
            mBox.innerHTML = '<span class="unicorn-margin-label"></span>';
            mBox.style.display = 'none';
            document.body.appendChild(mBox);
            marginBoxes[side] = mBox;
            var pBox = document.createElement('div');
            pBox.className = 'unicorn-padding-box';
            pBox.innerHTML = '<span class="unicorn-padding-label"></span>';
            pBox.style.display = 'none';
            document.body.appendChild(pBox);
            paddingBoxes[side] = pBox;
          });

          // Layout overlay for Grid/Flex
          var layoutOverlay = document.createElement('div');
          layoutOverlay.id = 'unicorn-layout-overlay';
          layoutOverlay.className = 'unicorn-layout-overlay';
          layoutOverlay.innerHTML = '<span class="unicorn-layout-label"></span><div class="unicorn-grid-lines"></div>';
          layoutOverlay.style.display = 'none';
          document.body.appendChild(layoutOverlay);
          var layoutLabel = layoutOverlay.querySelector('.unicorn-layout-label');
          var gridLines = layoutOverlay.querySelector('.unicorn-grid-lines');

          function showLayoutOverlay(el) {
            if (!el) return;
            var cs = window.getComputedStyle(el);
            var display = cs.display;
            var isGrid = display === 'grid' || display === 'inline-grid';
            var isFlex = display === 'flex' || display === 'inline-flex';

            if (!isGrid && !isFlex) {
              layoutOverlay.style.display = 'none';
              return;
            }

            var rect = el.getBoundingClientRect();
            var scrollY = window.scrollY || document.documentElement.scrollTop;
            var scrollX = window.scrollX || document.documentElement.scrollLeft;
            layoutOverlay.style.display = 'block';
            layoutOverlay.style.left = (rect.left + scrollX) + 'px';
            layoutOverlay.style.top = (rect.top + scrollY) + 'px';
            layoutOverlay.style.width = rect.width + 'px';
            layoutOverlay.style.height = rect.height + 'px';

            gridLines.innerHTML = '';

            if (isGrid) {
              layoutLabel.textContent = 'GRID';
              // Show grid columns
              var cols = cs.gridTemplateColumns.split(' ').filter(function(c) { return c && c !== 'none'; });
              var gap = parseInt(cs.columnGap) || parseInt(cs.gap) || 0;
              var x = 0;
              cols.forEach(function(col, i) {
                if (i > 0) {
                  var line = document.createElement('div');
                  line.className = 'unicorn-grid-col';
                  line.style.left = x + 'px';
                  gridLines.appendChild(line);
                }
                var w = parseFloat(col) || (rect.width / cols.length);
                x += w + (i < cols.length - 1 ? gap : 0);
              });
              // Show grid rows
              var rows = cs.gridTemplateRows.split(' ').filter(function(r) { return r && r !== 'none'; });
              var rowGap = parseInt(cs.rowGap) || parseInt(cs.gap) || 0;
              var y = 0;
              rows.forEach(function(row, i) {
                if (i > 0) {
                  var line = document.createElement('div');
                  line.className = 'unicorn-grid-row';
                  line.style.top = y + 'px';
                  gridLines.appendChild(line);
                }
                var h = parseFloat(row) || (rect.height / rows.length);
                y += h + (i < rows.length - 1 ? rowGap : 0);
              });
            } else if (isFlex) {
              var dir = cs.flexDirection || 'row';
              var arrow = dir === 'row' ? '→' : dir === 'row-reverse' ? '←' : dir === 'column' ? '↓' : '↑';
              layoutLabel.textContent = 'FLEX ' + arrow;
            }
          }

          function hideLayoutOverlay() {
            layoutOverlay.style.display = 'none';
          }

          function isUnicorn(el) {
            if (!el) return false;
            if (el.id && el.id.indexOf('unicorn-') === 0) return true;
            if (el.closest && el.closest('#unicorn-badge')) return true;
            if (el.closest && el.closest('.unicorn-margin-box')) return true;
            if (el.closest && el.closest('.unicorn-padding-box')) return true;
            if (el.closest && el.closest('.unicorn-layout-overlay')) return true;
            return false;
          }

          function getPath(el) {
            // Returns array of tag names for display
            var path = [];
            var current = el;
            while (current && current !== document.body && current !== document.documentElement) {
              path.unshift(current.tagName);
              current = current.parentElement;
            }
            return path;
          }

          function getSelector(el) {
            // Returns CSS selector string for querying
            var path = [];
            while (el && el !== document.body && el !== document.documentElement) {
              var selector = el.tagName.toLowerCase();
              // Add id if exists
              if (el.id) {
                selector = '#' + el.id;
                path.unshift(selector);
                break; // ID is unique, no need to go further
              }
              // Add nth-of-type for uniqueness
              if (el.parentElement) {
                var siblings = Array.from(el.parentElement.children).filter(function(c) {
                  return c.tagName === el.tagName;
                });
                if (siblings.length > 1) {
                  var index = siblings.indexOf(el) + 1;
                  selector += ':nth-of-type(' + index + ')';
                }
              }
              path.unshift(selector);
              el = el.parentElement;
            }
            return path.join(' > ');
          }

          function showBadge(el) {
            if (!el) return;
            var rect = el.getBoundingClientRect();
            var scrollY = window.scrollY || document.documentElement.scrollTop;
            var scrollX = window.scrollX || document.documentElement.scrollLeft;
            badgeLabel.textContent = el.tagName;
            badge.style.display = 'flex';
            // Document-relative positioning - scrolls with content, no lag
            badge.style.left = (rect.left + scrollX) + 'px';
            badge.style.top = Math.max(0, rect.top + scrollY - 32) + 'px';
          }

          function hideBadge() { badge.style.display = 'none'; }

          // Navigate to parent
          btnUp.addEventListener('click', function(e) {
            e.stopPropagation();
            var current = selectedElement || hoveredElement;
            if (current && current.parentElement && current.parentElement !== document.body && current.parentElement !== document.documentElement) {
              selectEl(current.parentElement);
            }
          });

          // Navigate to first child
          btnDown.addEventListener('click', function(e) {
            e.stopPropagation();
            var current = selectedElement || hoveredElement;
            if (current && current.firstElementChild) {
              selectEl(current.firstElementChild);
            }
          });

          // Delete element
          btnDelete.addEventListener('click', function(e) {
            e.stopPropagation();
            if (selectedElement) {
              var selector = getSelector(selectedElement);
              window.parent.postMessage({
                type: 'delete-element',
                selector: selector
              }, '*');
              selectedElement.classList.remove('unicorn-selected');
              selectedElement = null;
              hideBadge();
              hideSpacing();
              hideLayoutOverlay();
            }
          });

          // Element Drag & Drop via Badge
          var isDraggingElement = false;
          var dragPlaceholder = null;
          var dragClone = null;

          btnDrag.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedElement) return;

            isDraggingElement = true;

            // Create placeholder
            dragPlaceholder = document.createElement('div');
            dragPlaceholder.style.cssText = 'height:' + selectedElement.offsetHeight + 'px;background:rgba(59,130,246,0.1);border:2px dashed #3b82f6;border-radius:4px;margin:4px 0;';
            selectedElement.parentNode.insertBefore(dragPlaceholder, selectedElement);

            // Create clone for visual feedback
            dragClone = selectedElement.cloneNode(true);
            dragClone.style.cssText = 'position:fixed;opacity:0.7;pointer-events:none;z-index:99999;width:' + selectedElement.offsetWidth + 'px;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
            document.body.appendChild(dragClone);

            selectedElement.style.display = 'none';
            document.body.style.cursor = 'grabbing';
            hideBadge();
          });

          document.addEventListener('mousemove', function(e) {
            if (!isDraggingElement || !dragClone || !selectedElement) return;

            // Position clone at cursor
            dragClone.style.left = (e.clientX - dragClone.offsetWidth / 2) + 'px';
            dragClone.style.top = (e.clientY - 20) + 'px';

            // Find drop target
            dragClone.style.display = 'none';
            var target = document.elementFromPoint(e.clientX, e.clientY);
            dragClone.style.display = '';

            if (target && target !== dragPlaceholder && target !== selectedElement) {
              var parent = target.closest('section, div, article, main');
              if (parent && parent !== selectedElement && !selectedElement.contains(parent)) {
                var rect = target.getBoundingClientRect();
                var midY = rect.top + rect.height / 2;

                if (e.clientY < midY) {
                  target.parentNode.insertBefore(dragPlaceholder, target);
                } else {
                  target.parentNode.insertBefore(dragPlaceholder, target.nextSibling);
                }
              }
            }
          });

          document.addEventListener('mouseup', function(e) {
            if (!isDraggingElement) return;

            isDraggingElement = false;
            document.body.style.cursor = '';

            if (dragPlaceholder && selectedElement) {
              // Move element to placeholder position
              dragPlaceholder.parentNode.insertBefore(selectedElement, dragPlaceholder);
              selectedElement.style.display = '';
              dragPlaceholder.remove();

              // Notify parent of change
              window.parent.postMessage({
                type: 'element-moved',
                html: document.documentElement.outerHTML
              }, '*');

              // Re-select
              selectEl(selectedElement);
            }

            if (dragClone) {
              dragClone.remove();
              dragClone = null;
            }
            dragPlaceholder = null;
          });

          function showSpacing(el) {
            if (!el) return;
            var rect = el.getBoundingClientRect();
            var scrollY = window.scrollY || document.documentElement.scrollTop;
            var scrollX = window.scrollX || document.documentElement.scrollLeft;
            var cs = window.getComputedStyle(el);
            var m = { top: parseInt(cs.marginTop)||0, right: parseInt(cs.marginRight)||0, bottom: parseInt(cs.marginBottom)||0, left: parseInt(cs.marginLeft)||0 };
            var p = { top: parseInt(cs.paddingTop)||0, right: parseInt(cs.paddingRight)||0, bottom: parseInt(cs.paddingBottom)||0, left: parseInt(cs.paddingLeft)||0 };

            // Document-relative left/top values
            var docLeft = rect.left + scrollX;
            var docTop = rect.top + scrollY;
            var docRight = rect.right + scrollX;
            var docBottom = rect.bottom + scrollY;

            // Margin boxes - document-relative positioning
            if (m.top > 0) { marginBoxes.top.style.display = 'flex'; marginBoxes.top.style.left = docLeft+'px'; marginBoxes.top.style.top = (docTop-m.top)+'px'; marginBoxes.top.style.width = rect.width+'px'; marginBoxes.top.style.height = m.top+'px'; marginBoxes.top.querySelector('.unicorn-margin-label').textContent = m.top; } else { marginBoxes.top.style.display = 'none'; }
            if (m.right > 0) { marginBoxes.right.style.display = 'flex'; marginBoxes.right.style.left = docRight+'px'; marginBoxes.right.style.top = docTop+'px'; marginBoxes.right.style.width = m.right+'px'; marginBoxes.right.style.height = rect.height+'px'; marginBoxes.right.querySelector('.unicorn-margin-label').textContent = m.right; } else { marginBoxes.right.style.display = 'none'; }
            if (m.bottom > 0) { marginBoxes.bottom.style.display = 'flex'; marginBoxes.bottom.style.left = docLeft+'px'; marginBoxes.bottom.style.top = docBottom+'px'; marginBoxes.bottom.style.width = rect.width+'px'; marginBoxes.bottom.style.height = m.bottom+'px'; marginBoxes.bottom.querySelector('.unicorn-margin-label').textContent = m.bottom; } else { marginBoxes.bottom.style.display = 'none'; }
            if (m.left > 0) { marginBoxes.left.style.display = 'flex'; marginBoxes.left.style.left = (docLeft-m.left)+'px'; marginBoxes.left.style.top = docTop+'px'; marginBoxes.left.style.width = m.left+'px'; marginBoxes.left.style.height = rect.height+'px'; marginBoxes.left.querySelector('.unicorn-margin-label').textContent = m.left; } else { marginBoxes.left.style.display = 'none'; }

            // Padding boxes - document-relative positioning
            if (p.top > 0) { paddingBoxes.top.style.display = 'flex'; paddingBoxes.top.style.left = docLeft+'px'; paddingBoxes.top.style.top = docTop+'px'; paddingBoxes.top.style.width = rect.width+'px'; paddingBoxes.top.style.height = p.top+'px'; paddingBoxes.top.querySelector('.unicorn-padding-label').textContent = p.top; } else { paddingBoxes.top.style.display = 'none'; }
            if (p.right > 0) { paddingBoxes.right.style.display = 'flex'; paddingBoxes.right.style.left = (docRight-p.right)+'px'; paddingBoxes.right.style.top = docTop+'px'; paddingBoxes.right.style.width = p.right+'px'; paddingBoxes.right.style.height = rect.height+'px'; paddingBoxes.right.querySelector('.unicorn-padding-label').textContent = p.right; } else { paddingBoxes.right.style.display = 'none'; }
            if (p.bottom > 0) { paddingBoxes.bottom.style.display = 'flex'; paddingBoxes.bottom.style.left = docLeft+'px'; paddingBoxes.bottom.style.top = (docBottom-p.bottom)+'px'; paddingBoxes.bottom.style.width = rect.width+'px'; paddingBoxes.bottom.style.height = p.bottom+'px'; paddingBoxes.bottom.querySelector('.unicorn-padding-label').textContent = p.bottom; } else { paddingBoxes.bottom.style.display = 'none'; }
            if (p.left > 0) { paddingBoxes.left.style.display = 'flex'; paddingBoxes.left.style.left = docLeft+'px'; paddingBoxes.left.style.top = docTop+'px'; paddingBoxes.left.style.width = p.left+'px'; paddingBoxes.left.style.height = rect.height+'px'; paddingBoxes.left.querySelector('.unicorn-padding-label').textContent = p.left; } else { paddingBoxes.left.style.display = 'none'; }
          }

          function hideSpacing() {
            for (var k in marginBoxes) marginBoxes[k].style.display = 'none';
            for (var k in paddingBoxes) paddingBoxes[k].style.display = 'none';
          }

          function stopEdit() {
            if (editingElement) {
              var wasEditing = editingElement;
              editingElement.contentEditable = 'false';
              editingElement.classList.remove('unicorn-editing');
              if (editingElement.innerHTML !== originalText) {
                window.parent.postMessage({
                  type: 'text-edited',
                  newHtml: editingElement.innerHTML,
                  selector: getSelector(editingElement)
                }, '*');
              }
              editingElement = null;
              originalText = '';
              // Re-show overlays for selected element after editing stops
              if (selectedElement) {
                showBadge(selectedElement);
                showSpacing(selectedElement);
                showLayoutOverlay(selectedElement);
              }
            }
          }

          function selectEl(target) {
            if (selectedElement) selectedElement.classList.remove('unicorn-selected');
            selectedElement = target;
            selectedElement.classList.add('unicorn-selected');
            selectedElement.classList.remove('unicorn-hover-outline');
            showBadge(selectedElement);
            showSpacing(selectedElement);
            showLayoutOverlay(selectedElement);

            var rect = selectedElement.getBoundingClientRect();
            var cs = window.getComputedStyle(selectedElement);

            // Background Image Detection
            var bgImage = cs.backgroundImage;
            var hasBackgroundImage = bgImage && bgImage !== 'none';
            var backgroundImageUrl = null;

            if (hasBackgroundImage) {
              // CSS: background-image: url("...")
              var urlMatch = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/);
              if (urlMatch) {
                backgroundImageUrl = urlMatch[1];
              }
              // Tailwind arbitrary background URL class
              if (!backgroundImageUrl && selectedElement.className) {
                var twMatch = selectedElement.className.match(/bg-\\[url\\(['"]?([^'\"\\]]+)/);
                if (twMatch) {
                  backgroundImageUrl = twMatch[1];
                }
              }
            }

            window.parent.postMessage({
              type: 'element-selected',
              element: {
                tagName: selectedElement.tagName,
                path: getPath(selectedElement),
                selector: getSelector(selectedElement),
                className: selectedElement.className || '',
                textContent: (selectedElement.textContent || '').substring(0, 200),
                innerHTML: selectedElement.innerHTML,
                outerHTML: selectedElement.outerHTML,
                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                // Background Image Support
                backgroundImage: backgroundImageUrl,
                hasBackgroundImage: hasBackgroundImage,
                ariaLabel: selectedElement.getAttribute('aria-label') || '',
                spacing: {
                  marginTop: parseInt(cs.marginTop)||0, marginRight: parseInt(cs.marginRight)||0,
                  marginBottom: parseInt(cs.marginBottom)||0, marginLeft: parseInt(cs.marginLeft)||0,
                  paddingTop: parseInt(cs.paddingTop)||0, paddingRight: parseInt(cs.paddingRight)||0,
                  paddingBottom: parseInt(cs.paddingBottom)||0, paddingLeft: parseInt(cs.paddingLeft)||0
                }
              }
            }, '*');
          }

          // Click
          document.addEventListener('click', function(e) {
            if (isUnicorn(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            if (editingElement && e.target !== editingElement) stopEdit();
            selectEl(e.target);
          }, true);

          // Right-click context menu
          document.addEventListener('contextmenu', function(e) {
            if (isUnicorn(e.target)) return;
            e.preventDefault();
            e.stopPropagation();

            var el = e.target;
            if (!el || el === document.body || el === document.documentElement) return;

            // Select the element first
            selectEl(el);

            // Get iframe position relative to parent window
            var iframeRect = { left: 0, top: 0 };
            try {
              var iframe = window.frameElement;
              if (iframe) {
                var rect = iframe.getBoundingClientRect();
                iframeRect = { left: rect.left, top: rect.top };
              }
            } catch(err) {}

            // Send context menu event to parent
            window.parent.postMessage({
              type: 'context-menu',
              x: e.clientX + iframeRect.left,
              y: e.clientY + iframeRect.top,
              element: {
                tagName: el.tagName,
                selector: getSelector(el),
                outerHTML: el.outerHTML
              }
            }, '*');
          }, true);

          // Mousedown
          document.addEventListener('mousedown', function(e) {
            if (isUnicorn(e.target)) return;
            if (editingElement && editingElement.isContentEditable) return;
            e.preventDefault();
          }, true);

          // Hover - optimized with requestAnimationFrame
          var hoverRAF = null;
          var pendingHoverEl = null;

          document.addEventListener('mouseover', function(e) {
            if (e.target === document.body || e.target === document.documentElement || isUnicorn(e.target)) return;

            // Immediate outline update for responsiveness
            if (hoveredElement && hoveredElement !== selectedElement) {
              hoveredElement.classList.remove('unicorn-hover-outline');
            }
            hoveredElement = e.target;

            if (hoveredElement !== selectedElement && hoveredElement !== editingElement) {
              hoveredElement.classList.add('unicorn-hover-outline');

              // Batch expensive operations with RAF
              if (!selectedElement) {
                pendingHoverEl = hoveredElement;
                if (!hoverRAF) {
                  hoverRAF = requestAnimationFrame(function() {
                    if (pendingHoverEl && pendingHoverEl === hoveredElement) {
                      showBadge(pendingHoverEl);
                      showLayoutOverlay(pendingHoverEl);
                    }
                    hoverRAF = null;
                  });
                }
              }
            }
          });

          document.addEventListener('mouseout', function(e) {
            if (isUnicorn(e.target)) return;
            if (hoveredElement && hoveredElement !== selectedElement) {
              hoveredElement.classList.remove('unicorn-hover-outline');
              if (!selectedElement) {
                hideBadge();
                hideSpacing();
                hideLayoutOverlay();
              }
            }
          });

          // Double click - edit (only pure text elements)
          document.addEventListener('dblclick', function(e) {
            if (isUnicorn(e.target)) return;
            e.preventDefault();
            var textTags = ['P','H1','H2','H3','H4','H5','H6','SPAN','A','BUTTON','LI','TD','TH','LABEL'];
            var el = e.target;
            // Only allow editing if element is a text tag AND has no block-level children
            var hasBlockChildren = el.querySelector('div,section,article,header,footer,nav,aside,p,h1,h2,h3,h4,h5,h6,ul,ol,table');
            if (textTags.indexOf(el.tagName) >= 0 && !hasBlockChildren) {
              stopEdit();
              editingElement = el;
              originalText = el.innerHTML; // Use innerHTML to preserve inline tags like <strong>, <em>
              el.contentEditable = 'true';
              el.classList.remove('unicorn-selected');
              el.classList.add('unicorn-editing');
              el.focus();
              var range = document.createRange();
              range.selectNodeContents(el);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              hideBadge();
              // Keep spacing and layout visible while editing
              showSpacing(el);
              showLayoutOverlay(el);
            }
          }, true);

          // Keys
          document.addEventListener('keydown', function(e) {
            if (editingElement) {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stopEdit(); }
              if (e.key === 'Escape') { e.preventDefault(); editingElement.innerHTML = originalText; stopEdit(); }
            }
          });

          // Blur
          document.addEventListener('focusout', function(e) {
            if (editingElement && e.target === editingElement) setTimeout(stopEdit, 100);
          });

          // Parent messages
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'deselect') {
              stopEdit();
              if (selectedElement) { selectedElement.classList.remove('unicorn-selected'); selectedElement = null; }
              hideBadge();
              hideSpacing();
              hideLayoutOverlay();
            }
            // Select element from Layers panel
            if (e.data && e.data.type === 'select-element' && e.data.selector) {
              stopEdit();
              var el = document.querySelector(e.data.selector);
              if (el) {
                // Select it first (shows overlays at current position)
                selectEl(el);
                // Then scroll - overlays will be at correct position since they use document-relative coords
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          });

          // =============================================
          // SECTION DRAG & DROP
          // =============================================
          console.log('[Unicorn] Initializing Section Drag & Drop...');
          (function initSectionDrag() {
            console.log('[Unicorn] Section Drag IIFE running');
            var draggedSection = null;
            var dragHandle = null;
            var placeholder = null;
            var sections = [];

            var SECTION_SELECTORS = 'section[id], body > section, body > div:not([id^="unicorn-"]):not(.unicorn-badge):not(.unicorn-margin-box):not(.unicorn-padding-box), body > article, body > main > section, body > main > div, main > section, main > div, body > * > section, body > * > * > section';

            function updateSections() {
              sections = Array.from(document.querySelectorAll(SECTION_SELECTORS))
                .filter(function(el) {
                  if (el.id && el.id.startsWith('unicorn-')) return false;
                  if (el.className && el.className.includes && el.className.includes('unicorn-')) return false;
                  var rect = el.getBoundingClientRect();
                  return rect.height > 50;
                });
              console.log('[Unicorn] Found sections:', sections.length, sections.map(function(s) { return s.id || s.tagName; }));
            }

            dragHandle = document.createElement('div');
            dragHandle.id = 'unicorn-drag-handle';
            dragHandle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>';
            dragHandle.style.cssText = 'position:fixed;display:none;width:20px;height:28px;background:#3b82f6;border-radius:0 4px 4px 0;cursor:grab;z-index:99999;align-items:center;justify-content:center;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.2);';
            document.body.appendChild(dragHandle);
            console.log('[Unicorn] Drag handle created:', dragHandle);

            placeholder = document.createElement('div');
            placeholder.id = 'unicorn-drop-placeholder';
            placeholder.style.cssText = 'display:none;height:4px;background:#3b82f6;margin:8px 0;border-radius:2px;pointer-events:none;';
            document.body.appendChild(placeholder);

            updateSections();

            function showDragHandle(section) {
              if (draggedSection) return;
              var rect = section.getBoundingClientRect();
              // Position inside the section, not outside (to stay visible in iframe)
              var leftPos = Math.max(4, rect.left + 4);
              var topPos = rect.top + rect.height / 2 - 14;
              console.log('[Unicorn] Showing drag handle for section:', section.id, 'at', leftPos, topPos);
              dragHandle.style.display = 'flex';
              dragHandle.style.left = leftPos + 'px';
              dragHandle.style.top = topPos + 'px';
              dragHandle.dataset.sectionIndex = sections.indexOf(section);
            }

            function hideDragHandle() {
              if (!draggedSection) dragHandle.style.display = 'none';
            }

            document.addEventListener('mouseover', function(e) {
              if (draggedSection) return;
              var section = e.target.closest(SECTION_SELECTORS);
              if (section && sections.includes(section)) {
                console.log('[Unicorn] Mouseover on section:', section.id || section.tagName);
                showDragHandle(section);
              }
            });

            document.addEventListener('mouseout', function(e) {
              if (draggedSection) return;
              var relatedTarget = e.relatedTarget;
              if (relatedTarget && relatedTarget.closest && relatedTarget.closest(SECTION_SELECTORS)) return;
              if (relatedTarget === dragHandle || (dragHandle.contains && dragHandle.contains(relatedTarget))) return;
              hideDragHandle();
            });

            dragHandle.addEventListener('mousedown', function(e) {
              e.preventDefault();
              var index = parseInt(dragHandle.dataset.sectionIndex, 10);
              if (isNaN(index) || index < 0 || !sections[index]) return;

              draggedSection = sections[index];
              draggedSection.style.opacity = '0.5';
              var rect = draggedSection.getBoundingClientRect();

              placeholder.style.height = rect.height + 'px';
              placeholder.style.display = 'block';
              draggedSection.parentNode.insertBefore(placeholder, draggedSection);

              dragHandle.style.cursor = 'grabbing';
              document.body.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', function(e) {
              if (!draggedSection) return;
              e.preventDefault();

              for (var i = 0; i < sections.length; i++) {
                var s = sections[i];
                if (s === draggedSection || s === placeholder) continue;
                var rect = s.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                  var middle = rect.top + rect.height / 2;
                  if (e.clientY < middle) {
                    s.parentNode.insertBefore(placeholder, s);
                  } else {
                    s.parentNode.insertBefore(placeholder, s.nextSibling);
                  }
                  break;
                }
              }

              dragHandle.style.top = (e.clientY - 14) + 'px';
            });

            document.addEventListener('mouseup', function() {
              if (!draggedSection) return;

              placeholder.parentNode.insertBefore(draggedSection, placeholder);
              draggedSection.style.opacity = '';
              placeholder.style.display = 'none';
              dragHandle.style.cursor = 'grab';
              document.body.style.cursor = '';

              window.parent.postMessage({ type: 'section-reordered', html: document.documentElement.outerHTML }, '*');

              draggedSection = null;
              updateSections();
              hideDragHandle();
            });
          })();

          // =============================================
          // SPACING VISUALIZATION (Webflow/Figma style)
          // =============================================
          (function initSpacingViz() {
            var spacingOverlay = document.createElement('div');
            spacingOverlay.id = 'unicorn-spacing-overlay';
            spacingOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99990;display:none;';
            document.body.appendChild(spacingOverlay);

            // Create margin areas (orange)
            var marginAreas = {};
            var paddingAreas = {};
            ['top','right','bottom','left'].forEach(function(side) {
              var mArea = document.createElement('div');
              mArea.className = 'unicorn-margin-area';
              mArea.style.cssText = 'position:fixed;background:rgba(255,150,50,0.15);pointer-events:none;display:none;';
              var mLabel = document.createElement('span');
              mLabel.style.cssText = 'position:absolute;background:#f97316;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;white-space:nowrap;';
              mArea.appendChild(mLabel);
              spacingOverlay.appendChild(mArea);
              marginAreas[side] = { area: mArea, label: mLabel };

              var pArea = document.createElement('div');
              pArea.className = 'unicorn-padding-area';
              pArea.style.cssText = 'position:fixed;background:rgba(34,197,94,0.15);pointer-events:none;display:none;';
              var pLabel = document.createElement('span');
              pLabel.style.cssText = 'position:absolute;background:#22c55e;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;white-space:nowrap;';
              pArea.appendChild(pLabel);
              spacingOverlay.appendChild(pArea);
              paddingAreas[side] = { area: pArea, label: pLabel };
            });

            function showSpacingOverlay(el) {
              if (!el) { spacingOverlay.style.display = 'none'; return; }

              var rect = el.getBoundingClientRect();
              var cs = window.getComputedStyle(el);
              var m = {
                top: parseInt(cs.marginTop)||0,
                right: parseInt(cs.marginRight)||0,
                bottom: parseInt(cs.marginBottom)||0,
                left: parseInt(cs.marginLeft)||0
              };
              var p = {
                top: parseInt(cs.paddingTop)||0,
                right: parseInt(cs.paddingRight)||0,
                bottom: parseInt(cs.paddingBottom)||0,
                left: parseInt(cs.paddingLeft)||0
              };

              spacingOverlay.style.display = 'block';

              // Margin TOP
              if (m.top > 0) {
                marginAreas.top.area.style.cssText = 'position:fixed;background:rgba(255,150,50,0.2);pointer-events:none;display:block;left:'+rect.left+'px;top:'+(rect.top-m.top)+'px;width:'+rect.width+'px;height:'+m.top+'px;';
                marginAreas.top.label.textContent = m.top;
                marginAreas.top.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#f97316;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { marginAreas.top.area.style.display = 'none'; }

              // Margin BOTTOM
              if (m.bottom > 0) {
                marginAreas.bottom.area.style.cssText = 'position:fixed;background:rgba(255,150,50,0.2);pointer-events:none;display:block;left:'+rect.left+'px;top:'+rect.bottom+'px;width:'+rect.width+'px;height:'+m.bottom+'px;';
                marginAreas.bottom.label.textContent = m.bottom;
                marginAreas.bottom.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#f97316;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { marginAreas.bottom.area.style.display = 'none'; }

              // Margin LEFT
              if (m.left > 0) {
                marginAreas.left.area.style.cssText = 'position:fixed;background:rgba(255,150,50,0.2);pointer-events:none;display:block;left:'+(rect.left-m.left)+'px;top:'+rect.top+'px;width:'+m.left+'px;height:'+rect.height+'px;';
                marginAreas.left.label.textContent = m.left;
                marginAreas.left.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#f97316;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { marginAreas.left.area.style.display = 'none'; }

              // Margin RIGHT
              if (m.right > 0) {
                marginAreas.right.area.style.cssText = 'position:fixed;background:rgba(255,150,50,0.2);pointer-events:none;display:block;left:'+rect.right+'px;top:'+rect.top+'px;width:'+m.right+'px;height:'+rect.height+'px;';
                marginAreas.right.label.textContent = m.right;
                marginAreas.right.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#f97316;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { marginAreas.right.area.style.display = 'none'; }

              // Padding TOP
              if (p.top > 0) {
                paddingAreas.top.area.style.cssText = 'position:fixed;background:rgba(34,197,94,0.2);pointer-events:none;display:block;left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;height:'+p.top+'px;';
                paddingAreas.top.label.textContent = p.top;
                paddingAreas.top.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#22c55e;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { paddingAreas.top.area.style.display = 'none'; }

              // Padding BOTTOM
              if (p.bottom > 0) {
                paddingAreas.bottom.area.style.cssText = 'position:fixed;background:rgba(34,197,94,0.2);pointer-events:none;display:block;left:'+rect.left+'px;top:'+(rect.bottom-p.bottom)+'px;width:'+rect.width+'px;height:'+p.bottom+'px;';
                paddingAreas.bottom.label.textContent = p.bottom;
                paddingAreas.bottom.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#22c55e;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { paddingAreas.bottom.area.style.display = 'none'; }

              // Padding LEFT
              if (p.left > 0) {
                paddingAreas.left.area.style.cssText = 'position:fixed;background:rgba(34,197,94,0.2);pointer-events:none;display:block;left:'+rect.left+'px;top:'+(rect.top+p.top)+'px;width:'+p.left+'px;height:'+(rect.height-p.top-p.bottom)+'px;';
                paddingAreas.left.label.textContent = p.left;
                paddingAreas.left.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#22c55e;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { paddingAreas.left.area.style.display = 'none'; }

              // Padding RIGHT
              if (p.right > 0) {
                paddingAreas.right.area.style.cssText = 'position:fixed;background:rgba(34,197,94,0.2);pointer-events:none;display:block;left:'+(rect.right-p.right)+'px;top:'+(rect.top+p.top)+'px;width:'+p.right+'px;height:'+(rect.height-p.top-p.bottom)+'px;';
                paddingAreas.right.label.textContent = p.right;
                paddingAreas.right.label.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#22c55e;color:white;font-size:10px;padding:1px 4px;border-radius:2px;font-family:system-ui;';
              } else { paddingAreas.right.area.style.display = 'none'; }
            }

            function hideSpacingOverlay() {
              spacingOverlay.style.display = 'none';
            }

            // Hook into selection
            var origSelectEl = selectEl;
            selectEl = function(target) {
              origSelectEl(target);
              if (target) {
                showSpacingOverlay(target);
              } else {
                hideSpacingOverlay();
              }
            };

            // Update on scroll
            window.addEventListener('scroll', function() {
              if (selectedElement) showSpacingOverlay(selectedElement);
            });
          })();

        }
      })();
    </script>
    `

    if (html.includes('</body>')) {
      return html.replace('</body>', selectionScript + '</body>')
    }
    return html + selectionScript
  }, [viewMode])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'element-selected') {
        const element = event.data.element as SelectedElement
        selectElement(element)
      }

      // Handle delete element
      if (event.data?.type === 'delete-element') {
        const selector = event.data.selector
        if (selector) {
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const element = doc.querySelector(selector)

          if (element) {
            element.remove()

            let newHtml = '<!DOCTYPE html>\n<html'
            Array.from(doc.documentElement.attributes).forEach(attr => {
              newHtml += ` ${attr.name}="${attr.value}"`
            })
            newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

            updateHtml(newHtml, true)
            selectElement(null)
          }
        }
      }

      // Handle inline text editing
      if (event.data?.type === 'text-edited') {
        const newInnerHtml = event.data.newHtml
        const selector = event.data.selector

        console.log('Text edit received:', { selector, newHtml: newInnerHtml?.substring(0, 50) })

        if (selector && newInnerHtml !== undefined) {
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const element = doc.querySelector(selector)

          console.log('Element found:', !!element, element?.tagName)

          if (element) {
            // Use innerHTML to preserve inline formatting
            element.innerHTML = newInnerHtml

            // Reconstruct HTML properly
            let newHtml = '<!DOCTYPE html>\n<html'
            Array.from(doc.documentElement.attributes).forEach(attr => {
              newHtml += ` ${attr.name}="${attr.value}"`
            })
            newHtml += '>\n'
            newHtml += doc.head.outerHTML + '\n'
            newHtml += doc.body.outerHTML + '\n'
            newHtml += '</html>'

            console.log('New HTML length:', newHtml.length, 'Old HTML length:', html.length)
            updateHtml(newHtml, true)
          }
        }
      }

      // Handle section reordering (drag & drop)
      if (event.data?.type === 'section-reordered') {
        const newHtmlFromIframe = event.data.html
        if (newHtmlFromIframe) {
          // Parse and clean the HTML from iframe
          const doc = new DOMParser().parseFromString(newHtmlFromIframe, 'text/html')

          // Remove unicorn elements
          doc.querySelectorAll('[id^="unicorn-"]').forEach(el => el.remove())
          doc.querySelectorAll('[class*="unicorn-"]').forEach(el => {
            el.classList.forEach(cls => {
              if (cls.startsWith('unicorn-')) el.classList.remove(cls)
            })
          })

          // Reconstruct clean HTML
          let cleanHtml = '<!DOCTYPE html>\n<html'
          Array.from(doc.documentElement.attributes).forEach(attr => {
            cleanHtml += ` ${attr.name}="${attr.value}"`
          })
          cleanHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

          console.log('Section reordered, updating HTML')
          updateHtml(cleanHtml, true)
        }
      }

      // Handle spacing changes (drag handles)
      if (event.data?.type === 'spacing-changed') {
        const { selector, className } = event.data
        if (selector && className) {
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const element = doc.querySelector(selector)

          if (element) {
            element.className = className

            // Reconstruct HTML
            let newHtml = '<!DOCTYPE html>\n<html'
            Array.from(doc.documentElement.attributes).forEach(attr => {
              newHtml += ` ${attr.name}="${attr.value}"`
            })
            newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

            console.log('Spacing changed for', selector)
            updateHtml(newHtml, true)
          }
        }
      }

      // Handle element moved (drag & drop)
      if (event.data?.type === 'element-moved') {
        const newHtmlFromIframe = event.data.html
        if (newHtmlFromIframe) {
          // Parse and clean the HTML from iframe
          const doc = new DOMParser().parseFromString(newHtmlFromIframe, 'text/html')

          // Remove unicorn elements
          doc.querySelectorAll('[id^="unicorn-"]').forEach(el => el.remove())
          doc.querySelectorAll('[class*="unicorn-"]').forEach(el => {
            el.classList.forEach(cls => {
              if (cls.startsWith('unicorn-')) el.classList.remove(cls)
            })
          })

          // Reconstruct clean HTML
          let cleanHtml = '<!DOCTYPE html>\n<html'
          Array.from(doc.documentElement.attributes).forEach(attr => {
            cleanHtml += ` ${attr.name}="${attr.value}"`
          })
          cleanHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

          console.log('Element moved, updating HTML')
          updateHtml(cleanHtml, true)
        }
      }

      // Handle context menu
      if (event.data?.type === 'context-menu') {
        setContextMenu({
          x: event.data.x,
          y: event.data.y,
          element: event.data.element,
        })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectElement, html, updateHtml])

  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    if (!contextMenu?.element) return

    const { selector, outerHTML, tagName } = contextMenu.element

    switch (action) {
      case 'save-component':
        setComponentHtml(outerHTML)
        setShowSaveComponent(true)
        break

      case 'duplicate':
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const el = doc.querySelector(selector)
        if (el && el.parentNode) {
          const clone = el.cloneNode(true) as HTMLElement
          // Remove any IDs to avoid duplicates
          clone.removeAttribute('id')
          el.parentNode.insertBefore(clone, el.nextSibling)

          let newHtml = '<!DOCTYPE html>\n<html'
          Array.from(doc.documentElement.attributes).forEach(attr => {
            newHtml += ` ${attr.name}="${attr.value}"`
          })
          newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'
          updateHtml(newHtml, true)
        }
        break

      case 'select-parent':
        iframeRef.current?.contentWindow?.postMessage({ type: 'select-parent' }, '*')
        break

      case 'select-child':
        iframeRef.current?.contentWindow?.postMessage({ type: 'select-child' }, '*')
        break

      case 'replace-image':
        if (tagName === 'IMG') {
          setImageSelector(selector)
          setShowImagePicker(true)
        }
        break

      case 'copy-html':
        navigator.clipboard.writeText(outerHTML)
        break

      case 'cut':
        setClipboard(outerHTML)
        // Delete element
        const cutDoc = new DOMParser().parseFromString(html, 'text/html')
        const cutEl = cutDoc.querySelector(selector)
        if (cutEl) {
          cutEl.remove()
          let newHtml = '<!DOCTYPE html>\n<html'
          Array.from(cutDoc.documentElement.attributes).forEach(attr => {
            newHtml += ` ${attr.name}="${attr.value}"`
          })
          newHtml += '>\n' + cutDoc.head.outerHTML + '\n' + cutDoc.body.outerHTML + '\n</html>'
          updateHtml(newHtml, true)
          selectElement(null)
        }
        break

      case 'paste':
        if (clipboard) {
          const pasteDoc = new DOMParser().parseFromString(html, 'text/html')
          const pasteEl = pasteDoc.querySelector(selector)
          if (pasteEl && pasteEl.parentNode) {
            const temp = pasteDoc.createElement('div')
            temp.innerHTML = clipboard
            const newEl = temp.firstElementChild
            if (newEl) {
              pasteEl.parentNode.insertBefore(newEl, pasteEl.nextSibling)
              let newHtml = '<!DOCTYPE html>\n<html'
              Array.from(pasteDoc.documentElement.attributes).forEach(attr => {
                newHtml += ` ${attr.name}="${attr.value}"`
              })
              newHtml += '>\n' + pasteDoc.head.outerHTML + '\n' + pasteDoc.body.outerHTML + '\n</html>'
              updateHtml(newHtml, true)
            }
          }
        }
        break

      case 'delete':
        const delDoc = new DOMParser().parseFromString(html, 'text/html')
        const delEl = delDoc.querySelector(selector)
        if (delEl) {
          delEl.remove()
          let newHtml = '<!DOCTYPE html>\n<html'
          Array.from(delDoc.documentElement.attributes).forEach(attr => {
            newHtml += ` ${attr.name}="${attr.value}"`
          })
          newHtml += '>\n' + delDoc.head.outerHTML + '\n' + delDoc.body.outerHTML + '\n</html>'
          updateHtml(newHtml, true)
          selectElement(null)
        }
        break
    }

    setContextMenu(null)
  }

  // Handle image replacement
  const handleImageReplace = (url: string, altText?: string) => {
    if (!imageSelector) return

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const img = doc.querySelector(imageSelector) as HTMLImageElement
    if (img) {
      img.src = url
      if (altText) img.alt = altText

      let newHtml = '<!DOCTYPE html>\n<html'
      Array.from(doc.documentElement.attributes).forEach(attr => {
        newHtml += ` ${attr.name}="${attr.value}"`
      })
      newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'
      updateHtml(newHtml, true)
    }

    setShowImagePicker(false)
    setImageSelector(null)
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && viewMode === 'design') {
      selectElement(null)
      iframeRef.current?.contentWindow?.postMessage({ type: 'deselect' }, '*')
    }
    // Close context menu on click
    if (contextMenu) {
      setContextMenu(null)
    }
  }

  const iframeWidth = BREAKPOINT_WIDTHS[breakpoint]
  const isResponsive = breakpoint !== 'desktop'

  return (
    <div
      onClick={handleContainerClick}
      className="h-full w-full bg-zinc-950 flex items-center justify-center overflow-auto relative"
    >
      {/* Wireframe Build Animation nur bei neuer Website ohne Header/Footer */}
      <FullPageWireframe isActive={showWireframe} />

      <div
        className={`h-full transition-all duration-300 ${isResponsive ? 'my-4 rounded-lg overflow-hidden shadow-2xl border border-zinc-700' : ''}`}
        style={{
          width: iframeWidth,
          maxWidth: '100%',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={getHtmlWithScript(previewHtml, isCurrentlyStreaming)}
          className="w-full h-full border-0 block bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          element={contextMenu.element}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Save Component Dialog */}
      {siteId && (
        <SaveComponentDialog
          open={showSaveComponent}
          onOpenChange={setShowSaveComponent}
          siteId={siteId}
          html={componentHtml}
          onSaved={() => {
            console.log('Component saved!')
          }}
        />
      )}

      {/* Image Picker for Replace */}
      {siteId && (
        <ImagePicker
          siteId={siteId}
          open={showImagePicker}
          onOpenChange={setShowImagePicker}
          onSelect={handleImageReplace}
        />
      )}
    </div>
  )
}
