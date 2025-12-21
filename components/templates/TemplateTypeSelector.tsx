'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  FileText,
  LayoutList,
  Tag,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TemplateType } from '@/types/cms'

interface ContentTypeOption {
  id: string
  name: string
  slug: string
  label_singular: string
  label_plural: string
  has_archive: boolean | null
  has_single: boolean | null
}

interface TemplateTypeSelectorProps {
  siteId: string
  contentTypes: ContentTypeOption[]
}

const templateTypes: {
  value: TemplateType
  label: string
  description: string
  examples: string[]
  icon: React.ReactNode
  requiresContentType: boolean
}[] = [
  {
    value: 'single',
    label: 'Einzelansicht',
    description: 'Template für die Detailseite eines einzelnen Eintrags',
    examples: [
      '/blog/mein-artikel → zeigt den kompletten Artikel',
      '/rezepte/carbonara → zeigt das Rezept mit allen Details',
      '/team/max-mustermann → zeigt die Person mit Bio, Foto etc.',
    ],
    icon: <FileText className="h-6 w-6" />,
    requiresContentType: true,
  },
  {
    value: 'archive',
    label: 'Archiv / Liste',
    description: 'Template für Übersichtsseiten mit mehreren Einträgen',
    examples: [
      '/blog → zeigt alle Artikel als Karten/Liste',
      '/rezepte → zeigt alle Rezepte mit Pagination',
      '/portfolio → zeigt alle Projekte im Grid',
    ],
    icon: <LayoutList className="h-6 w-6" />,
    requiresContentType: true,
  },
  {
    value: 'taxonomy',
    label: 'Taxonomie',
    description: 'Template für Kategorie- oder Tag-Seiten',
    examples: [
      '/kategorie/technik → zeigt alle Artikel der Kategorie',
      '/tag/javascript → zeigt alle Einträge mit diesem Tag',
      '/rezepte/kategorie/vegan → zeigt vegane Rezepte',
    ],
    icon: <Tag className="h-6 w-6" />,
    requiresContentType: true,
  },
]

export function TemplateTypeSelector({ siteId, contentTypes }: TemplateTypeSelectorProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<TemplateType | null>(null)
  const [selectedContentType, setSelectedContentType] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter content types based on template type
  const availableContentTypes = contentTypes.filter((ct) => {
    if (selectedType === 'single') return ct.has_single
    if (selectedType === 'archive') return ct.has_archive
    return true
  })

  const handleCreate = async () => {
    if (!selectedType) {
      setError('Bitte wähle einen Template-Typ')
      return
    }

    if ((selectedType === 'single' || selectedType === 'archive') && !selectedContentType) {
      setError('Bitte wähle einen Content-Type')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get content type info
      const contentType = contentTypes.find((ct) => ct.id === selectedContentType)

      // Generate auto name
      let autoName: string
      if (contentType) {
        autoName = selectedType === 'archive'
          ? `${contentType.label_plural} Archiv`
          : `${contentType.label_singular} Einzelansicht`
      } else {
        const typeLabels: Record<TemplateType, string> = {
          page: 'Seiten-Template',
          single: 'Einzelansicht-Template',
          archive: 'Archiv-Template',
          taxonomy: 'Taxonomie-Template',
        }
        autoName = typeLabels[selectedType]
      }

      // Create the template
      const { data: newTemplate, error: createError } = await supabase
        .from('templates')
        .insert({
          site_id: siteId,
          name: autoName,
          type: selectedType,
          html: '',
          conditions: selectedContentType
            ? [{ field: 'content_type_id', operator: 'equals', value: selectedContentType }]
            : [],
          is_default: false,
          priority: 0,
        })
        .select('id')
        .single()

      if (createError) {
        throw createError
      }

      // Navigate to editor
      router.push(`/dashboard/sites/${siteId}/templates/${newTemplate.id}`)
    } catch (err) {
      console.error('Failed to create template:', err)
      setError('Fehler beim Erstellen des Templates')
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    router.push(`/dashboard/sites/${siteId}/templates`)
  }

  return (
    <Card className="w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl">
      <CardHeader className="relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>
        <CardTitle className="text-2xl">Neues Template erstellen</CardTitle>
        <CardDescription>
          Wähle den Template-Typ und den zugehörigen Content-Type
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Template Type */}
        <div className="space-y-3">
          <Label className="text-base font-medium">1. Template-Typ wählen</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {templateTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedType(type.value)
                  setSelectedContentType('')
                  setError(null)
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedType === type.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`mb-2 ${selectedType === type.value ? 'text-purple-600' : 'text-zinc-500'}`}>
                  {type.icon}
                </div>
                <div className="font-medium text-zinc-900 dark:text-white">
                  {type.label}
                </div>
                <div className="text-xs text-zinc-500 mt-1 mb-2">
                  {type.description}
                </div>
                <div className="space-y-0.5">
                  {type.examples.slice(0, 2).map((example, i) => (
                    <div key={i} className="text-[10px] text-zinc-400 font-mono truncate">
                      {example}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Content Type */}
        {selectedType && (selectedType === 'single' || selectedType === 'archive' || selectedType === 'taxonomy') && (
          <div className="space-y-3">
            <Label className="text-base font-medium">2. Content-Type wählen</Label>
            {availableContentTypes.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm">
                Keine Content-Types mit {selectedType === 'archive' ? 'Archiv' : 'Einzelansicht'} verfügbar.
                Erstelle erst einen Content-Type oder aktiviere die entsprechende Option.
              </div>
            ) : (
              <Select value={selectedContentType} onValueChange={(v) => {
                setSelectedContentType(v)
                setError(null)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Content-Type auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableContentTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ct.label_plural}</span>
                        <span className="text-zinc-500 text-xs">({ct.slug})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Preview what will be created */}
        {selectedType && (selectedContentType || selectedType === 'page') && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <div className="text-sm text-zinc-500 mb-1">Template wird erstellt:</div>
            <div className="font-medium text-zinc-900 dark:text-white">
              {(() => {
                const ct = contentTypes.find((c) => c.id === selectedContentType)
                if (ct) {
                  return selectedType === 'archive'
                    ? `${ct.label_plural} Archiv`
                    : `${ct.label_singular} Einzelansicht`
                }
                return selectedType === 'page' ? 'Seiten-Template' : 'Template'
              })()}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {selectedType === 'single' && '→ Zeigt einen einzelnen Eintrag mit allen Details'}
              {selectedType === 'archive' && '→ Zeigt eine Liste/Grid aller Einträge mit Pagination'}
              {selectedType === 'taxonomy' && '→ Zeigt Einträge gefiltert nach Kategorie/Tag'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedType || isCreating || (selectedType !== 'page' && !selectedContentType)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Erstelle...
              </>
            ) : (
              <>
                Template erstellen
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
