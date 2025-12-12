'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { FieldRenderer, FieldWrapper, type FieldRendererProps } from './index'
import type { Field, SubField } from '@/types/cms'

export function RepeaterField({ field, value, onChange, error, disabled, siteId }: FieldRendererProps) {
  const settings = field.settings || {}
  const subFields = field.sub_fields || []
  const buttonLabel = (settings.buttonLabel as string) || 'Eintrag hinzufügen'
  const minRows = settings.minRows as number | undefined
  const maxRows = settings.maxRows as number | undefined

  const rows = (value as Record<string, unknown>[]) || []
  const [expandedRows, setExpandedRows] = useState<Set<number>>(
    new Set(rows.map((_, i) => i))
  )

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const addRow = () => {
    const newRow: Record<string, unknown> = {}
    subFields.forEach((sf) => {
      newRow[sf.name] = undefined
    })
    onChange([...rows, newRow])
    setExpandedRows((prev) => new Set([...prev, rows.length]))
  }

  const removeRow = (index: number) => {
    const newRows = [...rows]
    newRows.splice(index, 1)
    onChange(newRows)
  }

  const updateRow = (index: number, subFieldName: string, subValue: unknown) => {
    const newRows = [...rows]
    newRows[index] = {
      ...newRows[index],
      [subFieldName]: subValue,
    }
    onChange(newRows)
  }

  const moveRow = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rows.length) return
    const newRows = [...rows]
    const [removed] = newRows.splice(fromIndex, 1)
    newRows.splice(toIndex, 0, removed)
    onChange(newRows)
  }

  const canAddMore = !maxRows || rows.length < maxRows
  const canRemove = !minRows || rows.length > minRows

  // Convert SubField to Field for rendering
  const subFieldToField = (subField: SubField, rowIndex: number, subIndex: number): Field => ({
    id: `${field.id}-${rowIndex}-${subIndex}`,
    site_id: '',
    content_type_id: '',
    name: subField.name,
    label: subField.label,
    type: subField.type,
    instructions: subField.instructions || null,
    placeholder: subField.placeholder || null,
    required: subField.required || false,
    settings: subField.settings || {},
    sub_fields: null,
    layouts: null,
    conditions: null,
    width: subField.width || '100%',
    position: subIndex,
    created_at: '',
    updated_at: '',
  })

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        {rows.map((row, rowIndex) => {
          const isExpanded = expandedRows.has(rowIndex)
          const rowPreview = Object.values(row)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')

          return (
            <Card key={rowIndex} className="bg-slate-800 border-slate-700">
              {/* Row Header */}
              <div
                className="flex items-center gap-2 p-3 cursor-pointer"
                onClick={() => toggleRow(rowIndex)}
              >
                <div
                  className="cursor-move text-slate-600 hover:text-slate-400"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    // Simple drag hint
                    e.currentTarget.style.cursor = 'grabbing'
                  }}
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <span className="flex-1 text-sm text-slate-300">
                  Eintrag {rowIndex + 1}
                  {!isExpanded && rowPreview && (
                    <span className="text-slate-500 ml-2">— {rowPreview}</span>
                  )}
                </span>
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRow(rowIndex)
                    }}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Row Content */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="flex flex-wrap gap-4 border-t border-slate-700 pt-4">
                    {subFields.map((subField, subIndex) => (
                      <div
                        key={subIndex}
                        style={{
                          width:
                            subField.width === '100%'
                              ? '100%'
                              : `calc(${subField.width} - 1rem)`,
                        }}
                      >
                        <FieldRenderer
                          field={subFieldToField(subField, rowIndex, subIndex)}
                          value={row[subField.name]}
                          onChange={(v) => updateRow(rowIndex, subField.name, v)}
                          disabled={disabled}
                          siteId={siteId}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}

        {/* Add Button */}
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            disabled={disabled}
            className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {buttonLabel}
          </Button>
        )}

        {/* Counter */}
        <p className="text-xs text-slate-500">
          {rows.length} Einträge
          {minRows && ` (mind. ${minRows})`}
          {maxRows && ` (max. ${maxRows})`}
        </p>
      </div>
    </FieldWrapper>
  )
}
