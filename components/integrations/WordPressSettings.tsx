'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
  [key: string]: unknown // Index signature for JSON compatibility
}

interface WordPressSettingsProps {
  siteId: string
  initialConfig?: WordPressConfig
  siteUpdatedAt: string
  lastPushedAt: string | null
}

export function WordPressSettings({
  siteId,
  initialConfig,
  siteUpdatedAt,
  lastPushedAt,
}: WordPressSettingsProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    status: 'connected' | 'error'
    error?: string
  } | null>(null)

  // Form state
  const [config, setConfig] = useState<WordPressConfig>({
    enabled: initialConfig?.enabled ?? false,
    api_url: initialConfig?.api_url ?? '',
    api_key: initialConfig?.api_key ?? '',
    domain: initialConfig?.domain ?? '',
    connection_status: initialConfig?.connection_status ?? 'untested',
    last_connection_test: initialConfig?.last_connection_test ?? null,
  })

  const updateConfig = (updates: Partial<WordPressConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
    setTestResult(null) // Reset test result on change
  }

  // Extract domain from API URL
  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url)
      return parsed.hostname
    } catch {
      return ''
    }
  }

  const handleApiUrlChange = (url: string) => {
    updateConfig({
      api_url: url,
      domain: extractDomain(url),
    })
  }

  const handleTestConnection = async () => {
    if (!config.api_url || !config.api_key) return

    setIsTesting(true)
    setTestResult(null)

    try {
      // First save the config
      await handleSave(false)

      // Then test the connection via internal API
      const response = await fetch(`/api/internal/wordpress/test?siteId=${siteId}`, {
        method: 'GET',
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          status: data.data.status,
          error: data.data.error,
        })
        updateConfig({
          connection_status: data.data.status,
          last_connection_test: data.data.tested_at,
        })
      } else {
        setTestResult({
          status: 'error',
          error: data.error?.message || 'Verbindungstest fehlgeschlagen',
        })
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async (showRefresh = true) => {
    setIsSaving(true)
    try {
      const supabase = createClient()

      // Get current integrations
      const { data: site } = await supabase
        .from('sites')
        .select('integrations')
        .eq('id', siteId)
        .single()

      const currentIntegrations = (site?.integrations || {}) as Record<string, unknown>

      // Update WordPress config
      const updatedIntegrations = {
        ...currentIntegrations,
        wordpress: config,
      } as { [key: string]: Json | undefined }

      const { error } = await supabase
        .from('sites')
        .update({
          integrations: updatedIntegrations,
        })
        .eq('id', siteId)

      if (error) throw error

      // If WordPress is enabled, ensure webhook exists
      if (config.enabled && config.api_url) {
        await ensureWebhookExists(supabase)
      }

      if (showRefresh) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving WordPress settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Create or update webhook for WordPress
  const ensureWebhookExists = async (supabase: ReturnType<typeof createClient>) => {
    // Build webhook URL from API URL
    const webhookUrl = config.api_url.endsWith('/webhook')
      ? config.api_url
      : `${config.api_url.replace(/\/$/, '')}/webhook`

    // Check if webhook already exists
    const { data: existingWebhooks } = await supabase
      .from('webhooks')
      .select('id, url')
      .eq('site_id', siteId)
      .eq('is_active', true)

    const hasWordPressWebhook = existingWebhooks?.some(
      (w) => w.url.includes('wp-json') || w.url.includes('wordpress') || w.url.includes('/unicorn-studio/')
    )

    if (!hasWordPressWebhook) {
      // Create new webhook
      const webhookSecret = crypto.randomUUID()

      await supabase.from('webhooks').insert({
        site_id: siteId,
        url: webhookUrl,
        secret: webhookSecret,
        events: [
          'entry.created',
          'entry.updated',
          'entry.deleted',
          'entry.published',
          'content_type.created',
          'content_type.updated',
          'page.updated',
          'taxonomy.updated',
          'css.updated',
        ],
        is_active: true,
      })
    }
  }

  // Calculate sync status
  const getSyncStatus = () => {
    if (!config.enabled) return null
    if (config.connection_status === 'error') return 'error'
    if (!lastPushedAt) return 'outdated'
    if (new Date(siteUpdatedAt) > new Date(lastPushedAt)) return 'outdated'
    return 'current'
  }

  const syncStatus = getSyncStatus()

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                <path d="M12.001 5.5a1 1 0 00-.981.804l-1.02 5.1-1.021-2.553a1 1 0 00-1.858 0l-1.02 2.553-1.021-5.1a1 1 0 10-1.958.392l1.5 7.5a1 1 0 001.858.196l1.02-2.553 1.021 2.553a1 1 0 001.858-.196l1.5-7.5a1 1 0 00-.878-1.196z"/>
              </svg>
              WordPress
            </CardTitle>
            <CardDescription className="text-slate-400">
              Verbinde diese Site mit deiner WordPress-Installation
            </CardDescription>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
      </CardHeader>

      {config.enabled && (
        <CardContent className="space-y-6">
          {/* Connection Status */}
          {config.connection_status !== 'untested' && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg ${
                config.connection_status === 'connected'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              {config.connection_status === 'connected' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <p
                  className={
                    config.connection_status === 'connected'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {config.connection_status === 'connected'
                    ? 'Verbindung erfolgreich'
                    : 'Verbindungsfehler'}
                </p>
                {config.last_connection_test && (
                  <p className="text-xs text-slate-500">
                    Zuletzt getestet:{' '}
                    {new Date(config.last_connection_test).toLocaleString('de-DE')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg ${
                syncStatus === 'current'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : syncStatus === 'outdated'
                  ? 'bg-orange-500/10 border border-orange-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              {syncStatus === 'current' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : syncStatus === 'outdated' ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <p
                  className={
                    syncStatus === 'current'
                      ? 'text-green-400'
                      : syncStatus === 'outdated'
                      ? 'text-orange-400'
                      : 'text-red-400'
                  }
                >
                  {syncStatus === 'current'
                    ? 'WordPress ist aktuell'
                    : syncStatus === 'outdated'
                    ? 'Anderungen vorhanden'
                    : 'Sync-Fehler'}
                </p>
                {lastPushedAt && (
                  <p className="text-xs text-slate-500">
                    Letzter Push: {new Date(lastPushedAt).toLocaleString('de-DE')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* API URL */}
          <div className="space-y-2">
            <Label className="text-slate-300">WordPress API URL</Label>
            <Input
              value={config.api_url}
              onChange={(e) => handleApiUrlChange(e.target.value)}
              placeholder="https://deine-domain.de/wp-json/unicorn-studio/v1"
              className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Die URL findest du in den WordPress Plugin-Einstellungen unter Unicorn Studio Connect
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label className="text-slate-300">API Key</Label>
            <Input
              type="password"
              value={config.api_key}
              onChange={(e) => updateConfig({ api_key: e.target.value })}
              placeholder="sk-us-xxxxxxxx-xxxxxxxx"
              className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Erstelle einen API Key unter{' '}
              <a
                href="/dashboard/settings/api-keys"
                className="text-purple-400 hover:text-purple-300"
              >
                Einstellungen → API Keys
              </a>
            </p>
          </div>

          {/* Domain (auto-filled) */}
          {config.domain && (
            <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              <span className="text-slate-300">Domain:</span>
              <span className="text-white font-medium">{config.domain}</span>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-4 rounded-lg ${
                testResult.status === 'connected'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {testResult.status === 'connected' ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Verbindung erfolgreich!
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-5 w-5" />
                    Verbindung fehlgeschlagen
                  </div>
                  {testResult.error && (
                    <p className="text-sm opacity-75">{testResult.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !config.api_url || !config.api_key}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Teste...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verbindung testen
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSave(true)}
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
                  Speichern
                </>
              )}
            </Button>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-300 mb-2">
              WordPress Plugin noch nicht installiert?
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Du benotigst das Unicorn Studio Connect Plugin, um WordPress mit dieser Site zu verbinden.
            </p>
            <a
              href="/dashboard/settings/integrations"
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
            >
              <ExternalLink className="h-4 w-4" />
              Plugin herunterladen
            </a>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
