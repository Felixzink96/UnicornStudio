/**
 * Image optimization utilities
 * - Resize images to max dimensions
 * - Convert to WebP format
 * - Extract dimensions
 */

export interface OptimizedImage {
  data: Uint8Array
  mimeType: string
  width: number
  height: number
  originalSize: number
  optimizedSize: number
}

export interface OptimizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

const DEFAULT_OPTIONS: OptimizeOptions = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 85,
  format: 'webp',
}

/**
 * Get image dimensions from a File or Blob
 */
export async function getImageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export function calculateResizeDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; needsResize: boolean } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height, needsResize: false }
  }

  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const ratio = Math.min(widthRatio, heightRatio)

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
    needsResize: true,
  }
}

/**
 * Optimize an image file (client-side using Canvas)
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Get original dimensions
  const original = await getImageDimensions(file)

  // Calculate new dimensions
  const { width, height, needsResize } = calculateResizeDimensions(
    original.width,
    original.height,
    opts.maxWidth!,
    opts.maxHeight!
  )

  // If no resize needed and already WebP, return as-is
  if (!needsResize && file.type === 'image/webp' && opts.format === 'webp') {
    const arrayBuffer = await file.arrayBuffer()
    return {
      data: new Uint8Array(arrayBuffer),
      mimeType: 'image/webp',
      width,
      height,
      originalSize: file.size,
      optimizedSize: file.size,
    }
  }

  // Create canvas and draw image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Load image
  const img = new Image()
  const url = URL.createObjectURL(file)

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })

  URL.revokeObjectURL(url)

  // Draw with high quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  // Convert to target format
  const mimeType =
    opts.format === 'webp'
      ? 'image/webp'
      : opts.format === 'jpeg'
        ? 'image/jpeg'
        : 'image/png'

  const quality = opts.quality! / 100

  // Get blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => {
        if (b) resolve(b)
        else reject(new Error('Failed to create blob'))
      },
      mimeType,
      quality
    )
  })

  const arrayBuffer = await blob.arrayBuffer()

  return {
    data: new Uint8Array(arrayBuffer),
    mimeType,
    width,
    height,
    originalSize: file.size,
    optimizedSize: blob.size,
  }
}

/**
 * Get file extension for a mime type
 */
export function getExtensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  return map[mimeType] || 'bin'
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string, mimeType: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = getExtensionForMimeType(mimeType)
  const baseName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars
    .substring(0, 50) // Limit length

  return `${baseName}-${timestamp}-${random}.${ext}`
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if image optimization is supported
 */
export function isOptimizationSupported(): boolean {
  if (typeof document === 'undefined') return false

  const canvas = document.createElement('canvas')
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}
