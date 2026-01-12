'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface OnboardingShellProps {
  children: ReactNode
  currentStep: number
  totalSteps: number
  title: string
  subtitle?: string
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  backLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
}

export default function OnboardingShell({
  children,
  currentStep,
  totalSteps,
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = 'Next',
  backLabel = 'Back',
  nextDisabled = false,
  isLoading = false
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <React.Fragment key={index}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    index < currentStep
                      ? 'bg-primary text-black'
                      : index === currentStep
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-white/5 text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? <Check size={20} /> : index + 1}
                </div>
                {index < totalSteps - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      index < currentStep ? 'bg-primary' : 'bg-white/10'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-sm text-muted-foreground text-center">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        {/* Content card */}
        <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          <div className="mb-8">
            {children}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            {onBack ? (
              <button
                onClick={onBack}
                disabled={isLoading}
                className="px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {backLabel}
              </button>
            ) : (
              <div />
            )}

            {onNext && (
              <button
                onClick={onNext}
                disabled={nextDisabled || isLoading}
                className="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  nextLabel
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          You can always change these settings later in your profile
        </div>
      </motion.div>
    </div>
  )
}
