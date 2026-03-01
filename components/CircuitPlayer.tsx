'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, Check, ChevronRight, Volume2, VolumeX, Zap } from 'lucide-react'
import { WorkoutLog, CircuitConfig } from '@/components/context/DataContext'

// ─────────────────────────────────────────────────────────────────────────────
// Web Audio helpers
// ─────────────────────────────────────────────────────────────────────────────
function useAudioBeeps(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (!enabled) return null
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      return ctxRef.current
    } catch { return null }
  }, [enabled])

  const beep = useCallback((frequency: number, duration: number, delay = 0) => {
    const ctx = getCtx()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = frequency
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + duration + 0.05)
    } catch { /* ignore AudioContext errors */ }
  }, [getCtx])

  /** 3 short high beeps – used at 3-second remaining warning */
  const playCountdown = useCallback(() => {
    beep(880, 0.12, 0)
    beep(880, 0.12, 0.22)
    beep(880, 0.12, 0.44)
  }, [beep])

  /** 1 long ascending beep – used when a new work/superset phase starts */
  const playGo = useCallback(() => {
    beep(1047, 0.35, 0)
  }, [beep])

  /** 2 descending beeps – used when rest starts */
  const playRest = useCallback(() => {
    beep(659, 0.18, 0)
    beep(523, 0.18, 0.28)
  }, [beep])

  return { playCountdown, playGo, playRest }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type CircuitPhase = 'prepare' | 'work' | 'superset' | 'rest' | 'round-rest' | 'done'

const PREPARE_DURATION = 5

interface Props {
  workout: WorkoutLog
  circuitConfig: CircuitConfig
  onFinish: (weights: Record<string, number>, roundsCompleted: number) => void
  onCancel: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CircuitPlayer
// ─────────────────────────────────────────────────────────────────────────────
export default function CircuitPlayer({ workout, circuitConfig, onFinish, onCancel }: Props) {
  const allExercises = workout.exercises

  // Separate superset exercise from main list
  const supersetExercise = circuitConfig.supersetExerciseId
    ? allExercises.find(e => e.exerciseId === circuitConfig.supersetExerciseId) ?? null
    : null
  const mainExercises = supersetExercise
    ? allExercises.filter(e => e.exerciseId !== circuitConfig.supersetExerciseId)
    : allExercises

  // ── state ──────────────────────────────────────────────────────────────────
  const [currentRound, setCurrentRound] = useState(1)
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [phase, setPhase] = useState<CircuitPhase>('prepare')
  const [timeLeft, setTimeLeft] = useState(PREPARE_DURATION)
  const [isPaused, setIsPaused] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)

  // Weight per exercise (keyed by WorkoutExercise.id)
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    allExercises.forEach(e => { init[e.id] = 0 })
    return init
  })

  const beepedAtThreeRef = useRef(false)
  const { playCountdown, playGo, playRest } = useAudioBeeps(audioEnabled)

  // ── helpers ────────────────────────────────────────────────────────────────
  const phaseDuration = useCallback((p: CircuitPhase): number => {
    switch (p) {
      case 'prepare':    return PREPARE_DURATION
      case 'work':       return circuitConfig.workDuration
      case 'superset':   return circuitConfig.supersetDuration
      case 'rest':       return circuitConfig.restDuration
      case 'round-rest': return circuitConfig.roundRestDuration
      default:           return 0
    }
  }, [circuitConfig])

  const phaseLabel = (p: CircuitPhase) => {
    switch (p) {
      case 'prepare':    return 'KLAAR?'
      case 'work':       return 'WERK'
      case 'superset':   return 'SUPERSET'
      case 'rest':       return 'RUST'
      case 'round-rest': return 'RONDE RUST'
      default:           return ''
    }
  }

  const phaseColor = (p: CircuitPhase, fraction: number): string => {
    if (p === 'rest' || p === 'round-rest' || p === 'prepare') return '#3b82f6'
    if (fraction > 0.5) return '#22c55e'
    if (fraction > 0.25) return '#eab308'
    return '#ef4444'
  }

  // ── advance to next phase ──────────────────────────────────────────────────
  const advance = useCallback(() => {
    beepedAtThreeRef.current = false

    const isLastEx    = currentExIdx >= mainExercises.length - 1
    const isLastRound = currentRound >= circuitConfig.rounds

    if (phase === 'prepare') {
      playGo()
      setPhase('work')
      setTimeLeft(circuitConfig.workDuration)
      return
    }

    if (phase === 'work') {
      if (supersetExercise) {
        playGo()
        setPhase('superset')
        setTimeLeft(circuitConfig.supersetDuration)
      } else {
        // skip rest at very last exercise of last round
        if (isLastEx && isLastRound) {
          setPhase('done')
        } else {
          playRest()
          setPhase('rest')
          setTimeLeft(circuitConfig.restDuration)
        }
      }
      return
    }

    if (phase === 'superset') {
      if (isLastEx && isLastRound) {
        setPhase('done')
      } else {
        playRest()
        setPhase('rest')
        setTimeLeft(circuitConfig.restDuration)
      }
      return
    }

    if (phase === 'rest') {
      if (isLastEx) {
        if (isLastRound) {
          setPhase('done')
        } else {
          playRest()
          setPhase('round-rest')
          setTimeLeft(circuitConfig.roundRestDuration)
        }
      } else {
        setCurrentExIdx(i => i + 1)
        playGo()
        setPhase('work')
        setTimeLeft(circuitConfig.workDuration)
      }
      return
    }

    if (phase === 'round-rest') {
      setCurrentRound(r => r + 1)
      setCurrentExIdx(0)
      playGo()
      setPhase('work')
      setTimeLeft(circuitConfig.workDuration)
      return
    }
  }, [phase, currentExIdx, currentRound, circuitConfig, supersetExercise, mainExercises.length, playGo, playRest])

  // ── countdown tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || phase === 'done') return

    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          advance()
          return 0
        }
        // 3-second warning beep (fires when timeLeft hits 4, i.e. 3 remaining after decrement)
        if (prev === 4 && !beepedAtThreeRef.current) {
          beepedAtThreeRef.current = true
          playCountdown()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [isPaused, phase, advance, playCountdown])

  // ── trigger finish callback ────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'done') {
      onFinish(weights, currentRound)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── derived display values ─────────────────────────────────────────────────
  const currentEx   = mainExercises[currentExIdx] ?? null
  const activeEx    = phase === 'superset' ? supersetExercise : currentEx

  // What shows in the "volgende" preview
  const nextLabel: string | null = (() => {
    if (phase === 'work' && supersetExercise) return supersetExercise.name
    if (phase === 'work' || phase === 'superset') {
      if (currentExIdx < mainExercises.length - 1) return mainExercises[currentExIdx + 1].name
    }
    if ((phase === 'rest') && currentExIdx < mainExercises.length - 1) {
      return mainExercises[currentExIdx + 1].name
    }
    if (phase === 'round-rest') return mainExercises[0].name
    return null
  })()

  const total    = phaseDuration(phase)
  const fraction = total > 0 ? timeLeft / total : 0
  const color    = phaseColor(phase, fraction)

  // SVG ring
  const RADIUS        = 88
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const dashOffset    = CIRCUMFERENCE * (1 - fraction)

  // ── Done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <Check size={48} className="text-green-400" />
        </motion.div>
        <h2 className="text-3xl font-black">Circuit Voltooid! 🎉</h2>
        <p className="text-muted-foreground">
          {currentRound} ronde{currentRound > 1 ? 's' : ''} · {mainExercises.length} oefeningen
          {supersetExercise ? ` + ${supersetExercise.name}` : ''}
        </p>
      </div>
    )
  }

  // ── Main player ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="text-sm font-bold text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          Beëindig
        </button>

        <div className="text-center leading-tight">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ronde</div>
          <div className="font-black text-2xl">{currentRound}<span className="text-muted-foreground text-base font-bold"> / {circuitConfig.rounds}</span></div>
        </div>

        <button onClick={() => setAudioEnabled(a => !a)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          {audioEnabled ? <Volume2 size={20} className="text-muted-foreground" /> : <VolumeX size={20} className="text-red-400" />}
        </button>
      </div>

      {/* Phase label */}
      <div className="text-center pt-5 pb-1">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ color, backgroundColor: color + '18' }}
          >
            {phaseLabel(phase)}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Countdown ring */}
      <div className="flex justify-center py-4">
        <div className="relative" style={{ width: 220, height: 220 }}>
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
            <motion.circle
              cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ filter: `drop-shadow(0 0 10px ${color}88)` }}
              transition={{ duration: 0.8, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              key={timeLeft}
              initial={{ scale: 1.15 }} animate={{ scale: 1 }}
              className="font-black tabular-nums leading-none"
              style={{ fontSize: 64, color }}
            >
              {timeLeft}
            </motion.div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">sec</div>
          </div>
        </div>
      </div>

      {/* Exercise card + controls */}
      <div className="px-4 max-w-md mx-auto w-full space-y-3 pb-8">
        {/* Current exercise */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${currentExIdx}-${currentRound}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-card border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center text-base font-black shrink-0"
                style={{ backgroundColor: color + '22', color }}
              >
                {phase === 'superset' ? <Zap size={20} /> : currentExIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">
                  {phase === 'superset'
                    ? 'SUPERSET'
                    : `Oefening ${currentExIdx + 1} / ${mainExercises.length}`}
                </p>
                <h2 className="font-black text-xl leading-tight">{activeEx?.name}</h2>
              </div>
            </div>

            {/* Weight adjuster */}
            {activeEx && (
              <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Gewicht</span>
                <div className="flex items-center bg-white/5 rounded-xl overflow-hidden ml-auto border border-white/10">
                  <button
                    onClick={() => setWeights(w => ({ ...w, [activeEx.id]: Math.max(0, +(w[activeEx.id] ?? 0) - 2.5) }))}
                    className="px-4 py-2.5 hover:bg-white/10 font-bold text-lg transition-colors"
                  >−</button>
                  <span className="px-4 py-2.5 font-mono font-black text-lg min-w-[72px] text-center">
                    {weights[activeEx.id] ?? 0}
                  </span>
                  <button
                    onClick={() => setWeights(w => ({ ...w, [activeEx.id]: +(w[activeEx.id] ?? 0) + 2.5 }))}
                    className="px-4 py-2.5 hover:bg-white/10 font-bold text-lg transition-colors"
                  >+</button>
                </div>
                <span className="text-xs text-muted-foreground font-bold">kg</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next up preview */}
        {nextLabel && (
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Volgende</p>
              <p className="text-sm font-bold truncate">{nextLabel}</p>
            </div>
          </div>
        )}

        {/* Pause / Skip */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsPaused(p => !p)}
            className="flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors"
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
            {isPaused ? 'Hervat' : 'Pauze'}
          </button>
          <button
            onClick={advance}
            className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-colors"
            style={{ backgroundColor: color + '18', color }}
          >
            <SkipForward size={18} />
            Volgende
          </button>
        </div>

        {/* Exercise progress dots */}
        <div className="flex justify-center gap-2 pt-2 flex-wrap">
          {mainExercises.map((ex, i) => (
            <div
              key={ex.id}
              title={ex.name}
              className="h-2.5 w-2.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i < currentExIdx ? color :
                  i === currentExIdx ? '#ffffff' :
                  'rgba(255,255,255,0.15)',
                transform: i === currentExIdx ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
