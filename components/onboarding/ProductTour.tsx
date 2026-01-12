'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { updateOnboardingStatus, logOnboardingEvent, clearOnboardingDraft } from '@/lib/onboarding/status'
import { Sparkles, SkipForward } from 'lucide-react'

export default function ProductTour() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartTour = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      await updateOnboardingStatus(user.id, {
        tour_completed: true,
        current_phase: 'completed'
      })
      await logOnboardingEvent(user.id, 'tour_started')
      await clearOnboardingDraft()

      // Redirect to app with tour query param
      router.push('/app?tour=1')
    } catch (err) {
      console.error('Error starting tour:', err)
      setIsLoading(false)
    }
  }

  const handleSkipTour = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      await updateOnboardingStatus(user.id, {
        tour_completed: true,
        current_phase: 'completed'
      })
      await logOnboardingEvent(user.id, 'tour_skipped')
      await clearOnboardingDraft()

      // Redirect straight to app
      router.push('/app')
    } catch (err) {
      console.error('Error skipping tour:', err)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="text-primary" size={40} />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-black mb-4">You're All Set! 🎉</h1>
        <p className="text-lg text-muted-foreground mb-12">
          Your profile is complete and your first workout is ready. Would you like a quick tour of IronPulse?
        </p>

        {/* Tour benefits */}
        <div className="bg-card border border-white/10 rounded-2xl p-8 mb-8 text-left">
          <h2 className="font-bold text-lg mb-4">Quick Tour (2 minutes)</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary text-sm">1</span>
              </div>
              <div>
                <span className="font-medium">Dashboard Overview</span>
                <p className="text-sm text-muted-foreground">Track progress and view stats</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary text-sm">2</span>
              </div>
              <div>
                <span className="font-medium">Workout Logging</span>
                <p className="text-sm text-muted-foreground">How to log sets and track PRs</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary text-sm">3</span>
              </div>
              <div>
                <span className="font-medium">AI Trainer</span>
                <p className="text-sm text-muted-foreground">Get personalized coaching</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary text-sm">4</span>
              </div>
              <div>
                <span className="font-medium">Nutrition & Progress</span>
                <p className="text-sm text-muted-foreground">Track macros and view analytics</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleStartTour}
            disabled={isLoading}
            className="px-8 py-4 bg-primary text-black rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Start Quick Tour
              </>
            )}
          </button>

          <button
            onClick={handleSkipTour}
            disabled={isLoading}
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <SkipForward size={20} />
            Skip, Take Me to the App
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          You can access the tour anytime from Settings → Help
        </p>
      </div>
    </div>
  )
}
