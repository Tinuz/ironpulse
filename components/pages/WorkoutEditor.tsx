'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Plus, Trash2, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { useData, WorkoutLog, WorkoutExercise, WorkoutSet } from '@/components/context/DataContext'

export default function WorkoutEditor() {
  const { history, updateWorkout } = useData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workoutId = searchParams.get('id')

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
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
          <ArrowLeft size={40} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">WORKOUT NOT FOUND</h1>
          <p className="text-muted-foreground mt-2">This workout doesn't exist or was deleted.</p>
        </div>
        <button 
          onClick={() => router.push('/history')}
          className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Edit Workout</h1>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="p-2 -mr-2 text-primary hover:text-primary/80 disabled:opacity-50"
        >
          <Save size={24} />
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Workout Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <label className="text-xs uppercase font-bold text-muted-foreground">Workout Name</label>
          <input
            type="text"
            value={workoutData.name}
            onChange={(e) => updateWorkoutName(e.target.value)}
            className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-muted-foreground font-mono text-sm">
            {format(new Date(workoutData.date), 'EEEE, MMMM d, yyyy • h:mm a')}
          </p>
        </motion.div>

        {/* Exercises */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold uppercase tracking-wide text-muted-foreground">Exercises</h3>
            <button
              onClick={addExercise}
              className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors text-sm font-bold"
            >
              <Plus size={16} /> Add Exercise
            </button>
          </div>

          {workoutData.exercises.map((exercise, i) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-white/5 rounded-2xl p-5 space-y-4"
            >
              {/* Exercise Header */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => updateExerciseName(exercise.id, e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-bold focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={() => removeExercise(exercise.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Sets */}
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b border-white/5">
                  <div className="w-6 text-center">Set</div>
                  <div className="text-center">Weight (kg)</div>
                  <div className="text-center">Reps</div>
                  <div className="w-6"></div>
                  <div className="w-6"></div>
                </div>

                {exercise.sets.map((set, idx) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 items-center py-2 px-1 rounded-lg ${
                      set.completed ? 'bg-primary/10' : 'bg-white/5'
                    }`}
                  >
                    <div className="w-6 text-center text-xs font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(exercise.id, set.id, { weight: Number(e.target.value) })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:border-primary/50 transition-colors"
                      min="0"
                      step="0.5"
                    />
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(exercise.id, set.id, { reps: Number(e.target.value) })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:border-primary/50 transition-colors"
                      min="0"
                    />
                    <button
                      onClick={() => toggleSetCompleted(exercise.id, set.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        set.completed 
                          ? 'bg-primary/20 border-primary' 
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {set.completed && <Check size={14} className="text-primary" />}
                    </button>
                    <button
                      onClick={() => removeSet(exercise.id, set.id)}
                      className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addSet(exercise.id)}
                  className="w-full py-2 border-2 border-dashed border-white/10 rounded-lg text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors text-sm font-bold"
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
          className="w-full py-4 bg-primary text-black font-bold rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
