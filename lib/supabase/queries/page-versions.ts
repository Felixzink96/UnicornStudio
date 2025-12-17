import { createClient } from '@/lib/supabase/client'

export interface PageVersion {
  id: string
  page_id: string
  version_number: number
  html_content: string | null
  content: Record<string, unknown> | null
  created_at: string
  created_by: string | null
  change_summary: string | null
}

/**
 * Get all versions for a page
 */
export async function getPageVersions(pageId: string): Promise<PageVersion[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('page_versions')
    .select('*')
    .eq('page_id', pageId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data as PageVersion[]
}

/**
 * Get a specific version
 */
export async function getPageVersion(
  pageId: string,
  versionNumber: number
): Promise<PageVersion | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('page_versions')
    .select('*')
    .eq('page_id', pageId)
    .eq('version_number', versionNumber)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as PageVersion | null
}

/**
 * Restore a page to a specific version
 */
export async function restorePageVersion(
  pageId: string,
  versionNumber: number
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('restore_page_version', {
    target_page_id: pageId,
    target_version: versionNumber,
  })

  if (error) throw error
}

/**
 * Get the latest version number for a page
 */
export async function getLatestVersionNumber(pageId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('page_versions')
    .select('version_number')
    .eq('page_id', pageId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data?.version_number || 0
}

/**
 * Compare two versions
 */
export async function compareVersions(
  pageId: string,
  version1: number,
  version2: number
): Promise<{ v1: PageVersion | null; v2: PageVersion | null }> {
  const [v1, v2] = await Promise.all([
    getPageVersion(pageId, version1),
    getPageVersion(pageId, version2),
  ])

  return { v1, v2 }
}
