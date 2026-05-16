'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Plus, Edit2, Trash2, RotateCcw, MoreVertical, X, Activity, Battery, BatteryWarning, BatteryMedium } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { format, formatDistance, differenceInCalendarDays, subDays } from 'date-fns'
import { DELOAD } from '@/lib/workoutConfig'
import { roundTo } from '@/components/utils/workoutCalculations'
import { nl, enUS } from 'date-fns/locale'
import PreWorkoutBriefingModal from '@/components/PreWorkoutBriefingModal'
import DailyCheckInWidget from '@/components/DailyCheckInWidget'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
}

export default function PlayPage() {
  const { schemas, history, startWorkout, updateActiveWorkout, deleteSchema } = useData()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [schemaMenuOpen, setSchemaMenuOpen] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [briefingSchemaId, setBriefingSchemaId] = useState<string | null>(null)

  const recentWorkouts = history.slice(0, 5)

  // Muscle groups for recovery calculation
  const MUSCLE_GROUPS = [
    { id: 'chest', name: 'Borst' },
    { id: 'shoulders', name: 'Schouders' },
    { id: 'triceps', name: 'Triceps' },
    { id: 'back', name: 'Rug' },
    { id: 'biceps', name: 'Biceps' },
    { id: 'legs', name: 'Benen' },
    { id: 'core', name: 'Core' },
  ]

  // Calculate overall recovery status using scientific muscle group recovery
  const recoveryStatus = useMemo(() => {
    if (history.length === 0) return { score: 100, status: 'fresh', label: 'Fris', color: 'green' }
    
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const fourWeeksAgo = subDays(now, 28)
    
    // Calculate recovery per muscle group (same logic as RecoveryDashboard)
    const muscleRecoveryScores = MUSCLE_GROUPS.map(muscle => {
      // Get workouts for this muscle group
      const muscleWorkouts = history.filter(workout => {
        return workout.exercises.some(ex => {
          // Check muscleGroup field first
          if (ex.muscleGroup) {
            const muscleGroupMap: Record<string, string[]> = {
              'chest': ['chest'],
              'shoulders': ['shoulders'],
              'triceps': ['triceps'],
              'back': ['back', 'lats', 'middle-back', 'lower-back', 'traps'],
              'biceps': ['biceps'],
              'legs': ['legs', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
              'core': ['core', 'abs', 'obliques'],
            }
            const mappedGroups = muscleGroupMap[muscle.id] || []
            if (mappedGroups.includes(ex.muscleGroup)) return true
          }
          // Fallback to name-based detection
          return ex.name.toLowerCase().includes(muscle.id) ||
                 ex.name.toLowerCase().includes(muscle.name.toLowerCase())
        })
      })

      // Find last trained date
      const lastWorkout = muscleWorkouts[0]
      const daysSinceTraining = lastWorkout 
        ? differenceInCalendarDays(now, new Date(lastWorkout.date))
        : 999

      // Helper to check if exercise belongs to muscle
      const exerciseBelongsToMuscle = (ex: any) => {
        if (ex.muscleGroup) {
          const muscleGroupMap: Record<string, string[]> = {
            'chest': ['chest'],
            'shoulders': ['shoulders'],
            'triceps': ['triceps'],
            'back': ['back', 'lats', 'middle-back', 'lower-back', 'traps'],
            'biceps': ['biceps'],
            'legs': ['legs', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
            'core': ['core', 'abs', 'obliques'],
          }
          const mappedGroups = muscleGroupMap[muscle.id] || []
          if (mappedGroups.includes(ex.muscleGroup)) return true
        }
        return ex.name.toLowerCase().includes(muscle.id) ||
               ex.name.toLowerCase().includes(muscle.name.toLowerCase())
      }

      // Calculate recent volume (last 7 days)
      const recentWorkouts = muscleWorkouts.filter(w => new Date(w.date) >= sevenDaysAgo)
      const recentVolume = recentWorkouts.reduce((total, workout) => {
        return total + workout.exercises
          .filter(exerciseBelongsToMuscle)
          .reduce((exTotal, ex) => {
            return exTotal + ex.sets
              .filter(s => s.completed && !s.isWarmup)
              .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0)
          }, 0)
      }, 0)

      // Calculate baseline volume (4 weeks average)
      const baselineWorkouts = muscleWorkouts.filter(w => new Date(w.date) >= fourWeeksAgo)
      const baselineVolume = baselineWorkouts.length > 0
        ? baselineWorkouts.reduce((total, workout) => {
            return total + workout.exercises
              .filter(exerciseBelongsToMuscle)
              .reduce((exTotal, ex) => {
                return exTotal + ex.sets
                  .filter(s => s.completed && !s.isWarmup)
                  .reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0)
              }, 0)
          }, 0) / 4
        : 0

      // Calculate readiness score - Scientific recovery curve
      let readinessScore = 0
      if (daysSinceTraining === 0) readinessScore = 0      // Just trained
      else if (daysSinceTraining === 1) readinessScore = 20  // 1 day
      else if (daysSinceTraining === 2) readinessScore = 45  // 2 days
      else if (daysSinceTraining === 3) readinessScore = 70  // 3 days
      else if (daysSinceTraining === 4) readinessScore = 90  // 4 days
      else if (daysSinceTraining >= 5) readinessScore = 100  // Fully recovered
      else readinessScore = 100 // Never trained

      // Adjust for volume load
      if (baselineVolume > 0 && recentVolume > 0) {
        const volumeRatio = recentVolume / baselineVolume
        if (volumeRatio > 2.0) readinessScore = Math.max(0, readinessScore - 30)
        else if (volumeRatio > 1.5) readinessScore = Math.max(0, readinessScore - 20)
        else if (volumeRatio > 1.2) readinessScore = Math.max(0, readinessScore - 10)
        
        // Deload bonus
        if (volumeRatio < 0.5 && daysSinceTraining >= 2) {
          readinessScore = Math.min(100, readinessScore + 15)
        }
      }

      return Math.round(readinessScore)
    })

    // Overall score = average of all muscle groups
    const score = Math.round(
      muscleRecoveryScores.reduce((sum, s) => sum + s, 0) / muscleRecoveryScores.length
    )

    // Determine status
    let status: 'fresh' | 'ready' | 'fatigued' | 'overtrained' = 'ready'
    let label = 'Klaar'
    let color = 'blue'
    
    if (score >= 85) {
      status = 'fresh'
      label = 'Fris'
      color = 'green'
    } else if (score >= 50) {
      status = 'ready'
      label = 'Klaar'
      color = 'blue'
    } else if (score >= 25) {
      status = 'fatigued'
      label = 'Vermoeid'
      color = 'yellow'
    } else {
      status = 'overtrained'
      label = 'Rust'
      color = 'red'
    }
    
    // Calculate days since last workout for display
    const lastWorkout = history[0]
    const daysSinceLastWorkout = lastWorkout 
      ? differenceInCalendarDays(now, new Date(lastWorkout.date))
      : 999
    
    return { score, status, label, color, daysSinceLastWorkout }
  }, [history])

  const handleStartSchema = (schemaId: string) => {
    // Open briefing modal instead of starting immediately
    setBriefingSchemaId(schemaId)
  }

  const handleBriefingStart = (deloadMode: boolean) => {
    const schema = schemas.find(s => s.id === briefingSchemaId!)
    if (!schema) return
    const workout = startWorkout(schema)
    if (deloadMode) {
      // Apply weight reduction to all exercises so WorkoutLogger sees reduced weights on load
      const reducedExercises = workout.exercises.map(exercise => {
        if (exercise.type === 'cardio') return exercise
        return {
          ...exercise,
          sets: exercise.sets.map(set => ({
            ...set,
            weight: roundTo((set.weight ?? 0) * DELOAD.WEIGHT_REDUCTION_FACTOR, 0.5)
          })),
          oneRepMax: exercise.oneRepMax
            ? roundTo(exercise.oneRepMax * DELOAD.WEIGHT_REDUCTION_FACTOR, 0.5)
            : undefined
        }
      })
      updateActiveWorkout({ ...workout, exercises: reducedExercises, isDeload: true })
    }
    setBriefingSchemaId(null)
    router.push('/workout')
  }

  const handleQuickStart = () => {
    startWorkout()
    router.push('/workout')
  }

  const handleRepeatWorkout = (workoutId: string) => {
    const workout = history.find(w => w.id === workoutId)
    if (!workout) return

    // Look up the originating schema so we can restore rep range even for old history entries
    const schema = schemas.find(s => s.id === workout.schemaId)

    const clonedExercises = workout.exercises.map(ex => {
      const schemaEx = schema?.exercises.find(se => se.id === ex.exerciseId)
      return {
        ...ex,
        id: crypto.randomUUID(),
        targetMinReps: ex.targetMinReps ?? schemaEx?.minReps,
        targetMaxReps: ex.targetMaxReps ?? (schemaEx && schemaEx.targetReps > 0 ? schemaEx.targetReps : undefined),
        sets: ex.sets.map(set => ({
          id: crypto.randomUUID(),
          reps: set.reps || schemaEx?.targetReps || 0,
          weight: set.weight,
          completed: false
        }))
      }
    })

    startWorkout(undefined, clonedExercises, workout.name)
    router.push('/workout')
  }

  const handleDeleteSchema = (schemaId: string) => {
    deleteSchema(schemaId)
    setDeleteConfirmId(null)
    setSchemaMenuOpen(null)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="font-black text-2xl">{t.dashboard.startWorkout}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t.schema.chooseRoutineOrRepeat}</p>
          </div>
          
          {/* Recovery Status Badge */}
          <button
            onClick={() => router.push('/recovery')}
            className={`ml-4 bg-${recoveryStatus.color}-500/10 border border-${recoveryStatus.color}-500/30 rounded-xl px-3 py-2 hover:bg-${recoveryStatus.color}-500/20 transition-colors flex items-center gap-2 min-w-[110px]`}
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                {recoveryStatus.status === 'fresh' && <Battery size={16} className={`text-${recoveryStatus.color}-500`} />}
                {recoveryStatus.status === 'ready' && <BatteryMedium size={16} className={`text-${recoveryStatus.color}-500`} />}
                {recoveryStatus.status === 'fatigued' && <BatteryWarning size={16} className={`text-${recoveryStatus.color}-500`} />}
                {recoveryStatus.status === 'overtrained' && <Activity size={16} className={`text-${recoveryStatus.color}-500`} />}
                <span className={`text-xs font-bold text-${recoveryStatus.color}-500 uppercase tracking-wide`}>
                  {recoveryStatus.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {recoveryStatus.daysSinceLastWorkout === 0 
                  ? 'Vandaag getraind' 
                  : recoveryStatus.daysSinceLastWorkout === 1
                  ? 'Gisteren getraind'
                  : `${recoveryStatus.daysSinceLastWorkout}d geleden`}
              </span>
            </div>
            <div className={`text-2xl font-black text-${recoveryStatus.color}-500`}>
              {recoveryStatus.score}
              <span className="text-xs">%</span>
            </div>
          </button>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-8">
        {/* Daily check-in & sleep quality */}
        <DailyCheckInWidget />

        {/* Schemas Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Play size={20} className="text-primary" /> {t.schema.myRoutines}
            </h3>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="text-xs font-bold text-primary uppercase tracking-wide hover:underline flex items-center gap-1"
            >
              <Plus size={14} />
              {t.schema.new}
            </button>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3"
          >
            {/* Quick Start */}
            <motion.button
              variants={item}
              onClick={handleQuickStart}
              className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-dashed border-primary/40 rounded-2xl p-4 hover:border-primary transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={20} className="text-primary" fill="currentColor" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-lg">{t.schema.freestyleWorkout}</h4>
                    <p className="text-xs text-muted-foreground">{t.schema.startWithoutRoutine}</p>
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Schema Cards */}
            {schemas.map((schema) => (
              <motion.div
                key={schema.id}
                variants={item}
                className="relative group"
              >
                <div 
                  onClick={() => handleStartSchema(schema.id)}
                  className={`bg-gradient-to-br ${schema.color || 'from-orange-500 to-red-500'} p-[2px] rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform shadow-lg`}
                >
                  <div className="bg-card rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${schema.color || 'from-orange-500 to-red-500'} flex items-center justify-center shadow-lg`}>
                          <Play size={20} className="text-white" fill="white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg leading-tight">{schema.name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {schema.mode === 'circuit' && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">⚡ Circuit</span>
                            )}
                            {schema.exercises.length} {t.schema.exerciseCount}
                            {schema.mode === 'circuit' && schema.circuitConfig && (
                              <span className="text-muted-foreground/60">· {schema.circuitConfig.rounds}×</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSchemaMenuOpen(schemaMenuOpen === schema.id ? null : schema.id)
                        }}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Context Menu */}
                <AnimatePresence>
                  {schemaMenuOpen === schema.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 bg-card border border-white/10 rounded-xl shadow-2xl p-2 z-20 min-w-[160px]"
                    >
                      <button
                        onClick={() => {
                          router.push(`/schema?edit=${schema.id}`)
                          setSchemaMenuOpen(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 rounded-lg transition-colors text-left"
                      >
                        <Edit2 size={16} />
                        {t.common.edit}
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmId(schema.id)
                          setSchemaMenuOpen(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                      >
                        <Trash2 size={16} />
                        {t.common.delete}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {deleteConfirmId === schema.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full"
                      >
                        <h3 className="font-bold text-lg mb-2">{t.schema.deleteRoutineConfirm}</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          {t.schema.deleteRoutineMessage.replace('{name}', schema.name)}
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm transition-colors"
                          >
                            {t.common.cancel}
                          </button>
                          <button
                            onClick={() => handleDeleteSchema(schema.id)}
                            className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors"
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Recent Workouts */}
        {recentWorkouts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <RotateCcw size={20} className="text-green-500" /> {t.schema.recentWorkouts}
            </h3>
            
            <div className="space-y-3">
              {recentWorkouts.map((workout) => (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/workout/${workout.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{workout.name}</h4>
                        <span className="text-xs text-muted-foreground">
                          • {workout.exercises.length} {t.schema.exerciseCount}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(new Date(workout.date), new Date(), { 
                          addSuffix: true, 
                          locale: language === 'nl' ? nl : enUS 
                        })}
                        {' • '}
                        {format(new Date(workout.date), 'PPP', { locale: language === 'nl' ? nl : enUS })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRepeatWorkout(workout.id)
                        }}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-all duration-200"
                        title={t.schema.repeatWorkout}
                      >
                        <RotateCcw size={18} className="text-green-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pre-Workout Briefing Modal */}
      {briefingSchemaId && (() => {
        const briefingSchema = schemas.find(s => s.id === briefingSchemaId)
        if (!briefingSchema) return null
        return (
          <PreWorkoutBriefingModal
            schema={briefingSchema}
            onStart={handleBriefingStart}
            onCancel={() => setBriefingSchemaId(null)}
          />
        )
      })()}

      {/* Create Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCreateModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{t.schema.newRoutine}</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t.schema.createNewRoutineDescription}
              </p>
              <button
                onClick={() => {
                  router.push('/schema')
                  setCreateModalOpen(false)
                }}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                {t.schema.buildRoutine}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
