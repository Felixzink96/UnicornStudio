'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { History, RotateCcw, Eye, Loader2, Clock, User } from 'lucide-react'
import {
  getPageVersions,
  restorePageVersion,
  type PageVersion,
} from '@/lib/supabase/queries/page-versions'
import { toast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface VersionHistoryProps {
  pageId: string
  onRestore?: () => void
}

export function VersionHistory({ pageId, onRestore }: VersionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<PageVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<number | null>(null)
  const [previewVersion, setPreviewVersion] = useState<PageVersion | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<PageVersion | null>(null)

  // Load versions when sheet opens
  useEffect(() => {
    if (open && pageId) {
      loadVersions()
    }
  }, [open, pageId])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const data = await getPageVersions(pageId)
      setVersions(data)
    } catch (error) {
      console.error('Failed to load versions:', error)
      toast.error('Fehler', 'Versionen konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (version: PageVersion) => {
    setRestoring(version.version_number)
    try {
      await restorePageVersion(pageId, version.version_number)
      toast.success('Wiederhergestellt', `Version ${version.version_number} wurde wiederhergestellt`)
      setConfirmRestore(null)
      onRestore?.()
    } catch (error) {
      console.error('Failed to restore version:', error)
      toast.error('Fehler', 'Version konnte nicht wiederhergestellt werden')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-zinc-600"
      >
        <History className="h-4 w-4" />
        Versionen
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Versionshistorie
            </SheetTitle>
            <SheetDescription>
              Alle automatisch gespeicherten Versionen dieser Seite
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-6 pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">Noch keine Versionen vorhanden</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Versionen werden automatisch bei Änderungen erstellt
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          v{version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Letzte Version
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewVersion(version)}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmRestore(version)}
                          disabled={restoring === version.version_number}
                          className="h-8 px-2"
                        >
                          {restoring === version.version_number ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                    {version.change_summary && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                        {version.change_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Sheet open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>
              Vorschau - Version {previewVersion?.version_number}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100%-80px)] overflow-auto rounded-lg border bg-white">
            {previewVersion?.html_content ? (
              <div
                className="p-4"
                dangerouslySetInnerHTML={{ __html: previewVersion.html_content }}
              />
            ) : (
              <div className="p-8 text-center text-zinc-500">
                Kein HTML-Inhalt in dieser Version
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Restore Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Version wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diese Seite auf Version {confirmRestore?.version_number} zurücksetzen?
              Die aktuelle Version wird vorher automatisch gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
            >
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
