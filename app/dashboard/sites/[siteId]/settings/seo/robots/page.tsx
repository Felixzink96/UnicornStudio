'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Bot, Save, Loader2, RotateCcw, Copy, Check } from 'lucide-react'

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /

# Crawl-delay (optional)
# Crawl-delay: 10

# Disallow admin areas
Disallow: /wp-admin/
Disallow: /wp-includes/

# Allow specific admin files
Allow: /wp-admin/admin-ajax.php`

export default function RobotsTxtPage() {
  const params = useParams()
  const siteId = params.siteId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [robotsTxt, setRobotsTxt] = useState('')
  const [sitemapUrl, setSitemapUrl] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: site } = await supabase
        .from('sites')
        .select('name, seo_settings, integrations')
        .eq('id', siteId)
        .single()

      if (site) {
        setSiteName(site.name)
        const seoSettings = site.seo_settings as { robots_txt?: string } | null
        setRobotsTxt(seoSettings?.robots_txt || DEFAULT_ROBOTS_TXT)

        // Get WordPress domain for sitemap URL
        const integrations = site.integrations as { wordpress?: { domain?: string } } | null
        const wpDomain = integrations?.wordpress?.domain
        if (wpDomain) {
          const cleanDomain = wpDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
          setSitemapUrl(`https://${cleanDomain}/sitemap.xml`)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [siteId])

  const handleSave = async () => {
    setSaving(true)

    try {
      const supabase = createClient()
      // Get current seo_settings and merge with new robots_txt
      const { data: site } = await supabase
        .from('sites')
        .select('seo_settings')
        .eq('id', siteId)
        .single()

      const currentSettings = (site?.seo_settings || {}) as Record<string, unknown>
      await supabase
        .from('sites')
        .update({ seo_settings: { ...currentSettings, robots_txt: robotsTxt } })
        .eq('id', siteId)

      setHasChanges(false)
    } catch (error) {
      console.error('Error saving robots.txt:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRobotsTxt(DEFAULT_ROBOTS_TXT)
    setHasChanges(true)
  }

  const handleCopy = async () => {
    const fullRobotsTxt = sitemapUrl
      ? `${robotsTxt}\n\n# Sitemap\nSitemap: ${sitemapUrl}`
      : robotsTxt

    await navigator.clipboard.writeText(fullRobotsTxt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/settings/seo`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu SEO Einstellungen
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bot className="h-8 w-8 text-purple-500" />
            robots.txt
          </h1>
          <p className="text-muted-foreground mt-2">
            Steuere wie Suchmaschinen deine Website crawlen
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Standard
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Kopieren
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Editor */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">robots.txt Inhalt</CardTitle>
            <CardDescription>
              Definiere Regeln für Suchmaschinen-Crawler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={robotsTxt}
              onChange={(e) => {
                setRobotsTxt(e.target.value)
                setHasChanges(true)
              }}
              className="bg-muted border-border font-mono text-sm min-h-[300px]"
              placeholder="User-agent: *
Allow: /"
            />
          </CardContent>
        </Card>

        {/* Sitemap Info */}
        {sitemapUrl && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Sitemap URL</CardTitle>
              <CardDescription>
                Diese URL wird automatisch zur robots.txt hinzugefügt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block p-3 bg-muted rounded-lg text-purple-400 text-sm">
                Sitemap: {sitemapUrl}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Die Sitemap wird von Unicorn Studio generiert und vom WordPress Plugin bereitgestellt.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Vorschau</CardTitle>
            <CardDescription>
              So sieht deine robots.txt für Suchmaschinen aus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-lg text-foreground text-sm overflow-x-auto whitespace-pre-wrap">
              {robotsTxt}
              {sitemapUrl && (
                <>
                  {'\n\n'}# Sitemap{'\n'}Sitemap: {sitemapUrl}
                </>
              )}
            </pre>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-purple-400 mb-2">
              Wichtige Hinweise
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>
                Die robots.txt wird vom WordPress Plugin automatisch bereitgestellt
              </li>
              <li>
                Änderungen werden bei WordPress-Sync übertragen
              </li>
              <li>
                Die Sitemap-URL wird automatisch hinzugefügt
              </li>
              <li>
                Teste deine robots.txt mit dem Google Search Console Tool
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
