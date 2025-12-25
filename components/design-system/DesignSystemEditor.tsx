'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, RotateCcw, Copy, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SiteDesignSystem } from '@/types/design-system'

interface PreviewColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  border: string
}

interface DesignSystemEditorProps {
  siteId: string
  initialDesignSystem: SiteDesignSystem | null
  colors: PreviewColors
}

// Komponenten-Kategorien für bessere Organisation
const COMPONENT_CATEGORIES = [
  {
    name: 'Buttons',
    items: [
      { key: 'button_primary', label: 'Primary Button', description: 'Haupt-Aktionen' },
      { key: 'button_secondary', label: 'Secondary Button', description: 'Sekundäre Aktionen' },
      { key: 'button_cta', label: 'CTA Button', description: 'Call-to-Action' },
      { key: 'button_ghost', label: 'Ghost Button', description: 'Subtile Aktionen' },
      { key: 'button_link', label: 'Link Button', description: 'Text-Links' },
    ]
  },
  {
    name: 'Formulare',
    items: [
      { key: 'input', label: 'Input', description: 'Textfelder' },
      { key: 'textarea', label: 'Textarea', description: 'Mehrzeilige Eingabe' },
      { key: 'select_field', label: 'Select', description: 'Dropdown-Auswahl' },
      { key: 'label', label: 'Label', description: 'Feld-Beschriftungen' },
    ]
  },
  {
    name: 'Cards & Layout',
    items: [
      { key: 'card', label: 'Card', description: 'Standard-Karte' },
      { key: 'card_hover', label: 'Card (Hover)', description: 'Karte mit Hover-Effekt' },
      { key: 'section_padding', label: 'Section Padding', description: 'Abstände für Sections' },
      { key: 'container', label: 'Container', description: 'Max-Width Container' },
    ]
  },
  {
    name: 'Typografie',
    items: [
      { key: 'heading_1', label: 'H1', description: 'Hauptüberschrift' },
      { key: 'heading_2', label: 'H2', description: 'Abschnittsüberschrift' },
      { key: 'heading_3', label: 'H3', description: 'Unterüberschrift' },
      { key: 'heading_4', label: 'H4', description: 'Kleine Überschrift' },
      { key: 'body_text', label: 'Body Text', description: 'Fließtext' },
      { key: 'small_text', label: 'Small Text', description: 'Kleiner Text' },
      { key: 'link_style', label: 'Link', description: 'Text-Links' },
    ]
  },
  {
    name: 'Elemente',
    items: [
      { key: 'badge', label: 'Badge', description: 'Labels & Tags' },
      { key: 'icon_wrapper', label: 'Icon Wrapper', description: 'Icon-Container' },
      { key: 'image_wrapper', label: 'Image Wrapper', description: 'Bild-Container' },
    ]
  },
]

// Funktion um Tailwind theme classes durch echte Farben zu ersetzen
function replaceThemeClasses(classes: string, colors: PreviewColors): string {
  return classes
    .replace(/\bbg-primary\b/g, '')
    .replace(/\bbg-primary-hover\b/g, '')
    .replace(/\bbg-accent\b/g, '')
    .replace(/\bbg-muted\b/g, '')
    .replace(/\bbg-background\b/g, '')
    .replace(/\btext-primary\b/g, '')
    .replace(/\btext-foreground\b/g, '')
    .replace(/\bborder-primary\b/g, '')
    .replace(/\bborder-border\b/g, '')
}

export function DesignSystemEditor({ siteId, initialDesignSystem, colors }: DesignSystemEditorProps) {
  // CSS Variables für die Vorschau
  const previewStyle = {
    '--color-primary': colors.primary,
    '--color-primary-hover': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-background': colors.background,
    '--color-foreground': colors.foreground,
    '--color-muted': colors.muted,
    '--color-border': colors.border,
  } as React.CSSProperties
  const [designSystem, setDesignSystem] = useState<Record<string, string>>(
    initialDesignSystem ? {
      button_primary: initialDesignSystem.button_primary,
      button_secondary: initialDesignSystem.button_secondary,
      button_cta: initialDesignSystem.button_cta,
      button_ghost: initialDesignSystem.button_ghost,
      button_link: initialDesignSystem.button_link,
      input: initialDesignSystem.input,
      textarea: initialDesignSystem.textarea,
      select_field: initialDesignSystem.select_field,
      label: initialDesignSystem.label,
      card: initialDesignSystem.card,
      card_hover: initialDesignSystem.card_hover,
      section_padding: initialDesignSystem.section_padding,
      container: initialDesignSystem.container,
      heading_1: initialDesignSystem.heading_1,
      heading_2: initialDesignSystem.heading_2,
      heading_3: initialDesignSystem.heading_3,
      heading_4: initialDesignSystem.heading_4,
      body_text: initialDesignSystem.body_text,
      small_text: initialDesignSystem.small_text,
      link_style: initialDesignSystem.link_style,
      badge: initialDesignSystem.badge,
      icon_wrapper: initialDesignSystem.icon_wrapper,
      image_wrapper: initialDesignSystem.image_wrapper,
    } : {}
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Buttons')

  const hasDesignSystem = initialDesignSystem !== null

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()

      await supabase
        .from('site_design_system')
        .update(designSystem)
        .eq('site_id', siteId)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving design system:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const handleReset = (key: string) => {
    if (initialDesignSystem && key in initialDesignSystem) {
      setDesignSystem(prev => ({
        ...prev,
        [key]: (initialDesignSystem as unknown as Record<string, string>)[key]
      }))
    }
  }

  if (!hasDesignSystem) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-200">Kein Design System vorhanden</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Das Design System wird automatisch erstellt, wenn du eine Website mit dem Setup-Wizard generierst.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Archetyp:</strong>{' '}
          <span className="text-zinc-900 dark:text-zinc-100 capitalize">
            {initialDesignSystem?.archetyp || 'Nicht definiert'}
          </span>
          {' '}&bull;{' '}
          Diese Klassen werden von der KI für alle generierten Seiten verwendet.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>Speichern...</>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Gespeichert
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Änderungen speichern
            </>
          )}
        </Button>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {COMPONENT_CATEGORIES.map((category) => (
          <div
            key={category.name}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
              className="w-full px-4 py-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{category.name}</span>
              <span className="text-xs text-zinc-500">{category.items.length} Elemente</span>
            </button>

            {/* Category Items */}
            {expandedCategory === category.name && (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {category.items.map((item) => (
                  <div key={item.key} className="p-4 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{item.label}</span>
                        <span className="text-xs text-zinc-500 ml-2">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(item.key, designSystem[item.key] || '')}
                          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Klassen kopieren"
                        >
                          {copiedKey === item.key ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleReset(item.key)}
                          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Zurücksetzen"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={designSystem[item.key] || ''}
                      onChange={(e) => setDesignSystem(prev => ({ ...prev, [item.key]: e.target.value }))}
                      className="font-mono text-xs"
                      placeholder="Tailwind-Klassen..."
                    />

                    {/* Live Preview für Buttons */}
                    {item.key === 'button_primary' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <button
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{ backgroundColor: colors.primary, color: '#fff' }}
                        >
                          Beispiel Button
                        </button>
                      </div>
                    )}
                    {item.key === 'button_secondary' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <button
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{ borderColor: colors.primary, color: colors.primary }}
                        >
                          Beispiel Button
                        </button>
                      </div>
                    )}
                    {item.key === 'button_cta' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <button
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{ backgroundColor: colors.accent, color: '#fff' }}
                        >
                          Beispiel CTA
                        </button>
                      </div>
                    )}
                    {item.key === 'button_ghost' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <button
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{ color: colors.foreground }}
                        >
                          Beispiel Ghost
                        </button>
                      </div>
                    )}
                    {item.key === 'button_link' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <button
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{ color: colors.primary }}
                        >
                          Beispiel Link
                        </button>
                      </div>
                    )}

                    {/* Live Preview für Inputs */}
                    {item.key === 'input' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <input
                          type="text"
                          placeholder="Beispiel Input..."
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.foreground
                          }}
                          readOnly
                        />
                      </div>
                    )}

                    {/* Live Preview für Cards */}
                    {item.key === 'card' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <div
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{
                            backgroundColor: colors.muted,
                            borderColor: colors.border
                          }}
                        >
                          <p className="font-medium text-sm" style={{ color: colors.foreground }}>Beispiel Card</p>
                          <p className="text-xs" style={{ color: colors.foreground, opacity: 0.6 }}>Mit deinen Styles</p>
                        </div>
                      </div>
                    )}

                    {/* Live Preview für Badge */}
                    {item.key === 'badge' && designSystem[item.key] && (
                      <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-2">Vorschau:</span>
                        <span
                          className={replaceThemeClasses(designSystem[item.key], colors)}
                          style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                        >
                          Beispiel Badge
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
