'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Palette,
  Type,
  Maximize,
  Square,
  Layers,
  Save,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { updateDesignVariables, generateCSS } from '@/lib/supabase/queries/design-variables'
import type { DesignVariables } from '@/types/cms'

interface VariablesEditorProps {
  siteId: string
  initialVariables: DesignVariables
}

export function VariablesEditor({ siteId, initialVariables }: VariablesEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('colors')
  const [variables, setVariables] = useState(initialVariables)
  const [showCSSPreview, setShowCSSPreview] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateDesignVariables(siteId, variables)
      router.refresh()
    } catch (error) {
      console.error('Error saving variables:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateColor = (
    category: 'brand' | 'semantic' | 'neutral',
    key: string,
    value: string
  ) => {
    setVariables((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [category]: {
          ...prev.colors[category],
          [key]: value,
        },
      },
    }))
  }

  const addColor = (category: 'brand' | 'semantic' | 'neutral', key: string, value: string) => {
    if (!key) return
    updateColor(category, key, value)
  }

  const removeColor = (category: 'brand' | 'semantic' | 'neutral', key: string) => {
    setVariables((prev) => {
      const newCategory = { ...prev.colors[category] }
      delete newCategory[key]
      return {
        ...prev,
        colors: {
          ...prev.colors,
          [category]: newCategory,
        },
      }
    })
  }

  const copyVariableName = (name: string) => {
    navigator.clipboard.writeText(`var(${name})`)
    setCopiedVar(name)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const generatedCSS = generateCSS(variables)

  // Color palette preview
  const ColorSwatch = ({
    name,
    value,
    varName,
    onRemove,
    onChange,
  }: {
    name: string
    value: string
    varName: string
    onRemove?: () => void
    onChange: (value: string) => void
  }) => (
    <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg group">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded cursor-pointer border-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{name}</p>
        <button
          type="button"
          onClick={() => copyVariableName(varName)}
          className="text-xs text-slate-500 hover:text-slate-300 font-mono flex items-center gap-1"
        >
          {varName}
          {copiedVar === varName ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 bg-slate-900 border-slate-700 text-white font-mono text-xs"
      />
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="colors" className="data-[state=active]:bg-slate-700">
            <Palette className="h-4 w-4 mr-2" />
            Farben
          </TabsTrigger>
          <TabsTrigger value="typography" className="data-[state=active]:bg-slate-700">
            <Type className="h-4 w-4 mr-2" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="spacing" className="data-[state=active]:bg-slate-700">
            <Maximize className="h-4 w-4 mr-2" />
            Spacing
          </TabsTrigger>
          <TabsTrigger value="borders" className="data-[state=active]:bg-slate-700">
            <Square className="h-4 w-4 mr-2" />
            Borders
          </TabsTrigger>
          <TabsTrigger value="shadows" className="data-[state=active]:bg-slate-700">
            <Layers className="h-4 w-4 mr-2" />
            Shadows
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          {/* Brand Colors */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Brand Farben</CardTitle>
              <CardDescription className="text-slate-400">
                Hauptfarben deiner Marke
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(variables.colors.brand).map(([key, value]) => (
                <ColorSwatch
                  key={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={value}
                  varName={`--color-brand-${key}`}
                  onChange={(v) => updateColor('brand', key, v)}
                  onRemove={
                    !['primary', 'secondary', 'accent'].includes(key)
                      ? () => removeColor('brand', key)
                      : undefined
                  }
                />
              ))}
              <AddColorButton
                onAdd={(key, value) => addColor('brand', key, value)}
              />
            </CardContent>
          </Card>

          {/* Semantic Colors */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Semantische Farben</CardTitle>
              <CardDescription className="text-slate-400">
                Farben für Feedback und Status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(variables.colors.semantic).map(([key, value]) => (
                <ColorSwatch
                  key={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={value}
                  varName={`--color-semantic-${key}`}
                  onChange={(v) => updateColor('semantic', key, v)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Neutral Colors */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Neutrale Farben</CardTitle>
              <CardDescription className="text-slate-400">
                Grautöne für UI-Elemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(variables.colors.neutral).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <button
                      type="button"
                      onClick={() => copyVariableName(`--color-neutral-${key}`)}
                      className="w-12 h-12 rounded-lg border border-slate-700 mb-1 transition-transform hover:scale-110"
                      style={{ backgroundColor: value }}
                    />
                    <p className="text-xs text-slate-500">{key}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Schriftarten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Überschriften</Label>
                  <Input
                    value={variables.typography.fontHeading}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, fontHeading: e.target.value },
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Fließtext</Label>
                  <Input
                    value={variables.typography.fontBody}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, fontBody: e.target.value },
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Monospace</Label>
                  <Input
                    value={variables.typography.fontMono}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        typography: { ...prev.typography, fontMono: e.target.value },
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Schriftgrößen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(variables.typography.fontSizes).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-12 text-sm text-slate-400">{key}</span>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            fontSizes: { ...prev.typography.fontSizes, [key]: e.target.value },
                          },
                        }))
                      }
                      className="w-24 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                    />
                    <span
                      style={{ fontSize: value, fontFamily: variables.typography.fontBody }}
                      className="text-white"
                    >
                      Beispieltext
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Spacing Scale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(variables.spacing.scale).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-12 text-sm text-slate-400">{key}</span>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          spacing: {
                            ...prev.spacing,
                            scale: { ...prev.spacing.scale, [key]: e.target.value },
                          },
                        }))
                      }
                      className="w-24 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                    />
                    <div
                      className="bg-purple-500 h-4 rounded"
                      style={{ width: value }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Container Breiten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(variables.spacing.containerWidths).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-12 text-sm text-slate-400">{key}</span>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          spacing: {
                            ...prev.spacing,
                            containerWidths: {
                              ...prev.spacing.containerWidths,
                              [key]: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-32 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Borders Tab */}
        <TabsContent value="borders" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Border Radius</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(variables.borders.radius).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-16 h-16 bg-purple-500 mx-auto mb-2"
                      style={{ borderRadius: value }}
                    />
                    <p className="text-xs text-slate-400 mb-1">{key}</p>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          borders: {
                            ...prev.borders,
                            radius: { ...prev.borders.radius, [key]: e.target.value },
                          },
                        }))
                      }
                      className="bg-slate-800 border-slate-700 text-white font-mono text-xs text-center"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Border Breiten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(variables.borders.widths).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-slate-400">{key}</span>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          borders: {
                            ...prev.borders,
                            widths: { ...prev.borders.widths, [key]: e.target.value },
                          },
                        }))
                      }
                      className="w-24 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                    />
                    <div
                      className="flex-1 h-0 border-t border-purple-500"
                      style={{ borderWidth: value }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shadows Tab */}
        <TabsContent value="shadows" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Box Shadows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(variables.shadows).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-20 h-20 bg-slate-800 rounded-lg mx-auto mb-2"
                      style={{ boxShadow: value }}
                    />
                    <p className="text-xs text-slate-400 mb-1">{key}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setShowCSSPreview(true)}
          className="border-slate-700 text-slate-300"
        >
          CSS Preview
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Änderungen speichern
            </>
          )}
        </Button>
      </div>

      {/* CSS Preview Dialog */}
      <Dialog open={showCSSPreview} onOpenChange={setShowCSSPreview}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Generiertes CSS</DialogTitle>
          </DialogHeader>
          <pre className="p-4 bg-slate-950 rounded-lg overflow-auto text-sm text-slate-300 font-mono max-h-[60vh]">
            {generatedCSS}
          </pre>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(generatedCSS)
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            CSS kopieren
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Add Color Button Component
function AddColorButton({
  onAdd,
}: {
  onAdd: (key: string, value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('#000000')

  const handleAdd = () => {
    if (key) {
      onAdd(key.toLowerCase().replace(/\s+/g, '_'), value)
      setKey('')
      setValue('#000000')
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Farbe hinzufügen
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg">
      <input
        type="color"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-10 h-10 rounded cursor-pointer border-0"
      />
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Name"
        className="flex-1 bg-slate-900 border-slate-700 text-white"
        autoFocus
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 bg-slate-900 border-slate-700 text-white font-mono text-xs"
      />
      <Button size="sm" onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(false)}
        className="text-slate-400"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
