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
import { ChevronDown, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

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
  wordPressConfig: WordPressConfig | null
  wordPressStatus: WordPressStatus
  lastPushedAt: string | null
  isPublishing: boolean
  onPublishWordPress: () => Promise<void>
}

export function PublishDropdown({
  siteId,
  wordPressConfig,
  wordPressStatus,
  lastPushedAt,
  isPublishing,
  onPublishWordPress,
}: PublishDropdownProps) {
  const [open, setOpen] = useState(false)

  // WordPress connection can be via api_key OR via webhook (no api_key needed)
  const hasWordPress = wordPressConfig?.enabled && wordPressConfig?.api_url

  // If no WordPress connection, show simple button (just a static label since Save = Published in Unicorn Studio)
  if (!hasWordPress) {
    return (
      <Button
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
      >
        Veroffentlicht
      </Button>
    )
  }

  const handlePublishWordPress = async () => {
    setOpen(false)
    await onPublishWordPress()
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
        return 'Anderungen vorhanden'
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
              Veroffentlichen
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
  )
}
