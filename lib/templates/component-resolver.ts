// ============================================
// COMPONENT RESOLVER
// Resolves {{component:slug}} placeholders in templates
// ============================================

import { createClient } from '@/lib/supabase/server'
import type { CMSComponent } from '@/types/cms'

export interface ResolvedComponent {
  slug: string
  html: string
  css: string | null
  js: string | null
  js_init: string
}

export interface ComponentResolveResult {
  html: string
  components: ResolvedComponent[]
}

/**
 * Pattern to match component placeholders
 * Matches: {{component:slug}}, {{component:toc}}, {{component:my-component}}
 */
const COMPONENT_PATTERN = /\{\{component:([a-z0-9_-]+)\}\}/gi

/**
 * Resolve all component placeholders in template HTML
 */
export async function resolveComponentsInTemplate(
  html: string,
  siteId: string
): Promise<ComponentResolveResult> {
  // Find all component slugs used in the template
  const matches = html.matchAll(COMPONENT_PATTERN)
  const slugs = new Set<string>()

  for (const match of matches) {
    slugs.add(match[1].toLowerCase())
  }

  if (slugs.size === 0) {
    return { html, components: [] }
  }

  // Fetch all used components from database
  const supabase = await createClient()
  const { data: components, error } = await supabase
    .from('cms_components')
    .select('slug, html, css, js, js_init')
    .eq('site_id', siteId)
    .in('slug', Array.from(slugs))

  if (error || !components) {
    console.error('Failed to fetch components:', error)
    return { html, components: [] }
  }

  // Create lookup map
  const componentMap = new Map<string, ResolvedComponent>()
  components.forEach(c => {
    if (c.slug) {
      componentMap.set(c.slug.toLowerCase(), {
        slug: c.slug,
        html: c.html,
        css: c.css,
        js: c.js,
        js_init: c.js_init || 'domready',
      })
    }
  })

  // Replace placeholders with component HTML
  const resolvedHtml = html.replace(COMPONENT_PATTERN, (match, slug) => {
    const component = componentMap.get(slug.toLowerCase())
    if (component) {
      // Wrap in a container with data attribute for identification
      return `<!-- Component: ${slug} -->\n${component.html}\n<!-- /Component: ${slug} -->`
    }
    // Component not found - leave placeholder with warning comment
    return `<!-- Component "${slug}" not found -->`
  })

  return {
    html: resolvedHtml,
    components: Array.from(componentMap.values()),
  }
}

/**
 * Resolve components synchronously using pre-fetched components
 * Used when components are already loaded
 */
export function resolveComponentsSync(
  html: string,
  components: CMSComponent[]
): ComponentResolveResult {
  // Create lookup map
  const componentMap = new Map<string, ResolvedComponent>()
  components.forEach(c => {
    if (c.slug) {
      componentMap.set(c.slug.toLowerCase(), {
        slug: c.slug,
        html: c.html,
        css: c.css,
        js: c.js,
        js_init: c.js_init || 'domready',
      })
    }
  })

  const usedComponents: ResolvedComponent[] = []

  // Replace placeholders with component HTML
  const resolvedHtml = html.replace(COMPONENT_PATTERN, (match, slug) => {
    const component = componentMap.get(slug.toLowerCase())
    if (component) {
      usedComponents.push(component)
      return `<!-- Component: ${slug} -->\n${component.html}\n<!-- /Component: ${slug} -->`
    }
    return `<!-- Component "${slug}" not found -->`
  })

  return {
    html: resolvedHtml,
    components: usedComponents,
  }
}

/**
 * Extract component slugs from template HTML without resolving
 */
export function extractComponentSlugs(html: string): string[] {
  const matches = html.matchAll(COMPONENT_PATTERN)
  const slugs = new Set<string>()

  for (const match of matches) {
    slugs.add(match[1].toLowerCase())
  }

  return Array.from(slugs)
}

/**
 * Generate combined CSS for all components
 */
export function generateComponentsCSS(components: ResolvedComponent[]): string {
  return components
    .filter(c => c.css)
    .map(c => `/* Component: ${c.slug} */\n${c.css}`)
    .join('\n\n')
}

/**
 * Generate combined JS for all components, grouped by init strategy
 */
export function generateComponentsJS(components: ResolvedComponent[]): string {
  const withJS = components.filter(c => c.js)

  if (withJS.length === 0) return ''

  const immediate = withJS.filter(c => c.js_init === 'immediate')
  const domready = withJS.filter(c => c.js_init === 'domready')
  const scroll = withJS.filter(c => c.js_init === 'scroll')
  const interaction = withJS.filter(c => c.js_init === 'interaction')

  let js = '/* Unicorn Studio Components */\n\n'

  // Immediate
  if (immediate.length > 0) {
    immediate.forEach(c => {
      js += `// Component: ${c.slug} (immediate)\n`
      js += `(function() {\n  try {\n${indent(c.js!, 4)}\n  } catch(e) { console.error('[${c.slug}]', e); }\n})();\n\n`
    })
  }

  // DOMContentLoaded
  if (domready.length > 0 || scroll.length > 0 || interaction.length > 0) {
    js += `document.addEventListener('DOMContentLoaded', function() {\n`

    domready.forEach(c => {
      js += `  // Component: ${c.slug}\n`
      js += `  try {\n${indent(c.js!, 4)}\n  } catch(e) { console.error('[${c.slug}]', e); }\n\n`
    })

    // TODO: Add scroll and interaction handlers similar to WordPress plugin

    js += `});\n`
  }

  return js
}

function indent(code: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return code.split('\n').map(line => pad + line).join('\n')
}
