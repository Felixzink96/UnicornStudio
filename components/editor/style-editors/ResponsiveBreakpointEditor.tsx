'use client'

import { useState } from 'react'
import { TAILWIND_BREAKPOINTS, groupClassesByBreakpoint } from '@/lib/editor/tailwind-styles'
import { Monitor, Tablet, Smartphone } from 'lucide-react'

interface ResponsiveBreakpointEditorProps {
  currentClasses: string
  onChange: (newClasses: string) => void
}

const BREAKPOINT_ICONS: Record<string, React.ElementType> = {
  base: Monitor,
  sm: Smartphone,
  md: Tablet,
  lg: Monitor,
  xl: Monitor,
  '2xl': Monitor,
}

export function ResponsiveBreakpointEditor({ currentClasses, onChange }: ResponsiveBreakpointEditorProps) {
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>('base')
  const grouped = groupClassesByBreakpoint(currentClasses)

  const handleClassChange = (breakpoint: string, classes: string) => {
    const newGrouped = { ...grouped }
    newGrouped[breakpoint] = classes.split(/\s+/).filter(Boolean)

    // Rekonstruiere className
    const allClasses: string[] = []
    for (const [bp, classList] of Object.entries(newGrouped)) {
      const prefix = bp === 'base' ? '' : `${bp}:`
      for (const cls of classList) {
        allClasses.push(`${prefix}${cls}`)
      }
    }
    onChange(allClasses.join(' '))
  }

  const activeBreakpointInfo = TAILWIND_BREAKPOINTS.find(
    b => (b.prefix ? b.prefix.replace(':', '') : 'base') === activeBreakpoint
  )

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Responsive Breakpoints
      </label>

      {/* Breakpoint Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700">
        {TAILWIND_BREAKPOINTS.map((bp) => {
          const bpKey = bp.prefix ? bp.prefix.replace(':', '') : 'base'
          const Icon = BREAKPOINT_ICONS[bpKey] || Monitor
          const hasClasses = grouped[bpKey]?.length > 0
          return (
            <button
              key={bpKey}
              onClick={() => setActiveBreakpoint(bpKey)}
              className={`
                flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium border-b-2 transition-colors relative
                ${activeBreakpoint === bpKey
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }
              `}
            >
              <Icon className="h-3 w-3" />
              {bp.label}
              {hasClasses && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Classes für aktiven Breakpoint */}
      <div>
        <p className="text-[10px] text-zinc-400 mb-1">
          Klassen für {activeBreakpoint === 'base' ? 'alle Größen' : `ab ${activeBreakpointInfo?.minWidth}px`}:
        </p>
        <textarea
          value={grouped[activeBreakpoint]?.join(' ') || ''}
          onChange={(e) => handleClassChange(activeBreakpoint, e.target.value)}
          className="w-full h-16 px-2 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="z.B. flex gap-4 items-center"
        />
      </div>
    </div>
  )
}
