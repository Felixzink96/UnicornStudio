/**
 * Zentrale CSS-Variablen Generator
 * Generiert CSS mit allen Design-Tokens die auf allen Seiten eingebunden werden
 */

import type { DesignVariables } from '@/types/cms'

/**
 * Generiert das CSS für alle Design-Variablen
 * Wird im Editor und beim Export verwendet
 */
export function generateDesignTokensCSS(designVars: DesignVariables | null): string {
  const colors = designVars?.colors
  const typography = designVars?.typography
  const spacing = designVars?.spacing
  const borders = designVars?.borders
  const gradients = designVars?.gradients

  // Default values
  const brandPrimary = colors?.brand?.primary || '#3b82f6'
  const brandPrimaryHover = colors?.brand?.primaryHover || '#2563eb'
  const brandSecondary = colors?.brand?.secondary || '#64748b'
  const brandAccent = colors?.brand?.accent || '#8b5cf6'

  const neutralBackground = colors?.neutral?.background || '#ffffff'
  const neutralForeground = colors?.neutral?.foreground || '#0f172a'
  const neutralMuted = colors?.neutral?.muted || '#f1f5f9'
  const neutralBorder = colors?.neutral?.border || '#e2e8f0'

  const semanticSuccess = colors?.semantic?.success || '#22c55e'
  const semanticWarning = colors?.semantic?.warning || '#f59e0b'
  const semanticError = colors?.semantic?.error || '#ef4444'
  const semanticInfo = colors?.semantic?.info || '#3b82f6'

  const fontHeading = typography?.fontHeading || 'Inter'
  const fontBody = typography?.fontBody || 'Inter'
  const fontMono = typography?.fontMono || 'JetBrains Mono'

  const radiusDefault = borders?.radius?.default || '0.5rem'
  const radiusLg = borders?.radius?.lg || '0.75rem'

  // Convert hex to RGB for opacity support
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '59, 130, 246'
  }

  return `
/* ============================================
   BASE RESET (Tailwind Preflight)
   ============================================ */

*, ::before, ::after {
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;

  /* Tailwind v4 transform variables - must be initialized for modern browsers */
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-rotate: 0deg;
  --tw-skew-x: 0deg;
  --tw-skew-y: 0deg;

  /* Tailwind v4 shadow/ring variables */
  --tw-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-inset-shadow: 0 0 #0000;
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-inset-ring-shadow: 0 0 #0000;
}

button, [role="button"] {
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: inherit;
}

button, input, optgroup, select, textarea {
  font-family: inherit;
  font-size: 100%;
  font-weight: inherit;
  line-height: inherit;
  color: inherit;
  margin: 0;
  padding: 0;
}

img, svg, video, canvas, audio, iframe, embed, object {
  display: block;
  vertical-align: middle;
}

img, video {
  max-width: 100%;
  height: auto;
}

[hidden] {
  display: none;
}

/* ============================================
   DESIGN TOKENS - Auto-generated
   ============================================ */

:root {
  /* Brand Colors */
  --color-brand-primary: ${brandPrimary};
  --color-brand-primary-hover: ${brandPrimaryHover};
  --color-brand-secondary: ${brandSecondary};
  --color-brand-accent: ${brandAccent};

  /* Brand Colors RGB (for opacity) */
  --color-brand-primary-rgb: ${hexToRgb(brandPrimary)};
  --color-brand-secondary-rgb: ${hexToRgb(brandSecondary)};
  --color-brand-accent-rgb: ${hexToRgb(brandAccent)};

  /* Neutral Colors */
  --color-neutral-background: ${neutralBackground};
  --color-neutral-foreground: ${neutralForeground};
  --color-neutral-muted: ${neutralMuted};
  --color-neutral-border: ${neutralBorder};

  /* Neutral Colors RGB (for opacity) */
  --color-neutral-foreground-rgb: ${hexToRgb(neutralForeground)};
  --color-neutral-background-rgb: ${hexToRgb(neutralBackground)};

  /* Semantic Colors */
  --color-semantic-success: ${semanticSuccess};
  --color-semantic-warning: ${semanticWarning};
  --color-semantic-error: ${semanticError};
  --color-semantic-info: ${semanticInfo};

  /* Typography */
  --font-heading: '${fontHeading}', system-ui, sans-serif;
  --font-body: '${fontBody}', system-ui, sans-serif;
  --font-mono: '${fontMono}', monospace;

  /* Border Radius */
  --radius-default: ${radiusDefault};
  --radius-lg: ${radiusLg};
  --radius-sm: 0.25rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* Spacing */
  --spacing-section: ${spacing?.scale?.section || '5rem'};
  --spacing-container: ${spacing?.containerWidths?.xl || '1280px'};

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

${gradients?.primary?.enabled ? `
/* Gradient */
:root {
  --gradient-primary: linear-gradient(
    ${gradients.primary.direction?.replace('to-', 'to ') || 'to right'},
    ${gradients.primary.from || brandPrimary}
    ${gradients.primary.via ? `, ${gradients.primary.via}` : ''}
    , ${gradients.primary.to || brandAccent}
  );
}
` : ''}

/* ============================================
   UTILITY CLASSES (Tailwind-kompatibel)
   ============================================ */

/* Background Colors */
.bg-primary { background-color: var(--color-brand-primary); }
.bg-secondary { background-color: var(--color-brand-secondary); }
.bg-accent { background-color: var(--color-brand-accent); }
.bg-background { background-color: var(--color-neutral-background); }
.bg-muted { background-color: var(--color-neutral-muted); }

/* Text Colors */
.text-primary { color: var(--color-brand-primary); }
.text-secondary { color: var(--color-brand-secondary); }
.text-accent { color: var(--color-brand-accent); }
.text-foreground { color: var(--color-neutral-foreground); }
.text-muted { color: var(--color-neutral-muted); }
.text-white { color: #ffffff; }
.text-black { color: #000000; }
.text-transparent { color: transparent; }
.text-current { color: currentColor; }
.text-inherit { color: inherit; }

/* Background Standard Colors */
.bg-white { background-color: #ffffff; }
.bg-black { background-color: #000000; }
.bg-transparent { background-color: transparent; }
.bg-current { background-color: currentColor; }
.bg-inherit { background-color: inherit; }

/* Border Colors */
.border-primary { border-color: var(--color-brand-primary); }
.border-secondary { border-color: var(--color-brand-secondary); }
.border-accent { border-color: var(--color-brand-accent); }
.border-border { border-color: var(--color-neutral-border); }
.border-white { border-color: #ffffff; }
.border-black { border-color: #000000; }
.border-transparent { border-color: transparent; }
.border-current { border-color: currentColor; }

/* Font Families */
.font-heading { font-family: var(--font-heading); }
.font-body { font-family: var(--font-body); }
.font-mono { font-family: var(--font-mono); }

/* Shadows */
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }
.shadow-xl { box-shadow: var(--shadow-xl); }

/* Border Width */
.border { border-width: 1px; }
.border-0 { border-width: 0px; }
.border-2 { border-width: 2px; }
.border-4 { border-width: 4px; }
.border-t { border-top-width: 1px; }
.border-b { border-bottom-width: 1px; }
.border-l { border-left-width: 1px; }
.border-r { border-right-width: 1px; }
.border-t-0 { border-top-width: 0px; }
.border-b-0 { border-bottom-width: 0px; }
.border-l-0 { border-left-width: 0px; }
.border-r-0 { border-right-width: 0px; }

/* Border Style */
.border-solid { border-style: solid; }
.border-dashed { border-style: dashed; }
.border-dotted { border-style: dotted; }
.border-none { border-style: none; }

/* ============================================
   RESPONSIVE VARIANTS (md: and lg:)
   ============================================ */

@media (min-width: 768px) {
  .md\\:border { border-width: 1px; }
  .md\\:border-0 { border-width: 0px; }
  .md\\:border-t { border-top-width: 1px; }
  .md\\:border-b { border-bottom-width: 1px; }
  .md\\:border-l { border-left-width: 1px; }
  .md\\:border-r { border-right-width: 1px; }
  .md\\:border-t-0 { border-top-width: 0px; }
  .md\\:border-b-0 { border-bottom-width: 0px; }
  .md\\:border-l-0 { border-left-width: 0px; }
  .md\\:border-r-0 { border-right-width: 0px; }
  .md\\:rounded { border-radius: var(--radius-default); }
  .md\\:rounded-lg { border-radius: var(--radius-lg); }
  .md\\:rounded-none { border-radius: 0; }
}

@media (min-width: 1024px) {
  .lg\\:border { border-width: 1px; }
  .lg\\:border-0 { border-width: 0px; }
  .lg\\:border-t { border-top-width: 1px; }
  .lg\\:border-b { border-bottom-width: 1px; }
  .lg\\:border-l { border-left-width: 1px; }
  .lg\\:border-r { border-right-width: 1px; }
  .lg\\:border-t-0 { border-top-width: 0px; }
  .lg\\:border-b-0 { border-bottom-width: 0px; }
  .lg\\:border-l-0 { border-left-width: 0px; }
  .lg\\:border-r-0 { border-right-width: 0px; }
  .lg\\:rounded { border-radius: var(--radius-default); }
  .lg\\:rounded-lg { border-radius: var(--radius-lg); }
  .lg\\:rounded-none { border-radius: 0; }
}

/* Border Radius */
.rounded { border-radius: var(--radius-default); }
.rounded-sm { border-radius: var(--radius-sm); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-xl { border-radius: var(--radius-xl); }
.rounded-2xl { border-radius: var(--radius-2xl); }
.rounded-full { border-radius: var(--radius-full); }
.rounded-none { border-radius: 0; }

/* Transitions */
.transition { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-none { transition-property: none; }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-opacity { transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-shadow { transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-transform { transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.duration-150 { transition-duration: 150ms; }
.duration-200 { transition-duration: 200ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }
.ease-in { transition-timing-function: cubic-bezier(0.4, 0, 1, 1); }
.ease-out { transition-timing-function: cubic-bezier(0, 0, 0.2, 1); }
.ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

/* Opacity */
.opacity-0 { opacity: 0; }
.opacity-25 { opacity: 0.25; }
.opacity-50 { opacity: 0.5; }
.opacity-75 { opacity: 0.75; }
.opacity-80 { opacity: 0.8; }
.opacity-90 { opacity: 0.9; }
.opacity-100 { opacity: 1; }

/* Transform */
.scale-100 { transform: scale(1); }
.scale-105 { transform: scale(1.05); }
.scale-110 { transform: scale(1.1); }
.-translate-y-1 { transform: translateY(-0.25rem); }
.-translate-y-2 { transform: translateY(-0.5rem); }
.translate-y-0 { transform: translateY(0px); }
.translate-y-1 { transform: translateY(0.25rem); }
.translate-y-2 { transform: translateY(0.5rem); }
.rotate-45 { transform: rotate(45deg); }
.rotate-90 { transform: rotate(90deg); }
.rotate-180 { transform: rotate(180deg); }

/* ============================================
   HOVER STATES
   ============================================ */

/* Hover Background */
.hover\\:bg-primary:hover { background-color: var(--color-brand-primary); }
.hover\\:bg-primary-hover:hover { background-color: var(--color-brand-primary-hover); }
.hover\\:bg-secondary:hover { background-color: var(--color-brand-secondary); }
.hover\\:bg-accent:hover { background-color: var(--color-brand-accent); }
.hover\\:bg-muted:hover { background-color: var(--color-neutral-muted); }
.hover\\:bg-white:hover { background-color: #ffffff; }
.hover\\:bg-black:hover { background-color: #000000; }
.hover\\:bg-transparent:hover { background-color: transparent; }

/* Hover Text */
.hover\\:text-primary:hover { color: var(--color-brand-primary); }
.hover\\:text-secondary:hover { color: var(--color-brand-secondary); }
.hover\\:text-accent:hover { color: var(--color-brand-accent); }
.hover\\:text-foreground:hover { color: var(--color-neutral-foreground); }
.hover\\:text-muted:hover { color: var(--color-neutral-muted); }
.hover\\:text-white:hover { color: #ffffff; }
.hover\\:text-black:hover { color: #000000; }

/* Hover Border */
.hover\\:border-primary:hover { border-color: var(--color-brand-primary); }
.hover\\:border-secondary:hover { border-color: var(--color-brand-secondary); }
.hover\\:border-accent:hover { border-color: var(--color-brand-accent); }

/* Hover Shadow */
.hover\\:shadow-sm:hover { box-shadow: var(--shadow-sm); }
.hover\\:shadow-md:hover { box-shadow: var(--shadow-md); }
.hover\\:shadow-lg:hover { box-shadow: var(--shadow-lg); }
.hover\\:shadow-xl:hover { box-shadow: var(--shadow-xl); }

/* Hover Opacity */
.hover\\:opacity-80:hover { opacity: 0.8; }
.hover\\:opacity-90:hover { opacity: 0.9; }
.hover\\:opacity-100:hover { opacity: 1; }

/* Group Hover */
.group:hover .group-hover\\:text-primary { color: var(--color-brand-primary); }
.group:hover .group-hover\\:text-white { color: #ffffff; }
.group:hover .group-hover\\:bg-primary { background-color: var(--color-brand-primary); }
.group:hover .group-hover\\:opacity-100 { opacity: 1; }

/* Hover Transform */
.hover\\:scale-105:hover { transform: scale(1.05); }
.hover\\:scale-110:hover { transform: scale(1.1); }
.hover\\:-translate-y-1:hover { transform: translateY(-0.25rem); }
.hover\\:-translate-y-2:hover { transform: translateY(-0.5rem); }

/* ============================================
   FOCUS STATES
   ============================================ */

/* Focus Ring */
.focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
.focus\\:ring-2:focus { box-shadow: 0 0 0 2px var(--color-brand-primary); }
.focus\\:ring-primary:focus { --tw-ring-color: var(--color-brand-primary); }
.focus-visible\\:outline-none:focus-visible { outline: 2px solid transparent; outline-offset: 2px; }
.focus-visible\\:ring-2:focus-visible { box-shadow: 0 0 0 2px var(--color-brand-primary); }

/* Focus Background */
.focus\\:bg-primary:focus { background-color: var(--color-brand-primary); }
.focus\\:bg-muted:focus { background-color: var(--color-neutral-muted); }

/* Focus Border */
.focus\\:border-primary:focus { border-color: var(--color-brand-primary); }
.focus\\:border-accent:focus { border-color: var(--color-brand-accent); }

/* ============================================
   DISABLED STATES
   ============================================ */

.disabled\\:opacity-50:disabled { opacity: 0.5; }
.disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
.disabled\\:pointer-events-none:disabled { pointer-events: none; }

/* ============================================
   COMMON LAYOUT UTILITIES
   ============================================ */

/* Cursor */
.cursor-pointer { cursor: pointer; }
.cursor-default { cursor: default; }
.cursor-not-allowed { cursor: not-allowed; }

/* Pointer Events */
.pointer-events-none { pointer-events: none; }
.pointer-events-auto { pointer-events: auto; }

/* User Select */
.select-none { user-select: none; }
.select-text { user-select: text; }
.select-all { user-select: all; }

/* Visibility */
.visible { visibility: visible; }
.invisible { visibility: hidden; }

/* Z-Index */
.z-0 { z-index: 0; }
.z-10 { z-index: 10; }
.z-20 { z-index: 20; }
.z-30 { z-index: 30; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }

/* Overflow */
.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-scroll { overflow: scroll; }
.overflow-visible { overflow: visible; }
.overflow-x-auto { overflow-x: auto; }
.overflow-y-auto { overflow-y: auto; }
.overflow-x-hidden { overflow-x: hidden; }
.overflow-y-hidden { overflow-y: hidden; }

/* Position */
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }
.static { position: static; }

/* Inset */
.inset-0 { inset: 0px; }
.top-0 { top: 0px; }
.right-0 { right: 0px; }
.bottom-0 { bottom: 0px; }
.left-0 { left: 0px; }
.top-full { top: 100%; }
.left-full { left: 100%; }
`.trim()
}

/**
 * Generiert Google Fonts Import URL
 */
export function generateGoogleFontsLink(designVars: DesignVariables | null): string {
  const fonts = new Set<string>()

  if (designVars?.typography?.fontHeading) {
    fonts.add(designVars.typography.fontHeading)
  }
  if (designVars?.typography?.fontBody) {
    fonts.add(designVars.typography.fontBody)
  }
  if (designVars?.typography?.fontMono) {
    fonts.add(designVars.typography.fontMono)
  }

  if (fonts.size === 0) return ''

  const fontParams = Array.from(fonts)
    .map(font => `family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800`)
    .join('&')

  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`
}

/**
 * Wendet CSS-Variablen auf ein DOM-Element an (für Editor/iframe)
 */
export function applyDesignTokensToElement(
  element: HTMLElement,
  designVars: DesignVariables | null
): void {
  const colors = designVars?.colors
  const typography = designVars?.typography

  // Brand colors
  element.style.setProperty('--color-brand-primary', colors?.brand?.primary || '#3b82f6')
  element.style.setProperty('--color-brand-primary-hover', colors?.brand?.primaryHover || '#2563eb')
  element.style.setProperty('--color-brand-secondary', colors?.brand?.secondary || '#64748b')
  element.style.setProperty('--color-brand-accent', colors?.brand?.accent || '#8b5cf6')

  // Neutral colors
  element.style.setProperty('--color-neutral-background', colors?.neutral?.background || '#ffffff')
  element.style.setProperty('--color-neutral-foreground', colors?.neutral?.foreground || '#0f172a')
  element.style.setProperty('--color-neutral-muted', colors?.neutral?.muted || '#f1f5f9')
  element.style.setProperty('--color-neutral-border', colors?.neutral?.border || '#e2e8f0')

  // Typography
  element.style.setProperty('--font-heading', `'${typography?.fontHeading || 'Inter'}', system-ui, sans-serif`)
  element.style.setProperty('--font-body', `'${typography?.fontBody || 'Inter'}', system-ui, sans-serif`)
}
