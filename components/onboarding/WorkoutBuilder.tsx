'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { useData } from '@/components/context/DataContext'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import {
  saveOnboardingDraft,
  getOnboardingDraft,
  updateOnboardingStatus,
  logOnboardingEvent
} from '@/lib/onboarding/status'
import {
  generateWorkoutPlan,
  createFirstWorkoutSchema,
  PlanType,
  WorkoutFocus
} from '@/lib/workouts/generator'
import { Calendar, Dumbbell, Target, Clock, Zap } from 'lucide-react'

type WorkoutStep = 'planType' | 'focus' | 'preview'

export default function WorkoutBuilder() {
  const router = useRouter()
  const { user } = useAuth()
  const { userProfile } = useData()

  const [currentStep, setCurrentStep] = useState<WorkoutStep>('planType')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [planType, setPlanType] = useState<PlanType>('full-body')
  const [duration, setDuration] = useState<number>(60)
  const [focus, setFocus] = useState<WorkoutFocus>('mixed')

  // Generated plan preview
  const [generatedPlan, setGeneratedPlan] = useState<any>(null)

  // Load draft
  useEffect(() => {
    const draft = getOnboardingDraft()
    if (draft.workoutDraft) {
      const w = draft.workoutDraft
      if (w.planType) setPlanType(w.planType as PlanType)
      if (w.duration) setDuration(w.duration)
      if (w.focus) setFocus(w.focus as WorkoutFocus)
    }
    // Use default values if no draft
  }, [userProfile])

  // Auto-save draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveOnboardingDraft({
        workoutDraft: { planType, duration, focus }
      })
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [planType, duration, focus])

  // Generate preview when moving to preview step
  useEffect(() => {
    if (currentStep === 'preview' && !generatedPlan) {
      const plan = generateWorkoutPlan({
        planType,
        duration,
        focus,
        experience: 'beginner'
      })
      setGeneratedPlan(plan)
    }
  }, [currentStep, planType, duration, focus, generatedPlan])

  const stepIndex = currentStep === 'planType' ? 0 : currentStep === 'focus' ? 1 : 2

  const handleNext = () => {
    if (currentStep === 'planType') {
      setCurrentStep('focus')
      logOnboardingEvent(user!.id, 'workout_plan_type_selected', { planType })
    } else if (currentStep === 'focus') {
      setCurrentStep('preview')
      logOnboardingEvent(user!.id, 'workout_focus_selected', { focus })
    } else if (currentStep === 'preview') {
      handleFinish()
    }
  }

  const handleBack = () => {
    if (currentStep === 'focus') {
      setCurrentStep('planType')
    } else if (currentStep === 'preview') {
      setGeneratedPlan(null) // Reset preview
      setCurrentStep('focus')
    }
  }

  const handleSkip = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      await updateOnboardingStatus(user.id, {
        first_workout_completed: false, // Mark as skipped
        current_phase: 'tour'
      })
      await logOnboardingEvent(user.id, 'workout_builder_skipped')
      router.push('/onboarding/tour')
    } catch (err) {
      console.error('Error skipping workout:', err)
      setError('Failed to skip')
      setIsLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!user || !generatedPlan) return

    setIsLoading(true)
    setError(null)

    try {
      const schema = createFirstWorkoutSchema(
        user.id,
        generatedPlan
      )

      // Save to database
      const { error: insertError } = await supabase
        .from('workout_schemas')
        .insert([schema])
        .select()
        .single()

      if (insertError) throw insertError

      // Update onboarding status
      await updateOnboardingStatus(user.id, {
        first_workout_completed: true,
        current_phase: 'tour'
      })

      await logOnboardingEvent(user.id, 'first_workout_created', {
        planType,
        focus,
        exerciseCount: generatedPlan.exercises.length
      })

      // Redirect to tour
      router.push('/onboarding/tour')
    } catch (err) {
      console.error('Error saving workout:', err)
      setError(err instanceof Error ? err.message : 'Failed to save workout')
      setIsLoading(false)
    }
  }

  return (
    <OnboardingShell
      currentStep={stepIndex}
      totalSteps={3}
      title={
        currentStep === 'planType' ? 'Choose your workout split' :
        currentStep === 'focus' ? 'Select your training focus' :
        'Your first workout plan'
      }
      subtitle={
        currentStep === 'planType' ? 'How many days per week can you train?' :
        currentStep === 'focus' ? 'What do you want to prioritize?' :
        'Review and save your personalized plan'
      }
      onBack={stepIndex > 0 ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={currentStep === 'preview' ? 'Save Workout' : 'Next'}
      isLoading={isLoading}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Skip option */}
      {currentStep !== 'preview' && (
        <div className="mb-6 text-center">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Skip for now (you can create a workout later)
          </button>
        </div>
      )}

      {/* Step: Plan Type */}
      {currentStep === 'planType' && (
        <div className="space-y-4">
          <div
            onClick={() => setPlanType('full-body')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              planType === 'full-body'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <Calendar className="text-primary mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Full Body (3x/week)</h3>
                <p className="text-sm text-muted-foreground">
                  Train all muscle groups each session. Great for beginners and time-efficient.
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setPlanType('upper-lower')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              planType === 'upper-lower'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <Dumbbell className="text-primary mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Upper/Lower Split (4x/week)</h3>
                <p className="text-sm text-muted-foreground">
                  Alternate between upper and lower body. More volume per muscle group.
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setPlanType('ppl')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              planType === 'ppl'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <Zap className="text-primary mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Push/Pull/Legs (6x/week)</h3>
                <p className="text-sm text-muted-foreground">
                  High frequency, optimal for muscle growth. Requires 6 days commitment.
                </p>
              </div>
            </div>
          </div>

          {/* Duration slider */}
          <div className="pt-4">
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Workout Duration: {duration} minutes
            </label>
            <input
              type="range"
              min="30"
              max="120"
              step="15"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>30 min</span>
              <span>120 min</span>
            </div>
          </div>
        </div>
      )}

      {/* Step: Focus */}
      {currentStep === 'focus' && (
        <div className="space-y-4">
          <div
            onClick={() => setFocus('strength')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              focus === 'strength'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <Target className="text-primary mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Strength</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Lower reps, heavier weight. Build maximum strength.
                </p>
                <div className="text-xs bg-white/5 inline-block px-3 py-1 rounded-full">
                  Typical: 3-5 sets × 3-6 reps
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFocus('hypertrophy')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              focus === 'hypertrophy'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <Dumbbell className="text-primary mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Hypertrophy (Muscle Growth)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Moderate reps, focus on muscle building.
                </p>
                <div className="text-xs bg-white/5 inline-block px-3 py-1 rounded-full">
                  Typical: 3-4 sets × 8-12 reps
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFocus('mixed')}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
              focus === 'mixed'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <Zap className="text-primary mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Mixed (Balanced)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Combination of strength and hypertrophy.
                </p>
                <div className="text-xs bg-white/5 inline-block px-3 py-1 rounded-full">
                  Typical: 3-4 sets × 6-10 reps
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {currentStep === 'preview' && generatedPlan && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4">{generatedPlan.name}</h3>
            <div className="space-y-3">
              {generatedPlan.exercises.map((ex: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{ex.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {ex.sets} sets × {ex.reps} reps
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            You can edit exercises and add more workouts after completing onboarding
          </div>
        </div>
      )}
    </OnboardingShell>
  )
}

// Import supabase
import { supabase } from '@/lib/supabase'
