'use client'

import React, { useMemo } from 'react'
import { useData } from '@/components/context/DataContext'
import { motion } from 'framer-motion'
import { Activity, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { subDays, differenceInDays } from 'date-fns'

// Muscle groups for tracking
const MUSCLE_GROUPS = [
  { id: 'chest', name: 'Borst', category: 'push' },
  { id: 'shoulders', name: 'Schouders', category: 'push' },
  { id: 'triceps', name: 'Triceps', category: 'push' },
  { id: 'back', name: 'Rug', category: 'pull' },
  { id: 'biceps', name: 'Biceps', category: 'pull' },
  { id: 'legs', name: 'Benen', category: 'legs' },
  { id: 'core', name: 'Core', category: 'core' },
]

interface MuscleRecoveryData {
  muscleGroup: string
  muscleName: string
  category: string
  lastTrained: string | null
  daysSinceTraining: number
  recentVolume: number // last 7 days
  baselineVolume: number // average over 4 weeks
  readinessScore: number // 0-100%
  status: 'fresh' | 'ready' | 'fatigued' | 'overtrained'
}

export default function RecoveryDashboard() {
  const { history } = useData()

  // Calculate recovery data for each muscle group
  const recoveryData = useMemo((): MuscleRecoveryData[] => {
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const fourWeeksAgo = subDays(now, 28)

    return MUSCLE_GROUPS.map(muscle => {
      // Get all workouts for this muscle
      const muscleWorkouts = history.filter(workout => {
        return workout.exercises.some(ex => 
          ex.name.toLowerCase().includes(muscle.id) ||
          ex.name.toLowerCase().includes(muscle.name.toLowerCase())
        )
      })

      // Find last trained date
      const lastWorkout = muscleWorkouts[0]
      const lastTrained = lastWorkout?.date || null
      const daysSinceTraining = lastTrained 
        ? differenceInDays(now, new Date(lastTrained))
        : 999

      // Calculate recent volume (last 7 days)
      const recentWorkouts = muscleWorkouts.filter(w => 
        new Date(w.date) >= sevenDaysAgo
      )
      const recentVolume = recentWorkouts.reduce((total, workout) => {
        return total + workout.exercises
          .filter(ex => 
            ex.name.toLowerCase().includes(muscle.id) ||
            ex.name.toLowerCase().includes(muscle.name.toLowerCase())
          )
          .reduce((exTotal, ex) => {
            return exTotal + ex.sets
              .filter(s => s.completed && !s.isWarmup)
              .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0)
          }, 0)
      }, 0)

      // Calculate baseline volume (4 week average)
      const baselineWorkouts = muscleWorkouts.filter(w => 
        new Date(w.date) >= fourWeeksAgo
      )
      const baselineVolume = baselineWorkouts.length > 0
        ? baselineWorkouts.reduce((total, workout) => {
            return total + workout.exercises
              .filter(ex => 
                ex.name.toLowerCase().includes(muscle.id) ||
                ex.name.toLowerCase().includes(muscle.name.toLowerCase())
              )
              .reduce((exTotal, ex) => {
                return exTotal + ex.sets
                  .filter(s => s.completed && !s.isWarmup)
                  .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0)
              }, 0)
          }, 0) / 4
        : 0

      // Calculate readiness score (0-100%)
      let readinessScore = 100

      // Reduce score based on recent volume vs baseline
      if (baselineVolume > 0) {
        const volumeRatio = recentVolume / baselineVolume
        if (volumeRatio > 1.5) {
          readinessScore -= 40 // High fatigue
        } else if (volumeRatio > 1.2) {
          readinessScore -= 20 // Moderate fatigue
        }
      }

      // Increase score based on recovery time
      if (daysSinceTraining >= 5) {
        readinessScore = Math.min(100, readinessScore + 30)
      } else if (daysSinceTraining >= 3) {
        readinessScore = Math.min(100, readinessScore + 15)
      } else if (daysSinceTraining < 2 && recentVolume > baselineVolume * 1.2) {
        readinessScore -= 20
      }

      // Determine status
      let status: MuscleRecoveryData['status'] = 'ready'
      if (readinessScore >= 80) status = 'fresh'
      else if (readinessScore >= 60) status = 'ready'
      else if (readinessScore >= 40) status = 'fatigued'
      else status = 'overtrained'

      return {
        muscleGroup: muscle.id,
        muscleName: muscle.name,
        category: muscle.category,
        lastTrained,
        daysSinceTraining,
        recentVolume: Math.round(recentVolume),
        baselineVolume: Math.round(baselineVolume),
        readinessScore: Math.round(readinessScore),
        status
      }
    })
  }, [history])

  // Calculate overall readiness
  const overallReadiness = useMemo(() => {
    const avg = recoveryData.reduce((sum, data) => sum + data.readinessScore, 0) / recoveryData.length
    return Math.round(avg)
  }, [recoveryData])

  // Push/Pull balance
  const pushPullBalance = useMemo(() => {
    const pushVolume = recoveryData
      .filter(d => d.category === 'push')
      .reduce((sum, d) => sum + d.recentVolume, 0)
    const pullVolume = recoveryData
      .filter(d => d.category === 'pull')
      .reduce((sum, d) => sum + d.recentVolume, 0)
    
    const total = pushVolume + pullVolume
    return {
      push: total > 0 ? Math.round((pushVolume / total) * 100) : 50,
      pull: total > 0 ? Math.round((pullVolume / total) * 100) : 50
    }
  }, [recoveryData])

  const getStatusColor = (status: MuscleRecoveryData['status']) => {
    switch (status) {
      case 'fresh': return 'text-green-500 bg-green-500/10'
      case 'ready': return 'text-blue-500 bg-blue-500/10'
      case 'fatigued': return 'text-yellow-500 bg-yellow-500/10'
      case 'overtrained': return 'text-red-500 bg-red-500/10'
    }
  }

  const getStatusIcon = (status: MuscleRecoveryData['status']) => {
    switch (status) {
      case 'fresh': return <CheckCircle2 size={16} />
      case 'ready': return <Activity size={16} />
      case 'fatigued': return <AlertCircle size={16} />
      case 'overtrained': return <AlertCircle size={16} />
    }
  }

  const getStatusLabel = (status: MuscleRecoveryData['status']) => {
    switch (status) {
      case 'fresh': return 'Volledig hersteld'
      case 'ready': return 'Klaar voor training'
      case 'fatigued': return 'Vermoeid'
      case 'overtrained': return 'Rust nodig'
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-3xl font-bold">Herstel</h1>
        <p className="text-muted-foreground mt-1">
          Spierherstel en trainingsbelasting
        </p>
      </div>

      {/* Overall Readiness Score */}
      <div className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-red-500/10 border border-primary/20 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Totale Gereedheid</p>
              <h2 className="text-4xl font-bold">{overallReadiness}%</h2>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-red-500 flex items-center justify-center">
              <Activity className="text-white" size={32} />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {overallReadiness >= 80 && 'Je bent volledig hersteld en klaar voor een zware training'}
            {overallReadiness >= 60 && overallReadiness < 80 && 'Goede herstelstatus, je kunt normaal trainen'}
            {overallReadiness >= 40 && overallReadiness < 60 && 'Matige vermoeidheid, overweeg een lichtere sessie'}
            {overallReadiness < 40 && 'Hoge vermoeidheid, rust of deload week aanbevolen'}
          </div>
        </motion.div>
      </div>

      {/* Push/Pull Balance */}
      <div className="px-6 mb-6">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={20} />
          Push/Pull Balans (7 dagen)
        </h3>
        <div className="bg-card border border-white/5 rounded-xl p-4">
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Push</p>
              <p className="text-2xl font-bold">{pushPullBalance.push}%</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-muted-foreground">Pull</p>
              <p className="text-2xl font-bold">{pushPullBalance.pull}%</p>
            </div>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
            <div 
              className="bg-primary" 
              style={{ width: `${pushPullBalance.push}%` }}
            />
            <div 
              className="bg-blue-500" 
              style={{ width: `${pushPullBalance.pull}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {Math.abs(pushPullBalance.push - pushPullBalance.pull) <= 10 
              ? 'Goede balans tussen push en pull' 
              : Math.abs(pushPullBalance.push - pushPullBalance.pull) <= 20
              ? 'Lichte onbalans, overweeg meer ' + (pushPullBalance.push > pushPullBalance.pull ? 'pull' : 'push') + ' werk'
              : 'Duidelijke onbalans, focus op ' + (pushPullBalance.push > pushPullBalance.pull ? 'pull' : 'push') + ' oefeningen'
            }
          </p>
        </div>
      </div>

      {/* Muscle Group Readiness */}
      <div className="px-6 mb-6">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Activity size={20} />
          Spiergroep Gereedheid
        </h3>
        <div className="space-y-3">
          {recoveryData.map((data, index) => (
            <motion.div
              key={data.muscleGroup}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-white/5 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold">{data.muscleName}</h4>
                  <div className={`text-xs mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-full ${getStatusColor(data.status)}`}>
                    {getStatusIcon(data.status)}
                    {getStatusLabel(data.status)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{data.readinessScore}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full transition-all ${
                    data.status === 'fresh' ? 'bg-green-500' :
                    data.status === 'ready' ? 'bg-blue-500' :
                    data.status === 'fatigued' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${data.readinessScore}%` }}
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  Laatste: {data.lastTrained 
                    ? data.daysSinceTraining === 0 
                      ? 'Vandaag'
                      : `${data.daysSinceTraining}d geleden`
                    : 'Nog niet getraind'
                  }
                </div>
                <div className="text-right">
                  Volume: {data.recentVolume.toLocaleString()} kg
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
