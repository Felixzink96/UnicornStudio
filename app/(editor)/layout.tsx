import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ThemeProvider } from 'next-themes'

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if this is a WordPress token request (set by middleware)
  const headersList = await headers()
  const isWpTokenBypass = headersList.get('x-wp-token-bypass') === 'true'

  // Skip auth check for WordPress iframe requests
  if (!isWpTokenBypass) {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
