/**
 * CSRF Token API Endpoint
 * 
 * Generates and returns a CSRF token for the client to use
 * in subsequent requests. Token is also set as httpOnly cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCsrfTokenResponse } from '@/lib/csrf'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

export async function GET(_request: NextRequest) {
  try {
    logger.debug('CSRF token requested')
    
    return createCsrfTokenResponse({
      message: 'CSRF token generated'
    })
  } catch (error) {
    logger.error('Error generating CSRF token', error)
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}
