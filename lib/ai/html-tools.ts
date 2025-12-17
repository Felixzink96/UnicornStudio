/**
 * Function Calling Tools für HTML-Operationen
 *
 * Diese Tools ermöglichen 100% zuverlässige Intent-Erkennung,
 * da die KI ein definiertes Tool wählen MUSS statt Freitext zu generieren.
 */

// Type enum für Gemini Schema
export const Type = {
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
} as const

/**
 * Tool: Komplette Seite erstellen (nur für leere Seiten)
 */
export const createFullPageTool = {
  name: 'create_full_page',
  description: `Erstellt eine komplette HTML-Seite mit DOCTYPE, head, body, Tailwind, Header, Footer.
VERWENDE NUR wenn die Seite komplett leer ist und der User eine neue Seite erstellen will.
NIEMALS verwenden wenn bereits Content auf der Seite existiert!`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was erstellt wurde (1-2 Sätze)',
      },
      html: {
        type: Type.STRING,
        description: 'Komplettes HTML mit <!DOCTYPE html>, <html>, <head>, <body>, Tailwind CDN Script, Header, Sections, Footer',
      },
    },
    required: ['message', 'html'],
  },
}

/**
 * Tool: Section komplett ersetzen
 */
export const replaceSectionTool = {
  name: 'replace_section',
  description: `Ersetzt eine bestehende Section KOMPLETT mit neuem HTML.
VERWENDE wenn User sagt: "ersetze", "tausche aus", "mache neu", "komplett neu", "neugestalten", "redesign"
Die alte Section wird ENTFERNT und durch die neue ERSETZT.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was geändert wurde',
      },
      section_id: {
        type: Type.STRING,
        description: 'Die ID der Section die ersetzt werden soll (z.B. "hero", "features", "contact")',
      },
      html: {
        type: Type.STRING,
        description: 'Das komplette neue Section HTML inkl. <section id="..."> Tags',
      },
    },
    required: ['message', 'section_id', 'html'],
  },
}

/**
 * Tool: Section teilweise modifizieren
 */
export const modifySectionTool = {
  name: 'modify_section',
  description: `Ändert eine bestehende Section, behält aber die Grundstruktur.
VERWENDE wenn User einzelne Elemente ändern will: "ändere den Text", "andere Farbe", "füge Button hinzu"
Die Section bleibt grundsätzlich gleich, nur Teile werden angepasst.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was geändert wurde',
      },
      section_id: {
        type: Type.STRING,
        description: 'Die ID der Section die modifiziert werden soll',
      },
      html: {
        type: Type.STRING,
        description: 'Das modifizierte Section HTML (komplette Section mit Änderungen)',
      },
    },
    required: ['message', 'section_id', 'html'],
  },
}

/**
 * Tool: Neue Section hinzufügen
 */
export const addSectionTool = {
  name: 'add_section',
  description: `Fügt eine NEUE Section zur Seite hinzu.
VERWENDE wenn User eine zusätzliche Section will: "füge hinzu", "erstelle neue Section", "ergänze"
Die neue Section wird an der angegebenen Position eingefügt.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was hinzugefügt wurde',
      },
      position: {
        type: Type.STRING,
        description: 'Wo die Section eingefügt werden soll: "start" (nach Header), "end" (vor Footer), "before_SECTIONID", "after_SECTIONID"',
      },
      html: {
        type: Type.STRING,
        description: 'Das HTML der neuen Section (nur die Section, nicht die ganze Seite!)',
      },
    },
    required: ['message', 'position', 'html'],
  },
}

/**
 * Tool: Section löschen
 */
export const deleteSectionTool = {
  name: 'delete_section',
  description: `Entfernt eine Section komplett von der Seite.
VERWENDE wenn User sagt: "lösche", "entferne", "weg damit"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was gelöscht wurde',
      },
      section_id: {
        type: Type.STRING,
        description: 'Die ID der Section die gelöscht werden soll',
      },
    },
    required: ['message', 'section_id'],
  },
}

/**
 * Tool: Header/Footer als globale Komponente aktualisieren
 */
export const updateGlobalComponentTool = {
  name: 'update_global_component',
  description: `Aktualisiert einen globalen Header oder Footer.
VERWENDE wenn User den Header oder Footer ändern will UND eine globale Komponente referenziert wurde.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was geändert wurde',
      },
      component_id: {
        type: Type.STRING,
        description: 'Die ID der globalen Komponente (aus der Referenz)',
      },
      component_type: {
        type: Type.STRING,
        description: 'Der Typ: "header" oder "footer"',
      },
      html: {
        type: Type.STRING,
        description: 'Das neue HTML für die Komponente',
      },
    },
    required: ['message', 'component_id', 'component_type', 'html'],
  },
}

/**
 * Tool: Design Token aktualisieren
 */
export const updateDesignTokenTool = {
  name: 'update_design_token',
  description: `Ändert einen Design Token (Farbe, Schriftart, etc.).
VERWENDE wenn User Farben oder Fonts ändern will: "andere Hauptfarbe", "blauer machen", "andere Schrift"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was geändert wurde',
      },
      token_id: {
        type: Type.STRING,
        description: 'Die Token-ID (z.B. "color-brand-primary", "font-heading")',
      },
      value: {
        type: Type.STRING,
        description: 'Der neue Wert (z.B. "#3b82f6" für Farben, "Inter" für Fonts)',
      },
    },
    required: ['message', 'token_id', 'value'],
  },
}

/**
 * Tool: Nur antworten ohne HTML-Änderung
 */
export const respondOnlyTool = {
  name: 'respond_only',
  description: `Antwortet auf eine Frage OHNE HTML zu ändern.
VERWENDE wenn User eine Frage stellt, Hilfe braucht, oder keine Änderung an der Seite gewünscht ist.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Die Antwort auf die Frage des Users',
      },
    },
    required: ['message'],
  },
}

// ============================================
// MENÜ-TOOLS
// ============================================

/**
 * Tool: Menü-Item hinzufügen
 */
export const addMenuItemTool = {
  name: 'add_menu_item',
  description: `Fügt einen neuen Link zu einem Menü hinzu.
VERWENDE wenn User sagt: "füge Link hinzu", "neuer Menüpunkt", "Link zu X hinzufügen"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was hinzugefügt wurde',
      },
      menu_id: {
        type: Type.STRING,
        description: 'Die ID des Menüs (z.B. "header-menu", "footer-menu")',
      },
      label: {
        type: Type.STRING,
        description: 'Der anzuzeigende Text des Links',
      },
      url: {
        type: Type.STRING,
        description: 'Die URL des Links (z.B. "/kontakt", "#about", "https://...")',
      },
      position: {
        type: Type.STRING,
        description: 'Position: "start", "end", oder "after_ITEMLABEL"',
      },
    },
    required: ['message', 'menu_id', 'label', 'url'],
  },
}

/**
 * Tool: Menü-Item entfernen
 */
export const removeMenuItemTool = {
  name: 'remove_menu_item',
  description: `Entfernt einen Link aus einem Menü.
VERWENDE wenn User sagt: "entferne Link", "lösche Menüpunkt"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung was entfernt wurde',
      },
      menu_id: {
        type: Type.STRING,
        description: 'Die ID des Menüs',
      },
      item_label: {
        type: Type.STRING,
        description: 'Der Text des zu entfernenden Links',
      },
    },
    required: ['message', 'menu_id', 'item_label'],
  },
}

/**
 * Tool: Menü neu ordnen
 */
export const reorderMenuTool = {
  name: 'reorder_menu',
  description: `Ändert die Reihenfolge der Menü-Items.
VERWENDE wenn User sagt: "sortiere Menü", "ändere Reihenfolge"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung der Änderung',
      },
      menu_id: {
        type: Type.STRING,
        description: 'Die ID des Menüs',
      },
      new_order: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array der Item-Labels in neuer Reihenfolge',
      },
    },
    required: ['message', 'menu_id', 'new_order'],
  },
}

// ============================================
// BILD-TOOLS
// ============================================

/**
 * Tool: Bild ersetzen
 */
export const replaceImageTool = {
  name: 'replace_image',
  description: `Ersetzt ein Bild in einer Section.
VERWENDE wenn User sagt: "anderes Bild", "Bild austauschen", "ersetze das Bild"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      section_id: {
        type: Type.STRING,
        description: 'Die ID der Section mit dem Bild',
      },
      image_selector: {
        type: Type.STRING,
        description: 'CSS-Selector des Bildes (z.B. "#hero img", ".hero-image")',
      },
      new_src: {
        type: Type.STRING,
        description: 'Neue Bild-URL (Unsplash, Placehold.co, etc.)',
      },
      new_alt: {
        type: Type.STRING,
        description: 'Neuer Alt-Text für das Bild',
      },
    },
    required: ['message', 'section_id', 'new_src', 'new_alt'],
  },
}

/**
 * Tool: Hintergrundbild setzen
 */
export const setBackgroundImageTool = {
  name: 'set_background_image',
  description: `Setzt oder ändert ein Hintergrundbild für eine Section.
VERWENDE wenn User sagt: "Hintergrundbild", "background image", "Bild als Hintergrund"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      section_id: {
        type: Type.STRING,
        description: 'Die ID der Section',
      },
      image_url: {
        type: Type.STRING,
        description: 'URL des Hintergrundbildes',
      },
      overlay: {
        type: Type.STRING,
        description: 'Overlay-Farbe mit Opacity (z.B. "rgba(0,0,0,0.5)")',
      },
      position: {
        type: Type.STRING,
        description: 'Background-Position (z.B. "center", "top")',
      },
    },
    required: ['message', 'section_id', 'image_url'],
  },
}

// ============================================
// SEO-TOOLS
// ============================================

/**
 * Tool: Seitentitel ändern
 */
export const updatePageTitleTool = {
  name: 'update_page_title',
  description: `Ändert den Seitentitel (<title> Tag).
VERWENDE wenn User sagt: "ändere Titel", "Seitentitel", "Title Tag"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      title: {
        type: Type.STRING,
        description: 'Der neue Seitentitel',
      },
    },
    required: ['message', 'title'],
  },
}

/**
 * Tool: Meta-Description ändern
 */
export const updateMetaDescriptionTool = {
  name: 'update_meta_description',
  description: `Ändert die Meta-Description der Seite.
VERWENDE wenn User sagt: "Meta Description", "Beschreibung für Google"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      description: {
        type: Type.STRING,
        description: 'Die neue Meta-Description (max 160 Zeichen empfohlen)',
      },
    },
    required: ['message', 'description'],
  },
}

/**
 * Tool: Structured Data hinzufügen
 */
export const addStructuredDataTool = {
  name: 'add_structured_data',
  description: `Fügt Schema.org JSON-LD Structured Data hinzu.
VERWENDE wenn User sagt: "Structured Data", "Schema.org", "Rich Snippets"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      schema_type: {
        type: Type.STRING,
        description: 'Schema-Typ (z.B. "Organization", "LocalBusiness", "Product", "Article")',
      },
      data: {
        type: Type.STRING,
        description: 'JSON-String mit den Schema.org Daten',
      },
    },
    required: ['message', 'schema_type', 'data'],
  },
}

// ============================================
// MULTI-ELEMENT TOOLS
// ============================================

/**
 * Tool: Alle Buttons ändern
 */
export const changeAllButtonsTool = {
  name: 'change_all_buttons',
  description: `Ändert das Styling aller Buttons auf der Seite einheitlich.
VERWENDE wenn User sagt: "alle Buttons", "Button-Style ändern", "einheitliche Buttons"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      primary_classes: {
        type: Type.STRING,
        description: 'Tailwind-Klassen für Primary Buttons',
      },
      secondary_classes: {
        type: Type.STRING,
        description: 'Tailwind-Klassen für Secondary Buttons (optional)',
      },
    },
    required: ['message', 'primary_classes'],
  },
}

/**
 * Tool: Farbschema global ändern
 */
export const updateColorSchemeTool = {
  name: 'update_color_scheme',
  description: `Ändert das gesamte Farbschema der Seite.
VERWENDE wenn User sagt: "Farbschema ändern", "andere Farben", "komplett neu färben"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      primary_color: {
        type: Type.STRING,
        description: 'Neue Hauptfarbe (Hex, z.B. "#3b82f6")',
      },
      secondary_color: {
        type: Type.STRING,
        description: 'Neue Sekundärfarbe (optional)',
      },
      accent_color: {
        type: Type.STRING,
        description: 'Neue Akzentfarbe (optional)',
      },
      background_color: {
        type: Type.STRING,
        description: 'Neue Hintergrundfarbe (optional)',
      },
      text_color: {
        type: Type.STRING,
        description: 'Neue Textfarbe (optional)',
      },
    },
    required: ['message', 'primary_color'],
  },
}

// ============================================
// FORM BUILDER TOOLS
// ============================================

/**
 * Tool: Formular erstellen
 */
export const createFormTool = {
  name: 'create_form',
  description: `Erstellt ein neues Kontakt-/Anmeldeformular.
VERWENDE wenn User sagt: "Formular erstellen", "Kontaktformular", "Anmeldeformular"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      form_type: {
        type: Type.STRING,
        description: 'Typ: "contact", "newsletter", "registration", "custom"',
      },
      fields: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            label: { type: Type.STRING },
            required: { type: Type.BOOLEAN },
            placeholder: { type: Type.STRING },
          },
        },
        description: 'Array der Formularfelder',
      },
      submit_text: {
        type: Type.STRING,
        description: 'Text des Submit-Buttons',
      },
      section_id: {
        type: Type.STRING,
        description: 'ID der Section wo das Formular eingefügt wird (optional)',
      },
    },
    required: ['message', 'form_type', 'fields', 'submit_text'],
  },
}

/**
 * Tool: Formularfeld hinzufügen
 */
export const addFormFieldTool = {
  name: 'add_form_field',
  description: `Fügt ein neues Feld zu einem bestehenden Formular hinzu.
VERWENDE wenn User sagt: "Feld hinzufügen", "neues Eingabefeld"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      form_selector: {
        type: Type.STRING,
        description: 'CSS-Selector des Formulars',
      },
      field_type: {
        type: Type.STRING,
        description: 'Typ: "text", "email", "tel", "textarea", "select", "checkbox", "radio", "file"',
      },
      field_name: {
        type: Type.STRING,
        description: 'Name-Attribut des Feldes',
      },
      field_label: {
        type: Type.STRING,
        description: 'Label-Text',
      },
      required: {
        type: Type.BOOLEAN,
        description: 'Ist das Feld Pflicht?',
      },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Optionen für Select/Radio (optional)',
      },
    },
    required: ['message', 'form_selector', 'field_type', 'field_name', 'field_label'],
  },
}

// ============================================
// ANIMATION TOOLS
// ============================================

/**
 * Tool: Animation hinzufügen
 */
export const addAnimationTool = {
  name: 'add_animation',
  description: `Fügt eine Animation zu einem Element hinzu.
VERWENDE wenn User sagt: "Animation", "animieren", "Effekt hinzufügen", "fade in", "slide"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      element_selector: {
        type: Type.STRING,
        description: 'CSS-Selector des Elements (z.B. "#hero h1", ".feature-cards")',
      },
      animation_type: {
        type: Type.STRING,
        description: 'Animation: "fade-in", "fade-up", "fade-down", "slide-left", "slide-right", "zoom-in", "bounce", "pulse"',
      },
      duration: {
        type: Type.STRING,
        description: 'Dauer (z.B. "0.5s", "1s")',
      },
      delay: {
        type: Type.STRING,
        description: 'Verzögerung (z.B. "0s", "0.2s")',
      },
      trigger: {
        type: Type.STRING,
        description: 'Auslöser: "load", "scroll", "hover"',
      },
    },
    required: ['message', 'element_selector', 'animation_type'],
  },
}

/**
 * Tool: Scroll-Animationen für Section
 */
export const addScrollAnimationsTool = {
  name: 'add_scroll_animations',
  description: `Fügt Scroll-basierte Animationen zu einer Section hinzu.
VERWENDE wenn User sagt: "Scroll-Animation", "beim Scrollen einblenden"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      section_id: {
        type: Type.STRING,
        description: 'ID der Section',
      },
      animation_style: {
        type: Type.STRING,
        description: 'Stil: "stagger" (nacheinander), "all" (alle gleichzeitig), "alternate" (abwechselnd)',
      },
      stagger_delay: {
        type: Type.STRING,
        description: 'Verzögerung zwischen Elementen bei stagger (z.B. "0.1s")',
      },
    },
    required: ['message', 'section_id', 'animation_style'],
  },
}

// ============================================
// RESPONSIVE TOOLS
// ============================================

/**
 * Tool: Mobile-Anpassungen
 */
export const adjustMobileTool = {
  name: 'adjust_mobile',
  description: `Passt eine Section speziell für Mobile an.
VERWENDE wenn User sagt: "Mobile anpassen", "auf Handy", "responsive Problem"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      section_id: {
        type: Type.STRING,
        description: 'ID der Section',
      },
      changes: {
        type: Type.STRING,
        description: 'Beschreibung der Mobile-spezifischen Änderungen',
      },
      html: {
        type: Type.STRING,
        description: 'Vollständiges neues HTML mit Mobile-Anpassungen',
      },
    },
    required: ['message', 'section_id', 'html'],
  },
}

/**
 * Tool: Responsive Breakpoint anpassen
 */
export const adjustBreakpointTool = {
  name: 'adjust_breakpoint',
  description: `Passt Styles für einen bestimmten Breakpoint an.
VERWENDE wenn User sagt: "Tablet-Ansicht", "auf Desktop anders", "Breakpoint"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      breakpoint: {
        type: Type.STRING,
        description: 'Breakpoint: "sm", "md", "lg", "xl", "2xl"',
      },
      element_selector: {
        type: Type.STRING,
        description: 'CSS-Selector des Elements',
      },
      add_classes: {
        type: Type.STRING,
        description: 'Hinzuzufügende Klassen (z.B. "md:grid-cols-3 md:gap-8")',
      },
      remove_classes: {
        type: Type.STRING,
        description: 'Zu entfernende Klassen (optional)',
      },
    },
    required: ['message', 'breakpoint', 'element_selector', 'add_classes'],
  },
}

// ============================================
// COMPONENT LIBRARY TOOLS
// ============================================

/**
 * Tool: Section als Komponente speichern
 */
export const saveAsComponentTool = {
  name: 'save_as_component',
  description: `Speichert eine Section als wiederverwendbare Komponente.
VERWENDE wenn User sagt: "als Komponente speichern", "wiederverwendbar machen"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      section_id: {
        type: Type.STRING,
        description: 'ID der zu speichernden Section',
      },
      component_name: {
        type: Type.STRING,
        description: 'Name der Komponente',
      },
      category: {
        type: Type.STRING,
        description: 'Kategorie: "hero", "features", "cta", "testimonials", "pricing", "contact", "other"',
      },
    },
    required: ['message', 'section_id', 'component_name', 'category'],
  },
}

/**
 * Tool: Komponente einfügen
 */
export const insertComponentTool = {
  name: 'insert_component',
  description: `Fügt eine gespeicherte Komponente in die Seite ein.
VERWENDE wenn User sagt: "füge Komponente ein", "verwende X Komponente"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      component_id: {
        type: Type.STRING,
        description: 'ID der Komponente',
      },
      position: {
        type: Type.STRING,
        description: 'Position: "end", "start", "after_SECTIONID", "before_SECTIONID"',
      },
      customize: {
        type: Type.STRING,
        description: 'Anpassungen an der Komponente (optional)',
      },
    },
    required: ['message', 'component_id', 'position'],
  },
}

// ============================================
// UTILITY TOOLS
// ============================================

/**
 * Tool: Text in Section ändern
 */
export const updateTextTool = {
  name: 'update_text',
  description: `Ändert einen Text in einer Section ohne das Layout zu ändern.
VERWENDE wenn User NUR Text ändern will: "ändere den Text", "anderer Titel", "neue Überschrift"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      element_selector: {
        type: Type.STRING,
        description: 'CSS-Selector des Text-Elements (z.B. "#hero h1", "#about p")',
      },
      new_text: {
        type: Type.STRING,
        description: 'Der neue Text',
      },
    },
    required: ['message', 'element_selector', 'new_text'],
  },
}

/**
 * Tool: Link/URL ändern
 */
export const updateLinkTool = {
  name: 'update_link',
  description: `Ändert die URL eines Links.
VERWENDE wenn User sagt: "ändere den Link", "andere URL", "Link anpassen"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Kurze Beschreibung',
      },
      link_selector: {
        type: Type.STRING,
        description: 'CSS-Selector des Links',
      },
      new_url: {
        type: Type.STRING,
        description: 'Neue URL',
      },
      new_text: {
        type: Type.STRING,
        description: 'Neuer Link-Text (optional)',
      },
      open_in_new_tab: {
        type: Type.BOOLEAN,
        description: 'In neuem Tab öffnen?',
      },
    },
    required: ['message', 'link_selector', 'new_url'],
  },
}

/**
 * Alle Tools für die AI-Generierung
 */
export const htmlOperationTools = [
  // Core HTML Operations
  createFullPageTool,
  replaceSectionTool,
  modifySectionTool,
  addSectionTool,
  deleteSectionTool,
  updateGlobalComponentTool,
  updateDesignTokenTool,
  respondOnlyTool,

  // Menu Tools
  addMenuItemTool,
  removeMenuItemTool,
  reorderMenuTool,

  // Image Tools
  replaceImageTool,
  setBackgroundImageTool,

  // SEO Tools
  updatePageTitleTool,
  updateMetaDescriptionTool,
  addStructuredDataTool,

  // Multi-Element Tools
  changeAllButtonsTool,
  updateColorSchemeTool,

  // Form Builder Tools
  createFormTool,
  addFormFieldTool,

  // Animation Tools
  addAnimationTool,
  addScrollAnimationsTool,

  // Responsive Tools
  adjustMobileTool,
  adjustBreakpointTool,

  // Component Library Tools
  saveAsComponentTool,
  insertComponentTool,

  // Utility Tools
  updateTextTool,
  updateLinkTool,
]

/**
 * Typen für Tool-Responses
 */
export type ToolCallResult = {
  toolName: string
  args: Record<string, unknown>
}

export type CreateFullPageArgs = {
  message: string
  html: string
}

export type ReplaceSectionArgs = {
  message: string
  section_id: string
  html: string
}

export type ModifySectionArgs = {
  message: string
  section_id: string
  html: string
}

export type AddSectionArgs = {
  message: string
  position: string
  html: string
}

export type DeleteSectionArgs = {
  message: string
  section_id: string
}

export type UpdateGlobalComponentArgs = {
  message: string
  component_id: string
  component_type: 'header' | 'footer'
  html: string
}

export type UpdateDesignTokenArgs = {
  message: string
  token_id: string
  value: string
}

export type RespondOnlyArgs = {
  message: string
}
