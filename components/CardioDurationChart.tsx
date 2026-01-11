'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CardioTimeSeriesPoint } from '@/components/utils/cardioAnalytics'

interface CardioDurationChartProps {
  data: CardioTimeSeriesPoint[]
}

export default function CardioDurationChart({ data }: CardioDurationChartProps) {
  // Convert seconds to minutes for display
  const chartData = data.map(point => ({
    ...point,
    durationMinutes: Math.round(point.duration / 60),
    formattedDate: new Date(point.date).toLocaleDateString('nl-NL', { 
      month: 'short', 
      day: 'numeric' 
    })
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Geen cardio data beschikbaar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis 
          dataKey="formattedDate" 
          stroke="#888888"
          tick={{ fill: '#888888', fontSize: 12 }}
        />
        <YAxis 
          stroke="#888888"
          tick={{ fill: '#888888', fontSize: 12 }}
          label={{ value: 'Minuten', angle: -90, position: 'insideLeft', fill: '#888888' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff'
          }}
          formatter={(value: number) => [`${value} min`, 'Duur']}
        />
        <Area
          type="monotone"
          dataKey="durationMinutes"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#durationGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
