'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Scale, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateMuscleBalanceRatios, BALANCE_STATUS_META, MuscleBalanceRatio } from '@/components/utils/muscleBalanceRatiosAnalytics'
import clsx from 'clsx'

function RatioMeter({ ratio }: { ratio: MuscleBalanceRatio }) {
  const meta = BALANCE_STATUS_META[ratio.status]
  if (!ratio.hasEnoughData) return null

  // Build visual meter: agonist on left, antagonist on right
  // Center = balanced. Deviate left = agonist heavy, right = antagonist heavy
  const totalVol = ratio.agonistVolume + ratio.antagonistVolume
  const agonistPct = totalVol > 0 ? Math.round((ratio.agonistVolume / totalVol) * 100) : 50
  const antagonistPct = 100 - agonistPct

  const StatusIcon = ratio.status === 'balanced' ? CheckCircle : ratio.status === 'significant_imbalance' ? AlertTriangle : Info

  return (
    <div className={clsx('rounded-xl border p-3', ratio.status === 'balanced' ? 'border-white/[0.07] bg-white/[0.03]' : clsx(meta.border, meta.bg))}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-xs font-bold">{ratio.name}</div>
          <div className={clsx('text-[10px] font-medium mt-0.5', meta.color)}>
            <StatusIcon size={10} className="inline mr-0.5" />
            {meta.label} · ratio {ratio.ratio > 0 ? ratio.ratio.toFixed(1) : '–'} (doel: {ratio.idealLabel})
          </div>
        </div>
      </div>

      {/* Dual bar */}
      <div className="flex gap-1 items-center mb-2">
        <span className="text-[9px] text-zinc-500 w-16 text-right flex-shrink-0 leading-tight">{ratio.agonistLabel.split('(')[0].trim()}</span>
        <div className="flex-1 flex h-4 rounded-full overflow-hidden gap-px bg-white/[0.05]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${agonistPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={clsx(
              'h-full rounded-l-full',
              ratio.status === 'balanced' ? 'bg-green-500/60' :
              agonistPct > antagonistPct ? 'bg-red-500/60' : 'bg-green-500/60'
            )}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${antagonistPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className={clsx(
              'h-full rounded-r-full',
              ratio.status === 'balanced' ? 'bg-blue-500/60' :
              antagonistPct > agonistPct ? 'bg-red-500/60' : 'bg-blue-500/60'
            )}
          />
        </div>
        <span className="text-[9px] text-zinc-500 w-16 flex-shrink-0 leading-tight">{ratio.antagonistLabel.split('(')[0].trim()}</span>
      </div>

      {/* Volume labels */}
      <div className="flex justify-between text-[9px] text-zinc-600">
        <span>{Math.round(ratio.agonistVolume / 1000)}k kg</span>
        <span className="text-center text-zinc-500">{agonistPct}% / {antagonistPct}%</span>
        <span>{Math.round(ratio.antagonistVolume / 1000)}k kg</span>
      </div>

      {/* Recommendation */}
      {ratio.recommendation && (
        <p className={clsx('text-[10px] mt-2 leading-relaxed', meta.color)}>
          {ratio.recommendation}
        </p>
      )}
    </div>
  )
}

export default function MuscleBalanceRatiosWidget() {
  const { history } = useData()
  const result = calculateMuscleBalanceRatios(history, 28)

  const ratiosWithData = result.ratios.filter(r => r.hasEnoughData)

  const overallMeta = BALANCE_STATUS_META[result.overallStatus]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Scale size={18} className={ratiosWithData.length > 0 ? overallMeta.color : 'text-muted-foreground'} />
          <h3 className="font-bold text-base">Spierbalans Ratios</h3>
        </div>
        {ratiosWithData.length > 0 && (
          <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', overallMeta.bg, overallMeta.color, 'border', overallMeta.border)}>
            {overallMeta.label}
          </span>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">
        Agonist:antagonist verhoudingen · laatste 28 dagen
      </p>

      {ratiosWithData.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Onvoldoende data. Log meerdere push én pull oefeningen om je spierbalans te analyseren.
        </p>
      ) : (
        <div className="space-y-2">
          {result.ratios.map(ratio => <RatioMeter key={ratio.id} ratio={ratio} />)}
        </div>
      )}

      {/* Scientific note */}
      <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
        Op basis van Kolber &amp; Beekhuizen (2007) — schouderbalans en blessurepreventie.
      </p>
    </motion.div>
  )
}
