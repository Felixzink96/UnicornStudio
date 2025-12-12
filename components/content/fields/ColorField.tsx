'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { FieldWrapper, type FieldRendererProps } from './index'

export function ColorField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const [inputValue, setInputValue] = useState((value as string) || '#000000')

  const handleColorChange = (color: string) => {
    setInputValue(color)
    onChange(color)
  }

  const handleTextChange = (text: string) => {
    setInputValue(text)
    // Only update if valid hex
    if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
      onChange(text)
    }
  }

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={(value as string) || '#000000'}
          onChange={(e) => handleColorChange(e.target.value)}
          disabled={disabled}
          className="w-12 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
        />
        <Input
          value={inputValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#000000"
          disabled={disabled}
          className="bg-slate-800 border-slate-700 text-white font-mono flex-1"
        />
        {typeof value === 'string' && value && (
          <div
            className="w-10 h-10 rounded border border-slate-700"
            style={{ backgroundColor: value }}
          />
        )}
      </div>
    </FieldWrapper>
  )
}
