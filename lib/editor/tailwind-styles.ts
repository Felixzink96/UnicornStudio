/**
 * Tailwind CSS Style Utilities
 * Parsing und Generierung von Style-Klassen
 */

// Shadow Scale
export const TAILWIND_SHADOWS = [
  { value: 'shadow-none', label: 'Keine', preview: 'none' },
  { value: 'shadow-sm', label: 'Klein', preview: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { value: 'shadow', label: 'Normal', preview: '0 1px 3px 0 rgb(0 0 0 / 0.1)' },
  { value: 'shadow-md', label: 'Mittel', preview: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  { value: 'shadow-lg', label: 'Groß', preview: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
  { value: 'shadow-xl', label: 'XL', preview: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
  { value: 'shadow-2xl', label: '2XL', preview: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
] as const

// Border Radius Scale
export const TAILWIND_BORDER_RADIUS = [
  { value: 'rounded-none', label: '0', preview: '0px' },
  { value: 'rounded-sm', label: 'SM', preview: '2px' },
  { value: 'rounded', label: 'Def', preview: '4px' },
  { value: 'rounded-md', label: 'MD', preview: '6px' },
  { value: 'rounded-lg', label: 'LG', preview: '8px' },
  { value: 'rounded-xl', label: 'XL', preview: '12px' },
  { value: 'rounded-2xl', label: '2XL', preview: '16px' },
  { value: 'rounded-3xl', label: '3XL', preview: '24px' },
  { value: 'rounded-full', label: 'Full', preview: '9999px' },
] as const

// Opacity Scale
export const TAILWIND_OPACITY = [
  { value: 'opacity-0', label: '0%', numericValue: 0 },
  { value: 'opacity-5', label: '5%', numericValue: 5 },
  { value: 'opacity-10', label: '10%', numericValue: 10 },
  { value: 'opacity-20', label: '20%', numericValue: 20 },
  { value: 'opacity-25', label: '25%', numericValue: 25 },
  { value: 'opacity-30', label: '30%', numericValue: 30 },
  { value: 'opacity-40', label: '40%', numericValue: 40 },
  { value: 'opacity-50', label: '50%', numericValue: 50 },
  { value: 'opacity-60', label: '60%', numericValue: 60 },
  { value: 'opacity-70', label: '70%', numericValue: 70 },
  { value: 'opacity-75', label: '75%', numericValue: 75 },
  { value: 'opacity-80', label: '80%', numericValue: 80 },
  { value: 'opacity-90', label: '90%', numericValue: 90 },
  { value: 'opacity-95', label: '95%', numericValue: 95 },
  { value: 'opacity-100', label: '100%', numericValue: 100 },
] as const

// Responsive Breakpoints
export const TAILWIND_BREAKPOINTS = [
  { prefix: '', label: 'Base', minWidth: 0 },
  { prefix: 'sm:', label: 'SM', minWidth: 640 },
  { prefix: 'md:', label: 'MD', minWidth: 768 },
  { prefix: 'lg:', label: 'LG', minWidth: 1024 },
  { prefix: 'xl:', label: 'XL', minWidth: 1280 },
  { prefix: '2xl:', label: '2XL', minWidth: 1536 },
] as const

// Common Tailwind Classes für Autocomplete
export const COMMON_TAILWIND_CLASSES = [
  // Layout
  'flex', 'grid', 'block', 'inline-block', 'hidden', 'inline-flex',
  'items-center', 'items-start', 'items-end', 'items-stretch',
  'justify-center', 'justify-between', 'justify-start', 'justify-end', 'justify-around',
  'gap-1', 'gap-2', 'gap-4', 'gap-6', 'gap-8', 'gap-12',
  'flex-col', 'flex-row', 'flex-wrap', 'flex-1',
  // Spacing
  'p-1', 'p-2', 'p-4', 'p-6', 'p-8', 'p-12',
  'm-1', 'm-2', 'm-4', 'm-auto', 'm-0',
  'px-4', 'py-2', 'px-6', 'py-4', 'px-8', 'py-6',
  'mx-auto', 'my-4', 'my-8',
  'mt-4', 'mb-4', 'ml-4', 'mr-4',
  // Sizing
  'w-full', 'w-1/2', 'w-1/3', 'w-auto', 'w-screen',
  'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl', 'max-w-6xl', 'max-w-7xl',
  'h-full', 'h-auto', 'h-screen', 'min-h-screen',
  // Typography
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
  'font-normal', 'font-medium', 'font-semibold', 'font-bold',
  'text-left', 'text-center', 'text-right',
  'leading-tight', 'leading-normal', 'leading-relaxed',
  'tracking-tight', 'tracking-normal', 'tracking-wide',
  // Colors (basic)
  'text-white', 'text-black', 'text-zinc-500', 'text-zinc-700', 'text-zinc-900',
  'bg-white', 'bg-black', 'bg-zinc-50', 'bg-zinc-100', 'bg-zinc-900',
  'bg-transparent',
  // Borders
  'border', 'border-2', 'border-0',
  'border-zinc-200', 'border-zinc-300', 'border-zinc-700',
  // Position
  'relative', 'absolute', 'fixed', 'sticky',
  'top-0', 'right-0', 'bottom-0', 'left-0',
  'inset-0', 'z-10', 'z-20', 'z-50',
  // Effects
  'overflow-hidden', 'overflow-auto', 'overflow-scroll',
  'transition', 'transition-all', 'transition-colors', 'transition-transform',
  'duration-150', 'duration-300', 'duration-500',
  'hover:opacity-80', 'hover:scale-105',
  // Object
  'object-cover', 'object-contain', 'object-center',
  // Aspect
  'aspect-video', 'aspect-square',
]

/**
 * Parse aktuelle Shadow-Klasse aus className
 */
export function parseShadowClass(className: string): string | null {
  const classes = className.split(/\s+/)
  const shadowClass = classes.find(c =>
    c.match(/^(sm:|md:|lg:|xl:|2xl:)?shadow(-none|-sm|-md|-lg|-xl|-2xl)?$/)
  )
  return shadowClass || null
}

/**
 * Parse aktuelle Border-Radius-Klasse aus className
 */
export function parseBorderRadiusClass(className: string): string | null {
  const classes = className.split(/\s+/)
  const radiusClass = classes.find(c =>
    c.match(/^(sm:|md:|lg:|xl:|2xl:)?rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/)
  )
  return radiusClass || null
}

/**
 * Parse aktuelle Opacity-Klasse aus className
 */
export function parseOpacityClass(className: string): string | null {
  const classes = className.split(/\s+/)
  const opacityClass = classes.find(c =>
    c.match(/^(sm:|md:|lg:|xl:|2xl:)?opacity-(\d+)$/)
  )
  return opacityClass || null
}

/**
 * Klassen nach Breakpoint gruppieren
 */
export function groupClassesByBreakpoint(className: string): Record<string, string[]> {
  const classes = className.split(/\s+/).filter(Boolean)
  const grouped: Record<string, string[]> = {
    base: [],
    sm: [],
    md: [],
    lg: [],
    xl: [],
    '2xl': [],
  }

  for (const cls of classes) {
    if (cls.startsWith('sm:')) grouped.sm.push(cls.slice(3))
    else if (cls.startsWith('md:')) grouped.md.push(cls.slice(3))
    else if (cls.startsWith('lg:')) grouped.lg.push(cls.slice(3))
    else if (cls.startsWith('xl:')) grouped.xl.push(cls.slice(3))
    else if (cls.startsWith('2xl:')) grouped['2xl'].push(cls.slice(4))
    else grouped.base.push(cls)
  }

  return grouped
}

/**
 * Klasse ersetzen oder hinzufügen
 */
export function replaceClass(
  className: string,
  pattern: RegExp,
  newClass: string,
  breakpoint?: string
): string {
  const prefix = breakpoint && breakpoint !== 'base' ? `${breakpoint}:` : ''
  const fullNewClass = `${prefix}${newClass}`
  const classes = className.split(/\s+/).filter(Boolean)

  // Entferne existierende Klassen die dem Pattern entsprechen
  const filtered = classes.filter(c => !c.match(pattern))

  // Füge neue Klasse hinzu wenn nicht leer/none
  if (newClass && !newClass.includes('-none')) {
    filtered.push(fullNewClass)
  }

  return filtered.join(' ')
}

/**
 * Finde den nächsten Opacity-Wert zum gegebenen numerischen Wert
 */
export function findClosestOpacity(value: number): typeof TAILWIND_OPACITY[number] {
  return TAILWIND_OPACITY.reduce((prev, curr) =>
    Math.abs(curr.numericValue - value) < Math.abs(prev.numericValue - value) ? curr : prev
  )
}
