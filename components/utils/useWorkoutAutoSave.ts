'use client'

import { useEffect, useRef } from 'react'
import { WorkoutLog } from '@/components/context/DataContext'

/**
 * Auto-save workout to localStorage at regular intervals
 * Prevents data loss if app crashes during workout
 */
export function useWorkoutAutoSave(
  workout: WorkoutLog | null,
  interval: number = 30000 // 30 seconds default
) {
  const lastSaveRef = useRef<string>('')
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!workout) {
      // Clear interval when no active workout
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    // Save immediately on mount/update if data changed
    const workoutString = JSON.stringify(workout)
    if (workoutString !== lastSaveRef.current) {
      localStorage.setItem('ft_active', workoutString)
      localStorage.setItem('ft_active_timestamp', Date.now().toString())
      lastSaveRef.current = workoutString
      console.log('💾 Workout auto-saved')
    }

    // Set up auto-save interval
    intervalRef.current = setInterval(() => {
      const currentWorkoutString = JSON.stringify(workout)
      if (currentWorkoutString !== lastSaveRef.current) {
        localStorage.setItem('ft_active', currentWorkoutString)
        localStorage.setItem('ft_active_timestamp', Date.now().toString())
        lastSaveRef.current = currentWorkoutString
        console.log('💾 Workout auto-saved (interval)')
      }
    }, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [workout, interval])

  // Save on page unload/close (best effort)
  useEffect(() => {
    if (!workout) return

    const handleBeforeUnload = () => {
      const workoutString = JSON.stringify(workout)
      localStorage.setItem('ft_active', workoutString)
      localStorage.setItem('ft_active_timestamp', Date.now().toString())
      console.log('💾 Workout saved before page unload')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [workout])
}

/**
 * Check if there's an incomplete workout in localStorage
 * Returns the workout and age in minutes if found
 */
export function checkIncompleteWorkout(): {
  workout: WorkoutLog | null
  ageMinutes: number
} {
  try {
    const savedWorkout = localStorage.getItem('ft_active')
    const timestamp = localStorage.getItem('ft_active_timestamp')

    if (!savedWorkout) {
      return { workout: null, ageMinutes: 0 }
    }

    const workout: WorkoutLog = JSON.parse(savedWorkout)
    
    // Check if workout is incomplete (no endTime)
    if (workout.endTime) {
      // Workout was finished, clean up
      localStorage.removeItem('ft_active')
      localStorage.removeItem('ft_active_timestamp')
      return { workout: null, ageMinutes: 0 }
    }

    // Calculate age
    const now = Date.now()
    const lastSave = timestamp ? parseInt(timestamp) : workout.startTime
    const ageMinutes = Math.floor((now - lastSave) / 1000 / 60)

    // If workout is older than 24 hours, consider it stale
    if (ageMinutes > 1440) { // 24 hours
      console.log('🗑️ Removing stale workout (>24h old)')
      localStorage.removeItem('ft_active')
      localStorage.removeItem('ft_active_timestamp')
      return { workout: null, ageMinutes: 0 }
    }

    return { workout, ageMinutes }
  } catch (error) {
    console.error('Error checking incomplete workout:', error)
    return { workout: null, ageMinutes: 0 }
  }
}

/**
 * Clear incomplete workout from localStorage
 */
export function clearIncompleteWorkout() {
  localStorage.removeItem('ft_active')
  localStorage.removeItem('ft_active_timestamp')
  console.log('🗑️ Incomplete workout cleared')
}
