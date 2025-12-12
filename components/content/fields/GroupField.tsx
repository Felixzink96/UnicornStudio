'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldRenderer, FieldWrapper, type FieldRendererProps } from './index'
import type { Field, SubField } from '@/types/cms'

export function GroupField({ field, value, onChange, error, disabled, siteId }: FieldRendererProps) {
  const subFields = field.sub_fields || []
  const groupValue = (value as Record<string, unknown>) || {}

  const handleSubFieldChange = (subFieldName: string, subValue: unknown) => {
    onChange({
      ...groupValue,
      [subFieldName]: subValue,
    })
  }

  // Convert SubField to Field for rendering
  const subFieldToField = (subField: SubField, index: number): Field => ({
    id: `${field.id}-${index}`,
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
    position: index,
    created_at: '',
    updated_at: '',
  })

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center justify-between">
          {field.label}
          {field.required && <span className="text-red-400 text-sm">*</span>}
        </CardTitle>
        {field.instructions && (
          <p className="text-xs text-slate-500">{field.instructions}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          {subFields.map((subField, index) => (
            <div
              key={index}
              style={{
                width:
                  subField.width === '100%'
                    ? '100%'
                    : `calc(${subField.width} - 1rem)`,
              }}
            >
              <FieldRenderer
                field={subFieldToField(subField, index)}
                value={groupValue[subField.name]}
                onChange={(v) => handleSubFieldChange(subField.name, v)}
                disabled={disabled}
                siteId={siteId}
              />
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
