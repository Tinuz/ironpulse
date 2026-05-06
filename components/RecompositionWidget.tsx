'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Repeat, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { detectRecomposition } from '@/components/utils/recompositionDetector'

export default function RecompositionWidget() {
  const { history, bodyStats, nutritionLogs } = useData()

  const result = useMemo(
    () => detectRecomposition(history, bodyStats, nutritionLogs),
    [history, bodyStats, nutritionLogs],
  )

  // Only show when there's enough data to make a meaningful assessment
  if (!result.hasEnoughData) return null

  // Don't show if none of the indicators are met at all
  if (!result.weightStable && !result.strengthIncreasing) return null

  const allGreen = result.isRecomposing

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl p-6 shadow-sm ${
        allGreen
          ? 'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-violet-500/30'
          : 'bg-gradient-to-br from-zinc-500/5 to-zinc-500/5 border-zinc-500/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Repeat size={20} className={allGreen ? 'text-violet-400' : 'text-zinc-400'} />
        <h3 className="font-bold text-lg">Body Recompositie</h3>
        {allGreen && (
          <span className="ml-auto text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full font-semibold">
            Actief
          </span>
        )}
      </div>

      {allGreen && (
        <p className="text-sm text-violet-300 mb-4 font-medium">
          Je bent waarschijnlijk in recompositie — gewicht stabiel terwijl kracht toeneemt 💪
        </p>
      )}

      {!allGreen && (
        <p className="text-sm text-muted-foreground mb-4">
          Nog niet alle indicatoren zijn groen. Bekijk wat je kunt optimaliseren.
        </p>
      )}

      {/* Indicator list */}
      <div className="space-y-2">
        <Indicator
          label="Gewicht stabiel (±1.5 kg / 4 weken)"
          met={result.weightStable}
          detail={
            result.weightDelta !== null
              ? `Δ ${result.weightDelta > 0 ? '+' : ''}${result.weightDelta.toFixed(1)} kg`
              : 'Weeg vaker in voor data'
          }
          hasData={result.currentWeight !== null}
        />
        <Indicator
          label="Kracht neemt toe (≥ 2% in 4 weken)"
          met={result.strengthIncreasing}
          detail={
            result.strengthChangePct !== null
              ? `${result.strengthChangePct > 0 ? '+' : ''}${result.strengthChangePct.toFixed(1)}% score`
              : 'Minimaal 4 workouts nodig'
          }
          hasData={result.workoutsInWindow >= 4}
        />
        <Indicator
          label={`Eiwitinname ≥ 1.6 g/kg${result.proteinTargetGrams ? ` (≥ ${Math.round(result.proteinTargetGrams)} g/dag)` : ''}`}
          met={result.proteinAdequate ?? false}
          detail={
            result.avgDailyProtein !== null
              ? `Gem. ${Math.round(result.avgDailyProtein)} g/dag`
              : 'Log voeding voor data'
          }
          hasData={result.avgDailyProtein !== null}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-border-default">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold">Bron:</span> Barakat et al. (2020): recompositie is haalbaar
          met ≥1.6 g eiwit/kg en consistent krachttraining. Gewicht stabiel + stijgende kracht is de
          praktische indicator (Wolf, Stronger by Science 2025).
        </p>
      </div>
    </motion.div>
  )
}

function Indicator({
  label,
  met,
  detail,
  hasData,
}: {
  label: string
  met: boolean
  detail: string
  hasData: boolean
}) {
  const Icon = !hasData ? MinusCircle : met ? CheckCircle : XCircle
  const iconColor = !hasData ? 'text-zinc-500' : met ? 'text-green-400' : 'text-red-400'

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card/40">
      <Icon size={16} className={`${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground leading-snug">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
      </div>
    </div>
  )
}
