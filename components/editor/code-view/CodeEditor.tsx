'use client'

import { useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorStore } from '@/stores/editor-store'
import { Loader2 } from 'lucide-react'

export function CodeEditor() {
  const html = useEditorStore((s) => s.html)
  const updateHtml = useEditorStore((s) => s.updateHtml)

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateHtml(value, true)
    }
  }, [updateHtml])

  return (
    <div className="flex-1 h-full">
      <Editor
        height="100%"
        defaultLanguage="html"
        value={html}
        onChange={handleChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          insertSpaces: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-zinc-900">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        }
      />
    </div>
  )
}
