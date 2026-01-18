import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'
import { logger, generateRequestId } from '@/lib/logger'
import { requireCsrfToken, shouldEnforceCsrf } from '@/lib/csrf'
import type { ChatResponse } from '@/types/api'

export const runtime = 'edge'

// Request validation schema
const SupplementsCoachRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000)
  })).min(1).max(50),
  // Pre-formatted context with supplements, user profile, training data
  supplementsContext: z.string().max(50000).optional()
})

const SUPPLEMENTS_COACH_SYSTEM_PROMPT = `You are an AI Nutritional Supplements Coach specializing in strength sports, fitness, bodybuilding, and CrossFit. Your primary goal is to provide brutally honest, no-nonsense advice on supplement usage based on the user's inputs. Users will tell you what supplements they are currently using (including brands, dosages, and timing if provided), what specific sport or training style they engage in (e.g., powerlifting, hypertrophy-focused bodybuilding, high-intensity CrossFit WODs, or general fitness routines), their goals (e.g., muscle gain, fat loss, performance enhancement, recovery), and any relevant personal details like age, gender, experience level, diet overview, or health conditions.

Key principles for your responses:
- **Brutal Honesty**: Be direct and unfiltered. If a supplement stack is ineffective, overhyped, dangerous, or a waste of money, say so bluntly without sugarcoating. Call out common myths, bro-science, or marketing BS in the supplement industry.
- **Evidence-Based**: Base all advice on scientific research, studies, and established guidelines from sources like ISSN (International Society of Sports Nutrition), NIH, or reputable journals. Avoid pseudoscience or unproven claims.
- **Personalization**: Analyze the user's supplement intake in the context of their sport and goals. If their usage is suboptimal (e.g., wrong dosage, poor timing, unnecessary supplements, interactions, or over-reliance), explain why it's wrong and provide specific recommendations to fix it.
- **Recommendations**: Suggest alternatives, adjustments, or additions only if needed. Prioritize whole-food nutrition over supplements—remind users that supplements are "supplements," not magic pills. Include safe dosage ranges, timing (e.g., pre/post-workout), potential side effects, and when to consult a doctor.
- **Safety First**: Always warn about risks, especially for high-risk groups (e.g., beginners, those with medical issues). Discourage illegal or banned substances (e.g., steroids, SARMs) and direct users to legal, tested options. If something seems unsafe, insist on professional medical advice.
- **Engagement**: Ask clarifying questions if details are missing (e.g., "What's your daily protein intake from food?" or "Any allergies or medications?"). Keep responses concise, actionable, and motivational, but tough-love style.
- **Structure Responses**: Start with a summary of their current setup, give your honest critique, then provide optimized recommendations. End with next steps or follow-up questions.

Examples of tone:
- If a user is overdosing on caffeine: "Dude, 600mg of caffeine pre-workout? That's a recipe for jitters, insomnia, and heart strain. Cut it to 200-300mg max and cycle off every few weeks."
- If supplements are pointless: "Whey protein is fine, but if you're not in a calorie surplus and training hard, it's just expensive milk. Focus on real food first."

Remember, you're a coach, not a doctor—always disclaimer that this isn't medical advice and users should consult professionals for personalized health plans. Stay focused on supplements; if the query veers off, redirect back to nutrition and supps.`

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  let userId: string | undefined
  
  try {
    // CSRF Protection
    if (shouldEnforceCsrf()) {
      const csrfError = requireCsrfToken(request)
      if (csrfError) {
        logger.warn('CSRF token validation failed', { requestId, endpoint: '/api/supplements-coach' })
        return csrfError
      }
    }

    // Authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.authLog('auth_failure', undefined, { requestId, endpoint: '/api/supplements-coach' })
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      logger.authLog('auth_failure', undefined, { requestId, endpoint: '/api/supplements-coach', error: authError?.message })
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
      logger.rateLimitLog(user.id, '/api/supplements-coach', RATE_LIMITS.AI_CHAT.limit)
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
    const validation = SupplementsCoachRequestSchema.safeParse(body)
    
    if (!validation.success) {
      logger.warn('Supplements coach request validation failed', { 
        requestId, 
        userId,
        errors: validation.error.format() 
      })
      
      return NextResponse.json(
        { error: 'Invalid request: Please check your message format' },
        { status: 400 }
      )
    }

    const { messages, supplementsContext } = validation.data

    // Build messages array with system prompt and context
    const apiMessages = [
      {
        role: 'system' as const,
        content: SUPPLEMENTS_COACH_SYSTEM_PROMPT
      },
      ...(supplementsContext ? [{
        role: 'system' as const,
        content: `USER CONTEXT:\n${supplementsContext}\n\nUse this context to personalize your advice. If the user hasn't provided enough information, ask specific questions.`
      }] : []),
      ...messages
    ]

    // Call OpenRouter API
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      logger.error('OpenRouter API key not configured', { requestId })
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    logger.info('Calling OpenRouter API for supplements coach', { requestId, userId })

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://ironpulse.app',
        'X-Title': 'IronPulse - Supplements Coach'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-2-1212',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9
      })
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      logger.error('OpenRouter API error', {
        requestId,
        userId,
        status: openRouterResponse.status,
        error: errorText
      })

      return NextResponse.json(
        { 
          error: 'AI service unavailable. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? errorText : undefined
        },
        { status: openRouterResponse.status }
      )
    }

    const data = await openRouterResponse.json()
    const assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      logger.error('No response from AI model', { requestId, userId, response: data })
      return NextResponse.json(
        { error: 'No response from AI. Please try again.' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    logger.info('Supplements coach request completed', {
      requestId,
      userId,
      duration,
      messageLength: assistantMessage.length
    })

    const response: ChatResponse = {
      message: assistantMessage,
      model: data.model || 'x-ai/grok-2-1212',
      tokens: data.usage?.total_tokens
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Supplements coach endpoint error', {
      requestId,
      userId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { 
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Response-Time': `${duration}ms`
        }
      }
    )
  }
}
