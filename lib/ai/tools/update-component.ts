import { createClient } from '@/lib/supabase/server'

export interface UpdateComponentInput {
  id: string
  html?: string
  css?: string
  js?: string
  name?: string
}

/**
 * AI Tool: Update a component's HTML/CSS/JS
 * Used by AI to modify global header/footer
 */
export async function updateComponent(input: UpdateComponentInput): Promise<boolean> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}

  if (input.html !== undefined) updates.html = input.html
  if (input.css !== undefined) updates.css = input.css
  if (input.js !== undefined) updates.js = input.js
  if (input.name !== undefined) updates.name = input.name

  if (Object.keys(updates).length === 0) {
    return false
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('components')
    .update(updates)
    .eq('id', input.id)

  if (error) {
    console.error('Error updating component:', error)
    return false
  }

  return true
}
