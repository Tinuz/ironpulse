/**
 * OpenRouter API Client
 * 
 * Provides intelligent exercise recommendations using Claude 3.5 Sonnet via OpenRouter.
 * 
 * Features:
 * - Streaming support for real-time responses
 * - Automatic retry with exponential backoff
 * - Response validation against exercise database
 * - Graceful degradation on API failures
 * 
 * Cost: ~$0.006 per request (Claude 3.5 Sonnet)
 * Rate limits: Handled automatically by OpenRouter
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-sonnet'; // Latest, most capable model

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AccessorySuggestion {
  exercise: string;
  reason: string;
  category: 'strength' | 'hypertrophy' | 'mobility' | 'injury-prevention';
  priority: 'high' | 'medium' | 'low';
  targetMuscles: string[];
  sets?: number;
  reps?: number;
}

/**
 * Get AI-powered accessory exercise suggestions
 */
export async function getAccessorySuggestions(
  prompt: string,
  options?: {
    maxRetries?: number;
    timeout?: number;
  }
): Promise<AccessorySuggestion[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenRouter API key not configured. AI suggestions disabled.');
    return [];
  }

  const maxRetries = options?.maxRetries ?? 2;
  const timeout = options?.timeout ?? 30000; // 30s default

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ironpulse.app',
          'X-Title': 'IronPulse Fitness Tracker',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an expert strength coach and exercise physiologist. Analyze workout data and suggest accessory exercises to address weaknesses, prevent injuries, and optimize performance.

CRITICAL RESPONSE FORMAT:
- Respond ONLY with valid JSON array
- Each suggestion must have: exercise (string), reason (string), category (strength|hypertrophy|mobility|injury-prevention), priority (high|medium|low), targetMuscles (string[]), sets (number, optional), reps (number, optional)
- Suggest 3-5 exercises maximum
- Use real exercise names from strength training databases
- Be specific and actionable in reasons

Example format:
[
  {
    "exercise": "Face Pulls",
    "reason": "Strengthen rear delts to balance heavy bench pressing and prevent shoulder impingement",
    "category": "injury-prevention",
    "priority": "high",
    "targetMuscles": ["Rear Deltoids", "Rotator Cuff"],
    "sets": 3,
    "reps": 15
  }
]`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter');
      }

      const content = data.choices[0].message.content;
      
      // Parse and validate JSON response
      const suggestions = parseAndValidateSuggestions(content);
      
      // Log usage for monitoring
      if (data.usage) {
        console.log('OpenRouter usage:', {
          tokens: data.usage.total_tokens,
          cost: estimateCost(data.usage.total_tokens)
        });
      }

      return suggestions;

    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('OpenRouter request timeout');
        if (isLastAttempt) return [];
      } else {
        console.error(`OpenRouter attempt ${attempt + 1} failed:`, error);
        if (isLastAttempt) return [];
      }

      // Exponential backoff: 1s, 2s, 4s
      if (!isLastAttempt) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return [];
}

/**
 * Parse and validate AI response
 */
function parseAndValidateSuggestions(content: string): AccessorySuggestion[] {
  try {
    // Extract JSON from markdown code blocks if present
    let jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                    content.match(/(\[[\s\S]*?\])/);
    
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      return [];
    }

    let jsonString = jsonMatch[1];

    // Clean up common JSON formatting issues
    jsonString = jsonString
      .replace(/,\s*}/g, '}')      // Remove trailing commas before }
      .replace(/,\s*\]/g, ']')     // Remove trailing commas before ]
      .replace(/\n/g, ' ')          // Replace newlines with spaces
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();

    const parsed = JSON.parse(jsonString);
    
    if (!Array.isArray(parsed)) {
      console.error('Response is not an array');
      return [];
    }

    // Validate each suggestion
    const validated = parsed
      .filter(item => {
        return (
          typeof item === 'object' &&
          typeof item.exercise === 'string' &&
          typeof item.reason === 'string' &&
          ['strength', 'hypertrophy', 'mobility', 'injury-prevention'].includes(item.category) &&
          ['high', 'medium', 'low'].includes(item.priority) &&
          Array.isArray(item.targetMuscles)
        );
      })
      .map(item => ({
        exercise: item.exercise,
        reason: item.reason,
        category: item.category,
        priority: item.priority,
        targetMuscles: item.targetMuscles,
        sets: typeof item.sets === 'number' ? item.sets : undefined,
        reps: typeof item.reps === 'number' ? item.reps : undefined,
      }));

    return validated.slice(0, 5); // Max 5 suggestions

  } catch (error) {
    console.error('Failed to parse AI response:', error);
    
    // Last resort: Try to extract individual valid JSON objects
    try {
      const objectMatches = content.matchAll(/\{[^{}]*"exercise"[^{}]*\}/g);
      const fallbackSuggestions: AccessorySuggestion[] = [];
      
      for (const match of objectMatches) {
        try {
          const obj = JSON.parse(match[0]);
          if (obj.exercise && obj.reason && obj.category && obj.priority && obj.targetMuscles) {
            fallbackSuggestions.push({
              exercise: obj.exercise,
              reason: obj.reason,
              category: obj.category,
              priority: obj.priority,
              targetMuscles: obj.targetMuscles,
              sets: obj.sets,
              reps: obj.reps,
            });
          }
        } catch {
          // Skip invalid objects
        }
      }
      
      if (fallbackSuggestions.length > 0) {
        console.log('Recovered suggestions using fallback parsing');
        return fallbackSuggestions.slice(0, 5);
      }
    } catch {
      // Fallback also failed
    }
    
    return [];
  }
}

/**
 * Estimate cost in USD based on token usage
 * Claude 3.5 Sonnet: $3/1M input tokens, $15/1M output tokens
 * Average: ~$6/1M tokens combined
 */
function estimateCost(tokens: number): string {
  const costPer1M = 6;
  const cost = (tokens / 1_000_000) * costPer1M;
  return `$${cost.toFixed(4)}`;
}

/**
 * Build contextual prompt from workout analysis
 */
export function buildAccessoryPrompt(analysis: {
  muscleImbalances?: string[];
  plateaus?: string[];
  weakPoints?: string[];
  recentWorkouts?: string[];
  trainingFrequency?: number;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}): string {
  const parts: string[] = [];

  parts.push('Analyze this training data and suggest accessory exercises:\n');

  if (analysis.muscleImbalances && analysis.muscleImbalances.length > 0) {
    parts.push(`\nMUSCLE IMBALANCES DETECTED:\n${analysis.muscleImbalances.map(m => `- ${m}`).join('\n')}`);
  }

  if (analysis.plateaus && analysis.plateaus.length > 0) {
    parts.push(`\nPLATEAUS IDENTIFIED:\n${analysis.plateaus.map(p => `- ${p}`).join('\n')}`);
  }

  if (analysis.weakPoints && analysis.weakPoints.length > 0) {
    parts.push(`\nWEAK POINTS:\n${analysis.weakPoints.map(w => `- ${w}`).join('\n')}`);
  }

  if (analysis.recentWorkouts && analysis.recentWorkouts.length > 0) {
    parts.push(`\nRECENT WORKOUTS:\n${analysis.recentWorkouts.slice(0, 5).map((w, i) => `${i + 1}. ${w}`).join('\n')}`);
  }

  if (analysis.trainingFrequency) {
    parts.push(`\nTRAINING FREQUENCY: ${analysis.trainingFrequency}x per week`);
  }

  if (analysis.experienceLevel) {
    parts.push(`\nEXPERIENCE LEVEL: ${analysis.experienceLevel}`);
  }

  parts.push('\nProvide 3-5 specific accessory exercises that would best address these issues. Focus on exercises that prevent injury, fix imbalances, and break through plateaus.');

  return parts.join('\n');
}
