// ============================================
// HANDLEBARS CUSTOM HELPERS
// Date formatting, string manipulation, etc.
// ============================================

import type Handlebars from 'handlebars'

/**
 * Register all custom helpers with Handlebars
 */
export function registerHelpers(handlebars: typeof Handlebars): void {
  // Date formatting helper
  handlebars.registerHelper('formatDate', function(date: string | Date, format: string) {
    if (!date) return ''

    const d = new Date(date)
    if (isNaN(d.getTime())) return String(date)

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ]
    const shortMonths = [
      'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
      'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
    ]

    return format
      .replace('DD', day)
      .replace('D', String(d.getDate()))
      .replace('MMMM', months[d.getMonth()])
      .replace('MMM', shortMonths[d.getMonth()])
      .replace('MM', month)
      .replace('M', String(d.getMonth() + 1))
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('HH', hours)
      .replace('mm', minutes)
  })

  // Relative date helper (e.g., "vor 3 Tagen")
  handlebars.registerHelper('timeAgo', function(date: string | Date) {
    if (!date) return ''

    const d = new Date(date)
    if (isNaN(d.getTime())) return String(date)

    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSecs < 60) return 'gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Minute${diffMins === 1 ? '' : 'n'}`
    if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`
    if (diffWeeks < 4) return `vor ${diffWeeks} Woche${diffWeeks === 1 ? '' : 'n'}`
    if (diffMonths < 12) return `vor ${diffMonths} Monat${diffMonths === 1 ? '' : 'en'}`

    const diffYears = Math.floor(diffMonths / 12)
    return `vor ${diffYears} Jahr${diffYears === 1 ? '' : 'en'}`
  })

  // Truncate text helper
  handlebars.registerHelper('truncate', function(text: string, length: number) {
    if (!text) return ''
    if (text.length <= length) return text
    return text.substring(0, length).trim() + '...'
  })

  // Strip HTML tags
  handlebars.registerHelper('stripHtml', function(html: string) {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '')
  })

  // Lowercase helper
  handlebars.registerHelper('lowercase', function(text: string) {
    return text?.toLowerCase() || ''
  })

  // Uppercase helper
  handlebars.registerHelper('uppercase', function(text: string) {
    return text?.toUpperCase() || ''
  })

  // Capitalize first letter
  handlebars.registerHelper('capitalize', function(text: string) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
  })

  // JSON stringify helper
  handlebars.registerHelper('json', function(context: unknown) {
    return JSON.stringify(context, null, 2)
  })

  // Equals comparison
  handlebars.registerHelper('eq', function(this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a === b ? options.fn(this) : options.inverse(this)
  })

  // Not equals comparison
  handlebars.registerHelper('ne', function(this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a !== b ? options.fn(this) : options.inverse(this)
  })

  // Greater than
  handlebars.registerHelper('gt', function(this: unknown, a: number, b: number, options: Handlebars.HelperOptions) {
    return a > b ? options.fn(this) : options.inverse(this)
  })

  // Less than
  handlebars.registerHelper('lt', function(this: unknown, a: number, b: number, options: Handlebars.HelperOptions) {
    return a < b ? options.fn(this) : options.inverse(this)
  })

  // And helper
  handlebars.registerHelper('and', function(this: unknown, ...args: unknown[]) {
    const options = args.pop() as Handlebars.HelperOptions
    const conditions = args.slice(0, -1)
    return conditions.every(Boolean) ? options.fn(this) : options.inverse(this)
  })

  // Or helper
  handlebars.registerHelper('or', function(this: unknown, ...args: unknown[]) {
    const options = args.pop() as Handlebars.HelperOptions
    const conditions = args.slice(0, -1)
    return conditions.some(Boolean) ? options.fn(this) : options.inverse(this)
  })

  // Array length helper
  handlebars.registerHelper('length', function(array: unknown[]) {
    return Array.isArray(array) ? array.length : 0
  })

  // First item of array
  handlebars.registerHelper('first', function(array: unknown[]) {
    return Array.isArray(array) && array.length > 0 ? array[0] : undefined
  })

  // Last item of array
  handlebars.registerHelper('last', function(array: unknown[]) {
    return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : undefined
  })

  // Limit array
  handlebars.registerHelper('limit', function(array: unknown[], count: number) {
    if (!Array.isArray(array)) return []
    return array.slice(0, count)
  })

  // Range helper (for pagination)
  handlebars.registerHelper('range', function(this: unknown, start: number, end: number, options: Handlebars.HelperOptions) {
    let result = ''
    for (let i = start; i <= end; i++) {
      result += options.fn({ ...(this as object), current: i })
    }
    return result
  })

  // Math helpers
  handlebars.registerHelper('add', function(a: number, b: number) {
    return a + b
  })

  handlebars.registerHelper('subtract', function(a: number, b: number) {
    return a - b
  })

  handlebars.registerHelper('multiply', function(a: number, b: number) {
    return a * b
  })

  handlebars.registerHelper('divide', function(a: number, b: number) {
    return b !== 0 ? a / b : 0
  })

  // Image placeholder helper
  handlebars.registerHelper('placeholder', function(width: number, height: number, text?: string) {
    const displayText = text || `${width}x${height}`
    return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(displayText)}`
  })

  // URL slug helper
  handlebars.registerHelper('slugify', function(text: string) {
    if (!text) return ''
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  })

  // Index helper for loops
  handlebars.registerHelper('index', function(this: { index?: number }) {
    return this.index
  })

  // Check if current loop item is first
  handlebars.registerHelper('isFirst', function(this: { first?: boolean }) {
    return this.first
  })

  // Check if current loop item is last
  handlebars.registerHelper('isLast', function(this: { last?: boolean }) {
    return this.last
  })
}
