'use client'

import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Trash2, TrendingUp, Flame } from 'lucide-react'
import clsx from 'clsx'
import { WorkoutSet } from '@/components/context/DataContext'

interface EnhancedSetRowProps {
  set: WorkoutSet
  index: number
  onUpdate: (field: 'weight' | 'reps' | 'rir' | 'rpe', value: number | undefined) => void
  onToggleComplete: () => void
  onToggleWarmup: () => void
  onRemove: () => void
  canRemove: boolean
  showRIR: boolean
  showRPE: boolean
  previousBest?: { weight: number; reps: number } | null
  suggestion?: { weight: number; reason: string } | null
}

const EnhancedSetRow = forwardRef<HTMLDivElement, EnhancedSetRowProps>(({
  set,
  index,
  onUpdate,
  onToggleComplete,
  onToggleWarmup,
  onRemove,
  canRemove,
  showRIR,
  showRPE,
  previousBest,
  suggestion
}, ref) => {
  const isNewPR = previousBest && set.weight > 0 && set.reps > 0 &&
    (set.weight > previousBest.weight || 
     (set.weight === previousBest.weight && set.reps > previousBest.reps))

  return (
    <div className="mb-2" ref={ref}>
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10, height: 0 }}
        className={clsx(
          "rounded-xl transition-all group relative overflow-hidden",
          set.completed && !set.isWarmup ? "bg-primary/10 border-2 border-primary/30" :
          set.isWarmup ? "bg-blue-500/10 border border-blue-500/30" :
          "bg-card border border-white/5 hover:border-white/10"
        )}
      >
        {/* Warm-up badge */}
        {set.isWarmup && (
          <div className="absolute top-1 left-1 z-10">
            <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md font-bold">
              WARM-UP
            </span>
          </div>
        )}

        {/* PR badge */}
        {isNewPR && set.completed && !set.isWarmup && (
          <div className="absolute top-1 right-1 z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"
            >
              <TrendingUp size={10} />
              PR!
            </motion.div>
          </div>
        )}

        <div className="p-3">
          {/* Main row */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center">
            {/* Set number + Warmup toggle */}
            <div className="flex flex-col items-center gap-0.5">
              {/* Set number */}
              <div className="text-muted-foreground font-mono font-bold text-xs">
                {index + 1}
              </div>
              {/* Warmup toggle button with flame icon */}
              <button
                onClick={onToggleWarmup}
                className={clsx(
                  "w-7 h-7 rounded-lg transition-all flex items-center justify-center border",
                  set.isWarmup 
                    ? "bg-blue-500/40 text-blue-300 border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                    : "bg-white/5 text-zinc-600 border-white/10 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/40"
                )}
                title={set.isWarmup ? "Warmup set - klik om uit te schakelen" : "Klik om als warmup te markeren"}
              >
                <Flame size={14} className={set.isWarmup ? "fill-blue-300" : ""} />
              </button>
            </div>
            
            {/* Weight input */}
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={set.weight || ''}
                placeholder="0"
                onChange={(e) => onUpdate('weight', Number(e.target.value))}
                disabled={set.completed}
                className={clsx(
                  "w-full text-center font-bold text-xl focus:outline-none px-2.5 py-2 rounded-lg transition-all",
                  "placeholder:text-zinc-600 placeholder:font-normal",
                  set.completed 
                    ? "bg-primary/5 text-primary border border-primary/30" 
                    : "bg-white/5 border border-white/10 focus:border-primary/40 focus:bg-white/10",
                  set.isWarmup && !set.completed && "bg-blue-500/5 border-blue-500/20 text-blue-300"
                )}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 font-medium uppercase tracking-wider pointer-events-none">
                kg
              </span>
            </div>

            {/* Reps input */}
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={set.reps || ''}
                placeholder="0"
                onChange={(e) => onUpdate('reps', Number(e.target.value))}
                disabled={set.completed}
                className={clsx(
                  "w-full text-center font-bold text-xl focus:outline-none px-2.5 py-2 rounded-lg transition-all",
                  "placeholder:text-zinc-600 placeholder:font-normal",
                  set.completed 
                    ? "bg-primary/5 text-primary border border-primary/30" 
                    : "bg-white/5 border border-white/10 focus:border-primary/40 focus:bg-white/10",
                  set.isWarmup && !set.completed && "bg-blue-500/5 border-blue-500/20 text-blue-300"
                )}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 font-medium uppercase tracking-wider pointer-events-none">
                reps
              </span>
            </div>

            {/* Complete button */}
            <button
              onClick={onToggleComplete}
              className={clsx(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                set.completed 
                  ? "bg-primary text-background shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110" 
                  : "bg-white/10 text-muted-foreground hover:bg-white/20"
              )}
            >
              <Check size={16} strokeWidth={3} />
            </button>

            {/* Delete button */}
            <button
              onClick={onRemove}
              disabled={!canRemove}
              className={clsx(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                canRemove 
                  ? "text-red-500/60 hover:bg-red-500/20 hover:text-red-600 md:invisible md:group-hover:visible" 
                  : "invisible cursor-not-allowed"
              )}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* RIR/RPE selectors (compact, on one line) */}
          {!set.isWarmup && (showRIR || showRPE) && (
            <div className="mt-2 flex items-center gap-2">
              {showRIR && (
                <div className="flex items-center gap-1.5 max-w-[70px]">
                  <label className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wide flex-shrink-0">
                    RIR
                  </label>
                  <select
                    value={set.rir ?? ''}
                    onChange={(e) => onUpdate('rir', e.target.value ? Number(e.target.value) : undefined)}
                    disabled={set.completed}
                    className={clsx(
                      "w-12 text-center font-medium text-xs focus:outline-none px-1.5 py-1 rounded-md transition-all",
                      set.completed
                        ? "bg-white/5 border border-white/5 text-zinc-500"
                        : "bg-white/5 border border-white/10 focus:border-primary/40"
                    )}
                  >
                    <option value="">-</option>
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
              {showRPE && (
                <div className="flex items-center gap-1.5 max-w-[70px]">
                  <label className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wide flex-shrink-0">
                    RPE
                  </label>
                  <select
                    value={set.rpe ?? ''}
                    onChange={(e) => onUpdate('rpe', e.target.value ? Number(e.target.value) : undefined)}
                    disabled={set.completed}
                    className={clsx(
                      "w-12 text-center font-medium text-xs focus:outline-none px-1.5 py-1 rounded-md transition-all",
                      set.completed
                        ? "bg-white/5 border border-white/5 text-zinc-500"
                        : "bg-white/5 border border-white/10 focus:border-primary/40"
                    )}
                  >
                    <option value="">-</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Suggestion hint */}
          {suggestion && !set.completed && !set.isWarmup && (
            <div className="mt-2">
              <button
                onClick={() => onUpdate('weight', suggestion.weight)}
                className="text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded-md hover:bg-green-500/20 transition-all flex items-center gap-1"
              >
                <TrendingUp size={11} />
                {suggestion.weight}kg - {suggestion.reason === 'Upward trend in weight' ? 'Stijgende lijn' : suggestion.reason}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
})

EnhancedSetRow.displayName = 'EnhancedSetRow'

export default EnhancedSetRow
