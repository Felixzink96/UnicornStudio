'use client'

import { useState, useRef, useEffect } from 'react'
import { COMMON_TAILWIND_CLASSES } from '@/lib/editor/tailwind-styles'

interface TailwindClassAutocompleteProps {
  currentClasses: string
  onChange: (newClasses: string) => void
}

export function TailwindClassAutocomplete({ currentClasses, onChange }: TailwindClassAutocompleteProps) {
  const [inputValue, setInputValue] = useState(currentClasses)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(currentClasses)
  }, [currentClasses])

  const handleInputChange = (value: string) => {
    setInputValue(value)

    // Finde das aktuelle Wort (nach dem letzten Leerzeichen)
    const words = value.split(/\s+/)
    const currentWord = words[words.length - 1].toLowerCase()

    if (currentWord.length > 0) {
      const matches = COMMON_TAILWIND_CLASSES
        .filter(cls => cls.toLowerCase().includes(currentWord))
        .slice(0, 8)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSelectSuggestion = (suggestion: string) => {
    const words = inputValue.split(/\s+/)
    words[words.length - 1] = suggestion
    const newValue = words.join(' ') + ' '
    setInputValue(newValue)
    onChange(newValue.trim())
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onChange(inputValue.trim())
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleBlur = () => {
    // Verzögertes Schließen damit onClick funktioniert
    setTimeout(() => {
      setShowSuggestions(false)
      onChange(inputValue.trim())
    }, 150)
  }

  return (
    <div className="relative">
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
        Tailwind Klassen
      </label>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue && handleInputChange(inputValue)}
        onBlur={handleBlur}
        className="w-full px-2 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Klassen hinzufügen..."
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`
                w-full px-3 py-1.5 text-xs font-mono text-left transition-colors
                ${index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }
              `}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
