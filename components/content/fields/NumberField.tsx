'use client'

import { Input } from '@/components/ui/input'
import { FieldWrapper, type FieldRendererProps } from './index'

export function NumberField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center">
        {settings.prefix && (
          <span className="px-3 py-2 bg-slate-700 border border-r-0 border-slate-600 rounded-l text-slate-400 text-sm">
            {settings.prefix}
          </span>
        )}
        <Input
          type="number"
          value={value !== null && value !== undefined ? String(value) : ''}
          onChange={(e) => {
            const val = e.target.value
            onChange(val === '' ? null : Number(val))
          }}
          placeholder={field.placeholder || ''}
          min={settings.min}
          max={settings.max}
          step={settings.step || 1}
          disabled={disabled}
          className={`bg-slate-800 border-slate-700 text-white ${
            settings.prefix ? 'rounded-l-none' : ''
          } ${settings.suffix ? 'rounded-r-none' : ''}`}
        />
        {settings.suffix && (
          <span className="px-3 py-2 bg-slate-700 border border-l-0 border-slate-600 rounded-r text-slate-400 text-sm">
            {settings.suffix}
          </span>
        )}
      </div>
    </FieldWrapper>
  )
}
