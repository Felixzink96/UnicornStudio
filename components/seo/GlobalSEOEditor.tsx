'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  Share2,
  ShieldCheck,
  BarChart3,
  Bot,
  Building2,
  Save,
  Loader2,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GlobalSEOSettings } from '@/types/cms'

interface GlobalSEOEditorProps {
  siteId: string
  initialSettings: GlobalSEOSettings
  siteName: string
}

export function GlobalSEOEditor({
  siteId,
  initialSettings,
  siteName,
}: GlobalSEOEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Form state
  const [settings, setSettings] = useState<GlobalSEOSettings>({
    site_name: initialSettings.site_name || siteName,
    title_separator: initialSettings.title_separator || ' | ',
    title_format: initialSettings.title_format || '{{page_title}}{{separator}}{{site_name}}',
    default_meta_description: initialSettings.default_meta_description || '',
    default_og_image: initialSettings.default_og_image || null,
    favicon: initialSettings.favicon || null,
    apple_touch_icon: initialSettings.apple_touch_icon || null,
    google_verification: initialSettings.google_verification || null,
    bing_verification: initialSettings.bing_verification || null,
    google_analytics_id: initialSettings.google_analytics_id || null,
    google_tag_manager_id: initialSettings.google_tag_manager_id || null,
    facebook_pixel_id: initialSettings.facebook_pixel_id || null,
    custom_scripts_head: initialSettings.custom_scripts_head || '',
    custom_scripts_body: initialSettings.custom_scripts_body || '',
    robots_txt: initialSettings.robots_txt || 'User-agent: *\nAllow: /',
    sitemap_enabled: initialSettings.sitemap_enabled ?? true,
    social_profiles: initialSettings.social_profiles || {
      facebook: null,
      twitter: null,
      instagram: null,
      linkedin: null,
      youtube: null,
    },
    local_business: initialSettings.local_business || null,
  })

  const updateSettings = (updates: Partial<GlobalSEOSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  const updateSocialProfile = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      social_profiles: {
        ...prev.social_profiles,
        [key]: value || null,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('sites')
        // @ts-expect-error - GlobalSEOSettings is JSON-serializable
        .update({ seo_settings: settings })
        .eq('id', siteId)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error saving SEO settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="general" className="data-[state=active]:bg-slate-700">
            <Settings className="h-4 w-4 mr-2" />
            Allgemein
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-slate-700">
            <Share2 className="h-4 w-4 mr-2" />
            Social
          </TabsTrigger>
          <TabsTrigger value="verification" className="data-[state=active]:bg-slate-700">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verifizierung
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="robots" className="data-[state=active]:bg-slate-700">
            <Bot className="h-4 w-4 mr-2" />
            Robots
          </TabsTrigger>
          <TabsTrigger value="business" className="data-[state=active]:bg-slate-700">
            <Building2 className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Grundeinstellungen</CardTitle>
              <CardDescription className="text-slate-400">
                Basis-SEO-Konfiguration für deine Website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Site Name</Label>
                <Input
                  value={settings.site_name}
                  onChange={(e) => updateSettings({ site_name: e.target.value })}
                  placeholder="Meine Website"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Title Separator</Label>
                  <Select
                    value={settings.title_separator}
                    onValueChange={(v) => updateSettings({ title_separator: v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value=" | ">| (Pipe)</SelectItem>
                      <SelectItem value=" - ">- (Dash)</SelectItem>
                      <SelectItem value=" — ">— (Em Dash)</SelectItem>
                      <SelectItem value=" • ">• (Bullet)</SelectItem>
                      <SelectItem value=" › ">› (Arrow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Title Format</Label>
                  <Input
                    value={settings.title_format}
                    onChange={(e) => updateSettings({ title_format: e.target.value })}
                    placeholder="{{page_title}}{{separator}}{{site_name}}"
                    className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Standard Meta Description</Label>
                <Textarea
                  value={settings.default_meta_description}
                  onChange={(e) =>
                    updateSettings({ default_meta_description: e.target.value })
                  }
                  placeholder="Beschreibung deiner Website (max. 160 Zeichen)"
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={3}
                />
                <p className="text-xs text-slate-500">
                  {settings.default_meta_description.length} / 160 Zeichen
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Icons & Bilder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Favicon URL</Label>
                  <Input
                    value={settings.favicon || ''}
                    onChange={(e) => updateSettings({ favicon: e.target.value || null })}
                    placeholder="/favicon.ico"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Apple Touch Icon</Label>
                  <Input
                    value={settings.apple_touch_icon || ''}
                    onChange={(e) =>
                      updateSettings({ apple_touch_icon: e.target.value || null })
                    }
                    placeholder="/apple-touch-icon.png"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Standard OG Image</Label>
                <Input
                  value={settings.default_og_image || ''}
                  onChange={(e) =>
                    updateSettings({ default_og_image: e.target.value || null })
                  }
                  placeholder="https://example.com/og-image.jpg"
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Empfohlen: 1200x630 Pixel
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Social Media Profile</CardTitle>
              <CardDescription className="text-slate-400">
                Links zu deinen Social-Media-Profilen für Schema.org
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  value={settings.social_profiles?.facebook || ''}
                  onChange={(e) => updateSocialProfile('facebook', e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter / X
                </Label>
                <Input
                  value={settings.social_profiles?.twitter || ''}
                  onChange={(e) => updateSocialProfile('twitter', e.target.value)}
                  placeholder="https://twitter.com/yourhandle"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  value={settings.social_profiles?.instagram || ''}
                  onChange={(e) => updateSocialProfile('instagram', e.target.value)}
                  placeholder="https://instagram.com/yourhandle"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  value={settings.social_profiles?.linkedin || ''}
                  onChange={(e) => updateSocialProfile('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </Label>
                <Input
                  value={settings.social_profiles?.youtube || ''}
                  onChange={(e) => updateSocialProfile('youtube', e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Suchmaschinen-Verifizierung</CardTitle>
              <CardDescription className="text-slate-400">
                Verifiziere deine Website bei Suchmaschinen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Google Search Console</Label>
                <Input
                  value={settings.google_verification || ''}
                  onChange={(e) =>
                    updateSettings({ google_verification: e.target.value || null })
                  }
                  placeholder="Verifizierungscode"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
                <p className="text-xs text-slate-500">
                  Nur den Code, nicht das komplette Meta-Tag
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Bing Webmaster Tools</Label>
                <Input
                  value={settings.bing_verification || ''}
                  onChange={(e) =>
                    updateSettings({ bing_verification: e.target.value || null })
                  }
                  placeholder="Verifizierungscode"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Analytics & Tracking</CardTitle>
              <CardDescription className="text-slate-400">
                Tracking-Codes für Analytics-Dienste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Google Analytics 4</Label>
                <Input
                  value={settings.google_analytics_id || ''}
                  onChange={(e) =>
                    updateSettings({ google_analytics_id: e.target.value || null })
                  }
                  placeholder="G-XXXXXXXXXX"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Google Tag Manager</Label>
                <Input
                  value={settings.google_tag_manager_id || ''}
                  onChange={(e) =>
                    updateSettings({ google_tag_manager_id: e.target.value || null })
                  }
                  placeholder="GTM-XXXXXXX"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Facebook Pixel</Label>
                <Input
                  value={settings.facebook_pixel_id || ''}
                  onChange={(e) =>
                    updateSettings({ facebook_pixel_id: e.target.value || null })
                  }
                  placeholder="XXXXXXXXXXXXXXXXX"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Benutzerdefinierte Scripts</CardTitle>
              <CardDescription className="text-slate-400">
                Zusätzliche Scripts für Head und Body
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Head Scripts</Label>
                <Textarea
                  value={settings.custom_scripts_head}
                  onChange={(e) =>
                    updateSettings({ custom_scripts_head: e.target.value })
                  }
                  placeholder="<!-- Scripts für den <head> Bereich -->"
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Body Scripts</Label>
                <Textarea
                  value={settings.custom_scripts_body}
                  onChange={(e) =>
                    updateSettings({ custom_scripts_body: e.target.value })
                  }
                  placeholder="<!-- Scripts vor </body> -->"
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Robots Tab */}
        <TabsContent value="robots" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Robots & Sitemap</CardTitle>
              <CardDescription className="text-slate-400">
                Konfiguration für Suchmaschinen-Crawler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <Label className="text-white">Sitemap aktivieren</Label>
                  <p className="text-xs text-slate-500">
                    Automatische XML-Sitemap generieren
                  </p>
                </div>
                <Switch
                  checked={settings.sitemap_enabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ sitemap_enabled: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">robots.txt</Label>
                <Textarea
                  value={settings.robots_txt}
                  onChange={(e) => updateSettings({ robots_txt: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Lokales Unternehmen</CardTitle>
              <CardDescription className="text-slate-400">
                Schema.org LocalBusiness Markup für lokale SEO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <Label className="text-white">Local Business aktivieren</Label>
                  <p className="text-xs text-slate-500">
                    Strukturierte Daten für lokale Unternehmen
                  </p>
                </div>
                <Switch
                  checked={!!settings.local_business?.enabled}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      local_business: checked
                        ? {
                            enabled: true,
                            type: 'LocalBusiness',
                            name: settings.site_name,
                            address: { street: '', city: '', postal_code: '', country: 'DE' },
                            phone: '',
                            email: '',
                          }
                        : null,
                    })
                  }
                />
              </div>

              {settings.local_business?.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Unternehmensname</Label>
                      <Input
                        value={settings.local_business.name}
                        onChange={(e) =>
                          updateSettings({
                            local_business: {
                              ...settings.local_business!,
                              name: e.target.value,
                            },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Typ</Label>
                      <Select
                        value={settings.local_business.type}
                        onValueChange={(v) =>
                          updateSettings({
                            local_business: {
                              ...settings.local_business!,
                              type: v,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="LocalBusiness">Lokales Unternehmen</SelectItem>
                          <SelectItem value="Restaurant">Restaurant</SelectItem>
                          <SelectItem value="Store">Geschäft</SelectItem>
                          <SelectItem value="ProfessionalService">Dienstleister</SelectItem>
                          <SelectItem value="MedicalBusiness">Medizin/Gesundheit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Straße</Label>
                    <Input
                      value={settings.local_business.address.street}
                      onChange={(e) =>
                        updateSettings({
                          local_business: {
                            ...settings.local_business!,
                            address: {
                              ...settings.local_business!.address,
                              street: e.target.value,
                            },
                          },
                        })
                      }
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">PLZ</Label>
                      <Input
                        value={settings.local_business.address.postal_code}
                        onChange={(e) =>
                          updateSettings({
                            local_business: {
                              ...settings.local_business!,
                              address: {
                                ...settings.local_business!.address,
                                postal_code: e.target.value,
                              },
                            },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-slate-300">Stadt</Label>
                      <Input
                        value={settings.local_business.address.city}
                        onChange={(e) =>
                          updateSettings({
                            local_business: {
                              ...settings.local_business!,
                              address: {
                                ...settings.local_business!.address,
                                city: e.target.value,
                              },
                            },
                          })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Telefon</Label>
                      <Input
                        value={settings.local_business.phone}
                        onChange={(e) =>
                          updateSettings({
                            local_business: {
                              ...settings.local_business!,
                              phone: e.target.value,
                            },
                          })
                        }
                        placeholder="+49 123 456789"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">E-Mail</Label>
                      <Input
                        value={settings.local_business.email}
                        onChange={(e) =>
                          updateSettings({
                            local_business: {
                              ...settings.local_business!,
                              email: e.target.value,
                            },
                          })
                        }
                        placeholder="info@example.com"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Einstellungen speichern
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
