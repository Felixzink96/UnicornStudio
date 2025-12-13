'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SpacingSelectorProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  description?: string
}

export function SpacingSelector({
  label,
  value,
  onChange,
  options,
  description,
}: SpacingSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Wählen..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Predefined options for common settings
export const SECTION_PADDING_OPTIONS = [
  { value: '3rem', label: 'Klein (3rem / 48px)' },
  { value: '4rem', label: 'Mittel (4rem / 64px)' },
  { value: '6rem', label: 'Groß (6rem / 96px)' },
  { value: '8rem', label: 'Extra Groß (8rem / 128px)' },
]

export const CONTAINER_WIDTH_OPTIONS = [
  { value: '896px', label: 'Schmal (896px / max-w-4xl)' },
  { value: '1024px', label: 'Mittel (1024px / max-w-5xl)' },
  { value: '1152px', label: 'Breit (1152px / max-w-6xl)' },
  { value: '1280px', label: 'Extra Breit (1280px / max-w-7xl)' },
]

export const CARD_GAP_OPTIONS = [
  { value: '1rem', label: 'Klein (1rem / 16px)' },
  { value: '1.5rem', label: 'Mittel (1.5rem / 24px)' },
  { value: '2rem', label: 'Groß (2rem / 32px)' },
  { value: '3rem', label: 'Extra Groß (3rem / 48px)' },
]

export const BORDER_RADIUS_OPTIONS = [
  { value: '0', label: 'Keine (0)' },
  { value: '0.25rem', label: 'Klein (0.25rem / 4px)' },
  { value: '0.5rem', label: 'Mittel (0.5rem / 8px)' },
  { value: '0.75rem', label: 'Groß (0.75rem / 12px)' },
  { value: '1rem', label: 'Extra Groß (1rem / 16px)' },
]

export default SpacingSelector
