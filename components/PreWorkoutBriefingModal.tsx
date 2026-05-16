'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Info,
  Activity,
  ChevronRight,
  Dumbbell,
  RotateCcw,
} from 'lucide-react'
import clsx from 'clsx'
import { Schema } from '@/components/context/DataContext'
import { useData } from '@/components/context/DataContext'
import {
  generatePreWorkoutBriefing,
  PreWorkoutBriefing,
  BriefingInsight,
  InsightSeverity,
  ExerciseBriefing,
  MuscleRecovery,
} from '@/components/utils/preWorkoutBriefingAnalytics'

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────

interface Props {
  schema: Schema
  onStart: (deloadMode: boolean) => void
  onCancel: () => void
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function ReadinessGauge({ score, color }: { score: number; color: 'green' | 'yellow' | 'red' }) {
  const colorClass = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  }[color]

  const ringColor = {
    green: '#4ade80',
    yellow: '#facc15',
    red: '#f87171',
  }[color]

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={radius} strokeWidth="5" stroke="rgba(255,255,255,0.08)" fill="none" />
        <motion.circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="5"
          stroke={ringColor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <span className={clsx('absolute text-sm font-black tabular-nums', colorClass)}>{score}</span>
    </div>
  )
}

function InsightCard({ insight }: { insight: BriefingInsight }) {
  const config: Record<InsightSeverity, { icon: React.ReactNode; border: string; bg: string; titleColor: string }> = {
    critical: {
      icon: <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />,
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
      titleColor: 'text-red-300',
    },
    warning: {
      icon: <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />,
      border: 'border-yellow-500/30',
      bg: 'bg-yellow-500/10',
      titleColor: 'text-yellow-300',
    },
    info: {
      icon: insight.type === 'overload_ready'
        ? <TrendingUp size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
        : <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />,
      border: insight.type === 'overload_ready' ? 'border-green-500/30' : 'border-blue-500/20',
      bg: insight.type === 'overload_ready' ? 'bg-green-500/10' : 'bg-blue-500/10',
      titleColor: insight.type === 'overload_ready' ? 'text-green-400' : 'text-blue-300',
    },
  }
  const c = config[insight.severity]
  return (
    <div className={clsx('rounded-xl border p-3 flex gap-2.5', c.border, c.bg)}>
      {c.icon}
      <div className="min-w-0">
        <p className={clsx('text-xs font-bold leading-tight', c.titleColor)}>{insight.title}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{insight.description}</p>
        {insight.reference && (
          <p className="text-[9px] text-zinc-600 mt-1 font-mono">{insight.reference}</p>
        )}
      </div>
    </div>
  )
}

function MuscleRecoveryRow({ muscle }: { muscle: MuscleRecovery }) {
  const score = muscle.readinessScore
  const barColor =
    score >= 75 ? 'bg-green-500' : score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
  const dayText =
    muscle.daysSinceTrained < 0
      ? 'Nooit'
      : muscle.daysSinceTrained === 0
      ? 'Vandaag'
      : muscle.daysSinceTrained === 1
      ? 'Gisteren'
      : `${muscle.daysSinceTrained}d geleden`

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 flex-shrink-0 text-xs font-medium text-zinc-300">{muscle.label}</div>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={clsx('h-full rounded-full', barColor)}
        />
      </div>
      <div className="w-20 flex-shrink-0 flex items-center justify-end gap-1.5">
        {muscle.insufficientRecovery && (
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">!</span>
        )}
        <span className="text-[10px] text-zinc-500">{dayText}</span>
      </div>
    </div>
  )
}

function ExerciseRow({ ex }: { ex: ExerciseBriefing }) {
  const hasData = ex.lastWeight !== null

  return (
    <div className="border border-white/[0.06] rounded-xl px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold truncate">{ex.exerciseName}</span>
            {ex.isPlateau && (
              <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-1 py-0.5">
                PLATEAU
              </span>
            )}
            {ex.rpeRising && (
              <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded px-1 py-0.5">
                RPE↑
              </span>
            )}
            {ex.readyForOverload && !ex.isPlateau && (
              <span className="text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 rounded px-1 py-0.5">
                ↑ ZWAARDER
              </span>
            )}
          </div>

          {hasData ? (
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Vorige: <span className="text-zinc-300 font-semibold">{ex.lastWeight} kg × {ex.lastReps}</span>
            </p>
          ) : (
            <p className="text-[11px] text-zinc-600 mt-0.5">Nog niet gelogd</p>
          )}

          {(ex.suggestedWeight || ex.overloadWeight) && (() => {
            const isOverload = ex.readyForOverload && ex.overloadWeight !== null
            const displayWeight = isOverload ? ex.overloadWeight : ex.suggestedWeight
            const isLighter = !isOverload && ex.lastWeight !== null && (displayWeight ?? 0) < ex.lastWeight
            const weightColor = isOverload
              ? 'text-green-400'
              : isLighter
              ? 'text-amber-400'
              : 'text-zinc-300'
            const label = isOverload ? 'Doel vandaag:' : 'Vandaag:'
            return (
              <p className={`text-[11px] mt-0.5 ${weightColor}`}>
                {label} <span className="font-bold">{displayWeight} kg</span>
              </p>
            )
          })()}
        </div>
        <Dumbbell size={14} className="text-zinc-600 flex-shrink-0 mt-0.5" />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main modal
// ────────────────────────────────────────────────────────────

export default function PreWorkoutBriefingModal({ schema, onStart, onCancel }: Props) {
  const { history, bodyStats } = useData()

  const briefing: PreWorkoutBriefing = useMemo(
    () => generatePreWorkoutBriefing(history, schema, bodyStats),
    [history, schema, bodyStats]
  )

  // Only show insights up to a reasonable number to avoid overwhelming
  const topInsights = briefing.insights.slice(0, 5)
  const strengthExercises = briefing.exercises.filter(e => e.muscleGroup !== 'cardio')

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Sheet — slides up from bottom */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute inset-x-0 bottom-0 top-12 bg-background rounded-t-3xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-3">
              <ReadinessGauge score={briefing.readinessScore} color={briefing.readinessColor} />
              <div>
                <h2 className="font-black text-base leading-tight">{schema.name}</h2>
                <p className={clsx(
                  'text-xs font-semibold',
                  briefing.readinessColor === 'green' ? 'text-green-400' :
                  briefing.readinessColor === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {briefing.readinessLabel}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Pre-workout analyse</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">

            {/* Insights section */}
            {topInsights.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Inzichten
                </h3>
                <div className="space-y-2">
                  {topInsights.map((insight, i) => (
                    <InsightCard key={`${insight.type}-${i}`} insight={insight} />
                  ))}
                </div>
              </section>
            )}

            {/* Muscle recovery section */}
            {briefing.muscleRecoveries.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5">
                  Herstelstatus · schema spiergroepen
                </h3>
                <div className="space-y-2.5">
                  {briefing.muscleRecoveries.map(m => (
                    <MuscleRecoveryRow key={m.muscleGroup} muscle={m} />
                  ))}
                </div>
                <p className="text-[9px] text-zinc-600 mt-2">Herstelcurve: Zatsiorsky &amp; Kraemer 2006</p>
              </section>
            )}

            {/* Per-exercise section */}
            {strengthExercises.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Oefeningen vandaag
                </h3>
                <div className="space-y-2">
                  {strengthExercises.map(ex => (
                    <ExerciseRow key={ex.exerciseName} ex={ex} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {topInsights.length === 0 && briefing.muscleRecoveries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle size={32} className="text-green-400 mb-3" />
                <p className="font-bold text-sm">Alles ziet er goed uit!</p>
                <p className="text-xs text-zinc-500 mt-1">Voldoende data voor analyse ontbreekt nog, maar je bent klaar om te gaan.</p>
              </div>
            )}

            {/* Bottom padding for footer */}
            <div className="h-4" />
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-5 py-4 space-y-2 bg-background">
            {/* Deload mode button — only when deload is recommended */}
            {briefing.deloadRecommended && (
              <button
                onClick={() => onStart(true)}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl py-3 font-bold text-sm hover:bg-yellow-500/20 transition-colors active:scale-95"
              >
                <RotateCcw size={16} />
                Start in Deload modus (−40% volume)
              </button>
            )}

            {/* Primary start */}
            <button
              onClick={() => onStart(false)}
              className="w-full flex items-center justify-center gap-2 bg-primary text-black rounded-xl py-3.5 font-black text-sm hover:bg-primary/90 transition-colors active:scale-95 shadow-lg shadow-primary/20"
            >
              <Activity size={16} />
              Start workout
              <ChevronRight size={16} />
            </button>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-full text-zinc-500 text-xs py-2 hover:text-zinc-300 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
