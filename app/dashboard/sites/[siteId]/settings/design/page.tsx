'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Palette, Type, Ruler, Save, Loader2, RotateCcw, Download } from 'lucide-react'
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

export default function DesignSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.siteId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [designVars, setDesignVars] = useState<DesignVariables | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Load design variables
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // Load site name
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', siteId)
        .single()

      if (site) {
        setSiteName(site.name)
      }

      // Load design variables (creates defaults if not exists)
      const { data: vars, error } = await supabase
        .from('design_variables')
        .select('*')
        .eq('site_id', siteId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No record, create one
        const { data: newVars } = await supabase
          .from('design_variables')
          .insert({ site_id: siteId })
          .select()
          .single()

        setDesignVars(newVars as unknown as DesignVariables)
      } else if (vars) {
        setDesignVars(vars as unknown as DesignVariables)
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

    // Delete and recreate with defaults
    await supabase.from('design_variables').delete().eq('site_id', siteId)
    const { data: newVars } = await supabase
      .from('design_variables')
      .insert({ site_id: siteId })
      .select()
      .single()

    setDesignVars(newVars as unknown as DesignVariables)
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
    <div className="p-8 max-w-4xl mx-auto">
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
            Zentrale Design-Tokens fur konsistente Generierung
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Zurucksetzen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
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
        <TabsContent value="colors">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Markenfarben</CardTitle>
              <CardDescription>
                Diese Farben werden von der AI fur Buttons, CTAs und Akzente verwendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ColorTokenPicker
                  label="Primary"
                  description="Buttons, CTAs, Links"
                  value={designVars.colors.brand.primary}
                  onChange={(v) => updateColor('brand', 'primary', v)}
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

          <Card className="bg-slate-900 border-slate-800 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Neutrale Farben</CardTitle>
              <CardDescription>
                Hintergrunde, Text und Rahmen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Schriftarten</CardTitle>
              <CardDescription>
                Diese Schriften werden fur Uberschriften und Fliesstext verwendet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              <Separator />

              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <Download className="h-4 w-4" />
                  DSGVO-konforme Fonts
                </div>
                <p className="text-xs text-slate-500">
                  Google Fonts werden automatisch heruntergeladen und lokal gehostet,
                  wenn du den Design System Dialog nach einer AI-Generierung bestatigst.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Abstande</CardTitle>
              <CardDescription>
                Standardabstande fur Sections und Container.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

          <Card className="bg-slate-900 border-slate-800 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Border Radius</CardTitle>
              <CardDescription>
                Eckenradius fur Buttons, Karten und andere Elemente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
            Wie funktioniert das Design Token System?
          </h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>
              1. Du definierst hier deine Farben, Schriften und Abstande.
            </li>
            <li>
              2. Die AI verwendet automatisch Token-Klassen wie <code className="text-purple-400">bg-primary</code> statt <code className="text-slate-500">bg-blue-600</code>.
            </li>
            <li>
              3. Wenn du eine Farbe anderst, wird sie auf ALLEN Seiten automatisch aktualisiert.
            </li>
            <li>
              4. Beim Export werden CSS Variables generiert, die du zentral andern kannst.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
