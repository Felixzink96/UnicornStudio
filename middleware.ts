import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Only match routes that actually need auth checking:
     * - /dashboard/* (protected)
     * - /sites/* (protected)
     * - /editor/* (protected)
     * - /settings/* (protected)
     * - /login (auth redirect)
     * - /signup (auth redirect)
     *
     * Skip everything else (API routes, static files, public pages)
     */
    '/dashboard/:path*',
    '/sites/:path*',
    '/editor/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
}
