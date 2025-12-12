'use client'

import { FieldWrapper, type FieldRendererProps } from './index'

export function RadioField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}
  const options = (settings.options as { value: string; label: string }[]) || []
  const layout = settings.layout || 'vertical'

  return (
    <FieldWrapper field={field} error={error}>
      <div
        className={`flex gap-3 ${
          layout === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'
        }`}
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 cursor-pointer ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="radio"
              name={field.name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-4 h-4 text-purple-600 border-slate-600 bg-slate-800 focus:ring-purple-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">{opt.label}</span>
          </label>
        ))}
      </div>
    </FieldWrapper>
  )
}
