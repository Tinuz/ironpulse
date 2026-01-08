'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Plus, Edit2, Trash2, RotateCcw, MoreVertical, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { format, formatDistance } from 'date-fns'
import { nl } from 'date-fns/locale'

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
  const { schemas, history, startWorkout, deleteSchema } = useData()
  const router = useRouter()
  const [schemaMenuOpen, setSchemaMenuOpen] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const recentWorkouts = history.slice(0, 5)

  const handleStartSchema = (schemaId: string) => {
    const schema = schemas.find(s => s.id === schemaId)
    if (schema) {
      startWorkout(schema)
      router.push('/workout')
    }
  }

  const handleQuickStart = () => {
    startWorkout()
    router.push('/workout')
  }

  const handleRepeatWorkout = (workoutId: string) => {
    const workout = history.find(w => w.id === workoutId)
    if (!workout) return

    const clonedExercises = workout.exercises.map(ex => ({
      id: crypto.randomUUID(),
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets.map(set => ({
        id: crypto.randomUUID(),
        reps: set.reps,
        weight: set.weight,
        completed: false
      }))
    }))

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
        <h1 className="font-black text-2xl">Start Workout</h1>
        <p className="text-xs text-muted-foreground mt-1">Kies een routine of herhaal een recente workout</p>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-8">
        {/* Schemas Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Play size={20} className="text-primary" /> Mijn Routines
            </h3>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="text-xs font-bold text-primary uppercase tracking-wide hover:underline flex items-center gap-1"
            >
              <Plus size={14} />
              Nieuw
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
                    <h4 className="font-bold text-lg">Freestyle Workout</h4>
                    <p className="text-xs text-muted-foreground">Start zonder routine</p>
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
                          <p className="text-xs text-muted-foreground">{schema.exercises.length} exercises</p>
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
                        Bewerken
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmId(schema.id)
                          setSchemaMenuOpen(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                      >
                        <Trash2 size={16} />
                        Verwijderen
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
                        <h3 className="font-bold text-lg mb-2">Routine verwijderen?</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Weet je zeker dat je "{schema.name}" wilt verwijderen? Dit kan niet ongedaan worden.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm transition-colors"
                          >
                            Annuleren
                          </button>
                          <button
                            onClick={() => handleDeleteSchema(schema.id)}
                            className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors"
                          >
                            Verwijderen
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
              <RotateCcw size={20} className="text-green-500" /> Recente Workouts
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
                          • {workout.exercises.length} exercises
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(new Date(workout.date), new Date(), { 
                          addSuffix: true, 
                          locale: nl 
                        })}
                        {' • '}
                        {format(new Date(workout.date), 'PPP', { locale: nl })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRepeatWorkout(workout.id)
                        }}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-all duration-200"
                        title="Herhaal workout"
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
                <h3 className="font-bold text-lg">Nieuwe Routine</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Maak een nieuwe workout routine met je favoriete oefeningen.
              </p>
              <button
                onClick={() => {
                  router.push('/schema')
                  setCreateModalOpen(false)
                }}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Routine Samenstellen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
