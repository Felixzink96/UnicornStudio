'use client'

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import type { SelectedElement, Breakpoint } from '@/types/editor'
import { insertGlobalComponents } from '@/lib/ai/html-operations'
import { injectMenusIntoHtml } from '@/lib/menus/render-menu'
import { darkenHex } from '@/lib/design/style-extractor'

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

  const html = useEditorStore((s) => s.html)
  const viewMode = useEditorStore((s) => s.viewMode)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const selectElement = useEditorStore((s) => s.selectElement)
  const updateHtml = useEditorStore((s) => s.updateHtml)
  const globalHeader = useEditorStore((s) => s.globalHeader)
  const globalFooter = useEditorStore((s) => s.globalFooter)
  const menus = useEditorStore((s) => s.menus)
  const designVariables = useEditorStore((s) => s.designVariables)

  // Debounce HTML updates during streaming (150ms delay)
  const debouncedHtml = useDebouncedValue(html, 150)

  // Generate CSS variables from design tokens
  const designTokensCss = useMemo(() => {
    if (!designVariables) return ''

    const colors = designVariables.colors as Record<string, Record<string, string>> | undefined
    const typography = designVariables.typography as { fontHeading?: string; fontBody?: string } | undefined

    let css = ':root {\n'

    // Brand colors
    if (colors?.brand) {
      if (colors.brand.primary) {
        css += `  --color-brand-primary: ${colors.brand.primary};\n`
        css += `  --color-brand-primary-rgb: ${hexToRgb(colors.brand.primary)};\n`
        // Generate hover color (10% darker)
        const hoverColor = darkenHex(colors.brand.primary, 10)
        css += `  --color-brand-primaryHover: ${hoverColor};\n`
        css += `  --color-brand-primaryHover-rgb: ${hexToRgb(hoverColor)};\n`
      }
      if (colors.brand.secondary) {
        css += `  --color-brand-secondary: ${colors.brand.secondary};\n`
        css += `  --color-brand-secondary-rgb: ${hexToRgb(colors.brand.secondary)};\n`
      }
      if (colors.brand.accent) {
        css += `  --color-brand-accent: ${colors.brand.accent};\n`
        css += `  --color-brand-accent-rgb: ${hexToRgb(colors.brand.accent)};\n`
      }
    }

    // Neutral colors
    if (colors?.neutral) {
      const neutralMap: Record<string, string> = {
        '50': 'background',
        '100': 'muted',
        '200': 'border',
        '900': 'foreground'
      }
      Object.entries(neutralMap).forEach(([key, name]) => {
        if (colors.neutral[key]) {
          css += `  --color-neutral-${name}: ${colors.neutral[key]};\n`
          css += `  --color-neutral-${name}-rgb: ${hexToRgb(colors.neutral[key])};\n`
        }
      })
    }

    // Fonts
    if (typography?.fontHeading) {
      css += `  --font-heading: '${typography.fontHeading}', sans-serif;\n`
    }
    if (typography?.fontBody) {
      css += `  --font-body: '${typography.fontBody}', sans-serif;\n`
    }

    css += '}\n'
    return css
  }, [designVariables])

  // Combine page HTML with global header/footer and inject menus
  const previewHtml = useMemo(() => {
    // First insert global components (header/footer)
    let htmlWithComponents = insertGlobalComponents(debouncedHtml, globalHeader, globalFooter)

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

    // Then replace {{menu:slug}} placeholders with actual menu HTML
    if (menus && menus.length > 0) {
      return injectMenusIntoHtml(htmlWithComponents, menus, {
        containerClass: 'flex items-center gap-6',
        linkClass: 'text-sm transition-colors hover:opacity-80',
      })
    }
    return htmlWithComponents
  }, [debouncedHtml, globalHeader, globalFooter, menus, designTokensCss])

  const getHtmlWithScript = useCallback((html: string): string => {
    if (viewMode !== 'design') return html

    const selectionScript = `
    <style>
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
          badge.innerHTML = '<span class="unicorn-badge-label">DIV</span><button class="unicorn-badge-btn" id="unicorn-btn-up" title="Parent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button><button class="unicorn-badge-btn" id="unicorn-btn-down" title="Child"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button><button class="unicorn-badge-btn unicorn-btn-delete" id="unicorn-btn-delete" title="Löschen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
          badge.style.display = 'none';
          document.body.appendChild(badge);
          var badgeLabel = badge.querySelector('.unicorn-badge-label');
          var btnUp = badge.querySelector('#unicorn-btn-up');
          var btnDown = badge.querySelector('#unicorn-btn-down');
          var btnDelete = badge.querySelector('#unicorn-btn-delete');

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
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectElement, html, updateHtml])

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && viewMode === 'design') {
      selectElement(null)
      iframeRef.current?.contentWindow?.postMessage({ type: 'deselect' }, '*')
    }
  }

  const iframeWidth = BREAKPOINT_WIDTHS[breakpoint]
  const isResponsive = breakpoint !== 'desktop'

  return (
    <div
      onClick={handleContainerClick}
      className="h-full w-full bg-zinc-950 flex items-start justify-center overflow-auto"
    >
      <div
        className={`h-full transition-all duration-300 ${isResponsive ? 'my-4 rounded-lg overflow-hidden shadow-2xl border border-zinc-700' : ''}`}
        style={{
          width: iframeWidth,
          maxWidth: '100%',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={getHtmlWithScript(previewHtml)}
          className="w-full h-full border-0 block bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
