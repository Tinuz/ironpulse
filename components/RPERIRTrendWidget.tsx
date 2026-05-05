'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Activity, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '@/components/context/DataContext'
import { analyzeRPERIRTrends, ExerciseRPERIRTrend } from '@/components/utils/rpeRirTrendAnalytics'
import clsx from 'clsx'

type ViewMode = 'rpe' | 'rir'

function TrendBadge({ trend }: { trend: ExerciseRPERIRTrend['rpeTrend'] | ExerciseRPERIRTrend['rirTrend'] }) {
  if (trend === 'insufficient_data') return null
  const Icon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus
  const color = trend === 'rising' ? 'text-red-400' : trend === 'falling' ? 'text-green-400' : 'text-zinc-400'
  return <Icon size={13} className={color} />
}

function ExerciseRow({ ex, mode }: { ex: ExerciseRPERIRTrend; mode: ViewMode }) {
  const [expanded, setExpanded] = useState(false)

  const hasData = mode === 'rpe' ? ex.hasRPEData : ex.hasRIRData
  if (!hasData) return null

  const avg = mode === 'rpe' ? ex.avgRPE : ex.avgRIR
  const trend = mode === 'rpe' ? ex.rpeTrend : ex.rirTrend
  const dataKey = mode === 'rpe' ? 'rpe' : 'rir'

  const chartData = ex.dataPoints
    .filter(p => p[dataKey] !== null)
    .map(p => ({
      date: p.date.slice(5), // MM-DD
      value: p[dataKey],
      weight: p.weight,
    }))

  const trendColor = trend === 'rising' ? 'text-red-400' : trend === 'falling' ? 'text-green-400' : 'text-zinc-400'

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.06]">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex-1 text-left">
          <span className="text-xs font-semibold">{ex.exerciseName}</span>
          {ex.insight && (
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{ex.insight}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {avg !== null && (
            <span className={clsx('text-sm font-bold tabular-nums', trendColor)}>
              {avg}
            </span>
          )}
          <TrendBadge trend={trend} />
          {expanded ? <ChevronUp size={13} className="text-zinc-500" /> : <ChevronDown size={13} className="text-zinc-500" />}
        </div>
      </button>

      {expanded && chartData.length >= 2 && (
        <div className="px-3 pb-3">
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#71717a' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: number) => [value, mode.toUpperCase()]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={trend === 'rising' ? '#f87171' : trend === 'falling' ? '#4ade80' : '#a3e635'}
                strokeWidth={2}
                dot={{ r: 3, fill: trend === 'rising' ? '#f87171' : trend === 'falling' ? '#4ade80' : '#a3e635' }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function RPERIRTrendWidget() {
  const { history } = useData()
  const [mode, setMode] = useState<ViewMode>('rpe')
  const [showAll, setShowAll] = useState(false)

  const analysis = analyzeRPERIRTrends(history, 42, 3)
  const filtered = analysis.exercises.filter(ex =>
    mode === 'rpe' ? ex.hasRPEData : ex.hasRIRData
  )
  const displayed = showAll ? filtered : filtered.slice(0, 4)
  const hasAny = filtered.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h3 className="font-bold text-base">RPE / RIR Trend</h3>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-1 bg-white/[0.05] rounded-lg p-0.5">
          {(['rpe', 'rir'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                'px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all',
                mode === m ? 'bg-primary text-background' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">Inspanningstrend per oefening · laatste 6 weken</p>

      {/* Global fatigue signal */}
      {analysis.overallFatigueSignal && mode === 'rpe' && (
        <div className="flex gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 leading-relaxed">
            Meerdere oefeningen tonen stijgende RPE — mogelijke overbelasting. Overweeg een deload.
          </p>
        </div>
      )}

      {/* Global averages */}
      {(analysis.globalAvgRPE !== null || analysis.globalAvgRIR !== null) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {analysis.globalAvgRPE !== null && (
            <div className="bg-white/[0.04] rounded-xl p-3 text-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Gem. RPE</div>
              <div className={clsx('font-bold text-lg tabular-nums', (analysis.globalAvgRPE ?? 0) >= 9 ? 'text-red-400' : (analysis.globalAvgRPE ?? 0) >= 7 ? 'text-yellow-400' : 'text-green-400')}>
                {analysis.globalAvgRPE}
              </div>
            </div>
          )}
          {analysis.globalAvgRIR !== null && (
            <div className="bg-white/[0.04] rounded-xl p-3 text-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Gem. RIR</div>
              <div className={clsx('font-bold text-lg tabular-nums', (analysis.globalAvgRIR ?? 0) <= 1 ? 'text-red-400' : (analysis.globalAvgRIR ?? 0) >= 4 ? 'text-yellow-400' : 'text-green-400')}>
                {analysis.globalAvgRIR}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          Log {mode.toUpperCase()} bij sets om trends te zien. Gebruik de {mode.toUpperCase()} stepper tijdens het trainen.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {displayed.map(ex => (
              <ExerciseRow key={ex.exerciseName} ex={ex} mode={mode} />
            ))}
          </div>
          {filtered.length > 4 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors mx-auto"
            >
              {showAll
                ? <><ChevronUp size={13} /> Minder tonen</>
                : <><ChevronDown size={13} /> {filtered.length - 4} meer oefeningen</>}
            </button>
          )}
        </>
      )}
    </motion.div>
  )
}
