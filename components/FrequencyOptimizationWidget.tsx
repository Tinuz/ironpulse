'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { analyzeFrequencyOptimization } from '@/components/utils/frequencyOptimizationAnalytics'

export default function FrequencyOptimizationWidget() {
  const { history } = useData()

  const result = useMemo(() => analyzeFrequencyOptimization(history, 28), [history])

  if (!result.hasEnoughData || result.recommendations.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/30 rounded-2xl p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={20} className="text-blue-400" />
        <h3 className="font-bold text-lg">Trainingsfrequentie</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Je traint {result.recommendations.length === 1 ? 'een spiergroep' : 'meerdere spiergroepen'} met veel
        volume in te weinig sessies. Meer spreiding → betere hypertrofie respons.
      </p>

      <div className="space-y-3">
        {result.recommendations.map(rec => (
          <div
            key={rec.group}
            className={`p-3 rounded-xl border ${rec.priority === 'high' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm">{rec.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {rec.priority === 'high' ? 'Hoge prioriteit' : 'Optimalisatie'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{rec.avgWeeklySets} sets/week in {rec.avgWeeklyFrequency}× sessie(s)</span>
              <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
              <span className="text-foreground font-medium">
                {rec.idealFrequency}× {rec.setsPerSession} sets voor meer groei
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border-default">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold">Bron:</span> Pelland et al. (2026) toonden via
          meta-regressie dat hoog wekelijks volume het meest effectief is wanneer het verspreid
          wordt over meerdere sessies. Schoenfeld et al. (2016): ≥2×/week per spiergroep
          is superieur aan 1×/week voor hypertrofie.
        </p>
      </div>
    </motion.div>
  )
}
