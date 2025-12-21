'use client'

import { TAILWIND_SHADOWS, parseShadowClass, replaceClass } from '@/lib/editor/tailwind-styles'

interface ShadowEditorProps {
  currentClasses: string
  onChange: (newClasses: string) => void
}

export function ShadowEditor({ currentClasses, onChange }: ShadowEditorProps) {
  const currentShadow = parseShadowClass(currentClasses)

  const handleSelect = (value: string) => {
    const pattern = /^(sm:|md:|lg:|xl:|2xl:)?shadow(-none|-sm|-md|-lg|-xl|-2xl)?$/
    const newClasses = replaceClass(currentClasses, pattern, value)
    onChange(newClasses)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Schatten
      </label>
      <div className="grid grid-cols-4 gap-1">
        {TAILWIND_SHADOWS.map((shadow) => (
          <button
            key={shadow.value}
            onClick={() => handleSelect(shadow.value)}
            className={`
              p-2 rounded border text-[10px] transition-all
              ${currentShadow === shadow.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }
            `}
            title={shadow.value}
          >
            <div
              className="w-6 h-6 mx-auto bg-white dark:bg-zinc-700 rounded"
              style={{ boxShadow: shadow.preview }}
            />
            <span className="block mt-1 text-zinc-500 dark:text-zinc-400 truncate">{shadow.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
