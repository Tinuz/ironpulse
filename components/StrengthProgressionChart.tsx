'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StrengthProgressionChartProps {
  data: Array<{
    date: string
    exercises: Array<{
      name: string
      estimated1RM: number
    }>
  }>
}

export default function StrengthProgressionChart({ data }: StrengthProgressionChartProps) {
  // Extract top 5 exercises by latest 1RM
  const latestData = data[data.length - 1]
  const topExercises = latestData?.exercises
    ? [...latestData.exercises]
        .sort((a, b) => b.estimated1RM - a.estimated1RM)
        .slice(0, 5)
        .map(e => e.name)
    : []

  // Build chart data
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
    ...Object.fromEntries(
      topExercises.map(name => {
        const exercise = d.exercises.find(e => e.name === name)
        return [name, exercise ? Math.round(exercise.estimated1RM) : null]
      })
    )
  }))

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  // Calculate trends for each exercise
  const getTrend = (exerciseName: string) => {
    const values = chartData
      .map(d => (d as any)[exerciseName])
      .filter(v => v !== null) as number[]
    
    if (values.length < 2) return 'stable'
    
    const first = values[0]
    const last = values[values.length - 1]
    const change = ((last - first) / first) * 100
    
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'stable'
  }

  if (chartData.length === 0 || topExercises.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        Geen sterkte data beschikbaar
      </div>
    )
  }

  return (
    <div>
      {/* Top Exercises Legend with Trends */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {topExercises.map((name, idx) => {
          const trend = getTrend(name)
          const latestValue = (chartData[chartData.length - 1] as any)[name]
          
          return (
            <div 
              key={name} 
              className="bg-white/5 rounded-lg p-3 border border-white/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-lg font-bold mt-1" style={{ color: colors[idx] }}>
                    {latestValue} kg
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {trend === 'up' && (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  )}
                  {trend === 'down' && (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  {trend === 'stable' && (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
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
            label={{ 
              value: 'Estimated 1RM (kg)', 
              angle: -90, 
              position: 'insideLeft', 
              style: { fill: 'rgba(255,255,255,0.5)' } 
            }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value: any) => value !== null ? [`${value} kg`, ''] : ['', '']}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          
          {topExercises.map((name, idx) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colors[idx]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
