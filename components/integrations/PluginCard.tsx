'use client'

import { useState } from 'react'
import { Download, ExternalLink, Check, Clock, Loader2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Platform icons as simple SVGs
const PlatformIcons: Record<string, React.ReactNode> = {
  wordpress: (
    <svg className="w-10 h-10" viewBox="0 0 122.52 122.523" fill="currentColor">
      <path d="M8.708 61.26c0 20.802 12.089 38.779 29.619 47.298L13.258 39.872a52.354 52.354 0 0 0-4.55 21.388zM96.74 58.608c0-6.495-2.333-10.993-4.334-14.494-2.664-4.329-5.161-7.995-5.161-12.324 0-4.831 3.664-9.328 8.825-9.328.233 0 .454.029.681.042-9.35-8.566-21.807-13.796-35.489-13.796-18.36 0-34.513 9.42-43.91 23.688 1.233.037 2.395.063 3.382.063 5.497 0 14.006-.667 14.006-.667 2.833-.167 3.167 3.994.337 4.329 0 0-2.847.335-6.015.501L48.2 93.547l11.501-34.493-8.188-22.434c-2.83-.166-5.511-.501-5.511-.501-2.832-.166-2.5-4.496.332-4.329 0 0 8.679.667 13.843.667 5.496 0 14.006-.667 14.006-.667 2.835-.167 3.168 3.994.337 4.329 0 0-2.853.335-6.015.501l18.992 56.494 5.242-17.517c2.272-7.269 4.001-12.49 4.001-16.989z"/>
      <path d="M62.184 65.857l-15.768 45.819a52.552 52.552 0 0 0 32.262-.836 4.68 4.68 0 0 1-.37-.712L62.184 65.857zM107.376 36.046c.226 1.674.354 3.471.354 5.404 0 5.333-.996 11.328-3.996 18.824l-16.053 46.413c15.624-9.111 26.133-26.038 26.133-45.426.001-9.137-2.333-17.729-6.438-25.215z"/>
      <path d="M61.262 0C27.483 0 0 27.481 0 61.26c0 33.783 27.483 61.263 61.262 61.263 33.778 0 61.265-27.48 61.265-61.263C122.526 27.481 95.04 0 61.262 0zm0 119.715c-32.23 0-58.453-26.223-58.453-58.455 0-32.23 26.222-58.451 58.453-58.451 32.229 0 58.45 26.221 58.45 58.451 0 32.232-26.221 58.455-58.45 58.455z"/>
    </svg>
  ),
  shopify: (
    <svg className="w-10 h-10" viewBox="0 0 109.5 124.5" fill="currentColor">
      <path d="M95.9 23.9c-.1-.6-.6-1-1.1-1-.5 0-9.3-.2-9.3-.2s-7.4-7.2-8.1-7.9c-.2-.2-.4-.3-.6-.4v-.1l-3 .9c-1.8-5.2-5-9.9-10.6-9.9h-.5c-1.6-2.1-3.6-3-5.3-3-13.2 0-19.5 16.5-21.5 24.9-5.2 1.6-8.8 2.7-9.3 2.9-2.9.9-3 1-3.4 3.7-.3 2-7.8 60.4-7.8 60.4l58.9 11 32-6.9s-17-113.6-17.1-114.1-1.2-.3-1.3-.3zM67.2 16.8l-4.5 1.4c0-3.5-.5-8.5-2.1-12.6 5.2 1 7.7 6.8 6.6 11.2zm-11.5 3.5l-9.7 3c1.9-7.2 5.5-10.7 8.6-12 1.6 2.7 2.2 6.3 1.1 9zm-6.8-14.5c.6 0 1.1.2 1.6.5-4.1 1.9-8.5 6.8-10.3 16.4l-7.7 2.4c2.1-7.3 7.3-19.3 16.4-19.3z"/>
      <path d="M94.8 22.9c-.5 0-9.3-.2-9.3-.2s-7.4-7.2-8.1-7.9c-.3-.3-.6-.4-1-.5l-5.8 119.8 42-9.1s-17-113.6-17.1-114.1c-.2-.6-.6-1-1.1-1z"/>
      <path d="M57.5 41.2L53.3 57c-3.9-2.1-8.5-4.3-12.8-4.3-7 0-8.9 4.5-8.9 7.1 0 7.7 20.2 10.7 20.2 28.9 0 14.3-9.1 23.5-21.3 23.5-14.7 0-22.2-9.2-22.2-9.2l3.9-13.1s7.7 6.6 14.2 6.6c4.3 0 6-3.4 6-5.9 0-10.1-16.6-10.5-16.6-27.2 0-14 10.1-27.5 30.4-27.5 7.8-.1 11.7 2.3 11.7 2.3z"/>
    </svg>
  ),
  webflow: (
    <svg className="w-10 h-10" viewBox="0 0 256 153" fill="currentColor">
      <path d="M182.95 0c-24.597 36.98-37.835 62.369-79.153 152.97h-.112c-5.596-26.136-14.777-51.14-27.324-74.386 0 0-45.125 74.386-76.361 74.386C-.226 153.082 0 146.42 0 146.42c24.597-36.98 37.835-62.369 79.153-152.97h.112c5.596 26.136 14.777 51.14 27.324 74.386 0 0 45.125-74.386 76.361-74.386.338.112.112 6.662 0 6.55zM256 6.55h-41.936c-24.485 36.867-52.272 78.86-73.261 146.42h41.936c24.485-36.867 52.272-78.86 73.261-146.42z"/>
    </svg>
  ),
  wix: (
    <svg className="w-10 h-10" viewBox="0 0 196 80" fill="currentColor">
      <path d="M45.28 18.24c-3.2 0-5.76 1.08-7.68 3.24-1.92 2.16-2.88 5.04-2.88 8.64v31.84h10.56V30.12c0-1.2.36-2.16 1.08-2.88.72-.72 1.68-1.08 2.88-1.08 1.2 0 2.16.36 2.88 1.08.72.72 1.08 1.68 1.08 2.88v31.84h10.56V30.12c0-3.6-.96-6.48-2.88-8.64-1.92-2.16-4.48-3.24-7.68-3.24-3.2 0-5.76 1.08-7.68 3.24-.24.24-.48.48-.72.72-.24-.24-.48-.48-.72-.72-1.92-2.16-4.48-3.24-7.68-3.24-3.2 0-5.76 1.08-7.68 3.24-1.92 2.16-2.88 5.04-2.88 8.64v31.84h10.56V30.12c0-1.2.36-2.16 1.08-2.88.72-.72 1.68-1.08 2.88-1.08 1.2 0 2.16.36 2.88 1.08.72.72 1.08 1.68 1.08 2.88v31.84h10.56V30.12c0-3.6-.96-6.48-2.88-8.64z"/>
      <path d="M196 18.24h-10.56v43.72H196V18.24zM111.92 61.96l-8.64-21.84-8.64 21.84h-11.28L98.72 18.24h9.12l15.36 43.72h-11.28zM140.08 18.24l-8.64 21.84-8.64-21.84h-11.28l15.36 43.72h9.12l15.36-43.72h-11.28z"/>
    </svg>
  ),
}

interface Plugin {
  id: string
  name: string
  platform: string
  description: string
  version: string | null
  requires: string
  features: string[]
  downloadUrl: string | null
  themeDownloadUrl?: string | null
  documentationUrl: string | null
  icon: string
  status: 'stable' | 'coming_soon'
}

interface PluginCardProps {
  plugin: Plugin
}

export function PluginCard({ plugin }: PluginCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadingTheme, setDownloadingTheme] = useState(false)

  async function handleDownload() {
    if (!plugin.downloadUrl) return

    setDownloading(true)

    try {
      // Trigger download
      const link = document.createElement('a')
      link.href = plugin.downloadUrl
      link.download = `${plugin.id}-plugin.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setTimeout(() => setDownloading(false), 1000)
    }
  }

  async function handleThemeDownload() {
    if (!plugin.themeDownloadUrl) return

    setDownloadingTheme(true)

    try {
      const link = document.createElement('a')
      link.href = plugin.themeDownloadUrl
      link.download = 'unicorn-studio-blank-theme.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setTimeout(() => setDownloadingTheme(false), 1000)
    }
  }

  const isAvailable = plugin.status === 'stable'

  return (
    <div
      className={`
        bg-slate-800/50 rounded-xl border p-6 flex flex-col
        ${isAvailable ? 'border-slate-700' : 'border-slate-700/50'}
        ${!isAvailable && 'opacity-75'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`text-slate-300 ${!isAvailable && 'opacity-50'}`}>
            {PlatformIcons[plugin.icon] || PlatformIcons.wordpress}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{plugin.name}</h3>
            <p className="text-slate-400 text-sm">{plugin.platform}</p>
          </div>
        </div>
        {isAvailable ? (
          <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
            v{plugin.version}
          </Badge>
        ) : (
          <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Bald
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-4">
        {plugin.description}
      </p>

      {/* Requirements */}
      <p className="text-slate-500 text-xs mb-4">
        Voraussetzungen: {plugin.requires}
      </p>

      {/* Features */}
      <div className="mb-6 flex-1">
        <p className="text-slate-300 text-sm font-medium mb-2">Features:</p>
        <ul className="space-y-1">
          {plugin.features.slice(0, isAvailable ? 6 : 4).map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-slate-400 text-sm">
              <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex gap-3">
          {isAvailable ? (
            <>
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lädt...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Plugin Download
                  </>
                )}
              </Button>
              {plugin.documentationUrl && (
                <Button
                  variant="outline"
                  className="border-slate-600"
                  asChild
                >
                  <a href={plugin.documentationUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </>
          ) : (
            <div className="w-full text-center py-2 px-4 bg-slate-700/50 rounded-lg text-slate-400 text-sm">
              In Entwicklung
            </div>
          )}
        </div>

        {/* Theme Download - nur für WordPress */}
        {plugin.themeDownloadUrl && isAvailable && (
          <div className="pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2">
              Optionales Blank Theme (0 CSS, perfekt für Tailwind)
            </p>
            <Button
              onClick={handleThemeDownload}
              disabled={downloadingTheme}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:text-white"
            >
              {downloadingTheme ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lädt...
                </>
              ) : (
                <>
                  <Palette className="h-4 w-4 mr-2" />
                  Blank Theme Download
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
