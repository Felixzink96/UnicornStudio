'use client'

import { Input } from '@/components/ui/input'
import { FieldWrapper, type FieldRendererProps } from './index'

export function TimeField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  return (
    <FieldWrapper field={field} error={error}>
      <Input
        type="time"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-slate-800 border-slate-700 text-white"
      />
    </FieldWrapper>
  )
}
