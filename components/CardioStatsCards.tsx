'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Heart, Timer, Route, Flame, Activity } from 'lucide-react'
import { formatDuration, formatDistance } from '@/components/utils/cardioCalculations'
import { CardioMetrics } from '@/components/utils/cardioAnalytics'

interface CardioStatsCardsProps {
  metrics: CardioMetrics
}

export default function CardioStatsCards({ metrics }: CardioStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatCard
        icon={<Activity size={20} />}
        label="Sessies"
        value={metrics.totalSessions.toString()}
        subtitle="totaal"
        color="text-green-500"
      />
      
      <StatCard
        icon={<Timer size={20} />}
        label="Totale Duur"
        value={formatDuration(metrics.totalDuration)}
        subtitle={`Ø ${formatDuration(metrics.avgDuration)}`}
        color="text-blue-500"
      />
      
      <StatCard
        icon={<Route size={20} />}
        label="Totale Afstand"
        value={formatDistance(metrics.totalDistance, 'km')}
        subtitle={`Ø ${formatDistance(metrics.avgDistance, 'km')}`}
        color="text-purple-500"
      />
      
      <StatCard
        icon={<Flame size={20} />}
        label="Calorieën"
        value={`${Math.round(metrics.totalCalories)}`}
        subtitle="verbrand"
        color="text-orange-500"
      />
      
      {metrics.avgHeartRate && (
        <StatCard
          icon={<Heart size={20} />}
          label="Ø Hartslag"
          value={`${Math.round(metrics.avgHeartRate)}`}
          subtitle="bpm"
          color="text-red-500"
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle: string
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-white/5 rounded-xl p-4"
    >
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">{label}</p>
      <p className="text-2xl font-bold mb-0.5">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </motion.div>
  )
}
