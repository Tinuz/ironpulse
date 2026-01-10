'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, ChevronLeft, Sparkles, Target, Dumbbell,
  Calendar, Clock, Zap, TrendingUp, Heart, Flame, Activity,
  CheckCircle2, AlertCircle, Loader2, Plus, RefreshCw
} from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { useRouter } from 'next/navigation'
import { 
  generateWorkoutProgram, 
  GeneratedWorkoutProgram,
  WorkoutGenerationOptions,
  estimateGenerationCost
} from '@/lib/workoutGenerator'

interface WorkoutGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4

export default function WorkoutGeneratorModal({ isOpen, onClose }: WorkoutGeneratorModalProps) {
  const { userProfile, history, addSchema } = useData()
  const router = useRouter()
  
  // Wizard state
  const [step, setStep] = useState<Step>(1)
  
  // Form state
  const [fitnessGoal, setFitnessGoal] = useState<WorkoutGenerationOptions['fitnessGoal']>('hypertrophy')
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['Barbell', 'Dumbbell', 'Bodyweight'])
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [timePerSession, setTimePerSession] = useState(60)
  const [preferredSplit, setPreferredSplit] = useState<WorkoutGenerationOptions['preferredSplit']>('push_pull_legs')
  const [targetMuscleGroups, setTargetMuscleGroups] = useState<string[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedWorkoutProgram | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (step < 4) setStep((step + 1) as Step)
  }

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const options: WorkoutGenerationOptions = {
        fitnessGoal,
        availableEquipment,
        daysPerWeek,
        timePerSession,
        preferredSplit,
        targetMuscleGroups: targetMuscleGroups.length > 0 ? targetMuscleGroups : undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        experienceLevelOverride: experienceLevel
      }

      const program = await generateWorkoutProgram(userProfile ?? undefined, history, options)
      setGeneratedProgram(program)
      setStep(4)
    } catch (err: any) {
      console.error('Failed to generate program:', err)
      setError(err.message || 'Er ging iets mis bij het genereren van het programma')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveProgram = async () => {
    if (!generatedProgram) {
      console.error('No program to save')
      return
    }

    // Prevent duplicate saves
    if (isSaving) {
      console.log('⏳ Already saving, skipping duplicate call')
      return
    }

    setIsSaving(true)
    console.log('💾 Saving program:', generatedProgram.programName)
    console.log('📋 Workouts to save:', generatedProgram.workouts.length)

    try {
      // Create a schema for each workout in the program
      for (const workout of generatedProgram.workouts) {
        const schema = {
          id: crypto.randomUUID(),
          name: workout.name,
          exercises: workout.exercises.map(ex => ({
            id: crypto.randomUUID(),
            name: ex.name,
            targetSets: ex.sets,
            targetReps: typeof ex.reps === 'string' 
              ? parseInt(ex.reps.split('-')[1]) || parseInt(ex.reps) 
              : ex.reps,
            startWeight: undefined
          })),
          color: getWorkoutColor(workout.name)
        }

        console.log('✅ Saving schema:', schema.name, 'with', schema.exercises.length, 'exercises')
        await addSchema(schema)
      }

      console.log('🎉 All workouts saved successfully!')
      
      // Close modal and navigate to schemas
      onClose()
      router.push('/schema')
    } catch (err) {
      console.error('❌ Failed to save program:', err)
      setError('Kon programma niet opslaan: ' + (err as Error).message)
      setIsSaving(false)
    }
  }

  const handleRegenerate = () => {
    setGeneratedProgram(null)
    setStep(1)
  }

  const toggleEquipment = (equipment: string) => {
    setAvailableEquipment(prev =>
      prev.includes(equipment)
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    )
  }

  const toggleMuscleGroup = (group: string) => {
    setTargetMuscleGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    )
  }

  const getWorkoutColor = (workoutName: string): string => {
    const colors = [
      'from-orange-500 to-red-500',
      'from-blue-500 to-purple-500',
      'from-green-500 to-teal-500',
      'from-pink-500 to-rose-500',
      'from-yellow-500 to-orange-500',
      'from-indigo-500 to-blue-500',
      'from-purple-500 to-pink-500'
    ]
    const index = workoutName.length % colors.length
    return colors[index]
  }

  const estimatedCost = estimateGenerationCost({
    fitnessGoal,
    availableEquipment,
    daysPerWeek,
    timePerSession,
    preferredSplit
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-background border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-red-500 rounded-xl">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black">AI Workout Generator</h2>
                <p className="text-xs text-muted-foreground">
                  {step === 1 && 'Wat is je doel?'}
                  {step === 2 && 'Equipment & Schema'}
                  {step === 3 && 'Extra opties (optioneel)'}
                  {step === 4 && generatedProgram && 'Je nieuwe programma!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress indicator */}
          {step < 4 && (
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 1 && <Step1Goals fitnessGoal={fitnessGoal} setFitnessGoal={setFitnessGoal} />}
            {step === 2 && (
              <Step2Equipment
                availableEquipment={availableEquipment}
                toggleEquipment={toggleEquipment}
                daysPerWeek={daysPerWeek}
                setDaysPerWeek={setDaysPerWeek}
                timePerSession={timePerSession}
                setTimePerSession={setTimePerSession}
                preferredSplit={preferredSplit}
                setPreferredSplit={setPreferredSplit}
              />
            )}
            {step === 3 && (
              <Step3Advanced
                experienceLevel={experienceLevel}
                setExperienceLevel={setExperienceLevel}
                targetMuscleGroups={targetMuscleGroups}
                toggleMuscleGroup={toggleMuscleGroup}
                additionalNotes={additionalNotes}
                setAdditionalNotes={setAdditionalNotes}
              />
            )}
            {step === 4 && generatedProgram && (
              <Step4Results
                program={generatedProgram}
                onSave={handleSaveProgram}
                onRegenerate={handleRegenerate}
                isSaving={isSaving}
              />
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-500">Error</p>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {step === 3 && `Geschatte kosten: $${estimatedCost.toFixed(3)}`}
            </div>
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-bold flex items-center gap-2 transition-colors"
                  disabled={isGenerating}
                >
                  <ChevronLeft size={18} />
                  Terug
                </button>
              )}
              {step < 3 && (
                <button
                  onClick={handleNext}
                  disabled={step === 2 && availableEquipment.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-red-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center gap-2 transition-opacity"
                >
                  Volgende
                  <ChevronRight size={18} />
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || availableEquipment.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-red-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center gap-2 transition-opacity"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Genereren...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Genereer Programma
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Step 1: Goal Selection
function Step1Goals({ 
  fitnessGoal, 
  setFitnessGoal 
}: { 
  fitnessGoal: WorkoutGenerationOptions['fitnessGoal']
  setFitnessGoal: (goal: WorkoutGenerationOptions['fitnessGoal']) => void
}) {
  const goals = [
    { 
      id: 'strength' as const, 
      label: 'Kracht', 
      icon: Zap, 
      description: 'Maximale 1RM en powerlifting',
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      id: 'hypertrophy' as const, 
      label: 'Spiergroei', 
      icon: TrendingUp, 
      description: 'Volume training voor massa',
      color: 'from-blue-500 to-purple-500'
    },
    { 
      id: 'endurance' as const, 
      label: 'Uithoudingsvermogen', 
      icon: Activity, 
      description: 'Muscular endurance en conditie',
      color: 'from-green-500 to-teal-500'
    },
    { 
      id: 'weight_loss' as const, 
      label: 'Afvallen', 
      icon: Flame, 
      description: 'Calorie burn en vetverbranding',
      color: 'from-red-500 to-pink-500'
    },
    { 
      id: 'general_fitness' as const, 
      label: 'Algemene Fitness', 
      icon: Heart, 
      description: 'Gezondheid en veelzijdigheid',
      color: 'from-pink-500 to-rose-500'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-black mb-2">Wat is je primaire doel?</h3>
        <p className="text-sm text-muted-foreground">
          Het AI model zal je programma optimaliseren voor dit doel
        </p>
      </div>

      <div className="grid gap-3">
        {goals.map(goal => {
          const Icon = goal.icon
          return (
            <button
              key={goal.id}
              onClick={() => setFitnessGoal(goal.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                fitnessGoal === goal.id
                  ? 'border-primary bg-primary/10'
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${goal.color}`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{goal.label}</h4>
                    {fitnessGoal === goal.id && (
                      <CheckCircle2 size={16} className="text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {goal.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

// Step 2: Equipment & Schedule
function Step2Equipment({
  availableEquipment,
  toggleEquipment,
  daysPerWeek,
  setDaysPerWeek,
  timePerSession,
  setTimePerSession,
  preferredSplit,
  setPreferredSplit
}: {
  availableEquipment: string[]
  toggleEquipment: (equipment: string) => void
  daysPerWeek: number
  setDaysPerWeek: (days: number) => void
  timePerSession: number
  setTimePerSession: (time: number) => void
  preferredSplit?: WorkoutGenerationOptions['preferredSplit']
  setPreferredSplit: (split: WorkoutGenerationOptions['preferredSplit']) => void
}) {
  const commonEquipment = [
    'Barbell', 'Dumbbell', 'Bodyweight', 'Cable', 
    'Machine', 'Bands', 'Kettlebell', 'EZ Bar'
  ]

  const splits = [
    { id: 'push_pull_legs', label: 'Push/Pull/Legs', days: '3-6 dagen', description: 'Push dagen, pull dagen, been dagen' },
    { id: 'upper_lower', label: 'Upper/Lower', days: '4 dagen', description: 'Bovenbody en onderbody splits' },
    { id: 'full_body', label: 'Full Body', days: '3 dagen', description: 'Hele lichaam elke training' },
    { id: 'arnold_split', label: 'Arnold Split', days: '6 dagen', description: 'Chest/back, shoulders/arms, legs' },
    { id: 'bro_split', label: 'Bro Split', days: '5-6 dagen', description: '1 spiergroep per dag' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Equipment */}
      <div>
        <h3 className="text-lg font-black mb-2 flex items-center gap-2">
          <Dumbbell size={20} />
          Beschikbare Apparatuur
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecteer alle equipment dat je beschikbaar hebt
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {commonEquipment.map(equipment => (
            <button
              key={equipment}
              onClick={() => toggleEquipment(equipment)}
              className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                availableEquipment.includes(equipment)
                  ? 'bg-primary text-white'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {equipment}
            </button>
          ))}
        </div>
      </div>

      {/* Days per week */}
      <div>
        <h3 className="text-lg font-black mb-2 flex items-center gap-2">
          <Calendar size={20} />
          Dagen per Week
        </h3>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6, 7].map(days => (
            <button
              key={days}
              onClick={() => setDaysPerWeek(days)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                daysPerWeek === days
                  ? 'bg-primary text-white'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {days}
            </button>
          ))}
        </div>
      </div>

      {/* Time per session */}
      <div>
        <h3 className="text-lg font-black mb-2 flex items-center gap-2">
          <Clock size={20} />
          Tijd per Sessie: {timePerSession} min
        </h3>
        <input
          type="range"
          min="30"
          max="120"
          step="15"
          value={timePerSession}
          onChange={(e) => setTimePerSession(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>30 min</span>
          <span>120 min</span>
        </div>
      </div>

      {/* Split preference */}
      <div>
        <h3 className="text-lg font-black mb-2 flex items-center gap-2">
          <Target size={20} />
          Voorkeur Split
        </h3>
        <div className="space-y-2">
          {splits.map(split => (
            <button
              key={split.id}
              onClick={() => setPreferredSplit(split.id as any)}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                preferredSplit === split.id
                  ? 'border-primary bg-primary/10'
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {split.label}
                    {preferredSplit === split.id && (
                      <CheckCircle2 size={16} className="text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{split.description}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{split.days}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Step 3: Advanced Options
function Step3Advanced({
  experienceLevel,
  setExperienceLevel,
  targetMuscleGroups,
  toggleMuscleGroup,
  additionalNotes,
  setAdditionalNotes
}: {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  setExperienceLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void
  targetMuscleGroups: string[]
  toggleMuscleGroup: (group: string) => void
  additionalNotes: string
  setAdditionalNotes: (notes: string) => void
}) {
  const muscleGroups = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'quads', 'hamstrings', 'glutes', 'calves', 'abs'
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <p className="text-sm text-muted-foreground">
        Deze opties zijn optioneel - het AI model maakt goede keuzes op basis van je data
      </p>

      {/* Experience Level */}
      <div>
        <h3 className="text-lg font-black mb-2">Ervaringsniveau</h3>
        <div className="flex gap-2">
          {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
            <button
              key={level}
              onClick={() => setExperienceLevel(level)}
              className={`flex-1 py-3 rounded-xl font-bold capitalize transition-all ${
                experienceLevel === level
                  ? 'bg-primary text-white'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {level === 'beginner' ? 'Beginner' : level === 'intermediate' ? 'Intermediate' : 'Advanced'}
            </button>
          ))}
        </div>
      </div>

      {/* Target Muscle Groups */}
      <div>
        <h3 className="text-lg font-black mb-2">Extra Focus (optioneel)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Selecteer spiergroepen waar je extra op wilt focussen
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {muscleGroups.map(group => (
            <button
              key={group}
              onClick={() => toggleMuscleGroup(group)}
              className={`px-3 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                targetMuscleGroups.includes(group)
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <h3 className="text-lg font-black mb-2">Extra Opmerkingen (optioneel)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Blessures, voorkeuren, specifieke wensen, etc.
        </p>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Bijv: 'Ik heb last van mijn linkerschouder, vermijd overhead press. Ik vind Romanian Deadlifts erg fijn.'"
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
      </div>
    </motion.div>
  )
}

// Step 4: Results
function Step4Results({
  program,
  onSave,
  onRegenerate,
  isSaving = false
}: {
  program: GeneratedWorkoutProgram
  onSave: () => void
  onRegenerate: () => void
  isSaving?: boolean
}) {
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Program Header */}
      <div className="bg-gradient-to-br from-primary/20 to-red-500/20 border border-primary/20 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-black mb-2">{program.programName}</h3>
            <p className="text-sm text-muted-foreground">{program.description}</p>
          </div>
          <Sparkles size={32} className="text-primary" />
        </div>
        
        {/* Weekly Schedule */}
        <div className="mt-4 grid grid-cols-7 gap-1">
          {program.weeklySchedule.map((day, idx) => (
            <div
              key={idx}
              className={`text-center p-2 rounded-lg text-xs ${
                day.toLowerCase().includes('rest')
                  ? 'bg-white/5 text-muted-foreground'
                  : 'bg-primary/20 text-primary font-bold'
              }`}
            >
              {day.split(':')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Workouts */}
      <div className="space-y-3">
        {program.workouts.map((workout, idx) => (
          <div
            key={idx}
            className="bg-card border border-white/5 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpandedWorkout(expandedWorkout === idx ? null : idx)}
              className="w-full p-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-black text-lg">{workout.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{workout.focus}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>📅 Dag {workout.dayOfWeek}</span>
                    <span>⏱️ ~{workout.estimatedDuration} min</span>
                    <span>💪 {workout.exercises.length} exercises</span>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className={`transition-transform ${
                    expandedWorkout === idx ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {expandedWorkout === idx && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {workout.exercises.map((exercise, exIdx) => (
                      <div
                        key={exIdx}
                        className="bg-background border border-white/5 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-bold">{exercise.name}</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exercise.sets} sets × {exercise.reps} reps
                              {exercise.restSeconds && ` • ${exercise.restSeconds}s rust`}
                            </p>
                            {exercise.notes && (
                              <p className="text-xs text-blue-400 mt-1">{exercise.notes}</p>
                            )}
                          </div>
                          <span className="text-xs font-bold text-primary uppercase px-2 py-1 bg-primary/10 rounded">
                            {exercise.muscleGroup}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Progression & Notes */}
      {program.progressionScheme && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
            <TrendingUp size={16} />
            Progressie Schema
          </h4>
          <p className="text-sm">{program.progressionScheme}</p>
        </div>
      )}

      {program.notes && (
        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
          <p className="text-sm">{program.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 py-3 bg-gradient-to-r from-primary to-red-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-2 transition-opacity"
        >
          {isSaving ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Opslaan...
            </>
          ) : (
            <>
              <Plus size={20} />
              Opslaan als Programma's
            </>
          )}
        </button>
        <button
          onClick={onRegenerate}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={18} />
          Opnieuw
        </button>
      </div>
    </motion.div>
  )
}
