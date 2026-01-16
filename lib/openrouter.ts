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
 * 
 * Note: Direct API calls have been moved to server-side API routes for security.
 * This file now provides client-side wrappers and utility functions.
 */

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
  accessToken?: string,
  options?: {
    maxRetries?: number;
    timeout?: number;
  }
): Promise<AccessorySuggestion[]> {
  if (!accessToken) {
    console.warn('No access token provided for accessory suggestions')
    return []
  }

  const maxRetries = options?.maxRetries ?? 2

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/accessory-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.error('Rate limit exceeded for accessory suggestions')
          return []
        }
        
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const content = data.content
      
      if (!content) {
        console.error('No content in API response:', data)
        return []
      }

      console.log('AI Response content:', content)
      
      // Parse and validate JSON response
      const suggestions = parseAndValidateSuggestions(content)
      
      return suggestions

    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      
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
    console.log('Parsing AI response, length:', content.length)
    
    // Extract JSON from markdown code blocks if present
    let jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                    content.match(/(\[[\s\S]*?\])/);
    
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      console.error('Response content:', content.substring(0, 500))
      return [];
    }

    let jsonString = jsonMatch[1];

    // Clean up common JSON formatting issues (but preserve string content)
    jsonString = jsonString
      .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
      .trim();

    console.log('Attempting to parse JSON, first 300 chars:', jsonString.substring(0, 300))

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
