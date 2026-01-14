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
  isProfileComplete,
  logOnboardingEvent
} from '@/lib/onboarding/status'
import { User, Ruler, Weight, Target, Dumbbell, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProfileStep = 'basics' | 'preferences' | 'confirm'

export default function ProfileWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const { userProfile } = useData()
  
  const [currentStep, setCurrentStep] = useState<ProfileStep>('basics')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [age, setAge] = useState<number>(25)
  const [heightCm, setHeightCm] = useState<number>(175)
  const [weightKg, setWeightKg] = useState<number>(75)
  const [goal, setGoal] = useState<string>('strength')
  const [experience, setExperience] = useState<string>('beginner')
  const [sessionMinutes, setSessionMinutes] = useState<number>(60)

  // Load draft on mount
  useEffect(() => {
    const draft = getOnboardingDraft()
    if (draft.profileDraft) {
      const p = draft.profileDraft
      if (p.age) setAge(p.age)
      if (p.height_cm) setHeightCm(p.height_cm)
      if (p.weight_kg) setWeightKg(p.weight_kg)
      if (p.goal) setGoal(p.goal)
      if (p.experience) setExperience(p.experience)
      if (p.session_minutes) setSessionMinutes(p.session_minutes)
    } else if (userProfile) {
      // Prefill from existing profile
      if (userProfile.age) setAge(userProfile.age)
      if (userProfile.height) setHeightCm(userProfile.height)
      if (userProfile.weight) setWeightKg(userProfile.weight)
    }
  }, [userProfile])

  // Auto-save draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveOnboardingDraft({
        profileDraft: {
          age,
          height_cm: heightCm,
          weight_kg: weightKg,
          goal,
          experience,
          session_minutes: sessionMinutes
        }
      })
    }, 500) // Debounce

    return () => clearTimeout(timeoutId)
  }, [age, heightCm, weightKg, goal, experience, sessionMinutes])

  const stepIndex = currentStep === 'basics' ? 0 : currentStep === 'preferences' ? 1 : 2

  const isBasicsValid = age >= 13 && age < 120 && heightCm > 0 && weightKg > 0
  const isPreferencesValid = goal !== '' && experience !== ''

  const handleNext = () => {
    if (currentStep === 'basics' && isBasicsValid) {
      setCurrentStep('preferences')
      logOnboardingEvent(user!.id, 'profile_basics_completed')
    } else if (currentStep === 'preferences' && isPreferencesValid) {
      setCurrentStep('confirm')
      logOnboardingEvent(user!.id, 'profile_preferences_completed')
    } else if (currentStep === 'confirm') {
      handleFinish()
    }
  }

  const handleBack = () => {
    if (currentStep === 'preferences') {
      setCurrentStep('basics')
    } else if (currentStep === 'confirm') {
      setCurrentStep('preferences')
    }
  }

  const handleFinish = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Update profile - use gender and activity_level defaults if not set
      const { error: updateError } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          age,
          height: heightCm,
          weight: weightKg,
          gender: userProfile?.gender || 'male',
          activity_level: userProfile?.activityLevel || 1.55
        }, {
          onConflict: 'user_id'
        })

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error(updateError.message || 'Failed to update profile')
      }

      // Check if profile is complete
      const profileData = { age, height_cm: heightCm, weight_kg: weightKg }
      const isComplete = isProfileComplete(profileData)

      if (!isComplete) {
        throw new Error('Profile is missing required fields')
      }

      // Update onboarding status
      await updateOnboardingStatus(user.id, {
        profile_completed: true,
        current_phase: 'workout'
      })

      await logOnboardingEvent(user.id, 'profile_completed')

      // Redirect to workout wizard
      router.push('/onboarding/workout')
    } catch (err) {
      console.error('Error completing profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      setIsLoading(false)
    }
  }

  return (
    <OnboardingShell
      currentStep={stepIndex}
      totalSteps={3}
      title={
        currentStep === 'basics' ? 'Tell us about yourself' :
        currentStep === 'preferences' ? 'Your fitness goals' :
        'Confirm your profile'
      }
      subtitle={
        currentStep === 'basics' ? 'Basic information to personalize your experience' :
        currentStep === 'preferences' ? 'Help us create the perfect workout plan' :
        'Review and confirm your details'
      }
      onBack={stepIndex > 0 ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={currentStep === 'confirm' ? 'Complete Profile' : 'Next'}
      nextDisabled={
        currentStep === 'basics' ? !isBasicsValid :
        currentStep === 'preferences' ? !isPreferencesValid :
        false
      }
      isLoading={isLoading}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step: Basics */}
      {currentStep === 'basics' && (
        <div className="space-y-6">
          {/* Age */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <User size={16} className="text-primary" />
              Age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              min="1"
              max="120"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
              placeholder="25"
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Ruler size={16} className="text-primary" />
              Height (cm)
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              min="1"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
              placeholder="175"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Weight size={16} className="text-primary" />
              Weight (kg)
            </label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              min="1"
              step="0.1"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
              placeholder="75"
            />
          </div>
        </div>
      )}

      {/* Step: Preferences */}
      {currentStep === 'preferences' && (
        <div className="space-y-6">
          {/* Goal */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Target size={16} className="text-primary" />
              Primary Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'strength', label: 'Build Strength', icon: '💪' },
                { value: 'hypertrophy', label: 'Build Muscle', icon: '🏋️' },
                { value: 'endurance', label: 'Endurance', icon: '🏃' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGoal(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    goal === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="font-medium text-sm">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Dumbbell size={16} className="text-primary" />
              Experience Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'beginner', label: 'Beginner', desc: '< 6 months' },
                { value: 'intermediate', label: 'Intermediate', desc: '6m - 2y' },
                { value: 'advanced', label: 'Advanced', desc: '2+ years' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExperience(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    experience === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Session Duration */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Typical Session Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 45, 60, 75, 90, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSessionMinutes(mins)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    sessionMinutes === mins
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-medium text-sm">{mins} min</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {currentStep === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-muted-foreground">Age</span>
              <span className="font-medium">{age} years</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-muted-foreground">Height</span>
              <span className="font-medium">{heightCm} cm</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium">{weightKg} kg</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium capitalize">{goal.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <span className="text-muted-foreground">Experience</span>
              <span className="font-medium capitalize">{experience}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Session Duration</span>
              <span className="font-medium">{sessionMinutes} minutes</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            This information helps us create personalized workout recommendations
          </div>
        </div>
      )}
    </OnboardingShell>
  )
}
