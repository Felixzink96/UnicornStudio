import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// Routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/sites', '/editor', '/settings']
// Auth pages where logged-in users should be redirected
const AUTH_PATHS = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams

  // Check if this route needs auth checking at all
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path))
  const isAuthPath = AUTH_PATHS.some(path => pathname === path)

  // FAST PATH: If route doesn't need auth, skip the expensive getUser() call
  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next({ request })
  }

  // WORDPRESS TOKEN: Allow editor requests with wpToken to pass through
  // The token will be validated in the page component
  if (pathname.startsWith('/editor') && searchParams.has('wpToken')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only call getUser() when we actually need to check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedPath && !user) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPath && user) {
    // Redirect logged-in users away from auth pages
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
