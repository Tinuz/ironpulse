/**
 * Progressive Overload Suggestions
 * Analyzes recent performance and suggests weight increases
 */

import { WorkoutLog, WorkoutExercise } from '@/components/context/DataContext'

export interface OverloadSuggestion {
  exerciseName: string
  currentWeight: number
  suggestedWeight: number
  increasePercentage: number
  reason: string
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Generate progressive overload suggestion for an exercise
 */
export function generateProgressiveOverloadSuggestion(
  exerciseName: string,
  history: WorkoutLog[]
): OverloadSuggestion | null {
  // Find last 3 workouts with this exercise
  const relevantWorkouts = history
    .filter(workout => 
      workout.exercises.some(ex => ex.name.toLowerCase() === exerciseName.toLowerCase())
    )
    .slice(0, 3)

  if (relevantWorkouts.length < 2) {
    return null // Need at least 2 previous sessions
  }

  // Extract working sets (exclude warm-ups)
  const allSets = relevantWorkouts.flatMap(workout => {
    const exercise = workout.exercises.find(ex => 
      ex.name.toLowerCase() === exerciseName.toLowerCase()
    )
    return exercise?.sets.filter(s => s.completed && !s.isWarmup) || []
  })

  if (allSets.length < 3) {
    return null // Need at least 3 completed working sets
  }

  // Calculate average weight from recent sets
  const recentWeights = allSets.slice(0, 6).map(s => s.weight)
  const avgWeight = recentWeights.reduce((sum, w) => sum + w, 0) / recentWeights.length

  // Check consistency (coefficient of variation)
  const stdDev = Math.sqrt(
    recentWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / recentWeights.length
  )
  const coefficientOfVariation = stdDev / avgWeight

  // Check if user hit target reps consistently
  const recentReps = allSets.slice(0, 6).map(s => s.reps)
  const avgReps = recentReps.reduce((sum, r) => sum + r, 0) / recentReps.length
  const targetReps = Math.max(...recentReps) // Assume highest reps is target

  // Check RIR if available
  const setsWithRIR = allSets.filter(s => s.rir !== undefined)
  const avgRIR = setsWithRIR.length > 0
    ? setsWithRIR.reduce((sum, s) => sum + (s.rir || 0), 0) / setsWithRIR.length
    : null

  // Decision logic
  let shouldIncrease = false
  let increasePercentage = 0
  let reason = ''
  let confidence: 'low' | 'medium' | 'high' = 'medium'

  // High confidence: Consistently hitting reps with low RIR
  if (avgRIR !== null && avgRIR <= 2 && avgReps >= targetReps * 0.9) {
    shouldIncrease = true
    increasePercentage = avgWeight < 60 ? 5 : avgWeight < 100 ? 3.5 : 2.5
    reason = 'Consistent performance with low RIR'
    confidence = 'high'
  }
  // Medium confidence: Hitting reps consistently (no RIR data)
  else if (avgReps >= targetReps * 0.9 && coefficientOfVariation < 0.1) {
    shouldIncrease = true
    increasePercentage = avgWeight < 60 ? 4 : avgWeight < 100 ? 3 : 2.5
    reason = 'Hitting target reps consistently'
    confidence = 'medium'
  }
  // Low confidence: Slight improvement trend
  else if (recentWeights[0] > recentWeights[recentWeights.length - 1]) {
    shouldIncrease = true
    increasePercentage = 2.5
    reason = 'Upward trend in weight'
    confidence = 'low'
  }

  if (!shouldIncrease) {
    return null
  }

  // Calculate suggested weight (round to nearest 2.5kg)
  const rawIncrease = avgWeight * (increasePercentage / 100)
  const suggestedWeight = Math.ceil((avgWeight + rawIncrease) / 2.5) * 2.5

  return {
    exerciseName,
    currentWeight: Math.round(avgWeight * 10) / 10,
    suggestedWeight,
    increasePercentage,
    reason,
    confidence
  }
}

/**
 * Generate suggestions for all exercises in a workout
 */
export function generateWorkoutSuggestions(
  workoutExercises: WorkoutExercise[],
  history: WorkoutLog[]
): Map<string, OverloadSuggestion> {
  const suggestions = new Map<string, OverloadSuggestion>()

  for (const exercise of workoutExercises) {
    const suggestion = generateProgressiveOverloadSuggestion(exercise.name, history)
    if (suggestion) {
      suggestions.set(exercise.name, suggestion)
    }
  }

  return suggestions
}

/**
 * Check if user is ready for a deload based on fatigue indicators
 */
export function shouldDeload(history: WorkoutLog[]): {
  shouldDeload: boolean
  reason: string
  metrics: {
    weeklyVolume: number
    baselineVolume: number
    volumeIncrease: number
    recentRPE?: number
  }
} {
  if (history.length < 4) {
    return {
      shouldDeload: false,
      reason: 'Not enough data',
      metrics: {
        weeklyVolume: 0,
        baselineVolume: 0,
        volumeIncrease: 0
      }
    }
  }

  // Last 7 days
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentWorkouts = history.filter(w => new Date(w.date) >= sevenDaysAgo)

  // Previous 4 weeks baseline
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
  const baselineWorkouts = history.filter(w => {
    const date = new Date(w.date)
    return date >= fourWeeksAgo && date < sevenDaysAgo
  })

  // Calculate volume
  const calculateTotalVolume = (workouts: WorkoutLog[]) => {
    return workouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal, ex) => {
        return exTotal + ex.sets
          .filter(s => s.completed && !s.isWarmup)
          .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0)
      }, 0)
    }, 0)
  }

  const weeklyVolume = calculateTotalVolume(recentWorkouts)
  const baselineVolume = baselineWorkouts.length > 0 
    ? calculateTotalVolume(baselineWorkouts) / 4 
    : weeklyVolume

  const volumeIncrease = baselineVolume > 0 
    ? ((weeklyVolume - baselineVolume) / baselineVolume) * 100
    : 0

  // Calculate average RPE if available
  const allSetsWithRPE = recentWorkouts.flatMap(w => 
    w.exercises.flatMap(ex => 
      ex.sets.filter(s => s.completed && !s.isWarmup && s.rpe !== undefined)
    )
  )
  const avgRPE = allSetsWithRPE.length > 0
    ? allSetsWithRPE.reduce((sum, s) => sum + (s.rpe || 0), 0) / allSetsWithRPE.length
    : undefined

  // Decision logic
  let shouldDeload = false
  let reason = ''

  if (volumeIncrease > 30 && avgRPE && avgRPE > 8.5) {
    shouldDeload = true
    reason = 'High volume increase + high RPE indicates fatigue'
  } else if (volumeIncrease > 50) {
    shouldDeload = true
    reason = 'Excessive volume increase (>50%)'
  } else if (avgRPE && avgRPE > 9) {
    shouldDeload = true
    reason = 'Consistently high RPE (>9)'
  } else if (recentWorkouts.length >= 6 && volumeIncrease > 40) {
    shouldDeload = true
    reason = 'High training frequency + volume increase'
  }

  return {
    shouldDeload,
    reason,
    metrics: {
      weeklyVolume: Math.round(weeklyVolume),
      baselineVolume: Math.round(baselineVolume),
      volumeIncrease: Math.round(volumeIncrease * 10) / 10,
      recentRPE: avgRPE ? Math.round(avgRPE * 10) / 10 : undefined
    }
  }
}
