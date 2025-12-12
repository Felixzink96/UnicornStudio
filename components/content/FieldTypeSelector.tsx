'use client'

import { FIELD_TYPES, FIELD_TYPE_CATEGORIES } from '@/lib/content/field-types'
import type { FieldType } from '@/types/cms'

interface FieldTypeSelectorProps {
  onSelect: (type: FieldType) => void
}

export function FieldTypeSelector({ onSelect }: FieldTypeSelectorProps) {
  return (
    <div className="space-y-6 py-2">
      {Object.entries(FIELD_TYPE_CATEGORIES).map(([categoryKey, category]) => (
        <div key={categoryKey}>
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            {category.label}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {category.types.map((type) => {
              const config = FIELD_TYPES[type as FieldType]
              if (!config) return null

              const Icon = config.icon

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSelect(type as FieldType)}
                  className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-left group"
                >
                  <div className="p-2 bg-slate-700 rounded group-hover:bg-slate-600 transition-colors">
                    <Icon className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">
                      {config.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {config.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
