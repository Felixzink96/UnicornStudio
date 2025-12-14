/**
 * Gemini Context Cache Manager
 *
 * Caches the system prompt to save ~75% on token costs.
 * The system prompt is ~8000+ tokens, so caching it significantly reduces costs.
 *
 * How it works:
 * 1. On first request, create a cache with the system prompt
 * 2. Cache is valid for 1 hour (TTL)
 * 3. Subsequent requests use the cached content
 * 4. Cache is automatically refreshed when expired
 */

import { GoogleGenAI } from '@google/genai'

// Cache storage (in-memory for serverless, could be Redis for production)
interface CacheEntry {
  name: string
  model: string
  expiresAt: number
  systemPromptHash: string
}

// In-memory cache store (persists across requests in the same serverless instance)
const cacheStore = new Map<string, CacheEntry>()

// Simple hash function to detect system prompt changes
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Get or create a cached content for the system prompt
 */
export async function getOrCreateCache(
  genAI: GoogleGenAI,
  model: string,
  systemPrompt: string
): Promise<string | null> {
  const cacheKey = `${model}-system-prompt`
  const promptHash = hashString(systemPrompt)

  // Check if we have a valid cache
  const existing = cacheStore.get(cacheKey)
  if (existing) {
    const now = Date.now()
    const isExpired = now >= existing.expiresAt
    const promptChanged = existing.systemPromptHash !== promptHash

    if (!isExpired && !promptChanged) {
      console.log(`[Cache] Using existing cache: ${existing.name}`)
      return existing.name
    }

    // Cache expired or prompt changed - delete old cache
    if (isExpired) {
      console.log(`[Cache] Cache expired, creating new one`)
    }
    if (promptChanged) {
      console.log(`[Cache] System prompt changed, creating new cache`)
    }

    // Try to delete the old cache
    try {
      await genAI.caches.delete({ name: existing.name })
    } catch (e) {
      // Cache might already be deleted, ignore
    }
    cacheStore.delete(cacheKey)
  }

  // Create new cache
  try {
    console.log(`[Cache] Creating new cache for model: ${model}`)

    // Gemini 3 Pro requires specific model format for caching
    // Use the versioned model name for caching
    const cacheModel = model.includes('gemini-3')
      ? 'models/gemini-2.0-flash-001' // Fallback for Gemini 3 - caching not yet available
      : `models/${model}`

    // Note: Gemini 3 Pro Preview might not support caching yet
    // In that case, we return null and the system falls back to non-cached
    if (model.includes('gemini-3')) {
      console.log(`[Cache] Gemini 3 Pro Preview - using implicit caching (explicit not yet available)`)
      return null
    }

    const cache = await genAI.caches.create({
      model: cacheModel,
      config: {
        displayName: `unicorn-studio-${Date.now()}`,
        systemInstruction: systemPrompt,
        ttl: '3600s', // 1 hour TTL
      }
    })

    if (cache?.name) {
      // Store in local cache
      const expiresAt = Date.now() + (3600 * 1000) // 1 hour from now
      cacheStore.set(cacheKey, {
        name: cache.name,
        model: model,
        expiresAt,
        systemPromptHash: promptHash,
      })

      console.log(`[Cache] Created new cache: ${cache.name}, expires in 1 hour`)
      return cache.name
    }

    return null
  } catch (error) {
    console.error('[Cache] Failed to create cache:', error)
    // Return null - system will fall back to non-cached request
    return null
  }
}

/**
 * Clear all caches (useful for testing or when system prompt changes significantly)
 */
export async function clearAllCaches(genAI: GoogleGenAI): Promise<void> {
  for (const [key, entry] of cacheStore.entries()) {
    try {
      await genAI.caches.delete({ name: entry.name })
    } catch (e) {
      // Ignore deletion errors
    }
    cacheStore.delete(key)
  }
  console.log('[Cache] All caches cleared')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalCaches: number
  caches: Array<{ model: string; expiresIn: number }>
} {
  const now = Date.now()
  const caches = Array.from(cacheStore.entries()).map(([key, entry]) => ({
    model: entry.model,
    expiresIn: Math.max(0, Math.round((entry.expiresAt - now) / 1000 / 60)), // minutes
  }))

  return {
    totalCaches: cacheStore.size,
    caches,
  }
}
