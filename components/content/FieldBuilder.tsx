'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { FieldTypeSelector } from './FieldTypeSelector'
import { FieldForm } from './FieldForm'
import { FIELD_TYPES } from '@/lib/content/field-types'
import {
  createField,
  updateField,
  deleteField,
  duplicateField,
  reorderFields,
} from '@/lib/supabase/queries/fields'
import type { Field, FieldType, FieldInsert, ContentType, Taxonomy } from '@/types/cms'

interface FieldBuilderProps {
  siteId: string
  contentTypeId: string
  initialFields: Field[]
  taxonomies: Taxonomy[]
  allContentTypes: ContentType[]
}

export function FieldBuilder({
  siteId,
  contentTypeId,
  initialFields,
  taxonomies,
  allContentTypes,
}: FieldBuilderProps) {
  const router = useRouter()
  const [fields, setFields] = useState<Field[]>(initialFields)
  const [isAddingField, setIsAddingField] = useState(false)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [draggedField, setDraggedField] = useState<Field | null>(null)

  // Handle field type selection
  const handleSelectFieldType = (type: FieldType) => {
    setSelectedFieldType(type)
  }

  // Handle field creation
  const handleCreateField = async (fieldData: FieldInsert | Partial<FieldInsert>) => {
    try {
      const newField = await createField({
        ...fieldData as FieldInsert,
        site_id: siteId,
        content_type_id: contentTypeId,
      })
      setFields((prev) => [...prev, newField])
      setSelectedFieldType(null)
      setIsAddingField(false)
    } catch (error) {
      console.error('Error creating field:', error)
    }
  }

  // Handle field update
  const handleUpdateField = async (fieldData: Partial<FieldInsert>) => {
    if (!editingField) return

    try {
      const updatedField = await updateField(editingField.id, fieldData)
      setFields((prev) =>
        prev.map((f) => (f.id === editingField.id ? updatedField : f))
      )
      setEditingField(null)
    } catch (error) {
      console.error('Error updating field:', error)
    }
  }

  // Handle field deletion
  const handleDeleteField = async () => {
    if (!fieldToDelete) return

    setIsDeleting(true)
    try {
      await deleteField(fieldToDelete.id)
      setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id))
      setDeleteDialogOpen(false)
      setFieldToDelete(null)
    } catch (error) {
      console.error('Error deleting field:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle field duplication
  const handleDuplicateField = async (field: Field) => {
    try {
      const duplicated = await duplicateField(field.id)
      setFields((prev) => [...prev, duplicated])
    } catch (error) {
      console.error('Error duplicating field:', error)
    }
  }

  // Handle drag start
  const handleDragStart = (field: Field) => {
    setDraggedField(field)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetField: Field) => {
    e.preventDefault()
    if (!draggedField || draggedField.id === targetField.id) return
  }

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetField: Field) => {
    e.preventDefault()
    if (!draggedField || draggedField.id === targetField.id) return

    const newFields = [...fields]
    const draggedIndex = newFields.findIndex((f) => f.id === draggedField.id)
    const targetIndex = newFields.findIndex((f) => f.id === targetField.id)

    // Remove dragged field and insert at new position
    newFields.splice(draggedIndex, 1)
    newFields.splice(targetIndex, 0, draggedField)

    setFields(newFields)
    setDraggedField(null)

    // Save new order
    try {
      await reorderFields(
        contentTypeId,
        newFields.map((f) => f.id)
      )
    } catch (error) {
      console.error('Error reordering fields:', error)
      // Revert on error
      setFields(fields)
    }
  }

  // Toggle group expansion
  const toggleGroup = (fieldId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) {
        next.delete(fieldId)
      } else {
        next.add(fieldId)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Fields List */}
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field) => {
            const fieldConfig = FIELD_TYPES[field.type]
            const Icon = fieldConfig?.icon || Layers
            const hasSubFields = field.type === 'group' || field.type === 'repeater'
            const isExpanded = expandedGroups.has(field.id)

            return (
              <div
                key={field.id}
                draggable
                onDragStart={() => handleDragStart(field)}
                onDragOver={(e) => handleDragOver(e, field)}
                onDrop={(e) => handleDrop(e, field)}
                className={`bg-slate-900 border border-slate-800 rounded-lg transition-all ${
                  draggedField?.id === field.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Drag Handle */}
                  <div className="cursor-move text-slate-600 hover:text-slate-400">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Expand/Collapse for groups */}
                  {hasSubFields && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(field.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* Icon */}
                  <div className="p-2 bg-slate-800 rounded">
                    <Icon className="h-4 w-4 text-purple-400" />
                  </div>

                  {/* Field Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{field.label}</span>
                      {field.required && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          Erforderlich
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 font-mono">
                        {field.name}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="text-xs text-slate-500">
                        {fieldConfig?.label || field.type}
                      </span>
                    </div>
                  </div>

                  {/* Width Badge */}
                  {field.width !== '100%' && (
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      {field.width}
                    </Badge>
                  )}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-slate-900 border-slate-700"
                    >
                      <DropdownMenuItem
                        className="text-slate-300 focus:text-white focus:bg-slate-800"
                        onClick={() => setEditingField(field)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-slate-300 focus:text-white focus:bg-slate-800"
                        onClick={() => handleDuplicateField(field)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplizieren
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-300 focus:bg-red-950/50"
                        onClick={() => {
                          setFieldToDelete(field)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Sub-fields for groups/repeaters */}
                {hasSubFields && isExpanded && field.sub_fields && (
                  <div className="border-t border-slate-800 bg-slate-950 p-4 pl-12">
                    <p className="text-sm text-slate-500 mb-2">Unterfelder:</p>
                    <div className="space-y-2">
                      {field.sub_fields.map((subField, index) => {
                        const subConfig = FIELD_TYPES[subField.type]
                        const SubIcon = subConfig?.icon || Layers

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-slate-900 rounded"
                          >
                            <SubIcon className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-300">
                              {subField.label}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {subField.name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          <Layers className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Noch keine Felder definiert</p>
          <p className="text-sm text-slate-500 mb-4">
            Füge Felder hinzu, um die Struktur deiner Inhalte zu definieren.
          </p>
        </div>
      )}

      {/* Add Field Button */}
      <Button
        onClick={() => setIsAddingField(true)}
        variant="outline"
        className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
      >
        <Plus className="h-4 w-4 mr-2" />
        Feld hinzufügen
      </Button>

      {/* Field Type Selector Dialog */}
      <Dialog open={isAddingField && !selectedFieldType} onOpenChange={setIsAddingField}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Feldtyp wählen</DialogTitle>
            <DialogDescription className="text-slate-400">
              Wähle den Typ des neuen Feldes
            </DialogDescription>
          </DialogHeader>
          <FieldTypeSelector onSelect={handleSelectFieldType} />
        </DialogContent>
      </Dialog>

      {/* Field Form Dialog (New) */}
      <Dialog
        open={!!selectedFieldType}
        onOpenChange={(open) => !open && setSelectedFieldType(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Neues Feld: {selectedFieldType && FIELD_TYPES[selectedFieldType]?.label}
            </DialogTitle>
          </DialogHeader>
          {selectedFieldType && (
            <FieldForm
              fieldType={selectedFieldType}
              onSave={handleCreateField}
              onCancel={() => setSelectedFieldType(null)}
              taxonomies={taxonomies}
              allContentTypes={allContentTypes}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Field Form Dialog (Edit) */}
      <Dialog
        open={!!editingField}
        onOpenChange={(open) => !open && setEditingField(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Feld bearbeiten: {editingField?.label}
            </DialogTitle>
          </DialogHeader>
          {editingField && (
            <FieldForm
              field={editingField}
              fieldType={editingField.type}
              onSave={handleUpdateField}
              onCancel={() => setEditingField(null)}
              taxonomies={taxonomies}
              allContentTypes={allContentTypes}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Feld löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du das Feld &quot;{fieldToDelete?.label}&quot; wirklich löschen?
              Die Felddaten in bestehenden Einträgen gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
