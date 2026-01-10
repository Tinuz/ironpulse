'use client'

import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Trash2, Flame, TrendingUp } from 'lucide-react'
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
            {/* Set number */}
            <div className="w-6 text-center text-xs font-mono text-muted-foreground font-bold">
              {index + 1}
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
                  "w-full bg-transparent text-center font-black text-xl focus:outline-none p-1 border-b border-transparent focus:border-primary transition-colors",
                  set.completed && "text-primary",
                  set.isWarmup && "text-blue-400"
                )}
              />
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                KG
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
                  "w-full bg-transparent text-center font-black text-xl focus:outline-none p-1 border-b border-transparent focus:border-primary transition-colors",
                  set.completed && "text-primary",
                  set.isWarmup && "text-blue-400"
                )}
              />
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                REPS
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

          {/* RIR/RPE inputs (if enabled and not warmup) */}
          {!set.isWarmup && (showRIR || showRPE) && (
            <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
              {showRIR && (
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold block mb-1">
                    RIR (Reps in Reserve)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="10"
                    value={set.rir ?? ''}
                    placeholder="0-10"
                    onChange={(e) => onUpdate('rir', e.target.value ? Number(e.target.value) : undefined)}
                    disabled={set.completed}
                    className="w-full bg-white/5 text-center font-bold text-sm focus:outline-none p-2 rounded-lg border border-white/10 focus:border-primary transition-colors"
                  />
                </div>
              )}
              {showRPE && (
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold block mb-1">
                    RPE (Rate of Exertion)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    value={set.rpe ?? ''}
                    placeholder="1-10"
                    onChange={(e) => onUpdate('rpe', e.target.value ? Number(e.target.value) : undefined)}
                    disabled={set.completed}
                    className="w-full bg-white/5 text-center font-bold text-sm focus:outline-none p-2 rounded-lg border border-white/10 focus:border-primary transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          {/* Warm-up toggle */}
          <div className="mt-2 pt-2 border-t border-white/5">
            <button
              onClick={onToggleWarmup}
              className={clsx(
                "text-xs px-2 py-1 rounded-md transition-all",
                set.isWarmup 
                  ? "bg-blue-500/20 text-blue-400 font-bold"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {set.isWarmup ? '🔥 Warm-up set' : 'Markeer als warm-up'}
            </button>
          </div>

          {/* Suggestion hint */}
          {suggestion && !set.completed && !set.isWarmup && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <button
                onClick={() => onUpdate('weight', suggestion.weight)}
                className="w-full text-xs bg-primary/10 text-primary px-2 py-1.5 rounded-md hover:bg-primary/20 transition-all flex items-center justify-center gap-1"
              >
                <Flame size={12} />
                Suggestie: {suggestion.weight}kg ({suggestion.reason})
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
