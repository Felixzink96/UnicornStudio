import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, ThinkingLevel } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })

// ============================================================================
// TYPES
// ============================================================================

export type DesignArchetype = 'architect' | 'innovator' | 'brutalist' | 'organic'

// All available design styles
export type DesignStyle =
  | 'brutalist' | 'organic' | 'craftsman' | 'minimal' | 'luxe' | 'bold'
  | 'warm' | 'clinical' | 'dynamic' | 'editorial' | 'playful' | 'vintage'
  | 'corporate' | 'neubrutalist' | 'glassmorphic' | 'dark-elegance' | 'bento'
  | 'kinetic' | 'swiss' | 'japandi' | 'retro-futurism' | 'memphis'
  | 'noise-grain' | 'asymmetric' | 'gradient-dream' | 'monoline' | 'split'

export interface SetupSuggestion {
  siteName: string
  siteType: string

  // Design Styles (can be multiple for mixed styles)
  designStyles: DesignStyle[]

  // Base archetype for settings defaults
  archetype: DesignArchetype

  pages: {
    name: string
    slug: string
    selected: boolean
    isLegalPage: boolean
    inHeader: boolean
    inFooter: boolean
  }[]

  colors: {
    primary: string
    primaryHover: string
    secondary: string
    accent: string
    background: string
    foreground: string
    muted: string
    border: string
  }

  fonts: {
    heading: string
    body: string
    mono?: string
  }

  // NEW: Border Radius based on archetype
  radii: {
    style: 'sharp' | 'soft' | 'rounded' | 'pill'
    default: string
    lg: string
    xl: string
    button: string
    card: string
    input: string
  }

  // NEW: Motion/Animation preferences
  motion: {
    style: 'elegant' | 'snappy' | 'bold' | 'playful'
    duration: {
      fast: string
      normal: string
      slow: string
    }
    easing: string
    hoverScale: number
    revealDistance: string
  }

  // NEW: Layout preferences
  layout: {
    style: 'symmetric' | 'asymmetric' | 'editorial' | 'organic'
    maxWidth: string
    sectionSpacing: string
    useOverlaps: boolean
    heroStyle: 'centered' | 'split' | 'fullwidth' | 'editorial'
  }

  gradient?: {
    enabled: boolean
    from: string
    to: string
    via?: string
    direction: 'to-r' | 'to-br' | 'to-b' | 'to-bl' | 'to-l' | 'to-tl' | 'to-t' | 'to-tr'
  }

  customColors?: Record<string, string>

  headerSettings: {
    style: 'simple' | 'centered' | 'split'
    sticky: boolean
    showCta: boolean
    ctaText?: string
    ctaPage?: string
  }

  // NEW: Visual effects
  effects: {
    useNoise: boolean
    useBlur: boolean
    useGradientBlobs: boolean
    useScanLines: boolean
    borderStyle: 'none' | 'subtle' | 'prominent' | 'thick'
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `Du bist ein ELITE Website-Design-Architekt von einer Top-Agentur.
Du erschaffst Designs die bei Awwwards, FWA und CSSDA gewinnen könnten.

WICHTIG: Antworte NUR mit einem validen JSON-Objekt, keine Erklärungen oder Markdown.

═══════════════════════════════════════════════════════════════════════════
SCHRITT 1: WÄHLE DEN DESIGN-ARCHETYP
═══════════════════════════════════════════════════════════════════════════

Analysiere Branche und Stil. Wähle EINEN Archetyp und bleibe 100% konsistent:

┌─────────────────────────────────────────────────────────────────────────────┐
│ ARCHITECT (Seriös: Recht, Finanzen, Immobilien, B2B Enterprise, Beratung)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Formen: Eckig (rounded-none, rounded-sm). Harte Kanten, clean lines     │
│ • Layout: Asymmetrische Grids, feine Linien (border-[0.5px]), viel Weiß   │
│ • Motion: Langsam (700-1000ms), elegant, keine Bounces                     │
│ • Fonts: Serif Headlines + Sans Body (z.B. Cormorant + Inter)             │
│ • Farben: Gedämpft, Kontraste durch Typo statt Farbe                      │
│ • Effekte: Subtile Borders, minimales Noise, keine Glows                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ INNOVATOR (Modern: SaaS, Tech, Startup, AI, Software, Digital Products)    │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Formen: Freundlich rund (rounded-2xl, rounded-3xl)                       │
│ • Layout: Glassmorphism, weiche Schatten, schwebende Cards                 │
│ • Motion: Smooth schnell (200-400ms), micro-interactions                   │
│ • Fonts: Geometric Sans (Inter, Plus Jakarta Sans, Space Grotesk)          │
│ • Farben: Primärfarbe + viel Weiß/Grau + Akzent-Pops, Gradients OK        │
│ • Effekte: Blur, Gradient Blobs, subtiles Noise, Glow auf CTAs            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ BRUTALIST (Bold: Kunst, Mode, Krypto, Events, Agenturen, Kreative)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Formen: Extrem (rounded-none ODER rounded-full Pills, kein Mittelweg)   │
│ • Layout: Gigantische Typo (text-8xl+), dicke Borders, Marquee-Text        │
│ • Motion: Hart und schnell (100-200ms), "in your face", Glitch möglich     │
│ • Fonts: Monospace, Display Fonts (Bebas Neue, Anton, Space Mono)          │
│ • Farben: High Contrast, Neon möglich, oft Schwarz-Weiß-Basis              │
│ • Effekte: Scan-Lines, Glitch, starke Borders, kein Blur                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ORGANIC (Soft: Food, Wellness, Kinder, Bio, Lifestyle, Gesundheit)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Formen: Sehr weich (rounded-[40px], rounded-full), Blobs, Waves          │
│ • Layout: Überlappende Bilder, natürliche Anordnung, asymmetrisch-soft     │
│ • Motion: Bouncy (ease-out), elastisch, verspielt (400-600ms)              │
│ • Fonts: Rounded Sans (Nunito, Quicksand), Handschrift-Akzente möglich     │
│ • Farben: Warm, erdig, Pastelltöne, natürliche Palette                     │
│ • Effekte: Soft Shadows, Gradient Blobs, KEIN hartes Noise                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
DESIGN-STILE (wähle 1-3 passende Stile für designStyles Array)
═══════════════════════════════════════════════════════════════════════════

Verfügbare Stile:
• brutalist, organic, craftsman, minimal, luxe, bold, warm, clinical
• dynamic, editorial, playful, vintage, corporate, neubrutalist
• glassmorphic, dark-elegance, bento, kinetic, swiss, japandi
• retro-futurism, memphis, noise-grain, asymmetric, gradient-dream
• monoline, split

Beispiele:
- Architekturbüro: ["minimal", "swiss", "asymmetric"]
- SaaS Startup: ["glassmorphic", "bento", "gradient-dream"]
- Handwerker: ["craftsman", "warm"]
- Kreativagentur: ["neubrutalist", "kinetic", "bold"]
- Wellness Studio: ["japandi", "organic", "minimal"]

Du KANNST Stile mischen die zusammenpassen!

═══════════════════════════════════════════════════════════════════════════
SCHRITT 2: GENERIERE ALLE DESIGN-VARIABLEN
═══════════════════════════════════════════════════════════════════════════

Das JSON muss folgende Struktur haben:

{
  "siteName": "Website Name",
  "siteType": "restaurant|portfolio|agency|shop|blog|business|landing|saas|event|medical|education|nonprofit|law|finance|creative|wellness",

  "designStyles": ["stil1", "stil2"],

  "archetype": "architect|innovator|brutalist|organic",

  "pages": [
    {
      "name": "Seitenname",
      "slug": "slug",
      "selected": true,
      "isLegalPage": false,
      "inHeader": true,
      "inFooter": true
    }
  ],

  "colors": {
    "primary": "#hex - Hauptfarbe passend zum Archetyp",
    "primaryHover": "#hex - 10-15% dunkler",
    "secondary": "#hex - ANDERE Farbe als primary",
    "accent": "#hex - ANDERE Farbe als primary UND secondary",
    "background": "#hex - Hintergrund (dunkel für Brutalist/Tech, hell für Organic)",
    "foreground": "#hex - Textfarbe",
    "muted": "#hex - Subtiler Hintergrund",
    "border": "#hex - Linienfarbe"
  },

  "fonts": {
    "heading": "Google Font - passend zum Archetyp",
    "body": "Google Font - gut lesbar",
    "mono": "Optional - nur wenn Code relevant"
  },

  "radii": {
    "style": "sharp|soft|rounded|pill",
    "default": "0|0.375rem|0.75rem|1rem",
    "lg": "0|0.5rem|1rem|1.5rem",
    "xl": "0|0.75rem|1.5rem|2rem",
    "button": "0|0.5rem|1rem|9999px",
    "card": "0|0.75rem|1.5rem|2rem",
    "input": "0|0.375rem|0.75rem|1rem"
  },

  "motion": {
    "style": "elegant|snappy|bold|playful",
    "duration": {
      "fast": "150ms|200ms|100ms|200ms",
      "normal": "300ms|300ms|150ms|400ms",
      "slow": "700ms|500ms|200ms|600ms"
    },
    "easing": "cubic-bezier(...) passend zum Stil",
    "hoverScale": 1.02|1.05|1.1|1.08,
    "revealDistance": "60px|40px|80px|50px"
  },

  "layout": {
    "style": "symmetric|asymmetric|editorial|organic",
    "maxWidth": "1280px|1440px|1600px|1200px",
    "sectionSpacing": "4rem|5rem|6rem|4rem",
    "useOverlaps": false|true|true|true,
    "heroStyle": "centered|split|fullwidth|editorial"
  },

  "gradient": {
    "enabled": true/false,
    "from": "#hex",
    "to": "#hex",
    "via": "#hex optional",
    "direction": "to-br"
  },

  "customColors": {
    "optionalExtraColor": "#hex"
  },

  "headerSettings": {
    "style": "simple|centered|split",
    "sticky": true/false,
    "showCta": true/false,
    "ctaText": "Button Text",
    "ctaPage": "kontakt"
  },

  "effects": {
    "useNoise": false|true|false|false,
    "useBlur": false|true|false|true,
    "useGradientBlobs": false|true|false|true,
    "useScanLines": false|false|true|false,
    "borderStyle": "subtle|none|thick|none"
  }
}

═══════════════════════════════════════════════════════════════════════════
ARCHETYP-SPEZIFISCHE DEFAULTS
═══════════════════════════════════════════════════════════════════════════

ARCHITECT:
- radii.style: "sharp"
- radii.default: "0" oder "0.125rem"
- motion.style: "elegant"
- motion.easing: "cubic-bezier(0.4, 0, 0.2, 1)"
- layout.style: "asymmetric" oder "editorial"
- effects.borderStyle: "subtle" (feine Linien)
- Fonts: Serif + Sans Kombination
- Colors: Gedämpft, wenig Sättigung

INNOVATOR:
- radii.style: "rounded"
- radii.default: "0.75rem"
- motion.style: "snappy"
- motion.easing: "cubic-bezier(0.16, 1, 0.3, 1)"
- layout.style: "symmetric"
- effects.useBlur: true
- effects.useGradientBlobs: true
- Fonts: Modern Geometric Sans
- Colors: Lebendig aber professionell, Gradients erlaubt

BRUTALIST:
- radii.style: "sharp" oder "pill" (keine Mischung!)
- radii.default: "0" oder "9999px"
- motion.style: "bold"
- motion.easing: "cubic-bezier(0.85, 0, 0.15, 1)"
- layout.style: "editorial"
- effects.useScanLines: true
- effects.borderStyle: "thick" (3-4px Borders)
- Fonts: Monospace oder Bold Display
- Colors: High Contrast, oft dark mode

ORGANIC:
- radii.style: "soft"
- radii.default: "1rem" bis "2rem"
- motion.style: "playful"
- motion.easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" (bouncy)
- layout.style: "organic"
- layout.useOverlaps: true
- effects.useGradientBlobs: true (soft)
- Fonts: Rounded, friendly
- Colors: Warm, natural, pastel-ish

═══════════════════════════════════════════════════════════════════════════
WICHTIGE REGELN
═══════════════════════════════════════════════════════════════════════════

1. ARCHETYP FIRST: Entscheide zuerst den Archetyp, dann leite ALLES davon ab
2. KONSISTENZ: Alle Werte müssen zum gewählten Archetyp passen
3. KEINE MISCHUNG: Ein Architekt-Design hat KEINE runden Buttons
4. FARBEN EINZIGARTIG: primary ≠ secondary ≠ accent
5. FONTS HARMONISCH: Heading + Body müssen zusammen funktionieren
6. isLegalPage: NUR true für "impressum" und "datenschutz"!
`

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, images } = body as {
      prompt: string
      images?: Array<{ base64: string; mimeType: string }>
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Build content parts
    const contentParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

    // Add images if present
    if (images && images.length > 0) {
      for (const img of images) {
        contentParts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType,
          }
        })
      }
      console.log(`[Setup] Analyzing ${images.length} file(s) for setup suggestions`)
    }

    // Add prompt
    contentParts.push({
      text: `${SYSTEM_PROMPT}\n\n═══════════════════════════════════════════════════════════════════════════\nANFRAGE\n═══════════════════════════════════════════════════════════════════════════\n\n${prompt}${images?.length ? '\n\nAnalysiere auch die hochgeladenen Bilder/PDFs und extrahiere Farben, Stil und Markenidentität!' : ''}`
    })

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contentParts,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    })

    const responseText = response.text || ''

    // Parse JSON
    let suggestions: SetupSuggestion
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      suggestions = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate archetype
    if (!suggestions.archetype || !['architect', 'innovator', 'brutalist', 'organic'].includes(suggestions.archetype)) {
      suggestions.archetype = 'innovator' // Default fallback
    }

    // Ensure radii exists with defaults based on archetype
    if (!suggestions.radii) {
      const radiiDefaults: Record<DesignArchetype, SetupSuggestion['radii']> = {
        architect: {
          style: 'sharp',
          default: '0',
          lg: '0',
          xl: '0.125rem',
          button: '0',
          card: '0',
          input: '0',
        },
        innovator: {
          style: 'rounded',
          default: '0.75rem',
          lg: '1rem',
          xl: '1.5rem',
          button: '0.75rem',
          card: '1rem',
          input: '0.5rem',
        },
        brutalist: {
          style: 'sharp',
          default: '0',
          lg: '0',
          xl: '0',
          button: '0',
          card: '0',
          input: '0',
        },
        organic: {
          style: 'soft',
          default: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          button: '9999px',
          card: '1.5rem',
          input: '1rem',
        },
      }
      suggestions.radii = radiiDefaults[suggestions.archetype]
    }

    // Ensure motion exists with defaults
    if (!suggestions.motion) {
      const motionDefaults: Record<DesignArchetype, SetupSuggestion['motion']> = {
        architect: {
          style: 'elegant',
          duration: { fast: '150ms', normal: '250ms', slow: '400ms' },
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          hoverScale: 1.02,
          revealDistance: '40px',
        },
        innovator: {
          style: 'snappy',
          duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          hoverScale: 1.05,
          revealDistance: '40px',
        },
        brutalist: {
          style: 'bold',
          duration: { fast: '100ms', normal: '150ms', slow: '250ms' },
          easing: 'cubic-bezier(0.85, 0, 0.15, 1)',
          hoverScale: 1.1,
          revealDistance: '80px',
        },
        organic: {
          style: 'playful',
          duration: { fast: '200ms', normal: '400ms', slow: '600ms' },
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          hoverScale: 1.08,
          revealDistance: '50px',
        },
      }
      suggestions.motion = motionDefaults[suggestions.archetype]
    }

    // Ensure layout exists with defaults
    if (!suggestions.layout) {
      const layoutDefaults: Record<DesignArchetype, SetupSuggestion['layout']> = {
        architect: {
          style: 'asymmetric',
          maxWidth: '1280px',
          sectionSpacing: '5rem',
          useOverlaps: false,
          heroStyle: 'split',
        },
        innovator: {
          style: 'symmetric',
          maxWidth: '1440px',
          sectionSpacing: '5rem',
          useOverlaps: true,
          heroStyle: 'centered',
        },
        brutalist: {
          style: 'editorial',
          maxWidth: '1600px',
          sectionSpacing: '6rem',
          useOverlaps: true,
          heroStyle: 'fullwidth',
        },
        organic: {
          style: 'organic',
          maxWidth: '1200px',
          sectionSpacing: '4rem',
          useOverlaps: true,
          heroStyle: 'editorial',
        },
      }
      suggestions.layout = layoutDefaults[suggestions.archetype]
    }

    // Ensure effects exists with defaults
    if (!suggestions.effects) {
      const effectsDefaults: Record<DesignArchetype, SetupSuggestion['effects']> = {
        architect: {
          useNoise: false,
          useBlur: false,
          useGradientBlobs: false,
          useScanLines: false,
          borderStyle: 'subtle',
        },
        innovator: {
          useNoise: true,
          useBlur: true,
          useGradientBlobs: true,
          useScanLines: false,
          borderStyle: 'none',
        },
        brutalist: {
          useNoise: true,
          useBlur: false,
          useGradientBlobs: false,
          useScanLines: true,
          borderStyle: 'thick',
        },
        organic: {
          useNoise: false,
          useBlur: true,
          useGradientBlobs: true,
          useScanLines: false,
          borderStyle: 'none',
        },
      }
      suggestions.effects = effectsDefaults[suggestions.archetype]
    }

    // Validate pages
    if (!suggestions.pages || !Array.isArray(suggestions.pages)) {
      suggestions.pages = []
    }

    // Fix isLegalPage AND ensure all pages are selected by default
    suggestions.pages = suggestions.pages.map(page => ({
      ...page,
      selected: true, // IMMER true - User kann manuell deselektieren
      isLegalPage: page.slug === 'impressum' || page.slug === 'datenschutz',
    }))

    // Ensure Home page
    if (!suggestions.pages.some(p => p.slug === '')) {
      suggestions.pages.unshift({
        name: 'Home',
        slug: '',
        selected: true,
        isLegalPage: false,
        inHeader: true,
        inFooter: true,
      })
    }

    // Ensure legal pages
    if (!suggestions.pages.some(p => p.slug === 'impressum')) {
      suggestions.pages.push({
        name: 'Impressum',
        slug: 'impressum',
        selected: true,
        isLegalPage: true,
        inHeader: false,
        inFooter: true,
      })
    }

    if (!suggestions.pages.some(p => p.slug === 'datenschutz')) {
      suggestions.pages.push({
        name: 'Datenschutz',
        slug: 'datenschutz',
        selected: true,
        isLegalPage: true,
        inHeader: false,
        inFooter: true,
      })
    }

    console.log(`[Setup] Generated suggestions with archetype: ${suggestions.archetype}`)

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Setup suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
