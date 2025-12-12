'use client'

import { Slider } from '@/components/ui/slider'
import { FieldWrapper, type FieldRendererProps } from './index'

export function RangeField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}
  const min = settings.min ?? 0
  const max = settings.max ?? 100
  const step = settings.step ?? 1
  const currentValue = (value as number) ?? (min + max) / 2

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center gap-4">
        <Slider
          value={[currentValue]}
          onValueChange={([val]) => onChange(val)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-sm text-white bg-slate-800 px-3 py-1 rounded min-w-[60px] text-center">
          {currentValue}
        </span>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </FieldWrapper>
  )
}
