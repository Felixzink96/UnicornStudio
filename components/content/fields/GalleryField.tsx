'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X, GripVertical } from 'lucide-react'
import { FieldWrapper, type FieldRendererProps } from './index'

interface GalleryImage {
  id?: string
  url: string
  alt?: string
}

export function GalleryField({ field, value, onChange, error, disabled, siteId }: FieldRendererProps) {
  const settings = field.settings || {}
  const images = (value as GalleryImage[]) || []

  const handleAddImage = () => {
    const url = prompt('Bild URL eingeben (oder Media Library implementieren):')
    if (url) {
      onChange([...images, { url, alt: '' }])
    }
  }

  const handleRemoveImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  const canAddMore = !settings.maxImages || images.length < settings.maxImages

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-4">
        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className="w-full h-full object-cover rounded-lg border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  disabled={disabled}
                  className="absolute top-1 right-1 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
                <div className="absolute top-1 left-1 p-1 bg-slate-800/80 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-3 w-3 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Button */}
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddImage}
            disabled={disabled}
            className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Bild hinzufügen
          </Button>
        )}

        {/* Counter */}
        <p className="text-xs text-slate-500">
          {images.length} Bilder
          {settings.minImages && ` (mind. ${settings.minImages})`}
          {settings.maxImages && ` (max. ${settings.maxImages})`}
        </p>
      </div>
    </FieldWrapper>
  )
}
