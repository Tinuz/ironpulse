/**
 * CSRF Protection
 * 
 * Implements CSRF token generation and validation to prevent
 * Cross-Site Request Forgery attacks.
 * 
 * Uses the Double Submit Cookie pattern:
 * 1. Generate random CSRF token
 * 2. Store in httpOnly cookie
 * 3. Client must send token in X-CSRF-Token header
 * 4. Server validates cookie matches header
 * 
 * Note: For Edge Runtime, we use crypto.randomUUID() instead of Node crypto
 */

import { NextRequest, NextResponse } from 'next/server'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  // Use Web Crypto API (available in Edge Runtime)
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF token in httpOnly cookie
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  })
  
  return response
}

/**
 * Get CSRF token from request cookie
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || null
}

/**
 * Validate CSRF token
 * Compares the token from cookie with token from header
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request)
  const headerToken = getCsrfTokenFromHeader(request)
  
  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by always comparing all characters
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Should be used on POST, PUT, DELETE, PATCH requests
 */
export function requireCsrfToken(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase()
  
  // Only validate on state-changing operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null // Continue
  }
  
  // Validate CSRF token
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { error: 'Invalid or missing CSRF token' },
      { status: 403 }
    )
  }
  
  return null // Token valid, continue
}

/**
 * Create a response with a new CSRF token
 */
export function createCsrfTokenResponse(data: any = {}): NextResponse {
  const token = generateCsrfToken()
  const response = NextResponse.json({
    ...data,
    csrfToken: token // Send token to client so it can be included in headers
  })
  
  return setCsrfCookie(response, token)
}

/**
 * Refresh CSRF token in existing response
 */
export function refreshCsrfToken(response: NextResponse): NextResponse {
  const token = generateCsrfToken()
  return setCsrfCookie(response, token)
}

/**
 * Helper to check if CSRF protection should be enforced
 * Can be disabled in development or for specific endpoints
 */
export function shouldEnforceCsrf(): boolean {
  // Always enforce in production
  if (process.env.NODE_ENV === 'production') {
    return true
  }
  
  // In development, check env var
  return process.env.ENFORCE_CSRF === 'true'
}
