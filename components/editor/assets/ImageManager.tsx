'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  Edit2,
  Folder,
  Check,
  X,
  Loader2,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/images/optimizer'

interface ImageAsset {
  id: string
  name: string
  file_url: string
  file_path: string
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  folder: string | null
  tags: string[] | null
  created_at: string | null
}

interface ImageManagerProps {
  siteId: string
  onSelect?: (image: ImageAsset) => void
  mode?: 'manage' | 'picker'
}

export function ImageManager({ siteId, onSelect, mode = 'manage' }: ImageManagerProps) {
  const [images, setImages] = useState<ImageAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAltText, setEditingAltText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load images
  const loadImages = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('assets')
        .select('*')
        .eq('site_id', siteId)
        .eq('file_type', 'image')
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,alt_text.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Failed to load images:', error)
    } finally {
      setLoading(false)
    }
  }, [siteId, searchQuery])

  // Load on mount and search change
  useState(() => {
    loadImages()
  })

  // Handle file upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    const supabase = createClient()

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue

        // Generate unique filename
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const ext = file.name.split('.').pop() || 'jpg'
        const baseName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .substring(0, 50)
        const filename = `${baseName}-${timestamp}-${random}.${ext}`
        const storagePath = `sites/${siteId}/images/${filename}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('site-assets')
          .upload(storagePath, file, {
            cacheControl: '31536000',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('site-assets')
          .getPublicUrl(storagePath)

        // Create asset record
        const { error: dbError } = await supabase.from('assets').insert({
          site_id: siteId,
          name: file.name,
          file_path: storagePath,
          file_url: urlData.publicUrl,
          file_type: 'image',
          mime_type: file.type,
          size_bytes: file.size,
          folder: '/',
          tags: [],
          original_filename: file.name,
        })

        if (dbError) {
          console.error('DB error:', dbError)
          // Cleanup uploaded file
          await supabase.storage.from('site-assets').remove([storagePath])
        }
      }

      // Reload images
      loadImages()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  // Handle delete
  const handleDelete = async (imageIds: string[]) => {
    const supabase = createClient()

    try {
      // Get file paths
      const { data: imagesToDelete } = await supabase
        .from('assets')
        .select('id, file_path')
        .in('id', imageIds)

      if (!imagesToDelete) return

      // Delete from storage
      const paths = imagesToDelete.map(img => img.file_path)
      await supabase.storage.from('site-assets').remove(paths)

      // Delete records
      await supabase.from('assets').delete().in('id', imageIds)

      // Update state
      setImages(prev => prev.filter(img => !imageIds.includes(img.id)))
      setSelectedImages(new Set())
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  // Handle alt text update
  const handleUpdateAltText = async (imageId: string, altText: string) => {
    const supabase = createClient()

    try {
      await supabase.from('assets').update({ alt_text: altText }).eq('id', imageId)

      setImages(prev =>
        prev.map(img => (img.id === imageId ? { ...img, alt_text: altText } : img))
      )
      setEditingId(null)
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  // Toggle selection
  const toggleSelect = (imageId: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(imageId)) {
        next.delete(imageId)
      } else {
        next.add(imageId)
      }
      return next
    })
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleUpload(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {/* Bulk actions */}
      {selectedImages.size > 0 && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-md">
          <span className="text-xs text-blue-700">{selectedImages.size} ausgewählt</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDelete(Array.from(selectedImages))}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Löschen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setSelectedImages(new Set())}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Image grid */}
      <ScrollArea className="flex-1">
        <div
          className="grid grid-cols-3 gap-2"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="col-span-3 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : images.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-500">Keine Bilder vorhanden</p>
              <p className="text-xs text-zinc-400">Drag & Drop zum Hochladen</p>
            </div>
          ) : (
            images.map(image => (
              <div
                key={image.id}
                className={`group relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                  selectedImages.has(image.id)
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
                onClick={() => {
                  if (mode === 'picker' && onSelect) {
                    onSelect(image)
                  } else {
                    toggleSelect(image.id)
                  }
                }}
              >
                {/* Image */}
                <img
                  src={image.file_url}
                  alt={image.alt_text || image.name}
                  className="w-full h-full object-cover"
                />

                {/* Selection indicator */}
                {mode === 'manage' && (
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedImages.has(image.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white/80 border-zinc-300 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {selectedImages.has(image.id) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                )}

                {/* Actions menu */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation()
                          setEditingId(image.id)
                          setEditingAltText(image.alt_text || '')
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-2" />
                        Alt-Text
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete([image.id])
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate">{image.name}</p>
                  {image.size_bytes && (
                    <p className="text-[9px] text-white/70">
                      {formatFileSize(image.size_bytes)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Upload dropzone */}
          <div
            className="aspect-square rounded-lg border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-zinc-400 mb-1" />
            <span className="text-[10px] text-zinc-400">Upload</span>
          </div>
        </div>
      </ScrollArea>

      {/* Alt text edit dialog */}
      {editingId && (
        <div className="absolute inset-0 bg-white/95 flex flex-col p-4">
          <h4 className="text-sm font-medium mb-2">Alt-Text bearbeiten</h4>
          <Input
            placeholder="Bildbeschreibung für Barrierefreiheit..."
            value={editingAltText}
            onChange={e => setEditingAltText(e.target.value)}
            className="mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingId(null)}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={() => handleUpdateAltText(editingId, editingAltText)}
            >
              Speichern
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
