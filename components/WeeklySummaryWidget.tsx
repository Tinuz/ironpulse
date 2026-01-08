'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, TrendingDown, Flame, Dumbbell } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { calculateWeeklySummary } from '@/components/utils/weeklyAnalytics'

export default function WeeklySummaryWidget() {
  const { history, nutritionLogs } = useData()
  
  const summary = calculateWeeklySummary(history, nutritionLogs, 0)
  const lastWeek = calculateWeeklySummary(history, nutritionLogs, -1)
  
  // Calculate changes
  const volumeChange = lastWeek.stats.totalVolume > 0
    ? ((summary.stats.totalVolume - lastWeek.stats.totalVolume) / lastWeek.stats.totalVolume) * 100
    : 0
  
  const workoutChange = summary.stats.totalWorkouts - lastWeek.stats.totalWorkouts
  
  if (summary.stats.totalWorkouts === 0) {
    return null // Don't show if no workouts this week
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-primary" />
          <h3 className="font-bold text-lg">Deze Week</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(summary.weekStart).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
          {' - '}
          {new Date(summary.weekEnd).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card/50 rounded-xl p-3 border border-white/5">
          <div className="text-3xl font-black text-primary mb-1">
            {summary.stats.totalWorkouts}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Workouts
          </div>
          {workoutChange !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              workoutChange > 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {workoutChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{workoutChange > 0 ? '+' : ''}{workoutChange} vs vorige week</span>
            </div>
          )}
        </div>
        
        <div className="bg-card/50 rounded-xl p-3 border border-white/5">
          <div className="text-3xl font-black text-accent mb-1">
            {Math.round(summary.stats.totalVolume / 1000)}k
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Volume (kg)
          </div>
          {volumeChange !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              volumeChange > 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {volumeChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{volumeChange > 0 ? '+' : ''}{volumeChange.toFixed(0)}%</span>
            </div>
          )}
        </div>
        
        <div className="bg-card/50 rounded-xl p-3 border border-white/5">
          <div className="text-3xl font-black text-foreground mb-1">
            {summary.stats.totalSets}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Dumbbell size={10} />
            Totaal Sets
          </div>
        </div>
        
        {summary.stats.totalCalories > 0 && (
          <div className="bg-card/50 rounded-xl p-3 border border-white/5">
            <div className="text-3xl font-black text-orange-500 mb-1">
              {Math.round(summary.stats.totalCalories)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Flame size={10} />
              kcal verbrand
            </div>
          </div>
        )}
      </div>
      
      {/* Top Muscle Groups */}
      {summary.muscleGroups.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-bold">
            Top Spiergroepen
          </div>
          <div className="flex gap-2 flex-wrap">
            {summary.muscleGroups.slice(0, 3).map((mg, i) => (
              <div 
                key={mg.group}
                className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-xs font-bold"
              >
                {i === 0 && '🥇 '}
                {i === 1 && '🥈 '}
                {i === 2 && '🥉 '}
                {mg.group} ({mg.sets} sets)
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Insights */}
      {summary.insights.length > 0 && (
        <div className="space-y-2">
          {summary.insights.slice(0, 2).map((insight, i) => (
            <div 
              key={i}
              className="text-xs bg-card/30 rounded-lg px-3 py-2 border border-white/5"
            >
              {insight}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
