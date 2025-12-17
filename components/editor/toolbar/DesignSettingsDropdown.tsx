'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { ImageManager } from '@/components/editor/assets/ImageManager'

type DesignTab = 'colors' | 'fonts' | 'assets'

interface DesignSettingsDropdownProps {
    siteId: string
}

export function DesignSettingsDropdown({ siteId }: DesignSettingsDropdownProps) {
    const [activeTab, setActiveTab] = useState<DesignTab>('colors')
    const [open, setOpen] = useState(false)

    const tabs: { id: DesignTab; label: string; icon: React.ReactNode }[] = [
        { id: 'colors', label: 'Farben', icon: <Palette className="h-4 w-4" /> },
        { id: 'fonts', label: 'Schriften', icon: <Type className="h-4 w-4" /> },
        { id: 'assets', label: 'Medien', icon: <Image className="h-4 w-4" /> },
    ]

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600 text-xs">
                    <Paintbrush className="h-4 w-4" />
                    Design
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-[400px] p-0"
                sideOffset={8}
            >
                <div className="flex h-[300px]">
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
                    </div>

                    {/* Content Area - Right */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {activeTab === 'colors' && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-800">Farben</h3>
                                <p className="text-xs text-zinc-500">
                                    Site-Farbpalette verwalten
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {/* Color swatches - placeholder for now */}
                                    <div className="w-full aspect-square rounded-lg bg-blue-500 cursor-pointer hover:ring-2 hover:ring-blue-300" title="Primary" />
                                    <div className="w-full aspect-square rounded-lg bg-purple-500 cursor-pointer hover:ring-2 hover:ring-purple-300" title="Secondary" />
                                    <div className="w-full aspect-square rounded-lg bg-emerald-500 cursor-pointer hover:ring-2 hover:ring-emerald-300" title="Accent" />
                                    <div className="w-full aspect-square rounded-lg bg-zinc-800 cursor-pointer hover:ring-2 hover:ring-zinc-400" title="Foreground" />
                                    <div className="w-full aspect-square rounded-lg bg-zinc-100 border border-zinc-200 cursor-pointer hover:ring-2 hover:ring-zinc-300" title="Background" />
                                    <div className="w-full aspect-square rounded-lg bg-zinc-200 cursor-pointer hover:ring-2 hover:ring-zinc-300" title="Muted" />
                                    <div className="w-full aspect-square rounded-lg bg-zinc-300 cursor-pointer hover:ring-2 hover:ring-zinc-400" title="Border" />
                                    <div className="w-full aspect-square rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 cursor-pointer hover:border-zinc-400">+</div>
                                </div>
                                <p className="text-xs text-zinc-400 mt-2">
                                    Klicke auf eine Farbe um sie zu bearbeiten
                                </p>
                            </div>
                        )}

                        {activeTab === 'fonts' && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-800">Schriften</h3>
                                <p className="text-xs text-zinc-500">
                                    Typografie-Einstellungen
                                </p>
                                <div className="space-y-3">
                                    <div className="p-3 bg-zinc-50 rounded-lg">
                                        <div className="text-xs text-zinc-500 mb-1">Überschriften</div>
                                        <div className="text-lg font-semibold">Inter</div>
                                    </div>
                                    <div className="p-3 bg-zinc-50 rounded-lg">
                                        <div className="text-xs text-zinc-500 mb-1">Fließtext</div>
                                        <div className="text-base">Inter</div>
                                    </div>
                                    <div className="p-3 bg-zinc-50 rounded-lg">
                                        <div className="text-xs text-zinc-500 mb-1">Code</div>
                                        <div className="text-sm font-mono">JetBrains Mono</div>
                                    </div>
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
