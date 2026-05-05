'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateWeeklyVolumeProgression } from '@/components/utils/weeklyVolumeProgressionAnalytics'
import clsx from 'clsx'

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return `${v}`
}

export default function WeeklyVolumeProgressionWidget() {
  const { history } = useData()
  const result = calculateWeeklyVolumeProgression(history, 8)

  const TrendIcon = result.trend === 'increasing' ? TrendingUp : result.trend === 'decreasing' ? TrendingDown : Minus
  const trendColor = result.trend === 'increasing' ? 'text-green-400' : result.trend === 'decreasing' ? 'text-red-400' : 'text-zinc-400'

  const chartData = result.weeks.map(w => ({
    label: w.weekLabel,
    volume: w.volume,
    change: w.changePercent,
    isSpike: w.isSpike,
  }))

  // Custom dot color for spike weeks is handled inline in the Area dot prop

  if (!result.hasEnoughData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-muted-foreground" />
          <h3 className="font-bold text-base">Volume Progressie</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Minimaal 3 weken trainingsdata nodig voor volume progressie analyse.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-bold text-base">Volume Progressie</h3>
        </div>
        <div className={clsx('flex items-center gap-1 text-xs font-bold', trendColor)}>
          <TrendIcon size={13} />
          {result.trend === 'increasing' ? 'Groeiend' : result.trend === 'decreasing' ? 'Dalend' : 'Stabiel'}
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">Wekelijks trainingsvolume · laatste 8 weken</p>

      {/* Chart */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a3e635" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatVolume}
            />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value: number) => [
                `${formatVolume(value)} kg`,
                'Volume',
              ]}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#a3e635"
              strokeWidth={2}
              fill="url(#volGrad)"
              dot={(dotProps) => {
                const { cx, cy, payload } = dotProps
                return (
                  <circle
                    key={`dot-${dotProps.index}`}
                    cx={cx}
                    cy={cy}
                    r={payload.isSpike ? 5 : 3}
                    fill={payload.isSpike ? '#f87171' : '#a3e635'}
                    stroke="none"
                  />
                )
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly change badges */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {result.weeks.filter(w => w.changePercent !== null).map(w => (
          <div
            key={w.weekStart}
            className={clsx(
              'px-2 py-0.5 rounded-full text-[10px] font-bold',
              w.isSpike ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              w.isDrop ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              (w.changePercent ?? 0) > 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-white/[0.05] text-zinc-500 border border-white/[0.07]'
            )}
          >
            {w.weekLabel}: {(w.changePercent ?? 0) > 0 ? '+' : ''}{w.changePercent}%
            {w.isSpike && ' ⚠'}
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {result.recommendation && (
        <div className={clsx(
          'flex gap-2 rounded-xl p-3',
          result.weeks.some(w => w.isSpike) ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.04] border border-white/[0.06]'
        )}>
          {result.weeks.some(w => w.isSpike)
            ? <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            : <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
          }
          <p className="text-xs text-zinc-300 leading-relaxed">{result.recommendation}</p>
        </div>
      )}

      {/* Science note */}
      <p className="text-[10px] text-zinc-600 mt-2">
        Max. 10% volumestijging/week aanbevolen ter preventie van blessures (Gabbett, 2016).
      </p>
    </motion.div>
  )
}
