import { CardioData } from '@/components/context/DataContext'

/**
 * MET (Metabolic Equivalent of Task) values for common cardio activities
 * Source: Compendium of Physical Activities
 */
export const MET_VALUES: Record<string, number> = {
  // Running (based on speed)
  'running slow (8 km/h)': 8.0,
  'running moderate (10 km/h)': 9.8,
  'running fast (12 km/h)': 11.5,
  'running very fast (14+ km/h)': 14.0,
  
  // Walking
  'walking slow (4 km/h)': 3.5,
  'walking moderate (5.5 km/h)': 4.3,
  'walking fast (6.5 km/h)': 5.0,
  
  // Cycling
  'cycling leisure (<16 km/h)': 4.0,
  'cycling moderate (16-19 km/h)': 6.8,
  'cycling vigorous (19-22 km/h)': 8.0,
  'cycling racing (22+ km/h)': 10.0,
  
  // Other cardio
  'rowing machine moderate': 7.0,
  'rowing machine vigorous': 8.5,
  'elliptical moderate': 5.0,
  'elliptical vigorous': 7.0,
  'swimming leisurely': 6.0,
  'swimming moderate': 8.0,
  'swimming vigorous': 10.0,
  'jump rope': 12.3,
  'stair climbing': 8.8,
  'hiit': 10.0,
  
  // Default fallback
  'cardio moderate': 6.0,
  'cardio vigorous': 8.0,
}

/**
 * Calculate estimated calories burned using MET formula
 * Formula: Calories = MET × weight(kg) × duration(hours)
 */
export function calculateCardioCalories(
  metValue: number,
  weightKg: number,
  durationSeconds: number
): number {
  const hours = durationSeconds / 3600
  return Math.round(metValue * weightKg * hours)
}

/**
 * Auto-detect MET value based on activity name and intensity
 */
export function estimateMETValue(
  activityName: string,
  intensity?: 'low' | 'moderate' | 'high'
): number {
  const lowerName = activityName.toLowerCase()
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(MET_VALUES)) {
    if (lowerName.includes(key.split(' ')[0])) {
      return value
    }
  }
  
  // Fallback based on intensity
  if (intensity === 'low') return 4.0
  if (intensity === 'high') return 10.0
  return 6.0 // moderate default
}

/**
 * Calculate pace from distance and duration
 * @param distanceMeters - distance in meters
 * @param durationSeconds - duration in seconds
 * @param unit - 'km' or 'mile'
 * @returns formatted pace string (e.g., "5:30/km")
 */
export function calculatePace(
  distanceMeters: number,
  durationSeconds: number,
  unit: 'km' | 'mile' = 'km'
): string {
  if (distanceMeters === 0 || durationSeconds === 0) return '0:00'
  
  const multiplier = unit === 'km' ? 1000 : 1609.34
  const timePerUnit = (durationSeconds / distanceMeters) * multiplier
  
  const minutes = Math.floor(timePerUnit / 60)
  const seconds = Math.floor(timePerUnit % 60)
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}/${unit}`
}

/**
 * Calculate average speed
 * @param distanceMeters - distance in meters
 * @param durationSeconds - duration in seconds
 * @param unit - 'km/h' or 'mph'
 * @returns speed in selected unit
 */
export function calculateSpeed(
  distanceMeters: number,
  durationSeconds: number,
  unit: 'km/h' | 'mph' = 'km/h'
): number {
  if (durationSeconds === 0) return 0
  
  const metersPerSecond = distanceMeters / durationSeconds
  const kmh = metersPerSecond * 3.6
  
  if (unit === 'mph') {
    return parseFloat((kmh * 0.621371).toFixed(1))
  }
  
  return parseFloat(kmh.toFixed(1))
}

/**
 * Format duration from seconds to readable string
 * @param seconds - total seconds
 * @returns formatted string (e.g., "1h 23m 45s" or "5m 30s")
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}

/**
 * Format distance to readable string
 * @param meters - distance in meters
 * @param unit - 'km' or 'mile'
 * @returns formatted string with unit
 */
export function formatDistance(meters: number, unit: 'km' | 'mile' = 'km'): string {
  if (unit === 'mile') {
    const miles = meters / 1609.34
    return `${miles.toFixed(2)} mi`
  }
  
  const km = meters / 1000
  return `${km.toFixed(2)} km`
}

/**
 * Convert intensity level to RPE scale
 */
export function intensityToRPE(intensity: 'low' | 'moderate' | 'high'): number {
  switch (intensity) {
    case 'low': return 3
    case 'moderate': return 6
    case 'high': return 9
    default: return 5
  }
}

/**
 * Convert RPE to intensity level
 */
export function rpeToIntensity(rpe: number): 'low' | 'moderate' | 'high' {
  if (rpe <= 3) return 'low'
  if (rpe >= 7) return 'high'
  return 'moderate'
}

/**
 * Enrich cardio data with calculated fields
 */
export function enrichCardioData(
  cardioData: CardioData,
  activityName: string,
  userWeightKg: number
): CardioData {
  const enriched = { ...cardioData }
  
  // Calculate pace if distance is provided
  if (cardioData.distance && cardioData.duration) {
    enriched.pace = calculatePace(cardioData.distance, cardioData.duration)
  }
  
  // Estimate calories if not provided
  if (!enriched.estimatedCalories) {
    const intensity = typeof cardioData.intensity === 'string' 
      ? cardioData.intensity 
      : rpeToIntensity(cardioData.intensity || 5)
    
    const metValue = estimateMETValue(activityName, intensity)
    enriched.estimatedCalories = calculateCardioCalories(
      metValue,
      userWeightKg,
      cardioData.duration
    )
  }
  
  return enriched
}

/**
 * Calculate summary for multiple cardio exercises in a workout
 */
export interface CardioSummary {
  totalDuration: number
  totalDistance: number
  avgHeartRate: number
  estimatedCalories: number
  exerciseCount: number
}

export function calculateCardioSummary(cardioExercises: Array<{
  name: string
  cardioData: CardioData
}>): CardioSummary {
  let totalDuration = 0
  let totalDistance = 0
  let totalHeartRate = 0
  let heartRateCount = 0
  let totalCalories = 0
  
  cardioExercises.forEach(({ cardioData }) => {
    totalDuration += cardioData.duration
    totalDistance += cardioData.distance || 0
    
    if (cardioData.heartRate) {
      totalHeartRate += cardioData.heartRate
      heartRateCount++
    }
    
    totalCalories += cardioData.estimatedCalories || 0
  })
  
  return {
    totalDuration,
    totalDistance,
    avgHeartRate: heartRateCount > 0 ? Math.round(totalHeartRate / heartRateCount) : 0,
    estimatedCalories: totalCalories,
    exerciseCount: cardioExercises.length
  }
}
