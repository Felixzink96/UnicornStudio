'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Save,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Search,
  Tags,
} from 'lucide-react'
import { FieldRenderer } from './fields'
import { createEntry, updateEntry, setEntryTerms } from '@/lib/supabase/queries/entries'
import { getTerms } from '@/lib/supabase/queries/taxonomies'
import type {
  ContentType,
  Entry,
  EntryInsert,
  EntryStatus,
  Field,
  Taxonomy,
  Term,
  EntrySEO,
} from '@/types/cms'

interface EntryEditorProps {
  siteId: string
  contentType: ContentType
  fields: Field[]
  taxonomies: Taxonomy[]
  entry?: Entry
  entryTermIds?: string[]
  authorId?: string
}

export function EntryEditor({
  siteId,
  contentType,
  fields,
  taxonomies,
  entry,
  entryTermIds = [],
  authorId,
}: EntryEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState(entry?.title || '')
  const [slug, setSlug] = useState(entry?.slug || '')
  const [content, setContent] = useState(entry?.content || '')
  const [excerpt, setExcerpt] = useState(entry?.excerpt || '')
  const [status, setStatus] = useState<EntryStatus>(entry?.status || 'draft')
  const [publishedAt, setPublishedAt] = useState(entry?.published_at || '')
  const [featuredImageId, setFeaturedImageId] = useState(entry?.featured_image_id || '')
  const [data, setData] = useState<Record<string, unknown>>(entry?.data || {})
  const [seo, setSeo] = useState<EntrySEO>(entry?.seo || {})
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>(entryTermIds)

  // Taxonomy terms
  const [taxonomyTerms, setTaxonomyTerms] = useState<Record<string, Term[]>>({})

  // Collapsible states
  const [seoOpen, setSeoOpen] = useState(false)

  // Load taxonomy terms
  useEffect(() => {
    async function loadTerms() {
      const termsMap: Record<string, Term[]> = {}
      for (const taxonomy of taxonomies) {
        const terms = await getTerms(taxonomy.id)
        termsMap[taxonomy.id] = terms
      }
      setTaxonomyTerms(termsMap)
    }
    if (taxonomies.length > 0) {
      loadTerms()
    }
  }, [taxonomies])

  // Auto-generate slug from title
  useEffect(() => {
    if (!entry && title && !slug) {
      setSlug(generateSlug(title))
    }
  }, [title, entry, slug])

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setData((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSave = async (targetStatus: EntryStatus = status) => {
    setIsSaving(true)

    try {
      const entryData: EntryInsert = {
        site_id: siteId,
        content_type_id: contentType.id,
        title: contentType.has_title ? title : undefined,
        slug: contentType.has_slug ? slug : undefined,
        content: contentType.has_content ? content : undefined,
        excerpt: contentType.has_excerpt ? excerpt : undefined,
        status: targetStatus,
        published_at:
          targetStatus === 'published' && !entry?.published_at
            ? new Date().toISOString()
            : publishedAt || undefined,
        featured_image_id: contentType.has_featured_image
          ? featuredImageId || undefined
          : undefined,
        author_id: contentType.has_author ? authorId : undefined,
        data,
        seo: contentType.has_seo ? seo : undefined,
      }

      let savedEntry: Entry

      if (entry) {
        savedEntry = await updateEntry(entry.id, entryData)
      } else {
        savedEntry = await createEntry(entryData)
      }

      // Save taxonomy terms
      if (taxonomies.length > 0) {
        await setEntryTerms(savedEntry.id, selectedTermIds)
      }

      router.push(`/dashboard/sites/${siteId}/content/${contentType.slug}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    setIsSubmitting(true)
    await handleSave('published')
    setIsSubmitting(false)
  }

  const handleTermToggle = (termId: string) => {
    setSelectedTermIds((prev) =>
      prev.includes(termId)
        ? prev.filter((id) => id !== termId)
        : [...prev, termId]
    )
  }

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Title */}
        {contentType.has_title && (
          <div className="space-y-2">
            <Label className="text-slate-300">Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${contentType.label_singular} Titel`}
              className="bg-slate-800 border-slate-700 text-white text-lg"
            />
          </div>
        )}

        {/* Slug */}
        {contentType.has_slug && (
          <div className="space-y-2">
            <Label className="text-slate-300">URL Slug</Label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-700 border border-r-0 border-slate-600 rounded-l text-slate-400 text-sm">
                /{contentType.slug}/
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
                className="bg-slate-800 border-slate-700 text-white font-mono rounded-l-none"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {contentType.has_content && (
          <div className="space-y-2">
            <Label className="text-slate-300">Inhalt</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Inhalt..."
              className="bg-slate-800 border-slate-700 text-white min-h-[300px]"
            />
          </div>
        )}

        {/* Excerpt */}
        {contentType.has_excerpt && (
          <div className="space-y-2">
            <Label className="text-slate-300">Auszug</Label>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Kurze Beschreibung..."
              className="bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>
        )}

        {/* Custom Fields */}
        {fields.length > 0 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Felder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      width:
                        field.width === '100%'
                          ? '100%'
                          : `calc(${field.width} - 1rem)`,
                    }}
                  >
                    <FieldRenderer
                      field={field}
                      value={data[field.name]}
                      onChange={(value) => handleFieldChange(field.name, value)}
                      siteId={siteId}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SEO */}
        {contentType.has_seo && (
          <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
            <Card className="bg-slate-900 border-slate-800">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-slate-400" />
                      SEO Einstellungen
                    </span>
                    {seoOpen ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 border-t border-slate-800 pt-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Meta Titel</Label>
                    <Input
                      value={seo.meta_title || ''}
                      onChange={(e) =>
                        setSeo((prev) => ({ ...prev, meta_title: e.target.value }))
                      }
                      placeholder={title || 'Meta Titel'}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">
                      {(seo.meta_title || title || '').length} / 60 Zeichen
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Meta Beschreibung</Label>
                    <Textarea
                      value={seo.meta_description || ''}
                      onChange={(e) =>
                        setSeo((prev) => ({
                          ...prev,
                          meta_description: e.target.value,
                        }))
                      }
                      placeholder={excerpt || 'Meta Beschreibung'}
                      className="bg-slate-800 border-slate-700 text-white"
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">
                      {(seo.meta_description || excerpt || '').length} / 160 Zeichen
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Focus Keyword</Label>
                    <Input
                      value={seo.focus_keyword || ''}
                      onChange={(e) =>
                        setSeo((prev) => ({
                          ...prev,
                          focus_keyword: e.target.value,
                        }))
                      }
                      placeholder="Haupt-Keyword"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-6">
        {/* Publish Box */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Veröffentlichung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-slate-400 text-sm">Status</Label>
              <Select
                value={status}
                onValueChange={(v: EntryStatus) => setStatus(v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-yellow-400" />
                      Entwurf
                    </span>
                  </SelectItem>
                  <SelectItem value="published">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Veröffentlicht
                    </span>
                  </SelectItem>
                  <SelectItem value="scheduled">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      Geplant
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Published Date */}
            {contentType.has_published_date && (
              <div className="space-y-2">
                <Label className="text-slate-400 text-sm">Veröffentlichungsdatum</Label>
                <Input
                  type="datetime-local"
                  value={publishedAt ? publishedAt.slice(0, 16) : ''}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handlePublish}
                disabled={isSubmitting || isSaving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Veröffentliche...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Veröffentlichen
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSave('draft')}
                disabled={isSaving}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Als Entwurf speichern
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Featured Image */}
        {contentType.has_featured_image && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-400" />
                Beitragsbild
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Bild URL eingeben:')
                  if (url) {
                    // In production, this would use a media picker
                    setFeaturedImageId(url)
                  }
                }}
                className="w-full h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
              >
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Bild auswählen</span>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Taxonomies */}
        {taxonomies.map((taxonomy) => (
          <Card key={taxonomy.id} className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Tags className="h-4 w-4 text-slate-400" />
                {taxonomy.label_plural}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(taxonomyTerms[taxonomy.id] || []).map((term) => (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => handleTermToggle(term.id)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      selectedTermIds.includes(term.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {term.name}
                  </button>
                ))}
                {(taxonomyTerms[taxonomy.id] || []).length === 0 && (
                  <p className="text-sm text-slate-500">
                    Keine {taxonomy.label_plural} vorhanden
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
