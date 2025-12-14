'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Image, Save, Loader2, Upload, X, Globe, Share2 } from 'lucide-react'

interface SiteIdentity {
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  tagline: string | null
  og_image_url: string | null
}

export default function SiteIdentityPage() {
  const params = useParams()
  const siteId = params.siteId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('')
  const [identity, setIdentity] = useState<SiteIdentity>({
    logo_url: null,
    logo_dark_url: null,
    favicon_url: null,
    tagline: null,
    og_image_url: null,
  })
  const [hasChanges, setHasChanges] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const logoDarkInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const ogImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: site } = await supabase
        .from('sites')
        .select('name, logo_url, logo_dark_url, favicon_url, tagline, og_image_url')
        .eq('id', siteId)
        .single()

      if (site) {
        setSiteName(site.name)
        setIdentity({
          logo_url: site.logo_url,
          logo_dark_url: site.logo_dark_url,
          favicon_url: site.favicon_url,
          tagline: site.tagline,
          og_image_url: site.og_image_url,
        })
      }

      setLoading(false)
    }

    loadData()
  }, [siteId])

  const handleUpload = async (file: File, field: keyof SiteIdentity) => {
    if (!file) return

    setUploading(field)

    try {
      const supabase = createClient()

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${siteId}/${field}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) {
        console.error('Upload error:', error)
        // Try creating bucket if it doesn't exist
        if (error.message.includes('bucket')) {
          alert('Storage Bucket "site-assets" muss erst erstellt werden.')
        }
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('site-assets')
        .getPublicUrl(fileName)

      setIdentity(prev => ({ ...prev, [field]: urlData.publicUrl }))
      setHasChanges(true)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(null)
    }
  }

  const handleRemove = (field: keyof SiteIdentity) => {
    setIdentity(prev => ({ ...prev, [field]: null }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const supabase = createClient()
      await supabase
        .from('sites')
        .update({
          logo_url: identity.logo_url,
          logo_dark_url: identity.logo_dark_url,
          favicon_url: identity.favicon_url,
          tagline: identity.tagline,
          og_image_url: identity.og_image_url,
        })
        .eq('id', siteId)

      setHasChanges(false)
    } catch (error) {
      console.error('Error saving site identity:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={logoInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo_url')}
      />
      <input
        type="file"
        ref={logoDarkInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo_dark_url')}
      />
      <input
        type="file"
        ref={faviconInputRef}
        className="hidden"
        accept="image/png,image/x-icon,image/svg+xml"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'favicon_url')}
      />
      <input
        type="file"
        ref={ogImageInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'og_image_url')}
      />

      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/settings`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zuruck zu Einstellungen
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Globe className="h-8 w-8 text-purple-500" />
            Site Identity
          </h1>
          <p className="text-slate-400 mt-2">
            Logo, Favicon und Branding fur {siteName}
          </p>
        </div>

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

      <div className="space-y-6">
        {/* Logo */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Site Logo</CardTitle>
            <CardDescription>
              Das Logo wird im Header angezeigt und von der KI automatisch eingebunden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Logo */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Primares Logo
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Fur helle Hintergrunde (empfohlen: SVG oder PNG mit Transparenz)
                </p>
                {identity.logo_url ? (
                  <div className="relative group">
                    <div className="p-4 bg-white rounded-lg border border-slate-700">
                      <img
                        src={identity.logo_url}
                        alt="Logo"
                        className="h-16 max-w-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => handleRemove('logo_url')}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading === 'logo_url'}
                    className="w-full h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
                  >
                    {uploading === 'logo_url' ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8" />
                        <span className="text-sm">Logo hochladen</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Dark Mode Logo */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Logo fur Dark Mode (optional)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Fur dunkle Hintergrunde - helle Version des Logos
                </p>
                {identity.logo_dark_url ? (
                  <div className="relative group">
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <img
                        src={identity.logo_dark_url}
                        alt="Logo Dark"
                        className="h-16 max-w-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => handleRemove('logo_dark_url')}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoDarkInputRef.current?.click()}
                    disabled={uploading === 'logo_dark_url'}
                    className="w-full h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors bg-slate-800/50"
                  >
                    {uploading === 'logo_dark_url' ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8" />
                        <span className="text-sm">Dark Logo hochladen</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Favicon</CardTitle>
            <CardDescription>
              Das kleine Icon im Browser-Tab (empfohlen: 512x512px PNG oder SVG)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {identity.favicon_url ? (
                <div className="relative group">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <img
                      src={identity.favicon_url}
                      alt="Favicon"
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  <button
                    onClick={() => handleRemove('favicon_url')}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploading === 'favicon_url'}
                  className="h-32 w-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
                >
                  {uploading === 'favicon_url' ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <Image className="h-8 w-8" />
                      <span className="text-xs">Favicon</span>
                    </>
                  )}
                </button>
              )}
              <div className="flex-1">
                <p className="text-sm text-slate-400">
                  Das Favicon wird automatisch in verschiedenen Grossen fur Browser-Tabs,
                  Lesezeichen und App-Icons generiert.
                </p>
                <ul className="text-xs text-slate-500 mt-2 space-y-1">
                  <li>• Browser Tab: 16x16, 32x32</li>
                  <li>• Apple Touch Icon: 180x180</li>
                  <li>• Android Chrome: 192x192, 512x512</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tagline */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Tagline / Slogan</CardTitle>
            <CardDescription>
              Ein kurzer Slogan fur deine Website (wird fur SEO verwendet)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={identity.tagline || ''}
              onChange={(e) => {
                setIdentity(prev => ({ ...prev, tagline: e.target.value }))
                setHasChanges(true)
              }}
              placeholder="z.B. 'Die beste Losung fur...' oder 'Ihr Partner fur...'"
              className="bg-slate-800 border-slate-700"
            />
            <p className="text-xs text-slate-500 mt-2">
              Wird als Standard-Description verwendet, wenn keine spezifische gesetzt ist.
            </p>
          </CardContent>
        </Card>

        {/* OG Image */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Default Social Image
            </CardTitle>
            <CardDescription>
              Das Standardbild fur Social Media Sharing (empfohlen: 1200x630px)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {identity.og_image_url ? (
              <div className="relative group">
                <div className="rounded-lg border border-slate-700 overflow-hidden">
                  <img
                    src={identity.og_image_url}
                    alt="OG Image"
                    className="w-full max-w-lg h-auto object-cover"
                  />
                </div>
                <button
                  onClick={() => handleRemove('og_image_url')}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => ogImageInputRef.current?.click()}
                disabled={uploading === 'og_image_url'}
                className="w-full max-w-lg h-48 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
              >
                {uploading === 'og_image_url' ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <Share2 className="h-8 w-8" />
                    <span className="text-sm">Social Image hochladen</span>
                    <span className="text-xs">1200 x 630 px empfohlen</span>
                  </>
                )}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-purple-400 mb-2">
              Wie die KI das Logo verwendet
            </h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>
                1. Das Logo wird automatisch im Header jeder generierten Seite eingebunden
              </li>
              <li>
                2. Die KI verwendet das passende Logo je nach Hintergrundfarbe
              </li>
              <li>
                3. Bei WordPress-Sync werden Logo und Favicon automatisch ubertragen
              </li>
              <li>
                4. Die Tagline wird als SEO-Fallback verwendet
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
