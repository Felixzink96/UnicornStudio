// ============================================
// TEMPLATE ENGINE
// Handlebars-based template rendering
// ============================================

import Handlebars from 'handlebars'
import { registerHelpers } from './helpers'
import { resolveComponentsSync, type ResolvedComponent } from './component-resolver'
import type { CMSComponent } from '@/types/cms'

// Register custom helpers on import
registerHelpers(Handlebars)

export interface RenderContext {
  // For single templates
  entry?: {
    title: string
    slug: string
    content: string
    excerpt?: string
    featured_image?: string
    author?: string
    published_at?: string
    url: string
    data: Record<string, unknown>
  }
  related_entries?: Array<{
    title: string
    slug: string
    excerpt?: string
    featured_image?: string
    url: string
  }>

  // For archive templates
  entries?: Array<{
    title: string
    slug: string
    excerpt?: string
    featured_image?: string
    author?: string
    published_at?: string
    url: string
    data: Record<string, unknown>
  }>
  pagination?: {
    current: number
    total: number
    prev: string | null
    next: string | null
    pages: number[]
  }

  // Site context
  site?: {
    name: string
    description?: string
    url: string
  }

  // Custom data
  [key: string]: unknown
}

/**
 * Compile and render a template with the given context
 */
export function renderTemplate(
  templateHtml: string,
  context: RenderContext
): string {
  try {
    const template = Handlebars.compile(templateHtml)
    return template(context)
  } catch (error) {
    console.error('Template rendering error:', error)
    throw new Error(
      `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export interface RenderWithComponentsResult {
  html: string
  components: ResolvedComponent[]
}

/**
 * Render template with component resolution
 * Resolves {{component:slug}} placeholders before Handlebars processing
 */
export function renderTemplateWithComponents(
  templateHtml: string,
  context: RenderContext,
  availableComponents: CMSComponent[]
): RenderWithComponentsResult {
  try {
    // Step 1: Resolve component placeholders
    const { html: resolvedHtml, components } = resolveComponentsSync(
      templateHtml,
      availableComponents
    )

    // Step 2: Render with Handlebars
    const template = Handlebars.compile(resolvedHtml)
    const renderedHtml = template(context)

    return {
      html: renderedHtml,
      components,
    }
  } catch (error) {
    console.error('Template rendering error:', error)
    throw new Error(
      `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Pre-compile a template for reuse
 */
export function compileTemplate(templateHtml: string): HandlebarsTemplateDelegate {
  return Handlebars.compile(templateHtml)
}

/**
 * Check if a template is valid
 */
export function validateTemplate(templateHtml: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    Handlebars.compile(templateHtml)
  } catch (error) {
    errors.push(
      `Syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  // Check for common issues
  const unclosedEach = (templateHtml.match(/\{\{#each/g) || []).length
  const closedEach = (templateHtml.match(/\{\{\/each\}\}/g) || []).length
  if (unclosedEach !== closedEach) {
    errors.push(`Mismatched {{#each}}/{{/each}} blocks (${unclosedEach} opened, ${closedEach} closed)`)
  }

  const unclosedIf = (templateHtml.match(/\{\{#if/g) || []).length
  const closedIf = (templateHtml.match(/\{\{\/if\}\}/g) || []).length
  if (unclosedIf !== closedIf) {
    errors.push(`Mismatched {{#if}}/{{/if}} blocks (${unclosedIf} opened, ${closedIf} closed)`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Extract all variables used in a template
 */
export function extractTemplateVariables(templateHtml: string): string[] {
  const variables = new Set<string>()

  // Match {{variable}}, {{{variable}}}, {{variable.path}}
  const variablePattern = /\{\{\{?([^#\/\s}]+?)(?:\s|}})/g
  let match

  while ((match = variablePattern.exec(templateHtml)) !== null) {
    const variable = match[1].trim()
    // Skip helpers like 'if', 'each', 'unless', 'with'
    if (!['if', 'each', 'unless', 'with', 'else', 'this'].includes(variable)) {
      variables.add(variable)
    }
  }

  return Array.from(variables)
}

// Handlebars template type
export type HandlebarsTemplateDelegate = ReturnType<typeof Handlebars.compile>
