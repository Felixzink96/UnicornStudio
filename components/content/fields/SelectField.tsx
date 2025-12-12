'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { FieldWrapper, type FieldRendererProps } from './index'

export function SelectField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}
  const options = (settings.options as { value: string; label: string }[]) || []
  const isMultiple = settings.multiple

  if (isMultiple) {
    const selectedValues = (value as string[]) || []

    const handleToggle = (optValue: string) => {
      const isSelected = selectedValues.includes(optValue)
      onChange(
        isSelected
          ? selectedValues.filter((v) => v !== optValue)
          : [...selectedValues, optValue]
      )
    }

    const handleRemove = (optValue: string) => {
      onChange(selectedValues.filter((v) => v !== optValue))
    }

    return (
      <FieldWrapper field={field} error={error}>
        <div className="space-y-2">
          {/* Selected Items */}
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedValues.map((val) => {
                const opt = options.find((o) => o.value === val)
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
                  >
                    {opt?.label || val}
                    <button
                      type="button"
                      onClick={() => handleRemove(val)}
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
          {/* Options */}
          <div className="flex flex-wrap gap-2">
            {options
              .filter((opt) => !selectedValues.includes(opt.value))
              .map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleToggle(opt.value)}
                  disabled={disabled}
                  className="px-3 py-1 text-sm bg-slate-800 text-slate-400 rounded hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
          </div>
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
          <SelectValue placeholder={field.placeholder || 'Auswählen...'} />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}
