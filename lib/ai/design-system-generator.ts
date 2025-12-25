/**
 * Design System Generator
 *
 * Generiert ein komplettes Design System basierend auf:
 * - Archetyp (Craftsman, Innovator, etc.)
 * - Design Tokens (Farben, Fonts)
 * - Radii, Motion, Layout Settings
 */

import type { DesignSystemStyles, DesignArchetyp } from '@/types/design-system'

interface GeneratorInput {
  archetyp: string
  radii: {
    style: string
    default: string
    lg: string
    xl: string
    button: string
    card: string
    input: string
  }
  motion: {
    style: string
    duration: { fast: string; normal: string; slow: string }
    hoverScale: number
  }
  layout: {
    maxWidth: string
    sectionSpacing: string
  }
}

/**
 * Generiert Tailwind-Klassen für das Design System
 */
export function generateDesignSystem(input: GeneratorInput): DesignSystemStyles {
  const { archetyp, radii, motion, layout } = input

  // Button Radius basierend auf Style
  const buttonRadius = getRadiusClass(radii.button)
  const cardRadius = getRadiusClass(radii.card)
  const inputRadius = getRadiusClass(radii.input)
  const badgeRadius = radii.style === 'pill' ? 'rounded-full' : getRadiusClass(radii.lg)

  // Transition basierend auf Motion Style
  const transitionSpeed = motion.style === 'bold' ? 'duration-150' : motion.style === 'elegant' ? 'duration-300' : 'duration-200'
  const hoverScale = motion.hoverScale > 1.05 ? 'hover:scale-105' : motion.hoverScale > 1.02 ? 'hover:scale-[1.02]' : ''

  // Container Width
  const containerWidth = layout.maxWidth === '1440px' ? 'max-w-7xl' : layout.maxWidth === '1280px' ? 'max-w-6xl' : layout.maxWidth === '1600px' ? 'max-w-[1600px]' : 'max-w-7xl'

  // Section Spacing
  const sectionPadding = layout.sectionSpacing === '6rem' ? 'py-24 md:py-32' : layout.sectionSpacing === '4rem' ? 'py-16 md:py-24' : 'py-20 md:py-28'

  // Archetyp-spezifische Anpassungen
  const archetypStyles = getArchetypStyles(archetyp as DesignArchetyp)

  return {
    // BUTTONS
    button_primary: `inline-flex items-center justify-center bg-primary text-white px-6 py-3 ${buttonRadius} font-medium hover:bg-primary-hover ${transitionSpeed} transition-colors ${hoverScale} ${archetypStyles.buttonExtra}`.trim(),

    button_secondary: `inline-flex items-center justify-center border-2 border-primary text-primary px-6 py-3 ${buttonRadius} font-medium hover:bg-primary hover:text-white ${transitionSpeed} transition-colors`.trim(),

    button_cta: `inline-flex items-center justify-center bg-accent text-white px-8 py-4 ${radii.style === 'pill' ? 'rounded-full' : buttonRadius} font-bold shadow-lg hover:shadow-xl ${hoverScale} ${transitionSpeed} transition-all`.trim(),

    button_ghost: `inline-flex items-center justify-center text-foreground hover:text-primary px-4 py-2 ${transitionSpeed} transition-colors`.trim(),

    button_link: `text-primary hover:text-primary-hover underline underline-offset-4 ${transitionSpeed} transition-colors`.trim(),

    // FORM ELEMENTS
    input: `w-full px-4 py-3 border border-border ${inputRadius} bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none ${transitionSpeed} transition-all placeholder:text-foreground/40`.trim(),

    textarea: `w-full px-4 py-3 border border-border ${inputRadius} bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none ${transitionSpeed} transition-all min-h-[120px] resize-y placeholder:text-foreground/40`.trim(),

    select_field: `w-full px-4 py-3 border border-border ${inputRadius} bg-background text-foreground focus:border-primary outline-none ${transitionSpeed} transition-all appearance-none cursor-pointer`.trim(),

    checkbox: `w-5 h-5 border-2 border-border rounded text-primary focus:ring-primary cursor-pointer`.trim(),

    label: `block text-sm font-medium text-foreground mb-2`.trim(),

    // CARDS & CONTAINERS
    card: `bg-muted ${cardRadius} p-6 border border-border ${archetypStyles.cardExtra}`.trim(),

    card_hover: `bg-muted ${cardRadius} p-6 border border-border hover:border-primary hover:shadow-lg ${transitionSpeed} transition-all ${hoverScale}`.trim(),

    section_padding: sectionPadding,

    container: `${containerWidth} mx-auto px-4 sm:px-6 lg:px-8`.trim(),

    // TYPOGRAPHY
    heading_1: `text-4xl md:text-5xl lg:text-6xl font-heading font-bold tracking-tight ${archetypStyles.h1Extra}`.trim(),

    heading_2: `text-3xl md:text-4xl font-heading font-bold ${archetypStyles.h2Extra}`.trim(),

    heading_3: `text-2xl md:text-3xl font-heading font-semibold`.trim(),

    heading_4: `text-xl md:text-2xl font-heading font-semibold`.trim(),

    body_text: `text-base md:text-lg text-foreground/80 leading-relaxed`.trim(),

    small_text: `text-sm text-foreground/60`.trim(),

    link_style: `text-primary hover:text-primary-hover ${transitionSpeed} transition-colors`.trim(),

    // LAYOUT ELEMENTS
    badge: `inline-flex items-center px-3 py-1 ${badgeRadius} text-sm font-medium bg-primary/10 text-primary`.trim(),

    divider: `w-full h-px bg-border`.trim(),

    overlay: `absolute inset-0 bg-black/50`.trim(),

    // SPECIAL ELEMENTS
    icon_wrapper: `w-12 h-12 ${cardRadius} bg-primary/10 flex items-center justify-center text-primary`.trim(),

    image_wrapper: `overflow-hidden ${cardRadius}`.trim(),

    // METADATA
    archetyp: archetyp,
  }
}

/**
 * Konvertiert rem-Werte zu Tailwind Radius-Klassen
 */
function getRadiusClass(value: string): string {
  const numValue = parseFloat(value)

  if (value === '0' || numValue === 0) return 'rounded-none'
  if (value === '9999px') return 'rounded-full'
  if (numValue <= 0.125) return 'rounded-sm'
  if (numValue <= 0.375) return 'rounded'
  if (numValue <= 0.5) return 'rounded-md'
  if (numValue <= 0.75) return 'rounded-lg'
  if (numValue <= 1) return 'rounded-xl'
  if (numValue <= 1.5) return 'rounded-2xl'
  return 'rounded-3xl'
}

/**
 * Archetyp-spezifische Style-Extras
 */
function getArchetypStyles(archetyp: DesignArchetyp | string): {
  buttonExtra: string
  cardExtra: string
  h1Extra: string
  h2Extra: string
} {
  switch (archetyp) {
    case 'architect':
      return {
        buttonExtra: 'uppercase tracking-wide text-sm',
        cardExtra: '',
        h1Extra: 'tracking-tight',
        h2Extra: '',
      }

    case 'brutalist':
      return {
        buttonExtra: 'uppercase font-black tracking-wider',
        cardExtra: 'border-2',
        h1Extra: 'uppercase tracking-tighter',
        h2Extra: 'uppercase',
      }

    case 'organic':
      return {
        buttonExtra: '',
        cardExtra: 'shadow-sm',
        h1Extra: '',
        h2Extra: '',
      }

    case 'craftsman':
      return {
        buttonExtra: 'font-semibold',
        cardExtra: 'shadow-sm',
        h1Extra: '',
        h2Extra: '',
      }

    case 'minimal':
      return {
        buttonExtra: 'font-light tracking-wide',
        cardExtra: 'border-0',
        h1Extra: 'font-light',
        h2Extra: 'font-light',
      }

    case 'luxe':
      return {
        buttonExtra: 'uppercase tracking-widest text-sm',
        cardExtra: '',
        h1Extra: 'tracking-wide',
        h2Extra: '',
      }

    case 'bold':
      return {
        buttonExtra: 'font-black uppercase',
        cardExtra: 'shadow-md',
        h1Extra: 'font-black',
        h2Extra: 'font-bold',
      }

    case 'warm':
      return {
        buttonExtra: '',
        cardExtra: 'shadow-sm',
        h1Extra: '',
        h2Extra: '',
      }

    case 'clinical':
      return {
        buttonExtra: '',
        cardExtra: '',
        h1Extra: '',
        h2Extra: '',
      }

    case 'dynamic':
      return {
        buttonExtra: 'uppercase font-bold',
        cardExtra: 'shadow-md',
        h1Extra: 'uppercase font-black',
        h2Extra: 'font-bold',
      }

    case 'editorial':
      return {
        buttonExtra: '',
        cardExtra: 'border-0',
        h1Extra: '',
        h2Extra: '',
      }

    case 'playful':
      return {
        buttonExtra: 'font-bold',
        cardExtra: 'shadow-lg',
        h1Extra: 'font-black',
        h2Extra: 'font-bold',
      }

    case 'vintage':
      return {
        buttonExtra: 'uppercase tracking-wide text-sm',
        cardExtra: 'border-2',
        h1Extra: '',
        h2Extra: '',
      }

    case 'corporate':
      return {
        buttonExtra: 'font-medium',
        cardExtra: '',
        h1Extra: '',
        h2Extra: '',
      }

    case 'innovator':
    default:
      return {
        buttonExtra: '',
        cardExtra: 'shadow-sm',
        h1Extra: '',
        h2Extra: '',
      }
  }
}
