import { createClient } from '@/lib/supabase/client'
import type { SiteDesignSystem, DesignSystemStyles } from '@/types/design-system'

/**
 * Holt das Design System einer Site
 */
export async function getDesignSystem(siteId: string): Promise<SiteDesignSystem | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('site_design_system')
    .select('*')
    .eq('site_id', siteId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Kein Design System gefunden
      return null
    }
    throw error
  }
  return data
}

/**
 * Erstellt ein neues Design System für eine Site
 */
export async function createDesignSystem(
  siteId: string,
  styles: DesignSystemStyles
): Promise<SiteDesignSystem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('site_design_system')
    .insert({
      site_id: siteId,
      ...styles,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Aktualisiert das Design System einer Site
 */
export async function updateDesignSystem(
  siteId: string,
  updates: Partial<DesignSystemStyles>
): Promise<SiteDesignSystem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('site_design_system')
    .update(updates)
    .eq('site_id', siteId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Erstellt oder aktualisiert das Design System (Upsert)
 */
export async function upsertDesignSystem(
  siteId: string,
  styles: DesignSystemStyles
): Promise<SiteDesignSystem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('site_design_system')
    .upsert({
      site_id: siteId,
      ...styles,
    }, {
      onConflict: 'site_id'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Löscht das Design System einer Site
 */
export async function deleteDesignSystem(siteId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('site_design_system')
    .delete()
    .eq('site_id', siteId)

  if (error) throw error
}

/**
 * Formatiert das Design System für den AI System Prompt
 */
export function formatDesignSystemForPrompt(designSystem: SiteDesignSystem): string {
  return `<design-system>
Du hast ein vordefiniertes Design System. Verwende EXAKT diese Klassen für Konsistenz:

BUTTONS:
- Primary Button: class="${designSystem.button_primary}"
- Secondary Button: class="${designSystem.button_secondary}"
- CTA Button: class="${designSystem.button_cta}"
- Ghost Button: class="${designSystem.button_ghost}"
- Link Button: class="${designSystem.button_link}"

FORMULARE:
- Input: class="${designSystem.input}"
- Textarea: class="${designSystem.textarea}"
- Select: class="${designSystem.select_field}"
- Checkbox: class="${designSystem.checkbox}"
- Label: class="${designSystem.label}"

CARDS & CONTAINER:
- Card: class="${designSystem.card}"
- Card mit Hover: class="${designSystem.card_hover}"
- Section Padding: class="${designSystem.section_padding}"
- Container: class="${designSystem.container}"

TYPOGRAFIE:
- H1: class="${designSystem.heading_1}"
- H2: class="${designSystem.heading_2}"
- H3: class="${designSystem.heading_3}"
- H4: class="${designSystem.heading_4}"
- Body Text: class="${designSystem.body_text}"
- Small Text: class="${designSystem.small_text}"
- Link: class="${designSystem.link_style}"

LAYOUT ELEMENTE:
- Badge: class="${designSystem.badge}"
- Divider: class="${designSystem.divider}"
- Overlay: class="${designSystem.overlay}"
- Icon Wrapper: class="${designSystem.icon_wrapper}"
- Image Wrapper: class="${designSystem.image_wrapper}"

Archetyp: ${designSystem.archetyp || 'nicht definiert'}

WICHTIG: Verwende diese exakten Klassen für alle Komponenten. Keine eigenen Variationen!
</design-system>`
}
