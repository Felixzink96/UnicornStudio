import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ siteId: string }> }

/**
 * GET /api/v1/sites/:siteId/export/css/debug
 * Debug endpoint to compare CSS classes between Unicorn Studio and what's exported
 * Shows which classes are found, which have CSS, and which are missing
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { siteId } = await params

  try {
    const supabase = await createClient()

    // Get all content sources
    const [pagesRes, componentsRes, templatesRes, cmsComponentsRes] = await Promise.all([
      supabase.from('pages').select('id, name, slug, html_content').eq('site_id', siteId),
      supabase.from('components').select('id, name, position, html').eq('site_id', siteId),
      supabase.from('templates').select('id, name, html').eq('site_id', siteId),
      supabase.from('cms_components').select('id, name, html').eq('site_id', siteId),
    ])

    const pages = pagesRes.data || []
    const components = componentsRes.data || []
    const templates = templatesRes.data || []
    const cmsComponents = cmsComponentsRes.data || []

    // Extract classes from all sources
    const classesPerSource: Record<string, { source: string; classes: string[] }> = {}

    // Pages
    pages.forEach(page => {
      const classes = extractClasses(page.html_content || '')
      if (classes.length > 0) {
        classesPerSource[`page:${page.slug || page.id}`] = {
          source: `Page: ${page.name || page.slug}`,
          classes
        }
      }
    })

    // Components (Header/Footer)
    components.forEach(comp => {
      const classes = extractClasses(comp.html || '')
      if (classes.length > 0) {
        classesPerSource[`component:${comp.position}`] = {
          source: `Component: ${comp.name || comp.position}`,
          classes
        }
      }
    })

    // Templates
    templates.forEach(tmpl => {
      const classes = extractClasses(tmpl.html || '')
      if (classes.length > 0) {
        classesPerSource[`template:${tmpl.id}`] = {
          source: `Template: ${tmpl.name}`,
          classes
        }
      }
    })

    // CMS Components
    cmsComponents.forEach(comp => {
      const classes = extractClasses(comp.html || '')
      if (classes.length > 0) {
        classesPerSource[`cms:${comp.id}`] = {
          source: `CMS Component: ${comp.name}`,
          classes
        }
      }
    })

    // Collect all unique classes
    const allClasses = new Set<string>()
    Object.values(classesPerSource).forEach(({ classes }) => {
      classes.forEach(cls => allClasses.add(cls))
    })

    // Categorize classes
    const categories = categorizeClasses(Array.from(allClasses))

    // Generate report
    const report = {
      siteId,
      timestamp: new Date().toISOString(),
      summary: {
        totalClasses: allClasses.size,
        sources: Object.keys(classesPerSource).length,
        byCategory: {
          standardTailwind: categories.standard.length,
          arbitraryValues: categories.arbitrary.length,
          designTokens: categories.designTokens.length,
          responsive: categories.responsive.length,
          hover: categories.hover.length,
          animations: categories.animations.length,
          unknown: categories.unknown.length,
        }
      },
      potentialIssues: findPotentialIssues(categories),
      details: {
        arbitraryValues: categories.arbitrary.sort(),
        designTokenClasses: categories.designTokens.sort(),
        animationClasses: categories.animations.sort(),
        unknownClasses: categories.unknown.sort(),
      },
      sourceBreakdown: Object.entries(classesPerSource).map(([key, { source, classes }]) => ({
        id: key,
        source,
        totalClasses: classes.length,
        arbitrary: classes.filter(c => c.includes('[') && c.includes(']')).length,
      })),
    }

    return NextResponse.json(report, {
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('CSS Debug error:', error)
    return NextResponse.json({ error: 'Failed to generate debug report' }, { status: 500 })
  }
}

function extractClasses(html: string): string[] {
  const classes = new Set<string>()

  // Standard class attributes
  const classPattern = /class(?:Name)?=["']([^"']+)["']/gi
  let match
  while ((match = classPattern.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(cls => {
      const trimmed = cls.trim()
      if (trimmed && !trimmed.startsWith('{')) {
        classes.add(trimmed)
      }
    })
  }

  // Alpine.js :class bindings
  const alpinePattern = /:class=["']([^"']+)["']/gi
  while ((match = alpinePattern.exec(html)) !== null) {
    const content = match[1]
    // Extract quoted strings
    const quoted = content.match(/['"]([^'"]+)['"]/g) || []
    quoted.forEach(q => {
      const inner = q.slice(1, -1)
      inner.split(/\s+/).forEach(cls => {
        const trimmed = cls.trim()
        if (trimmed && /^-?[a-z][\w\-\[\]:\/.]*$/i.test(trimmed)) {
          classes.add(trimmed)
        }
      })
    })
  }

  // x-transition classes
  const transitionPattern = /x-transition[^=]*=["']([^"']+)["']/gi
  while ((match = transitionPattern.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(cls => {
      const trimmed = cls.trim()
      if (trimmed) classes.add(trimmed)
    })
  }

  return Array.from(classes)
}

function categorizeClasses(classes: string[]) {
  const categories = {
    standard: [] as string[],
    arbitrary: [] as string[],
    designTokens: [] as string[],
    responsive: [] as string[],
    hover: [] as string[],
    animations: [] as string[],
    unknown: [] as string[],
  }

  const designTokenPatterns = [
    /^(bg|text|border)-(primary|secondary|accent|muted|foreground|background|border)$/,
    /^font-(heading|body|mono)$/,
    /^shadow-(sm|md|lg|xl)$/,
  ]

  const standardPatterns = [
    /^(flex|grid|block|inline|hidden|relative|absolute|fixed|sticky)$/,
    /^(items|justify|content|self)-(start|end|center|between|around|evenly|stretch|baseline)$/,
    /^(w|h|min-w|max-w|min-h|max-h)-(full|screen|auto|fit|\d+|px|\d+\/\d+)$/,
    /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-(\d+|auto|px)$/,
    /^(gap|gap-x|gap-y)-\d+$/,
    /^text-(xs|sm|base|lg|xl|\d?xl|left|center|right|justify)$/,
    /^font-(thin|light|normal|medium|semibold|bold|extrabold|black)$/,
    /^(leading|tracking)-(none|tight|snug|normal|relaxed|loose|\d+)$/,
    /^(rounded|rounded-[tlbr]{1,2})(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
    /^(border|border-[tlbr])(-0|-2|-4|-8)?$/,
    /^(opacity)-(\d+)$/,
    /^(z)-(\d+|auto)$/,
    /^(overflow|overflow-[xy])-(auto|hidden|visible|scroll)$/,
    /^(top|right|bottom|left|inset)-(0|auto|px|\d+)$/,
    /^(bg|text|border)-(white|black|transparent|current|inherit)$/,
    /^(bg|text|border)-(gray|red|blue|green|yellow|purple|pink|indigo|orange)-\d{2,3}$/,
    /^(transition|duration|ease|delay)(-\w+)?$/,
    /^(scale|rotate|translate-[xy])-\d+$/,
    /^(cursor)-(pointer|default|not-allowed|wait|text|move|grab)$/,
    /^(pointer-events)-(none|auto)$/,
    /^(select)-(none|text|all|auto)$/,
    /^(sr-only|not-sr-only)$/,
    /^(uppercase|lowercase|capitalize|normal-case)$/,
    /^(underline|overline|line-through|no-underline)$/,
    /^(whitespace)-(normal|nowrap|pre|pre-line|pre-wrap)$/,
    /^(break)-(normal|words|all)$/,
    /^(object)-(contain|cover|fill|none|scale-down)$/,
    /^(aspect)-(auto|square|video)$/,
    /^(col|row)-span-\d+$/,
    /^grid-cols-\d+$/,
    /^(space-[xy])-\d+$/,
    /^(divide-[xy])(-\d+)?$/,
    /^(ring|ring-offset)(-\d+)?$/,
    /^(backdrop|filter|blur|brightness|contrast|grayscale|sepia|saturate|invert)(-\w+)?$/,
    /^(animate)-(none|spin|ping|pulse|bounce)$/,
    /^(mix-blend|bg-blend)-(normal|multiply|screen|overlay|darken|lighten)$/,
    /^(isolation)-(auto|isolate)$/,
    /^(visible|invisible|collapse)$/,
    /^(antialiased|subpixel-antialiased)$/,
    /^(scroll)-(auto|smooth)$/,
    /^(snap)-(start|end|center|none)$/,
    /^(touch)-(auto|none|manipulation)$/,
    /^(will-change)-(auto|scroll|contents|transform)$/,
    /^(accent|caret|fill|stroke)-\w+$/,
    /^(outline)(-none|-\d+)?$/,
    /^(placeholder)-\w+$/,
    /^(list)-(none|disc|decimal|inside|outside)$/,
    /^(appearance)-(none|auto)$/,
    /^(resize)(-none|-x|-y)?$/,
    /^(float)-(left|right|none)$/,
    /^(clear)-(left|right|both|none)$/,
    /^(order)-(first|last|none|\d+)$/,
    /^(grow|shrink)(-0)?$/,
    /^(basis)-(auto|full|\d+)$/,
    /^(flex)-(1|auto|initial|none|row|col|wrap|nowrap)(-reverse)?$/,
    /^(place)-(content|items|self)-(start|end|center|between|around|evenly|stretch)$/,
    /^(table|table-\w+)$/,
    /^(border)-(collapse|separate)$/,
    /^(caption)-(top|bottom)$/,
  ]

  classes.forEach(cls => {
    // Check for responsive prefix
    if (/^(sm|md|lg|xl|2xl):/.test(cls)) {
      categories.responsive.push(cls)
    }
    // Check for hover/focus prefix
    else if (/^(hover|focus|active|group-hover|focus-within|focus-visible):/.test(cls)) {
      categories.hover.push(cls)
    }
    // Check for arbitrary values
    else if (cls.includes('[') && cls.includes(']')) {
      categories.arbitrary.push(cls)
    }
    // Check for design tokens
    else if (designTokenPatterns.some(p => p.test(cls))) {
      categories.designTokens.push(cls)
    }
    // Check for animations
    else if (/animate-|transition|duration|ease|delay/.test(cls)) {
      categories.animations.push(cls)
    }
    // Check for standard Tailwind
    else if (standardPatterns.some(p => p.test(cls))) {
      categories.standard.push(cls)
    }
    // Unknown
    else {
      categories.unknown.push(cls)
    }
  })

  return categories
}

function findPotentialIssues(categories: ReturnType<typeof categorizeClasses>) {
  const issues: string[] = []

  // Check for arbitrary values that might not compile
  const problematicArbitrary = categories.arbitrary.filter(cls =>
    cls.includes('var(') || cls.includes('rgb(') || cls.includes('rgba(')
  )
  if (problematicArbitrary.length > 0) {
    issues.push(`${problematicArbitrary.length} arbitrary values with CSS variables/functions - may need fallback CSS`)
  }

  // Check for gray colors (should use design tokens)
  const grayClasses = [...categories.standard, ...categories.unknown].filter(cls =>
    /-(gray|slate|zinc|neutral|stone)-\d+/.test(cls)
  )
  if (grayClasses.length > 0) {
    issues.push(`${grayClasses.length} gray/neutral color classes - consider using design tokens instead`)
  }

  // Check for unknown classes
  if (categories.unknown.length > 0) {
    issues.push(`${categories.unknown.length} unknown classes - may not have CSS generated`)
  }

  return issues
}
