'use client'

import React, { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Trash2, TrendingUp, Flame, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { WorkoutSet } from '@/components/context/DataContext'
import { WorkoutSetSchema } from '@/lib/validationSchemas'

interface EnhancedSetRowProps {
  set: WorkoutSet
  index: number
  onUpdate: (field: 'weight' | 'reps' | 'rir' | 'rpe', value: number | undefined) => void
  onToggleComplete: () => void
  onToggleWarmup: () => void
  onToggleDropset: () => void
  onRemove: () => void
  canRemove: boolean
  previousBest?: { weight: number; reps: number } | null
  suggestion?: { weight: number; reason: string } | null
}

const EnhancedSetRowBase = forwardRef<HTMLDivElement, EnhancedSetRowProps>(({
  set,
  index,
  onUpdate,
  onToggleComplete,
  onToggleWarmup,
  onToggleDropset,
  onRemove,
  canRemove,
  previousBest,
  suggestion
}, ref) => {
  const [weightError, setWeightError] = useState<string | undefined>();
  const [repsError, setRepsError] = useState<string | undefined>();

  // Werkset validatie: RPE én RIR zijn verplicht voor niet-warmup sets
  const isMissingEffortData = !set.isWarmup && !set.completed && (
    set.rpe === undefined || set.rir === undefined
  );

  // onChange: update the value immediately (no validation) and clear stale errors
  const handleChange = (field: 'weight' | 'reps', value: number) => {
    if (field === 'weight') setWeightError(undefined);
    if (field === 'reps') setRepsError(undefined);
    onUpdate(field, value);
  };

  // onBlur: validate and show error only after the user leaves the field
  const handleBlur = (field: 'weight' | 'reps', value: number) => {
    const schema = field === 'weight' ? WorkoutSetSchema.shape.weight : WorkoutSetSchema.shape.reps;
    const result = schema.safeParse(value);
    if (field === 'weight') setWeightError(result.success ? undefined : result.error.issues[0]?.message);
    if (field === 'reps') setRepsError(result.success ? undefined : result.error.issues[0]?.message);
  };

  const isNewPR = !set.isWarmup && previousBest && set.weight > 0 && set.reps > 0 &&
    (set.weight > previousBest.weight || 
     (set.weight === previousBest.weight && set.reps > previousBest.reps))

  return (
    <div className="mb-1.5" ref={ref}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10, height: 0 }}
        className={clsx(
          "rounded-xl overflow-hidden transition-all relative",
          set.completed && !set.isWarmup ? "bg-primary/10 border border-primary/30" :
          set.isWarmup ? "bg-blue-500/10 border border-blue-500/20" :
          set.isDropset ? "bg-orange-500/10 border border-orange-500/20" :
          "bg-white/[0.04] border border-white/[0.07]"
        )}
      >
        {/* PR badge */}
        {isNewPR && set.completed && !set.isWarmup && (
          <div className="absolute top-1.5 right-1.5 z-10">
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

        <div className="px-2.5 pt-2.5 pb-2">
          {/* ── Main row: # | KG | REPS | ✓ ── */}
          <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-1.5 items-start">

            {/* Set number + type badge */}
            <div className="flex flex-col items-center gap-0.5 pt-2">
              <span className={clsx(
                "font-mono font-bold text-sm leading-none",
                set.isWarmup ? "text-blue-400" :
                set.isDropset ? "text-orange-400" :
                "text-zinc-500"
              )}>
                {index + 1}
              </span>
              {set.isWarmup && (
                <span className="text-[8px] font-black text-blue-400/80 uppercase tracking-wide leading-none">WU</span>
              )}
              {set.isDropset && (
                <span className="text-[8px] font-black text-orange-400/80 uppercase tracking-wide leading-none">DS</span>
              )}
            </div>

            {/* Weight input */}
            <div>
              <input
                type="number"
                inputMode="decimal"
                value={set.weight || ''}
                placeholder="0"
                onChange={(e) => handleChange('weight', Number(e.target.value))}
                onBlur={(e) => handleBlur('weight', Number(e.target.value))}
                disabled={set.completed}
                className={clsx(
                  "w-full text-center font-bold text-xl focus:outline-none px-1.5 py-2 rounded-lg transition-all",
                  "placeholder:text-zinc-600 placeholder:font-normal",
                  set.completed
                    ? "bg-primary/5 text-primary border border-primary/30"
                    : weightError
                    ? "bg-red-500/10 border border-red-500/50 text-red-300"
                    : "bg-white/5 border border-white/10 focus:border-primary/40 focus:bg-white/10",
                  set.isWarmup && !set.completed && !weightError && "bg-blue-500/5 border-blue-500/20 text-blue-300",
                  set.isDropset && !set.completed && !weightError && "bg-orange-500/5 border-orange-500/20 text-orange-300"
                )}
              />
              {weightError
                ? <p className="text-[10px] text-red-400 mt-0.5 text-center leading-tight">{weightError}</p>
                : <p className="text-[9px] text-zinc-600 mt-0.5 text-center font-medium uppercase tracking-wider">kg</p>
              }
            </div>

            {/* Reps input */}
            <div>
              <input
                type="number"
                inputMode="numeric"
                value={set.reps || ''}
                placeholder="0"
                onChange={(e) => handleChange('reps', Number(e.target.value))}
                onBlur={(e) => handleBlur('reps', Number(e.target.value))}
                disabled={set.completed}
                className={clsx(
                  "w-full text-center font-bold text-xl focus:outline-none px-1.5 py-2 rounded-lg transition-all",
                  "placeholder:text-zinc-600 placeholder:font-normal",
                  set.completed
                    ? "bg-primary/5 text-primary border border-primary/30"
                    : repsError
                    ? "bg-red-500/10 border border-red-500/50 text-red-300"
                    : "bg-white/5 border border-white/10 focus:border-primary/40 focus:bg-white/10",
                  set.isWarmup && !set.completed && !repsError && "bg-blue-500/5 border-blue-500/20 text-blue-300",
                  set.isDropset && !set.completed && !repsError && "bg-orange-500/5 border-orange-500/20 text-orange-300"
                )}
              />
              {repsError
                ? <p className="text-[10px] text-red-400 mt-0.5 text-center leading-tight">{repsError}</p>
                : <p className="text-[9px] text-zinc-600 mt-0.5 text-center font-medium uppercase tracking-wider">reps</p>
              }
            </div>

            {/* Complete button */}
            <button
              onClick={onToggleComplete}
              disabled={isMissingEffortData}
              title={isMissingEffortData ? 'Vul RPE en RIR in om de set te voltooien' : undefined}
              className={clsx(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 self-start",
                set.completed
                  ? "bg-primary text-background shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105"
                  : isMissingEffortData
                  ? "bg-white/5 text-zinc-600 cursor-not-allowed"
                  : "bg-white/10 text-muted-foreground hover:bg-white/20"
              )}
            >
              <Check size={16} strokeWidth={3} />
            </button>
          </div>

          {/* ── Secondary row: WU / DS / suggestion / RIR / RPE / delete ── */}
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.06] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* Warmup toggle */}
            <button
              onClick={onToggleWarmup}
              className={clsx(
                "flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all border",
                set.isWarmup
                  ? "bg-blue-500/25 text-blue-300 border-blue-500/40"
                  : "bg-white/5 text-zinc-500 border-white/10 hover:text-blue-400 hover:border-blue-500/30"
              )}
              title="Warmup set"
            >
              <Flame size={11} className={set.isWarmup ? "fill-blue-300" : ""} />
              WU
            </button>

            {/* Dropset toggle */}
            <button
              onClick={onToggleDropset}
              className={clsx(
                "flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all border",
                set.isDropset
                  ? "bg-orange-500/25 text-orange-300 border-orange-500/40"
                  : "bg-white/5 text-zinc-500 border-white/10 hover:text-orange-400 hover:border-orange-500/30"
              )}
              title="Dropset"
            >
              <ChevronDown size={11} />
              DS
            </button>

            <div className="flex-shrink-0 flex-1 min-w-2" />

            {/* Suggestion */}
            {suggestion && !set.completed && (
              <button
                onClick={() => onUpdate('weight', suggestion.weight)}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"
              >
                <TrendingUp size={11} />
                {suggestion.weight}kg
              </button>
            )}

            {/* RIR stepper — altijd zichtbaar voor werksets */}
            {!set.isWarmup && (
              <div className="flex-shrink-0 flex items-center bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 gap-0.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide pr-1">RIR</span>
                <button
                  onClick={() => onUpdate('rir', set.rir !== undefined && set.rir > 0 ? set.rir - 1 : undefined)}
                  disabled={set.completed || set.rir === undefined}
                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white text-sm font-bold rounded disabled:opacity-30"
                >−</button>
                <span className="w-5 text-center text-xs font-bold text-zinc-200 tabular-nums">
                  {set.rir ?? '–'}
                </span>
                <button
                  onClick={() => onUpdate('rir', set.rir !== undefined ? Math.min(10, set.rir + 1) : 0)}
                  disabled={set.completed}
                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white text-sm font-bold rounded disabled:opacity-30"
                >+</button>
              </div>
            )}

            {/* RPE stepper — altijd zichtbaar voor werksets */}
            {!set.isWarmup && (
              <div className="flex-shrink-0 flex items-center bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 gap-0.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide pr-1">RPE</span>
                <button
                  onClick={() => onUpdate('rpe', set.rpe !== undefined && set.rpe > 1 ? set.rpe - 1 : undefined)}
                  disabled={set.completed || set.rpe === undefined}
                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white text-sm font-bold rounded disabled:opacity-30"
                >−</button>
                <span className="w-5 text-center text-xs font-bold text-zinc-200 tabular-nums">
                  {set.rpe ?? '–'}
                </span>
                <button
                  onClick={() => onUpdate('rpe', set.rpe !== undefined ? Math.min(10, set.rpe + 1) : 6)}
                  disabled={set.completed}
                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white text-sm font-bold rounded disabled:opacity-30"
                >+</button>
              </div>
            )}

            {/* Delete */}
            <button
              onClick={onRemove}
              disabled={!canRemove}
              className={clsx(
                "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                canRemove
                  ? "text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                  : "invisible pointer-events-none"
              )}
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Validatiehint: verschijnt pas als RPE of RIR nog niet ingevuld zijn */}
          {isMissingEffortData && (
            <p className="text-[10px] text-amber-400/80 mt-1.5 text-center leading-tight">
              Vul RPE en RIR in om de set te voltooien
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
})

EnhancedSetRowBase.displayName = 'EnhancedSetRow'
const EnhancedSetRow = React.memo(EnhancedSetRowBase)
export default EnhancedSetRow
