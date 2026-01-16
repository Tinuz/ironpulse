'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Plus, Trash2, Check } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { useData, WorkoutLog, WorkoutExercise, WorkoutSet } from '@/components/context/DataContext'

export default function WorkoutEditor() {
  const { history, updateWorkout } = useData()
  const router = useRouter()
  const pathname = usePathname()
  
  // Get workout ID from URL path (e.g., /workout/abc123)
  const workoutId = pathname.split('/workout/')[1]

  const originalWorkout = history.find(w => w.id === workoutId)
  
  const [workoutData, setWorkoutData] = useState<WorkoutLog | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (originalWorkout) {
      // Deep copy to avoid mutating original
      setWorkoutData(JSON.parse(JSON.stringify(originalWorkout)))
    }
  }, [originalWorkout])

  if (!originalWorkout || !workoutData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6 bg-bg-primary">
        <div className="h-20 w-20 rounded-professional bg-accent-primary/20 flex items-center justify-center border border-accent-primary/30">
          <ArrowLeft size={40} className="text-accent-primary" />
        </div>
        <div>
          <h1 className="text-h1 font-bold text-txt-primary">WORKOUT NOT FOUND</h1>
          <p className="text-txt-secondary mt-2">This workout doesn't exist or was deleted.</p>
        </div>
        <button 
          onClick={() => router.push('/history')}
          className="px-8 py-4 bg-accent-primary text-txt-primary font-bold rounded-professional hover:bg-accent-secondary transition-all shadow-elevated"
        >
          Back to History
        </button>
      </div>
    )
  }

  const handleSave = async () => {
    if (!workoutId || !workoutData) return
    
    setIsSaving(true)
    try {
      await updateWorkout(workoutId, workoutData)
      router.push(`/workout/${workoutId}`)
    } catch (error) {
      console.error('Error saving workout:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateWorkoutName = (name: string) => {
    setWorkoutData(prev => prev ? { ...prev, name } : null)
  }

  const updateExerciseName = (exerciseId: string, name: string) => {
    setWorkoutData(prev => {
      if (!prev) return null
      return {
        ...prev,
        exercises: prev.exercises.map(ex => 
          ex.id === exerciseId ? { ...ex, name } : ex
        )
      }
    })
  }

  const updateSet = (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
    setWorkoutData(prev => {
      if (!prev) return null
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return {
              ...ex,
              sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
            }
          }
          return ex
        })
      }
    })
  }

  const addSet = (exerciseId: string) => {
    setWorkoutData(prev => {
      if (!prev) return null
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const newSet: WorkoutSet = {
              id: crypto.randomUUID(),
              weight: 0,
              reps: 0,
              completed: false
            }
            return {
              ...ex,
              sets: [...ex.sets, newSet]
            }
          }
          return ex
        })
      }
    })
  }

  const removeSet = (exerciseId: string, setId: string) => {
    setWorkoutData(prev => {
      if (!prev) return null
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return {
              ...ex,
              sets: ex.sets.filter(s => s.id !== setId)
            }
          }
          return ex
        })
      }
    })
  }

  const addExercise = () => {
    setWorkoutData(prev => {
      if (!prev) return null
      const newExercise: WorkoutExercise = {
        id: crypto.randomUUID(),
        exerciseId: crypto.randomUUID(),
        name: 'New Exercise',
        sets: []
      }
      return {
        ...prev,
        exercises: [...prev.exercises, newExercise]
      }
    })
  }

  const removeExercise = (exerciseId: string) => {
    setWorkoutData(prev => {
      if (!prev) return null
      return {
        ...prev,
        exercises: prev.exercises.filter(ex => ex.id !== exerciseId)
      }
    })
  }

  const toggleSetCompleted = (exerciseId: string, setId: string) => {
    setWorkoutData(prev => {
      if (!prev) return null
      return {
        ...prev,
        exercises: prev.exercises.map(ex => {
          if (ex.id === exerciseId) {
            return {
              ...ex,
              sets: ex.sets.map(s => 
                s.id === setId ? { ...s, completed: !s.completed } : s
              )
            }
          }
          return ex
        })
      }
    })
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-xl border-b border-border-default p-4 flex items-center justify-between shadow-card">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-txt-secondary hover:text-txt-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-xl text-txt-primary">Edit Workout</h1>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="p-2 -mr-2 text-accent-primary hover:text-accent-secondary disabled:opacity-50 transition-colors"
        >
          <Save size={24} />
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Workout Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <label className="text-xs uppercase font-semibold text-txt-tertiary tracking-wider">Workout Name</label>
          <input
            type="text"
            value={workoutData.name}
            onChange={(e) => updateWorkoutName(e.target.value)}
            className="w-full bg-bg-secondary border border-border-default rounded-professional px-5 py-4 text-xl font-bold text-txt-primary focus:outline-none focus:border-accent-primary transition-colors shadow-card"
          />
          <p className="text-txt-tertiary text-sm">
            {format(new Date(workoutData.date), 'EEEE, MMMM d, yyyy • h:mm a')}
          </p>
        </motion.div>

        {/* Exercises */}
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold uppercase tracking-wider text-txt-tertiary">Exercises</h3>
            <button
              onClick={addExercise}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary/90 text-txt-primary rounded-professional hover:bg-accent-primary transition-all shadow-card text-sm font-bold"
            >
              <Plus size={18} /> Add Exercise
            </button>
          </div>

          {workoutData.exercises.map((exercise, i) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-bg-secondary border border-border-default rounded-professional p-6 space-y-5 shadow-card"
            >
              {/* Exercise Header */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => updateExerciseName(exercise.id, e.target.value)}
                  className="flex-1 bg-bg-tertiary border border-border-default rounded-professional px-4 py-3 font-bold text-txt-primary focus:outline-none focus:border-accent-primary transition-colors"
                />
                <button
                  onClick={() => removeExercise(exercise.id)}
                  className="p-2.5 text-accent-primary hover:bg-accent-primary/10 rounded-professional transition-colors border border-border-default"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Sets */}
              <div className="space-y-3">
                <div className="grid grid-cols-[32px_1fr_1fr_28px_28px] gap-2 text-[10px] uppercase font-semibold text-txt-tertiary pb-3 border-b border-border-default tracking-wider">
                  <div className="text-center">Set</div>
                  <div className="text-center">Weight (kg)</div>
                  <div className="text-center">Reps</div>
                  <div></div>
                  <div></div>
                </div>

                {exercise.sets.map((set, idx) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-[32px_1fr_1fr_28px_28px] gap-2 items-center py-2.5 px-2 rounded-professional ${
                      set.completed ? 'bg-accent-primary/10 border border-accent-primary/20' : 'bg-bg-tertiary border border-border-default'
                    }`}
                  >
                    <div className="text-center text-sm font-semibold text-txt-secondary">
                      {idx + 1}
                    </div>
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(exercise.id, set.id, { weight: Number(e.target.value) })}
                      className="bg-bg-primary border border-border-default rounded-professional px-2 py-2.5 text-center font-bold text-txt-primary focus:outline-none focus:border-accent-primary transition-colors min-w-0"
                      min="0"
                      step="0.5"
                    />
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(exercise.id, set.id, { reps: Number(e.target.value) })}
                      className="bg-bg-primary border border-border-default rounded-professional px-2 py-2.5 text-center font-bold text-txt-primary focus:outline-none focus:border-accent-primary transition-colors min-w-0"
                      min="0"
                    />
                    <button
                      onClick={() => toggleSetCompleted(exercise.id, set.id)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                        set.completed 
                          ? 'bg-accent-primary/20 border-accent-primary' 
                          : 'border-border-light hover:border-accent-primary/50'
                      }`}
                    >
                      {set.completed && <Check size={14} className="text-accent-primary" />}
                    </button>
                    <button
                      onClick={() => removeSet(exercise.id, set.id)}
                      className="w-7 h-7 flex items-center justify-center text-accent-primary hover:bg-accent-primary/10 rounded-professional transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addSet(exercise.id)}
                  className="w-full py-3 border-2 border-dashed border-border-default rounded-professional text-txt-secondary hover:border-accent-primary/50 hover:text-accent-primary transition-colors text-sm font-semibold"
                >
                  + Add Set
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-accent-primary text-txt-primary font-bold rounded-professional hover:bg-accent-secondary transition-all shadow-elevated disabled:opacity-50 disabled:hover:bg-accent-primary text-lg"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
