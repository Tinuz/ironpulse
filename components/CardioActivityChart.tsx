'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CardioActivityBreakdown } from '@/components/utils/cardioAnalytics'

interface CardioActivityChartProps {
  data: CardioActivityBreakdown[]
}

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']

export default function CardioActivityChart({ data }: CardioActivityChartProps) {
  // Limit to top 5 activities
  const chartData = data.slice(0, 5).map((item, index) => ({
    ...item,
    durationMinutes: Math.round(item.duration / 60),
    distanceKm: (item.distance / 1000).toFixed(1),
    color: COLORS[index % COLORS.length]
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Geen activiteiten data beschikbaar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis 
          dataKey="activity" 
          stroke="#888888"
          tick={{ fill: '#888888', fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
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
          formatter={(value: number, _name: string, props: any) => {
            const item = props.payload
            return [
              <div key="tooltip" className="space-y-1">
                <div>{value} minuten</div>
                {item.distance > 0 && <div className="text-xs text-muted-foreground">{item.distanceKm} km</div>}
                <div className="text-xs text-muted-foreground">{item.sessions} sessies</div>
              </div>,
              'Activiteit'
            ]
          }}
        />
        <Bar dataKey="durationMinutes" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
