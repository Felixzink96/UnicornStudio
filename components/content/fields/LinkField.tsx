'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldWrapper, type FieldRendererProps } from './index'

interface LinkValue {
  url: string
  text: string
  target: '_self' | '_blank'
}

export function LinkField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const linkValue: LinkValue = (value as LinkValue) || {
    url: '',
    text: '',
    target: '_self',
  }

  const updateLink = (updates: Partial<LinkValue>) => {
    onChange({ ...linkValue, ...updates })
  }

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        <Input
          value={linkValue.url}
          onChange={(e) => updateLink({ url: e.target.value })}
          placeholder="https://..."
          disabled={disabled}
          className="bg-slate-800 border-slate-700 text-white"
        />
        <Input
          value={linkValue.text}
          onChange={(e) => updateLink({ text: e.target.value })}
          placeholder="Link Text"
          disabled={disabled}
          className="bg-slate-800 border-slate-700 text-white"
        />
        <Select
          value={linkValue.target}
          onValueChange={(v: '_self' | '_blank') => updateLink({ target: v })}
          disabled={disabled}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="_self">Gleiches Fenster</SelectItem>
            <SelectItem value="_blank">Neues Fenster</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FieldWrapper>
  )
}
