/**
 * Custom hook for workout preferences (RIR, RPE, warm-up toggles)
 * Syncs with localStorage
 */

import { useState, useEffect } from 'react'

export interface WorkoutPreferences {
  showWarmupToggle: boolean
}

export function useWorkoutPreferences(): WorkoutPreferences {
  const [showWarmupToggle, setShowWarmupToggle] = useState(true)

  useEffect(() => {
    const savedWarmup = localStorage.getItem('workout_show_warmup_toggle')

    if (savedWarmup !== null) setShowWarmupToggle(savedWarmup === 'true')

    const handleStorageChange = () => {
      const newWarmup = localStorage.getItem('workout_show_warmup_toggle')
      if (newWarmup !== null) setShowWarmupToggle(newWarmup === 'true')
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    showWarmupToggle
  }
}
