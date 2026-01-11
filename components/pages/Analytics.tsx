'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Activity,
  Zap,
  Calendar,
  BarChart3,
  Target,
  Award,
  Dumbbell,
  Heart
} from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import {
  calculateVolumeByMuscleGroup,
  calculatePushPullVolume,
  getVolumeTimeSeries
} from '@/components/utils/volumeAnalytics'
import {
  get1RMProgression
} from '@/components/utils/strengthAnalytics'
import {
  calculateCardioMetrics,
  getCardioTimeSeries,
  getCardioActivityBreakdown,
  calculateWeeklyCardioProgress
} from '@/components/utils/cardioAnalytics'
import PushPullVolumeChart from '@/components/PushPullVolumeChart'
import MuscleFrequencyHeatmap from '@/components/MuscleFrequencyHeatmap'
import VolumeProgressionChart from '@/components/VolumeProgressionChart'
import StrengthProgressionChart from '@/components/StrengthProgressionChart'
import CardioDurationChart from '@/components/CardioDurationChart'
import CardioActivityChart from '@/components/CardioActivityChart'
import CardioStatsCards from '@/components/CardioStatsCards'
import WeeklyCardioGoal from '@/components/WeeklyCardioGoal'

export default function Analytics() {
  const { history } = useData()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null)
  const [analyticsTab, setAnalyticsTab] = useState<'strength' | 'cardio'>('strength')

  // Calculate date range
  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    
    switch (timeRange) {
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(start.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(start.getFullYear() - 1)
        break
    }
    
    return { start, end }
  }

  // Filter workouts by date range
  const { start, end } = getDateRange()
  const filteredWorkouts = history.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= start && workoutDate <= end
  })

  // Calculate metrics
  const pushPullVolume = calculatePushPullVolume(filteredWorkouts)
  const muscleGroupVolume = calculateVolumeByMuscleGroup(filteredWorkouts)
  const volumeTimeSeries = getVolumeTimeSeries(filteredWorkouts, timeRange)
  const strengthProgression = get1RMProgression(filteredWorkouts, timeRange)

  // Cardio metrics
  const cardioWorkouts = filteredWorkouts.filter(w => w.cardioSummary || w.exercises?.some(e => e.type === 'cardio'))
  const cardioMetrics = calculateCardioMetrics(cardioWorkouts)
  const cardioTimeSeries = getCardioTimeSeries(cardioWorkouts, timeRange)
  const cardioActivityBreakdown = getCardioActivityBreakdown(filteredWorkouts)
  const weeklyCardioProgress = calculateWeeklyCardioProgress(history)

  // Stats cards data
  const totalVolume = Object.values(muscleGroupVolume).reduce((sum, vol) => sum + vol, 0)
  const totalWorkouts = filteredWorkouts.length
  const avgVolumePerWorkout = totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-500 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-white/80 text-sm">Gedetailleerde analyse van je trainingsdata</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Analytics Type Tabs */}
        <div className="flex gap-2 bg-card border border-white/5 rounded-xl p-1">
          <button
            onClick={() => setAnalyticsTab('strength')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              analyticsTab === 'strength'
                ? 'bg-primary text-black shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Dumbbell size={18} />
            Strength Analytics
          </button>
          <button
            onClick={() => setAnalyticsTab('cardio')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              analyticsTab === 'cardio'
                ? 'bg-green-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart size={18} />
            Cardio Analytics
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground hover:bg-white/5'
              }`}
            >
              {range === 'week' && '7 dagen'}
              {range === 'month' && '30 dagen'}
              {range === 'quarter' && '3 maanden'}
              {range === 'year' && '12 maanden'}
            </button>
          ))}
        </div>

        {/* Strength Analytics Content */}
        {analyticsTab === 'strength' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<BarChart3 size={24} />}
                label="Totaal Volume"
                value={`${Math.round(totalVolume / 1000)}k`}
                subtitle="kg"
                color="text-primary"
              />
              <StatCard
                icon={<Activity size={24} />}
                label="Workouts"
                value={totalWorkouts.toString()}
                subtitle={`${timeRange === 'week' ? 'deze week' : timeRange === 'month' ? 'deze maand' : timeRange === 'quarter' ? 'dit kwartaal' : 'dit jaar'}`}
                color="text-green-500"
              />
              <StatCard
                icon={<Zap size={24} />}
                label="Gem. Volume"
                value={Math.round(avgVolumePerWorkout / 1000).toString()}
                subtitle="kg per workout"
                color="text-amber-500"
              />
              <StatCard
                icon={<Target size={24} />}
                label="Push/Pull Ratio"
                value={pushPullVolume.pushVolume > 0 && pushPullVolume.pullVolume > 0
                  ? `${(pushPullVolume.pushVolume / pushPullVolume.pullVolume).toFixed(1)}`
                  : '—'}
                subtitle="push:pull"
                color="text-blue-500"
              />
            </div>

            {/* Push/Pull Volume Chart */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Push vs Pull Volume
              </h2>
              <PushPullVolumeChart data={volumeTimeSeries} />
            </div>

            {/* Muscle Frequency Heatmap */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Muscle Group Frequency
              </h2>
              <MuscleFrequencyHeatmap workouts={filteredWorkouts} />
            </div>

            {/* Volume Progression by Muscle Group */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-primary" />
                Volume Progression
              </h2>
              <VolumeProgressionChart 
                data={volumeTimeSeries}
                selectedMuscleGroup={selectedMuscleGroup}
                onSelectMuscleGroup={setSelectedMuscleGroup}
              />
            </div>

            {/* Strength Progression */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Award size={20} className="text-primary" />
                Strength Progression (Estimated 1RM)
              </h2>
              <StrengthProgressionChart data={strengthProgression} />
            </div>

            {/* Top Exercises by Volume */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Top Exercises by Volume</h2>
              <TopExercisesList workouts={filteredWorkouts} />
            </div>
          </>
        )}

        {/* Cardio Analytics Content */}
        {analyticsTab === 'cardio' && (
          <>
            {/* Cardio Stats Cards */}
            <CardioStatsCards metrics={cardioMetrics} />

            {/* Weekly Cardio Goal */}
            <WeeklyCardioGoal
              current={weeklyCardioProgress.current}
              goal={weeklyCardioProgress.goal}
              percentage={weeklyCardioProgress.percentage}
              remaining={weeklyCardioProgress.remaining}
            />

            {/* Cardio Duration Over Time */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-500" />
                Cardio Duur Over Tijd
              </h2>
              <CardioDurationChart data={cardioTimeSeries} />
            </div>

            {/* Activity Breakdown */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-green-500" />
                Activiteiten Overzicht
              </h2>
              <CardioActivityChart data={cardioActivityBreakdown} />
            </div>

            {/* Top Cardio Activities List */}
            <div className="bg-card border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Top Cardio Activiteiten</h2>
              <TopCardioActivitiesList activities={cardioActivityBreakdown} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Stat Card Component
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

// Top Exercises List Component
function TopExercisesList({ workouts }: { workouts: any[] }) {
  const exerciseVolumes = new Map<string, number>()

  workouts.forEach(workout => {
    workout.exercises?.forEach((ex: any) => {
      const volume = ex.sets?.reduce((sum: number, set: any) => 
        sum + (set.weight || 0) * (set.reps || 0), 0) || 0
      
      const currentVolume = exerciseVolumes.get(ex.name) || 0
      exerciseVolumes.set(ex.name, currentVolume + volume)
    })
  })

  const topExercises = Array.from(exerciseVolumes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (topExercises.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Geen data beschikbaar</p>
  }

  const maxVolume = topExercises[0][1]

  return (
    <div className="space-y-3">
      {topExercises.map(([name, volume], index) => (
        <div key={name} className="flex items-center gap-3">
          <div className="w-6 text-center text-sm font-bold text-muted-foreground">
            #{index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm">{name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {Math.round(volume / 1000)}k kg
              </p>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all"
                style={{ width: `${(volume / maxVolume) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Top Cardio Activities List Component
function TopCardioActivitiesList({ activities }: { activities: any[] }) {
  if (activities.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Geen cardio data beschikbaar</p>
  }

  const maxDuration = activities[0]?.duration || 1

  return (
    <div className="space-y-3">
      {activities.slice(0, 10).map((activity, index) => (
        <div key={activity.activity} className="flex items-center gap-3">
          <div className="w-6 text-center text-sm font-bold text-muted-foreground">
            #{index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm">{activity.activity}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span>{Math.round(activity.duration / 60)} min</span>
                {activity.distance > 0 && (
                  <span>{(activity.distance / 1000).toFixed(1)} km</span>
                )}
                <span>{activity.sessions}x</span>
              </div>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${(activity.duration / maxDuration) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
