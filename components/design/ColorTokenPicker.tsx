'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ColorTokenPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
}

// Predefined color palette
const COLOR_PALETTE = [
  // Blues
  '#2563eb', '#3b82f6', '#60a5fa', '#1d4ed8', '#1e40af',
  // Indigos
  '#4f46e5', '#6366f1', '#818cf8', '#4338ca', '#3730a3',
  // Purples
  '#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9', '#5b21b6',
  // Pinks
  '#db2777', '#ec4899', '#f472b6', '#be185d', '#9d174d',
  // Reds
  '#dc2626', '#ef4444', '#f87171', '#b91c1c', '#991b1b',
  // Oranges
  '#ea580c', '#f97316', '#fb923c', '#c2410c', '#9a3412',
  // Yellows/Ambers
  '#d97706', '#f59e0b', '#fbbf24', '#b45309', '#92400e',
  // Greens
  '#16a34a', '#22c55e', '#4ade80', '#15803d', '#166534',
  // Teals
  '#0d9488', '#14b8a6', '#2dd4bf', '#0f766e', '#115e59',
  // Cyans
  '#0891b2', '#06b6d4', '#22d3ee', '#0e7490', '#155e75',
  // Grays
  '#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a',
  '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5', '#fafafa',
  // White/Black
  '#ffffff', '#000000',
]

export function ColorTokenPicker({
  label,
  value,
  onChange,
  description,
}: ColorTokenPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Only update if it's a valid hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue)
    }
  }

  const handleColorSelect = (color: string) => {
    setInputValue(color)
    onChange(color)
    setIsOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-9 w-9 rounded-md border shadow-sm',
                'hover:ring-2 hover:ring-ring hover:ring-offset-2',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-all'
              )}
              style={{ backgroundColor: value }}
              aria-label={`Choose ${label} color`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="text-sm font-medium">Farbe wählen</div>
              <div className="grid grid-cols-10 gap-1">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-5 w-5 rounded-sm border border-border/50',
                      'hover:scale-110 hover:ring-1 hover:ring-ring',
                      'transition-transform',
                      value === color && 'ring-2 ring-ring ring-offset-1'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>

              {/* Native color picker */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <label className="text-xs text-muted-foreground">
                  Eigene Farbe:
                </label>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border-0 p-0"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
          maxLength={7}
        />
      </div>
    </div>
  )
}

export default ColorTokenPicker
