import { Exercise } from '@/components/context/DataContext'

export type PlanType = 'full-body' | 'upper-lower' | 'ppl'
export type WorkoutFocus = 'strength' | 'hypertrophy' | 'mixed'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface WorkoutGeneratorConfig {
  planType: PlanType
  duration: number // minutes
  focus: WorkoutFocus
  experience?: ExperienceLevel
  equipment?: string[]
}

/**
 * Generate a workout plan based on user preferences
 * In eerste versie: deterministisch, later AI/complexiteit
 */
export function generateWorkoutPlan(config: WorkoutGeneratorConfig) {
  const { planType, duration, focus, experience = 'beginner' } = config

  // Determine sets and reps based on focus
  const { sets, reps } = getSetsRepsForFocus(focus, experience)

  let exercises: Exercise[] = []
  let planName = ''

  switch (planType) {
    case 'full-body':
      planName = 'Full Body Workout'
      exercises = generateFullBodyExercises(sets, reps, duration)
      break
    case 'upper-lower':
      planName = 'Upper/Lower Split - Day 1 (Upper)'
      exercises = generateUpperBodyExercises(sets, reps, duration)
      break
    case 'ppl':
      planName = 'Push/Pull/Legs - Day 1 (Push)'
      exercises = generatePushExercises(sets, reps, duration)
      break
  }

  return {
    name: planName,
    exercises,
    estimatedDuration: duration,
    focus,
    planType
  }
}

function getSetsRepsForFocus(focus: WorkoutFocus, experience: ExperienceLevel) {
  const baseConfig = {
    strength: { sets: 5, reps: 5 },
    hypertrophy: { sets: 3, reps: 10 },
    mixed: { sets: 4, reps: 8 }
  }

  const config = baseConfig[focus]

  // Adjust for experience
  if (experience === 'beginner') {
    config.sets = Math.max(2, config.sets - 1)
  } else if (experience === 'advanced') {
    config.sets = config.sets + 1
  }

  return config
}

function generateFullBodyExercises(sets: number, reps: number, duration: number): Exercise[] {
  const baseExercises = [
    { name: 'Barbell Squat', muscleGroup: 'legs', type: 'compound' as const },
    { name: 'Bench Press', muscleGroup: 'chest', type: 'compound' as const },
    { name: 'Bent Over Row', muscleGroup: 'back', type: 'compound' as const },
    { name: 'Overhead Press', muscleGroup: 'shoulders', type: 'compound' as const },
    { name: 'Romanian Deadlift', muscleGroup: 'legs', type: 'compound' as const },
  ]

  // Add isolation exercises if time permits (longer sessions)
  if (duration >= 60) {
    baseExercises.push(
      { name: 'Bicep Curls', muscleGroup: 'arms', type: 'compound' as const },
      { name: 'Tricep Extensions', muscleGroup: 'arms', type: 'compound' as const }
    )
  }

  return baseExercises.slice(0, Math.ceil(duration / 15)).map((ex, index) => ({
    id: `exercise-${index}`,
    name: ex.name,
    targetSets: sets,
    targetReps: reps,
    type: 'strength' as const
  }))
}

function generateUpperBodyExercises(sets: number, reps: number, duration: number): Exercise[] {
  const exercises = [
    { name: 'Bench Press', muscleGroup: 'chest' },
    { name: 'Bent Over Row', muscleGroup: 'back' },
    { name: 'Overhead Press', muscleGroup: 'shoulders' },
    { name: 'Pull-ups', muscleGroup: 'back' },
    { name: 'Dumbbell Flyes', muscleGroup: 'chest' },
    { name: 'Bicep Curls', muscleGroup: 'arms' },
    { name: 'Tricep Dips', muscleGroup: 'arms' },
  ]

  return exercises.slice(0, Math.ceil(duration / 12)).map((ex, index) => ({
    id: `ex-${index}`,
    name: ex.name,
    targetSets: sets,
    targetReps: reps,
    type: 'strength' as const
  }))
}

function generatePushExercises(sets: number, reps: number, duration: number): Exercise[] {
  const exercises = [
    { name: 'Bench Press', muscleGroup: 'chest' },
    { name: 'Overhead Press', muscleGroup: 'shoulders' },
    { name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
    { name: 'Lateral Raises', muscleGroup: 'shoulders' },
    { name: 'Tricep Extensions', muscleGroup: 'arms' },
    { name: 'Dips', muscleGroup: 'chest' },
  ]

  return exercises.slice(0, Math.ceil(duration / 12)).map((ex, index) => ({
    id: `ex-${index}`,
    name: ex.name,
    targetSets: sets,
    targetReps: reps,
    type: 'strength' as const
  }))
}

/**
 * Create a complete workout schema for the plan
 */
export function createFirstWorkoutSchema(
  userId: string,
  plan: ReturnType<typeof generateWorkoutPlan>
) {
  return {
    user_id: userId,
    name: plan.name,
    exercises: plan.exercises,
    is_first_plan: true,
    created_at: new Date().toISOString()
  }
}
