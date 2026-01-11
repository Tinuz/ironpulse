'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, Route, Heart, Zap, Timer } from 'lucide-react'
import { CardioData } from '@/components/context/DataContext'
import { calculatePace, enrichCardioData } from '@/components/utils/cardioCalculations'

interface CardioExerciseLoggerProps {
  exerciseName: string
  initialData?: CardioData
  userWeight: number | null
  onComplete: (cardioData: CardioData) => void
  onCancel: () => void
}

export default function CardioExerciseLogger({
  exerciseName,
  initialData,
  userWeight,
  onComplete,
  onCancel
}: CardioExerciseLoggerProps) {
  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(initialData?.duration || 0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Cardio data state
  const [distance, setDistance] = useState<number | undefined>(initialData?.distance)
  const [heartRate, setHeartRate] = useState<number | undefined>(initialData?.heartRate)
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high'>(
    typeof initialData?.intensity === 'string' ? initialData.intensity : 'moderate'
  )

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const handleStartPause = () => {
    setIsRunning(!isRunning)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setElapsedSeconds(0)
  }

  const handleComplete = () => {
    if (elapsedSeconds === 0) {
      alert('Voer minimaal een duur in')
      return
    }

    const cardioData: CardioData = {
      duration: elapsedSeconds,
      distance,
      heartRate,
      intensity
    }

    // Enrich with calculated fields (pace, calories)
    const enrichedData = enrichCardioData(cardioData, exerciseName, userWeight || 0)
    onComplete(enrichedData)
  }

  // Calculate current pace if distance is entered
  const currentPace = distance && elapsedSeconds > 0
    ? calculatePace(distance, elapsedSeconds)
    : null

  // Format time display
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Heart size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{exerciseName}</h2>
              <p className="text-white/80 text-sm">Cardio Logging</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-6xl font-black font-mono mb-4 tabular-nums">
              {hours > 0 && <span>{hours.toString().padStart(2, '0')}:</span>}
              <span>{minutes.toString().padStart(2, '0')}</span>
              :
              <span>{seconds.toString().padStart(2, '0')}</span>
            </div>

            {/* Timer Controls */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleStartPause}
                className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isRunning
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isRunning ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
              </button>

              <button
                onClick={handleStop}
                disabled={!isRunning && elapsedSeconds === 0}
                className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-all"
              >
                <Square size={24} className="text-white" />
              </button>

              <button
                onClick={handleReset}
                disabled={elapsedSeconds === 0}
                className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-all"
              >
                <Timer size={24} />
              </button>
            </div>
          </div>

          {/* Distance Input */}
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block flex items-center gap-1">
              <Route size={12} />
              Afstand (optioneel)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={distance ? (distance / 1000).toFixed(2) : ''}
                onChange={(e) => setDistance(e.target.value ? parseFloat(e.target.value) * 1000 : undefined)}
                className="flex-1 bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono font-bold text-lg"
                placeholder="0.00"
                step="0.1"
                min="0"
              />
              <div className="flex items-center px-4 bg-white/5 rounded-lg text-muted-foreground font-bold">
                km
              </div>
            </div>
            {currentPace && (
              <div className="mt-2 text-sm text-green-400 font-bold flex items-center gap-2">
                <Zap size={14} />
                Pace: {currentPace}
              </div>
            )}
          </div>

          {/* Heart Rate Input */}
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block flex items-center gap-1">
              <Heart size={12} />
              Gemiddelde Hartslag (optioneel)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={heartRate ?? ''}
                onChange={(e) => setHeartRate(e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1 bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono font-bold text-lg"
                placeholder="145"
                min="40"
                max="220"
              />
              <div className="flex items-center px-4 bg-white/5 rounded-lg text-muted-foreground font-bold">
                bpm
              </div>
            </div>
          </div>

          {/* Intensity Selector */}
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
              Intensiteit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'moderate', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(level)}
                  className={`py-3 rounded-lg font-bold text-sm transition-all ${
                    intensity === level
                      ? level === 'low' ? 'bg-blue-500 text-white shadow-lg' :
                        level === 'moderate' ? 'bg-yellow-500 text-white shadow-lg' :
                        'bg-red-500 text-white shadow-lg'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {level === 'low' ? 'Laag' : level === 'moderate' ? 'Matig' : 'Hoog'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-lg font-bold text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={elapsedSeconds === 0}
              className="flex-1 py-3 rounded-lg font-bold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
            >
              Complete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
