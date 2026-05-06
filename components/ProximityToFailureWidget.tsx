'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { analyzeProximityToFailure } from '@/components/utils/proximityToFailureAnalytics'

export default function ProximityToFailureWidget() {
  const { history, userProfile } = useData()
  const [expanded, setExpanded] = useState(false)

  const result = useMemo(() => analyzeProximityToFailure(history, 28), [history])

  // Don't render if no workout data at all
  if (!result.hasEnoughData) return null

  // Don't render if no RIR data logged at all
  if (!result.hasRIRData) return null

  const isHypertrophyGoal =
    !userProfile?.fitnessGoal || userProfile.fitnessGoal === 'bulk'

  // For strength/cut goals, only show if there's a notable issue (avg RIR ≥ 5)
  if (!isHypertrophyGoal && result.tooFarCount === 0) return null

  const headerColor =
    result.tooFarCount > 0
      ? 'text-red-400'
      : result.suboptimalCount > 0
        ? 'text-yellow-400'
        : 'text-green-400'

  const borderColor =
    result.tooFarCount > 0
      ? 'border-red-500/30'
      : result.suboptimalCount > 0
        ? 'border-yellow-500/30'
        : 'border-green-500/30'

  const bgGradient =
    result.tooFarCount > 0
      ? 'from-red-500/5 to-orange-500/5'
      : result.suboptimalCount > 0
        ? 'from-yellow-500/5 to-amber-500/5'
        : 'from-green-500/5 to-emerald-500/5'

  const statusSummary =
    result.tooFarCount > 0
      ? `${result.tooFarCount} spiergroep${result.tooFarCount > 1 ? 'en' : ''} trainen te ver van failure`
      : result.suboptimalCount > 0
        ? `${result.suboptimalCount} spiergroep${result.suboptimalCount > 1 ? 'en' : ''} kunnen intensiever`
        : 'Uitstekende intensiteit — je traint dicht bij failure'

  const rirLabel = (rir: number | null) =>
    rir === null ? '—' : rir.toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${bgGradient} border ${borderColor} rounded-2xl p-6 shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} className={headerColor} />
          <h3 className="font-bold text-lg">Intensiteit per Spiergroep</h3>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Inklappen' : 'Uitklappen'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Summary counts */}
      <p className={`text-sm mb-4 ${headerColor}`}>{statusSummary}</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {result.tooFarCount > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <div className="text-xl font-black text-red-400">{result.tooFarCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Te makkelijk</div>
          </div>
        )}
        {result.suboptimalCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-center">
            <div className="text-xl font-black text-yellow-400">{result.suboptimalCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Matig</div>
          </div>
        )}
        {result.optimalCount > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
            <div className="text-xl font-black text-green-400">{result.optimalCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Optimaal</div>
          </div>
        )}
      </div>

      {/* Global avg */}
      {result.globalAvgRIR !== null && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>Gemiddelde RIR (alle sets)</span>
          <span className={`font-semibold ${headerColor}`}>{result.globalAvgRIR.toFixed(1)} RIR</span>
        </div>
      )}

      {/* RIR coverage */}
      {result.setsWithRIRPct < 60 && (
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
          <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Slechts <span className="text-blue-400 font-semibold">{result.setsWithRIRPct.toFixed(0)}%</span> van je sets heeft RIR gelogd.
            Log RIR bij meer sets voor nauwkeurigere inzichten.
          </p>
        </div>
      )}

      {/* Per-muscle breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {result.muscles.map(m => (
              <div
                key={m.group}
                className={`flex items-center justify-between p-3 rounded-xl ${m.bgColor} border ${m.borderColor}`}
              >
                <div>
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.setsWithRIR}/{m.totalWorkingSets} sets met RIR
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${m.scoreColor}`}>
                    {rirLabel(m.avgRIR)}
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider ${m.scoreColor}`}>
                    {m.scoreLabel}
                  </div>
                </div>
              </div>
            ))}

            {/* Science note */}
            <div className="mt-3 pt-3 border-t border-border-default">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold">Bron:</span> Robinson et al. (2024) toonden via
                meta-regressie (75 studies) dat spierhypertrofie toeneemt naarmate sets dichter bij
                failure worden uitgevoerd (RIR ≤ 2 optimaal). Voor krachtwinst maakt RIR minder uit.
                Doel bij hypertrofie: gemiddeld RIR 1–3 per werkset.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && result.muscles.length > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          Toon per spiergroep →
        </button>
      )}
    </motion.div>
  )
}
