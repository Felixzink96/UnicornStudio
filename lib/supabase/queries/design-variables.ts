import { createClient } from '@/lib/supabase/client'
import type { DesignVariables, DesignVariablesUpdate } from '@/types/cms'

// ============================================
// DESIGN VARIABLES QUERIES
// ============================================

/**
 * Get design variables for a site
 * Creates default variables if none exist
 */
export async function getDesignVariables(
  siteId: string
): Promise<DesignVariables> {
  const supabase = createClient()

  // Try to get existing variables
  const { data, error } = await supabase
    .from('design_variables')
    .select('*')
    .eq('site_id', siteId)
    .single()

  if (error && error.code !== 'PGRST116') throw error

  // If no variables exist, create default ones
  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from('design_variables')
      .insert({ site_id: siteId })
      .select()
      .single()

    if (insertError) throw insertError
    return newData as DesignVariables
  }

  return data as DesignVariables
}

/**
 * Update design variables
 */
export async function updateDesignVariables(
  siteId: string,
  updates: Partial<DesignVariablesUpdate>
): Promise<DesignVariables> {
  const supabase = createClient()

  // Ensure variables exist first
  await getDesignVariables(siteId)

  const { data, error } = await supabase
    .from('design_variables')
    .update(updates)
    .eq('site_id', siteId)
    .select()
    .single()

  if (error) throw error
  return data as DesignVariables
}

/**
 * Update a specific color
 */
export async function updateColor(
  siteId: string,
  category: 'brand' | 'semantic' | 'neutral',
  key: string,
  value: string
): Promise<DesignVariables> {
  const variables = await getDesignVariables(siteId)

  const newColors = {
    ...variables.colors,
    [category]: {
      ...variables.colors[category],
      [key]: value,
    },
  }

  return updateDesignVariables(siteId, { colors: newColors })
}

/**
 * Add a custom color
 */
export async function addCustomColor(
  siteId: string,
  category: 'brand' | 'semantic' | 'neutral',
  key: string,
  value: string
): Promise<DesignVariables> {
  return updateColor(siteId, category, key, value)
}

/**
 * Remove a custom color
 */
export async function removeCustomColor(
  siteId: string,
  category: 'brand' | 'semantic' | 'neutral',
  key: string
): Promise<DesignVariables> {
  const variables = await getDesignVariables(siteId)

  const newCategory = { ...variables.colors[category] }
  delete newCategory[key]

  const newColors = {
    ...variables.colors,
    [category]: newCategory,
  }

  return updateDesignVariables(siteId, { colors: newColors })
}

/**
 * Update typography settings
 */
export async function updateTypography(
  siteId: string,
  updates: Partial<DesignVariables['typography']>
): Promise<DesignVariables> {
  const variables = await getDesignVariables(siteId)

  const newTypography = {
    ...variables.typography,
    ...updates,
  }

  return updateDesignVariables(siteId, { typography: newTypography })
}

/**
 * Update spacing settings
 */
export async function updateSpacing(
  siteId: string,
  updates: Partial<DesignVariables['spacing']>
): Promise<DesignVariables> {
  const variables = await getDesignVariables(siteId)

  const newSpacing = {
    ...variables.spacing,
    ...updates,
  }

  return updateDesignVariables(siteId, { spacing: newSpacing })
}

/**
 * Update border settings
 */
export async function updateBorders(
  siteId: string,
  updates: Partial<DesignVariables['borders']>
): Promise<DesignVariables> {
  const variables = await getDesignVariables(siteId)

  const newBorders = {
    ...variables.borders,
    ...updates,
  }

  return updateDesignVariables(siteId, { borders: newBorders })
}

/**
 * Update shadow settings
 */
export async function updateShadows(
  siteId: string,
  updates: Partial<DesignVariables['shadows']>
): Promise<DesignVariables> {
  const variables = await getDesignVariables(siteId)

  const newShadows = {
    ...variables.shadows,
    ...updates,
  }

  return updateDesignVariables(siteId, { shadows: newShadows })
}

/**
 * Reset design variables to defaults
 */
export async function resetDesignVariables(
  siteId: string
): Promise<DesignVariables> {
  const supabase = createClient()

  // Delete existing variables
  await supabase.from('design_variables').delete().eq('site_id', siteId)

  // Create new with defaults
  const { data, error } = await supabase
    .from('design_variables')
    .insert({ site_id: siteId })
    .select()
    .single()

  if (error) throw error
  return data as DesignVariables
}

/**
 * Generate CSS from design variables
 */
export function generateCSS(variables: DesignVariables): string {
  if (!variables) return ':root {}\n'

  let css = ':root {\n'

  // Colors
  if (variables.colors) {
    for (const [category, colors] of Object.entries(variables.colors)) {
      if (colors && typeof colors === 'object') {
        for (const [key, value] of Object.entries(colors)) {
          if (value) css += `  --color-${category}-${key}: ${value};\n`
        }
      }
    }
  }

  // Typography
  if (variables.typography) {
    if (variables.typography.fontHeading) {
      css += `  --font-heading: ${variables.typography.fontHeading};\n`
    }
    if (variables.typography.fontBody) {
      css += `  --font-body: ${variables.typography.fontBody};\n`
    }
    if (variables.typography.fontMono) {
      css += `  --font-mono: ${variables.typography.fontMono};\n`
    }

    if (variables.typography.fontSizes) {
      for (const [key, value] of Object.entries(variables.typography.fontSizes)) {
        if (value) css += `  --font-size-${key}: ${value};\n`
      }
    }

    if (variables.typography.fontWeights) {
      for (const [key, value] of Object.entries(variables.typography.fontWeights)) {
        if (value) css += `  --font-weight-${key}: ${value};\n`
      }
    }

    if (variables.typography.lineHeights) {
      for (const [key, value] of Object.entries(variables.typography.lineHeights)) {
        if (value) css += `  --line-height-${key}: ${value};\n`
      }
    }
  }

  // Spacing
  if (variables.spacing) {
    if (variables.spacing.scale) {
      for (const [key, value] of Object.entries(variables.spacing.scale)) {
        if (value) css += `  --spacing-${key}: ${value};\n`
      }
    }

    if (variables.spacing.containerWidths) {
      for (const [key, value] of Object.entries(variables.spacing.containerWidths)) {
        if (value) css += `  --container-${key}: ${value};\n`
      }
    }
  }

  // Borders
  if (variables.borders) {
    if (variables.borders.radius) {
      for (const [key, value] of Object.entries(variables.borders.radius)) {
        if (value) css += `  --radius-${key}: ${value};\n`
      }
    }

    if (variables.borders.widths) {
      for (const [key, value] of Object.entries(variables.borders.widths)) {
        if (value) css += `  --border-${key}: ${value};\n`
      }
    }
  }

  // Shadows
  if (variables.shadows) {
    for (const [key, value] of Object.entries(variables.shadows)) {
      if (value) css += `  --shadow-${key}: ${value};\n`
    }
  }

  css += '}\n'

  return css
}

/**
 * Generate Tailwind config from design variables
 */
export function generateTailwindConfig(variables: DesignVariables): object {
  if (!variables) return { theme: { extend: {} } }

  return {
    theme: {
      extend: {
        colors: {
          brand: variables.colors?.brand || {},
          semantic: variables.colors?.semantic || {},
          neutral: variables.colors?.neutral || {},
        },
        fontFamily: {
          heading: [variables.typography?.fontHeading || 'Inter', 'sans-serif'],
          body: [variables.typography?.fontBody || 'Inter', 'sans-serif'],
          mono: [variables.typography?.fontMono || 'monospace', 'monospace'],
        },
        fontSize: variables.typography?.fontSizes || {},
        fontWeight: variables.typography?.fontWeights || {},
        lineHeight: variables.typography?.lineHeights || {},
        spacing: variables.spacing?.scale || {},
        maxWidth: variables.spacing?.containerWidths || {},
        borderRadius: variables.borders?.radius || {},
        borderWidth: variables.borders?.widths || {},
        boxShadow: variables.shadows || {},
      },
    },
  }
}
