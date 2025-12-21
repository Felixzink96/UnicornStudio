import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' })

export async function POST(request: Request) {
  try {
    const { prompt, elementHtml, fullHtml } = await request.json()

    if (!prompt || !elementHtml || !fullHtml) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const systemPrompt = `Du bist ein HTML/CSS-Experte. Der Benutzer möchte ein Element auf seiner Website ändern.

WICHTIG:
- Ändere NUR das angegebene Element
- Behalte die Tailwind CSS Klassen bei, modifiziere sie nach Bedarf
- Gib das komplette HTML der Seite zurück mit dem geänderten Element
- Keine Erklärungen, nur den HTML-Code

Aktuelles Element:
\`\`\`html
${elementHtml}
\`\`\`

Komplette Seite:
\`\`\`html
${fullHtml}
\`\`\`

Benutzer-Anfrage: ${prompt}

Gib das komplette HTML der Seite zurück mit dem modifizierten Element:`

    const result = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: systemPrompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 4096,
        },
      },
    })

    let text = result.text || ''

    // Extract HTML from response
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/)
    if (htmlMatch) {
      text = htmlMatch[1].trim()
    } else if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      // Clean up if it's raw HTML
      text = text.trim()
    }

    return NextResponse.json({ modifiedHtml: text })
  } catch (error) {
    console.error('Error modifying element:', error)
    return NextResponse.json({ error: 'Failed to modify element' }, { status: 500 })
  }
}
