/**
 * AI Tools - On-Demand Data Access
 *
 * These tools allow the AI to request specific data when needed,
 * instead of always sending the full context.
 */

export { readPage, listPages } from './read-page'
export type { PageData } from './read-page'

export { readComponent, getGlobalComponents, listComponents } from './read-component'
export type { ComponentData } from './read-component'

export { updateComponent } from './update-component'
export type { UpdateComponentInput } from './update-component'

export {
  listImages,
  listTemplates,
  listMenus,
  getDesignVariables,
  getFormSubmissions,
} from './list-resources'

/**
 * Tool definitions for AI function calling
 */
export const AI_TOOLS = [
  {
    name: 'read_page',
    description: 'Liest den HTML-Inhalt einer bestimmten Seite anhand des Slugs',
    parameters: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'Der Slug der Seite (z.B. "ueber-uns", "kontakt")',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_pages',
    description: 'Listet alle Seiten des Projekts (ohne HTML-Inhalt)',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'read_component',
    description: 'Liest eine globale Komponente (Header oder Footer)',
    parameters: {
      type: 'object',
      properties: {
        component_id: {
          type: 'string',
          description: 'Die ID der Komponente',
        },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'get_global_components',
    description: 'Holt den globalen Header und Footer des Projekts',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_images',
    description: 'Listet alle Bilder/Assets des Projekts',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_templates',
    description: 'Listet alle verfügbaren Templates',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_design_variables',
    description: 'Holt die Design-Variablen (Farben, Schriften)',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_component',
    description: 'Aktualisiert eine Komponente (Header/Footer). Nur nutzen wenn explizit angefragt!',
    parameters: {
      type: 'object',
      properties: {
        component_id: {
          type: 'string',
          description: 'Die ID der zu aktualisierenden Komponente',
        },
        html: {
          type: 'string',
          description: 'Neues HTML (optional)',
        },
        css: {
          type: 'string',
          description: 'Neues CSS (optional)',
        },
        js: {
          type: 'string',
          description: 'Neues JavaScript (optional)',
        },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'update_form_config',
    description: 'Konfiguriert ein Formular (Empfänger, Betreff, etc.)',
    parameters: {
      type: 'object',
      properties: {
        component_id: {
          type: 'string',
          description: 'Die ID der Formular-Komponente',
        },
        recipient_email: {
          type: 'string',
          description: 'Empfänger-E-Mail-Adresse',
        },
        subject: {
          type: 'string',
          description: 'Betreff der E-Mail',
        },
        success_message: {
          type: 'string',
          description: 'Erfolgsmeldung nach dem Absenden',
        },
      },
      required: ['component_id'],
    },
  },
  {
    name: 'get_form_submissions',
    description: 'Holt die letzten Formular-Einsendungen',
    parameters: {
      type: 'object',
      properties: {
        form_id: {
          type: 'string',
          description: 'Optional: Nur Einsendungen eines bestimmten Formulars',
        },
        limit: {
          type: 'number',
          description: 'Anzahl der Ergebnisse (Standard: 10)',
        },
      },
    },
  },
]
