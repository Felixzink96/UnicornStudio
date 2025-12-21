'use client'

import { TAILWIND_BORDER_RADIUS, parseBorderRadiusClass, replaceClass } from '@/lib/editor/tailwind-styles'

interface BorderRadiusEditorProps {
  currentClasses: string
  onChange: (newClasses: string) => void
}

export function BorderRadiusEditor({ currentClasses, onChange }: BorderRadiusEditorProps) {
  const currentRadius = parseBorderRadiusClass(currentClasses)

  const handleSelect = (value: string) => {
    const pattern = /^(sm:|md:|lg:|xl:|2xl:)?rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/
    const newClasses = replaceClass(currentClasses, pattern, value)
    onChange(newClasses)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Eckenradius
      </label>
      <div className="flex flex-wrap gap-1">
        {TAILWIND_BORDER_RADIUS.map((radius) => (
          <button
            key={radius.value}
            onClick={() => handleSelect(radius.value)}
            className={`
              w-9 h-9 flex items-center justify-center rounded text-[10px] transition-all
              ${currentRadius === radius.value
                ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }
            `}
            title={radius.value}
          >
            <div
              className="w-5 h-5 bg-zinc-400 dark:bg-zinc-500"
              style={{ borderRadius: radius.preview }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
