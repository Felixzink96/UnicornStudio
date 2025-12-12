'use client'

import { FieldWrapper, type FieldRendererProps } from './index'

export function CheckboxField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}
  const options = (settings.options as { value: string; label: string }[]) || []
  const selectedValues = (value as string[]) || []

  const handleToggle = (optValue: string) => {
    const isSelected = selectedValues.includes(optValue)
    onChange(
      isSelected
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue]
    )
  }

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 cursor-pointer ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="checkbox"
              value={opt.value}
              checked={selectedValues.includes(opt.value)}
              onChange={() => handleToggle(opt.value)}
              disabled={disabled}
              className="w-4 h-4 rounded text-purple-600 border-slate-600 bg-slate-800 focus:ring-purple-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">{opt.label}</span>
          </label>
        ))}
      </div>
    </FieldWrapper>
  )
}
