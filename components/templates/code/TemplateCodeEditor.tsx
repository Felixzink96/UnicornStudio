'use client'

import { useEffect, useRef, useState } from 'react'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import { Button } from '@/components/ui/button'
import { Copy, Check, Braces, Code2 } from 'lucide-react'

export function TemplateCodeEditor() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const [lineNumbers, setLineNumbers] = useState<string[]>([])

  const html = useTemplateEditorStore((s) => s.html)
  const updateHtml = useTemplateEditorStore((s) => s.updateHtml)

  // Update line numbers
  useEffect(() => {
    const lines = html.split('\n')
    setLineNumbers(lines.map((_, i) => String(i + 1)))
  }, [html])

  // Handle copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateHtml(e.target.value, true)
  }

  // Handle tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      // Insert tab character
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      updateHtml(newValue, true)

      // Move cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  // Sync scroll between line numbers and textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const lineNumbersEl = document.getElementById('line-numbers')
    if (lineNumbersEl) {
      lineNumbersEl.scrollTop = e.currentTarget.scrollTop
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="h-10 px-4 flex items-center justify-between bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Code2 className="h-4 w-4" />
          <span>Template HTML</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-500">{lineNumbers.length} Zeilen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Braces className="h-3 w-3" />
            Handlebars
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-zinc-400 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-500" />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Kopieren
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div
          id="line-numbers"
          className="w-12 py-4 bg-zinc-900 border-r border-zinc-800 overflow-hidden text-right pr-3 select-none"
        >
          {lineNumbers.map((num, i) => (
            <div key={i} className="text-xs text-zinc-600 leading-6 h-6">
              {num}
            </div>
          ))}
        </div>

        {/* Code Area */}
        <textarea
          ref={textareaRef}
          value={html}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="flex-1 p-4 bg-zinc-950 text-zinc-100 font-mono text-sm leading-6 resize-none outline-none"
          spellCheck={false}
          placeholder="<!-- Template HTML hier... -->"
        />
      </div>

      {/* Syntax Hint */}
      <div className="h-8 px-4 flex items-center gap-4 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
        <span>
          <span className="text-purple-400">{'{{variable}}'}</span> = Escaped
        </span>
        <span>
          <span className="text-purple-400">{'{{{html}}}'}</span> = Unescaped
        </span>
        <span>
          <span className="text-purple-400">{'{{#each items}}'}</span> = Loop
        </span>
        <span>
          <span className="text-purple-400">{'{{#if condition}}'}</span> = Bedingung
        </span>
      </div>
    </div>
  )
}
