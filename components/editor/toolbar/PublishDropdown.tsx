'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChevronDown, Loader2, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react'
import type { PushResult } from '@/hooks/useWordPress'

export type WordPressStatus = 'current' | 'outdated' | 'error' | 'not_configured'

interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
}

interface PublishDropdownProps {
  siteId: string
  pageId?: string | null
  wordPressConfig: WordPressConfig | null
  wordPressStatus: WordPressStatus
  lastPushedAt: string | null
  isPublishing: boolean
  onPublishWordPress: (pageId?: string) => Promise<PushResult>
}

export function PublishDropdown({
  siteId,
  pageId,
  wordPressConfig,
  wordPressStatus,
  lastPushedAt,
  isPublishing,
  onPublishWordPress,
}: PublishDropdownProps) {
  const [open, setOpen] = useState(false)
  const [lastResult, setLastResult] = useState<PushResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  // WordPress connection can be via api_key OR via webhook (no api_key needed)
  const hasWordPress = wordPressConfig?.enabled && wordPressConfig?.api_url

  // If no WordPress connection, show simple button (just a static label since Save = Published in Unicorn Studio)
  if (!hasWordPress) {
    return (
      <Button
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
      >
        Veröffentlicht
      </Button>
    )
  }

  // Push only current page
  const handlePublishWordPress = async () => {
    setOpen(false)
    setShowResult(false)
    const result = await onPublishWordPress(pageId || undefined)
    setLastResult(result)
    setShowResult(true)

    // Auto-hide after 10 seconds if success
    if (result.success) {
      setTimeout(() => setShowResult(false), 10000)
    }
  }

  const getStatusIcon = () => {
    switch (wordPressStatus) {
      case 'current':
        return <span className="w-2 h-2 rounded-full bg-green-500" />
      case 'outdated':
        return <span className="w-2 h-2 rounded-full bg-orange-500" />
      case 'error':
        return <span className="w-2 h-2 rounded-full bg-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (wordPressStatus) {
      case 'current':
        return 'Aktuell'
      case 'outdated':
        return 'Änderungen vorhanden'
      case 'error':
        return 'Verbindungsfehler'
      default:
        return ''
    }
  }

  const getStatusTooltip = () => {
    if (lastPushedAt) {
      const date = new Date(lastPushedAt)
      return `Letzter Push: ${date.toLocaleString('de-DE')}`
    }
    return 'Noch nie zu WordPress gepusht'
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors gap-1.5"
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Wird gepusht...
              </>
            ) : (
              <>
                Veröffentlichen
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* WordPress Option */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={handlePublishWordPress}
                disabled={isPublishing || wordPressStatus === 'error'}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                  </svg>
                  <div className="flex flex-col">
                    <span>WordPress</span>
                    <span className="text-xs text-muted-foreground">
                      {wordPressConfig.domain}
                    </span>
                  </div>
                </div>
                {getStatusIcon()}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{getStatusTooltip()}</p>
            </TooltipContent>
          </Tooltip>

          {/* Status Info */}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
            {wordPressStatus === 'current' && (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span>{getStatusText()}</span>
              </>
            )}
            {wordPressStatus === 'outdated' && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                <span>{getStatusText()}</span>
              </>
            )}
            {wordPressStatus === 'error' && (
              <>
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span>{getStatusText()}</span>
              </>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Result Notification */}
      {showResult && lastResult && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <div className={`relative p-4 pr-10 rounded-lg shadow-lg border ${
            lastResult.success
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              )}
              <div>
                <div className={`text-sm font-semibold ${
                  lastResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {lastResult.success ? 'Push erfolgreich' : 'Push fehlgeschlagen'}
                </div>
                <div className={`text-xs mt-1 ${
                  lastResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {lastResult.message}
                </div>
                {lastResult.details && (
                  <div className="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {lastResult.details.pages && (
                      <div>Seiten: {lastResult.details.pages.count} {lastResult.details.pages.success ? '✓' : '✗'}</div>
                    )}
                    {lastResult.details.entries && (
                      <div>Einträge: {lastResult.details.entries.count} {lastResult.details.entries.success ? '✓' : '✗'}</div>
                    )}
                    {lastResult.details.content_types && (
                      <div>Content Types: {lastResult.details.content_types.count} {lastResult.details.content_types.success ? '✓' : '✗'}</div>
                    )}
                    {lastResult.details.css && (
                      <div>CSS: {lastResult.details.css.success ? '✓' : '✗'}</div>
                    )}
                  </div>
                )}
                {lastResult.errors && lastResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Fehler: {lastResult.errors.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowResult(false)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
