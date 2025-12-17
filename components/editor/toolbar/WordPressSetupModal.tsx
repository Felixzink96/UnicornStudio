'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Globe,
  Key,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  X,
  Download,
  Plus,
  Sparkles,
} from 'lucide-react'

interface WordPressSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: string
  onComplete?: () => void
}

// Connection Tester Component
function ConnectionTester({ siteId, onSuccess }: { siteId: string; onSuccess?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectionInfo, setConnectionInfo] = useState<{ domain?: string } | null>(null)

  const testConnection = async () => {
    setStatus('testing')
    setErrorMessage(null)

    try {
      // Check if WordPress has registered with this site
      const response = await fetch(`/api/v1/sites/${siteId}/wordpress/status`)

      if (response.ok) {
        const data = await response.json()
        if (data.connected) {
          setStatus('success')
          setConnectionInfo({ domain: data.domain })
          onSuccess?.()
        } else {
          setStatus('error')
          setErrorMessage('WordPress hat sich noch nicht verbunden. Bitte stelle sicher, dass du die Zugangsdaten im WordPress Plugin eingetragen hast.')
        }
      } else {
        setStatus('error')
        setErrorMessage('Verbindung konnte nicht geprüft werden.')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage('Netzwerkfehler beim Testen der Verbindung.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Verbindung testen
        </span>
        {status === 'success' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Verbunden
          </span>
        )}
      </div>

      {status === 'idle' && (
        <Button onClick={testConnection} variant="outline" className="w-full">
          <Globe className="h-4 w-4 mr-2" />
          Verbindung testen
        </Button>
      )}

      {status === 'testing' && (
        <div className="flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-500">Teste Verbindung...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                WordPress verbunden!
              </p>
              {connectionInfo?.domain && (
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  {connectionInfo.domain}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {errorMessage}
            </p>
          </div>
          <Button onClick={testConnection} variant="outline" size="sm" className="w-full">
            <Loader2 className="h-3.5 w-3.5 mr-1.5" />
            Erneut testen
          </Button>
        </div>
      )}
    </div>
  )
}

interface APIKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
}

export function WordPressSetupModal({
  open,
  onOpenChange,
  siteId,
  onComplete,
}: WordPressSetupModalProps) {
  const [step, setStep] = useState(1)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const totalSteps = 3

  // Load existing API keys
  useEffect(() => {
    if (open) {
      loadAPIKeys()
    }
  }, [open])

  const loadAPIKeys = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/internal/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createAPIKey = async () => {
    if (!newKeyName.trim()) return
    setIsCreating(true)

    try {
      const response = await fetch('/api/internal/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName || 'WordPress Integration',
          permissions: ['read', 'write'],
          allowed_sites: [siteId],
          rate_limit: 1000,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewlyCreatedKey(data.data.key)
        setSelectedKeyId(data.data.apiKey.id)
        setApiKeys([data.data.apiKey, ...apiKeys])
        setNewKeyName('')
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const resetAndClose = () => {
    setStep(1)
    setNewlyCreatedKey(null)
    setSelectedKeyId(null)
    setNewKeyName('')
    onOpenChange(false)
  }

  const handleComplete = () => {
    onComplete?.()
    resetAndClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                WordPress verbinden
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Schritt {step} von {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: API Key erstellen oder auswählen */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <Key className="h-8 w-8 text-white dark:text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  API Key erstellen
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Du brauchst einen API Key um WordPress mit diesem Projekt zu verbinden.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : newlyCreatedKey ? (
                // Show newly created key
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">API Key erstellt!</span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mb-3">
                      Kopiere diesen Key jetzt - er wird nie wieder vollständig angezeigt!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-3 py-2 rounded-lg font-mono text-xs break-all border border-emerald-200 dark:border-emerald-800">
                        {newlyCreatedKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newlyCreatedKey, 'key')}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex-shrink-0"
                      >
                        {copiedField === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Create new key form
                <div className="space-y-4">
                  {apiKeys.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Vorhandene Keys</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {apiKeys.map((key) => (
                          <button
                            key={key.id}
                            onClick={() => {
                              setSelectedKeyId(key.id)
                              setStep(2)
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                          >
                            <Key className="h-4 w-4 text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{key.name}</span>
                            <code className="text-xs text-zinc-400 font-mono ml-auto">{key.key_prefix}•••</code>
                          </button>
                        ))}
                      </div>
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-2 bg-white dark:bg-zinc-900 text-xs text-zinc-400">oder neuen erstellen</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
                      Name für den neuen API Key
                    </label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="z.B. WordPress Production"
                      className="bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>

                  <Button
                    onClick={createAPIKey}
                    disabled={isCreating}
                    loading={isCreating}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreating ? 'Erstelle...' : 'API Key erstellen'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Zugangsdaten kopieren */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <Copy className="h-8 w-8 text-white dark:text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Zugangsdaten kopieren
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Kopiere diese Daten für die WordPress-Einrichtung.
                </p>
              </div>

              <div className="space-y-4">
                {/* Site ID */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
                    Site ID
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2.5 rounded-lg font-mono text-sm border border-zinc-200 dark:border-zinc-700">
                      {siteId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(siteId, 'siteId')}
                      className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                      {copiedField === 'siteId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* API Key (if newly created) */}
                {newlyCreatedKey && (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
                      API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2.5 rounded-lg font-mono text-xs border border-zinc-200 dark:border-zinc-700 break-all">
                        {newlyCreatedKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newlyCreatedKey, 'apiKey')}
                        className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex-shrink-0"
                      >
                        {copiedField === 'apiKey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5">
                      Speichere diesen Key - er wird nicht erneut angezeigt!
                    </p>
                  </div>
                )}

                {!newlyCreatedKey && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Du hast einen bestehenden Key ausgewählt. Falls du den vollständigen Key nicht mehr hast,
                      erstelle bitte einen neuen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: WordPress Plugin installieren & Verbindung testen */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <Download className="h-8 w-8 text-white dark:text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  WordPress einrichten
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Installiere das Plugin und trage die Zugangsdaten ein.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Plugin herunterladen
                    </p>
                    <a
                      href="/api/downloads/plugin/wordpress"
                      download
                      className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600"
                    >
                      <Download className="h-3 w-3" />
                      unicorn-studio-connect.zip
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      In WordPress hochladen & aktivieren
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Plugins → Installieren → Plugin hochladen
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Zugangsdaten eintragen
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Im Plugin unter &quot;Einstellungen&quot; Site ID und API Key einfügen
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection Test Section */}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <ConnectionTester siteId={siteId} onSuccess={onComplete} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Zurück
            </Button>
          ) : (
            <button
              onClick={resetAndClose}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Später
            </button>
          )}

          {step === 1 && newlyCreatedKey && (
            <Button onClick={() => setStep(2)}>
              Weiter
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 2 && (
            <Button onClick={() => setStep(3)}>
              Weiter
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button variant="ghost" onClick={resetAndClose}>
              Schließen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
