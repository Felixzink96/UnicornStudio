'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Palette, Type, Ruler, Save, Loader2, RotateCcw, Download, Plus, X, Sparkles } from 'lucide-react'
import { ColorTokenPicker } from '@/components/design/ColorTokenPicker'
import { FontSelector } from '@/components/design/FontSelector'
import {
  SpacingSelector,
  SECTION_PADDING_OPTIONS,
  CONTAINER_WIDTH_OPTIONS,
  CARD_GAP_OPTIONS,
  BORDER_RADIUS_OPTIONS,
} from '@/components/design/SpacingSelector'
import type { DesignVariables } from '@/types/cms'

const GRADIENT_DIRECTIONS = [
  { value: 'to-r', label: '→', title: 'Nach rechts' },
  { value: 'to-br', label: '↘', title: 'Diagonal rechts unten' },
  { value: 'to-b', label: '↓', title: 'Nach unten' },
  { value: 'to-bl', label: '↙', title: 'Diagonal links unten' },
  { value: 'to-l', label: '←', title: 'Nach links' },
  { value: 'to-tl', label: '↖', title: 'Diagonal links oben' },
  { value: 'to-t', label: '↑', title: 'Nach oben' },
  { value: 'to-tr', label: '↗', title: 'Diagonal rechts oben' },
] as const

const MONO_FONTS = [
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono',
  'Roboto Mono', 'Ubuntu Mono', 'Inconsolata',
]

export default function DesignSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.siteId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [designVars, setDesignVars] = useState<DesignVariables | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Custom Colors
  const [customColors, setCustomColors] = useState<Record<string, string>>({})
  const [newColorName, setNewColorName] = useState('')
  const [newColorValue, setNewColorValue] = useState('#6366f1')

  // Gradients
  const [gradients, setGradients] = useState<Record<string, { from: string; to: string; via?: string; direction: string }>>({})

  // Load design variables
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', siteId)
        .single()

      if (site) {
        setSiteName(site.name)
      }

      const { data: vars, error } = await supabase
        .from('design_variables')
        .select('*')
        .eq('site_id', siteId)
        .single()

      if (error && error.code === 'PGRST116') {
        const { data: newVars } = await supabase
          .from('design_variables')
          .insert({ site_id: siteId })
          .select()
          .single()

        setDesignVars(newVars as unknown as DesignVariables)
      } else if (vars) {
        setDesignVars(vars as unknown as DesignVariables)
        // Load custom colors and gradients
        if ((vars as any).customColors) {
          setCustomColors((vars as any).customColors)
        }
        if ((vars as any).gradients) {
          setGradients((vars as any).gradients)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [siteId])

  const updateColor = (category: 'brand' | 'neutral' | 'semantic', key: string, value: string) => {
    if (!designVars) return

    setDesignVars({
      ...designVars,
      colors: {
        ...designVars.colors,
        [category]: {
          ...designVars.colors[category],
          [key]: value,
        },
      },
    })
    setHasChanges(true)
  }

  const updateTypography = (key: string, value: string) => {
    if (!designVars) return

    setDesignVars({
      ...designVars,
      typography: {
        ...designVars.typography,
        [key]: value,
      },
    })
    setHasChanges(true)
  }

  const updateSpacing = (category: 'scale' | 'containerWidths', key: string, value: string) => {
    if (!designVars) return

    setDesignVars({
      ...designVars,
      spacing: {
        ...designVars.spacing,
        [category]: {
          ...designVars.spacing[category],
          [key]: value,
        },
      },
    })
    setHasChanges(true)
  }

  const updateBorders = (key: string, value: string) => {
    if (!designVars) return

    setDesignVars({
      ...designVars,
      borders: {
        ...designVars.borders,
        radius: {
          ...designVars.borders.radius,
          [key]: value,
        },
      },
    })
    setHasChanges(true)
  }

  const addCustomColor = () => {
    if (!newColorName.trim()) return
    const key = newColorName.trim().toLowerCase().replace(/\s+/g, '-')
    setCustomColors({ ...customColors, [key]: newColorValue })
    setNewColorName('')
    setNewColorValue('#6366f1')
    setHasChanges(true)
  }

  const removeCustomColor = (key: string) => {
    const updated = { ...customColors }
    delete updated[key]
    setCustomColors(updated)
    setHasChanges(true)
  }

  const updateCustomColor = (key: string, value: string) => {
    setCustomColors({ ...customColors, [key]: value })
    setHasChanges(true)
  }

  const updateGradient = (key: string, field: string, value: string) => {
    setGradients({
      ...gradients,
      [key]: {
        ...gradients[key],
        [field]: value,
      },
    })
    setHasChanges(true)
  }

  const addGradient = (key: string) => {
    if (gradients[key]) return
    setGradients({
      ...gradients,
      [key]: { from: '#3b82f6', to: '#8b5cf6', direction: 'to-br' },
    })
    setHasChanges(true)
  }

  const removeGradient = (key: string) => {
    const updated = { ...gradients }
    delete updated[key]
    setGradients(updated)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!designVars) return

    setSaving(true)

    try {
      const supabase = createClient()
      await supabase
        .from('design_variables')
        .update({
          colors: designVars.colors,
          typography: designVars.typography,
          spacing: designVars.spacing,
          borders: designVars.borders,
          shadows: designVars.shadows,
          customColors: customColors,
          gradients: gradients,
        })
        .eq('site_id', siteId)

      setHasChanges(false)
    } catch (error) {
      console.error('Error saving design variables:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Mochtest du alle Design-Einstellungen zurucksetzen?')) return

    const supabase = createClient()

    await supabase.from('design_variables').delete().eq('site_id', siteId)
    const { data: newVars } = await supabase
      .from('design_variables')
      .insert({ site_id: siteId })
      .select()
      .single()

    setDesignVars(newVars as unknown as DesignVariables)
    setCustomColors({})
    setGradients({})
    setHasChanges(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!designVars) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Design-Variablen konnten nicht geladen werden.</p>
      </div>
    )
  }

  return (
    <div className="p-8 w-full">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/settings`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zuruck zu Einstellungen
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Palette className="h-8 w-8 text-purple-500" />
            Design System
          </h1>
          <p className="text-slate-400 mt-2">
            Zentrale Design-Tokens fur {siteName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Zurucksetzen
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="colors" className="data-[state=active]:bg-purple-600">
            <Palette className="h-4 w-4 mr-2" />
            Farben
          </TabsTrigger>
          <TabsTrigger value="gradients" className="data-[state=active]:bg-purple-600">
            <Sparkles className="h-4 w-4 mr-2" />
            Gradients
          </TabsTrigger>
          <TabsTrigger value="typography" className="data-[state=active]:bg-purple-600">
            <Type className="h-4 w-4 mr-2" />
            Typografie
          </TabsTrigger>
          <TabsTrigger value="spacing" className="data-[state=active]:bg-purple-600">
            <Ruler className="h-4 w-4 mr-2" />
            Abstande
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          {/* Brand Colors */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Markenfarben</CardTitle>
              <CardDescription>
                Hauptfarben fur Buttons, CTAs und Akzente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ColorTokenPicker
                  label="Primary"
                  description="Buttons, CTAs, Links"
                  value={designVars.colors.brand.primary}
                  onChange={(v) => updateColor('brand', 'primary', v)}
                />
                <ColorTokenPicker
                  label="Primary Hover"
                  description="Hover-Zustand"
                  value={designVars.colors.brand.primaryHover || designVars.colors.brand.primary}
                  onChange={(v) => updateColor('brand', 'primaryHover', v)}
                />
                <ColorTokenPicker
                  label="Secondary"
                  description="Sekundare Elemente"
                  value={designVars.colors.brand.secondary}
                  onChange={(v) => updateColor('brand', 'secondary', v)}
                />
                <ColorTokenPicker
                  label="Accent"
                  description="Highlights, Badges"
                  value={designVars.colors.brand.accent || '#f59e0b'}
                  onChange={(v) => updateColor('brand', 'accent', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Neutral Colors */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Neutrale Farben</CardTitle>
              <CardDescription>
                Hintergrunde, Text und Rahmen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ColorTokenPicker
                  label="Background"
                  description="Seitenhintergrund"
                  value={designVars.colors.neutral?.['50'] || '#fafafa'}
                  onChange={(v) => updateColor('neutral', '50', v)}
                />
                <ColorTokenPicker
                  label="Foreground"
                  description="Haupttext"
                  value={designVars.colors.neutral?.['900'] || '#18181b'}
                  onChange={(v) => updateColor('neutral', '900', v)}
                />
                <ColorTokenPicker
                  label="Muted"
                  description="Subtile Hintergrunde"
                  value={designVars.colors.neutral?.['100'] || '#f4f4f5'}
                  onChange={(v) => updateColor('neutral', '100', v)}
                />
                <ColorTokenPicker
                  label="Border"
                  description="Rahmen, Trennlinien"
                  value={designVars.colors.neutral?.['200'] || '#e4e4e7'}
                  onChange={(v) => updateColor('neutral', '200', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Colors */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Custom Colors</CardTitle>
              <CardDescription>
                Eigene Farben fur spezielle Elemente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(customColors).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(customColors).map(([key, value]) => (
                    <div key={key} className="relative">
                      <ColorTokenPicker
                        label={key}
                        description="Custom"
                        value={value}
                        onChange={(v) => updateCustomColor(key, v)}
                      />
                      <button
                        onClick={() => removeCustomColor(key)}
                        className="absolute top-0 right-0 p-1 text-slate-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 items-end pt-4 border-t border-slate-800">
                <div className="flex-1">
                  <label className="text-sm text-slate-400 mb-1 block">Name</label>
                  <Input
                    placeholder="z.B. success, warning, gold"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Farbe</label>
                  <input
                    type="color"
                    value={newColorValue}
                    onChange={(e) => setNewColorValue(e.target.value)}
                    className="h-10 w-20 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                  />
                </div>
                <Button onClick={addCustomColor} disabled={!newColorName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufugen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gradients Tab */}
        <TabsContent value="gradients" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Gradients</CardTitle>
              <CardDescription>
                Farbverlaufe fur Hintergrunde und Akzente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Gradient */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Primary Gradient</h4>
                  {!gradients.primary ? (
                    <Button size="sm" variant="outline" onClick={() => addGradient('primary')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aktivieren
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => removeGradient('primary')} className="text-red-400">
                      <X className="h-4 w-4 mr-2" />
                      Entfernen
                    </Button>
                  )}
                </div>

                {gradients.primary && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Von</label>
                      <input
                        type="color"
                        value={gradients.primary.from}
                        onChange={(e) => updateGradient('primary', 'from', e.target.value)}
                        className="h-10 w-full rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Via (optional)</label>
                      <input
                        type="color"
                        value={gradients.primary.via || '#ffffff'}
                        onChange={(e) => updateGradient('primary', 'via', e.target.value)}
                        className="h-10 w-full rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Zu</label>
                      <input
                        type="color"
                        value={gradients.primary.to}
                        onChange={(e) => updateGradient('primary', 'to', e.target.value)}
                        className="h-10 w-full rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Richtung</label>
                      <div className="grid grid-cols-4 gap-1">
                        {GRADIENT_DIRECTIONS.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => updateGradient('primary', 'direction', d.value)}
                            className={`p-2 rounded text-lg ${
                              gradients.primary.direction === d.value
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                            title={d.title}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Vorschau</label>
                      <div
                        className="h-10 w-full rounded border border-slate-700"
                        style={{
                          background: `linear-gradient(${gradients.primary.direction.replace('to-', 'to ')}, ${gradients.primary.from}, ${gradients.primary.via || ''} ${gradients.primary.via ? ',' : ''} ${gradients.primary.to})`.replace(', ,', ','),
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Secondary Gradient */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Secondary Gradient</h4>
                  {!gradients.secondary ? (
                    <Button size="sm" variant="outline" onClick={() => addGradient('secondary')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aktivieren
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => removeGradient('secondary')} className="text-red-400">
                      <X className="h-4 w-4 mr-2" />
                      Entfernen
                    </Button>
                  )}
                </div>

                {gradients.secondary && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Von</label>
                      <input
                        type="color"
                        value={gradients.secondary.from}
                        onChange={(e) => updateGradient('secondary', 'from', e.target.value)}
                        className="h-10 w-full rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Via (optional)</label>
                      <input
                        type="color"
                        value={gradients.secondary.via || '#ffffff'}
                        onChange={(e) => updateGradient('secondary', 'via', e.target.value)}
                        className="h-10 w-full rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Zu</label>
                      <input
                        type="color"
                        value={gradients.secondary.to}
                        onChange={(e) => updateGradient('secondary', 'to', e.target.value)}
                        className="h-10 w-full rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Richtung</label>
                      <div className="grid grid-cols-4 gap-1">
                        {GRADIENT_DIRECTIONS.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => updateGradient('secondary', 'direction', d.value)}
                            className={`p-2 rounded text-lg ${
                              gradients.secondary.direction === d.value
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                            title={d.title}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Vorschau</label>
                      <div
                        className="h-10 w-full rounded border border-slate-700"
                        style={{
                          background: `linear-gradient(${gradients.secondary.direction.replace('to-', 'to ')}, ${gradients.secondary.from}, ${gradients.secondary.via || ''} ${gradients.secondary.via ? ',' : ''} ${gradients.secondary.to})`.replace(', ,', ','),
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Schriftarten</CardTitle>
              <CardDescription>
                Schriften fur Uberschriften, Fliesstext und Code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FontSelector
                  label="Uberschriften"
                  description="H1 - H6"
                  value={designVars.typography.fontHeading}
                  onChange={(v) => updateTypography('fontHeading', v)}
                />
                <FontSelector
                  label="Fliesstext"
                  description="Paragraphen, Listen"
                  value={designVars.typography.fontBody}
                  onChange={(v) => updateTypography('fontBody', v)}
                />
                <div>
                  <label className="text-sm font-medium text-white mb-1 block">Monospace</label>
                  <p className="text-xs text-slate-400 mb-2">Code-Blocke</p>
                  <select
                    value={designVars.typography.fontMono || ''}
                    onChange={(e) => updateTypography('fontMono', e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">Nicht gesetzt</option>
                    {MONO_FONTS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <Download className="h-4 w-4" />
                  DSGVO-konforme Fonts
                </div>
                <p className="text-xs text-slate-500">
                  Google Fonts werden automatisch heruntergeladen und lokal gehostet
                  beim Export zu WordPress.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Abstande</CardTitle>
              <CardDescription>
                Standardabstande fur Sections und Container
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SpacingSelector
                  label="Section Padding"
                  description="Vertikaler Abstand"
                  value={designVars.spacing.scale?.xl || '6rem'}
                  onChange={(v) => updateSpacing('scale', 'xl', v)}
                  options={SECTION_PADDING_OPTIONS}
                />
                <SpacingSelector
                  label="Container Breite"
                  description="Max. Inhaltsbreite"
                  value={designVars.spacing.containerWidths?.xl || '1280px'}
                  onChange={(v) => updateSpacing('containerWidths', 'xl', v)}
                  options={CONTAINER_WIDTH_OPTIONS}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Border Radius</CardTitle>
              <CardDescription>
                Eckenradius fur Buttons, Karten und andere Elemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SpacingSelector
                  label="Standard"
                  description="Buttons, Inputs"
                  value={designVars.borders.radius?.md || '0.5rem'}
                  onChange={(v) => updateBorders('md', v)}
                  options={BORDER_RADIUS_OPTIONS}
                />
                <SpacingSelector
                  label="Gross"
                  description="Cards, Modals"
                  value={designVars.borders.radius?.lg || '0.75rem'}
                  onChange={(v) => updateBorders('lg', v)}
                  options={BORDER_RADIUS_OPTIONS}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Card className="bg-purple-500/10 border-purple-500/20 mt-8">
        <CardContent className="p-6">
          <h3 className="font-semibold text-purple-400 mb-2">
            Design Token System
          </h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>
              1. Definiere hier deine Farben, Schriften, Gradients und Abstande
            </li>
            <li>
              2. Die AI verwendet automatisch diese Tokens bei der Generierung
            </li>
            <li>
              3. Anderungen hier wirken sich auf alle generierten Seiten aus
            </li>
            <li>
              4. Referenziere Tokens im Chat mit @ (z.B. @PrimaryColor, @HeadingFont)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
