'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Battery, BatteryWarning, Lightbulb, TrendingDown } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { detectDeloadNeed, isCurrentlyDeloading } from '@/components/utils/deloadAnalytics'

export default function DeloadRecommendationWidget() {
  const { history, restDays } = useData()
  
  const restDayDates = restDays.map(r => r.date)
  const recommendation = detectDeloadNeed(history, 6)
  const currentlyDeloading = isCurrentlyDeloading(history, restDayDates)
  
  // Don't show if not enough data
  if (history.length < 6) return null
  
  // Show different UI if currently deloading
  if (currentlyDeloading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Battery size={24} className="text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-green-500">Deload Week Actief</h3>
            <p className="text-xs text-muted-foreground">
              Je bent bezig met herstel - goed bezig! 💪
            </p>
          </div>
        </div>
      </motion.div>
    )
  }
  
  // Don't show if no deload needed — signals alone without shouldDeload=true
  // don't warrant showing a deload widget (stagnation on isolation exercises etc.)
  if (!recommendation.shouldDeload) {
    return null
  }
  
  const urgencyConfig = {
    critical: {
      color: 'red',
      icon: BatteryWarning,
      bgGradient: 'from-red-500/10 to-orange-500/10',
      borderColor: 'border-red-500/30'
    },
    high: {
      color: 'orange',
      icon: AlertTriangle,
      bgGradient: 'from-orange-500/10 to-yellow-500/10',
      borderColor: 'border-orange-500/30'
    },
    medium: {
      color: 'yellow',
      icon: Battery,
      bgGradient: 'from-yellow-500/10 to-amber-500/10',
      borderColor: 'border-yellow-500/30'
    },
    low: {
      color: 'blue',
      icon: CheckCircle,
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
      borderColor: 'border-blue-500/30'
    }
  }
  
  const config = urgencyConfig[recommendation.urgency]
  const Icon = config.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-2xl p-6 shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full bg-${config.color}-500/20 flex items-center justify-center`}>
            <Icon size={24} className={`text-${config.color}-500`} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Deload Analyse</h3>
            <p className="text-xs text-muted-foreground">
              Laatste {recommendation.weeksOfHighVolume} weken geanalyseerd
            </p>
          </div>
        </div>
      </div>
      
      {/* Recommendation */}
      <div className={`bg-${config.color}-500/10 border border-${config.color}-500/30 rounded-lg p-3 mb-4`}>
        <p className="text-sm font-bold">{recommendation.recommendation}</p>
      </div>
      
      {/* Signals - Collapsible */}
      {recommendation.signals.length > 0 && (
        <details className="bg-card/50 rounded-xl border border-white/5 overflow-hidden group mb-4">
          <summary className="p-3 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={`text-${config.color}-500`} />
              <span className="font-bold text-sm">Gedetecteerde Signalen</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground font-bold">
                {recommendation.signals.length}
              </span>
            </div>
            <Battery size={14} className="text-muted-foreground group-open:rotate-180 transition-transform" />
          </summary>
          
          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
            {recommendation.signals.map((signal, i) => {
              const severityColor = {
                high: 'red',
                medium: 'yellow',
                low: 'blue'
              }[signal.severity]
              
              const isMuscleSpecific = signal.type === 'muscle_group_overload' && signal.muscleGroup
              
              return (
                <div 
                  key={i}
                  className="bg-card/50 rounded-lg px-3 py-2 border border-white/5 flex items-start gap-2"
                >
                  <span className={`text-${severityColor}-500 text-xs font-bold flex-shrink-0 mt-0.5`}>
                    {signal.severity === 'high' && '🔴'}
                    {signal.severity === 'medium' && '🟡'}
                    {signal.severity === 'low' && '🔵'}
                  </span>
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">
                      {signal.description}
                    </span>
                    {isMuscleSpecific && (
                      <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold uppercase">
                        {signal.muscleGroup}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
      
      {/* Deload Protocol (only if deload recommended) */}
      {recommendation.shouldDeload && recommendation.deloadProtocol && (
        <details className="bg-card/50 rounded-xl border border-white/5 overflow-hidden group">
          <summary className="p-3 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-primary" />
              <span className="font-bold text-sm">Deload Protocol</span>
            </div>
            <TrendingDown size={14} className="text-muted-foreground group-open:rotate-180 transition-transform" />
          </summary>
          
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
            {/* Protocol Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/10 rounded-lg p-2 text-center border border-primary/30">
                <div className="text-xl font-black text-primary">
                  -{recommendation.deloadProtocol.volumeReduction}%
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  Volume
                </div>
              </div>
              <div className="bg-accent/10 rounded-lg p-2 text-center border border-accent/30">
                <div className="text-xl font-black text-accent">
                  -{recommendation.deloadProtocol.intensityReduction}%
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  Intensiteit
                </div>
              </div>
              <div className="bg-foreground/10 rounded-lg p-2 text-center border border-white/20">
                <div className="text-xl font-black">
                  {recommendation.deloadProtocol.durationWeeks}
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {recommendation.deloadProtocol.durationWeeks === 1 ? 'Week' : 'Weken'}
                </div>
              </div>
            </div>
            
            {/* Suggestions */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Hoe Uitvoeren:
              </div>
              {recommendation.deloadProtocol.suggestions.map((suggestion, i) => (
                <div 
                  key={i}
                  className="text-xs bg-primary/5 rounded-lg px-2 py-1.5 flex items-start gap-2"
                >
                  <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-muted-foreground">{suggestion}</span>
                </div>
              ))}
            </div>
            
            {/* Muscle Group Specific Advice */}
            {recommendation.deloadProtocol.muscleGroupAdvice && 
             Object.keys(recommendation.deloadProtocol.muscleGroupAdvice).length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Per Spiergroep:
                </div>
                {Object.entries(recommendation.deloadProtocol.muscleGroupAdvice).map(([muscle, advice]) => (
                  <div 
                    key={muscle}
                    className="text-xs bg-blue-500/5 rounded-lg px-2 py-1.5 border border-blue-500/20"
                  >
                    <span className="font-bold text-blue-400 uppercase">{muscle}:</span>
                    <span className="text-muted-foreground ml-1">{advice}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
      
      {/* Week Counter */}
      {recommendation.weeksOfHighVolume >= 3 && (
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <div className="text-xs text-muted-foreground">
            Je traint al <span className="font-bold text-primary">{recommendation.weeksOfHighVolume} weken</span> intensief
          </div>
        </div>
      )}
    </motion.div>
  )
}
