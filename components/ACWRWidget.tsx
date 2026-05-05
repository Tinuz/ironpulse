'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateACWR, ACWR_ZONES } from '@/components/utils/acwrAnalytics'
import clsx from 'clsx'

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k kg`
  return `${Math.round(v)} kg`
}

export default function ACWRWidget() {
  const { history } = useData()
  const result = calculateACWR(history)
  const zone = ACWR_ZONES[result.zone]

  if (!result.hasEnoughData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-muted-foreground" />
          <h3 className="font-bold text-base">Belastingsratio (ACWR)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Minimaal 2 weken trainingsdata nodig om de acute:chronische belastingsratio te berekenen.
        </p>
      </motion.div>
    )
  }

  // Gauge: map ACWR 0–2+ to 0–100% angle
  // Sweet spot = 0.8–1.3, danger = 1.5+
  const gaugePercent = Math.min(100, (result.acwr / 2) * 100)

  // Stroke dash for semi-circle gauge (r=40, circumference = π*40 ≈ 125.7, half = 62.8)
  const HALF_CIRC = 125.66
  const strokeDash = (gaugePercent / 100) * HALF_CIRC

  const TrendIcon = result.acwr > 1.3 ? TrendingUp : result.acwr < 0.8 ? TrendingDown : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('rounded-2xl p-5 border', zone.bg, zone.border)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className={zone.color} />
          <h3 className="font-bold text-base">Belastingsratio (ACWR)</h3>
        </div>
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', zone.bg, zone.color, 'border', zone.border)}>
          {zone.label}
        </span>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center mb-4">
        <svg width="120" height="68" viewBox="0 0 120 68" className="overflow-visible">
          {/* Background track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Zone coloring: green 0.8-1.3 (~40-65%), yellow 1.3-1.5, red 1.5+ */}
          {/* Green zone */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="rgba(34,197,94,0.3)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(0.65 - 0.4) * HALF_CIRC} ${HALF_CIRC}`}
            strokeDashoffset={-0.4 * HALF_CIRC}
          />
          {/* Animated fill */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke={
              result.zone === 'optimal' ? '#22c55e'
              : result.zone === 'caution' ? '#eab308'
              : result.zone === 'danger' ? '#ef4444'
              : '#3b82f6'
            }
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${HALF_CIRC}`}
            strokeDashoffset="0"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
          {/* Needle dot */}
          <circle
            cx={10 + Math.cos(Math.PI - (gaugePercent / 100) * Math.PI) * 50 + 50}
            cy={60 + Math.sin(Math.PI - (gaugePercent / 100) * Math.PI) * (-50)}
            r="5"
            fill="white"
            className="drop-shadow"
          />
        </svg>

        {/* ACWR value */}
        <div className={clsx('text-3xl font-black tabular-nums -mt-2', zone.color)}>
          {result.acwr.toFixed(2)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Ideaal: 0.80 – 1.30
        </div>
      </div>

      {/* Weekly bars */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {result.weeklyLoads.map((load, i) => {
          const maxLoad = Math.max(...result.weeklyLoads, 1)
          const h = Math.max(4, Math.round((load / maxLoad) * 40))
          const isLast = i === result.weeklyLoads.length - 1
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 44 }}>
                <div
                  className={clsx(
                    'w-full rounded-t-sm transition-all',
                    isLast ? (result.zone === 'optimal' ? 'bg-green-500' : result.zone === 'danger' ? 'bg-red-500' : result.zone === 'caution' ? 'bg-yellow-500' : 'bg-blue-500') : 'bg-white/20'
                  )}
                  style={{ height: h }}
                />
              </div>
              <span className="text-[9px] text-zinc-500 text-center">
                {isLast ? 'Nu' : `W-${result.weeklyLoads.length - 1 - i}`}
              </span>
            </div>
          )
        })}
      </div>

      {/* Acute vs Chronic */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/[0.04] rounded-xl p-3 text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Acuut (7d)</div>
          <div className="font-bold text-sm">{formatVolume(result.acuteLoad)}</div>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3 text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Chronisch (28d)</div>
          <div className="font-bold text-sm">{formatVolume(result.chronicLoad)}</div>
        </div>
      </div>

      {/* Description */}
      <p className={clsx('text-xs leading-relaxed', zone.color)}>
        <TrendIcon size={12} className="inline mr-1" />
        {zone.description}
      </p>
    </motion.div>
  )
}
