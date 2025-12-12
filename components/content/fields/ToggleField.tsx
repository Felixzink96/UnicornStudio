'use client'

import { Switch } from '@/components/ui/switch'
import { FieldWrapper, type FieldRendererProps } from './index'

export function ToggleField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const settings = field.settings || {}
  const labelOn = settings.labelOn || 'Ja'
  const labelOff = settings.labelOff || 'Nein'

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center gap-3">
        <Switch
          checked={(value as boolean) || false}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        <span className="text-sm text-slate-400">
          {value ? labelOn : labelOff}
        </span>
      </div>
    </FieldWrapper>
  )
}
