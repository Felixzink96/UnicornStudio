import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ContentType } from '@/types/cms'
import type { Site, Page } from '@/types/database'

/**
 * Cached Site Query - wird pro Request nur 1x ausgeführt
 * React's cache() dedupliziert identische Aufrufe während eines Requests
 */
export const getSiteById = cache(async (siteId: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single()

  if (error) return null
  return data as Site
})

/**
 * Cached Content Types Query
 */
export const getContentTypesBySite = cache(async (siteId: string) => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .order('name', { ascending: true })

  return (data || []) as ContentType[]
})

/**
 * Cached Pages Query
 */
export const getPagesBySite = cache(async (siteId: string) => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', siteId)
    .order('is_home', { ascending: false })
    .order('created_at', { ascending: true })

  return (data || []) as Page[]
})

/**
 * Cached User Profile Query
 */
export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return data
})
