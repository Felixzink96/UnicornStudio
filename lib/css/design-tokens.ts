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

  const css = `
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

/* Body reset - remove browser default margin */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
}

button, [role="button"] {
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: inherit;
}

/* Reset heading and text styles - match Unicorn Studio appearance */
h1, h2, h3, h4, h5, h6 {
  font-size: inherit;
  font-weight: inherit;
  margin: 0;
}

p, blockquote, figure, pre {
  margin: 0;
}

ul, ol {
  margin: 0;
  padding: 0;
  list-style: none;
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
.bg-primary-hover { background-color: var(--color-brand-primary-hover); }
.bg-secondary { background-color: var(--color-brand-secondary); }
.bg-accent { background-color: var(--color-brand-accent); }
.bg-background { background-color: var(--color-neutral-background); }
.bg-muted { background-color: var(--color-neutral-muted); }
.bg-foreground { background-color: var(--color-neutral-foreground); }
.bg-border { background-color: var(--color-neutral-border); }

/* Background with Opacity */
.bg-primary\\/5 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.05); }
.bg-primary\\/10 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.1); }
.bg-primary\\/20 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.2); }
.bg-primary\\/30 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.3); }
.bg-primary\\/40 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.4); }
.bg-primary\\/50 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.5); }
.bg-primary\\/60 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.6); }
.bg-primary\\/70 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.7); }
.bg-primary\\/80 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.8); }
.bg-primary\\/90 { background-color: rgba(${hexToRgb(brandPrimary)}, 0.9); }

.bg-accent\\/10 { background-color: rgba(${hexToRgb(brandAccent)}, 0.1); }
.bg-accent\\/20 { background-color: rgba(${hexToRgb(brandAccent)}, 0.2); }
.bg-accent\\/50 { background-color: rgba(${hexToRgb(brandAccent)}, 0.5); }

.bg-foreground\\/5 { background-color: rgba(${hexToRgb(neutralForeground)}, 0.05); }
.bg-foreground\\/10 { background-color: rgba(${hexToRgb(neutralForeground)}, 0.1); }
.bg-foreground\\/20 { background-color: rgba(${hexToRgb(neutralForeground)}, 0.2); }

/* Gradient Colors (from-*, via-*, to-*) */
.from-primary { --tw-gradient-from: var(--color-brand-primary); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent { --tw-gradient-from: var(--color-brand-accent); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background { --tw-gradient-from: var(--color-neutral-background); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-foreground { --tw-gradient-from: var(--color-neutral-foreground); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }

.via-primary { --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--color-brand-primary), var(--tw-gradient-to); }
.via-accent { --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--color-brand-accent), var(--tw-gradient-to); }

.to-primary { --tw-gradient-to: var(--color-brand-primary); }
.to-accent { --tw-gradient-to: var(--color-brand-accent); }
.to-background { --tw-gradient-to: var(--color-neutral-background); }
.to-transparent { --tw-gradient-to: transparent; }

/* Gradient from-* with Opacity (10-90) */
.from-primary\\/10 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.1); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/20 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.2); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/30 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.3); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/40 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.4); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/50 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.5); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/60 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.6); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/70 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.7); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/80 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.8); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-primary\\/90 { --tw-gradient-from: rgba(${hexToRgb(brandPrimary)}, 0.9); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }

.from-accent\\/10 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.1); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/20 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.2); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/30 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.3); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/40 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.4); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/50 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.5); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/60 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.6); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/70 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.7); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/80 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.8); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-accent\\/90 { --tw-gradient-from: rgba(${hexToRgb(brandAccent)}, 0.9); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }

.from-background\\/10 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.1); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/20 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.2); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/30 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.3); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/40 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.4); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/50 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.5); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/60 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.6); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/70 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.7); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/80 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.8); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.from-background\\/90 { --tw-gradient-from: rgba(${hexToRgb(neutralBackground)}, 0.9); --tw-gradient-to: transparent; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }

/* Gradient via-* with Opacity (10-90) */
.via-primary\\/10 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.1), var(--tw-gradient-to); }
.via-primary\\/20 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.2), var(--tw-gradient-to); }
.via-primary\\/30 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.3), var(--tw-gradient-to); }
.via-primary\\/40 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.4), var(--tw-gradient-to); }
.via-primary\\/50 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.5), var(--tw-gradient-to); }
.via-primary\\/60 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.6), var(--tw-gradient-to); }
.via-primary\\/70 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.7), var(--tw-gradient-to); }
.via-primary\\/80 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.8), var(--tw-gradient-to); }
.via-primary\\/90 { --tw-gradient-stops: var(--tw-gradient-from), rgba(${hexToRgb(brandPrimary)}, 0.9), var(--tw-gradient-to); }

/* Gradient to-* with Opacity (10-90) */
.to-primary\\/10 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.1); }
.to-primary\\/20 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.2); }
.to-primary\\/30 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.3); }
.to-primary\\/40 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.4); }
.to-primary\\/50 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.5); }
.to-primary\\/60 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.6); }
.to-primary\\/70 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.7); }
.to-primary\\/80 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.8); }
.to-primary\\/90 { --tw-gradient-to: rgba(${hexToRgb(brandPrimary)}, 0.9); }

.to-accent\\/10 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.1); }
.to-accent\\/20 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.2); }
.to-accent\\/30 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.3); }
.to-accent\\/40 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.4); }
.to-accent\\/50 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.5); }
.to-accent\\/60 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.6); }
.to-accent\\/70 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.7); }
.to-accent\\/80 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.8); }
.to-accent\\/90 { --tw-gradient-to: rgba(${hexToRgb(brandAccent)}, 0.9); }

.to-background\\/10 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.1); }
.to-background\\/20 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.2); }
.to-background\\/30 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.3); }
.to-background\\/40 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.4); }
.to-background\\/50 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.5); }
.to-background\\/60 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.6); }
.to-background\\/70 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.7); }
.to-background\\/80 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.8); }
.to-background\\/90 { --tw-gradient-to: rgba(${hexToRgb(neutralBackground)}, 0.9); }

/* Text Colors */
.text-primary { color: var(--color-brand-primary); }
.text-secondary { color: var(--color-brand-secondary); }
.text-accent { color: var(--color-brand-accent); }
.text-foreground { color: var(--color-neutral-foreground); }
.text-muted { color: var(--color-neutral-muted); }
.text-background { color: var(--color-neutral-background); }
.text-border { color: var(--color-neutral-border); }
.text-white { color: #ffffff; }
.text-black { color: #000000; }
.text-transparent { color: transparent; }
.text-current { color: currentColor; }
.text-inherit { color: inherit; }

/* Text with Opacity */
.text-primary\\/10 { color: rgba(${hexToRgb(brandPrimary)}, 0.1); }
.text-primary\\/20 { color: rgba(${hexToRgb(brandPrimary)}, 0.2); }
.text-primary\\/30 { color: rgba(${hexToRgb(brandPrimary)}, 0.3); }
.text-primary\\/40 { color: rgba(${hexToRgb(brandPrimary)}, 0.4); }
.text-primary\\/50 { color: rgba(${hexToRgb(brandPrimary)}, 0.5); }
.text-primary\\/60 { color: rgba(${hexToRgb(brandPrimary)}, 0.6); }
.text-primary\\/70 { color: rgba(${hexToRgb(brandPrimary)}, 0.7); }
.text-primary\\/80 { color: rgba(${hexToRgb(brandPrimary)}, 0.8); }
.text-primary\\/90 { color: rgba(${hexToRgb(brandPrimary)}, 0.9); }

.text-accent\\/10 { color: rgba(${hexToRgb(brandAccent)}, 0.1); }
.text-accent\\/20 { color: rgba(${hexToRgb(brandAccent)}, 0.2); }
.text-accent\\/30 { color: rgba(${hexToRgb(brandAccent)}, 0.3); }
.text-accent\\/40 { color: rgba(${hexToRgb(brandAccent)}, 0.4); }
.text-accent\\/50 { color: rgba(${hexToRgb(brandAccent)}, 0.5); }
.text-accent\\/60 { color: rgba(${hexToRgb(brandAccent)}, 0.6); }
.text-accent\\/70 { color: rgba(${hexToRgb(brandAccent)}, 0.7); }
.text-accent\\/80 { color: rgba(${hexToRgb(brandAccent)}, 0.8); }
.text-accent\\/90 { color: rgba(${hexToRgb(brandAccent)}, 0.9); }

.text-foreground\\/10 { color: rgba(${hexToRgb(neutralForeground)}, 0.1); }
.text-foreground\\/20 { color: rgba(${hexToRgb(neutralForeground)}, 0.2); }
.text-foreground\\/30 { color: rgba(${hexToRgb(neutralForeground)}, 0.3); }
.text-foreground\\/40 { color: rgba(${hexToRgb(neutralForeground)}, 0.4); }
.text-foreground\\/50 { color: rgba(${hexToRgb(neutralForeground)}, 0.5); }
.text-foreground\\/60 { color: rgba(${hexToRgb(neutralForeground)}, 0.6); }
.text-foreground\\/70 { color: rgba(${hexToRgb(neutralForeground)}, 0.7); }
.text-foreground\\/80 { color: rgba(${hexToRgb(neutralForeground)}, 0.8); }
.text-foreground\\/90 { color: rgba(${hexToRgb(neutralForeground)}, 0.9); }

.text-muted\\/10 { color: rgba(${hexToRgb(neutralMuted)}, 0.1); }
.text-muted\\/20 { color: rgba(${hexToRgb(neutralMuted)}, 0.2); }
.text-muted\\/30 { color: rgba(${hexToRgb(neutralMuted)}, 0.3); }
.text-muted\\/40 { color: rgba(${hexToRgb(neutralMuted)}, 0.4); }
.text-muted\\/50 { color: rgba(${hexToRgb(neutralMuted)}, 0.5); }
.text-muted\\/60 { color: rgba(${hexToRgb(neutralMuted)}, 0.6); }
.text-muted\\/70 { color: rgba(${hexToRgb(neutralMuted)}, 0.7); }
.text-muted\\/80 { color: rgba(${hexToRgb(neutralMuted)}, 0.8); }
.text-muted\\/90 { color: rgba(${hexToRgb(neutralMuted)}, 0.9); }

/* Background Standard Colors */
.bg-white { background-color: #ffffff; }
.bg-black { background-color: #000000; }
.bg-transparent { background-color: transparent; }
.bg-current { background-color: currentColor; }
.bg-inherit { background-color: inherit; }

/* Border Colors - !important needed to override Tailwind reset's implicit currentColor */
.border-primary { border-color: var(--color-brand-primary) !important; }
.border-secondary { border-color: var(--color-brand-secondary) !important; }
.border-accent { border-color: var(--color-brand-accent) !important; }
.border-border { border-color: var(--color-neutral-border) !important; }
.border-foreground { border-color: var(--color-neutral-foreground) !important; }
.border-muted { border-color: var(--color-neutral-muted) !important; }
.border-white { border-color: #ffffff !important; }
.border-black { border-color: #000000 !important; }
.border-transparent { border-color: transparent !important; }
.border-current { border-color: currentColor !important; }

/* Border with Opacity - !important needed to override Tailwind reset */
.border-primary\\/50 { border-color: rgba(${hexToRgb(brandPrimary)}, 0.5) !important; }
.border-primary\\/30 { border-color: rgba(${hexToRgb(brandPrimary)}, 0.3) !important; }
.border-primary\\/20 { border-color: rgba(${hexToRgb(brandPrimary)}, 0.2) !important; }

.border-accent\\/50 { border-color: rgba(${hexToRgb(brandAccent)}, 0.5) !important; }
.border-accent\\/30 { border-color: rgba(${hexToRgb(brandAccent)}, 0.3) !important; }

.border-border\\/10 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.1) !important; }
.border-border\\/20 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.2) !important; }
.border-border\\/30 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.3) !important; }
.border-border\\/40 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.4) !important; }
.border-border\\/50 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.5) !important; }
.border-border\\/60 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.6) !important; }
.border-border\\/70 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.7) !important; }
.border-border\\/80 { border-color: rgba(${hexToRgb(neutralBorder)}, 0.8) !important; }

.border-foreground\\/20 { border-color: rgba(${hexToRgb(neutralForeground)}, 0.2) !important; }
.border-foreground\\/10 { border-color: rgba(${hexToRgb(neutralForeground)}, 0.1) !important; }

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
.duration-75 { transition-duration: 75ms; }
.duration-100 { transition-duration: 100ms; }
.duration-150 { transition-duration: 150ms; }
.duration-200 { transition-duration: 200ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }
.duration-700 { transition-duration: 700ms; }
.duration-1000 { transition-duration: 1000ms; }
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

/* Transform - REMOVED: Tailwind v4 generates these with individual properties (translate, rotate, scale) */
/* Using combined 'transform' here would conflict with Tailwind's individual properties */

/* ============================================
   HOVER STATES
   ============================================ */

/* Hover Background - Design Tokens come after Tailwind, so no !important needed */
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
.group:hover .group-hover\\:text-accent { color: var(--color-brand-accent); }
.group:hover .group-hover\\:text-foreground { color: var(--color-neutral-foreground); }
.group:hover .group-hover\\:text-white { color: #ffffff; }
.group:hover .group-hover\\:bg-primary { background-color: var(--color-brand-primary); }
.group:hover .group-hover\\:bg-accent { background-color: var(--color-brand-accent); }
.group:hover .group-hover\\:opacity-100 { opacity: 1; }
.group:hover .group-hover\\:opacity-0 { opacity: 0; }
.group:hover .group-hover\\:visible { visibility: visible; }

/* Hover Transform - REMOVED: Tailwind v4 generates these with individual properties */

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
.z-\\[90\\] { z-index: 90; }
.z-\\[100\\] { z-index: 100; }
.z-\\[999\\] { z-index: 999; }
.z-\\[9999\\] { z-index: 9999; }

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
.right-full { right: 100%; }
.bottom-full { bottom: 100%; }
.-top-1 { top: -0.25rem; }
.-top-2 { top: -0.5rem; }
.-top-4 { top: -1rem; }
.-bottom-1 { bottom: -0.25rem; }
.-bottom-2 { bottom: -0.5rem; }
.-left-1 { left: -0.25rem; }
.-left-2 { left: -0.5rem; }
.-right-1 { right: -0.25rem; }
.-right-2 { right: -0.5rem; }
.top-1 { top: 0.25rem; }
.top-2 { top: 0.5rem; }
.top-3 { top: 0.75rem; }
.top-4 { top: 1rem; }
.top-6 { top: 1.5rem; }
.top-8 { top: 2rem; }
.top-10 { top: 2.5rem; }
.top-12 { top: 3rem; }
.top-16 { top: 4rem; }
.bottom-1 { bottom: 0.25rem; }
.bottom-2 { bottom: 0.5rem; }
.bottom-4 { bottom: 1rem; }
.bottom-6 { bottom: 1.5rem; }
.bottom-8 { bottom: 2rem; }
.left-1 { left: 0.25rem; }
.left-2 { left: 0.5rem; }
.left-4 { left: 1rem; }
.left-6 { left: 1.5rem; }
.left-8 { left: 2rem; }
.right-1 { right: 0.25rem; }
.right-2 { right: 0.5rem; }
.right-4 { right: 1rem; }
.right-6 { right: 1.5rem; }
.right-8 { right: 2rem; }
.top-1\\/2 { top: 50%; }
.left-1\\/2 { left: 50%; }
.right-1\\/2 { right: 50%; }
.bottom-1\\/2 { bottom: 50%; }

/* ============================================
   WIDTH & HEIGHT
   ============================================ */

/* Width */
.w-0 { width: 0px; }
.w-px { width: 1px; }
.w-0\\.5 { width: 0.125rem; }
.w-1 { width: 0.25rem; }
.w-1\\.5 { width: 0.375rem; }
.w-2 { width: 0.5rem; }
.w-2\\.5 { width: 0.625rem; }
.w-3 { width: 0.75rem; }
.w-3\\.5 { width: 0.875rem; }
.w-4 { width: 1rem; }
.w-5 { width: 1.25rem; }
.w-6 { width: 1.5rem; }
.w-7 { width: 1.75rem; }
.w-8 { width: 2rem; }
.w-9 { width: 2.25rem; }
.w-10 { width: 2.5rem; }
.w-11 { width: 2.75rem; }
.w-12 { width: 3rem; }
.w-14 { width: 3.5rem; }
.w-16 { width: 4rem; }
.w-20 { width: 5rem; }
.w-24 { width: 6rem; }
.w-28 { width: 7rem; }
.w-32 { width: 8rem; }
.w-36 { width: 9rem; }
.w-40 { width: 10rem; }
.w-44 { width: 11rem; }
.w-48 { width: 12rem; }
.w-52 { width: 13rem; }
.w-56 { width: 14rem; }
.w-60 { width: 15rem; }
.w-64 { width: 16rem; }
.w-72 { width: 18rem; }
.w-80 { width: 20rem; }
.w-96 { width: 24rem; }
.w-auto { width: auto; }
.w-full { width: 100%; }
.w-screen { width: 100vw; }
.w-min { width: min-content; }
.w-max { width: max-content; }
.w-fit { width: fit-content; }
.w-1\\/2 { width: 50%; }
.w-1\\/3 { width: 33.333333%; }
.w-2\\/3 { width: 66.666667%; }
.w-1\\/4 { width: 25%; }
.w-3\\/4 { width: 75%; }
.w-1\\/5 { width: 20%; }
.w-2\\/5 { width: 40%; }
.w-3\\/5 { width: 60%; }
.w-4\\/5 { width: 80%; }
.w-1\\/6 { width: 16.666667%; }
.w-5\\/6 { width: 83.333333%; }

/* Height */
.h-0 { height: 0px; }
.h-px { height: 1px; }
.h-0\\.5 { height: 0.125rem; }
.h-1 { height: 0.25rem; }
.h-1\\.5 { height: 0.375rem; }
.h-2 { height: 0.5rem; }
.h-2\\.5 { height: 0.625rem; }
.h-3 { height: 0.75rem; }
.h-3\\.5 { height: 0.875rem; }
.h-4 { height: 1rem; }
.h-5 { height: 1.25rem; }
.h-6 { height: 1.5rem; }
.h-7 { height: 1.75rem; }
.h-8 { height: 2rem; }
.h-9 { height: 2.25rem; }
.h-10 { height: 2.5rem; }
.h-11 { height: 2.75rem; }
.h-12 { height: 3rem; }
.h-14 { height: 3.5rem; }
.h-16 { height: 4rem; }
.h-20 { height: 5rem; }
.h-24 { height: 6rem; }
.h-28 { height: 7rem; }
.h-32 { height: 8rem; }
.h-36 { height: 9rem; }
.h-40 { height: 10rem; }
.h-44 { height: 11rem; }
.h-48 { height: 12rem; }
.h-52 { height: 13rem; }
.h-56 { height: 14rem; }
.h-60 { height: 15rem; }
.h-64 { height: 16rem; }
.h-72 { height: 18rem; }
.h-80 { height: 20rem; }
.h-96 { height: 24rem; }
.h-auto { height: auto; }
.h-full { height: 100%; }
.h-screen { height: 100vh; }
.h-min { height: min-content; }
.h-max { height: max-content; }
.h-fit { height: fit-content; }
.h-1\\/2 { height: 50%; }
.h-1\\/3 { height: 33.333333%; }
.h-2\\/3 { height: 66.666667%; }
.h-1\\/4 { height: 25%; }
.h-3\\/4 { height: 75%; }
.h-1\\/5 { height: 20%; }
.h-2\\/5 { height: 40%; }
.h-3\\/5 { height: 60%; }
.h-4\\/5 { height: 80%; }
.h-svh { height: 100svh; }
.h-lvh { height: 100lvh; }
.h-dvh { height: 100dvh; }

/* Min/Max Width */
.min-w-0 { min-width: 0px; }
.min-w-full { min-width: 100%; }
.min-w-min { min-width: min-content; }
.min-w-max { min-width: max-content; }
.max-w-none { max-width: none; }
.max-w-xs { max-width: 20rem; }
.max-w-sm { max-width: 24rem; }
.max-w-md { max-width: 28rem; }
.max-w-lg { max-width: 32rem; }
.max-w-xl { max-width: 36rem; }
.max-w-2xl { max-width: 42rem; }
.max-w-3xl { max-width: 48rem; }
.max-w-4xl { max-width: 56rem; }
.max-w-5xl { max-width: 64rem; }
.max-w-6xl { max-width: 72rem; }
.max-w-7xl { max-width: 80rem; }
.max-w-full { max-width: 100%; }
.max-w-min { max-width: min-content; }
.max-w-max { max-width: max-content; }
.max-w-fit { max-width: fit-content; }
.max-w-prose { max-width: 65ch; }
.max-w-screen-sm { max-width: 640px; }
.max-w-screen-md { max-width: 768px; }
.max-w-screen-lg { max-width: 1024px; }
.max-w-screen-xl { max-width: 1280px; }
.max-w-screen-2xl { max-width: 1536px; }
.max-w-\\[1440px\\] { max-width: 1440px; }
.max-w-\\[1200px\\] { max-width: 1200px; }
.max-w-\\[1000px\\] { max-width: 1000px; }
.max-w-\\[800px\\] { max-width: 800px; }
.max-w-\\[600px\\] { max-width: 600px; }

/* Min/Max Height */
.min-h-0 { min-height: 0px; }
.min-h-full { min-height: 100%; }
.min-h-screen { min-height: 100vh; }
.min-h-svh { min-height: 100svh; }
.min-h-lvh { min-height: 100lvh; }
.min-h-dvh { min-height: 100dvh; }
.max-h-none { max-height: none; }
.max-h-full { max-height: 100%; }
.max-h-screen { max-height: 100vh; }
.max-h-0 { max-height: 0px; }
.max-h-96 { max-height: 24rem; }

/* ============================================
   SPACING (Padding & Margin)
   ============================================ */

/* Padding */
.p-0 { padding: 0px; }
.p-px { padding: 1px; }
.p-0\\.5 { padding: 0.125rem; }
.p-1 { padding: 0.25rem; }
.p-1\\.5 { padding: 0.375rem; }
.p-2 { padding: 0.5rem; }
.p-2\\.5 { padding: 0.625rem; }
.p-3 { padding: 0.75rem; }
.p-3\\.5 { padding: 0.875rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }
.p-7 { padding: 1.75rem; }
.p-8 { padding: 2rem; }
.p-9 { padding: 2.25rem; }
.p-10 { padding: 2.5rem; }
.p-11 { padding: 2.75rem; }
.p-12 { padding: 3rem; }
.p-14 { padding: 3.5rem; }
.p-16 { padding: 4rem; }
.p-20 { padding: 5rem; }
.p-24 { padding: 6rem; }
.p-28 { padding: 7rem; }
.p-32 { padding: 8rem; }

.px-0 { padding-left: 0px; padding-right: 0px; }
.px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.px-7 { padding-left: 1.75rem; padding-right: 1.75rem; }
.px-8 { padding-left: 2rem; padding-right: 2rem; }
.px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
.px-12 { padding-left: 3rem; padding-right: 3rem; }
.px-14 { padding-left: 3.5rem; padding-right: 3.5rem; }
.px-16 { padding-left: 4rem; padding-right: 4rem; }
.px-20 { padding-left: 5rem; padding-right: 5rem; }
.px-24 { padding-left: 6rem; padding-right: 6rem; }

.py-0 { padding-top: 0px; padding-bottom: 0px; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-5 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }
.py-14 { padding-top: 3.5rem; padding-bottom: 3.5rem; }
.py-16 { padding-top: 4rem; padding-bottom: 4rem; }
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }
.py-24 { padding-top: 6rem; padding-bottom: 6rem; }
.py-32 { padding-top: 8rem; padding-bottom: 8rem; }

.pt-0 { padding-top: 0px; }
.pt-1 { padding-top: 0.25rem; }
.pt-2 { padding-top: 0.5rem; }
.pt-3 { padding-top: 0.75rem; }
.pt-4 { padding-top: 1rem; }
.pt-5 { padding-top: 1.25rem; }
.pt-6 { padding-top: 1.5rem; }
.pt-8 { padding-top: 2rem; }
.pt-10 { padding-top: 2.5rem; }
.pt-12 { padding-top: 3rem; }
.pt-14 { padding-top: 3.5rem; }
.pt-16 { padding-top: 4rem; }
.pt-20 { padding-top: 5rem; }
.pt-24 { padding-top: 6rem; }
.pt-28 { padding-top: 7rem; }
.pt-32 { padding-top: 8rem; }

.pb-0 { padding-bottom: 0px; }
.pb-1 { padding-bottom: 0.25rem; }
.pb-2 { padding-bottom: 0.5rem; }
.pb-3 { padding-bottom: 0.75rem; }
.pb-4 { padding-bottom: 1rem; }
.pb-5 { padding-bottom: 1.25rem; }
.pb-6 { padding-bottom: 1.5rem; }
.pb-8 { padding-bottom: 2rem; }
.pb-10 { padding-bottom: 2.5rem; }
.pb-12 { padding-bottom: 3rem; }
.pb-14 { padding-bottom: 3.5rem; }
.pb-16 { padding-bottom: 4rem; }
.pb-20 { padding-bottom: 5rem; }
.pb-24 { padding-bottom: 6rem; }
.pb-28 { padding-bottom: 7rem; }
.pb-32 { padding-bottom: 8rem; }

.pl-0 { padding-left: 0px; }
.pl-1 { padding-left: 0.25rem; }
.pl-2 { padding-left: 0.5rem; }
.pl-3 { padding-left: 0.75rem; }
.pl-4 { padding-left: 1rem; }
.pl-5 { padding-left: 1.25rem; }
.pl-6 { padding-left: 1.5rem; }
.pl-8 { padding-left: 2rem; }
.pl-10 { padding-left: 2.5rem; }
.pl-12 { padding-left: 3rem; }
.pl-16 { padding-left: 4rem; }

.pr-0 { padding-right: 0px; }
.pr-1 { padding-right: 0.25rem; }
.pr-2 { padding-right: 0.5rem; }
.pr-3 { padding-right: 0.75rem; }
.pr-4 { padding-right: 1rem; }
.pr-5 { padding-right: 1.25rem; }
.pr-6 { padding-right: 1.5rem; }
.pr-8 { padding-right: 2rem; }
.pr-10 { padding-right: 2.5rem; }
.pr-12 { padding-right: 3rem; }
.pr-16 { padding-right: 4rem; }

/* Margin */
.m-0 { margin: 0px; }
.m-auto { margin: auto; }
.m-px { margin: 1px; }
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-3 { margin: 0.75rem; }
.m-4 { margin: 1rem; }
.m-5 { margin: 1.25rem; }
.m-6 { margin: 1.5rem; }
.m-8 { margin: 2rem; }
.m-10 { margin: 2.5rem; }
.m-12 { margin: 3rem; }
.m-16 { margin: 4rem; }
.-m-1 { margin: -0.25rem; }
.-m-2 { margin: -0.5rem; }
.-m-3 { margin: -0.75rem; }
.-m-4 { margin: -1rem; }

.mx-0 { margin-left: 0px; margin-right: 0px; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mx-1 { margin-left: 0.25rem; margin-right: 0.25rem; }
.mx-2 { margin-left: 0.5rem; margin-right: 0.5rem; }
.mx-3 { margin-left: 0.75rem; margin-right: 0.75rem; }
.mx-4 { margin-left: 1rem; margin-right: 1rem; }
.mx-5 { margin-left: 1.25rem; margin-right: 1.25rem; }
.mx-6 { margin-left: 1.5rem; margin-right: 1.5rem; }
.mx-8 { margin-left: 2rem; margin-right: 2rem; }
.mx-10 { margin-left: 2.5rem; margin-right: 2.5rem; }
.mx-12 { margin-left: 3rem; margin-right: 3rem; }
.-mx-1 { margin-left: -0.25rem; margin-right: -0.25rem; }
.-mx-2 { margin-left: -0.5rem; margin-right: -0.5rem; }
.-mx-4 { margin-left: -1rem; margin-right: -1rem; }

.my-0 { margin-top: 0px; margin-bottom: 0px; }
.my-auto { margin-top: auto; margin-bottom: auto; }
.my-1 { margin-top: 0.25rem; margin-bottom: 0.25rem; }
.my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
.my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
.my-5 { margin-top: 1.25rem; margin-bottom: 1.25rem; }
.my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
.my-8 { margin-top: 2rem; margin-bottom: 2rem; }
.my-10 { margin-top: 2.5rem; margin-bottom: 2.5rem; }
.my-12 { margin-top: 3rem; margin-bottom: 3rem; }
.my-16 { margin-top: 4rem; margin-bottom: 4rem; }
.-my-1 { margin-top: -0.25rem; margin-bottom: -0.25rem; }
.-my-2 { margin-top: -0.5rem; margin-bottom: -0.5rem; }

.mt-0 { margin-top: 0px; }
.mt-auto { margin-top: auto; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-5 { margin-top: 1.25rem; }
.mt-6 { margin-top: 1.5rem; }
.mt-8 { margin-top: 2rem; }
.mt-10 { margin-top: 2.5rem; }
.mt-12 { margin-top: 3rem; }
.mt-14 { margin-top: 3.5rem; }
.mt-16 { margin-top: 4rem; }
.mt-20 { margin-top: 5rem; }
.mt-24 { margin-top: 6rem; }
.mt-28 { margin-top: 7rem; }
.mt-32 { margin-top: 8rem; }
.-mt-1 { margin-top: -0.25rem; }
.-mt-2 { margin-top: -0.5rem; }
.-mt-3 { margin-top: -0.75rem; }
.-mt-4 { margin-top: -1rem; }
.-mt-6 { margin-top: -1.5rem; }
.-mt-8 { margin-top: -2rem; }

.mb-0 { margin-bottom: 0px; }
.mb-auto { margin-bottom: auto; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-10 { margin-bottom: 2.5rem; }
.mb-12 { margin-bottom: 3rem; }
.mb-14 { margin-bottom: 3.5rem; }
.mb-16 { margin-bottom: 4rem; }
.mb-20 { margin-bottom: 5rem; }
.mb-24 { margin-bottom: 6rem; }
.-mb-1 { margin-bottom: -0.25rem; }
.-mb-2 { margin-bottom: -0.5rem; }
.-mb-4 { margin-bottom: -1rem; }

.ml-0 { margin-left: 0px; }
.ml-auto { margin-left: auto; }
.ml-1 { margin-left: 0.25rem; }
.ml-2 { margin-left: 0.5rem; }
.ml-3 { margin-left: 0.75rem; }
.ml-4 { margin-left: 1rem; }
.ml-5 { margin-left: 1.25rem; }
.ml-6 { margin-left: 1.5rem; }
.ml-8 { margin-left: 2rem; }
.ml-10 { margin-left: 2.5rem; }
.ml-12 { margin-left: 3rem; }
.-ml-1 { margin-left: -0.25rem; }
.-ml-2 { margin-left: -0.5rem; }
.-ml-4 { margin-left: -1rem; }

.mr-0 { margin-right: 0px; }
.mr-auto { margin-right: auto; }
.mr-1 { margin-right: 0.25rem; }
.mr-2 { margin-right: 0.5rem; }
.mr-3 { margin-right: 0.75rem; }
.mr-4 { margin-right: 1rem; }
.mr-5 { margin-right: 1.25rem; }
.mr-6 { margin-right: 1.5rem; }
.mr-8 { margin-right: 2rem; }
.-mr-1 { margin-right: -0.25rem; }
.-mr-2 { margin-right: -0.5rem; }

/* Gap */
.gap-0 { gap: 0px; }
.gap-px { gap: 1px; }
.gap-0\\.5 { gap: 0.125rem; }
.gap-1 { gap: 0.25rem; }
.gap-1\\.5 { gap: 0.375rem; }
.gap-2 { gap: 0.5rem; }
.gap-2\\.5 { gap: 0.625rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-5 { gap: 1.25rem; }
.gap-6 { gap: 1.5rem; }
.gap-7 { gap: 1.75rem; }
.gap-8 { gap: 2rem; }
.gap-9 { gap: 2.25rem; }
.gap-10 { gap: 2.5rem; }
.gap-11 { gap: 2.75rem; }
.gap-12 { gap: 3rem; }
.gap-14 { gap: 3.5rem; }
.gap-16 { gap: 4rem; }
.gap-20 { gap: 5rem; }
.gap-24 { gap: 6rem; }
.gap-28 { gap: 7rem; }
.gap-32 { gap: 8rem; }

.gap-x-0 { column-gap: 0px; }
.gap-x-1 { column-gap: 0.25rem; }
.gap-x-2 { column-gap: 0.5rem; }
.gap-x-3 { column-gap: 0.75rem; }
.gap-x-4 { column-gap: 1rem; }
.gap-x-5 { column-gap: 1.25rem; }
.gap-x-6 { column-gap: 1.5rem; }
.gap-x-8 { column-gap: 2rem; }
.gap-x-10 { column-gap: 2.5rem; }
.gap-x-12 { column-gap: 3rem; }
.gap-x-16 { column-gap: 4rem; }

.gap-y-0 { row-gap: 0px; }
.gap-y-1 { row-gap: 0.25rem; }
.gap-y-2 { row-gap: 0.5rem; }
.gap-y-3 { row-gap: 0.75rem; }
.gap-y-4 { row-gap: 1rem; }
.gap-y-5 { row-gap: 1.25rem; }
.gap-y-6 { row-gap: 1.5rem; }
.gap-y-8 { row-gap: 2rem; }
.gap-y-10 { row-gap: 2.5rem; }
.gap-y-12 { row-gap: 3rem; }
.gap-y-16 { row-gap: 4rem; }

/* Space (for direct children) */
.space-x-0 > :not([hidden]) ~ :not([hidden]) { margin-left: 0px; }
.space-x-1 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.25rem; }
.space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.5rem; }
.space-x-3 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.75rem; }
.space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
.space-x-5 > :not([hidden]) ~ :not([hidden]) { margin-left: 1.25rem; }
.space-x-6 > :not([hidden]) ~ :not([hidden]) { margin-left: 1.5rem; }
.space-x-8 > :not([hidden]) ~ :not([hidden]) { margin-left: 2rem; }
.space-x-10 > :not([hidden]) ~ :not([hidden]) { margin-left: 2.5rem; }
.space-x-12 > :not([hidden]) ~ :not([hidden]) { margin-left: 3rem; }
.-space-x-1 > :not([hidden]) ~ :not([hidden]) { margin-left: -0.25rem; }
.-space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-left: -0.5rem; }

.space-y-0 > :not([hidden]) ~ :not([hidden]) { margin-top: 0px; }
.space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
.space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
.space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
.space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
.space-y-5 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.25rem; }
.space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
.space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 2rem; }
.space-y-10 > :not([hidden]) ~ :not([hidden]) { margin-top: 2.5rem; }
.space-y-12 > :not([hidden]) ~ :not([hidden]) { margin-top: 3rem; }
.-space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: -0.25rem; }
.-space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: -0.5rem; }

/* ============================================
   FLEXBOX
   ============================================ */

.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-row { flex-direction: row; }
.flex-row-reverse { flex-direction: row-reverse; }
.flex-col { flex-direction: column; }
.flex-col-reverse { flex-direction: column-reverse; }
.flex-wrap { flex-wrap: wrap; }
.flex-wrap-reverse { flex-wrap: wrap-reverse; }
.flex-nowrap { flex-wrap: nowrap; }
.flex-1 { flex: 1 1 0%; }
.flex-auto { flex: 1 1 auto; }
.flex-initial { flex: 0 1 auto; }
.flex-none { flex: none; }
.flex-grow { flex-grow: 1; }
.flex-grow-0 { flex-grow: 0; }
.flex-shrink { flex-shrink: 1; }
.flex-shrink-0 { flex-shrink: 0; }
.grow { flex-grow: 1; }
.grow-0 { flex-grow: 0; }
.shrink { flex-shrink: 1; }
.shrink-0 { flex-shrink: 0; }

.justify-start { justify-content: flex-start; }
.justify-end { justify-content: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.justify-evenly { justify-content: space-evenly; }

.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.items-center { align-items: center; }
.items-baseline { align-items: baseline; }
.items-stretch { align-items: stretch; }

.self-auto { align-self: auto; }
.self-start { align-self: flex-start; }
.self-end { align-self: flex-end; }
.self-center { align-self: center; }
.self-stretch { align-self: stretch; }
.self-baseline { align-self: baseline; }

.content-start { align-content: flex-start; }
.content-end { align-content: flex-end; }
.content-center { align-content: center; }
.content-between { align-content: space-between; }
.content-around { align-content: space-around; }
.content-evenly { align-content: space-evenly; }

.order-1 { order: 1; }
.order-2 { order: 2; }
.order-3 { order: 3; }
.order-first { order: -9999; }
.order-last { order: 9999; }
.order-none { order: 0; }

/* ============================================
   GRID
   ============================================ */

.grid { display: grid; }
.inline-grid { display: inline-grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
.grid-cols-8 { grid-template-columns: repeat(8, minmax(0, 1fr)); }
.grid-cols-9 { grid-template-columns: repeat(9, minmax(0, 1fr)); }
.grid-cols-10 { grid-template-columns: repeat(10, minmax(0, 1fr)); }
.grid-cols-11 { grid-template-columns: repeat(11, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
.grid-cols-none { grid-template-columns: none; }
.grid-cols-subgrid { grid-template-columns: subgrid; }

.grid-rows-1 { grid-template-rows: repeat(1, minmax(0, 1fr)); }
.grid-rows-2 { grid-template-rows: repeat(2, minmax(0, 1fr)); }
.grid-rows-3 { grid-template-rows: repeat(3, minmax(0, 1fr)); }
.grid-rows-4 { grid-template-rows: repeat(4, minmax(0, 1fr)); }
.grid-rows-5 { grid-template-rows: repeat(5, minmax(0, 1fr)); }
.grid-rows-6 { grid-template-rows: repeat(6, minmax(0, 1fr)); }
.grid-rows-none { grid-template-rows: none; }

.col-auto { grid-column: auto; }
.col-span-1 { grid-column: span 1 / span 1; }
.col-span-2 { grid-column: span 2 / span 2; }
.col-span-3 { grid-column: span 3 / span 3; }
.col-span-4 { grid-column: span 4 / span 4; }
.col-span-5 { grid-column: span 5 / span 5; }
.col-span-6 { grid-column: span 6 / span 6; }
.col-span-7 { grid-column: span 7 / span 7; }
.col-span-8 { grid-column: span 8 / span 8; }
.col-span-9 { grid-column: span 9 / span 9; }
.col-span-10 { grid-column: span 10 / span 10; }
.col-span-11 { grid-column: span 11 / span 11; }
.col-span-12 { grid-column: span 12 / span 12; }
.col-span-full { grid-column: 1 / -1; }
.col-start-1 { grid-column-start: 1; }
.col-start-2 { grid-column-start: 2; }
.col-start-3 { grid-column-start: 3; }
.col-start-4 { grid-column-start: 4; }
.col-start-5 { grid-column-start: 5; }
.col-start-6 { grid-column-start: 6; }
.col-start-7 { grid-column-start: 7; }
.col-start-auto { grid-column-start: auto; }
.col-end-1 { grid-column-end: 1; }
.col-end-2 { grid-column-end: 2; }
.col-end-3 { grid-column-end: 3; }
.col-end-4 { grid-column-end: 4; }
.col-end-auto { grid-column-end: auto; }

.row-auto { grid-row: auto; }
.row-span-1 { grid-row: span 1 / span 1; }
.row-span-2 { grid-row: span 2 / span 2; }
.row-span-3 { grid-row: span 3 / span 3; }
.row-span-4 { grid-row: span 4 / span 4; }
.row-span-5 { grid-row: span 5 / span 5; }
.row-span-6 { grid-row: span 6 / span 6; }
.row-span-full { grid-row: 1 / -1; }
.row-start-1 { grid-row-start: 1; }
.row-start-2 { grid-row-start: 2; }
.row-start-3 { grid-row-start: 3; }
.row-start-auto { grid-row-start: auto; }
.row-end-1 { grid-row-end: 1; }
.row-end-2 { grid-row-end: 2; }
.row-end-3 { grid-row-end: 3; }
.row-end-auto { grid-row-end: auto; }

.auto-cols-auto { grid-auto-columns: auto; }
.auto-cols-min { grid-auto-columns: min-content; }
.auto-cols-max { grid-auto-columns: max-content; }
.auto-cols-fr { grid-auto-columns: minmax(0, 1fr); }
.auto-rows-auto { grid-auto-rows: auto; }
.auto-rows-min { grid-auto-rows: min-content; }
.auto-rows-max { grid-auto-rows: max-content; }
.auto-rows-fr { grid-auto-rows: minmax(0, 1fr); }

.grid-flow-row { grid-auto-flow: row; }
.grid-flow-col { grid-auto-flow: column; }
.grid-flow-row-dense { grid-auto-flow: row dense; }
.grid-flow-col-dense { grid-auto-flow: column dense; }

.place-content-center { place-content: center; }
.place-content-start { place-content: start; }
.place-content-end { place-content: end; }
.place-content-between { place-content: space-between; }
.place-items-center { place-items: center; }
.place-items-start { place-items: start; }
.place-items-end { place-items: end; }
.place-self-auto { place-self: auto; }
.place-self-center { place-self: center; }
.place-self-start { place-self: start; }
.place-self-end { place-self: end; }

/* ============================================
   TYPOGRAPHY
   ============================================ */

/* Font Size */
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-5xl { font-size: 3rem; line-height: 1; }
.text-6xl { font-size: 3.75rem; line-height: 1; }
.text-7xl { font-size: 4.5rem; line-height: 1; }
.text-8xl { font-size: 6rem; line-height: 1; }
.text-9xl { font-size: 8rem; line-height: 1; }

/* Arbitrary Font Sizes */
.text-\\[10px\\] { font-size: 10px; }
.text-\\[11px\\] { font-size: 11px; }
.text-\\[12px\\] { font-size: 12px; }
.text-\\[13px\\] { font-size: 13px; }
.text-\\[14px\\] { font-size: 14px; }
.text-\\[15px\\] { font-size: 15px; }
.text-\\[16px\\] { font-size: 16px; }
.text-\\[18px\\] { font-size: 18px; }
.text-\\[20px\\] { font-size: 20px; }
.text-\\[24px\\] { font-size: 24px; }
.text-\\[28px\\] { font-size: 28px; }
.text-\\[32px\\] { font-size: 32px; }
.text-\\[36px\\] { font-size: 36px; }
.text-\\[40px\\] { font-size: 40px; }
.text-\\[48px\\] { font-size: 48px; }
.text-\\[56px\\] { font-size: 56px; }
.text-\\[64px\\] { font-size: 64px; }
.text-\\[72px\\] { font-size: 72px; }

/* Font Weight */
.font-thin { font-weight: 100; }
.font-extralight { font-weight: 200; }
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.font-black { font-weight: 900; }

/* Line Height */
.leading-none { line-height: 1; }
.leading-tight { line-height: 1.25; }
.leading-snug { line-height: 1.375; }
.leading-normal { line-height: 1.5; }
.leading-relaxed { line-height: 1.625; }
.leading-loose { line-height: 2; }
.leading-3 { line-height: .75rem; }
.leading-4 { line-height: 1rem; }
.leading-5 { line-height: 1.25rem; }
.leading-6 { line-height: 1.5rem; }
.leading-7 { line-height: 1.75rem; }
.leading-8 { line-height: 2rem; }
.leading-9 { line-height: 2.25rem; }
.leading-10 { line-height: 2.5rem; }

/* Letter Spacing */
.tracking-tighter { letter-spacing: -0.05em; }
.tracking-tight { letter-spacing: -0.025em; }
.tracking-normal { letter-spacing: 0em; }
.tracking-wide { letter-spacing: 0.025em; }
.tracking-wider { letter-spacing: 0.05em; }
.tracking-widest { letter-spacing: 0.1em; }
.tracking-\\[0\\.1em\\] { letter-spacing: 0.1em; }
.tracking-\\[0\\.15em\\] { letter-spacing: 0.15em; }
.tracking-\\[0\\.2em\\] { letter-spacing: 0.2em; }
.tracking-\\[0\\.25em\\] { letter-spacing: 0.25em; }
.tracking-\\[0\\.3em\\] { letter-spacing: 0.3em; }
.tracking-\\[0\\.4em\\] { letter-spacing: 0.4em; }
.tracking-\\[0\\.5em\\] { letter-spacing: 0.5em; }
.tracking-\\[1px\\] { letter-spacing: 1px; }
.tracking-\\[2px\\] { letter-spacing: 2px; }
.tracking-\\[3px\\] { letter-spacing: 3px; }

/* Text Align */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }
.text-start { text-align: start; }
.text-end { text-align: end; }

/* Text Transform */
.uppercase { text-transform: uppercase; }
.lowercase { text-transform: lowercase; }
.capitalize { text-transform: capitalize; }
.normal-case { text-transform: none; }

/* Text Decoration */
.underline { text-decoration-line: underline; }
.overline { text-decoration-line: overline; }
.line-through { text-decoration-line: line-through; }
.no-underline { text-decoration-line: none; }
.decoration-solid { text-decoration-style: solid; }
.decoration-double { text-decoration-style: double; }
.decoration-dotted { text-decoration-style: dotted; }
.decoration-dashed { text-decoration-style: dashed; }
.decoration-wavy { text-decoration-style: wavy; }

/* Text Overflow */
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-ellipsis { text-overflow: ellipsis; }
.text-clip { text-overflow: clip; }

/* Word/Line Break */
.break-normal { overflow-wrap: normal; word-break: normal; }
.break-words { overflow-wrap: break-word; }
.break-all { word-break: break-all; }
.break-keep { word-break: keep-all; }

/* Whitespace */
.whitespace-normal { white-space: normal; }
.whitespace-nowrap { white-space: nowrap; }
.whitespace-pre { white-space: pre; }
.whitespace-pre-line { white-space: pre-line; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.whitespace-break-spaces { white-space: break-spaces; }

/* Vertical Align */
.align-baseline { vertical-align: baseline; }
.align-top { vertical-align: top; }
.align-middle { vertical-align: middle; }
.align-bottom { vertical-align: bottom; }
.align-text-top { vertical-align: text-top; }
.align-text-bottom { vertical-align: text-bottom; }
.align-sub { vertical-align: sub; }
.align-super { vertical-align: super; }

/* Font Style */
.italic { font-style: italic; }
.not-italic { font-style: normal; }

/* List Style */
.list-none { list-style-type: none; }
.list-disc { list-style-type: disc; }
.list-decimal { list-style-type: decimal; }
.list-inside { list-style-position: inside; }
.list-outside { list-style-position: outside; }

/* ============================================
   DISPLAY
   ============================================ */

.block { display: block; }
.inline-block { display: inline-block; }
.inline { display: inline; }
.hidden { display: none; }
.contents { display: contents; }
.flow-root { display: flow-root; }
.table { display: table; }
.table-row { display: table-row; }
.table-cell { display: table-cell; }

/* ============================================
   ASPECT RATIO
   ============================================ */

.aspect-auto { aspect-ratio: auto; }
.aspect-square { aspect-ratio: 1 / 1; }
.aspect-video { aspect-ratio: 16 / 9; }
.aspect-\\[4\\/3\\] { aspect-ratio: 4 / 3; }
.aspect-\\[3\\/2\\] { aspect-ratio: 3 / 2; }
.aspect-\\[21\\/9\\] { aspect-ratio: 21 / 9; }

/* ============================================
   OBJECT FIT & POSITION
   ============================================ */

.object-contain { object-fit: contain; }
.object-cover { object-fit: cover; }
.object-fill { object-fit: fill; }
.object-none { object-fit: none; }
.object-scale-down { object-fit: scale-down; }
.object-center { object-position: center; }
.object-top { object-position: top; }
.object-bottom { object-position: bottom; }
.object-left { object-position: left; }
.object-right { object-position: right; }

/* ============================================
   TRANSFORMS
   ============================================ */

.scale-0 { transform: scale(0); }
.scale-50 { transform: scale(.5); }
.scale-75 { transform: scale(.75); }
.scale-90 { transform: scale(.9); }
.scale-95 { transform: scale(.95); }
.scale-100 { transform: scale(1); }
.scale-105 { transform: scale(1.05); }
.scale-110 { transform: scale(1.1); }
.scale-125 { transform: scale(1.25); }
.scale-150 { transform: scale(1.5); }

.rotate-0 { transform: rotate(0deg); }
.rotate-1 { transform: rotate(1deg); }
.rotate-2 { transform: rotate(2deg); }
.rotate-3 { transform: rotate(3deg); }
.rotate-6 { transform: rotate(6deg); }
.rotate-12 { transform: rotate(12deg); }
.rotate-45 { transform: rotate(45deg); }
.rotate-90 { transform: rotate(90deg); }
.rotate-180 { transform: rotate(180deg); }
.-rotate-1 { transform: rotate(-1deg); }
.-rotate-2 { transform: rotate(-2deg); }
.-rotate-3 { transform: rotate(-3deg); }
.-rotate-6 { transform: rotate(-6deg); }
.-rotate-12 { transform: rotate(-12deg); }
.-rotate-45 { transform: rotate(-45deg); }
.-rotate-90 { transform: rotate(-90deg); }
.-rotate-180 { transform: rotate(-180deg); }

.translate-x-0 { transform: translateX(0px); }
.translate-x-1 { transform: translateX(0.25rem); }
.translate-x-2 { transform: translateX(0.5rem); }
.translate-x-4 { transform: translateX(1rem); }
.translate-x-full { transform: translateX(100%); }
.-translate-x-1 { transform: translateX(-0.25rem); }
.-translate-x-2 { transform: translateX(-0.5rem); }
.-translate-x-4 { transform: translateX(-1rem); }
.-translate-x-full { transform: translateX(-100%); }
.translate-x-1\\/2 { transform: translateX(50%); }
.-translate-x-1\\/2 { transform: translateX(-50%); }

.translate-y-0 { transform: translateY(0px); }
.translate-y-1 { transform: translateY(0.25rem); }
.translate-y-2 { transform: translateY(0.5rem); }
.translate-y-4 { transform: translateY(1rem); }
.translate-y-full { transform: translateY(100%); }
.-translate-y-1 { transform: translateY(-0.25rem); }
.-translate-y-2 { transform: translateY(-0.5rem); }
.-translate-y-4 { transform: translateY(-1rem); }
.-translate-y-full { transform: translateY(-100%); }
.translate-y-1\\/2 { transform: translateY(50%); }
.-translate-y-1\\/2 { transform: translateY(-50%); }

.skew-x-0 { transform: skewX(0deg); }
.skew-x-1 { transform: skewX(1deg); }
.skew-x-2 { transform: skewX(2deg); }
.skew-x-3 { transform: skewX(3deg); }
.skew-x-6 { transform: skewX(6deg); }
.skew-x-12 { transform: skewX(12deg); }
.-skew-x-1 { transform: skewX(-1deg); }
.-skew-x-2 { transform: skewX(-2deg); }
.-skew-x-3 { transform: skewX(-3deg); }
.-skew-x-6 { transform: skewX(-6deg); }
.-skew-x-12 { transform: skewX(-12deg); }

.skew-y-0 { transform: skewY(0deg); }
.skew-y-1 { transform: skewY(1deg); }
.skew-y-2 { transform: skewY(2deg); }
.skew-y-3 { transform: skewY(3deg); }
.skew-y-6 { transform: skewY(6deg); }
.skew-y-12 { transform: skewY(12deg); }
.-skew-y-1 { transform: skewY(-1deg); }
.-skew-y-2 { transform: skewY(-2deg); }
.-skew-y-3 { transform: skewY(-3deg); }
.-skew-y-6 { transform: skewY(-6deg); }
.-skew-y-12 { transform: skewY(-12deg); }

.origin-center { transform-origin: center; }
.origin-top { transform-origin: top; }
.origin-top-right { transform-origin: top right; }
.origin-right { transform-origin: right; }
.origin-bottom-right { transform-origin: bottom right; }
.origin-bottom { transform-origin: bottom; }
.origin-bottom-left { transform-origin: bottom left; }
.origin-left { transform-origin: left; }
.origin-top-left { transform-origin: top left; }

/* ============================================
   FILTERS
   ============================================ */

.blur-none { filter: blur(0); }
.blur-sm { filter: blur(4px); }
.blur { filter: blur(8px); }
.blur-md { filter: blur(12px); }
.blur-lg { filter: blur(16px); }
.blur-xl { filter: blur(24px); }
.blur-2xl { filter: blur(40px); }
.blur-3xl { filter: blur(64px); }

.brightness-0 { filter: brightness(0); }
.brightness-50 { filter: brightness(.5); }
.brightness-75 { filter: brightness(.75); }
.brightness-90 { filter: brightness(.9); }
.brightness-95 { filter: brightness(.95); }
.brightness-100 { filter: brightness(1); }
.brightness-105 { filter: brightness(1.05); }
.brightness-110 { filter: brightness(1.1); }
.brightness-125 { filter: brightness(1.25); }
.brightness-150 { filter: brightness(1.5); }
.brightness-200 { filter: brightness(2); }

.contrast-0 { filter: contrast(0); }
.contrast-50 { filter: contrast(.5); }
.contrast-75 { filter: contrast(.75); }
.contrast-100 { filter: contrast(1); }
.contrast-125 { filter: contrast(1.25); }
.contrast-150 { filter: contrast(1.5); }
.contrast-200 { filter: contrast(2); }

.grayscale-0 { filter: grayscale(0); }
.grayscale { filter: grayscale(100%); }

.invert-0 { filter: invert(0); }
.invert { filter: invert(100%); }

.saturate-0 { filter: saturate(0); }
.saturate-50 { filter: saturate(.5); }
.saturate-100 { filter: saturate(1); }
.saturate-150 { filter: saturate(1.5); }
.saturate-200 { filter: saturate(2); }

.sepia-0 { filter: sepia(0); }
.sepia { filter: sepia(100%); }

/* Backdrop Filters */
.backdrop-blur-none { backdrop-filter: blur(0); }
.backdrop-blur-sm { backdrop-filter: blur(4px); }
.backdrop-blur { backdrop-filter: blur(8px); }
.backdrop-blur-md { backdrop-filter: blur(12px); }
.backdrop-blur-lg { backdrop-filter: blur(16px); }
.backdrop-blur-xl { backdrop-filter: blur(24px); }
.backdrop-blur-2xl { backdrop-filter: blur(40px); }
.backdrop-blur-3xl { backdrop-filter: blur(64px); }

/* ============================================
   ANIMATIONS
   ============================================ */

.animate-none { animation: none; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-bounce { animation: bounce 1s infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
@keyframes pulse {
  50% { opacity: .5; }
}
@keyframes bounce {
  0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
}

/* ============================================
   CUSTOM CLASSES
   ============================================ */

/* Scrolled state (for header) */
.scrolled {
  background-color: var(--color-neutral-background);
  box-shadow: var(--shadow-md);
}

/* Custom transition for architect style */
.transition-architect {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Line clamp */
.line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.line-clamp-3 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.line-clamp-4 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; }
.line-clamp-5 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }
.line-clamp-6 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; }
.line-clamp-none { -webkit-line-clamp: unset; }

/* Scroll behavior */
.scroll-smooth { scroll-behavior: smooth; }
.scroll-auto { scroll-behavior: auto; }

/* Touch action */
.touch-auto { touch-action: auto; }
.touch-none { touch-action: none; }
.touch-pan-x { touch-action: pan-x; }
.touch-pan-y { touch-action: pan-y; }
.touch-manipulation { touch-action: manipulation; }

/* Resize */
.resize-none { resize: none; }
.resize { resize: both; }
.resize-x { resize: horizontal; }
.resize-y { resize: vertical; }

/* Appearance */
.appearance-none { appearance: none; }
.appearance-auto { appearance: auto; }

/* ============================================
   RESPONSIVE VARIANTS
   ============================================ */

/* SM: (min-width: 640px) */
@media (min-width: 640px) {
  .sm\\:block { display: block; }
  .sm\\:inline-block { display: inline-block; }
  .sm\\:inline { display: inline; }
  .sm\\:flex { display: flex; }
  .sm\\:inline-flex { display: inline-flex; }
  .sm\\:grid { display: grid; }
  .sm\\:hidden { display: none; }

  .sm\\:flex-row { flex-direction: row; }
  .sm\\:flex-col { flex-direction: column; }

  .sm\\:grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .sm\\:gap-4 { gap: 1rem; }
  .sm\\:gap-6 { gap: 1.5rem; }
  .sm\\:gap-8 { gap: 2rem; }

  .sm\\:px-4 { padding-left: 1rem; padding-right: 1rem; }
  .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .sm\\:px-8 { padding-left: 2rem; padding-right: 2rem; }

  .sm\\:py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .sm\\:py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .sm\\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }

  .sm\\:text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .sm\\:text-base { font-size: 1rem; line-height: 1.5rem; }
  .sm\\:text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .sm\\:text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .sm\\:text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .sm\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .sm\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
}

/* MD: (min-width: 768px) */
@media (min-width: 768px) {
  .md\\:block { display: block; }
  .md\\:inline-block { display: inline-block; }
  .md\\:inline { display: inline; }
  .md\\:flex { display: flex; }
  .md\\:inline-flex { display: inline-flex; }
  .md\\:grid { display: grid; }
  .md\\:hidden { display: none; }

  .md\\:flex-row { flex-direction: row; }
  .md\\:flex-col { flex-direction: column; }
  .md\\:flex-row-reverse { flex-direction: row-reverse; }
  .md\\:flex-col-reverse { flex-direction: column-reverse; }

  .md\\:grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .md\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .md\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .md\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

  .md\\:col-span-1 { grid-column: span 1 / span 1; }
  .md\\:col-span-2 { grid-column: span 2 / span 2; }
  .md\\:col-span-3 { grid-column: span 3 / span 3; }
  .md\\:col-span-4 { grid-column: span 4 / span 4; }
  .md\\:col-span-5 { grid-column: span 5 / span 5; }
  .md\\:col-span-6 { grid-column: span 6 / span 6; }
  .md\\:col-span-7 { grid-column: span 7 / span 7; }
  .md\\:col-span-8 { grid-column: span 8 / span 8; }
  .md\\:col-span-12 { grid-column: span 12 / span 12; }

  .md\\:gap-4 { gap: 1rem; }
  .md\\:gap-6 { gap: 1.5rem; }
  .md\\:gap-8 { gap: 2rem; }
  .md\\:gap-10 { gap: 2.5rem; }
  .md\\:gap-12 { gap: 3rem; }
  .md\\:gap-16 { gap: 4rem; }

  .md\\:px-4 { padding-left: 1rem; padding-right: 1rem; }
  .md\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .md\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
  .md\\:px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
  .md\\:px-12 { padding-left: 3rem; padding-right: 3rem; }
  .md\\:px-16 { padding-left: 4rem; padding-right: 4rem; }

  .md\\:py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .md\\:py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .md\\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .md\\:py-12 { padding-top: 3rem; padding-bottom: 3rem; }
  .md\\:py-16 { padding-top: 4rem; padding-bottom: 4rem; }
  .md\\:py-20 { padding-top: 5rem; padding-bottom: 5rem; }
  .md\\:py-24 { padding-top: 6rem; padding-bottom: 6rem; }

  .md\\:pt-8 { padding-top: 2rem; }
  .md\\:pt-12 { padding-top: 3rem; }
  .md\\:pt-16 { padding-top: 4rem; }
  .md\\:pt-20 { padding-top: 5rem; }
  .md\\:pt-24 { padding-top: 6rem; }

  .md\\:pb-8 { padding-bottom: 2rem; }
  .md\\:pb-12 { padding-bottom: 3rem; }
  .md\\:pb-16 { padding-bottom: 4rem; }
  .md\\:pb-20 { padding-bottom: 5rem; }
  .md\\:pb-24 { padding-bottom: 6rem; }

  .md\\:text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .md\\:text-base { font-size: 1rem; line-height: 1.5rem; }
  .md\\:text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .md\\:text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .md\\:text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .md\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .md\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .md\\:text-5xl { font-size: 3rem; line-height: 1; }
  .md\\:text-6xl { font-size: 3.75rem; line-height: 1; }

  .md\\:w-1\\/2 { width: 50%; }
  .md\\:w-1\\/3 { width: 33.333333%; }
  .md\\:w-2\\/3 { width: 66.666667%; }
  .md\\:w-1\\/4 { width: 25%; }
  .md\\:w-3\\/4 { width: 75%; }
  .md\\:w-auto { width: auto; }
  .md\\:w-full { width: 100%; }

  .md\\:max-w-md { max-width: 28rem; }
  .md\\:max-w-lg { max-width: 32rem; }
  .md\\:max-w-xl { max-width: 36rem; }
  .md\\:max-w-2xl { max-width: 42rem; }
  .md\\:max-w-3xl { max-width: 48rem; }
  .md\\:max-w-4xl { max-width: 56rem; }
  .md\\:max-w-none { max-width: none; }

  .md\\:items-start { align-items: flex-start; }
  .md\\:items-center { align-items: center; }
  .md\\:items-end { align-items: flex-end; }

  .md\\:justify-start { justify-content: flex-start; }
  .md\\:justify-center { justify-content: center; }
  .md\\:justify-end { justify-content: flex-end; }
  .md\\:justify-between { justify-content: space-between; }

  .md\\:text-left { text-align: left; }
  .md\\:text-center { text-align: center; }
  .md\\:text-right { text-align: right; }

  .md\\:space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .md\\:space-x-6 > :not([hidden]) ~ :not([hidden]) { margin-left: 1.5rem; }
  .md\\:space-x-8 > :not([hidden]) ~ :not([hidden]) { margin-left: 2rem; }
  .md\\:space-y-0 > :not([hidden]) ~ :not([hidden]) { margin-top: 0; }

  .md\\:mt-0 { margin-top: 0; }
  .md\\:mb-0 { margin-bottom: 0; }
  .md\\:ml-0 { margin-left: 0; }
  .md\\:mr-0 { margin-right: 0; }
  .md\\:mx-0 { margin-left: 0; margin-right: 0; }
  .md\\:my-0 { margin-top: 0; margin-bottom: 0; }

  .md\\:absolute { position: absolute; }
  .md\\:relative { position: relative; }
  .md\\:static { position: static; }
}

/* LG: (min-width: 1024px) */
@media (min-width: 1024px) {
  .lg\\:block { display: block; }
  .lg\\:inline-block { display: inline-block; }
  .lg\\:inline { display: inline; }
  .lg\\:flex { display: flex; }
  .lg\\:inline-flex { display: inline-flex; }
  .lg\\:grid { display: grid; }
  .lg\\:hidden { display: none; }

  .lg\\:flex-row { flex-direction: row; }
  .lg\\:flex-col { flex-direction: column; }
  .lg\\:flex-row-reverse { flex-direction: row-reverse; }
  .lg\\:flex-col-reverse { flex-direction: column-reverse; }

  .lg\\:grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lg\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .lg\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .lg\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

  .lg\\:col-span-1 { grid-column: span 1 / span 1; }
  .lg\\:col-span-2 { grid-column: span 2 / span 2; }
  .lg\\:col-span-3 { grid-column: span 3 / span 3; }
  .lg\\:col-span-4 { grid-column: span 4 / span 4; }
  .lg\\:col-span-5 { grid-column: span 5 / span 5; }
  .lg\\:col-span-6 { grid-column: span 6 / span 6; }
  .lg\\:col-span-7 { grid-column: span 7 / span 7; }
  .lg\\:col-span-8 { grid-column: span 8 / span 8; }
  .lg\\:col-span-9 { grid-column: span 9 / span 9; }
  .lg\\:col-span-10 { grid-column: span 10 / span 10; }
  .lg\\:col-span-11 { grid-column: span 11 / span 11; }
  .lg\\:col-span-12 { grid-column: span 12 / span 12; }

  .lg\\:gap-4 { gap: 1rem; }
  .lg\\:gap-6 { gap: 1.5rem; }
  .lg\\:gap-8 { gap: 2rem; }
  .lg\\:gap-10 { gap: 2.5rem; }
  .lg\\:gap-12 { gap: 3rem; }
  .lg\\:gap-16 { gap: 4rem; }
  .lg\\:gap-20 { gap: 5rem; }
  .lg\\:gap-24 { gap: 6rem; }
  .lg\\:gap-32 { gap: 8rem; }

  .lg\\:px-4 { padding-left: 1rem; padding-right: 1rem; }
  .lg\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .lg\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
  .lg\\:px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
  .lg\\:px-12 { padding-left: 3rem; padding-right: 3rem; }
  .lg\\:px-16 { padding-left: 4rem; padding-right: 4rem; }
  .lg\\:px-20 { padding-left: 5rem; padding-right: 5rem; }
  .lg\\:px-24 { padding-left: 6rem; padding-right: 6rem; }

  .lg\\:py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .lg\\:py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .lg\\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .lg\\:py-12 { padding-top: 3rem; padding-bottom: 3rem; }
  .lg\\:py-16 { padding-top: 4rem; padding-bottom: 4rem; }
  .lg\\:py-20 { padding-top: 5rem; padding-bottom: 5rem; }
  .lg\\:py-24 { padding-top: 6rem; padding-bottom: 6rem; }
  .lg\\:py-32 { padding-top: 8rem; padding-bottom: 8rem; }

  .lg\\:pt-8 { padding-top: 2rem; }
  .lg\\:pt-12 { padding-top: 3rem; }
  .lg\\:pt-16 { padding-top: 4rem; }
  .lg\\:pt-20 { padding-top: 5rem; }
  .lg\\:pt-24 { padding-top: 6rem; }
  .lg\\:pt-32 { padding-top: 8rem; }

  .lg\\:pb-8 { padding-bottom: 2rem; }
  .lg\\:pb-12 { padding-bottom: 3rem; }
  .lg\\:pb-16 { padding-bottom: 4rem; }
  .lg\\:pb-20 { padding-bottom: 5rem; }
  .lg\\:pb-24 { padding-bottom: 6rem; }
  .lg\\:pb-32 { padding-bottom: 8rem; }

  .lg\\:text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .lg\\:text-base { font-size: 1rem; line-height: 1.5rem; }
  .lg\\:text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .lg\\:text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .lg\\:text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .lg\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .lg\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .lg\\:text-5xl { font-size: 3rem; line-height: 1; }
  .lg\\:text-6xl { font-size: 3.75rem; line-height: 1; }
  .lg\\:text-7xl { font-size: 4.5rem; line-height: 1; }
  .lg\\:text-8xl { font-size: 6rem; line-height: 1; }

  .lg\\:w-1\\/2 { width: 50%; }
  .lg\\:w-1\\/3 { width: 33.333333%; }
  .lg\\:w-2\\/3 { width: 66.666667%; }
  .lg\\:w-1\\/4 { width: 25%; }
  .lg\\:w-3\\/4 { width: 75%; }
  .lg\\:w-1\\/5 { width: 20%; }
  .lg\\:w-2\\/5 { width: 40%; }
  .lg\\:w-3\\/5 { width: 60%; }
  .lg\\:w-4\\/5 { width: 80%; }
  .lg\\:w-auto { width: auto; }
  .lg\\:w-full { width: 100%; }

  .lg\\:max-w-md { max-width: 28rem; }
  .lg\\:max-w-lg { max-width: 32rem; }
  .lg\\:max-w-xl { max-width: 36rem; }
  .lg\\:max-w-2xl { max-width: 42rem; }
  .lg\\:max-w-3xl { max-width: 48rem; }
  .lg\\:max-w-4xl { max-width: 56rem; }
  .lg\\:max-w-5xl { max-width: 64rem; }
  .lg\\:max-w-6xl { max-width: 72rem; }
  .lg\\:max-w-7xl { max-width: 80rem; }
  .lg\\:max-w-none { max-width: none; }

  .lg\\:items-start { align-items: flex-start; }
  .lg\\:items-center { align-items: center; }
  .lg\\:items-end { align-items: flex-end; }

  .lg\\:justify-start { justify-content: flex-start; }
  .lg\\:justify-center { justify-content: center; }
  .lg\\:justify-end { justify-content: flex-end; }
  .lg\\:justify-between { justify-content: space-between; }

  .lg\\:text-left { text-align: left; }
  .lg\\:text-center { text-align: center; }
  .lg\\:text-right { text-align: right; }

  .lg\\:space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .lg\\:space-x-6 > :not([hidden]) ~ :not([hidden]) { margin-left: 1.5rem; }
  .lg\\:space-x-8 > :not([hidden]) ~ :not([hidden]) { margin-left: 2rem; }
  .lg\\:space-x-12 > :not([hidden]) ~ :not([hidden]) { margin-left: 3rem; }
  .lg\\:space-y-0 > :not([hidden]) ~ :not([hidden]) { margin-top: 0; }

  .lg\\:mt-0 { margin-top: 0; }
  .lg\\:mb-0 { margin-bottom: 0; }
  .lg\\:ml-0 { margin-left: 0; }
  .lg\\:mr-0 { margin-right: 0; }
  .lg\\:mx-0 { margin-left: 0; margin-right: 0; }
  .lg\\:my-0 { margin-top: 0; margin-bottom: 0; }

  .lg\\:absolute { position: absolute; }
  .lg\\:relative { position: relative; }
  .lg\\:static { position: static; }
  .lg\\:sticky { position: sticky; }
}

/* XL: (min-width: 1280px) */
@media (min-width: 1280px) {
  .xl\\:block { display: block; }
  .xl\\:flex { display: flex; }
  .xl\\:grid { display: grid; }
  .xl\\:hidden { display: none; }

  .xl\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .xl\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .xl\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .xl\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .xl\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }

  .xl\\:gap-8 { gap: 2rem; }
  .xl\\:gap-12 { gap: 3rem; }
  .xl\\:gap-16 { gap: 4rem; }
  .xl\\:gap-20 { gap: 5rem; }
  .xl\\:gap-24 { gap: 6rem; }

  .xl\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
  .xl\\:px-12 { padding-left: 3rem; padding-right: 3rem; }
  .xl\\:px-16 { padding-left: 4rem; padding-right: 4rem; }
  .xl\\:px-24 { padding-left: 6rem; padding-right: 6rem; }

  .xl\\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .xl\\:py-12 { padding-top: 3rem; padding-bottom: 3rem; }
  .xl\\:py-16 { padding-top: 4rem; padding-bottom: 4rem; }
  .xl\\:py-24 { padding-top: 6rem; padding-bottom: 6rem; }
  .xl\\:py-32 { padding-top: 8rem; padding-bottom: 8rem; }

  .xl\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .xl\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .xl\\:text-5xl { font-size: 3rem; line-height: 1; }
  .xl\\:text-6xl { font-size: 3.75rem; line-height: 1; }
  .xl\\:text-7xl { font-size: 4.5rem; line-height: 1; }
  .xl\\:text-8xl { font-size: 6rem; line-height: 1; }

  .xl\\:max-w-4xl { max-width: 56rem; }
  .xl\\:max-w-5xl { max-width: 64rem; }
  .xl\\:max-w-6xl { max-width: 72rem; }
  .xl\\:max-w-7xl { max-width: 80rem; }
}

/* 2XL: (min-width: 1536px) */
@media (min-width: 1536px) {
  .\\32xl\\:block { display: block; }
  .\\32xl\\:flex { display: flex; }
  .\\32xl\\:grid { display: grid; }
  .\\32xl\\:hidden { display: none; }

  .\\32xl\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .\\32xl\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .\\32xl\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .\\32xl\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }

  .\\32xl\\:gap-12 { gap: 3rem; }
  .\\32xl\\:gap-16 { gap: 4rem; }
  .\\32xl\\:gap-24 { gap: 6rem; }

  .\\32xl\\:px-12 { padding-left: 3rem; padding-right: 3rem; }
  .\\32xl\\:px-16 { padding-left: 4rem; padding-right: 4rem; }
  .\\32xl\\:px-24 { padding-left: 6rem; padding-right: 6rem; }

  .\\32xl\\:text-5xl { font-size: 3rem; line-height: 1; }
  .\\32xl\\:text-6xl { font-size: 3.75rem; line-height: 1; }
  .\\32xl\\:text-7xl { font-size: 4.5rem; line-height: 1; }
  .\\32xl\\:text-8xl { font-size: 6rem; line-height: 1; }
  .\\32xl\\:text-9xl { font-size: 8rem; line-height: 1; }
}

/* ============================================
   SR ONLY (Screen Reader)
   ============================================ */

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.not-sr-only {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
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
