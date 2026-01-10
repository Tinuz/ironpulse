/**
 * AI Workout Generator
 * 
 * Generates personalized workout programs using Claude 3.5 Sonnet via OpenRouter.
 * Leverages exercisesv3.json database and user analytics for intelligent recommendations.
 */

import { EXERCISE_BY_NAME, EXERCISES_LIBRARY } from '@/lib/exerciseData'
import { WorkoutLog, UserProfile } from '@/components/context/DataContext'
import { calculateStrengthScore, getMostFrequentExercises } from '@/components/utils/strengthAnalytics'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-3.5-sonnet'

export interface WorkoutGenerationOptions {
  fitnessGoal: 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general_fitness'
  availableEquipment: string[]
  daysPerWeek: number
  timePerSession: number
  preferredSplit?: 'push_pull_legs' | 'upper_lower' | 'full_body' | 'arnold_split' | 'bro_split'
  targetMuscleGroups?: string[]
  additionalNotes?: string
  experienceLevelOverride?: 'beginner' | 'intermediate' | 'advanced'
}

export interface GeneratedExercise {
  name: string
  sets: number
  reps: string | number
  restSeconds: number
  notes?: string
  muscleGroup: string
  equipmentRequired: string
}

export interface GeneratedWorkout {
  name: string
  dayOfWeek: number
  estimatedDuration: number
  focus: string
  exercises: GeneratedExercise[]
}

export interface GeneratedWorkoutProgram {
  programName: string
  description: string
  weeklySchedule: string[]
  workouts: GeneratedWorkout[]
  progressionScheme: string
  notes?: string
}

/**
 * Generate a complete workout program using AI
 */
export async function generateWorkoutProgram(
  userProfile: UserProfile | undefined,
  workoutHistory: WorkoutLog[],
  options: WorkoutGenerationOptions
): Promise<GeneratedWorkoutProgram> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  // 1. Build comprehensive user context
  const userContext = buildUserAnalysis(userProfile, workoutHistory, options)
  
  // 2. Build AI prompt
  const prompt = buildWorkoutGenerationPrompt(userContext, options)
  
  // 3. Call OpenRouter API with retry logic
  const response = await callOpenRouterAPI(prompt, apiKey)
  
  // 4. Parse and validate response
  const program = parseAndValidateProgram(response, options.availableEquipment)
  
  // 5. Enrich with exercise data from exercisesv3.json
  const enrichedProgram = enrichProgramWithExerciseData(program)
  
  return enrichedProgram
}

/**
 * Analyze user data to build context for AI
 */
function buildUserAnalysis(
  userProfile: UserProfile | undefined,
  workoutHistory: WorkoutLog[],
  options: WorkoutGenerationOptions
) {
  const experienceLevel = options.experienceLevelOverride || determineExperienceLevel(workoutHistory)
  
  let analysis = {
    experienceLevel,
    totalWorkouts: workoutHistory.length,
    strengthScore: 0,
    frequentExercises: [] as string[],
    recentActivity: '',
    profileInfo: userProfile ? {
      age: userProfile.age,
      weight: userProfile.weight,
      height: userProfile.height,
      gender: userProfile.gender,
      activityLevel: userProfile.activityLevel
    } : null
  }
  
  // Add strength analytics if user has workout history
  if (workoutHistory.length > 0) {
    const strengthScore = calculateStrengthScore(workoutHistory)
    const frequentExercises = getMostFrequentExercises(workoutHistory, 8)
    
    analysis.strengthScore = Math.round(strengthScore.total)
    analysis.frequentExercises = frequentExercises
    analysis.recentActivity = `${workoutHistory.slice(0, 3).map(w => w.name).join(', ')}`
  }
  
  return analysis
}

/**
 * Determine experience level based on workout history
 */
function determineExperienceLevel(workoutHistory: WorkoutLog[]): 'beginner' | 'intermediate' | 'advanced' {
  const totalWorkouts = workoutHistory.length
  
  if (totalWorkouts < 20) return 'beginner'
  if (totalWorkouts < 100) return 'intermediate'
  return 'advanced'
}

/**
 * Build comprehensive prompt for Claude
 */
function buildWorkoutGenerationPrompt(
  userAnalysis: ReturnType<typeof buildUserAnalysis>,
  options: WorkoutGenerationOptions
): string {
  const { fitnessGoal, availableEquipment, daysPerWeek, timePerSession, preferredSplit, targetMuscleGroups, additionalNotes } = options
  
  // Map goal to description
  const goalDescriptions = {
    strength: 'maximale kracht en 1RM progressie',
    hypertrophy: 'spiergroei en volume',
    endurance: 'muscular endurance en uithoudingsvermogen',
    weight_loss: 'vetverbranding en calorie expenditure',
    general_fitness: 'algemene fitheid en gezondheid'
  }
  
  // Map split to description
  const splitDescriptions = {
    push_pull_legs: 'Push/Pull/Legs split (push dagen, pull dagen, been dagen)',
    upper_lower: 'Upper/Lower split (bovenbody dagen, onderbody dagen)',
    full_body: 'Full Body (hele lichaam elke training)',
    arnold_split: 'Arnold Split (chest/back, shoulders/arms, legs)',
    bro_split: 'Bro Split (1 muscle group per dag)'
  }

  return `Je bent een expert strength & conditioning coach. Maak een volledig gepersonaliseerd workout programma.

USER PROFIEL:
- Ervaring: ${userAnalysis.experienceLevel}
- Totaal workouts gedaan: ${userAnalysis.totalWorkouts}
${userAnalysis.strengthScore > 0 ? `- Strength Score: ${userAnalysis.strengthScore}kg` : ''}
${userAnalysis.frequentExercises.length > 0 ? `- Favoriete exercises: ${userAnalysis.frequentExercises.join(', ')}` : ''}
${userAnalysis.profileInfo ? `
- Leeftijd: ${userAnalysis.profileInfo.age || 'onbekend'}
- Gewicht: ${userAnalysis.profileInfo.weight || 'onbekend'}kg
- Geslacht: ${userAnalysis.profileInfo.gender || 'onbekend'}
- Activiteit niveau: ${userAnalysis.profileInfo.activityLevel || 'onbekend'}` : ''}

PROGRAMMA EISEN:
- Primair doel: ${goalDescriptions[fitnessGoal]}
- Schema: ${daysPerWeek} dagen per week
- Tijd per sessie: ${timePerSession} minuten
${preferredSplit ? `- Voorkeur split: ${splitDescriptions[preferredSplit]}` : ''}
${targetMuscleGroups && targetMuscleGroups.length > 0 ? `- Focus muscle groups: ${targetMuscleGroups.join(', ')}` : ''}
${additionalNotes ? `- Extra opmerkingen: ${additionalNotes}` : ''}

BESCHIKBARE APPARATUUR:
${availableEquipment.join(', ')}

EXERCISE DATABASE:
- 2,500+ geverifieerde exercises beschikbaar
- Alle muscle groups en equipment types
- Beginner tot advanced niveau

STRICTE REQUIREMENTS:
1. Gebruik ALLEEN equipment uit de lijst hierboven
2. Match het ${userAnalysis.experienceLevel} niveau (pas volume en intensiteit aan)
3. Creëer een ${daysPerWeek}-daags programma
4. Elke workout moet ongeveer ${timePerSession} minuten duren
5. Optimaliseer voor ${goalDescriptions[fitnessGoal]}
6. Balanceer muscle groups (voorkom imbalances)
7. Compound exercises vormen de basis (60-70%)
8. Zorg voor adequate recovery tussen muscle groups
9. Geef realistic sets × reps schemes
10. Include progressie strategie

RESPONSE FORMAT (STRICT JSON):
{
  "programName": "Duidelijke programma naam",
  "description": "Korte uitleg van het programma (2-3 zinnen)",
  "weeklySchedule": ["Dag 1: Workout naam", "Dag 2: Workout naam", "Dag 3: Rest", ...],
  "workouts": [
    {
      "name": "Workout naam (bijv. Upper Body Push)",
      "dayOfWeek": 1,
      "estimatedDuration": ${timePerSession},
      "focus": "Korte omschrijving van focus",
      "exercises": [
        {
          "name": "EXACTE exercise naam",
          "sets": 4,
          "reps": "8-10",
          "restSeconds": 120,
          "notes": "Waarom deze exercise (optional)",
          "muscleGroup": "chest/back/legs/shoulders/arms/abs",
          "equipmentRequired": "Barbell/Dumbbell/etc"
        }
      ]
    }
  ],
  "progressionScheme": "Duidelijke uitleg hoe te progresseren (bijv. 'Increase weight when you complete all sets with 2 reps in reserve')",
  "notes": "Extra tips voor succes (optional)"
}

BELANGRIJK:
- Gebruik exercise namen die bestaan in de database
- Geef realistic training volumes voor ${userAnalysis.experienceLevel} niveau
- Zorg dat total weekly volume niet te hoog is
- Include adequate warm-up exercises
- Varieer rep ranges volgens doel (strength: 3-6, hypertrophy: 8-12, endurance: 15+)

Generate nu het complete JSON programma:`
}

/**
 * Call OpenRouter API with retry logic
 */
async function callOpenRouterAPI(
  prompt: string,
  apiKey: string,
  maxRetries = 2
): Promise<string> {
  const timeout = 45000 // 45 seconds

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

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
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure')
      }

      // Log token usage for cost tracking
      if (data.usage) {
        console.log('🤖 AI Workout Generator - Token Usage:', {
          prompt: data.usage.prompt_tokens,
          completion: data.usage.completion_tokens,
          total: data.usage.total_tokens,
          estimatedCost: ((data.usage.prompt_tokens * 3 + data.usage.completion_tokens * 15) / 1000000).toFixed(4)
        })
      }

      return data.choices[0].message.content

    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate workout program after ${maxRetries + 1} attempts: ${error.message}`)
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  throw new Error('Failed to generate workout program')
}

/**
 * Parse and validate AI response
 */
function parseAndValidateProgram(
  responseText: string,
  availableEquipment: string[]
): GeneratedWorkoutProgram {
  // Extract JSON from response (AI might include extra text)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response')
  }

  let program: GeneratedWorkoutProgram
  try {
    program = JSON.parse(jsonMatch[0])
  } catch (error) {
    throw new Error('Failed to parse AI response as JSON')
  }

  // Validate required fields
  if (!program.programName || !program.workouts || !Array.isArray(program.workouts)) {
    throw new Error('Invalid program structure')
  }

  // Validate each workout
  program.workouts.forEach((workout, idx) => {
    if (!workout.name || !workout.exercises || !Array.isArray(workout.exercises)) {
      throw new Error(`Invalid workout structure at index ${idx}`)
    }

    // Filter out exercises with unavailable equipment
    workout.exercises = workout.exercises.filter(exercise => {
      if (!exercise.name || !exercise.sets || !exercise.reps) {
        return false
      }

      // Check if equipment is available (case-insensitive)
      if (exercise.equipmentRequired) {
        const requiredLower = exercise.equipmentRequired.toLowerCase()
        const hasEquipment = availableEquipment.some(eq => eq.toLowerCase() === requiredLower)
        if (!hasEquipment) {
          console.warn(`Filtering out ${exercise.name} - requires ${exercise.equipmentRequired}`)
          return false
        }
      }

      // Validate sets/reps are reasonable
      if (exercise.sets < 1 || exercise.sets > 10) return false
      
      return true
    })

    // Ensure workout still has exercises after filtering
    if (workout.exercises.length === 0) {
      throw new Error(`Workout "${workout.name}" has no valid exercises`)
    }
  })

  return program
}

/**
 * Enrich program with detailed exercise data from exercisesv3.json
 */
function enrichProgramWithExerciseData(program: GeneratedWorkoutProgram): GeneratedWorkoutProgram {
  program.workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      // Try to find exercise in database
      const exerciseData = findExerciseInDatabase(exercise.name)
      
      if (exerciseData) {
        // Add rich metadata from database (with null checks)
        if (exerciseData.instructions && Array.isArray(exerciseData.instructions)) {
          (exercise as any).instructions = exerciseData.instructions
        }
        if (exerciseData.video) {
          (exercise as any).video = exerciseData.video
        }
        if (exerciseData.images && Array.isArray(exerciseData.images)) {
          (exercise as any).images = exerciseData.images
        }
        if (exerciseData.tips && Array.isArray(exerciseData.tips)) {
          (exercise as any).tips = exerciseData.tips
        }
        if (exerciseData.profile) {
          if (exerciseData.profile.targetMuscleGroup) {
            (exercise as any).targetMuscleGroup = exerciseData.profile.targetMuscleGroup
          }
          if (exerciseData.profile.experienceLevel) {
            (exercise as any).experienceLevel = exerciseData.profile.experienceLevel
          }
          if (exerciseData.profile.mechanics) {
            (exercise as any).mechanics = exerciseData.profile.mechanics
          }
        }
      } else {
        console.warn(`Exercise not found in database: ${exercise.name}`)
      }
    })
  })

  return program
}

/**
 * Find exercise in database with fuzzy matching
 */
function findExerciseInDatabase(exerciseName: string) {
  // 1. Try exact match (case-insensitive)
  let match = EXERCISE_BY_NAME.get(exerciseName.toLowerCase())
  if (match) return match

  // 2. Clean the search name
  const cleanedSearch = exerciseName
    .toLowerCase()
    .replace(/\s*(video exercise guide|exercise guide)\s*/gi, '')
    .trim()

  // Try exact match with cleaned name
  match = EXERCISE_BY_NAME.get(cleanedSearch)
  if (match) return match

  // 3. Try partial matching - search term in database name
  match = EXERCISES_LIBRARY.find(ex => {
    const dbName = ex.name.toLowerCase().replace(/\s*(video exercise guide)\s*/i, '').trim()
    return dbName.includes(cleanedSearch) || cleanedSearch.includes(dbName)
  })
  if (match) return match

  // 4. Try word-by-word matching (handle different word orders)
  const searchWords = cleanedSearch.split(/\s+/).filter(w => w.length > 2)
  if (searchWords.length > 0) {
    match = EXERCISES_LIBRARY.find(ex => {
      const dbName = ex.name.toLowerCase().replace(/\s*(video exercise guide)\s*/i, '').trim()
      const dbWords = dbName.split(/\s+/)
      
      // Check if most important words match
      const matchCount = searchWords.filter(word => 
        dbWords.some(dbWord => dbWord.includes(word) || word.includes(dbWord))
      ).length
      
      return matchCount >= Math.min(2, searchWords.length)
    })
    if (match) return match
  }

  // 5. Try common variations
  const variations = [
    cleanedSearch.replace(/machine/gi, '').trim(),
    cleanedSearch.replace(/cable/gi, '').trim(),
    cleanedSearch.replace(/dumbbell/gi, 'db').trim(),
    cleanedSearch.replace(/barbell/gi, 'bb').trim(),
    cleanedSearch + ' machine',
    cleanedSearch + ' cable',
  ]

  for (const variation of variations) {
    if (!variation) continue
    match = EXERCISES_LIBRARY.find(ex => {
      const dbName = ex.name.toLowerCase().replace(/\s*(video exercise guide)\s*/i, '').trim()
      return dbName.includes(variation) || variation.includes(dbName)
    })
    if (match) return match
  }

  return null
}

/**
 * Estimate cost of generation
 */
export function estimateGenerationCost(options: WorkoutGenerationOptions): number {
  // Rough estimate based on typical token usage
  const baseTokens = 2000 // Prompt
  const responseTokens = options.daysPerWeek * 500 // ~500 tokens per workout
  
  // Claude 3.5 Sonnet pricing
  const promptCost = (baseTokens * 3) / 1000000
  const completionCost = (responseTokens * 15) / 1000000
  
  return promptCost + completionCost
}
