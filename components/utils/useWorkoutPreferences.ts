/**
 * Custom hook for workout preferences (RIR, RPE, warm-up toggles)
 * Syncs with localStorage
 */

import { useState, useEffect } from 'react'

export interface WorkoutPreferences {
  showRIR: boolean
  showRPE: boolean
  showWarmupToggle: boolean
}

export function useWorkoutPreferences(): WorkoutPreferences {
  const [showRIR, setShowRIR] = useState(false)
  const [showRPE, setShowRPE] = useState(false)
  const [showWarmupToggle, setShowWarmupToggle] = useState(true)

  useEffect(() => {
    // Load from localStorage
    const savedRIR = localStorage.getItem('workout_show_rir')
    const savedRPE = localStorage.getItem('workout_show_rpe')
    const savedWarmup = localStorage.getItem('workout_show_warmup_toggle')
    
    if (savedRIR !== null) setShowRIR(savedRIR === 'true')
    if (savedRPE !== null) setShowRPE(savedRPE === 'true')
    if (savedWarmup !== null) setShowWarmupToggle(savedWarmup === 'true')

    // Listen for changes (from Settings page)
    const handleStorageChange = () => {
      const newRIR = localStorage.getItem('workout_show_rir')
      const newRPE = localStorage.getItem('workout_show_rpe')
      const newWarmup = localStorage.getItem('workout_show_warmup_toggle')
      
      if (newRIR !== null) setShowRIR(newRIR === 'true')
      if (newRPE !== null) setShowRPE(newRPE === 'true')
      if (newWarmup !== null) setShowWarmupToggle(newWarmup === 'true')
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    showRIR,
    showRPE,
    showWarmupToggle
  }
}
