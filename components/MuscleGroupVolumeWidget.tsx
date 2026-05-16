'use client'

import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useData } from '@/components/context/DataContext'
import { calculateVolumeLandmarks } from '@/components/utils/volumeLandmarksAnalytics'

export default function MuscleGroupVolumeWidget() {
  const { history } = useData()
  const { muscles, hasEnoughData } = calculateVolumeLandmarks(history)

  if (!hasEnoughData) return null

  const trained = muscles.filter(m => m.weeklySets > 0)
  const belowMEV = trained.filter(m => m.status === 'below_mv' || m.status === 'mv_to_mev')
  const inMAV = trained.filter(m => m.status === 'mav' || m.status === 'approaching_mrv')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-secondary border border-border-default rounded-professional p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-txt-primary">Volume Targets</h3>
        <span className="text-xs text-txt-tertiary">Deze week</span>
      </div>

      {/* Alert: muscles below MEV */}
      {belowMEV.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-xs">
          <p className="font-bold text-amber-400 mb-0.5">⚠️ Onder minimaal volume</p>
          <p className="text-muted-foreground">
            {belowMEV.map(m => m.label).join(', ')} — voeg sets toe voor optimale groei
          </p>
        </div>
      )}

      {/* Muscle rows */}
      <div className="space-y-3.5">
        {trained.map(m => (
          <div key={m.group}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold">{m.label}</span>
              <span className={clsx('text-xs font-semibold', m.statusColor)}>{m.statusLabel}</span>
            </div>
            {/* Progress bar: 0 → MRV with MEV and MAV-low markers */}
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              {/* MEV marker (blue) */}
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-400/60"
                style={{ left: `${Math.round((m.landmarks.mev / m.landmarks.mrv) * 100)}%` }}
              />
              {/* MAV-low marker (green) */}
              <div
                className="absolute top-0 bottom-0 w-px bg-green-400/60"
                style={{ left: `${Math.round((m.landmarks.mavLow / m.landmarks.mrv) * 100)}%` }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${m.fillPct}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={clsx(
                  'h-full rounded-full',
                  m.status === 'mav' || m.status === 'approaching_mrv' ? 'bg-green-500' :
                  m.status === 'at_mrv' ? 'bg-red-500' : 'bg-amber-500'
                )}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5 text-[9px] text-muted-foreground">
              <span>{m.weeklySets} sets</span>
              <span>MEV {m.landmarks.mev} · MAV {m.landmarks.mavLow}–{m.landmarks.mavHigh} · MRV {m.landmarks.mrv}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-center">
        <div>
          <div className={clsx('text-2xl font-black', belowMEV.length > 0 ? 'text-amber-400' : 'text-green-400')}>
            {belowMEV.length}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Onder MEV
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-green-400">
            {inMAV.length}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            In MAV zone
          </div>
        </div>
      </div>
    </motion.div>
  )
}
