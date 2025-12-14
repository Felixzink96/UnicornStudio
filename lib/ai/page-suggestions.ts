/**
 * Seiten-Vorschläge für das Site-Setup
 *
 * Analysiert den User-Prompt und schlägt passende Seiten vor.
 */

export interface PageSuggestion {
  name: string
  slug: string
  selected: boolean
  isLegalPage: boolean
  inHeader: boolean  // Soll im Header-Menu erscheinen
  inFooter: boolean  // Soll im Footer-Menu erscheinen
}

export interface PageSuggestionsResult {
  pages: PageSuggestion[]
  siteName: string
  siteType: string
}

// Standard Legal Pages (Deutschland)
const LEGAL_PAGES: PageSuggestion[] = [
  { name: 'Impressum', slug: 'impressum', selected: true, isLegalPage: true, inHeader: false, inFooter: true },
  { name: 'Datenschutz', slug: 'datenschutz', selected: true, isLegalPage: true, inHeader: false, inFooter: true },
]

// Seiten-Templates nach Website-Typ
const PAGE_TEMPLATES: Record<string, { pages: Omit<PageSuggestion, 'isLegalPage'>[]; siteName: string }> = {
  restaurant: {
    siteName: 'Restaurant',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Speisekarte', slug: 'speisekarte', selected: true, inHeader: true, inFooter: true },
      { name: 'Über uns', slug: 'ueber-uns', selected: true, inHeader: true, inFooter: true },
      { name: 'Reservierung', slug: 'reservierung', selected: true, inHeader: true, inFooter: true },
      { name: 'Galerie', slug: 'galerie', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  cafe: {
    siteName: 'Café',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Menü', slug: 'menu', selected: true, inHeader: true, inFooter: true },
      { name: 'Über uns', slug: 'ueber-uns', selected: true, inHeader: true, inFooter: true },
      { name: 'Galerie', slug: 'galerie', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  portfolio: {
    siteName: 'Portfolio',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Projekte', slug: 'projekte', selected: true, inHeader: true, inFooter: true },
      { name: 'Über mich', slug: 'ueber-mich', selected: true, inHeader: true, inFooter: true },
      { name: 'Skills', slug: 'skills', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  freelancer: {
    siteName: 'Freelancer',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Leistungen', slug: 'leistungen', selected: true, inHeader: true, inFooter: true },
      { name: 'Portfolio', slug: 'portfolio', selected: true, inHeader: true, inFooter: true },
      { name: 'Über mich', slug: 'ueber-mich', selected: true, inHeader: true, inFooter: true },
      { name: 'Preise', slug: 'preise', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  agency: {
    siteName: 'Agentur',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Leistungen', slug: 'leistungen', selected: true, inHeader: true, inFooter: true },
      { name: 'Referenzen', slug: 'referenzen', selected: true, inHeader: true, inFooter: true },
      { name: 'Team', slug: 'team', selected: true, inHeader: true, inFooter: true },
      { name: 'Karriere', slug: 'karriere', selected: false, inHeader: false, inFooter: true },
      { name: 'Blog', slug: 'blog', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  shop: {
    siteName: 'Online-Shop',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Produkte', slug: 'produkte', selected: true, inHeader: true, inFooter: true },
      { name: 'Über uns', slug: 'ueber-uns', selected: true, inHeader: true, inFooter: true },
      { name: 'FAQ', slug: 'faq', selected: true, inHeader: false, inFooter: true },
      { name: 'Versand', slug: 'versand', selected: true, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
      { name: 'AGB', slug: 'agb', selected: true, inHeader: false, inFooter: true },
      { name: 'Widerrufsrecht', slug: 'widerrufsrecht', selected: true, inHeader: false, inFooter: true },
    ],
  },
  blog: {
    siteName: 'Blog',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Blog', slug: 'blog', selected: true, inHeader: true, inFooter: true },
      { name: 'Über mich', slug: 'ueber-mich', selected: true, inHeader: true, inFooter: true },
      { name: 'Kategorien', slug: 'kategorien', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  landing: {
    siteName: 'Landing Page',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Features', slug: 'features', selected: false, inHeader: false, inFooter: true },
      { name: 'Preise', slug: 'preise', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
  business: {
    siteName: 'Unternehmen',
    pages: [
      { name: 'Home', slug: '', selected: true, inHeader: true, inFooter: true },
      { name: 'Über uns', slug: 'ueber-uns', selected: true, inHeader: true, inFooter: true },
      { name: 'Leistungen', slug: 'leistungen', selected: true, inHeader: true, inFooter: true },
      { name: 'Referenzen', slug: 'referenzen', selected: false, inHeader: false, inFooter: true },
      { name: 'Karriere', slug: 'karriere', selected: false, inHeader: false, inFooter: true },
      { name: 'Blog', slug: 'blog', selected: false, inHeader: false, inFooter: true },
      { name: 'Kontakt', slug: 'kontakt', selected: true, inHeader: true, inFooter: true },
    ],
  },
}

// Keywords für Website-Typ-Erkennung
const TYPE_KEYWORDS: Record<string, string[]> = {
  restaurant: ['restaurant', 'gastronomie', 'essen', 'küche', 'speise', 'bistro'],
  cafe: ['café', 'cafe', 'kaffee', 'coffee', 'bakery', 'bäckerei'],
  portfolio: ['portfolio', 'designer', 'fotograf', 'künstler', 'artist'],
  freelancer: ['freelancer', 'freiberufler', 'selbstständig', 'consultant', 'berater'],
  agency: ['agentur', 'agency', 'marketing', 'werbeagentur', 'kreativagentur'],
  shop: ['shop', 'store', 'ecommerce', 'e-commerce', 'online-shop', 'verkauf', 'produkt'],
  blog: ['blog', 'magazin', 'news', 'artikel'],
  landing: ['landing', 'landingpage', 'conversion', 'saas', 'app', 'startup'],
}

/**
 * Erkennt den Website-Typ basierend auf Keywords im Prompt
 */
function detectSiteType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        return type
      }
    }
  }

  return 'business' // Default
}

/**
 * Extrahiert einen potenziellen Site-Namen aus dem Prompt
 */
function extractSiteName(prompt: string, defaultName: string): string {
  // Versuche Namen in Anführungszeichen zu finden
  const quotedMatch = prompt.match(/["„"]([^"„""]+)["„""]/)
  if (quotedMatch) {
    return quotedMatch[1]
  }

  // Versuche "für XYZ" Pattern zu finden
  const forMatch = prompt.match(/für\s+(?:das\s+|die\s+|den\s+)?([A-ZÄÖÜa-zäöüß][A-ZÄÖÜa-zäöüß\s&-]+?)(?:\s*[.,]|\s+erstellen|\s+website|\s+seite|$)/i)
  if (forMatch) {
    return forMatch[1].trim()
  }

  return defaultName
}

/**
 * Generiert Seiten-Vorschläge basierend auf dem User-Prompt
 */
export function suggestPages(prompt: string): PageSuggestionsResult {
  const siteType = detectSiteType(prompt)
  const template = PAGE_TEMPLATES[siteType] || PAGE_TEMPLATES.business

  // Konvertiere Template-Pages zu PageSuggestion
  const templatePages: PageSuggestion[] = template.pages.map(p => ({
    ...p,
    isLegalPage: false,
  }))

  // Kombiniere mit Legal Pages
  const allPages = [...templatePages, ...LEGAL_PAGES]

  // Extrahiere Site-Namen
  const siteName = extractSiteName(prompt, template.siteName)

  return {
    pages: allPages,
    siteName,
    siteType,
  }
}

/**
 * Generiert einen URL-Slug aus einem Namen
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Fügt eine benutzerdefinierte Seite hinzu
 */
export function addCustomPage(
  pages: PageSuggestion[],
  name: string,
  inHeader: boolean = true,
  inFooter: boolean = true
): PageSuggestion[] {
  const slug = generateSlug(name)

  // Prüfe ob Seite bereits existiert
  if (pages.some(p => p.slug === slug)) {
    return pages
  }

  return [
    ...pages,
    {
      name,
      slug,
      selected: true,
      isLegalPage: false,
      inHeader,
      inFooter,
    },
  ]
}
