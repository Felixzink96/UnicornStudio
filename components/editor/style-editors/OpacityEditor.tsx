'use client'

import { useState, useEffect } from 'react'
import { TAILWIND_OPACITY, parseOpacityClass, replaceClass, findClosestOpacity } from '@/lib/editor/tailwind-styles'

interface OpacityEditorProps {
  currentClasses: string
  onChange: (newClasses: string) => void
}

export function OpacityEditor({ currentClasses, onChange }: OpacityEditorProps) {
  const currentOpacity = parseOpacityClass(currentClasses)
  const currentValue = currentOpacity
    ? TAILWIND_OPACITY.find(o => o.value === currentOpacity)?.numericValue ?? 100
    : 100

  const [sliderValue, setSliderValue] = useState<number>(currentValue)

  useEffect(() => {
    setSliderValue(currentValue)
  }, [currentValue])

  const handleChange = (value: number) => {
    setSliderValue(value)
    const closest = findClosestOpacity(value)
    const pattern = /^(sm:|md:|lg:|xl:|2xl:)?opacity-\d+$/
    // Don't add opacity-100 as it's the default
    const newClass = closest.numericValue === 100 ? '' : closest.value
    const newClasses = replaceClass(currentClasses, pattern, newClass)
    onChange(newClasses)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Deckkraft
        </label>
        <span className="text-xs text-zinc-500">{sliderValue}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={sliderValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 bg-blue-500 rounded border border-zinc-200 dark:border-zinc-700"
          style={{ opacity: sliderValue / 100 }}
        />
        <span className="text-[10px] text-zinc-400">Vorschau</span>
      </div>
    </div>
  )
}
