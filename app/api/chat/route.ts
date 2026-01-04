import { NextRequest, NextResponse } from 'next/server'
import { getCoachProfile } from '@/components/utils/coachProfiles'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { messages, userData, coachProfile } = await request.json()

    // Get the coach profile configuration
    const profile = getCoachProfile(coachProfile || 'motiverend')
    
    const systemPrompt = `${profile.systemPrompt}

GEBRUIKERSDATA:
${userData}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'IronPulse Fitness Tracker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-2-1212',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const aiMessage = data.choices[0]?.message?.content || 'Sorry, ik kon geen antwoord genereren.'

    return NextResponse.json({ message: aiMessage })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
