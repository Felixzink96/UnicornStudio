'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, Upload, X } from 'lucide-react'
import { FieldWrapper, type FieldRendererProps } from './index'

interface ImageValue {
  id?: string
  url: string
  alt?: string
}

export function ImageField({ field, value, onChange, error, disabled, siteId }: FieldRendererProps) {
  const settings = field.settings || {}
  const imageValue = value as ImageValue | null

  const handleRemove = () => {
    onChange(null)
  }

  // In production, this would open a media library modal
  const handleSelectImage = () => {
    // Placeholder - would open asset picker
    const url = prompt('Bild URL eingeben (oder Media Library implementieren):')
    if (url) {
      onChange({ url, alt: '' })
    }
  }

  return (
    <FieldWrapper field={field} error={error}>
      {imageValue?.url ? (
        <div className="relative group">
          <img
            src={imageValue.url}
            alt={imageValue.alt || ''}
            className="w-full h-48 object-cover rounded-lg border border-slate-700"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSelectImage}
              disabled={disabled}
            >
              Ändern
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelectImage}
          disabled={disabled}
          className="w-full h-48 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-8 w-8" />
          <span className="text-sm">Bild auswählen oder hochladen</span>
          <span className="text-xs">
            {settings.allowedTypes?.join(', ') || 'jpg, png, webp'}
          </span>
        </button>
      )}
    </FieldWrapper>
  )
}
