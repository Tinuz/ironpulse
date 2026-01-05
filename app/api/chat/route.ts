import { NextRequest, NextResponse } from 'next/server'
import { getCoachProfile } from '@/components/utils/coachProfiles'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { messages, userData, coachProfile } = await request.json()

    // Get the coach profile configuration
    const profile = getCoachProfile(coachProfile || 'motiverend')
    
    const systemPrompt = `${profile.systemPrompt}

Je hebt toegang tot uitgebreide gebruikersdata inclusief:
- 1RM progressies en trends per oefening
- Strength Score (som van grote lifts)
- Recente PRs (Personal Records)
- Plateau detectie (oefeningen zonder progressie)
- Volume statistieken per workout en per week
- Lichaamsmetingen en trends
- Voedingsinname vs. doelen (TDEE, macro's)
- Gebruikersprofiel (leeftijd, gewicht, lengte, activiteitsniveau)

Gebruik deze data om:
- Specifieke, data-gedreven adviezen te geven
- Plateaus te identificeren en oplossingen aan te dragen
- Workout schema's te genereren gebaseerd op frequentie en progressie
- Voedingsschema's voor te stellen op basis van TDEE en macro-doelen
- Trends te analyseren en te voorspellen
- Motivatie te geven op basis van recente achievements

Antwoord ALTIJD in het Nederlands. Wees beknopt maar informatief (max 3-4 alinea's).
Als je een workout of maaltijdplan maakt, gebruik dan een duidelijke structuur.

GEBRUIKERSDATA:
${userData}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'NEXT-REP Fitness Tracker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4.1-fast',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800,
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
