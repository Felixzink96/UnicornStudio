'use client'

import { Textarea } from '@/components/ui/textarea'
import { FieldWrapper, type FieldRendererProps } from './index'

export function TextareaField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}

  return (
    <FieldWrapper field={field} error={error}>
      <Textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || settings.placeholder || ''}
        rows={settings.rows || 4}
        maxLength={settings.maxLength}
        disabled={disabled}
        className="bg-slate-800 border-slate-700 text-white resize-y"
      />
      {settings.maxLength && (
        <p className="text-xs text-slate-500 text-right">
          {((value as string) || '').length} / {settings.maxLength}
        </p>
      )}
    </FieldWrapper>
  )
}
