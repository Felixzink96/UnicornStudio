'use client'

import { useState } from 'react'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Braces,
  FileText,
  Image,
  Calendar,
  User,
  Tag,
  List,
  Hash,
  Type,
  ToggleLeft,
} from 'lucide-react'

interface VariableGroup {
  name: string
  description: string
  variables: Variable[]
}

interface Variable {
  name: string
  type: string
  description: string
  example?: string
}

export function TemplateVariablesPanel() {
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['entry', 'entries'])
  const [searchQuery, setSearchQuery] = useState('')

  const templateType = useTemplateEditorStore((s) => s.templateType)
  const contentType = useTemplateEditorStore((s) => s.contentType)
  const fields = useTemplateEditorStore((s) => s.fields)
  const toggleVariablesPanel = useTemplateEditorStore((s) => s.toggleVariablesPanel)

  // Copy variable to clipboard
  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable)
    setCopiedVar(variable)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName]
    )
  }

  // Build variable groups based on template type
  const getVariableGroups = (): VariableGroup[] => {
    const groups: VariableGroup[] = []

    if (templateType === 'single') {
      // Entry variables
      groups.push({
        name: 'entry',
        description: 'Eintragsdaten',
        variables: [
          { name: '{{entry.title}}', type: 'text', description: 'Titel des Eintrags' },
          { name: '{{entry.slug}}', type: 'text', description: 'URL-Slug' },
          { name: '{{{entry.content}}}', type: 'html', description: 'Hauptinhalt (HTML)' },
          { name: '{{entry.excerpt}}', type: 'text', description: 'Kurzbeschreibung' },
          { name: '{{entry.featured_image}}', type: 'image', description: 'Beitragsbild URL' },
          { name: '{{entry.author}}', type: 'text', description: 'Autor Name' },
          { name: '{{entry.published_at}}', type: 'date', description: 'Veröffentlichungsdatum' },
          { name: '{{entry.url}}', type: 'text', description: 'Vollständige URL' },
        ],
      })

      // Related entries
      groups.push({
        name: 'related',
        description: 'Ähnliche Einträge',
        variables: [
          { name: '{{#each related_entries}}', type: 'loop', description: 'Loop über ähnliche Einträge' },
          { name: '{{title}}', type: 'text', description: 'Titel (innerhalb Loop)' },
          { name: '{{excerpt}}', type: 'text', description: 'Auszug (innerhalb Loop)' },
          { name: '{{url}}', type: 'text', description: 'URL (innerhalb Loop)' },
          { name: '{{/each}}', type: 'loop', description: 'Loop Ende' },
        ],
      })
    }

    if (templateType === 'archive') {
      // Entries loop
      groups.push({
        name: 'entries',
        description: 'Einträge-Liste',
        variables: [
          { name: '{{#each entries}}', type: 'loop', description: 'Loop über alle Einträge' },
          { name: '{{title}}', type: 'text', description: 'Titel (innerhalb Loop)' },
          { name: '{{excerpt}}', type: 'text', description: 'Auszug (innerhalb Loop)' },
          { name: '{{featured_image}}', type: 'image', description: 'Bild URL (innerhalb Loop)' },
          { name: '{{author}}', type: 'text', description: 'Autor (innerhalb Loop)' },
          { name: '{{published_at}}', type: 'date', description: 'Datum (innerhalb Loop)' },
          { name: '{{url}}', type: 'text', description: 'URL (innerhalb Loop)' },
          { name: '{{@index}}', type: 'number', description: 'Index (0-basiert)' },
          { name: '{{/each}}', type: 'loop', description: 'Loop Ende' },
        ],
      })

      // Pagination
      groups.push({
        name: 'pagination',
        description: 'Seitennavigation',
        variables: [
          { name: '{{#if pagination}}', type: 'condition', description: 'Wenn Pagination vorhanden' },
          { name: '{{pagination.current}}', type: 'number', description: 'Aktuelle Seite' },
          { name: '{{pagination.total}}', type: 'number', description: 'Gesamtseiten' },
          { name: '{{pagination.prev}}', type: 'text', description: 'Vorherige Seite URL' },
          { name: '{{pagination.next}}', type: 'text', description: 'Nächste Seite URL' },
          { name: '{{/if}}', type: 'condition', description: 'Bedingung Ende' },
        ],
      })
    }

    // Custom fields from content type
    if (fields.length > 0) {
      const fieldVars: Variable[] = fields.map((field) => ({
        name: templateType === 'single'
          ? `{{entry.data.${field.name}}}`
          : `{{data.${field.name}}}`,
        type: field.type,
        description: field.label,
      }))

      groups.push({
        name: 'fields',
        description: 'Benutzerdefinierte Felder',
        variables: fieldVars,
      })
    }

    // Helpers
    groups.push({
      name: 'helpers',
      description: 'Hilfsfunktionen',
      variables: [
        { name: '{{formatDate published_at "DD.MM.YYYY"}}', type: 'helper', description: 'Datum formatieren' },
        { name: '{{truncate text 100}}', type: 'helper', description: 'Text kürzen' },
        { name: '{{#if condition}}...{{/if}}', type: 'helper', description: 'Bedingung' },
        { name: '{{#unless condition}}...{{/unless}}', type: 'helper', description: 'Negierte Bedingung' },
        { name: '{{#each array}}...{{/each}}', type: 'helper', description: 'Array durchlaufen' },
      ],
    })

    return groups
  }

  // Get icon for variable type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="h-3 w-3" />
      case 'html':
        return <FileText className="h-3 w-3" />
      case 'image':
        return <Image className="h-3 w-3" />
      case 'date':
        return <Calendar className="h-3 w-3" />
      case 'number':
        return <Hash className="h-3 w-3" />
      case 'loop':
        return <List className="h-3 w-3" />
      case 'condition':
        return <ToggleLeft className="h-3 w-3" />
      case 'helper':
        return <Braces className="h-3 w-3" />
      default:
        return <Tag className="h-3 w-3" />
    }
  }

  const variableGroups = getVariableGroups()

  // Filter variables by search
  const filteredGroups = variableGroups.map((group) => ({
    ...group,
    variables: group.variables.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((g) => g.variables.length > 0)

  return (
    <div className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Braces className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-zinc-900 dark:text-white">
            Template-Variablen
          </span>
        </div>
        <button
          onClick={toggleVariablesPanel}
          className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Variablen suchen..."
          className="h-8 text-sm"
        />
      </div>

      {/* Content Type Info */}
      {contentType && (
        <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Content-Type: <strong>{contentType.label_plural}</strong>
          </div>
        </div>
      )}

      {/* Variable Groups */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.map((group) => (
          <div key={group.name} className="border-b border-zinc-100 dark:border-zinc-800">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.name)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedGroups.includes(group.name) ? (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                )}
                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                  {group.description}
                </span>
              </div>
              <span className="text-xs text-zinc-500">{group.variables.length}</span>
            </button>

            {/* Variables */}
            {expandedGroups.includes(group.name) && (
              <div className="pb-2">
                {group.variables.map((variable, idx) => (
                  <div
                    key={idx}
                    className="mx-2 px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 group cursor-pointer transition-colors"
                    onClick={() => copyVariable(variable.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-400">
                          {getTypeIcon(variable.type)}
                        </span>
                        <code className="text-xs text-purple-600 dark:text-purple-400 font-mono truncate">
                          {variable.name}
                        </code>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedVar === variable.name ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-zinc-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 pl-5 truncate">
                      {variable.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Hint */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <p className="text-xs text-zinc-500 text-center">
          Klicken zum Kopieren
        </p>
      </div>
    </div>
  )
}
