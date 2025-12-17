import { createClient } from '@/lib/supabase/client'

/**
 * Asset/Image types - uses the existing `assets` table
 */
export interface SiteImage {
  id: string
  site_id: string
  uploaded_by: string | null
  name: string
  file_path: string
  file_url: string
  file_type: 'image' | 'video' | 'document' | 'other'
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  folder: string
  tags: string[]
  original_filename: string | null
  wp_attachment_id: number | null
  wp_url: string | null
  created_at: string
  updated_at: string | null
}

export interface CreateImageInput {
  site_id: string
  name: string
  file_path: string
  file_url: string
  file_type?: 'image' | 'video' | 'document' | 'other'
  mime_type?: string
  size_bytes?: number
  width?: number
  height?: number
  alt_text?: string
  folder?: string
  tags?: string[]
  original_filename?: string
}

export interface UpdateImageInput {
  name?: string
  alt_text?: string
  tags?: string[]
  folder?: string
  wp_attachment_id?: number
  wp_url?: string
}

/**
 * Get all images for a site
 */
export async function getImages(siteId: string, folder?: string): Promise<SiteImage[]> {
  const supabase = createClient()

  let query = supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .eq('file_type', 'image')
    .order('created_at', { ascending: false })

  if (folder) {
    query = query.eq('folder', folder)
  }

  const { data, error } = await query

  if (error) throw error
  return data as SiteImage[]
}

/**
 * Get all assets (images, videos, documents) for a site
 */
export async function getAssets(
  siteId: string,
  options?: { folder?: string; fileType?: SiteImage['file_type'] }
): Promise<SiteImage[]> {
  const supabase = createClient()

  let query = supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (options?.folder) {
    query = query.eq('folder', options.folder)
  }

  if (options?.fileType) {
    query = query.eq('file_type', options.fileType)
  }

  const { data, error } = await query

  if (error) throw error
  return data as SiteImage[]
}

/**
 * Get a single image by ID
 */
export async function getImage(id: string): Promise<SiteImage> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SiteImage
}

/**
 * Create a new image record
 */
export async function createImage(input: CreateImageInput): Promise<SiteImage> {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('assets')
    .insert({
      site_id: input.site_id,
      uploaded_by: user?.id || null,
      name: input.name,
      file_path: input.file_path,
      file_url: input.file_url,
      file_type: input.file_type || 'image',
      mime_type: input.mime_type || null,
      size_bytes: input.size_bytes || null,
      width: input.width || null,
      height: input.height || null,
      alt_text: input.alt_text || null,
      folder: input.folder || '/',
      tags: input.tags || [],
      original_filename: input.original_filename || input.name,
    })
    .select()
    .single()

  if (error) throw error
  return data as SiteImage
}

/**
 * Update an image record
 */
export async function updateImage(id: string, input: UpdateImageInput): Promise<SiteImage> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SiteImage
}

/**
 * Delete an image record (also deletes from storage)
 */
export async function deleteImage(id: string): Promise<void> {
  const supabase = createClient()

  // First get the image to know the storage path
  const { data: image, error: fetchError } = await supabase
    .from('assets')
    .select('file_path')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError
  if (!image) throw new Error('Image not found')

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('site-assets')
    .remove([image.file_path])

  if (storageError) {
    console.error('Failed to delete from storage:', storageError)
    // Continue to delete the record even if storage delete fails
  }

  // Delete the record
  const { error: deleteError } = await supabase.from('assets').delete().eq('id', id)

  if (deleteError) throw deleteError
}

/**
 * Delete multiple images
 */
export async function deleteImages(ids: string[]): Promise<void> {
  const supabase = createClient()

  // Get all file paths first
  const { data: images, error: fetchError } = await supabase
    .from('assets')
    .select('file_path')
    .in('id', ids)

  if (fetchError) throw fetchError

  // Delete from storage
  if (images && images.length > 0) {
    const paths = images.map(img => img.file_path)
    const { error: storageError } = await supabase.storage
      .from('site-assets')
      .remove(paths)

    if (storageError) {
      console.error('Failed to delete from storage:', storageError)
    }
  }

  // Delete records
  const { error: deleteError } = await supabase.from('assets').delete().in('id', ids)

  if (deleteError) throw deleteError
}

/**
 * Get all unique folders for a site
 */
export async function getImageFolders(siteId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('folder')
    .eq('site_id', siteId)

  if (error) throw error

  const folders = new Set(data.map(d => d.folder).filter((f): f is string => f !== null))
  return Array.from(folders).sort()
}

/**
 * Move images to a different folder
 */
export async function moveImagesToFolder(imageIds: string[], folder: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('assets').update({ folder }).in('id', imageIds)

  if (error) throw error
}

/**
 * Search images by filename or alt text
 */
export async function searchImages(siteId: string, query: string): Promise<SiteImage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .eq('file_type', 'image')
    .or(`name.ilike.%${query}%,alt_text.ilike.%${query}%,original_filename.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SiteImage[]
}

/**
 * Get images by tags
 */
export async function getImagesByTags(siteId: string, tags: string[]): Promise<SiteImage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .eq('file_type', 'image')
    .overlaps('tags', tags)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SiteImage[]
}

/**
 * Get images that haven't been synced to WordPress
 */
export async function getUnsyncedImages(siteId: string): Promise<SiteImage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .eq('file_type', 'image')
    .is('wp_attachment_id', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as SiteImage[]
}

/**
 * Mark image as synced to WordPress
 */
export async function markImageAsSynced(
  id: string,
  wpAttachmentId: number,
  wpUrl: string
): Promise<SiteImage> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('assets') as any)
    .update({
      wp_attachment_id: wpAttachmentId,
      wp_url: wpUrl,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as SiteImage
}

/**
 * Get image count for a site
 */
export async function getImageCount(siteId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .eq('file_type', 'image')

  if (error) throw error
  return count || 0
}

/**
 * Get total storage used by a site's images
 */
export async function getStorageUsed(siteId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('size_bytes')
    .eq('site_id', siteId)

  if (error) throw error
  return data.reduce((total, asset) => total + (asset.size_bytes || 0), 0)
}
