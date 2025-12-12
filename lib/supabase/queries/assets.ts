import { createClient } from '@/lib/supabase/client'
import type { Asset } from '@/types/database'

export async function getAssets(siteId: string, folder?: string) {
  const supabase = createClient()

  let query = supabase
    .from('assets')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (folder) {
    query = query.eq('folder', folder)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getAsset(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createAsset(asset: {
  site_id: string
  name: string
  file_path: string
  file_url: string
  file_type: 'image' | 'video' | 'document' | 'other'
  mime_type?: string
  size_bytes?: number
  width?: number
  height?: number
  alt_text?: string
  folder?: string
  tags?: string[]
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...asset,
      uploaded_by: user?.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAsset(id: string, updates: Partial<Asset>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAsset(id: string) {
  const supabase = createClient()

  // First get the asset to get the file_path
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('file_path')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('assets')
    .remove([asset.file_path])

  if (storageError) {
    console.error('Failed to delete file from storage:', storageError)
  }

  // Delete from database
  const { error } = await supabase.from('assets').delete().eq('id', id)

  if (error) throw error
}

export async function uploadAsset(
  siteId: string,
  file: File,
  folder: string = '/'
): Promise<Asset> {
  const supabase = createClient()

  // Generate a unique file path
  const fileExt = file.name.split('.').pop()
  const fileName = `${siteId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(fileName)

  // Determine file type
  let fileType: 'image' | 'video' | 'document' | 'other' = 'other'
  if (file.type.startsWith('image/')) fileType = 'image'
  else if (file.type.startsWith('video/')) fileType = 'video'
  else if (file.type === 'application/pdf') fileType = 'document'

  // Get image dimensions if it's an image
  let width: number | undefined
  let height: number | undefined

  if (fileType === 'image') {
    const dimensions = await getImageDimensions(file)
    width = dimensions.width
    height = dimensions.height
  }

  // Create asset record
  return createAsset({
    site_id: siteId,
    name: file.name,
    file_path: fileName,
    file_url: publicUrl,
    file_type: fileType,
    mime_type: file.type,
    size_bytes: file.size,
    width,
    height,
    folder,
  })
}

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
