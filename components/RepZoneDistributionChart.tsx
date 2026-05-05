'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { PieChart, Lightbulb } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateRepZoneDistribution, REP_ZONE_CONFIG, RepZone } from '@/components/utils/repZoneAnalytics'
import clsx from 'clsx'

const ZONE_ORDER: RepZone[] = ['strength', 'hypertrophy', 'endurance']

export default function RepZoneDistributionChart() {
  const { history } = useData()
  const result = calculateRepZoneDistribution(history, 28)

  if (!result.hasEnoughData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={18} className="text-muted-foreground" />
          <h3 className="font-bold text-base">Rep Zone Verdeling</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Onvoldoende data. Voer meer trainingen in om je rep zone verdeling te zien.
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
          <PieChart size={18} className="text-primary" />
          <h3 className="font-bold text-base">Rep Zone Verdeling</h3>
        </div>
        <span className="text-[10px] text-zinc-500">Laatste 28 dagen</span>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">
        {result.totalSets} sets geanalyseerd
      </p>

      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden mb-4 gap-0.5">
        {ZONE_ORDER.map(zone => {
          const data = result.zones.find(z => z.zone === zone)!
          const cfg = REP_ZONE_CONFIG[zone]
          if (data.percentage === 0) return null
          return (
            <motion.div
              key={zone}
              initial={{ width: 0 }}
              animate={{ width: `${data.percentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: ZONE_ORDER.indexOf(zone) * 0.1 }}
              className={clsx('h-full first:rounded-l-full last:rounded-r-full', cfg.bg)}
              style={{ minWidth: data.percentage > 0 ? 4 : 0 }}
            />
          )
        })}
      </div>

      {/* Zone breakdown */}
      <div className="space-y-3 mb-4">
        {ZONE_ORDER.map(zone => {
          const data = result.zones.find(z => z.zone === zone)!
          const cfg = REP_ZONE_CONFIG[zone]
          return (
            <div key={zone} className="flex items-center gap-3">
              <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', cfg.bg, 'border', cfg.border)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">{cfg.label}</span>
                  <span className={clsx('text-xs font-bold tabular-nums', cfg.color)}>
                    {data.percentage}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">{cfg.range}</span>
                  <span className="text-[10px] text-zinc-500">{data.sets} sets</span>
                </div>
                {/* Progress bar */}
                <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.percentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 + ZONE_ORDER.indexOf(zone) * 0.1 }}
                    className={clsx('h-full rounded-full', cfg.bg)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendation */}
      {result.recommendation && (
        <div className="flex gap-2 bg-white/[0.04] rounded-xl p-3">
          <Lightbulb size={14} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-300 leading-relaxed">{result.recommendation}</p>
        </div>
      )}
    </motion.div>
  )
}
