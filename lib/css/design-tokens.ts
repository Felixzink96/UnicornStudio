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

/* Border Colors */
.border-primary { border-color: var(--color-brand-primary); }
.border-secondary { border-color: var(--color-brand-secondary); }
.border-border { border-color: var(--color-neutral-border); }

/* Font Families */
.font-heading { font-family: var(--font-heading); }
.font-body { font-family: var(--font-body); }
.font-mono { font-family: var(--font-mono); }

/* Hover States */
.hover\\:bg-primary-hover:hover { background-color: var(--color-brand-primary-hover); }
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
