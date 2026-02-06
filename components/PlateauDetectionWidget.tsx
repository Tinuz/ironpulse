'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, TrendingDown, Lightbulb, ChevronRight, ChevronDown } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { 
  detectAllPlateaus, 
  getPlateauSeverity, 
  generatePlateauSummary 
} from '@/components/utils/plateauDetection'
import { getRecentPRs } from '@/components/utils/strengthAnalytics'

export default function PlateauDetectionWidget() {
  const { history } = useData()
  const [showAll, setShowAll] = useState(false)
  
  const summary = generatePlateauSummary(history)
  const allPlateaus = detectAllPlateaus(history, 3)
  
  // Filter out exercises with recent PRs (last 7 days)
  const recentPRs = getRecentPRs(history, 7)
  const recentPRExercises = new Set(recentPRs.map(pr => pr.exerciseName.toLowerCase()))
  
  const plateaus = allPlateaus.filter(plateau => 
    !recentPRExercises.has(plateau.exerciseName.toLowerCase())
  )
  
  const displayPlateaus = showAll ? plateaus : plateaus.slice(0, 3)
  
  if (plateaus.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <TrendingDown size={24} className="text-green-500 rotate-180" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-green-500">Geen Plateaus!</h3>
            <p className="text-xs text-muted-foreground">
              Je maakt goede progressie - blijf doorgaan! 💪
            </p>
          </div>
        </div>
      </motion.div>
    )
  }
  
  const severityColor = {
    excellent: 'green',
    good: 'blue',
    attention: 'yellow',
    critical: 'red'
  }[summary.overallStatus]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-${severityColor}-500/10 border border-${severityColor}-500/30 rounded-2xl p-6 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className={`text-${severityColor}-500`} />
          <h3 className="font-bold text-lg">Plateau Detectie</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {plateaus.length} {plateaus.length === 1 ? 'oefening' : 'oefeningen'}
        </div>
      </div>
      
      {/* Info about recent PRs */}
      {recentPRExercises.size > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-green-500 font-bold mb-1">✨ Recente PRs uitgesloten</p>
          <p className="text-xs text-muted-foreground">
            {recentPRExercises.size} {recentPRExercises.size === 1 ? 'oefening' : 'oefeningen'} met PR in de laatste 7 dagen worden niet getoond
          </p>
        </div>
      )}
      
      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {summary.severeCount > 0 && (
          <div className="bg-red-500/10 rounded-lg p-2 text-center border border-red-500/30">
            <div className="text-xl font-black text-red-500">{summary.severeCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Ernstig</div>
          </div>
        )}
        {summary.moderateCount > 0 && (
          <div className="bg-yellow-500/10 rounded-lg p-2 text-center border border-yellow-500/30">
            <div className="text-xl font-black text-yellow-500">{summary.moderateCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Matig</div>
          </div>
        )}
        {summary.mildCount > 0 && (
          <div className="bg-blue-500/10 rounded-lg p-2 text-center border border-blue-500/30">
            <div className="text-xl font-black text-blue-500">{summary.mildCount}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Licht</div>
          </div>
        )}
      </div>
      
      {/* Top Plateaus */}
      <div className="space-y-3">
        {displayPlateaus.map((plateau) => {
          const severity = getPlateauSeverity(plateau.weeksStagnant)
          const severityBadge = {
            severe: { label: 'Ernstig', color: 'red' },
            moderate: { label: 'Matig', color: 'yellow' },
            mild: { label: 'Licht', color: 'blue' }
          }[severity]
          
          return (
            <details 
              key={plateau.exerciseName}
              className={`bg-card/50 rounded-xl border border-${severityBadge.color}-500/30 overflow-hidden group`}
            >
              <summary className="p-3 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{plateau.exerciseName}</span>
                    {plateau.muscleGroup && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground font-bold uppercase">
                        {plateau.muscleGroup}
                      </span>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full bg-${severityBadge.color}-500/20 text-${severityBadge.color}-500 font-bold uppercase`}>
                      {severityBadge.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plateau.weeksStagnant} {plateau.weeksStagnant === 1 ? 'week' : 'weken'} stagnant
                    {plateau.last1RM && ` • Laatste 1RM: ${Math.round(plateau.last1RM)}kg`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-open:rotate-90 transition-transform" />
              </summary>
              
              {/* Suggestions */}
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                <div className="flex items-center gap-1 text-xs text-primary font-bold mb-2">
                  <Lightbulb size={12} />
                  <span>Suggesties:</span>
                </div>
                {plateau.ruleSuggestions.map((suggestion, j) => (
                  <div 
                    key={j}
                    className="text-xs bg-primary/5 rounded-lg px-2 py-1.5 flex items-start gap-2"
                  >
                    <span className="text-primary font-bold flex-shrink-0">{j + 1}.</span>
                    <span className="text-muted-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
      
      {plateaus.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full py-2 text-xs text-primary hover:text-primary/80 font-bold flex items-center justify-center gap-1 transition-colors"
        >
          {showAll ? (
            <>
              <ChevronDown size={14} className="rotate-180" />
              Toon minder
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Toon alle {plateaus.length} oefeningen
            </>
          )}
        </button>
      )}
    </motion.div>
  )
}
