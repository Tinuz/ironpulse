'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Trophy, Dumbbell, Edit2, Trash2, MoreVertical, Flame, List, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useData } from '@/components/context/DataContext'
import { getBest1RM, roundTo } from '@/components/utils/workoutCalculations'
import WorkoutCalendar from '@/components/WorkoutCalendar'
import type { WorkoutLog } from '@/components/context/DataContext'

export default function History() {
  const { history, deleteWorkout } = useData();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<WorkoutLog[] | null>(null)

  const handleDelete = async (id: string) => {
    await deleteWorkout(id)
    setConfirmDelete(null)
    setMenuOpen(null)
  }

  const handleDateClick = (_date: Date, workouts: WorkoutLog[]) => {
    setSelectedDateWorkouts(workouts)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Workout History</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'calendar' ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
              <Calendar size={40} />
            </div>
            <div>
              <h2 className="text-xl font-bold">No History Yet</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                Complete your first workout to see it logged here.
              </p>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <WorkoutCalendar onDateClick={handleDateClick} />
        ) : (
          <div className="space-y-4">
            {history.map((log, i) => {
              const duration = log.endTime ? Math.round((log.endTime - log.startTime) / 1000 / 60) : 0;
              const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
              const volume = log.exercises.reduce((acc, ex) => 
                acc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
              , 0);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-white/5 rounded-2xl p-5 hover:border-primary/20 transition-colors relative"
                >
                  {/* Action Menu Button */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === log.id ? null : log.id)
                      }}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <MoreVertical size={20} className="text-muted-foreground" />
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpen === log.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/workout/${log.id}?edit=true`)
                            setMenuOpen(null)
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                        >
                          <Edit2 size={16} className="text-primary" />
                          <span className="font-medium">Edit Workout</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(log.id)
                            setMenuOpen(null)
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-left text-red-500"
                        >
                          <Trash2 size={16} />
                          <span className="font-medium">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirm Delete Modal */}
                  {confirmDelete === log.id && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4"
                      >
                        <h3 className="text-xl font-bold">Delete Workout?</h3>
                        <p className="text-muted-foreground">
                          Are you sure you want to delete "{log.name}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 py-3 bg-white/5 rounded-full font-bold hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="flex-1 py-3 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  <div 
                    onClick={() => router.push(`/workout/${log.id}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <h3 className="font-bold text-lg text-primary">{log.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono mt-1">
                          {format(new Date(log.date), 'EEEE, MMM d • h:mm a')}
                        </p>
                      </div>
                      {duration > 0 && (
                        <div className="flex items-center gap-1 text-xs font-bold bg-white/5 px-2 py-1 rounded-md text-muted-foreground">
                          <Clock size={12} /> {duration}m
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/5 p-3 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                          <Trophy size={10} /> Volume
                        </div>
                        <div className="text-xl font-black tabular-nums">
                          {volume >= 1000 
                            ? `${(volume / 1000).toFixed(1)}k` 
                            : volume.toFixed(0)
                          } <span className="text-xs font-normal text-muted-foreground">kg</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                          <Dumbbell size={10} /> Sets
                        </div>
                        <div className="text-xl font-black tabular-nums">
                          {totalSets}
                        </div>
                      </div>
                      {log.totalCalories && log.totalCalories > 0 && (
                        <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                          <div className="text-[10px] uppercase font-bold text-primary/80 mb-1 flex items-center gap-1">
                            <Flame size={10} /> Kcal
                          </div>
                          <div className="text-xl font-black tabular-nums text-primary">
                            ~{log.totalCalories}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {log.exercises.map((ex) => {
                        const best = getBest1RM(ex);
                        return (
                          <div key={ex.id} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                            <span className="font-medium text-foreground/80">{ex.name}</span>
                            <div className="flex items-center gap-3">
                              {best && (
                                <span className="text-xs font-bold text-primary">
                                  {roundTo(best.oneRM, 0.5)}kg 1RM
                                </span>
                              )}
                              <span className="text-muted-foreground font-mono text-xs">
                                {ex.sets.filter(s => s.completed).length} sets
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}

        {/* Multi-workout day modal */}
        {selectedDateWorkouts && selectedDateWorkouts.length > 1 && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDateWorkouts(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {selectedDateWorkouts.length} Workouts
                </h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedDateWorkouts[0].date), 'MMM d, yyyy')}
                </p>
              </div>

              <div className="space-y-3">
                {selectedDateWorkouts.map((workout) => {
                  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0)
                  const volume = workout.exercises.reduce((acc, ex) => 
                    acc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
                  , 0)

                  return (
                    <button
                      key={workout.id}
                      onClick={() => {
                        setSelectedDateWorkouts(null)
                        router.push(`/workout/${workout.id}`)
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 text-left transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-primary">{workout.name}</h4>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(workout.date), 'h:mm a')}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          <span className="font-bold text-foreground">{totalSets}</span> sets
                        </span>
                        <span className="text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : volume.toFixed(0)}
                          </span> kg
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setSelectedDateWorkouts(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-full font-bold transition-colors mt-4"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
