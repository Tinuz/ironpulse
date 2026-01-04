'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Trophy, Dumbbell, Edit2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { useData } from '@/components/context/DataContext'

export default function WorkoutDetail() {
  const { history } = useData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workoutId = searchParams.get('id')

  const workout = history.find(w => w.id === workoutId)

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
          <Calendar size={40} className="text-primary" />
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

  const duration = workout.endTime ? Math.round((workout.endTime - workout.startTime) / 60) : 0
  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0)
  const volume = workout.exercises.reduce((acc, ex) => 
    acc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
  , 0)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Workout Details</h1>
        <button 
          onClick={() => router.push(`/workout/${workoutId}?edit=true`)}
          className="p-2 -mr-2 text-primary hover:text-primary/80"
        >
          <Edit2 size={20} />
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Header Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <h2 className="text-3xl font-black italic tracking-tight text-primary">{workout.name}</h2>
            <p className="text-muted-foreground font-mono mt-1">
              {format(new Date(workout.date), 'EEEE, MMMM d, yyyy • h:mm a')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Clock size={10} /> Duration
              </div>
              <div className="text-2xl font-black tabular-nums">
                {duration}<span className="text-sm font-normal text-muted-foreground">m</span>
              </div>
            </div>
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Trophy size={10} /> Volume
              </div>
              <div className="text-2xl font-black tabular-nums">
                {(volume / 1000).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">k</span>
              </div>
            </div>
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Dumbbell size={10} /> Sets
              </div>
              <div className="text-2xl font-black tabular-nums">
                {totalSets}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold uppercase tracking-wide text-muted-foreground">Exercises</h3>
          {workout.exercises.map((exercise, i) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-white/5 rounded-2xl p-5"
            >
              <h4 className="font-bold text-lg mb-4">{exercise.name}</h4>
              
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b border-white/5">
                  <div className="w-6 text-center">Set</div>
                  <div className="text-center">Weight</div>
                  <div className="text-center">Reps</div>
                  <div className="w-6"></div>
                </div>
                
                {/* Sets */}
                {exercise.sets.map((set, idx) => (
                  <div 
                    key={set.id}
                    className={`grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center py-2 px-1 rounded-lg ${
                      set.completed ? 'bg-primary/10' : 'bg-white/5'
                    }`}
                  >
                    <div className="w-6 text-center text-xs font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="text-center font-black text-lg">
                      {set.weight} <span className="text-xs text-muted-foreground">kg</span>
                    </div>
                    <div className="text-center font-black text-lg">
                      {set.reps} <span className="text-xs text-muted-foreground">reps</span>
                    </div>
                    <div className="w-6 flex justify-center">
                      {set.completed && (
                        <div className="w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Exercise Summary */}
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Volume:</span>
                  <span className="ml-2 font-bold">
                    {exercise.sets.filter(s => s.completed).reduce((acc, s) => acc + (s.weight * s.reps), 0)} kg
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="ml-2 font-bold">
                    {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} sets
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
