'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Copy, Check, Link2, Lock, Calendar, MessageSquare, Trash2, ExternalLink } from 'lucide-react'
import { createShareLink, deleteShareLink, getShareLinks, ShareLink } from '@/lib/supabase/queries/share-links'
import { useEffect } from 'react'

interface ShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: string
  pageId?: string
  siteName: string
  pageName?: string
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  siteId,
  pageId,
  siteName,
  pageName,
}: ShareLinkDialogProps) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // New link options
  const [shareScope, setShareScope] = useState<'page' | 'site'>('page')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [useExpiry, setUseExpiry] = useState(false)
  const [expiryDays, setExpiryDays] = useState(7)
  const [allowComments, setAllowComments] = useState(true)

  // Load existing links
  useEffect(() => {
    if (open && siteId) {
      loadLinks()
    }
  }, [open, siteId])

  async function loadLinks() {
    setLoading(true)
    try {
      const data = await getShareLinks(siteId)
      setLinks(data)
    } catch (error) {
      console.error('Error loading share links:', error)
    }
    setLoading(false)
  }

  async function handleCreateLink() {
    setCreating(true)
    try {
      const newLink = await createShareLink({
        site_id: siteId,
        page_id: shareScope === 'page' ? pageId : undefined,
        password: usePassword ? password : undefined,
        expires_at: useExpiry ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined,
        allow_comments: allowComments,
      })
      setLinks([newLink, ...links])

      // Reset form
      setUsePassword(false)
      setPassword('')
      setUseExpiry(false)
      setExpiryDays(7)
    } catch (error) {
      console.error('Error creating share link:', error)
    }
    setCreating(false)
  }

  async function handleDeleteLink(id: string) {
    try {
      await deleteShareLink(id)
      setLinks(links.filter(l => l.id !== id))
    } catch (error) {
      console.error('Error deleting share link:', error)
    }
  }

  function getShareUrl(token: string) {
    return `${window.location.origin}/preview/${token}`
  }

  function copyToClipboard(url: string, linkId: string) {
    navigator.clipboard.writeText(url)
    setCopied(linkId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Share-Link erstellen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new link section */}
          <div className="space-y-4 p-4 bg-zinc-50 rounded-lg dark:bg-zinc-900">
            <h3 className="font-medium text-sm">Neuer Link</h3>

            {/* Scope selection */}
            {pageId && (
              <div className="flex gap-2">
                <Button
                  variant={shareScope === 'page' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShareScope('page')}
                >
                  Nur diese Seite
                </Button>
                <Button
                  variant={shareScope === 'site' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShareScope('site')}
                >
                  Ganzes Projekt
                </Button>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {/* Password protection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <Label className="text-sm">Passwortschutz</Label>
                </div>
                <Switch
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <Input
                  type="password"
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}

              {/* Expiry */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <Label className="text-sm">Ablaufdatum</Label>
                </div>
                <Switch
                  checked={useExpiry}
                  onCheckedChange={setUseExpiry}
                />
              </div>
              {useExpiry && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 7)}
                    className="w-20"
                  />
                  <span className="text-sm text-zinc-500">Tage</span>
                </div>
              )}

              {/* Comments */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  <Label className="text-sm">Anmerkungen erlauben</Label>
                </div>
                <Switch
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                />
              </div>
            </div>

            <Button
              onClick={handleCreateLink}
              disabled={creating || (usePassword && !password)}
              className="w-full"
            >
              {creating ? 'Wird erstellt...' : 'Link erstellen'}
            </Button>
          </div>

          {/* Existing links */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Aktive Links</h3>

            {loading ? (
              <div className="text-center py-4 text-zinc-500">Laden...</div>
            ) : links.length === 0 ? (
              <div className="text-center py-4 text-zinc-500">
                Noch keine Links erstellt
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg dark:bg-zinc-900"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {link.page_id ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            Seite
                          </span>
                        ) : (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">
                            Projekt
                          </span>
                        )}
                        {link.password_hash && (
                          <Lock className="w-3 h-3 text-zinc-400" />
                        )}
                        {link.allow_comments && (
                          <MessageSquare className="w-3 h-3 text-zinc-400" />
                        )}
                      </div>
                      <code className="text-xs text-zinc-600 dark:text-zinc-400 truncate block">
                        {getShareUrl(link.token)}
                      </code>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{link.view_count} Aufrufe</span>
                        {link.expires_at && (
                          <span>
                            Läuft ab: {new Date(link.expires_at).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(getShareUrl(link.token), link.id)}
                      >
                        {copied === link.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(getShareUrl(link.token), '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
