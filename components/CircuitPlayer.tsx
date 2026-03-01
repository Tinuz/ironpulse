'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, SkipForward, Check, Zap, Volume2, VolumeX, ChevronRight, Timer } from 'lucide-react'
import { WorkoutLog, CircuitConfig } from '@/components/context/DataContext'

// ─────────────────────────────────────────────────────────────────────────────
// Audio
// ─────────────────────────────────────────────────────────────────────────────
function makeAudio() {
  let ctx: AudioContext | null = null
  const getCtx = (): AudioContext | null => {
    try {
      if (!ctx)
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      return ctx
    } catch { return null }
  }
  const tone = (freq: number, dur: number, delay = 0) => {
    const c = getCtx(); if (!c) return
    try {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.frequency.value = freq; o.type = 'sine'
      g.gain.setValueAtTime(0.28, c.currentTime + delay)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur)
      o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur + 0.05)
    } catch { /* ignore */ }
  }
  return {
    beepCountdown: () => { tone(880, 0.1, 0); tone(880, 0.1, 0.2); tone(880, 0.1, 0.4) },
    beepGo:        () => { tone(1047, 0.3, 0) },
    beepRest:      () => { tone(659, 0.15, 0); tone(523, 0.15, 0.25) },
  }
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
  prepare:     'VOORBEREIDING',
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
// CircuitPlayer — HIIT-style with explicit start
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
  const [started,  setStarted]  = useState(false)   // gated start screen
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

  // stable refs so the interval never goes stale
  const audioRef   = useRef(audio)
  const stateRef   = useRef({ phase, exIdx, round })
  useEffect(() => { audioRef.current = audio }, [audio])
  useEffect(() => { stateRef.current = { phase, exIdx, round } }, [phase, exIdx, round])

  const beeped3    = useRef(false)
  const audioFns   = useRef(makeAudio())
  const phaseDurFn = useCallback((p: Phase): number => {
    switch (p) {
      case 'prepare':    return PREPARE
      case 'work':       return circuitConfig.workDuration
      case 'superset':   return circuitConfig.supersetDuration
      case 'rest':       return circuitConfig.restDuration
      case 'round-rest': return circuitConfig.roundRestDuration
      default:           return 0
    }
  }, [circuitConfig])

  // ── advance (uses refs → never stale inside interval) ─────────────────────
  const advanceRef = useRef<() => void>(() => {})
  advanceRef.current = () => {
    beeped3.current = false
    const { phase: p, exIdx: ei, round: ro } = stateRef.current
    const lastEx    = ei >= mainExs.length - 1
    const lastRound = ro >= circuitConfig.rounds
    const af        = audioRef.current ? audioFns.current : { beepGo: () => {}, beepRest: () => {} }

    if (p === 'prepare')   { af.beepGo(); setPhase('work'); setTimeLeft(circuitConfig.workDuration); return }
    if (p === 'work') {
      if (supersetEx)        { af.beepGo(); setPhase('superset'); setTimeLeft(circuitConfig.supersetDuration); return }
      if (lastEx && lastRound) { setPhase('done'); return }
      af.beepRest(); setPhase('rest'); setTimeLeft(circuitConfig.restDuration); return
    }
    if (p === 'superset') {
      if (lastEx && lastRound) { setPhase('done'); return }
      af.beepRest(); setPhase('rest'); setTimeLeft(circuitConfig.restDuration); return
    }
    if (p === 'rest') {
      if (!lastEx)   { setExIdx(i => i + 1); af.beepGo(); setPhase('work'); setTimeLeft(circuitConfig.workDuration); return }
      if (!lastRound) { af.beepRest(); setPhase('round-rest'); setTimeLeft(circuitConfig.roundRestDuration); return }
      setPhase('done'); return
    }
    if (p === 'round-rest') {
      setRound(r => r + 1); setExIdx(0); af.beepGo(); setPhase('work'); setTimeLeft(circuitConfig.workDuration); return
    }
  }

  // ── tick: just count down, never call advance from inside the updater ───────
  useEffect(() => {
    if (!started || paused || phase === 'done') return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0
        if (prev === 4 && !beeped3.current && audioRef.current) {
          beeped3.current = true
          audioFns.current.beepCountdown()
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, paused, phase])

  // ── when timeLeft hits 0, advance to next phase (separate effect = safe) ───
  useEffect(() => {
    if (!started || paused || phase === 'done') return
    if (timeLeft === 0) advanceRef.current()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  useEffect(() => {
    if (phase === 'done') onFinish(weights, round)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── derived ────────────────────────────────────────────────────────────────
  const color    = PHASE_COLOR[phase]
  const total    = phaseDurFn(phase)
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

  // ── start splash ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <button onClick={onCancel} className="text-sm font-bold text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg">
            Annuleer
          </button>
          <span className="font-black text-sm">{workout.name ?? 'Circuit'}</span>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div className="h-20 w-20 rounded-full bg-green-500/15 flex items-center justify-center">
            <Timer size={38} className="text-green-400" />
          </div>
          <div>
            <h2 className="font-black text-3xl mb-1">{circuitConfig.rounds} ronde{circuitConfig.rounds !== 1 ? 's' : ''}</h2>
            <p className="text-muted-foreground text-sm">{mainExs.length} oefeningen{supersetEx ? ` + superset` : ''}</p>
          </div>

          {/* timing overview */}
          <div className="w-full max-w-xs grid grid-cols-2 gap-2 text-sm">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <div className="font-black text-2xl text-green-400">{circuitConfig.workDuration}s</div>
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Werk</div>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
              <div className="font-black text-2xl text-indigo-400">{circuitConfig.restDuration}s</div>
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Rust</div>
            </div>
            {supersetEx && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <div className="font-black text-2xl text-amber-400">{circuitConfig.supersetDuration}s</div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Superset</div>
              </div>
            )}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
              <div className="font-black text-2xl text-violet-400">{circuitConfig.roundRestDuration}s</div>
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Ronde rust</div>
            </div>
          </div>

          {/* exercise list preview */}
          <div className="w-full max-w-xs space-y-1.5">
            {mainExs.map((ex, i) => (
              <div key={ex.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/4 text-sm text-left">
                <span className="text-muted-foreground font-bold w-5 text-center shrink-0">{i + 1}</span>
                <span className="flex-1 font-bold truncate">{ex.name}</span>
                {supersetEx && <span className="text-[10px] text-amber-400 font-black shrink-0">+⚡</span>}
              </div>
            ))}
          </div>
        </div>

        {/* big start button */}
        <div className="px-6 pb-10">
          <button
            onClick={() => { setStarted(true); audioFns.current.beepGo() }}
            className="w-full py-5 rounded-2xl font-black text-xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black"
          >
            Start circuit
          </button>
          <p className="text-center text-xs text-muted-foreground/50 mt-3">
            Je krijgt eerst {PREPARE} seconden voorbereiding
          </p>
        </div>
      </div>
    )
  }

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
                    initial={{ scale: 1.25, opacity: 0.6 }}
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

            {/* timer bar — animates every second */}
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
          <button onClick={() => advanceRef.current()}
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
          const isCurrent = qi === currentQueueIdx && phase !== 'rest' && phase !== 'round-rest' && phase !== 'prepare'
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
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isDone ? 'transparent' : item.isSuperset ? '#f59e0b18' : 'rgba(255,255,255,0.06)',
                  color: isDone ? '#22c55e' : item.isSuperset ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                }}>
                {isDone ? <Check size={14} /> : item.isSuperset ? <Zap size={14} /> : <ChevronRight size={14} />}
              </div>
              <span className={`flex-1 min-w-0 text-sm font-bold truncate ${
                isCurrent ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {item.label}
                {item.isSuperset && (
                  <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-amber-400/70">superset</span>
                )}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{item.dur}s</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

