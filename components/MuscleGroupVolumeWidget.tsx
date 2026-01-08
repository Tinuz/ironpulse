'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateMuscleGroupVolume, detectMuscleImbalances, MUSCLE_GROUPS } from '@/components/utils/volumeAnalytics'

export default function MuscleGroupVolumeWidget() {
  const { history } = useData()
  
  const volumeData = calculateMuscleGroupVolume(history, 7)
  const imbalances = detectMuscleImbalances(volumeData)
  
  if (volumeData.length === 0) {
    return null // Don't show if no data
  }
  
  // Get max volume for scaling
  const maxVolume = Math.max(...volumeData.map(v => v.totalVolume))
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Volume per Spiergroep</h3>
        <span className="text-xs text-muted-foreground">Afgelopen 7 dagen</span>
      </div>
      
      {/* Imbalance Warning */}
      {imbalances.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-yellow-500 mb-1">Onevenwichtige training</p>
            <p className="text-muted-foreground">{imbalances[0].suggestion}</p>
          </div>
        </div>
      )}
      
      {/* Volume Bars */}
      <div className="space-y-3">
        {volumeData.slice(0, 6).map((data) => {
          const percentage = (data.totalVolume / maxVolume) * 100
          const isImbalanced = imbalances.some(
            i => i.undertrainedGroup === data.group || i.overtrainedGroup === data.group
          )
          
          return (
            <div key={data.group}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold">
                  {MUSCLE_GROUPS[data.group]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {data.totalSets} sets • {Math.round(data.totalVolume / 1000)}k kg
                </span>
              </div>
              
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`h-full rounded-full ${
                    isImbalanced 
                      ? 'bg-yellow-500' 
                      : 'bg-gradient-to-r from-primary to-accent'
                  }`}
                />
              </div>
              
              {/* Exercise count */}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {data.exercises.length} {data.exercises.length === 1 ? 'oefening' : 'oefeningen'}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-2xl font-black text-primary">
            {volumeData.length}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Spiergroepen
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-accent">
            {volumeData.reduce((sum, v) => sum + v.totalSets, 0)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Totaal Sets
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-foreground">
            {Math.round(volumeData.reduce((sum, v) => sum + v.totalVolume, 0) / 1000)}k
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Volume (kg)
          </div>
        </div>
      </div>
    </motion.div>
  )
}
