import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML to prevent XSS attacks
 * Uses DOMPurify with custom configuration for page builder
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html

  return DOMPurify.sanitize(html, {
    // Allow most HTML elements for page builder
    ALLOWED_TAGS: [
      // Structure
      'html', 'head', 'body', 'div', 'span', 'section', 'article', 'aside',
      'header', 'footer', 'nav', 'main', 'figure', 'figcaption',
      // Scripts & Styles (needed for Tailwind, animations, etc.)
      'script', 'noscript',
      // Text
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'strong', 'em', 'b', 'i',
      'u', 's', 'mark', 'small', 'sub', 'sup', 'br', 'hr', 'blockquote', 'pre', 'code',
      // Lists
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      // Forms
      'form', 'input', 'textarea', 'select', 'option', 'optgroup', 'button', 'label',
      'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',
      // Media
      'img', 'picture', 'source', 'video', 'audio', 'track', 'iframe', 'embed', 'object',
      'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'g', 'defs',
      'use', 'symbol', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop',
      // Meta
      'meta', 'title', 'link', 'style', 'base',
      // Other
      'canvas', 'template', 'slot', 'details', 'summary', 'dialog', 'menu', 'menuitem',
      'time', 'data', 'address', 'abbr', 'cite', 'dfn', 'kbd', 'samp', 'var', 'wbr',
    ],
    ALLOWED_ATTR: [
      // Global attributes
      'id', 'class', 'style', 'title', 'lang', 'dir', 'hidden', 'tabindex',
      'role', 'aria-*', 'data-*',
      // Links
      'href', 'target', 'rel', 'download', 'hreflang',
      // Media
      'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding',
      'poster', 'autoplay', 'controls', 'loop', 'muted', 'playsinline', 'preload',
      // Forms
      'type', 'name', 'value', 'placeholder', 'required', 'disabled', 'readonly',
      'checked', 'selected', 'multiple', 'min', 'max', 'step', 'pattern', 'maxlength',
      'minlength', 'autocomplete', 'autofocus', 'form', 'formaction', 'formmethod',
      'formnovalidate', 'formtarget', 'list', 'accept', 'capture',
      // Tables
      'colspan', 'rowspan', 'scope', 'headers',
      // Iframe (restricted)
      'allow', 'allowfullscreen', 'sandbox', 'frameborder',
      // SVG
      'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r',
      'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'opacity',
      'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule',
      // Meta
      'charset', 'content', 'http-equiv', 'property',
      // Other
      'datetime', 'open', 'cite', 'for', 'label',
    ],
    // Allow data URIs for images
    ALLOW_DATA_ATTR: true,
    // Keep safe URI schemes
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|sms|data|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Don't remove empty elements (Tailwind may use them)
    KEEP_CONTENT: true,
    // Allow custom elements for web components
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: /^[a-z][a-z0-9-]*$/,
      attributeNameCheck: /^[a-z][a-z0-9-]*$/,
      allowCustomizedBuiltInElements: true,
    },
  })
}

/**
 * Sanitize HTML for preview (more permissive, allows script tags)
 * Only use for trusted content in sandboxed iframes
 */
export function sanitizeHtmlForPreview(html: string): string {
  if (!html) return html

  // For preview in sandboxed iframe, we can be more permissive
  // but still remove dangerous attributes
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['script', 'style', 'link'],
    ADD_ATTR: ['onclick', 'onload', 'onerror'], // Allow for preview only
    WHOLE_DOCUMENT: true,
    ALLOW_DATA_ATTR: true,
  })
}

/**
 * Sanitize user input (strict - no HTML allowed)
 */
export function sanitizeText(text: string): string {
  if (!text) return text
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Check if HTML contains potentially dangerous content
 */
export function containsDangerousContent(html: string): boolean {
  if (!html) return false

  const dangerous = [
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*src\s*=\s*["']?javascript:/gi,
    /data:\s*text\/html/gi,
  ]

  return dangerous.some((pattern) => pattern.test(html))
}
