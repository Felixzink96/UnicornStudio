'use client'

import { useState, useEffect } from 'react'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Shield,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface APIKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  allowed_sites: string[] | null
  rate_limit: number
  is_active: boolean
  last_used_at: string | null
  created_at: string
  expires_at: string | null
}

interface Site {
  id: string
  name: string
}

interface APIKeyManagerProps {
  organizationId: string
  sites: Site[]
}

export function APIKeyManager({ organizationId, sites }: APIKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read'])
  const [newKeyAllowedSites, setNewKeyAllowedSites] = useState<string[]>([])
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000)

  // New key display
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  // Load API keys
  useEffect(() => {
    loadAPIKeys()
  }, [organizationId])

  async function loadAPIKeys() {
    try {
      setLoading(true)
      const response = await fetch('/api/internal/api-keys')
      if (!response.ok) throw new Error('Failed to load API keys')
      const data = await response.json()
      setApiKeys(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  async function createAPIKey() {
    try {
      setCreating(true)
      const response = await fetch('/api/internal/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
          allowed_sites: newKeyAllowedSites.length > 0 ? newKeyAllowedSites : null,
          rate_limit: newKeyRateLimit,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to create API key')
      }

      const data = await response.json()
      setNewlyCreatedKey(data.data.key)
      setApiKeys([data.data.apiKey, ...apiKeys])

      // Reset form
      setNewKeyName('')
      setNewKeyPermissions(['read'])
      setNewKeyAllowedSites([])
      setNewKeyRateLimit(1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  async function deleteAPIKey(id: string) {
    try {
      const response = await fetch(`/api/internal/api-keys?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete API key')

      setApiKeys(apiKeys.filter((key) => key.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  function formatDate(date: string | null) {
    if (!date) return 'Nie'
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function togglePermission(permission: string) {
    if (newKeyPermissions.includes(permission)) {
      setNewKeyPermissions(newKeyPermissions.filter((p) => p !== permission))
    } else {
      setNewKeyPermissions([...newKeyPermissions, permission])
    }
  }

  function toggleSite(siteId: string) {
    if (newKeyAllowedSites.includes(siteId)) {
      setNewKeyAllowedSites(newKeyAllowedSites.filter((s) => s !== siteId))
    } else {
      setNewKeyAllowedSites([...newKeyAllowedSites, siteId])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400">
          API Keys ermöglichen externen Systemen wie WordPress den Zugriff auf deine Unicorn Studio Daten.
        </p>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Neuer API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Neuen API Key erstellen</DialogTitle>
              <DialogDescription className="text-slate-400">
                Erstelle einen API Key für externe Integrationen wie WordPress.
              </DialogDescription>
            </DialogHeader>

            {newlyCreatedKey ? (
              <div className="space-y-4 py-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-green-400 font-medium">API Key erstellt!</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Speichere diesen Key jetzt - er wird nie wieder angezeigt!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-800 text-white px-3 py-2 rounded font-mono text-sm break-all">
                      {newlyCreatedKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newlyCreatedKey)}
                    >
                      {keyCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setNewlyCreatedKey(null)
                    setCreateDialogOpen(false)
                  }}
                >
                  Fertig
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Name</Label>
                    <Input
                      id="name"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="z.B. WordPress Production"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  {/* Permissions */}
                  <div className="space-y-2">
                    <Label className="text-white">Berechtigungen</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'read', label: 'Lesen', desc: 'Daten abrufen' },
                        { value: 'write', label: 'Schreiben', desc: 'Daten erstellen/ändern' },
                        { value: 'delete', label: 'Löschen', desc: 'Daten löschen' },
                      ].map((perm) => (
                        <div
                          key={perm.value}
                          className="flex items-center space-x-3 bg-slate-800/50 rounded-lg p-3"
                        >
                          <Checkbox
                            id={perm.value}
                            checked={newKeyPermissions.includes(perm.value)}
                            onCheckedChange={() => togglePermission(perm.value)}
                          />
                          <div>
                            <label htmlFor={perm.value} className="text-white font-medium cursor-pointer">
                              {perm.label}
                            </label>
                            <p className="text-slate-400 text-sm">{perm.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Site Access */}
                  <div className="space-y-2">
                    <Label className="text-white">Site-Zugriff</Label>
                    <p className="text-slate-400 text-sm">
                      Keine Auswahl = Zugriff auf alle Sites
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {sites.map((site) => (
                        <div
                          key={site.id}
                          className="flex items-center space-x-3 bg-slate-800/50 rounded-lg p-3"
                        >
                          <Checkbox
                            id={`site-${site.id}`}
                            checked={newKeyAllowedSites.includes(site.id)}
                            onCheckedChange={() => toggleSite(site.id)}
                          />
                          <label
                            htmlFor={`site-${site.id}`}
                            className="text-white cursor-pointer"
                          >
                            {site.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rate Limit */}
                  <div className="space-y-2">
                    <Label htmlFor="rateLimit" className="text-white">
                      Rate Limit (Requests/Stunde)
                    </Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 1000)}
                      min={100}
                      max={10000}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    className="border-slate-700"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={createAPIKey}
                    disabled={!newKeyName.trim() || creating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Erstelle...
                      </>
                    ) : (
                      'API Key erstellen'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
          <Key className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Keine API Keys vorhanden
          </h3>
          <p className="text-slate-400 mb-4">
            Erstelle deinen ersten API Key um externe Integrationen zu ermöglichen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{key.name}</h3>
                    {key.is_active ? (
                      <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <code className="bg-slate-700/50 px-2 py-1 rounded text-sm font-mono">
                      {key.key_prefix}•••••••••••••••••••
                    </code>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border-slate-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        API Key löschen?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        Dieser API Key wird dauerhaft gelöscht. Alle Integrationen
                        die diesen Key verwenden werden nicht mehr funktionieren.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-slate-700">
                        Abbrechen
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAPIKey(key.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Shield className="h-4 w-4" />
                    Berechtigungen
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.map((perm) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="text-xs border-slate-600 text-slate-300"
                      >
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Globe className="h-4 w-4" />
                    Sites
                  </div>
                  <p className="text-white text-sm">
                    {key.allowed_sites ? `${key.allowed_sites.length} Sites` : 'Alle Sites'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Calendar className="h-4 w-4" />
                    Erstellt
                  </div>
                  <p className="text-white text-sm">{formatDate(key.created_at)}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Clock className="h-4 w-4" />
                    Zuletzt verwendet
                  </div>
                  <p className="text-white text-sm">{formatDate(key.last_used_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API Documentation Link */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">API Dokumentation</h3>
        <p className="text-slate-400 mb-4">
          Erfahre mehr über die Verwendung der REST API für WordPress-Integrationen und andere externe Systeme.
        </p>
        <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm">
          <p className="text-slate-400 mb-2"># Beispiel: Alle Entries abrufen</p>
          <p className="text-white">
            curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot; \
          </p>
          <p className="text-white pl-4">
            https://app.unicorn.studio/api/v1/sites/SITE_ID/entries
          </p>
        </div>
      </div>
    </div>
  )
}
