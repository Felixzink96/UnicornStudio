/**
 * Tailwind CSS Spacing Utilities
 * Maps pixel values to Tailwind spacing classes and vice versa
 */

// Tailwind spacing scale (default)
export const TAILWIND_SPACING_SCALE: Record<string, number> = {
  '0': 0,
  'px': 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,
}

// Reverse mapping: pixels to class suffix
const PIXEL_TO_CLASS: [number, string][] = Object.entries(TAILWIND_SPACING_SCALE)
  .map(([cls, px]) => [px, cls] as [number, string])
  .sort((a, b) => a[0] - b[0])

/**
 * Find the nearest Tailwind spacing class for a pixel value
 */
export function pixelsToTailwindClass(pixels: number): string {
  if (pixels <= 0) return '0'

  // Find the closest match
  let closest = PIXEL_TO_CLASS[0]
  let minDiff = Math.abs(pixels - closest[0])

  for (const [px, cls] of PIXEL_TO_CLASS) {
    const diff = Math.abs(pixels - px)
    if (diff < minDiff) {
      minDiff = diff
      closest = [px, cls]
    }
  }

  return closest[1]
}

/**
 * Get pixel value for a Tailwind class suffix
 */
export function tailwindClassToPixels(classSuffix: string): number {
  return TAILWIND_SPACING_SCALE[classSuffix] ?? 0
}

type SpacingSide = 'top' | 'right' | 'bottom' | 'left'
type SpacingType = 'margin' | 'padding'

interface SpacingClass {
  type: SpacingType
  side: SpacingSide | 'x' | 'y' | 'all'
  value: string
  prefix?: string // For responsive prefixes like md:, lg:
}

// Regex patterns for Tailwind spacing classes
const SPACING_PATTERNS: Record<string, RegExp> = {
  // Margin patterns
  'm-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(m)-(\d+\.?\d*|px|auto)$/,
  'mx-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(mx)-(\d+\.?\d*|px|auto)$/,
  'my-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(my)-(\d+\.?\d*|px|auto)$/,
  'mt-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(mt)-(\d+\.?\d*|px|auto)$/,
  'mr-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(mr)-(\d+\.?\d*|px|auto)$/,
  'mb-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(mb)-(\d+\.?\d*|px|auto)$/,
  'ml-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(-)?(ml)-(\d+\.?\d*|px|auto)$/,
  // Padding patterns
  'p-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(p)-(\d+\.?\d*|px)$/,
  'px-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(px)-(\d+\.?\d*|px)$/,
  'py-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(py)-(\d+\.?\d*|px)$/,
  'pt-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(pt)-(\d+\.?\d*|px)$/,
  'pr-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(pr)-(\d+\.?\d*|px)$/,
  'pb-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(pb)-(\d+\.?\d*|px)$/,
  'pl-': /^((?:sm:|md:|lg:|xl:|2xl:)?)(pl)-(\d+\.?\d*|px)$/,
}

/**
 * Parse spacing classes from an element's className
 */
export function parseSpacingClasses(className: string): SpacingClass[] {
  const classes = className.split(/\s+/).filter(Boolean)
  const result: SpacingClass[] = []

  for (const cls of classes) {
    // Check margin classes
    if (cls.includes('m-') || cls.includes('mt-') || cls.includes('mr-') ||
        cls.includes('mb-') || cls.includes('ml-') || cls.includes('mx-') ||
        cls.includes('my-')) {
      const match = cls.match(/^((?:sm:|md:|lg:|xl:|2xl:)?)?(-)?m([trblxy])?-(\d+\.?\d*|px|auto)$/)
      if (match) {
        const [, prefix = '', negative, side, value] = match
        const sideMap: Record<string, SpacingSide | 'x' | 'y' | 'all'> = {
          't': 'top', 'r': 'right', 'b': 'bottom', 'l': 'left',
          'x': 'x', 'y': 'y', '': 'all'
        }
        result.push({
          type: 'margin',
          side: sideMap[side || ''] || 'all',
          value: negative ? `-${value}` : value,
          prefix: prefix || undefined,
        })
      }
    }

    // Check padding classes
    if (cls.includes('p-') || cls.includes('pt-') || cls.includes('pr-') ||
        cls.includes('pb-') || cls.includes('pl-') || cls.includes('px-') ||
        cls.includes('py-')) {
      const match = cls.match(/^((?:sm:|md:|lg:|xl:|2xl:)?)?p([trblxy])?-(\d+\.?\d*|px)$/)
      if (match) {
        const [, prefix = '', side, value] = match
        const sideMap: Record<string, SpacingSide | 'x' | 'y' | 'all'> = {
          't': 'top', 'r': 'right', 'b': 'bottom', 'l': 'left',
          'x': 'x', 'y': 'y', '': 'all'
        }
        result.push({
          type: 'padding',
          side: sideMap[side || ''] || 'all',
          value,
          prefix: prefix || undefined,
        })
      }
    }
  }

  return result
}

/**
 * Build a Tailwind class string from spacing definition
 */
export function buildSpacingClass(
  type: SpacingType,
  side: SpacingSide | 'x' | 'y' | 'all',
  value: string,
  prefix?: string
): string {
  const typeChar = type === 'margin' ? 'm' : 'p'
  const sideChar = side === 'all' ? '' : side === 'x' || side === 'y' ? side : side[0]
  const prefixStr = prefix || ''

  // Handle negative values for margin
  if (type === 'margin' && value.startsWith('-')) {
    return `${prefixStr}-${typeChar}${sideChar}-${value.slice(1)}`
  }

  return `${prefixStr}${typeChar}${sideChar}-${value}`
}

/**
 * Update spacing in a className string
 * Replaces existing spacing class or adds new one
 */
export function updateSpacingInClassName(
  className: string,
  type: SpacingType,
  side: SpacingSide,
  newPixels: number
): string {
  const newValue = pixelsToTailwindClass(newPixels)
  const classes = className.split(/\s+/).filter(Boolean)

  // Build the new class
  const newClass = buildSpacingClass(type, side, newValue)

  // Find and replace existing class, or add new one
  const typeChar = type === 'margin' ? 'm' : 'p'
  const sideChar = side[0] // t, r, b, l
  const pattern = new RegExp(`^((?:sm:|md:|lg:|xl:|2xl:)?)?-?${typeChar}${sideChar}-`)

  // Also check for full-side classes (m-, p-, mx-, px-, my-, py-)
  const allSidePattern = new RegExp(`^((?:sm:|md:|lg:|xl:|2xl:)?)?-?${typeChar}-`)
  const axisSidePattern = side === 'top' || side === 'bottom'
    ? new RegExp(`^((?:sm:|md:|lg:|xl:|2xl:)?)?-?${typeChar}y-`)
    : new RegExp(`^((?:sm:|md:|lg:|xl:|2xl:)?)?-?${typeChar}x-`)

  let found = false
  const result = classes.map(cls => {
    // Skip if not matching our target type/side
    if (!pattern.test(cls)) return cls
    found = true
    return newClass
  })

  // If we need to expand mx/my or m/p classes, handle that
  // For now, just add if not found
  if (!found) {
    // Check if there's a catch-all class we need to split
    const hasAllClass = classes.some(cls => allSidePattern.test(cls) && !cls.includes('x') && !cls.includes('y'))
    const hasAxisClass = classes.some(cls => axisSidePattern.test(cls))

    if (!hasAllClass && !hasAxisClass) {
      result.push(newClass)
    } else {
      // More complex: need to split the catch-all class
      // For simplicity, just add the specific class (Tailwind handles specificity)
      result.push(newClass)
    }
  }

  return result.join(' ')
}

/**
 * Get computed spacing values in pixels for an element's className
 */
export function getComputedSpacing(className: string): {
  margin: { top: number; right: number; bottom: number; left: number }
  padding: { top: number; right: number; bottom: number; left: number }
} {
  const parsed = parseSpacingClasses(className)

  const result = {
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  }

  for (const cls of parsed) {
    if (cls.prefix) continue // Skip responsive variants for now

    const pixels = cls.value === 'auto' ? 0 : tailwindClassToPixels(cls.value.replace('-', ''))
    const isNegative = cls.value.startsWith('-')
    const finalValue = isNegative ? -pixels : pixels

    const target = cls.type === 'margin' ? result.margin : result.padding

    switch (cls.side) {
      case 'all':
        target.top = target.right = target.bottom = target.left = finalValue
        break
      case 'x':
        target.left = target.right = finalValue
        break
      case 'y':
        target.top = target.bottom = finalValue
        break
      default:
        target[cls.side] = finalValue
    }
  }

  return result
}
