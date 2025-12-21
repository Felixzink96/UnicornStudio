# Plan: Konsistente Content-Komponenten für Beiträge

## Problem
Aktuell generiert die AI bei jedem Beitrag unterschiedliche HTML-Strukturen und Elemente. Ein Artikel hat ein Inhaltsverzeichnis, der nächste nicht. Einer hat Info-Boxen, der andere Zitat-Blöcke in anderem Stil.

## Lösung: Content-Komponenten-System

### Konzept
Der User definiert **wiederverwendbare Content-Komponenten** pro Content-Type. Die AI bekommt diese Komponenten als "Baukasten" und MUSS diese verwenden - keine eigenen erfinden.

### Datenbank-Schema

```sql
-- Neue Tabelle: content_components
CREATE TABLE content_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  content_type_id UUID REFERENCES content_types(id) ON DELETE CASCADE, -- Optional, NULL = global

  name TEXT NOT NULL,           -- z.B. "info-box", "quote", "toc"
  label TEXT NOT NULL,          -- z.B. "Info-Box", "Zitat", "Inhaltsverzeichnis"
  description TEXT,             -- Wann verwenden

  html_template TEXT NOT NULL,  -- HTML mit Platzhaltern: {{title}}, {{content}}, {{items}}

  category TEXT,                -- "structure", "visual", "interactive"
  icon TEXT,                    -- Lucide icon name

  is_required BOOLEAN DEFAULT FALSE,  -- Muss in jedem Artikel vorkommen
  is_default BOOLEAN DEFAULT TRUE,    -- Standardmäßig verfügbar

  position_hint TEXT,           -- "intro", "body", "conclusion"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Beispiel-Komponenten

```json
[
  {
    "name": "toc",
    "label": "Inhaltsverzeichnis",
    "description": "Automatisches Inhaltsverzeichnis am Anfang",
    "html_template": "<nav class=\"toc bg-[var(--color-neutral-muted)] p-6 rounded-xl mb-8\">\n  <h3 class=\"font-heading text-lg mb-4\">Inhaltsverzeichnis</h3>\n  <ul class=\"space-y-2\">{{items}}</ul>\n</nav>",
    "is_required": true,
    "position_hint": "intro"
  },
  {
    "name": "info-box",
    "label": "Info-Box",
    "description": "Hervorgehobene Information",
    "html_template": "<div class=\"info-box border-l-4 border-[var(--color-brand-primary)] bg-[var(--color-neutral-muted)] p-6 rounded-r-xl my-6\">\n  <h4 class=\"font-heading font-bold mb-2\">{{title}}</h4>\n  <p>{{content}}</p>\n</div>"
  },
  {
    "name": "quote",
    "label": "Zitat",
    "description": "Hervorgehobenes Zitat",
    "html_template": "<blockquote class=\"quote border-l-4 border-[var(--color-brand-accent)] pl-6 py-4 my-8 italic text-xl\">\n  <p>\"{{content}}\"</p>\n  {{#if author}}<cite class=\"block mt-2 text-sm not-italic text-[var(--color-neutral-muted-foreground)]\">— {{author}}</cite>{{/if}}\n</blockquote>"
  },
  {
    "name": "pro-con",
    "label": "Pro/Contra Liste",
    "description": "Gegenüberstellung von Vor- und Nachteilen",
    "html_template": "<div class=\"grid md:grid-cols-2 gap-6 my-8\">\n  <div class=\"p-6 bg-[var(--color-semantic-success)]/10 rounded-xl\">\n    <h4 class=\"font-heading font-bold text-[var(--color-semantic-success)] mb-4\">Vorteile</h4>\n    <ul class=\"space-y-2\">{{pros}}</ul>\n  </div>\n  <div class=\"p-6 bg-[var(--color-semantic-error)]/10 rounded-xl\">\n    <h4 class=\"font-heading font-bold text-[var(--color-semantic-error)] mb-4\">Nachteile</h4>\n    <ul class=\"space-y-2\">{{cons}}</ul>\n  </div>\n</div>"
  },
  {
    "name": "step-list",
    "label": "Schritt-für-Schritt",
    "description": "Nummerierte Anleitung",
    "html_template": "<div class=\"steps space-y-6 my-8\">{{steps}}</div>",
    "step_item_template": "<div class=\"flex gap-4\">\n  <div class=\"flex-shrink-0 w-10 h-10 bg-[var(--color-brand-primary)] text-white rounded-full flex items-center justify-center font-bold\">{{number}}</div>\n  <div>\n    <h4 class=\"font-heading font-bold\">{{title}}</h4>\n    <p class=\"text-[var(--color-neutral-muted-foreground)]\">{{content}}</p>\n  </div>\n</div>"
  },
  {
    "name": "cta-box",
    "label": "Call-to-Action",
    "description": "Handlungsaufforderung am Ende",
    "html_template": "<div class=\"cta-box bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] text-white p-8 rounded-2xl my-8 text-center\">\n  <h3 class=\"font-heading text-2xl font-bold mb-4\">{{title}}</h3>\n  <p class=\"mb-6\">{{content}}</p>\n  {{#if button_text}}<a href=\"{{button_url}}\" class=\"inline-block bg-white text-[var(--color-brand-primary)] px-6 py-3 rounded-lg font-bold hover:shadow-lg transition\">{{button_text}}</a>{{/if}}\n</div>",
    "position_hint": "conclusion"
  }
]
```

### UI im Builder

1. **Content-Type Einstellungen** → Neuer Tab "Content-Komponenten"
2. Liste aller verfügbaren Komponenten
3. Toggle: Aktiviert/Deaktiviert für diesen Content-Type
4. Checkbox: "Pflicht" (muss in jedem Artikel vorkommen)
5. Drag & Drop Reihenfolge für Pflicht-Komponenten
6. Button: "Komponente erstellen" für eigene

### Angepasster AI-Prompt

```
## VERFÜGBARE CONTENT-KOMPONENTEN

Du MUSST diese Komponenten verwenden. Erfinde KEINE eigenen HTML-Strukturen!

### PFLICHT-KOMPONENTEN (müssen vorkommen):
1. toc (Inhaltsverzeichnis) - Am Anfang
   Template: <nav class="toc ...">...</nav>

2. cta-box (Call-to-Action) - Am Ende
   Template: <div class="cta-box ...">...</div>

### OPTIONALE KOMPONENTEN (nutze passend zum Inhalt):
- info-box: Für wichtige Hinweise
- quote: Für Zitate
- pro-con: Für Vergleiche
- step-list: Für Anleitungen

### ARTIKEL-STRUKTUR:
1. Intro (1-2 Absätze)
2. Inhaltsverzeichnis [PFLICHT]
3. Hauptteil (H2-Abschnitte, nutze optionale Komponenten)
4. Fazit
5. Call-to-Action [PFLICHT]
```

### Implementierungs-Schritte

1. **Datenbank**: Migration für `content_components` Tabelle
2. **API**: CRUD Endpoints für Komponenten
3. **Builder UI**: Komponenten-Manager im Content-Type Editor
4. **Store**: Komponenten laden beim Entry-Editor Initialisieren
5. **AI Prompt**: Komponenten dynamisch in System-Prompt einfügen
6. **Vorlagen**: Standard-Komponenten-Set als Seed-Daten

### Vorteile

- **Konsistenz**: Jeder Artikel nutzt die gleichen Komponenten
- **Brand-Konform**: Komponenten nutzen Design-Variablen
- **Flexibel**: User kann eigene Komponenten erstellen
- **Wartbar**: Komponenten-Änderung wirkt auf alle Artikel
- **AI-gesteuert**: AI wählt passende Komponenten aus, erfindet keine

### Zeitschätzung

- Phase 1 (Basis): DB + API + Prompt-Integration
- Phase 2 (UI): Builder-Interface für Komponenten
- Phase 3 (Polish): Drag & Drop, Vorschau, Templates
