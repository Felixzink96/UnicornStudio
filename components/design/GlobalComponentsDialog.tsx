'use client'

import * as React from 'react'
import { Loader2, Layers, Eye, Check, X, Sparkles, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DetectedComponent } from '@/types/global-components'
import { useEditorStore } from '@/stores/editor-store'
import { generateDesignTokensCSS, generateGoogleFontsLink } from '@/lib/css/design-tokens'

export interface GlobalComponentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detectedHeader: DetectedComponent | null
  detectedFooter: DetectedComponent | null
  onSave: (
    headerName: string | null,
    footerName: string | null,
    headerHtml: string | null,
    footerHtml: string | null
  ) => Promise<void>
  onSkip: () => void
}

type StepType = 'header' | 'footer' | 'confirm'

export function GlobalComponentsDialog({
  open,
  onOpenChange,
  detectedHeader,
  detectedFooter,
  onSave,
  onSkip,
}: GlobalComponentsDialogProps) {
  const [headerName, setHeaderName] = React.useState('Main Header')
  const [footerName, setFooterName] = React.useState('Main Footer')
  const [saveHeader, setSaveHeader] = React.useState(true)
  const [saveFooter, setSaveFooter] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [step, setStep] = React.useState<StepType>('header')

  // Get design variables for preview styling
  const designVariables = useEditorStore((s) => s.designVariables)

  // Generate CSS for preview
  const previewCSS = React.useMemo(() => {
    return generateDesignTokensCSS(designVariables)
  }, [designVariables])

  const fontsLink = React.useMemo(() => {
    return generateGoogleFontsLink(designVariables)
  }, [designVariables])

  // Update default names based on detected components
  React.useEffect(() => {
    if (detectedHeader?.suggestedName) {
      setHeaderName(detectedHeader.suggestedName)
    }
    if (detectedFooter?.suggestedName) {
      setFooterName(detectedFooter.suggestedName)
    }
    // Set initial step
    if (detectedHeader) {
      setStep('header')
    } else if (detectedFooter) {
      setStep('footer')
    }
  }, [detectedHeader, detectedFooter, open])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Pass HTML directly to avoid stale closure issues
      await onSave(
        saveHeader && detectedHeader ? headerName : null,
        saveFooter && detectedFooter ? footerName : null,
        saveHeader && detectedHeader ? detectedHeader.html : null,
        saveFooter && detectedFooter ? detectedFooter.html : null
      )
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving global components:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasComponents = detectedHeader || detectedFooter
  if (!hasComponents) return null

  const STEPS = [
    { id: 'header' as StepType, label: 'Header', available: !!detectedHeader },
    { id: 'footer' as StepType, label: 'Footer', available: !!detectedFooter },
    { id: 'confirm' as StepType, label: 'Bestätigen', available: true },
  ].filter(s => s.available)

  const currentStepIndex = STEPS.findIndex(s => s.id === step)

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].id)
    }
  }

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].id)
    }
  }

  // Render preview with styles
  const renderPreview = (html: string) => {
    return (
      <div className="relative w-full h-[280px] rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white">
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              ${fontsLink ? `<link href="${fontsLink}" rel="stylesheet">` : ''}
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                ${previewCSS}
                body {
                  margin: 0;
                  padding: 0;
                  background: var(--color-neutral-background, #fff);
                }
                /* Scale down for preview */
                html {
                  transform: scale(0.6);
                  transform-origin: top left;
                  width: 166.67%;
                  height: 166.67%;
                }
              </style>
            </head>
            <body>
              ${html}
            </body>
            </html>
          `}
          className="w-full h-full border-0"
          title="Component Preview"
          sandbox="allow-scripts"
        />
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white">
          60% Vorschau
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] p-0 gap-0 overflow-hidden border-zinc-200 dark:border-zinc-700">
        <VisuallyHidden>
          <DialogTitle>Globale Komponenten</DialogTitle>
        </VisuallyHidden>

        {/* Header - Premium Style */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" className="dark:stroke-zinc-900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Globale Komponenten</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Header & Footer für alle Seiten</p>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    step === s.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3" stroke="#71717a" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Saving Overlay */}
        {isSaving && (
          <div className="absolute inset-0 bg-zinc-900/90 z-50 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8" stroke="#ffffff" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Speichere Komponenten...</p>
              <p className="text-zinc-400 text-sm mt-1">Header & Footer werden global verfügbar</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="h-[420px] overflow-y-auto p-6">
          {/* STEP: Header */}
          {step === 'header' && detectedHeader && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Header erkannt</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Konfidenz: <span className="text-green-600 font-medium">{detectedHeader.confidence}%</span>
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveHeader}
                    onChange={(e) => setSaveHeader(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Speichern</span>
                </label>
              </div>

              {saveHeader && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">
                    Komponenten-Name
                  </label>
                  <Input
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="z.B. Main Navigation"
                    className="bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Vorschau
                </label>
                {renderPreview(detectedHeader.html)}
              </div>
            </div>
          )}

          {/* STEP: Footer */}
          {step === 'footer' && detectedFooter && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Footer erkannt</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Konfidenz: <span className="text-green-600 font-medium">{detectedFooter.confidence}%</span>
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveFooter}
                    onChange={(e) => setSaveFooter(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Speichern</span>
                </label>
              </div>

              {saveFooter && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">
                    Komponenten-Name
                  </label>
                  <Input
                    value={footerName}
                    onChange={(e) => setFooterName(e.target.value)}
                    placeholder="z.B. Site Footer"
                    className="bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Vorschau
                </label>
                {renderPreview(detectedFooter.html)}
              </div>
            </div>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" className="dark:stroke-zinc-900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Zusammenfassung</h3>
                <p className="text-sm text-zinc-500 mt-1">Diese Komponenten werden global gespeichert</p>
              </div>

              <div className="space-y-3">
                {detectedHeader && (
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    saveHeader
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 opacity-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {saveHeader ? (
                          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                            <Check className="h-4 w-4" stroke="#ffffff" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-300 flex items-center justify-center">
                            <X className="h-4 w-4" stroke="#71717a" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{headerName}</p>
                          <p className="text-xs text-zinc-500">Header • {detectedHeader.confidence}% Konfidenz</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSaveHeader(!saveHeader)}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        {saveHeader ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                    </div>
                  </div>
                )}

                {detectedFooter && (
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    saveFooter
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 opacity-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {saveFooter ? (
                          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                            <Check className="h-4 w-4" stroke="#ffffff" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-300 flex items-center justify-center">
                            <X className="h-4 w-4" stroke="#71717a" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{footerName}</p>
                          <p className="text-xs text-zinc-500">Footer • {detectedFooter.confidence}% Konfidenz</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSaveFooter(!saveFooter)}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        {saveFooter ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                  Was passiert beim Speichern?
                </p>
                <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Header/Footer werden als globale Komponenten gespeichert
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Sie erscheinen automatisch auf allen Seiten
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Änderungen wirken sich global aus
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onSkip}
            disabled={isSaving}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Überspringen
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={prevStep} disabled={isSaving}>
                Zurück
              </Button>
            )}

            {step === 'confirm' ? (
              <Button
                onClick={handleSave}
                disabled={isSaving || (!saveHeader && !saveFooter)}
                className="bg-zinc-900 dark:bg-zinc-100 border-0"
                style={{ color: '#ffffff' }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" stroke="#ffffff" />
                    <span style={{ color: '#ffffff' }}>Speichern...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 dark:stroke-zinc-900"><path d="M20 6 9 17l-5-5"/></svg>
                    <span className="dark:text-zinc-900" style={{ color: '#ffffff' }}>Global speichern</span>
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={nextStep} className="bg-zinc-900 dark:bg-zinc-100" style={{ color: '#ffffff' }}>
                <span className="dark:text-zinc-900" style={{ color: '#ffffff' }}>Weiter</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" className="ml-1 dark:stroke-zinc-900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GlobalComponentsDialog
