'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateVolumeLandmarks, MuscleVolumeLandmark } from '@/components/utils/volumeLandmarksAnalytics'
import clsx from 'clsx'

const MV_COLOR = 'bg-blue-500'
const MEV_COLOR = 'bg-green-500'
const MAV_COLOR = 'bg-primary'
const MRV_COLOR = 'bg-red-500'

function LandmarkBar({ muscle }: { muscle: MuscleVolumeLandmark }) {
  const lm = muscle.landmarks
  const max = lm.mrv + 4 // a bit beyond MRV for visual breathing room
  const pct = (v: number) => Math.round((v / max) * 100)

  const fillColor =
    muscle.status === 'below_mv' ? 'bg-zinc-600' :
    muscle.status === 'mv_to_mev' ? 'bg-blue-500' :
    muscle.status === 'mav' ? 'bg-green-500' :
    muscle.status === 'approaching_mrv' ? 'bg-yellow-500' :
    'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 flex-shrink-0">
        <span className="text-xs font-medium text-zinc-300">{muscle.label}</span>
      </div>
      <div className="flex-1 relative h-5 bg-white/[0.05] rounded-full overflow-visible">
        {/* Landmark tick marks */}
        {[lm.mv, lm.mev, lm.mavHigh, lm.mrv].map((val, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: `${pct(val)}%` }}
          />
        ))}
        {/* Fill bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct(muscle.weeklySets))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={clsx('h-full rounded-full', fillColor)}
        />
        {/* Value label */}
        {muscle.weeklySets > 0 && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-white pointer-events-none"
            style={{ left: `calc(${Math.min(96, pct(muscle.weeklySets))}% + 4px)` }}
          >
            {muscle.weeklySets}
          </span>
        )}
      </div>
      <div className="w-16 flex-shrink-0 text-right">
        <span className={clsx('text-[10px] font-bold', muscle.statusColor)}>
          {muscle.statusLabel}
        </span>
      </div>
    </div>
  )
}

export default function VolumeLandmarksWidget() {
  const { history } = useData()
  const [showAll, setShowAll] = useState(false)
  const result = calculateVolumeLandmarks(history)

  const trainedMuscles = result.muscles.filter(m => m.weeklySets > 0)
  const untrainedMuscles = result.muscles.filter(m => m.weeklySets === 0)
  const displayed = showAll ? result.muscles : trainedMuscles.slice(0, 6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-primary" />
          <h3 className="font-bold text-base">Volume Landmarks</h3>
        </div>
        <span className="text-[10px] text-zinc-500">Sets / week</span>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">
        Op basis van RP Strength wetenschappelijk volumeonderzoek
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
        {[
          { color: MV_COLOR,  label: `MV ~6` },
          { color: MEV_COLOR, label: `MEV ~8` },
          { color: MAV_COLOR, label: `MAV 10–20` },
          { color: MRV_COLOR, label: `MRV 20+` },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={clsx('w-1.5 h-1.5 rounded-full', color)} />
            <span className="text-[9px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Muscle bars */}
      {!result.hasEnoughData ? (
        <p className="text-sm text-muted-foreground">
          Log deze week trainingen om je volume landmarks te zien.
        </p>
      ) : (
        <div className="space-y-2.5">
          {displayed.map(m => <LandmarkBar key={m.group} muscle={m} />)}
        </div>
      )}

      {/* Show more / less */}
      {result.hasEnoughData && (trainedMuscles.length > 6 || showAll) && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors mx-auto"
        >
          {showAll ? <><ChevronUp size={13} /> Minder tonen</> : <><ChevronDown size={13} /> Alle {result.muscles.length} spiergroepen</>}
        </button>
      )}

      {/* Warning for untrained muscles */}
      {result.hasEnoughData && untrainedMuscles.length > 0 && !showAll && (
        <p className="text-[10px] text-zinc-600 mt-3">
          {untrainedMuscles.map(m => m.label).join(', ')} niet getraind deze week.
        </p>
      )}
    </motion.div>
  )
}
