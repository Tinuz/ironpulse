'use client'

import React, { useMemo } from 'react'
import { getMuscleGroupsFromExercises } from '@/lib/exerciseData'

interface MuscleFrequencyHeatmapProps {
  workouts: any[]
}

export default function MuscleFrequencyHeatmap({ workouts }: MuscleFrequencyHeatmapProps) {
  // Calculate frequency per muscle group per week
  const heatmapData = useMemo(() => {
    const muscleGroups = [
      'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 
      'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'
    ]

    // Group workouts by week
    const weeklyData = new Map<string, Map<string, number>>()
    
    workouts.forEach(workout => {
      const date = new Date(workout.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, new Map())
      }

      const weekMap = weeklyData.get(weekKey)!
      
      // Count muscle groups in this workout
      workout.exercises?.forEach((ex: any) => {
        const muscles = getMuscleGroupsFromExercises([ex.name])
        muscles.forEach(muscle => {
          weekMap.set(muscle, (weekMap.get(muscle) || 0) + 1)
        })
      })
    })

    // Convert to array and get last 8 weeks
    const weeks = Array.from(weeklyData.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .reverse()

    return { weeks, muscleGroups }
  }, [workouts])

  if (heatmapData.weeks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Geen data beschikbaar
      </div>
    )
  }

  // Find max frequency for color scaling
  const maxFreq = Math.max(
    ...heatmapData.weeks.flatMap(([_, muscles]) => 
      Array.from(muscles.values())
    ),
    1
  )

  const getColor = (frequency: number) => {
    if (frequency === 0) return 'bg-white/5'
    const intensity = frequency / maxFreq
    if (intensity > 0.75) return 'bg-green-500'
    if (intensity > 0.5) return 'bg-green-500/70'
    if (intensity > 0.25) return 'bg-green-500/40'
    return 'bg-green-500/20'
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid gap-1" style={{ 
          gridTemplateColumns: `120px repeat(${heatmapData.weeks.length}, minmax(60px, 1fr))` 
        }}>
          {/* Header */}
          <div className="sticky left-0 bg-card z-10"></div>
          {heatmapData.weeks.map(([weekKey]) => (
            <div key={weekKey} className="text-xs font-bold text-center text-muted-foreground py-2">
              {new Date(weekKey).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
            </div>
          ))}

          {/* Muscle Groups */}
          {heatmapData.muscleGroups.map(muscle => (
            <React.Fragment key={muscle}>
              <div className="sticky left-0 bg-card z-10 text-sm font-medium py-2 pr-2 flex items-center">
                {muscle}
              </div>
              {heatmapData.weeks.map(([weekKey, muscles]) => {
                const freq = muscles.get(muscle) || 0
                return (
                  <div
                    key={`${muscle}-${weekKey}`}
                    className={`${getColor(freq)} rounded transition-colors hover:ring-2 hover:ring-green-500 cursor-pointer flex items-center justify-center h-10 relative group`}
                    title={`${muscle}: ${freq}x this week`}
                  >
                    {freq > 0 && (
                      <span className="text-xs font-bold text-white/90">{freq}</span>
                    )}
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {freq}x trained
                    </div>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>Frequency:</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-white/5 rounded"></div>
            <span>None</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-green-500/20 rounded"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-green-500/70 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  )
}
