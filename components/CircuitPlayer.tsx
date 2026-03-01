'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, SkipForward, Check, Zap, Volume2, VolumeX, ChevronRight } from 'lucide-react'
import { WorkoutLog, CircuitConfig } from '@/components/context/DataContext'

// ─────────────────────────────────────────────────────────────────────────────
// Audio
// ─────────────────────────────────────────────────────────────────────────────
function useAudioBeeps(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (!enabled) return null
    try {
      if (!ctxRef.current)
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      return ctxRef.current
    } catch { return null }
  }, [enabled])

  const tone = useCallback((freq: number, dur: number, delay = 0) => {
    const c = getCtx(); if (!c) return
    try {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.frequency.value = freq; o.type = 'sine'
      g.gain.setValueAtTime(0.28, c.currentTime + delay)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur)
      o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur + 0.05)
    } catch { /* ignore */ }
  }, [getCtx])

  const beepCountdown = useCallback(() => { tone(880, 0.1, 0); tone(880, 0.1, 0.2); tone(880, 0.1, 0.4) }, [tone])
  const beepGo        = useCallback(() => { tone(1047, 0.3, 0) }, [tone])
  const beepRest      = useCallback(() => { tone(659, 0.15, 0); tone(523, 0.15, 0.25) }, [tone])

  return { beepCountdown, beepGo, beepRest }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'prepare' | 'work' | 'superset' | 'rest' | 'round-rest' | 'done'

const PREPARE = 5

const PHASE_COLOR: Record<Phase, string> = {
  prepare:     '#3b82f6',
  work:        '#22c55e',
  superset:    '#f59e0b',
  rest:        '#6366f1',
  'round-rest':'#8b5cf6',
  done:        '#22c55e',
}

const PHASE_LABEL: Record<Phase, string> = {
  prepare:     'KLAAR',
  work:        'WERK',
  superset:    'SUPERSET',
  rest:        'RUST',
  'round-rest':'RONDE RUST',
  done:        'KLAAR!',
}

interface Props {
  workout: WorkoutLog
  circuitConfig: CircuitConfig
  onFinish: (weights: Record<string, number>, roundsCompleted: number) => void
  onCancel: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CircuitPlayer — HIIT-style
// ─────────────────────────────────────────────────────────────────────────────
export default function CircuitPlayer({ workout, circuitConfig, onFinish, onCancel }: Props) {
  const allExercises = workout.exercises

  const supersetEx = circuitConfig.supersetExerciseId
    ? allExercises.find(e => e.exerciseId === circuitConfig.supersetExerciseId) ?? null
    : null
  const mainExs = supersetEx
    ? allExercises.filter(e => e.exerciseId !== circuitConfig.supersetExerciseId)
    : allExercises

  // ── state ──────────────────────────────────────────────────────────────────
  const [round,    setRound]    = useState(1)
  const [exIdx,    setExIdx]    = useState(0)
  const [phase,    setPhase]    = useState<Phase>('prepare')
  const [timeLeft, setTimeLeft] = useState(PREPARE)
  const [paused,   setPaused]   = useState(false)
  const [audio,    setAudio]    = useState(true)
  const [weights,  setWeights]  = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    allExercises.forEach(e => { m[e.id] = 0 })
    return m
  })

  const beeped3 = useRef(false)
  const { beepCountdown, beepGo, beepRest } = useAudioBeeps(audio)

  const phaseDur = useCallback((p: Phase): number => {
    switch (p) {
      case 'prepare':    return PREPARE
      case 'work':       return circuitConfig.workDuration
      case 'superset':   return circuitConfig.supersetDuration
      case 'rest':       return circuitConfig.restDuration
      case 'round-rest': return circuitConfig.roundRestDuration
      default:           return 0
    }
  }, [circuitConfig])

  // ── advance ────────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    beeped3.current = false
    const lastEx    = exIdx >= mainExs.length - 1
    const lastRound = round >= circuitConfig.rounds

    if (phase === 'prepare')    { beepGo(); setPhase('work'); setTimeLeft(circuitConfig.workDuration); return }
    if (phase === 'work') {
      if (supersetEx)           { beepGo(); setPhase('superset'); setTimeLeft(circuitConfig.supersetDuration); return }
      if (lastEx && lastRound)  { setPhase('done'); return }
      beepRest(); setPhase('rest'); setTimeLeft(circuitConfig.restDuration); return
    }
    if (phase === 'superset') {
      if (lastEx && lastRound)  { setPhase('done'); return }
      beepRest(); setPhase('rest'); setTimeLeft(circuitConfig.restDuration); return
    }
    if (phase === 'rest') {
      if (!lastEx) { setExIdx(i => i + 1); beepGo(); setPhase('work'); setTimeLeft(circuitConfig.workDuration); return }
      if (!lastRound) { beepRest(); setPhase('round-rest'); setTimeLeft(circuitConfig.roundRestDuration); return }
      setPhase('done'); return
    }
    if (phase === 'round-rest') {
      setRound(r => r + 1); setExIdx(0); beepGo(); setPhase('work'); setTimeLeft(circuitConfig.workDuration); return
    }
  }, [phase, exIdx, round, circuitConfig, mainExs.length, supersetEx, beepGo, beepRest])

  // ── tick ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paused || phase === 'done') return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { advance(); return 0 }
        if (prev === 4 && !beeped3.current) { beeped3.current = true; beepCountdown() }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [paused, phase, advance, beepCountdown])

  useEffect(() => {
    if (phase === 'done') onFinish(weights, round)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── derived ────────────────────────────────────────────────────────────────
  const color    = PHASE_COLOR[phase]
  const total    = phaseDur(phase)
  const pct      = total > 0 ? timeLeft / total : 0
  const activeEx = phase === 'superset' ? supersetEx : mainExs[exIdx]

  // Build flat queue: every main exercise + optional superset after it
  type QueueItem = { label: string; dur: number; isSuperset?: boolean; idx: number }
  const queue: QueueItem[] = []
  mainExs.forEach((ex, i) => {
    queue.push({ label: ex.name, dur: circuitConfig.workDuration, idx: i })
    if (supersetEx) queue.push({ label: supersetEx.name, dur: circuitConfig.supersetDuration, isSuperset: true, idx: i })
  })
  const currentQueueIdx = supersetEx
    ? exIdx * 2 + (phase === 'superset' ? 1 : 0)
    : exIdx

  // ── done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-background">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="h-28 w-28 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check size={52} className="text-green-400" />
        </motion.div>
        <h2 className="text-3xl font-black">Circuit Voltooid! 🎉</h2>
        <p className="text-muted-foreground">
          {round} ronde{round !== 1 ? 's' : ''} · {mainExs.length} oefeningen
          {supersetEx ? ` + ${supersetEx.name}` : ''}
        </p>
      </div>
    )
  }

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onCancel}
            className="text-sm font-bold text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
            Beëindig
          </button>
          <div className="text-center leading-tight">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ronde</div>
            <div className="font-black text-xl">
              {round}<span className="text-sm font-bold text-muted-foreground"> / {circuitConfig.rounds}</span>
            </div>
          </div>
          <button onClick={() => setAudio(a => !a)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            {audio ? <Volume2 size={18} className="text-muted-foreground" /> : <VolumeX size={18} className="text-red-400" />}
          </button>
        </div>

        {/* progress dots */}
        <div className="flex justify-center gap-1.5 pb-2.5">
          {mainExs.map((_, i) => (
            <motion.div key={i} layout
              className="h-2 rounded-full transition-colors duration-300"
              style={{
                width: i === exIdx && phase !== 'rest' && phase !== 'round-rest' ? 24 : 8,
                backgroundColor:
                  i < exIdx ? color :
                  i === exIdx && phase !== 'rest' && phase !== 'round-rest' ? color :
                  'rgba(255,255,255,0.14)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── active exercise card ── */}
      <div className="px-4 pt-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${exIdx}-${round}`}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="rounded-2xl overflow-hidden border-2"
            style={{ borderColor: color + '55', backgroundColor: color + '0d' }}
          >
            {/* phase label + name + countdown */}
            <div className="px-5 pt-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2"
                  style={{ color, backgroundColor: color + '22' }}>
                  {phase === 'superset' && <Zap size={10} />}
                  {PHASE_LABEL[phase]}
                </span>
                <h2 className="font-black text-2xl leading-tight break-words">{activeEx?.name ?? '—'}</h2>
              </div>
              <div className="shrink-0 text-right">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={timeLeft}
                    initial={{ scale: 1.3, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-black tabular-nums block leading-none"
                    style={{ fontSize: 60, color }}
                  >
                    {timeLeft}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">sec</span>
              </div>
            </div>

            {/* timer bar */}
            <div className="mx-5 my-4 h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${pct * 100}%` }}
                style={{ backgroundColor: color }}
                transition={{ duration: 0.95, ease: 'linear' }}
              />
            </div>

            {/* weight adjuster */}
            {activeEx && (
              <div className="mx-5 mb-5 flex items-center gap-3 pt-3 border-t border-white/8">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gewicht</span>
                <div className="flex items-center rounded-xl overflow-hidden bg-black/25 border border-white/10 ml-auto">
                  <button
                    onClick={() => setWeights(w => ({ ...w, [activeEx.id]: Math.max(0, +(w[activeEx.id] ?? 0) - 2.5) }))}
                    className="px-4 py-2.5 hover:bg-white/10 font-bold text-lg">−</button>
                  <span className="px-3 font-mono font-black text-xl min-w-[68px] text-center">
                    {weights[activeEx.id] ?? 0}
                  </span>
                  <button
                    onClick={() => setWeights(w => ({ ...w, [activeEx.id]: +(w[activeEx.id] ?? 0) + 2.5 }))}
                    className="px-4 py-2.5 hover:bg-white/10 font-bold text-lg">+</button>
                </div>
                <span className="text-xs font-bold text-muted-foreground">kg</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── controls ── */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button onClick={() => setPaused(p => !p)}
            className="flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors">
            {paused ? <Play size={18} /> : <Pause size={18} />}
            {paused ? 'Hervat' : 'Pauze'}
          </button>
          <button onClick={advance}
            className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-colors"
            style={{ backgroundColor: color + '1c', color }}>
            <SkipForward size={18} /> Sla over
          </button>
        </div>
      </div>

      {/* ── exercise queue ── */}
      <div className="px-4 mt-5 pb-32 max-w-lg mx-auto w-full space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1 mb-3">
          Circuit oefeningen
        </p>

        {queue.map((item, qi) => {
          const isDone    = qi < currentQueueIdx
          const isCurrent = qi === currentQueueIdx && phase !== 'rest' && phase !== 'round-rest'
          const isNext    = !isCurrent && !isDone && qi === currentQueueIdx + 1

          return (
            <motion.div
              key={qi}
              layout
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isCurrent ? 'border-white/20 bg-white/8' :
                isDone    ? 'border-transparent opacity-30' :
                isNext    ? 'border-white/10 bg-white/4' :
                'border-transparent'
              }`}
            >
              {/* icon */}
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
                style={{
                  backgroundColor: isDone ? 'transparent' : item.isSuperset ? '#f59e0b18' : 'rgba(255,255,255,0.06)',
                  color: isDone ? '#22c55e' : item.isSuperset ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                }}>
                {isDone
                  ? <Check size={14} />
                  : item.isSuperset
                    ? <Zap size={14} />
                    : <ChevronRight size={14} />
                }
              </div>

              {/* name */}
              <span className={`flex-1 min-w-0 text-sm font-bold truncate ${
                isCurrent ? 'text-foreground' : isDone ? 'text-muted-foreground' : isNext ? 'text-muted-foreground' : 'text-muted-foreground/60'
              }`}>
                {item.label}
                {item.isSuperset && (
                  <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-amber-400/70">superset</span>
                )}
              </span>

              {/* duration */}
              <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{item.dur}s</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
