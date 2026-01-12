'use client'

import React, { useEffect, useState } from 'react'
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { logOnboardingEvent } from '@/lib/onboarding/status'

const tourSteps: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    content: 'This is your dashboard - your fitness command center. See your recent workouts, progress, and achievements at a glance.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="workout-logger"]',
    content: 'Click here to start logging your workout. Track sets, reps, and weight for each exercise.',
  },
  {
    target: '[data-tour="progress"]',
    content: 'View detailed analytics and charts showing your strength gains and volume progression over time.',
  },
  {
    target: '[data-tour="ai-trainer"]',
    content: 'Get personalized coaching from your AI trainer. Ask questions, get form tips, and receive custom recommendations.',
  },
  {
    target: '[data-tour="nutrition"]',
    content: 'Track your meals and macros. Scan barcodes for quick logging and see your daily nutritional breakdown.',
  },
  {
    target: '[data-tour="schema-builder"]',
    content: 'Create custom workout routines or edit your existing plan. Build your perfect training program.',
  },
  {
    target: '[data-tour="profile"]',
    content: 'Manage your profile, view achievements, and customize app settings. You\'re all set to crush your goals! 💪',
  },
]

export default function AppTour() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [run, setRun] = useState(false)

  useEffect(() => {
    // Check if tour should start
    const tourParam = searchParams?.get('tour')
    if (tourParam === '1') {
      // Small delay to ensure elements are rendered
      setTimeout(() => setRun(true), 500)
    }
  }, [searchParams])

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false)
      
      if (user) {
        await logOnboardingEvent(user.id, 'tour_completed', {
          status: status,
          completedSteps: data.index + 1,
          totalSteps: tourSteps.length
        })
      }

      // Remove tour query param
      router.replace('/app')
    }
  }

  // Only render Joyride if tour is running
  if (!run) return null

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#00FFA3',
          textColor: '#ffffff',
          backgroundColor: '#1a1a1a',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: '#00FFA3',
          color: '#000000',
          borderRadius: 8,
          fontWeight: 'bold',
          padding: '10px 20px',
        },
        buttonBack: {
          color: '#999999',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#999999',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  )
}
