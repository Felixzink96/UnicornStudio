'use client'

import { Input } from '@/components/ui/input'
import { Link } from 'lucide-react'
import { FieldWrapper, type FieldRendererProps } from './index'

export function UrlField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  return (
    <FieldWrapper field={field} error={error}>
      <div className="relative">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          type="url"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://...'}
          disabled={disabled}
          className="bg-slate-800 border-slate-700 text-white pl-10"
        />
      </div>
    </FieldWrapper>
  )
}
