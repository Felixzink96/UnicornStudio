# Unicorn Studio - Verbesserungsplan

Erstellt: 2025-12-16
Basierend auf: Umfassender System-Analyse durch 4 Test-Agenten

---

## Zusammenfassung der Analyse

| Bereich | Status | Score | Kritische Issues |
|---------|--------|-------|------------------|
| WordPress Sync | Funktional | 7/10 | N+1 Queries, Security |
| CMS/Content | Funktional | 7/10 | N+1 Queries, Scheduled Posts |
| AI Page Builder | Funktional | 7.5/10 | Memory Leaks, XSS |
| Auth & Security | Teilweise | 6/10 | Service Role Key, CORS |

---

## KRITISCHE ISSUES (Sofort beheben)

### 1. Service Role Key Exposure
**Datei:** `/app/api/forms/submit/route.ts`
**Problem:** Service Role Key wird in Public Endpoint verwendet
**Risiko:** Kompletter Datenbank-Zugriff bei Kompromittierung
**Lösung:**
```typescript
// Ersetzen:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Nicht Service Role!
)
```

### 2. Form Submission Spam/DoS
**Datei:** `/app/api/forms/submit/route.ts`
**Problem:** Keine Validierung, Rate-Limiting oder Schema-Check
**Lösung:**
- Rate-Limiting pro IP (10 Requests/Minute)
- Validierung dass form_id zur Site gehört
- Schema-Validierung mit Zod

### 3. XSS in HTML Rendering
**Dateien:** `/lib/ai/html-operations.ts`, `LivePreview.tsx`
**Problem:** AI-generiertes HTML wird nicht sanitiert
**Lösung:**
```bash
npm install isomorphic-dompurify
```
```typescript
import DOMPurify from 'isomorphic-dompurify'
const safeHtml = DOMPurify.sanitize(aiGeneratedHtml)
```

### 4. Memory Leak in LivePreview
**Datei:** `/components/editor/preview/LivePreview.tsx`
**Problem:** Event-Listener werden nicht entfernt bei Re-Render
**Lösung:** useEffect Cleanup mit removeEventListener

---

## HOHE PRIORITÄT (Diese Woche)

### 5. N+1 Queries im WordPress Push
**Datei:** `/app/api/v1/sites/[siteId]/wordpress/push/route.ts`
**Problem:** 3+ separate Queries für Header/Footer
**Lösung:** Single JOIN Query

### 6. N+1 Queries in Entries
**Datei:** `/lib/supabase/queries/entries.ts`
**Problem:** Entry-Terms werden in separaten Queries geladen
**Impact:** 20 Entries = 42 Queries
**Lösung:** Supabase Select-Joins nutzen

### 7. Scheduled Posts Auto-Publish
**Problem:** `status: 'scheduled'` wird nie automatisch published
**Lösung:**
- Supabase Edge Function als Cron-Job
- Oder: Vercel Cron Route

### 8. CORS Konfiguration
**Problem:** Keine CORS-Whitelist konfiguriert
**Lösung:** next.config.ts + Middleware

### 9. Webhook Secret Validation
**Datei:** `/app/api/v1/sites/[siteId]/wordpress/register/route.ts`
**Problem:** Secret wird ohne HMAC-Verifikation akzeptiert
**Lösung:** Challenge-Response Pattern

### 10. Rate Limiting für Push Endpoints
**Problem:** Keine Rate-Limits auf WordPress Push
**Lösung:** Max 10 Pushes/Minute pro Organization

---

## MITTLERE PRIORITÄT (Nächste 2 Wochen)

### 11. Global Component Sanitization Bug
**Datei:** `/components/editor/chat/ChatPanel.tsx`
**Problem:** Header/Footer Extraction kann Content zerstören
**Zeile:** 619

### 12. Element Selector Reliability
**Datei:** `LivePreview.tsx`
**Problem:** nth-of-type Selector bricht bei DOM-Changes

### 13. Race Condition Taxonomy-Linking
**Datei:** `/lib/supabase/queries/taxonomies.ts`
**Problem:** Array-Update zwischen GET/SET unsicher
**Lösung:** PostgreSQL Array-Funktionen nutzen

### 14. Password Reset Flow
**Problem:** Keine eigene Reset-Seite
**Lösung:** `/app/(auth)/reset-password/page.tsx` implementieren

### 15. Audit Logging Erweitern
**Problem:** Keine Logs für API-Zugriffe, Security Events
**Lösung:** Activity Log für alle sensitiven Operationen

---

## NIEDRIGE PRIORITÄT (Nächster Monat)

### 16. LivePreview Refactoring
**Problem:** 1491 Zeilen in einer Datei
**Lösung:** Aufteilen in:
- SelectionOverlay.tsx
- DragDropHandler.tsx
- PreviewFrame.tsx

### 17. Editor Store Split
**Problem:** 1257 Zeilen in editor-store.ts
**Lösung:** Feature-Slices: ai-slice, html-slice, ui-slice

### 18. Full-Text Search für CMS
**Problem:** Nur ILIKE Suche
**Lösung:** PostgreSQL tsvector Implementierung

### 19. Version History
**Problem:** Keine Änderungshistorie für Pages
**Lösung:** page_versions Tabelle + Snapshots

### 20. Bulk Operations UI
**Problem:** Kein Multi-Select für Entries
**Lösung:** Batch Status-Changes, Bulk Delete

---

## FEATURE-ERWEITERUNGEN (Backlog)

### Sofort Sinnvoll:
1. **Undo/Redo für Seiten** (nicht nur Content)
2. **Preview vor WordPress Push**
3. **Component Search** in Library
4. **CSS Editor Mode** (nicht nur Tailwind)
5. **Image Optimization** beim Upload

### Mittelfristig:
6. **Responsive Testing** mit Device Emulation
7. **Duplicate Page** Funktion
8. **Page Templates** als Vorlagen
9. **Keyboard Shortcuts Dokumentation** im UI
10. **Mobile Editor Mode**

### Langfristig:
11. **Live Collaboration**
12. **Component Versioning**
13. **AI Regenerate Option**
14. **Export als Figma/XD**
15. **Webhook Payload Encryption**

---

## PERFORMANCE OPTIMIERUNGEN

### Datenbank:
```sql
-- Fehlende Indizes
CREATE INDEX idx_entries_slug ON entries(site_id, slug);
CREATE INDEX idx_entry_terms_entry_term ON entry_terms(entry_id, term_id);
```

### Frontend:
1. **DOMParser Web Worker** für große HTML
2. **Debouncing** auf Selection Events
3. **Memoization** für Heavy Components
4. **Lazy Loading** für Component Library

### API:
1. **Redis-basiertes Rate Limiting** statt DB
2. **Response Caching** für statische Daten
3. **Pagination** für alle Listen-Endpoints

---

## SICHERHEITS-CHECKLISTE

- [ ] Service Role Key aus Public APIs entfernen
- [ ] HTML Sanitization implementieren
- [ ] CORS Whitelist konfigurieren
- [ ] Form Validation mit Zod
- [ ] Rate Limiting auf alle Public Endpoints
- [ ] Webhook HMAC Verification
- [ ] Share Link Tokens verlängern (32+ Bytes)
- [ ] Password Reset Flow implementieren
- [ ] Audit Logging für Security Events
- [ ] npm audit regelmäßig ausführen

---

## EMPFOHLENE DEPENDENCIES

```bash
# Security
npm install zod                    # Input Validation
npm install isomorphic-dompurify   # XSS Protection
npm install bcryptjs               # Password Hashing

# Performance
npm install ioredis                # Redis für Rate Limiting
npm install lru-cache              # Response Caching

# Testing
npm install vitest                 # Unit Tests
npm install @testing-library/react # Component Tests
```

---

## TIMELINE VORSCHLAG

### Woche 1: Kritische Security Fixes
- Service Role Key entfernen
- Form Validation
- HTML Sanitization
- Memory Leak Fix

### Woche 2: Performance & Stability
- N+1 Queries fixen
- CORS konfigurieren
- Webhook Security
- Rate Limiting

### Woche 3: Features & Polish
- Scheduled Posts
- Password Reset
- Audit Logging
- LivePreview Refactor beginnen

### Woche 4+: Backlog
- Feature-Erweiterungen nach Priorität
- Performance Optimierungen
- Testing Suite aufbauen

---

## METRIKEN ZUM TRACKEN

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| API Response Time | ~500ms | <200ms |
| Editor Load Time | ~800ms | <500ms |
| N+1 Query Count | 42 bei 20 Entries | 3 |
| Security Score | 6/10 | 9/10 |
| Test Coverage | 0% | 60% |

---

## NÄCHSTE SCHRITTE

1. **Sofort:** Security Issues #1-4 beheben
2. **Diese Woche:** Issues #5-10 bearbeiten
3. **Dokumentieren:** Alle Fixes im CHANGELOG
4. **Testen:** Manueller Test aller betroffenen Flows
5. **Deploy:** Staged Rollout mit Monitoring

---

*Dieser Plan basiert auf einer automatisierten Codebase-Analyse und sollte regelmäßig aktualisiert werden.*
