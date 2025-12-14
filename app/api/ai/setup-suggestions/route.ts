import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })

export interface SetupSuggestion {
  siteName: string
  siteType: string
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
    mono?: string // Optional: nur wenn Code-Elemente relevant sind
  }
  gradient?: {
    enabled: boolean
    from: string
    to: string
    via?: string
    direction: 'to-r' | 'to-br' | 'to-b' | 'to-bl' | 'to-l' | 'to-tl' | 'to-t' | 'to-tr'
  }
  customColors?: Record<string, string> // Zusätzliche Markenfarben wenn nötig
  headerSettings: {
    style: 'simple' | 'centered' | 'split'
    sticky: boolean
    showCta: boolean
    ctaText?: string
    ctaPage?: string // slug der Zielseite
  }
}

const SYSTEM_PROMPT = `Du bist ein Premium Website-Design-Experte mit hohem Anspruch an Ästhetik und UX.
Basierend auf dem User-Prompt generierst du perfekt abgestimmte Setup-Vorschläge für eine neue Website.

WICHTIG: Antworte NUR mit einem validen JSON-Objekt, keine Erklärungen oder Markdown.

Das JSON muss folgende Struktur haben:
{
  "siteName": "Name der Website",
  "siteType": "restaurant|portfolio|agency|shop|blog|business|landing|saas|event|medical|education|nonprofit",
  "pages": [
    {
      "name": "Seitenname",
      "slug": "seiten-slug",
      "selected": true,
      "isLegalPage": false,
      "inHeader": true,
      "inFooter": true
    }
  ],
  "colors": {
    "primary": "#hex",
    "primaryHover": "#hex (ca. 10-15% dunkler als primary)",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "foreground": "#hex",
    "muted": "#hex",
    "border": "#hex"
  },
  "fonts": {
    "heading": "Google Font Name",
    "body": "Google Font Name",
    "mono": "Google Font Name (optional, nur wenn relevant)"
  },
  "gradient": {
    "enabled": true/false,
    "from": "#hex",
    "to": "#hex",
    "via": "#hex (optional, für 3-Farb-Gradient)",
    "direction": "to-r|to-br|to-b|to-bl|to-l|to-tl|to-t|to-tr"
  },
  "customColors": {
    "goldAccent": "#hex",
    "brandRed": "#hex"
  },
  "headerSettings": {
    "style": "simple|centered|split",
    "sticky": true/false,
    "showCta": true/false,
    "ctaText": "Button Text",
    "ctaPage": "kontakt"
  }
}

=== DESIGN-PRINZIPIEN ===

1. FARBEN - DU BIST EIN FARBDESIGN-MEISTER!

   Du bist ein Experte für Farbtheorie, Markenidentität und visuelle Psychologie.
   Erstelle eine EINZIGARTIGE, PREMIUM Farbpalette die perfekt zur Marke passt!

   DEIN AUFTRAG:
   - Analysiere die Marke, Emotion und Zielgruppe
   - Erstelle eine harmonische, aber einzigartige Palette
   - Denke wie ein Art Director einer Top-Agentur
   - Sei mutig und kreativ - keine langweiligen Standard-Farben!

   DIE 8 FARBEN (alle Pflicht, alle als #hex):
   - primary: Hauptfarbe für Buttons, Links, CTAs
   - primaryHover: 10-15% dunkler als primary
   - secondary: ANDERE Farbe als primary
   - accent: ANDERE Farbe als primary UND secondary - für besondere Highlights
   - background: Seitenhintergrund
   - foreground: Textfarbe
   - muted: Subtiler Hintergrund für Cards
   - border: Linienfarbe

   ⚠️ WICHTIG:
   - Jede Farbe MUSS einzigartig sein!
   - primary, secondary und accent = 3 VERSCHIEDENE Farben!
   - Sei kreativ und wähle Farben passend zur Marke/Branche!

   FARBHARMONIE-TECHNIKEN (wähle was passt):
   - Komplementär: Gegenüberliegende Farben im Farbkreis
   - Analog: Benachbarte Farben für Harmonie
   - Triadisch: Drei gleichmäßig verteilte Farben
   - Split-Komplementär: Eine Farbe + zwei Nachbarn der Komplementärfarbe
   - Monochrom: Verschiedene Töne einer Farbe

   WICHTIG:
   - Keine generischen Blau/Grau Paletten wenn nicht zur Marke passend!
   - Kontraste müssen für Accessibility funktionieren (WCAG AA mindestens)

2. SCHRIFTARTEN - DU BIST EIN TYPOGRAFIE-MEISTER!

   Du hast Zugriff auf ALLE 1500+ Google Fonts. Wähle die PERFEKTE Kombination für das Projekt!

   DEIN AUFTRAG:
   - Analysiere die Marke, Branche und Zielgruppe
   - Wähle eine einzigartige, passende Font-Kombination
   - Denke wie ein Premium-Typograf mit jahrelanger Erfahrung
   - Sei kreativ, aber immer professionell

   WICHTIG:
   - heading: Display-Font für Headlines, Hero-Texte, große Überschriften
   - body: Gut lesbare Font für Fließtext, Absätze, kleine Texte
   - mono: NUR wenn Code/Tech-Daten relevant sind (sonst weglassen!)
   - Verwende EXAKTE Google Fonts Namen (korrekte Schreibweise!)
   - Die Fonts müssen harmonieren aber auch Kontrast bieten
   - Wähle PREMIUM Fonts, keine Standard-Langweiler wie Arial oder Times

3. GRADIENT - OPTIONAL ABER KRAFTVOLL:

   Entscheide selbst ob ein Gradient zum Design passt!
   - enabled: true wenn es das Design aufwertet, false wenn nicht
   - from/to: Wähle Farben die zur Palette passen oder kontrastieren
   - via: Optional für 3-Farb-Verläufe (nutze sparsam!)
   - direction: Wähle die Richtung die am besten wirkt
     * "to-r" = horizontal (→)
     * "to-br" = diagonal (↘)
     * "to-b" = vertikal (↓)
     * "to-tr" = diagonal hoch (↗)

4. CUSTOM COLORS - MARKENSPEZIFISCH:

   Füge zusätzliche Farben hinzu wenn die Marke sie braucht!
   - Nur wenn wirklich relevant (nicht erzwingen)
   - Keys beschreibend: goldAccent, brandRed, neonGreen, etc.
   - Für spezielle Brand-Farben die nicht in die 8 Hauptfarben passen

5. HEADER-EINSTELLUNGEN:

   - style: Wähle passend zur Marke
     * "simple": Logo links, Menu rechts
     * "centered": Logo zentriert, Menu darunter
     * "split": Logo mitte, Menu links+rechts
   - sticky: Meistens true, außer bei speziellen Designs
   - showCta: true wenn es eine klare Handlungsaufforderung gibt
   - ctaText: Kurz und handlungsorientiert
   - ctaPage: slug der Zielseite

6. SEITEN - INTELLIGENT AUSWÄHLEN:

   Wähle 4-8 Seiten die WIRKLICH Sinn machen für das Projekt!
   - Home (slug: "") IMMER dabei
   - Impressum + Datenschutz PFLICHT (isLegalPage: true)
   - WICHTIG: isLegalPage: true NUR für "impressum" und "datenschutz"!
     ALLE anderen Seiten MÜSSEN isLegalPage: false haben!
   - Analysiere was die Website braucht, keine Standard-Templates!

=== QUALITÄTSANSPRUCH ===

Erstelle Designs die:
- Einzigartig und individuell wirken (keine generischen Templates)
- Professionell und modern aussehen
- Die Markenidentität perfekt transportieren
- Konsistente Farbharmonie haben
- Typografie die Hierarchie und Lesbarkeit optimiert
- CTA-Strategien die Conversions fördern
`

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const model = genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${SYSTEM_PROMPT}\n\nGeneriere Setup-Vorschläge für folgende Website:\n\n${prompt}`,
    })

    const response = await model

    // Extract text from response
    const responseText = response.text || ''

    // Parse JSON from response
    let suggestions: SetupSuggestion
    try {
      // Try to extract JSON from response (might be wrapped in markdown)
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

    // Validate and ensure required fields
    if (!suggestions.pages || !Array.isArray(suggestions.pages)) {
      suggestions.pages = []
    }

    // WICHTIG: isLegalPage NUR für Impressum und Datenschutz!
    // Die KI setzt das manchmal falsch für andere Seiten
    suggestions.pages = suggestions.pages.map(page => ({
      ...page,
      isLegalPage: page.slug === 'impressum' || page.slug === 'datenschutz',
    }))

    // Ensure Home page exists
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

    // Ensure legal pages exist
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

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Setup suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
