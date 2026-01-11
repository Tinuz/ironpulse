'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Target, TrendingUp } from 'lucide-react'

interface WeeklyCardioGoalProps {
  current: number
  goal: number
  percentage: number
  remaining: number
}

export default function WeeklyCardioGoal({ current, goal, percentage, remaining }: WeeklyCardioGoalProps) {
  const isCompleted = percentage >= 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-white/5 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="text-green-500" size={24} />
          <h3 className="font-bold">Wekelijks Cardio Doel</h3>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1 text-green-500 text-sm font-bold">
            <TrendingUp size={16} />
            Behaald!
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-3xl font-black text-green-500">{current}</p>
              <p className="text-sm text-muted-foreground">van {goal} minuten</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{Math.round(percentage)}%</p>
              {!isCompleted && (
                <p className="text-xs text-muted-foreground">nog {remaining} min</p>
              )}
            </div>
          </div>
          
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isCompleted 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                  : 'bg-gradient-to-r from-green-500/70 to-emerald-400/70'
              }`}
            />
          </div>
        </div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isCompleted 
            ? '🎉 Geweldig! Je hebt je wekelijkse cardio doel al bereikt. Blijf zo doorgaan!'
            : 'WHO beveelt minimaal 150 minuten matige cardio per week aan voor een gezonde levensstijl.'
          }
        </p>
      </div>
    </motion.div>
  )
}
