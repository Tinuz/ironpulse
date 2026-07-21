'use client'

import React from 'react'
import { useData } from '@/components/context/DataContext'
import type { RestDayType } from '@/components/context/DataContext'

const REST_DAY_OPTIONS: {
  type: RestDayType
  label: string
  emoji: string
  description: string
  color: string
  bg: string
  border: string
}[] = [
  { type: 'rest',     label: 'Rustdag',  emoji: '😴', description: 'Geen training vandaag', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/25' },
  { type: 'deload',   label: 'Deload',   emoji: '💤', description: 'Licht herstelblok',    color: 'text-blue-300',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25'   },
  { type: 'vacation', label: 'Vakantie', emoji: '🏝️', description: 'Weg van training',     color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25'   },
]

/**
 * Quick rest-day logging card.
 *
 * Renders nothing when today already has a workout.
 * Shows the logged day (with remove option) when a rest day is already logged.
 * Shows three quick-log buttons otherwise.
 */
export default function QuickRestDayCard() {
  const { history, restDays, addRestDay, removeRestDay } = useData()

  const todayKey = new Date().toISOString().split('T')[0]
  const hasWorkoutToday = history.some(w => w.date.startsWith(todayKey))
  const todayRestDay = restDays.find(r => r.date === todayKey)

  if (hasWorkoutToday) return null

  if (todayRestDay) {
    const meta = REST_DAY_OPTIONS.find(o => o.type === todayRestDay.type)!
    return (
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${meta.bg} ${meta.border}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <p className={`text-sm font-bold ${meta.color}`}>{meta.label} gelogd</p>
            {todayRestDay.note && (
              <p className="text-[11px] text-muted-foreground">{todayRestDay.note}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => removeRestDay(todayRestDay.id)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Verwijder
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
      <p className="text-xs text-muted-foreground font-medium mb-2.5">Vandaag geen training? Log het:</p>
      <div className="grid grid-cols-3 gap-2">
        {REST_DAY_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => addRestDay(todayKey, opt.type)}
            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border ${opt.bg} ${opt.border} hover:brightness-125 active:scale-95 transition-all`}
          >
            <span className="text-lg">{opt.emoji}</span>
            <span className={`text-[11px] font-bold ${opt.color}`}>{opt.label}</span>
            <span className="text-[9px] text-muted-foreground text-center leading-tight">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
