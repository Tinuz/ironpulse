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
const AccessorySuggestionsSchema = z.object({
  prompt: z.string().min(20, 'Prompt too short - need workout analysis').max(5000, 'Prompt too long')
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
        logger.warn('CSRF token validation failed', { requestId, endpoint: '/api/accessory-suggestions' })
        return csrfError
      }
    }

    // Authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.authLog('auth_failure', undefined, { requestId, endpoint: '/api/accessory-suggestions' })
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      logger.authLog('auth_failure', undefined, { requestId, endpoint: '/api/accessory-suggestions', error: authError?.message })
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      )
    }

    userId = user.id

    // Rate limiting
    const identifier = getClientIdentifier(request, user.id)
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.AI_CHAT)
    
    if (!rateLimit.success) {
      logger.rateLimitLog(user.id, '/api/accessory-suggestions', RATE_LIMITS.AI_CHAT.limit)
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
    const validation = AccessorySuggestionsSchema.safeParse(body)
    
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

    // Call OpenRouter API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

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
            role: 'system',
            content: `You are a fitness expert. Analyze the user's training data and provide accessory exercise suggestions as a JSON array. 

CRITICAL: Your response must be ONLY a valid JSON array with no additional text, explanations, or markdown formatting.

Each suggestion must have this exact structure:
{
  "exercise": "Exercise Name",
  "reason": "Why this helps",
  "category": "strength" | "hypertrophy" | "mobility" | "injury-prevention",
  "priority": "high" | "medium" | "low",
  "targetMuscles": ["Muscle1", "Muscle2"],
  "sets": 3,
  "reps": 12
}

Provide 3-5 suggestions based on the analysis.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json(
        { error: 'Failed to get AI suggestions' },
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

    // Parse and validate JSON response
    let suggestions
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      // Remove trailing commas before closing brackets
      const fixedJson = cleanContent.replace(/,(\s*[}\]])/g, '$1')
      
      suggestions = JSON.parse(fixedJson)
      
      // Validate it's an array
      if (!Array.isArray(suggestions)) {
        suggestions = suggestions.suggestions || []
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw content:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    logger.apiLog({
      requestId,
      userId,
      endpoint: '/api/accessory-suggestions',
      method: 'POST',
      statusCode: 200,
      duration: Date.now() - startTime
    })

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString()
        }
      }
    )
  } catch (error) {
    logger.error('Error in accessory suggestions', error, {
      requestId,
      userId,
      endpoint: '/api/accessory-suggestions'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
