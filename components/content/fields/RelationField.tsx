'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Loader2 } from 'lucide-react'
import { getEntries } from '@/lib/supabase/queries/entries'
import { FieldWrapper, type FieldRendererProps } from './index'
import type { Entry } from '@/types/cms'

export function RelationField({ field, value, onChange, error, disabled, siteId }: FieldRendererProps) {
  const settings = field.settings || {}
  const contentTypeId = settings.contentType as string
  const isMultiple = settings.multiple

  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadEntries() {
      if (!contentTypeId) return

      try {
        const { entries: loadedEntries } = await getEntries({
          contentTypeId,
          status: ['published', 'draft'],
          limit: 100,
        })
        setEntries(loadedEntries)
      } catch (err) {
        console.error('Error loading entries:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [contentTypeId])

  if (isLoading) {
    return (
      <FieldWrapper field={field} error={error}>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Einträge laden...
        </div>
      </FieldWrapper>
    )
  }

  if (isMultiple) {
    const selectedIds = (value as string[]) || []

    const handleToggle = (entryId: string) => {
      const isSelected = selectedIds.includes(entryId)
      onChange(
        isSelected
          ? selectedIds.filter((id) => id !== entryId)
          : [...selectedIds, entryId]
      )
    }

    const handleRemove = (entryId: string) => {
      onChange(selectedIds.filter((id) => id !== entryId))
    }

    return (
      <FieldWrapper field={field} error={error}>
        <div className="space-y-2">
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedIds.map((id) => {
                const entry = entries.find((e) => e.id === id)
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="bg-purple-600/20 text-purple-400"
                  >
                    {entry?.title || id}
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
          <Select
            value=""
            onValueChange={(id) => handleToggle(id)}
            disabled={disabled}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Eintrag hinzufügen..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {entries
                .filter((e) => !selectedIds.includes(e.id))
                .map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.title || entry.slug || entry.id}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </FieldWrapper>
    )
  }

  return (
    <FieldWrapper field={field} error={error}>
      <Select
        value={(value as string) || ''}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Eintrag auswählen..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="">Kein Eintrag</SelectItem>
          {entries.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {entry.title || entry.slug || entry.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}
