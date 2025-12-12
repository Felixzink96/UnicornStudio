'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus, Loader2 } from 'lucide-react'
import { getTerms, createTerm } from '@/lib/supabase/queries/taxonomies'
import { FieldWrapper, type FieldRendererProps } from './index'
import type { Term } from '@/types/cms'

export function TaxonomyField({ field, value, onChange, error, disabled, siteId }: FieldRendererProps) {
  const settings = field.settings || {}
  const taxonomyId = settings.taxonomy as string
  const isMultiple = settings.multiple !== false
  const canCreate = settings.createNew !== false

  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTermName, setNewTermName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const selectedIds = isMultiple
    ? ((value as string[]) || [])
    : value
    ? [value as string]
    : []

  useEffect(() => {
    async function loadTerms() {
      if (!taxonomyId) return

      try {
        const loadedTerms = await getTerms(taxonomyId)
        setTerms(loadedTerms)
      } catch (err) {
        console.error('Error loading terms:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTerms()
  }, [taxonomyId])

  const handleToggle = (termId: string) => {
    if (isMultiple) {
      const isSelected = selectedIds.includes(termId)
      onChange(
        isSelected
          ? selectedIds.filter((id) => id !== termId)
          : [...selectedIds, termId]
      )
    } else {
      onChange(termId === selectedIds[0] ? null : termId)
    }
  }

  const handleRemove = (termId: string) => {
    if (isMultiple) {
      onChange(selectedIds.filter((id) => id !== termId))
    } else {
      onChange(null)
    }
  }

  const handleCreateTerm = async () => {
    if (!newTermName.trim() || !taxonomyId) return

    setIsCreating(true)
    try {
      const slug = newTermName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const newTerm = await createTerm({
        taxonomy_id: taxonomyId,
        name: newTermName,
        slug,
      })

      setTerms((prev) => [...prev, newTerm])
      handleToggle(newTerm.id)
      setNewTermName('')
    } catch (err) {
      console.error('Error creating term:', err)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <FieldWrapper field={field} error={error}>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Begriffe laden...
        </div>
      </FieldWrapper>
    )
  }

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        {/* Selected Terms */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => {
              const term = terms.find((t) => t.id === id)
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
                >
                  {term?.name || id}
                  <button
                    type="button"
                    onClick={() => handleRemove(id)}
                    disabled={disabled}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* Available Terms */}
        <div className="flex flex-wrap gap-2">
          {terms
            .filter((t) => !selectedIds.includes(t.id))
            .map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={() => handleToggle(term.id)}
                disabled={disabled}
                className="px-3 py-1 text-sm bg-slate-800 text-slate-400 rounded hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              >
                {term.name}
              </button>
            ))}
        </div>

        {/* Create New Term */}
        {canCreate && (
          <div className="flex gap-2">
            <Input
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              placeholder="Neuen Begriff erstellen..."
              disabled={disabled || isCreating}
              className="bg-slate-800 border-slate-700 text-white flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateTerm()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCreateTerm}
              disabled={disabled || isCreating || !newTermName.trim()}
              className="border-slate-700"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}
