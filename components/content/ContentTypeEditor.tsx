'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Layers, Tags, Search } from 'lucide-react'
import { ContentTypeForm } from './ContentTypeForm'
import { FieldBuilder } from './FieldBuilder'
import type { ContentType, Field, Taxonomy } from '@/types/cms'

interface ContentTypeEditorProps {
  siteId: string
  contentType: ContentType
  initialFields: Field[]
  taxonomies: Taxonomy[]
  allContentTypes: ContentType[]
}

export function ContentTypeEditor({
  siteId,
  contentType,
  initialFields,
  taxonomies,
  allContentTypes,
}: ContentTypeEditorProps) {
  const [activeTab, setActiveTab] = useState('fields')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="bg-slate-800 border border-slate-700 mb-6">
        <TabsTrigger value="fields" className="data-[state=active]:bg-slate-700">
          <Layers className="h-4 w-4 mr-2" />
          Felder
        </TabsTrigger>
        <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
          <Settings className="h-4 w-4 mr-2" />
          Einstellungen
        </TabsTrigger>
        <TabsTrigger value="taxonomies" className="data-[state=active]:bg-slate-700">
          <Tags className="h-4 w-4 mr-2" />
          Taxonomien
        </TabsTrigger>
        <TabsTrigger value="seo" className="data-[state=active]:bg-slate-700">
          <Search className="h-4 w-4 mr-2" />
          SEO Template
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fields">
        <FieldBuilder
          siteId={siteId}
          contentTypeId={contentType.id}
          contentTypeName={contentType.label_plural || contentType.name}
          initialFields={initialFields}
          taxonomies={taxonomies}
          allContentTypes={allContentTypes}
        />
      </TabsContent>

      <TabsContent value="settings">
        <div className="max-w-4xl">
          <ContentTypeForm
            siteId={siteId}
            contentType={contentType}
            taxonomies={taxonomies}
          />
        </div>
      </TabsContent>

      <TabsContent value="taxonomies">
        <TaxonomySelector
          siteId={siteId}
          contentTypeId={contentType.id}
          taxonomies={taxonomies}
        />
      </TabsContent>

      <TabsContent value="seo">
        <SEOTemplateEditor contentType={contentType} />
      </TabsContent>
    </Tabs>
  )
}

// Taxonomy Selector Component
function TaxonomySelector({
  siteId,
  contentTypeId,
  taxonomies,
}: {
  siteId: string
  contentTypeId: string
  taxonomies: Taxonomy[]
}) {
  const [linkedTaxonomies, setLinkedTaxonomies] = useState<string[]>(
    taxonomies
      .filter((t) => t.content_type_ids?.includes(contentTypeId))
      .map((t) => t.id)
  )

  const handleToggle = async (taxonomyId: string, isLinked: boolean) => {
    // TODO: Implement taxonomy linking
    if (isLinked) {
      setLinkedTaxonomies((prev) => [...prev, taxonomyId])
    } else {
      setLinkedTaxonomies((prev) => prev.filter((id) => id !== taxonomyId))
    }
  }

  if (taxonomies.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
        <Tags className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">Keine Taxonomien vorhanden</p>
        <p className="text-sm text-slate-500">
          Erstelle zuerst Taxonomien wie Kategorien oder Tags.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Verfügbare Taxonomien
      </h3>
      <div className="space-y-3">
        {taxonomies.map((taxonomy) => (
          <label
            key={taxonomy.id}
            className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
          >
            <input
              type="checkbox"
              checked={linkedTaxonomies.includes(taxonomy.id)}
              onChange={(e) => handleToggle(taxonomy.id, e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-medium text-white">{taxonomy.label_plural}</p>
              <p className="text-sm text-slate-500">
                {taxonomy.hierarchical ? 'Hierarchisch' : 'Flat'} • /{taxonomy.slug}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// SEO Template Editor Component
function SEOTemplateEditor({ contentType }: { contentType: ContentType }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-4xl">
      <h3 className="text-lg font-semibold text-white mb-4">
        SEO Template für {contentType.label_plural}
      </h3>
      <p className="text-slate-400 mb-6">
        Definiere Standard-Muster für die SEO-Metadaten dieses Content Types.
      </p>
      {/* SEO template form would go here */}
      <p className="text-slate-500 text-sm">
        SEO Template Editor wird in einer späteren Phase implementiert.
      </p>
    </div>
  )
}
