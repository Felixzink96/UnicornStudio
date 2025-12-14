'use client'

import * as React from 'react'

interface StyledPreviewProps {
  html: string
  css?: string
  height?: number
  className?: string
}

/**
 * Styled Preview Component
 *
 * Zeigt HTML-Content in einem isolierten iframe mit Tailwind CSS.
 * Wird verwendet für Header/Footer Previews im Setup-Modal.
 */
export function StyledPreview({
  html,
  css = '',
  height = 200,
  className = ''
}: StyledPreviewProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const srcDoc = React.useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: white;
    }
    /* Custom CSS von der Seite */
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>
`, [html, css])

  return (
    <div className={`relative overflow-hidden rounded-lg border bg-white ${className}`}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full"
        style={{ height }}
        sandbox="allow-scripts"
        title="Preview"
      />
    </div>
  )
}

export default StyledPreview
