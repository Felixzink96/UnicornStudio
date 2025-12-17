'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Underline, Link, Check, X } from 'lucide-react'

interface InlineTextEditorProps {
  initialContent: string
  isRichText: boolean
  onSave: (newContent: string) => void
  onCancel: () => void
  position: { top: number; left: number; width: number }
}

export function InlineTextEditor({
  initialContent,
  isRichText,
  onSave,
  onCancel,
  position,
}: InlineTextEditorProps) {
  const [plainText, setPlainText] = useState(initialContent)
  const plainTextRef = useRef<HTMLTextAreaElement>(null)

  // TipTap editor for rich text
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Text eingeben...',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[60px] p-2',
      },
    },
  })

  // Focus on mount
  useEffect(() => {
    if (isRichText && editor) {
      editor.commands.focus('end')
    } else if (plainTextRef.current) {
      plainTextRef.current.focus()
      plainTextRef.current.select()
    }
  }, [isRichText, editor])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter' && !e.shiftKey && !isRichText) {
        e.preventDefault()
        handleSave()
      }
    },
    [onCancel, isRichText]
  )

  const handleSave = () => {
    if (isRichText && editor) {
      onSave(editor.getHTML())
    } else {
      onSave(plainText)
    }
  }

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-zinc-200 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: Math.max(position.width, 300),
        maxWidth: 600,
      }}
    >
      {/* Rich Text Toolbar */}
      {isRichText && editor && (
        <div className="flex items-center gap-1 p-1.5 border-b bg-zinc-50">
          <Button
            size="sm"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => {
              const url = window.prompt('Link-URL eingeben:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
          >
            <Link className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Editor Content */}
      <div className="p-2" onKeyDown={handleKeyDown}>
        {isRichText ? (
          <EditorContent editor={editor} />
        ) : (
          <textarea
            ref={plainTextRef}
            value={plainText}
            onChange={e => setPlainText(e.target.value)}
            className="w-full resize-none border-0 focus:outline-none focus:ring-0 text-sm min-h-[40px]"
            rows={Math.min(5, plainText.split('\n').length + 1)}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-1 p-1.5 border-t bg-zinc-50">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Abbrechen
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleSave}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Speichern
        </Button>
      </div>
    </div>
  )
}

/**
 * Determine if an element should use rich text editing
 */
export function shouldUseRichText(tagName: string, innerHTML: string): boolean {
  // Simple elements get plain text
  const plainTextTags = ['p', 'span', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'button', 'a']

  if (plainTextTags.includes(tagName.toLowerCase())) {
    // Unless they contain HTML tags
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(innerHTML)
    return hasHtmlTags
  }

  // Content areas get rich text
  return true
}
