/**
 * Cardio Analytics Utilities
 * Functions to analyze cardio workout data for dashboard visualizations
 */

import { WorkoutLog } from '@/components/context/DataContext'

export interface CardioMetrics {
  totalDuration: number // seconds
  totalDistance: number // meters
  totalCalories: number
  totalSessions: number
  avgDuration: number
  avgDistance: number
  avgHeartRate: number | null
}

export interface CardioTimeSeriesPoint {
  date: string
  duration: number // seconds
  distance: number // meters
  calories: number
  sessions: number
}

export interface CardioActivityBreakdown {
  activity: string
  duration: number // seconds
  distance: number // meters
  calories: number
  sessions: number
}

/**
 * Calculate total cardio metrics from workout history
 */
export function calculateCardioMetrics(workouts: WorkoutLog[]): CardioMetrics {
  let totalDuration = 0
  let totalDistance = 0
  let totalCalories = 0
  let totalSessions = 0
  let heartRateSum = 0
  let heartRateCount = 0

  workouts.forEach(workout => {
    if (workout.cardioSummary) {
      totalDuration += workout.cardioSummary.totalDuration || 0
      totalDistance += workout.cardioSummary.totalDistance || 0
      totalCalories += workout.cardioSummary.estimatedCalories || 0
      totalSessions += 1

      if (workout.cardioSummary.avgHeartRate) {
        heartRateSum += workout.cardioSummary.avgHeartRate
        heartRateCount++
      }
    }
  })

  return {
    totalDuration,
    totalDistance,
    totalCalories,
    totalSessions,
    avgDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
    avgDistance: totalSessions > 0 ? totalDistance / totalSessions : 0,
    avgHeartRate: heartRateCount > 0 ? heartRateSum / heartRateCount : null
  }
}

/**
 * Get cardio time series data for charts
 */
export function getCardioTimeSeries(
  workouts: WorkoutLog[],
  _timeRange: 'week' | 'month' | 'quarter' | 'year'
): CardioTimeSeriesPoint[] {
  // Group by date
  const dataByDate = new Map<string, CardioTimeSeriesPoint>()

  workouts.forEach(workout => {
    if (workout.cardioSummary) {
      const date = new Date(workout.date).toISOString().split('T')[0]
      
      const existing = dataByDate.get(date) || {
        date,
        duration: 0,
        distance: 0,
        calories: 0,
        sessions: 0
      }

      existing.duration += workout.cardioSummary.totalDuration || 0
      existing.distance += workout.cardioSummary.totalDistance || 0
      existing.calories += workout.cardioSummary.estimatedCalories || 0
      existing.sessions += 1

      dataByDate.set(date, existing)
    }
  })

  // Convert to array and sort by date
  return Array.from(dataByDate.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

/**
 * Get cardio breakdown by activity type
 */
export function getCardioActivityBreakdown(workouts: WorkoutLog[]): CardioActivityBreakdown[] {
  const activityMap = new Map<string, CardioActivityBreakdown>()

  workouts.forEach(workout => {
    workout.exercises?.forEach(exercise => {
      if (exercise.type === 'cardio' && exercise.cardioData) {
        const activityName = exercise.name
        
        const existing = activityMap.get(activityName) || {
          activity: activityName,
          duration: 0,
          distance: 0,
          calories: 0,
          sessions: 0
        }

        existing.duration += exercise.cardioData.duration || 0
        existing.distance += exercise.cardioData.distance || 0
        existing.calories += exercise.cardioData.estimatedCalories || 0
        existing.sessions += 1

        activityMap.set(activityName, existing)
      }
    })
  })

  return Array.from(activityMap.values()).sort((a, b) => b.duration - a.duration)
}

/**
 * Calculate weekly cardio goal progress
 */
export function calculateWeeklyCardioProgress(
  workouts: WorkoutLog[],
  weeklyGoalMinutes: number = 150 // WHO recommendation: 150 min/week
): {
  current: number
  goal: number
  percentage: number
  remaining: number
} {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0)

  const thisWeekWorkouts = workouts.filter(w => new Date(w.date) >= weekStart)
  const metrics = calculateCardioMetrics(thisWeekWorkouts)
  const currentMinutes = Math.round(metrics.totalDuration / 60)

  return {
    current: currentMinutes,
    goal: weeklyGoalMinutes,
    percentage: Math.min((currentMinutes / weeklyGoalMinutes) * 100, 100),
    remaining: Math.max(weeklyGoalMinutes - currentMinutes, 0)
  }
}

/**
 * Get heart rate zone distribution
 */
export function getHeartRateZoneDistribution(workouts: WorkoutLog[]): {
  zone: string
  range: string
  duration: number // seconds
  percentage: number
}[] {
  // Simple zones based on common HRR percentages
  const zones = [
    { zone: 'Zone 1 (Recovery)', range: '<120 bpm', min: 0, max: 120 },
    { zone: 'Zone 2 (Aerobic)', range: '120-140 bpm', min: 120, max: 140 },
    { zone: 'Zone 3 (Tempo)', range: '140-160 bpm', min: 140, max: 160 },
    { zone: 'Zone 4 (Threshold)', range: '160-175 bpm', min: 160, max: 175 },
    { zone: 'Zone 5 (Max)', range: '>175 bpm', min: 175, max: 999 }
  ]

  const zoneDurations = new Map<string, number>()
  let totalDuration = 0

  workouts.forEach(workout => {
    workout.exercises?.forEach(exercise => {
      if (exercise.type === 'cardio' && exercise.cardioData) {
        const hr = exercise.cardioData.heartRate
        const duration = exercise.cardioData.duration || 0
        
        if (hr) {
          totalDuration += duration
          const zone = zones.find(z => hr >= z.min && hr < z.max)
          if (zone) {
            const current = zoneDurations.get(zone.zone) || 0
            zoneDurations.set(zone.zone, current + duration)
          }
        }
      }
    })
  })

  return zones.map(z => ({
    zone: z.zone,
    range: z.range,
    duration: zoneDurations.get(z.zone) || 0,
    percentage: totalDuration > 0 ? ((zoneDurations.get(z.zone) || 0) / totalDuration) * 100 : 0
  }))
}
