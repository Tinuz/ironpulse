'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface VolumeProgressionChartProps {
  data: Array<{
    date: string
    [key: string]: any
  }>
  selectedMuscleGroup: string | null
  onSelectMuscleGroup: (group: string | null) => void
}

export default function VolumeProgressionChart({ 
  data, 
  selectedMuscleGroup,
  onSelectMuscleGroup 
}: VolumeProgressionChartProps) {
  const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms']
  
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
    ...Object.fromEntries(
      muscleGroups.map(mg => [mg.toLowerCase(), Math.round((d[`${mg.toLowerCase()}Volume`] || 0) / 1000)])
    )
  }))

  const colors = {
    chest: '#3b82f6',
    back: '#10b981',
    shoulders: '#f59e0b',
    legs: '#ef4444',
    arms: '#8b5cf6'
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Geen data beschikbaar
      </div>
    )
  }

  return (
    <div>
      {/* Muscle Group Selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => onSelectMuscleGroup(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedMuscleGroup === null
              ? 'bg-primary text-white'
              : 'bg-white/5 text-muted-foreground hover:bg-white/10'
          }`}
        >
          All
        </button>
        {muscleGroups.map(group => (
          <button
            key={group}
            onClick={() => onSelectMuscleGroup(group.toLowerCase())}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedMuscleGroup === group.toLowerCase()
                ? 'text-white'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
            style={{
              backgroundColor: selectedMuscleGroup === group.toLowerCase() 
                ? colors[group.toLowerCase() as keyof typeof colors]
                : undefined
            }}
          >
            {group}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.3)"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)"
            style={{ fontSize: '12px' }}
            label={{ value: 'Volume (kg × 1000)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.5)' } }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value}k kg`, '']}
          />
          {!selectedMuscleGroup && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          
          {muscleGroups.map(group => {
            const key = group.toLowerCase()
            const isVisible = !selectedMuscleGroup || selectedMuscleGroup === key
            
            return isVisible ? (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[key as keyof typeof colors]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name={group}
              />
            ) : null
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
