'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  MoreVertical,
  Grid,
  List,
  Info,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/use-toast'
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

interface MediaLibraryProps {
  siteId: string
}

export function MediaLibrary({ siteId }: MediaLibraryProps) {
  const [images, setImages] = useState<ImageAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingImage, setEditingImage] = useState<ImageAsset | null>(null)
  const [editingAltText, setEditingAltText] = useState('')
  const [editingName, setEditingName] = useState('')
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
      toast.error('Fehler', 'Bilder konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [siteId, searchQuery])

  // Load on mount
  useEffect(() => {
    loadImages()
  }, [loadImages])

  // Handle file upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    const supabase = createClient()
    let successCount = 0

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
          await supabase.storage.from('site-assets').remove([storagePath])
        } else {
          successCount++
        }
      }

      if (successCount > 0) {
        toast.success('Upload erfolgreich', `${successCount} Bild${successCount > 1 ? 'er' : ''} hochgeladen`)
        loadImages()
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Upload fehlgeschlagen', 'Die Bilder konnten nicht hochgeladen werden')
    } finally {
      setUploading(false)
    }
  }

  // Handle delete
  const handleDelete = async (imageIds: string[]) => {
    const supabase = createClient()

    try {
      const { data: imagesToDelete } = await supabase
        .from('assets')
        .select('id, file_path')
        .in('id', imageIds)

      if (!imagesToDelete) return

      const paths = imagesToDelete.map(img => img.file_path)
      await supabase.storage.from('site-assets').remove(paths)
      await supabase.from('assets').delete().in('id', imageIds)

      setImages(prev => prev.filter(img => !imageIds.includes(img.id)))
      setSelectedImages(new Set())
      toast.success('Gelöscht', `${imageIds.length} Bild${imageIds.length > 1 ? 'er' : ''} gelöscht`)
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Fehler', 'Die Bilder konnten nicht gelöscht werden')
    }
  }

  // Handle update
  const handleUpdate = async () => {
    if (!editingImage) return

    const supabase = createClient()

    try {
      await supabase.from('assets').update({
        name: editingName,
        alt_text: editingAltText,
      }).eq('id', editingImage.id)

      setImages(prev =>
        prev.map(img =>
          img.id === editingImage.id
            ? { ...img, name: editingName, alt_text: editingAltText }
            : img
        )
      )
      setEditingImage(null)
      toast.success('Gespeichert', 'Bilddetails wurden aktualisiert')
    } catch (error) {
      console.error('Update failed:', error)
      toast.error('Fehler', 'Die Änderungen konnten nicht gespeichert werden')
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

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleUpload(e.dataTransfer.files)
  }

  const openEditDialog = (image: ImageAsset) => {
    setEditingImage(image)
    setEditingName(image.name)
    setEditingAltText(image.alt_text || '')
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Bilder suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Hochladen
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
        <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {selectedImages.size} Bild{selectedImages.size > 1 ? 'er' : ''} ausgewählt
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleDelete(Array.from(selectedImages))}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedImages(new Set())}
          >
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
        </div>
      )}

      {/* Image grid/list */}
      <div
        className={`${
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
            : 'space-y-2'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : images.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <ImageIcon className="h-16 w-16 text-zinc-300 mb-4" />
            <p className="text-zinc-500 mb-2">Keine Bilder vorhanden</p>
            <p className="text-sm text-zinc-400 mb-4">Drag & Drop oder klicke zum Hochladen</p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Bilder hochladen
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          images.map(image => (
            <Card
              key={image.id}
              className={`group relative overflow-hidden cursor-pointer transition-all ${
                selectedImages.has(image.id)
                  ? 'ring-2 ring-blue-500'
                  : 'hover:ring-1 hover:ring-zinc-300'
              }`}
              onClick={() => toggleSelect(image.id)}
            >
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={image.file_url}
                    alt={image.alt_text || image.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Selection checkbox */}
                  <div
                    className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedImages.has(image.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white/80 border-zinc-300 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {selectedImages.has(image.id) && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </div>

                  {/* Actions menu */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            openEditDialog(image)
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(image.file_url)
                            toast.success('Kopiert', 'URL in Zwischenablage kopiert')
                          }}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          URL kopieren
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={e => {
                            e.stopPropagation()
                            handleDelete([image.id])
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{image.name}</p>
                    {image.size_bytes && (
                      <p className="text-xs text-white/70">
                        {formatFileSize(image.size_bytes)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          images.map(image => (
            <Card
              key={image.id}
              className={`cursor-pointer transition-all ${
                selectedImages.has(image.id)
                  ? 'ring-2 ring-blue-500'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
              onClick={() => toggleSelect(image.id)}
            >
              <CardContent className="p-3 flex items-center gap-4">
                <img
                  src={image.file_url}
                  alt={image.alt_text || image.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{image.name}</p>
                  <p className="text-sm text-zinc-500">
                    {image.size_bytes ? formatFileSize(image.size_bytes) : '-'}
                    {image.width && image.height && ` • ${image.width}x${image.height}`}
                  </p>
                  {image.alt_text && (
                    <p className="text-xs text-zinc-400 truncate">{image.alt_text}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); openEditDialog(image) }}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={e => { e.stopPropagation(); handleDelete([image.id]) }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))
        )}

        {/* Upload dropzone */}
        {!loading && images.length > 0 && viewMode === 'grid' && (
          <Card
            className="cursor-pointer border-2 border-dashed hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-0">
              <div className="aspect-square flex flex-col items-center justify-center">
                <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                <span className="text-sm text-zinc-400">Upload</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bild bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingImage && (
              <img
                src={editingImage.file_url}
                alt={editingImage.alt_text || editingImage.name}
                className="w-full h-48 object-contain rounded-lg bg-zinc-100"
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt">Alt-Text</Label>
              <Input
                id="alt"
                placeholder="Bildbeschreibung für Barrierefreiheit"
                value={editingAltText}
                onChange={e => setEditingAltText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImage(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
