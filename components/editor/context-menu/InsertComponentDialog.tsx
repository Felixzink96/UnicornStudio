'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'

interface VariableSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    title: string
    default: string
  }>
}

interface InsertComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentName: string
  html: string
  schema: VariableSchema | null
  onInsert: (html: string) => void
}

export function InsertComponentDialog({
  open,
  onOpenChange,
  componentName,
  html,
  schema,
  onInsert,
}: InsertComponentDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [inserting, setInserting] = useState(false)

  // Extract variables from schema
  const variables = useMemo(() => {
    if (!schema?.properties) return []
    return Object.entries(schema.properties).map(([key, val]) => ({
      name: key,
      title: val.title || key,
      defaultValue: val.default || '',
    }))
  }, [schema])

  // Initialize values with defaults
  useEffect(() => {
    if (open && variables.length > 0) {
      const defaults: Record<string, string> = {}
      variables.forEach(v => {
        defaults[v.name] = v.defaultValue
      })
      setValues(defaults)
    }
  }, [open, variables])

  // Process HTML by replacing variables
  const processedHtml = useMemo(() => {
    let result = html
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })
    return result
  }, [html, values])

  const handleInsert = () => {
    setInserting(true)
    onInsert(processedHtml)
    setInserting(false)
    onOpenChange(false)
  }

  // If no variables, just insert directly
  if (!schema || variables.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-500" />
            {componentName} einfügen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-zinc-500">
            Passe die Werte an bevor du die Komponente einfügst:
          </p>

          {variables.map((v) => (
            <div key={v.name} className="space-y-1.5">
              <Label htmlFor={v.name} className="text-sm">
                {v.title}
              </Label>
              <Input
                id={v.name}
                value={values[v.name] || ''}
                onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                placeholder={v.defaultValue}
              />
            </div>
          ))}

          {/* Preview */}
          <div className="rounded-lg border bg-zinc-50 p-3 max-h-40 overflow-hidden">
            <p className="text-[10px] text-zinc-400 mb-2">Vorschau:</p>
            <div
              className="transform scale-75 origin-top-left"
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inserting}>
            Abbrechen
          </Button>
          <Button onClick={handleInsert} disabled={inserting}>
            {inserting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Einfügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
