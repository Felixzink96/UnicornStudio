'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sparkles,
  Send,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
} from 'lucide-react'
import { FIELD_TYPES } from '@/lib/content/field-types'
import type { Field, FieldInsert, FieldType, SubField } from '@/types/cms'

interface GeneratedField {
  name: string
  label: string
  type: FieldType
  instructions?: string
  placeholder?: string
  required?: boolean
  settings?: Record<string, unknown>
  sub_fields?: SubField[]
  width?: '100%' | '50%' | '33%' | '25%'
}

interface FieldBuilderChatProps {
  siteId: string
  contentTypeId: string
  contentTypeName?: string
  existingFields: Field[]
  onFieldsGenerated: (fields: FieldInsert[]) => Promise<void>
}

export function FieldBuilderChat({
  siteId,
  contentTypeId,
  contentTypeName,
  existingFields,
  onFieldsGenerated,
}: FieldBuilderChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedFields, setGeneratedFields] = useState<GeneratedField[]>([])
  const [aiMessage, setAiMessage] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set())
  const [expandedFields, setExpandedFields] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Example prompts
  const examplePrompts = [
    'Ich brauche Felder für Rezepte mit Zutaten, Zubereitungszeit und Schritt-für-Schritt Anleitung',
    'Erstelle Felder für Produkte mit Preis, Beschreibung, Galerie und Varianten',
    'Ich möchte Team-Mitglieder mit Foto, Bio, Position und Social Links speichern',
    'Felder für Blog-Beiträge mit Lesezeit, Autor und verwandten Artikeln',
    'FAQ-Felder mit Fragen und Antworten',
  ]

  // Handle prompt submission
  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setGeneratedFields([])
    setAiMessage('')
    setSuggestions([])

    try {
      const response = await fetch('/api/ai/generate-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          contentTypeName,
          contentTypeId,
          siteId,
          existingFields: existingFields.map(f => ({
            name: f.name,
            label: f.label,
            type: f.type,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Feldgenerierung')
      }

      if (data.fields && data.fields.length > 0) {
        setGeneratedFields(data.fields)
        setAiMessage(data.message || '')
        setSuggestions(data.suggestions || [])
        // Select all fields by default
        setSelectedFields(new Set(data.fields.map((_: unknown, i: number) => i)))
      } else {
        setError('Keine Felder generiert. Versuche es mit einer anderen Beschreibung.')
      }
    } catch (err) {
      console.error('Field generation error:', err)
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle field selection
  const toggleFieldSelection = (index: number) => {
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Toggle field expansion
  const toggleFieldExpansion = (index: number) => {
    setExpandedFields(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Apply selected fields
  const handleApplyFields = async () => {
    const fieldsToAdd = generatedFields.filter((_, index) => selectedFields.has(index))

    if (fieldsToAdd.length === 0) {
      setError('Wähle mindestens ein Feld aus')
      return
    }

    setIsLoading(true)

    try {
      const fieldInserts: FieldInsert[] = fieldsToAdd.map((field, index) => ({
        site_id: siteId,
        content_type_id: contentTypeId,
        name: field.name,
        label: field.label,
        type: field.type,
        instructions: field.instructions,
        placeholder: field.placeholder,
        required: field.required || false,
        settings: (field.settings || {}) as FieldInsert['settings'],
        sub_fields: field.sub_fields,
        width: field.width || '100%',
        position: existingFields.length + index,
      }))

      await onFieldsGenerated(fieldInserts)

      // Reset state
      setIsOpen(false)
      setPrompt('')
      setGeneratedFields([])
      setSelectedFields(new Set())
      setExpandedFields(new Set())
      setAiMessage('')
      setSuggestions([])
    } catch (err) {
      console.error('Error applying fields:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Felder')
    } finally {
      setIsLoading(false)
    }
  }

  // Use example prompt
  const useExamplePrompt = (example: string) => {
    setPrompt(example)
    textareaRef.current?.focus()
  }

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-purple-500/50 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Mit KI generieren
      </Button>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Felder mit KI generieren
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Beschreibe welche Felder du brauchst und die KI erstellt sie für dich.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Input Area */}
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="z.B. Ich brauche Felder für Rezepte mit Zutaten, Zubereitungszeit und Anleitung..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] resize-none"
                disabled={isLoading}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Drücke <kbd className="px-1 py-0.5 bg-slate-800 rounded">⌘</kbd> + <kbd className="px-1 py-0.5 bg-slate-800 rounded">Enter</kbd> zum Senden
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Generieren
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Example Prompts */}
            {!generatedFields.length && !isLoading && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Beispiele:</p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => useExamplePrompt(example)}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                    >
                      {example.length > 50 ? example.slice(0, 50) + '...' : example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* AI Message */}
            {aiMessage && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-purple-300 text-sm">{aiMessage}</p>
              </div>
            )}

            {/* Generated Fields */}
            {generatedFields.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-medium">
                    Generierte Felder ({selectedFields.size} von {generatedFields.length} ausgewählt)
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFields(new Set(generatedFields.map((_, i) => i)))}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Alle auswählen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFields(new Set())}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Keine
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {generatedFields.map((field, index) => {
                    const fieldConfig = FIELD_TYPES[field.type]
                    const Icon = fieldConfig?.icon || Layers
                    const isSelected = selectedFields.has(index)
                    const isExpanded = expandedFields.has(index)
                    const hasSubFields = (field.type === 'group' || field.type === 'repeater') && field.sub_fields?.length

                    return (
                      <div
                        key={index}
                        className={`bg-slate-800 border rounded-lg transition-all ${
                          isSelected ? 'border-purple-500' : 'border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleFieldSelection(index)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-purple-600 border-purple-600'
                                : 'border-slate-600 hover:border-purple-500'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </button>

                          {/* Icon */}
                          <div className="p-1.5 bg-slate-700 rounded">
                            <Icon className="h-4 w-4 text-purple-400" />
                          </div>

                          {/* Field Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">{field.label}</span>
                              {field.required && (
                                <Badge className="bg-red-500/20 text-red-400 text-xs">
                                  Erforderlich
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500 font-mono">{field.name}</span>
                              <span className="text-slate-700">•</span>
                              <span className="text-xs text-slate-500">{fieldConfig?.label || field.type}</span>
                            </div>
                          </div>

                          {/* Width Badge */}
                          {field.width && field.width !== '100%' && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              {field.width}
                            </Badge>
                          )}

                          {/* Expand Button for groups/repeaters */}
                          {hasSubFields && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFieldExpansion(index)}
                              className="text-slate-400 hover:text-white"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Instructions */}
                        {field.instructions && (
                          <p className="px-3 pb-2 text-xs text-slate-500 border-t border-slate-700 pt-2 mx-3">
                            {field.instructions}
                          </p>
                        )}

                        {/* Sub-fields */}
                        {hasSubFields && isExpanded && (
                          <div className="border-t border-slate-700 bg-slate-850 p-3 space-y-2">
                            <p className="text-xs text-slate-500 mb-2">Unterfelder:</p>
                            {field.sub_fields?.map((subField, subIndex) => {
                              const subConfig = FIELD_TYPES[subField.type]
                              const SubIcon = subConfig?.icon || Layers

                              return (
                                <div
                                  key={subIndex}
                                  className="flex items-center gap-2 p-2 bg-slate-700/50 rounded"
                                >
                                  <SubIcon className="h-3 w-3 text-slate-500" />
                                  <span className="text-sm text-slate-300">{subField.label}</span>
                                  <span className="text-xs text-slate-500 font-mono">{subField.name}</span>
                                  {subField.required && (
                                    <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                                      *
                                    </Badge>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Vorschläge für weitere Felder:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => useExamplePrompt(suggestion)}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {generatedFields.length > 0 && (
            <DialogFooter className="border-t border-slate-700 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setGeneratedFields([])
                  setSelectedFields(new Set())
                  setExpandedFields(new Set())
                  setAiMessage('')
                  setSuggestions([])
                }}
                className="text-slate-400"
              >
                Zurücksetzen
              </Button>
              <Button
                onClick={handleApplyFields}
                disabled={selectedFields.size === 0 || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {selectedFields.size} Felder hinzufügen
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
