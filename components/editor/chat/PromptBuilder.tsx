'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sparkles,
  Layout,
  ShoppingCart,
  FileText,
  Image,
  Users,
  Briefcase,
  Palette,
  Zap,
  ArrowRight,
  Check,
} from 'lucide-react'

interface PromptBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (prompt: string) => void
}

const PAGE_TYPES = [
  { id: 'landing', label: 'Landing Page', icon: Layout, description: 'Hero, Features, CTA' },
  { id: 'ecommerce', label: 'E-Commerce', icon: ShoppingCart, description: 'Products, Cart, Checkout' },
  { id: 'blog', label: 'Blog', icon: FileText, description: 'Articles, Categories' },
  { id: 'portfolio', label: 'Portfolio', icon: Image, description: 'Projects, Gallery' },
  { id: 'saas', label: 'SaaS', icon: Zap, description: 'Pricing, Features, Dashboard' },
  { id: 'agency', label: 'Agency', icon: Briefcase, description: 'Services, Team, Contact' },
]

const STYLES = [
  { id: 'modern', label: 'Modern', color: 'bg-blue-500' },
  { id: 'minimal', label: 'Minimal', color: 'bg-zinc-500' },
  { id: 'bold', label: 'Bold', color: 'bg-orange-500' },
  { id: 'elegant', label: 'Elegant', color: 'bg-purple-500' },
  { id: 'playful', label: 'Playful', color: 'bg-pink-500' },
  { id: 'corporate', label: 'Corporate', color: 'bg-slate-500' },
]

const COLOR_SCHEMES = [
  { id: 'blue', label: 'Blue', colors: ['#3B82F6', '#1E40AF', '#DBEAFE'] },
  { id: 'green', label: 'Green', colors: ['#22C55E', '#15803D', '#DCFCE7'] },
  { id: 'purple', label: 'Purple', colors: ['#A855F7', '#7E22CE', '#F3E8FF'] },
  { id: 'orange', label: 'Orange', colors: ['#F97316', '#C2410C', '#FFEDD5'] },
  { id: 'mono', label: 'Monochrome', colors: ['#18181B', '#71717A', '#F4F4F5'] },
  { id: 'custom', label: 'Custom', colors: ['#000', '#666', '#FFF'] },
]

const FEATURES = [
  { id: 'hero', label: 'Hero Section' },
  { id: 'navbar', label: 'Navigation Bar' },
  { id: 'features', label: 'Features Grid' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'pricing', label: 'Pricing Table' },
  { id: 'faq', label: 'FAQ Section' },
  { id: 'contact', label: 'Contact Form' },
  { id: 'footer', label: 'Footer' },
  { id: 'cta', label: 'Call to Action' },
  { id: 'stats', label: 'Statistics' },
  { id: 'team', label: 'Team Section' },
  { id: 'gallery', label: 'Image Gallery' },
]

export function PromptBuilder({ open, onOpenChange, onSubmit }: PromptBuilderProps) {
  const [step, setStep] = useState(1)
  const [pageType, setPageType] = useState<string | null>(null)
  const [style, setStyle] = useState<string | null>(null)
  const [colorScheme, setColorScheme] = useState<string | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['hero', 'navbar', 'footer'])
  const [customDescription, setCustomDescription] = useState('')

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    )
  }

  const generatePrompt = () => {
    const type = PAGE_TYPES.find(p => p.id === pageType)
    const styleObj = STYLES.find(s => s.id === style)
    const colors = COLOR_SCHEMES.find(c => c.id === colorScheme)
    const features = selectedFeatures.map(f => FEATURES.find(feat => feat.id === f)?.label).filter(Boolean)

    let prompt = `Create a ${styleObj?.label.toLowerCase() || 'modern'} ${type?.label || 'landing page'}`

    if (colors && colors.id !== 'custom') {
      prompt += ` with a ${colors.label.toLowerCase()} color scheme`
    }

    prompt += '.'

    if (features.length > 0) {
      prompt += ` Include: ${features.join(', ')}.`
    }

    if (customDescription.trim()) {
      prompt += ` ${customDescription.trim()}`
    }

    return prompt
  }

  const handleSubmit = () => {
    const prompt = generatePrompt()
    onSubmit(prompt)
    onOpenChange(false)
    // Reset state
    setStep(1)
    setPageType(null)
    setStyle(null)
    setColorScheme(null)
    setSelectedFeatures(['hero', 'navbar', 'footer'])
    setCustomDescription('')
  }

  const canProceed = () => {
    if (step === 1) return pageType !== null
    if (step === 2) return style !== null
    if (step === 3) return colorScheme !== null
    return true
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Prompt Builder
            </DialogTitle>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    s <= step ? 'bg-blue-500' : 'bg-zinc-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {/* Step 1: Page Type */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">What type of page?</h3>
                <p className="text-xs text-zinc-500">Select the type of page you want to create</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PAGE_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      onClick={() => setPageType(type.id)}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        pageType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${pageType === type.id ? 'bg-blue-500 text-white' : 'bg-zinc-100'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-zinc-500">{type.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Style */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Choose a style</h3>
                <p className="text-xs text-zinc-500">This will define the overall look and feel</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      style === s.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className={`h-12 rounded-md mb-3 ${s.color}`} />
                    <p className="font-medium text-sm">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Colors */}
          {step === 3 && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Pick a color scheme</h3>
                <p className="text-xs text-zinc-500">Define the primary colors for your design</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {COLOR_SCHEMES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColorScheme(c.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      colorScheme === c.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex gap-1 mb-3">
                      {c.colors.map((color, i) => (
                        <div
                          key={i}
                          className="h-8 flex-1 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="font-medium text-sm">{c.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Features & Final */}
          {step === 4 && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-1">Select features</h3>
                <p className="text-xs text-zinc-500">Choose which sections to include</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {FEATURES.map((feature) => (
                  <label
                    key={feature.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      selectedFeatures.includes(feature.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedFeatures.includes(feature.id)}
                      onCheckedChange={() => toggleFeature(feature.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-medium">{feature.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Additional details (optional)</h3>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Add any specific requirements, branding details, or content..."
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Preview */}
              <div className="bg-zinc-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-zinc-600">Generated Prompt</span>
                </div>
                <p className="text-sm text-zinc-800">{generatePrompt()}</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Selection badges */}
            <div className="flex items-center gap-1.5">
              {pageType && (
                <Badge variant="secondary" className="text-[10px]">
                  {PAGE_TYPES.find(p => p.id === pageType)?.label}
                </Badge>
              )}
              {style && (
                <Badge variant="secondary" className="text-[10px]">
                  {STYLES.find(s => s.id === style)?.label}
                </Badge>
              )}
              {colorScheme && (
                <Badge variant="secondary" className="text-[10px]">
                  {COLOR_SCHEMES.find(c => c.id === colorScheme)?.label}
                </Badge>
              )}
            </div>

            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-1.5"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                className="gap-1.5 bg-blue-500 hover:bg-blue-600"
              >
                <Check className="h-3.5 w-3.5" />
                Generate
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
