'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Type,
    Palette,
    Image,
    ChevronDown,
    Paintbrush,
    Save,
    Loader2,
} from 'lucide-react'
import { ImageManager } from '@/components/editor/assets/ImageManager'
import { useEditorStore } from '@/stores/editor-store'
import { updateDesignVariables } from '@/lib/supabase/queries/design-variables'
import { toast } from '@/components/ui/use-toast'

type DesignTab = 'colors' | 'fonts' | 'assets'

interface DesignSettingsDropdownProps {
    siteId: string
}

const POPULAR_FONTS = [
    'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Space Grotesk', 'Sora',
    'Plus Jakarta Sans', 'Outfit', 'Figtree', 'Urbanist', 'Bebas Neue', 'Anton', 'Oswald',
    'Poppins', 'Montserrat', 'Raleway', 'Quicksand', 'Inter', 'DM Sans', 'Nunito Sans',
    'Source Sans 3', 'IBM Plex Sans', 'Open Sans', 'Roboto', 'Lato', 'Manrope', 'Work Sans',
].sort()

export function DesignSettingsDropdown({ siteId }: DesignSettingsDropdownProps) {
    const [activeTab, setActiveTab] = useState<DesignTab>('colors')
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Get design variables from store
    const designVariables = useEditorStore((s) => s.designVariables)

    // Local state for editing
    const [brandColors, setBrandColors] = useState({
        primary: designVariables?.colors?.brand?.primary || '#3b82f6',
        primaryHover: designVariables?.colors?.brand?.primaryHover || '#2563eb',
        secondary: designVariables?.colors?.brand?.secondary || '#64748b',
        accent: designVariables?.colors?.brand?.accent || '#8b5cf6',
    })

    const [neutralColors, setNeutralColors] = useState({
        background: designVariables?.colors?.neutral?.background || '#ffffff',
        foreground: designVariables?.colors?.neutral?.foreground || '#0f172a',
        muted: designVariables?.colors?.neutral?.muted || '#f1f5f9',
        border: designVariables?.colors?.neutral?.border || '#e2e8f0',
    })

    const [fonts, setFonts] = useState({
        heading: designVariables?.typography?.fontHeading || 'Inter',
        body: designVariables?.typography?.fontBody || 'Inter',
    })

    // Sync local state when store changes
    const syncFromStore = useCallback(() => {
        if (designVariables) {
            setBrandColors({
                primary: designVariables.colors?.brand?.primary || '#3b82f6',
                primaryHover: designVariables.colors?.brand?.primaryHover || '#2563eb',
                secondary: designVariables.colors?.brand?.secondary || '#64748b',
                accent: designVariables.colors?.brand?.accent || '#8b5cf6',
            })
            setNeutralColors({
                background: designVariables.colors?.neutral?.background || '#ffffff',
                foreground: designVariables.colors?.neutral?.foreground || '#0f172a',
                muted: designVariables.colors?.neutral?.muted || '#f1f5f9',
                border: designVariables.colors?.neutral?.border || '#e2e8f0',
            })
            setFonts({
                heading: designVariables.typography?.fontHeading || 'Inter',
                body: designVariables.typography?.fontBody || 'Inter',
            })
            setHasChanges(false)
        }
    }, [designVariables])

    // Handle color change
    const handleBrandColorChange = (key: string, value: string) => {
        setBrandColors(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const handleNeutralColorChange = (key: string, value: string) => {
        setNeutralColors(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const handleFontChange = (key: string, value: string) => {
        setFonts(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    // Apply CSS variables to document and iframe
    const applyCssVariables = (colors: typeof brandColors & typeof neutralColors, typography: typeof fonts) => {
        const root = document.documentElement

        // Brand colors
        root.style.setProperty('--color-brand-primary', colors.primary)
        root.style.setProperty('--color-brand-primary-hover', colors.primaryHover)
        root.style.setProperty('--color-brand-secondary', colors.secondary)
        root.style.setProperty('--color-brand-accent', colors.accent)

        // Neutral colors
        root.style.setProperty('--color-neutral-background', colors.background)
        root.style.setProperty('--color-neutral-foreground', colors.foreground)
        root.style.setProperty('--color-neutral-muted', colors.muted)
        root.style.setProperty('--color-neutral-border', colors.border)

        // Fonts
        root.style.setProperty('--font-heading', typography.heading)
        root.style.setProperty('--font-body', typography.body)

        // Also apply to iframe if exists
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        if (iframe?.contentDocument) {
            const iframeRoot = iframe.contentDocument.documentElement
            iframeRoot.style.setProperty('--color-brand-primary', colors.primary)
            iframeRoot.style.setProperty('--color-brand-primary-hover', colors.primaryHover)
            iframeRoot.style.setProperty('--color-brand-secondary', colors.secondary)
            iframeRoot.style.setProperty('--color-brand-accent', colors.accent)
            iframeRoot.style.setProperty('--color-neutral-background', colors.background)
            iframeRoot.style.setProperty('--color-neutral-foreground', colors.foreground)
            iframeRoot.style.setProperty('--color-neutral-muted', colors.muted)
            iframeRoot.style.setProperty('--color-neutral-border', colors.border)
            iframeRoot.style.setProperty('--font-heading', typography.heading)
            iframeRoot.style.setProperty('--font-body', typography.body)
        }
    }

    // Save changes
    const handleSave = async () => {
        setSaving(true)
        try {
            const update = {
                colors: {
                    brand: brandColors,
                    neutral: neutralColors,
                    semantic: designVariables?.colors?.semantic || {
                        success: '#22c55e',
                        warning: '#f59e0b',
                        error: '#ef4444',
                        info: '#3b82f6',
                    },
                },
                typography: {
                    fontHeading: fonts.heading,
                    fontBody: fonts.body,
                    fontMono: designVariables?.typography?.fontMono,
                },
            }

            const saved = await updateDesignVariables(siteId, update)
            useEditorStore.setState({ designVariables: saved })

            // Apply CSS variables immediately
            applyCssVariables(
                { ...brandColors, ...neutralColors },
                fonts
            )

            setHasChanges(false)
            toast.success('Gespeichert', 'Design-Einstellungen wurden aktualisiert.')
        } catch (error) {
            console.error('Failed to save design variables:', error)
            toast.error('Fehler', 'Design-Einstellungen konnten nicht gespeichert werden.')
        } finally {
            setSaving(false)
        }
    }

    const tabs: { id: DesignTab; label: string; icon: React.ReactNode }[] = [
        { id: 'colors', label: 'Farben', icon: <Palette className="h-4 w-4" /> },
        { id: 'fonts', label: 'Schriften', icon: <Type className="h-4 w-4" /> },
        { id: 'assets', label: 'Medien', icon: <Image className="h-4 w-4" /> },
    ]

    return (
        <DropdownMenu open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (isOpen) syncFromStore()
        }}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600 text-xs">
                    <Paintbrush className="h-4 w-4" />
                    Design
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-[420px] p-0"
                sideOffset={8}
            >
                <div className="flex h-[340px]">
                    {/* Vertical Tab Navigation - Left */}
                    <div className="w-[100px] border-r border-zinc-200 bg-zinc-50 p-2 flex flex-col gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors w-full text-left ${activeTab === tab.id
                                        ? 'bg-white text-zinc-900 shadow-sm'
                                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}

                        {/* Save Button */}
                        {hasChanges && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="mt-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                            >
                                {saving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                Speichern
                            </button>
                        )}
                    </div>

                    {/* Content Area - Right */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {activeTab === 'colors' && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-800">Markenfarben</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { key: 'primary', label: 'Primary' },
                                        { key: 'primaryHover', label: 'Hover' },
                                        { key: 'secondary', label: 'Secondary' },
                                        { key: 'accent', label: 'Accent' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="text-center">
                                            <label className="block relative cursor-pointer">
                                                <div
                                                    className="w-full aspect-square rounded-lg hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 border border-zinc-200 transition-all"
                                                    style={{ backgroundColor: brandColors[key as keyof typeof brandColors] }}
                                                />
                                                <input
                                                    type="color"
                                                    value={brandColors[key as keyof typeof brandColors]}
                                                    onChange={(e) => handleBrandColorChange(key, e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </label>
                                            <span className="text-[10px] text-zinc-500 mt-1 block">{label}</span>
                                        </div>
                                    ))}
                                </div>

                                <h3 className="text-sm font-semibold text-zinc-800 pt-2">Neutrale Farben</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { key: 'background', label: 'Background' },
                                        { key: 'foreground', label: 'Text' },
                                        { key: 'muted', label: 'Muted' },
                                        { key: 'border', label: 'Border' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="text-center">
                                            <label className="block relative cursor-pointer">
                                                <div
                                                    className="w-full aspect-square rounded-lg hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 border border-zinc-200 transition-all"
                                                    style={{ backgroundColor: neutralColors[key as keyof typeof neutralColors] }}
                                                />
                                                <input
                                                    type="color"
                                                    value={neutralColors[key as keyof typeof neutralColors]}
                                                    onChange={(e) => handleNeutralColorChange(key, e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </label>
                                            <span className="text-[10px] text-zinc-500 mt-1 block">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'fonts' && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-800">Schriftarten</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1.5 block">Überschriften</label>
                                        <input
                                            type="text"
                                            list="heading-fonts-toolbar"
                                            value={fonts.heading}
                                            onChange={(e) => handleFontChange('heading', e.target.value)}
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            style={{ fontFamily: fonts.heading }}
                                        />
                                        <datalist id="heading-fonts-toolbar">
                                            {POPULAR_FONTS.map(f => <option key={f} value={f} />)}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1.5 block">Fließtext</label>
                                        <input
                                            type="text"
                                            list="body-fonts-toolbar"
                                            value={fonts.body}
                                            onChange={(e) => handleFontChange('body', e.target.value)}
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            style={{ fontFamily: fonts.body }}
                                        />
                                        <datalist id="body-fonts-toolbar">
                                            {POPULAR_FONTS.map(f => <option key={f} value={f} />)}
                                        </datalist>
                                    </div>
                                </div>

                                {/* Font Preview */}
                                <div className="mt-4 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                                    <p className="text-xs text-zinc-400 mb-2">Vorschau</p>
                                    <p
                                        className="text-xl font-semibold text-zinc-800 mb-1"
                                        style={{ fontFamily: fonts.heading }}
                                    >
                                        Überschrift Beispiel
                                    </p>
                                    <p
                                        className="text-sm text-zinc-600"
                                        style={{ fontFamily: fonts.body }}
                                    >
                                        Dies ist ein Beispieltext für die Fließtext-Schriftart.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'assets' && (
                            <div className="h-full">
                                <ImageManager siteId={siteId} mode="manage" />
                            </div>
                        )}
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
