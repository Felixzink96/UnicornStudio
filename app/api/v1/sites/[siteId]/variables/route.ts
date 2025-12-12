import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/variables
 * Get design variables (tokens) for a site
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Query design variables
    const supabase = createAPIClient()

    const { data: designVars, error } = await supabase
      .from('design_variables')
      .select('*')
      .eq('site_id', siteId)
      .single()

    if (error || !designVars) {
      // Return default values if no custom design variables exist
      return successResponse({
        id: null,
        colors: {
          brand: {
            primary: '#3b82f6',
            secondary: '#64748b',
            accent: '#f59e0b',
          },
          semantic: {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
          },
          neutral: {
            '50': '#f8fafc',
            '100': '#f1f5f9',
            '200': '#e2e8f0',
            '300': '#cbd5e1',
            '400': '#94a3b8',
            '500': '#64748b',
            '600': '#475569',
            '700': '#334155',
            '800': '#1e293b',
            '900': '#0f172a',
            '950': '#020617',
          },
        },
        typography: {
          fontHeading: 'Inter',
          fontBody: 'Inter',
          fontMono: 'JetBrains Mono',
          fontSizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            '5xl': '3rem',
          },
          fontWeights: {
            light: '300',
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
          },
          lineHeights: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.75',
          },
        },
        spacing: {
          scale: {
            xs: '0.25rem',
            sm: '0.5rem',
            md: '1rem',
            lg: '1.5rem',
            xl: '2rem',
            '2xl': '3rem',
            '3xl': '4rem',
          },
          containerWidths: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
          },
        },
        borders: {
          radius: {
            none: '0',
            sm: '0.125rem',
            md: '0.375rem',
            lg: '0.5rem',
            xl: '0.75rem',
            '2xl': '1rem',
            full: '9999px',
          },
          widths: {
            thin: '1px',
            medium: '2px',
            thick: '4px',
          },
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        },
      })
    }

    // 4. Format response
    const formattedVariables = {
      id: designVars.id,
      colors: designVars.colors,
      typography: designVars.typography,
      spacing: designVars.spacing,
      borders: designVars.borders,
      shadows: designVars.shadows,
      created_at: designVars.created_at,
      updated_at: designVars.updated_at,
    }

    return successResponse(formattedVariables)
  } catch (error) {
    console.error('Variables API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
