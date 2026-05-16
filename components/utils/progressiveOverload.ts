/**
 * Progressive Overload Suggestions
 *
 * Integreert de Hypertrophy Engine: berekent het optimale werkgewicht op basis
 * van een geschatte 1RM (Brzycki/Epley), RPE-feedback en oefening-type.
 *
 * Wetenschappelijke basis:
 * - Schoenfeld (2010): optimale hypertrofie bij 70–78% 1RM
 * - Zourdos et al. (2016): effectieve werksets vereisen RPE ≥ 6
 * - Helms et al. (2016): isolatie richting falen (RPE 9–10); compound max RPE 9
 */

import { WorkoutLog, WorkoutExercise } from '@/components/context/DataContext'
import {
  calculateHypertrophyTargetForExercise,
  isEffectiveWorkingSet,
  countEffectiveSets,
  getProgressionReadiness,
  type HypertrophyTarget,
  type RPETarget,
  type ProgressionReadiness,
} from '@/lib/hypertrophyCalculations'
import { getBest1RM } from '@/components/utils/workoutCalculations'

export interface OverloadSuggestion {
  exerciseName: string
  currentWeight: number
  suggestedWeight: number
  increasePercentage: number
  reason: string
  confidence: 'low' | 'medium' | 'high'
  /** Geschatte 1RM op basis van beste effectieve set */
  estimate1RM: number
  /** Hypertrofie doelgewicht bereik (70–78% 1RM) */
  hypertrophyRange: { min: number; max: number }
  /** Aanbevolen RPE-bereik voor deze oefening */
  rpeTarget: RPETarget
  /** Aantal effectieve werksets (RPE ≥ 6) in de meest recente sessie */
  effectiveSets: number
  /** Frank's progressiemodel: is de gebruiker klaar voor gewichtsverhoging? */
  progressionReadiness: ProgressionReadiness
}

/**
 * Generate progressive overload suggestion for an exercise.
 *
 * Algoritme:
 * 1. Verzamel de laatste 3 sessies voor de oefening
 * 2. Filter effectieve sets (RPE ≥ 6, niet-warmup, voltooid)
 * 3. Schat de 1RM op basis van de beste effectieve set
 * 4. Bereken hypertrofie doelgewicht via de HypertrophyEngine
 * 5. Gebruik de gemiddelde RPE van vorige sessie als correctiefactor
 */
export function generateProgressiveOverloadSuggestion(
  exerciseName: string,
  history: WorkoutLog[]
): OverloadSuggestion | null {
  // Vind de laatste 3 sessies met deze oefening
  const relevantWorkouts = history
    .filter(workout =>
      workout.exercises.some(ex => ex.name.toLowerCase() === exerciseName.toLowerCase())
    )
    .slice(0, 3)

  if (relevantWorkouts.length < 2) {
    return null // Minimaal 2 vorige sessies nodig
  }

  // Meest recente sessie
  const latestExercise = relevantWorkouts[0].exercises.find(
    ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
  )
  if (!latestExercise) return null

  // Alle werksets uit de 3 recente sessies
  const allSets = relevantWorkouts.flatMap(workout => {
    const ex = workout.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase())
    return ex?.sets.filter(s => s.completed && !s.isWarmup) || []
  })

  if (allSets.length < 3) {
    return null // Minimaal 3 voltooide werksets nodig
  }

  // Effectieve sets in de meest recente sessie (RPE ≥ 6)
  const latestEffectiveSets = latestExercise.sets.filter(isEffectiveWorkingSet)
  const effectiveSets = countEffectiveSets(latestExercise.sets)

  // Beste 1RM uit effectieve sets van de laatste sessie
  const best1RMResult = getBest1RM({
    ...latestExercise,
    sets: latestEffectiveSets.length > 0 ? latestEffectiveSets : latestExercise.sets.filter(s => s.completed && !s.isWarmup),
  })

  // Fallback: gebruik het gemiddelde gewicht van recente werksets
  const recentWeights = allSets.slice(0, 6).map(s => s.weight)
  const avgWeight = recentWeights.reduce((sum, w) => sum + w, 0) / recentWeights.length

  // Gemiddelde RPE van de vorige sessie (als data beschikbaar)
  const prevSessionSets = relevantWorkouts.length > 1
    ? (relevantWorkouts[1].exercises.find(
        e => e.name.toLowerCase() === exerciseName.toLowerCase()
      )?.sets.filter(s => s.completed && !s.isWarmup && s.rpe !== undefined) || [])
    : []
  const prevAvgRPE = prevSessionSets.length > 0
    ? prevSessionSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / prevSessionSets.length
    : undefined

  // Representatief gewicht en herhalingen voor 1RM-berekening
  const refWeight = best1RMResult?.weight ?? avgWeight
  const refReps = best1RMResult?.reps ?? Math.round(
    allSets.slice(0, 6).reduce((sum, s) => sum + s.reps, 0) / Math.min(6, allSets.length)
  )

  // Bereken optimale hypertrofie target via de engine
  const hypertrophyTarget: HypertrophyTarget = calculateHypertrophyTargetForExercise(
    exerciseName,
    refWeight,
    refReps,
    prevAvgRPE
  )

  const suggestedWeight = hypertrophyTarget.targetWeight

  // Bepaal confidence op basis van beschikbaarheid van RPE-data
  const setsWithRPE = allSets.filter(s => s.rpe !== undefined).length
  const confidence: 'low' | 'medium' | 'high' =
    setsWithRPE >= 3 ? 'high' : setsWithRPE >= 1 ? 'medium' : 'low'

  // Reden voor de suggestie
  let reason = `1RM ~${hypertrophyTarget.estimate1RM} kg → hypertrofie zone ${hypertrophyTarget.hypertrophyMin}–${hypertrophyTarget.hypertrophyMax} kg`
  if (hypertrophyTarget.adjustedForLowRPE) {
    reason += ' (gewicht verhoogd: vorige RPE < 6 telde als warmup)'
  }

  const increasePercentage = avgWeight > 0
    ? Math.round(((suggestedWeight - avgWeight) / avgWeight) * 100 * 10) / 10
    : 0

  // Frank's progressiemodel: compound = reverse linear, isolatie = pseudo reverse linear
  const latestWorkingSets = latestExercise.sets.filter(s => s.completed && !s.isWarmup)
  const progressionReadiness = getProgressionReadiness(
    exerciseName,
    latestWorkingSets,
    latestExercise.targetMinReps,
    latestExercise.targetMaxReps,
  )

  return {
    exerciseName,
    currentWeight: Math.round(avgWeight * 10) / 10,
    suggestedWeight,
    increasePercentage,
    reason,
    confidence,
    estimate1RM: hypertrophyTarget.estimate1RM,
    hypertrophyRange: {
      min: hypertrophyTarget.hypertrophyMin,
      max: hypertrophyTarget.hypertrophyMax,
    },
    rpeTarget: hypertrophyTarget.rpeTarget,
    effectiveSets,
    progressionReadiness,
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
  } else if (history.length >= 8 && volumeIncrease > 40) {
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
