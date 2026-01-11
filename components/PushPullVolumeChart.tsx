'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PushPullVolumeChartProps {
  data: Array<{
    date: string
    pushVolume: number
    pullVolume: number
    legsVolume: number
  }>
}

export default function PushPullVolumeChart({ data }: PushPullVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Geen data beschikbaar voor deze periode
      </div>
    )
  }

  // Format data for chart (convert to kg)
  const chartData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
    push: Math.round(d.pushVolume / 1000),
    pull: Math.round(d.pullVolume / 1000),
    legs: Math.round(d.legsVolume / 1000)
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPush" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorPull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorLegs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
        </defs>
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
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
        />
        <Area 
          type="monotone" 
          dataKey="push" 
          stroke="#3b82f6" 
          fillOpacity={1} 
          fill="url(#colorPush)"
          name="Push"
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="pull" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorPull)"
          name="Pull"
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="legs" 
          stroke="#f59e0b" 
          fillOpacity={1} 
          fill="url(#colorLegs)"
          name="Legs"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
