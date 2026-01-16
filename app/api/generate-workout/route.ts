import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit'
import { requireCsrfToken, shouldEnforceCsrf } from '@/lib/csrf'
import { logger, generateRequestId } from '@/lib/logger'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-3.5-sonnet'

export const runtime = 'edge'

// Request validation schema
const WorkoutGeneratorSchema = z.object({
  prompt: z.string().min(50, 'Prompt too short').max(10000, 'Prompt too long')
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  let userId: string | undefined

  try {
    // CSRF Protection
    if (shouldEnforceCsrf()) {
      const csrfError = requireCsrfToken(request)
      if (csrfError) {
        logger.warn('CSRF token validation failed', { requestId, endpoint: '/api/generate-workout' })
        return csrfError
      }
    }

    // Authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.authLog('auth_failure', undefined, { requestId, endpoint: '/api/generate-workout' })
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      logger.authLog('auth_failure', undefined, { requestId, endpoint: '/api/generate-workout', error: authError?.message })
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      )
    }

    userId = user.id

    // Rate limiting (same as AI chat)
    const identifier = getClientIdentifier(request, user.id)
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.AI_CHAT)
    
    if (!rateLimit.success) {
      logger.rateLimitLog(user.id, '/api/generate-workout', RATE_LIMITS.AI_CHAT.limit)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString()
          }
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = WorkoutGeneratorSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.format()
        },
        { status: 400 }
      )
    }

    const { prompt } = validation.data
    const temperature = 0.7
    const maxTokens = 4000

    // Call OpenRouter API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // 45s timeout

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'IronPulse Fitness Tracker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json(
        { error: 'Failed to generate workout program' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      )
    }

    logger.apiLog({
      requestId,
      userId,
      endpoint: '/api/generate-workout',
      method: 'POST',
      statusCode: 200,
      duration: Date.now() - startTime
    })

    return NextResponse.json(
      { content },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString()
        }
      }
    )
  } catch (error) {
    logger.error('Error in workout generator', error, {
      requestId,
      userId,
      endpoint: '/api/generate-workout'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
