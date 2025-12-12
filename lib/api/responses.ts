/**
 * Standard API Response Format
 */
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    total?: number
    page?: number
    per_page?: number
    total_pages?: number
    has_more?: boolean
  }
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  meta?: APIResponse<T>['meta'],
  status: number = 200
): Response {
  const response: APIResponse<T> = {
    success: true,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): Response {
  const response: APIResponse = {
    success: false,
    error: {
      code,
      message,
    },
  }

  if (details) {
    response.error!.details = details
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(message?: string): Response {
  return errorResponse(
    'UNAUTHORIZED',
    message || 'Invalid or missing API key',
    401
  )
}

/**
 * Forbidden response (403)
 */
export function forbiddenResponse(message?: string): Response {
  return errorResponse(
    'FORBIDDEN',
    message || 'You do not have permission for this action',
    403
  )
}

/**
 * Not found response (404)
 */
export function notFoundResponse(resource: string = 'Resource'): Response {
  return errorResponse(
    'NOT_FOUND',
    `${resource} not found`,
    404
  )
}

/**
 * Validation error response (400)
 */
export function validationErrorResponse(
  message: string,
  details?: Record<string, string[]>
): Response {
  return errorResponse('VALIDATION_ERROR', message, 400, details)
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(message: string, details?: unknown): Response {
  return errorResponse('BAD_REQUEST', message, 400, details)
}

/**
 * Rate limit exceeded response (429)
 */
export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please wait before making more requests.',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Retry-After': '60',
      },
    }
  )
}

/**
 * Server error response (500)
 */
export function serverErrorResponse(
  message: string = 'An internal server error occurred',
  details?: unknown
): Response {
  // In production, don't expose error details
  const isProduction = process.env.NODE_ENV === 'production'

  return errorResponse(
    'INTERNAL_ERROR',
    message,
    500,
    isProduction ? undefined : details
  )
}

/**
 * Method not allowed response (405)
 */
export function methodNotAllowedResponse(allowed: string[]): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method not allowed. Allowed methods: ${allowed.join(', ')}`,
      },
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': allowed.join(', '),
      },
    }
  )
}

/**
 * No content response (204)
 */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 })
}

/**
 * Created response (201)
 */
export function createdResponse<T>(data: T): Response {
  return successResponse(data, undefined, 201)
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  perPage: number
): APIResponse['meta'] {
  const totalPages = Math.ceil(total / perPage)

  return {
    total,
    page,
    per_page: perPage,
    total_pages: totalPages,
    has_more: page < totalPages,
  }
}

/**
 * Parse pagination params from URL
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): { page: number; perPage: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)))

  return { page, perPage }
}
