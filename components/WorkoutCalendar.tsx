'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Dumbbell, Trophy, Calendar as CalendarIcon, X } from 'lucide-react'
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isToday,
  addMonths,
  subMonths,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isFuture
} from 'date-fns'
import { useRouter } from 'next/navigation'
import { useData } from './context/DataContext'
import type { RestDayType } from './context/DataContext'
import { calculateWorkoutStreak } from './utils/streakAnalytics'

interface WorkoutCalendarProps {
  onDateClick?: (date: Date, workouts: any[]) => void
}

const REST_DAY_LABELS: Record<RestDayType, { label: string; emoji: string; bg: string; border: string }> = {
  vacation: { label: 'Vakantie', emoji: '🏖️', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40' },
  deload:   { label: 'Deload',   emoji: '💤', bg: 'bg-blue-500/20',  border: 'border-blue-500/40'  },
  rest:     { label: 'Rustdag',  emoji: '😴', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
}

export default function WorkoutCalendar({ onDateClick }: WorkoutCalendarProps) {
  const { history, restDays, addRestDay, removeRestDay } = useData()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  // The date key the picker is open for
  const [pickerDate, setPickerDate] = useState<string | null>(null)

  // Get all days in the calendar view (including padding days from previous/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Map workouts to dates
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, typeof history>()
    
    history.forEach(workout => {
      const dateKey = format(new Date(workout.date), 'yyyy-MM-dd')
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(workout)
    })
    
    return map
  }, [history])

  // Map rest days to dates
  const restDaysByDate = useMemo(() => {
    const map = new Map<string, RestDayType>()
    restDays.forEach(r => map.set(r.date, r.type))
    return map
  }, [restDays])

  // Calculate streak using analytics (bridging over rest days)
  const currentStreak = useMemo(() => {
    const streakData = calculateWorkoutStreak(history, restDays.map(r => r.date))
    return streakData.currentStreak
  }, [history, restDays])

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
    setPickerDate(null)
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
    setPickerDate(null)
  }

  const handleDayClick = (day: Date, dayWorkouts: typeof history) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    
    if (dayWorkouts.length === 1) {
      router.push(`/workout/${dayWorkouts[0].id}`)
      return
    }
    if (dayWorkouts.length > 1) {
      onDateClick?.(day, dayWorkouts)
      return
    }

    // Empty day — toggle picker (don't allow future days)
    if (isFuture(day)) return
    setPickerDate(prev => prev === dateKey ? null : dateKey)
  }

  const handleMarkRestDay = async (type: RestDayType) => {
    if (!pickerDate) return
    await addRestDay(pickerDate, type)
    setPickerDate(null)
  }

  const handleRemoveRestDay = async () => {
    if (!pickerDate) return
    await removeRestDay(pickerDate)
    setPickerDate(null)
  }

  return (
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          {currentStreak > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              🔥 {currentStreak} day streak
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 bg-bg-secondary hover:bg-bg-tertiary border border-border-default rounded-professional transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-bg-secondary hover:bg-bg-tertiary border border-border-default rounded-professional transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Rest-day type picker */}
      <AnimatePresence>
        {pickerDate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-bg-secondary border border-border-default rounded-professional p-4 shadow-card"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">
                {format(new Date(pickerDate + 'T12:00:00'), 'd MMMM yyyy')} — markeer als:
              </p>
              <button onClick={() => setPickerDate(null)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REST_DAY_LABELS) as RestDayType[]).map(type => {
                const meta = REST_DAY_LABELS[type]
                const isMarked = restDaysByDate.get(pickerDate) === type
                return (
                  <button
                    key={type}
                    onClick={() => isMarked ? handleRemoveRestDay() : handleMarkRestDay(type)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                      ${isMarked
                        ? `${meta.bg} ${meta.border} ring-2 ring-current`
                        : `${meta.bg} ${meta.border} hover:opacity-80`
                      }
                    `}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                    {isMarked && <span className="text-xs opacity-70">(verwijderen)</span>}
                  </button>
                )
              })}
              {restDaysByDate.has(pickerDate) && (
                <button
                  onClick={handleRemoveRestDay}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border-default hover:bg-white/10 transition-all text-txt-secondary"
                >
                  <X size={14} /> Verwijder markering
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar Grid */}
      <div className="bg-bg-secondary border border-border-default rounded-professional p-5 shadow-card">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayWorkouts = workoutsByDate.get(dateKey) || []
            const restType = restDaysByDate.get(dateKey)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isDayToday = isToday(day)
            const hasWorkouts = dayWorkouts.length > 0
            const isDeloadDay = hasWorkouts && dayWorkouts.some(w => w.isDeload)
            const isInPicker = pickerDate === dateKey
            const isFutureDay = isFuture(day)

            // Calculate stats for this day
            const totalVolume = dayWorkouts.reduce((acc, w) => 
              acc + w.exercises.reduce((eAcc, ex) => 
                eAcc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
              , 0)
            , 0)

            const restMeta = restType ? REST_DAY_LABELS[restType] : null

            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => handleDayClick(day, dayWorkouts)}
                disabled={isFutureDay || (!isCurrentMonth && dayWorkouts.length === 0)}
                className={`
                  aspect-square rounded-xl p-1.5 text-center relative transition-all
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${isDayToday ? 'ring-2 ring-primary' : ''}
                  ${isInPicker ? 'ring-2 ring-white/60' : ''}
                  ${hasWorkouts 
                    ? isDeloadDay
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer'
                      : 'bg-primary/20 hover:bg-primary/30 border border-primary/30 cursor-pointer' 
                    : restMeta
                      ? `${restMeta.bg} ${restMeta.border} border cursor-pointer hover:opacity-80`
                      : isFutureDay
                        ? 'bg-white/5 cursor-default'
                        : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                  }
                `}
              >
                <div className={`text-xs font-bold ${isDayToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                {hasWorkouts && (
                  <div className="mt-0.5 space-y-0.5">
                    {isDeloadDay ? (
                      <div className="text-[11px]">🔻</div>
                    ) : (
                      <div className="flex justify-center gap-1">
                        {dayWorkouts.map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1 h-1 bg-accent-primary rounded-full"
                          />
                        ))}
                      </div>
                    )}
                    {totalVolume > 0 && (
                      <div className={`text-[8px] font-bold ${isDeloadDay ? 'text-amber-400/80' : 'text-primary/80'}`}>
                        {totalVolume >= 1000 
                          ? `${(totalVolume / 1000).toFixed(1)}k` 
                          : totalVolume.toFixed(0)
                        }kg
                      </div>
                    )}
                  </div>
                )}

                {!hasWorkouts && restMeta && (
                  <div className="mt-0.5 text-[10px]">{restMeta.emoji}</div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-secondary border border-border-default rounded-professional p-5 shadow-card">
          <div className="flex items-center gap-2 text-txt-tertiary mb-2">
            <CalendarIcon size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Workouts</span>
          </div>
          <div className="text-h2 font-bold text-txt-primary">
            {Array.from(workoutsByDate.entries()).filter(([dateKey]) => {
              const date = new Date(dateKey)
              return isSameMonth(date, currentMonth)
            }).reduce((acc, [, workouts]) => acc + workouts.length, 0)}
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-professional p-5 shadow-card">
          <div className="flex items-center gap-2 text-txt-tertiary mb-2">
            <Trophy size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Volume</span>
          </div>
          <div className="text-h2 font-bold text-txt-primary">
            {(() => {
              const monthVolume = Array.from(workoutsByDate.entries())
                .filter(([dateKey]) => isSameMonth(new Date(dateKey), currentMonth))
                .reduce((acc, [, workouts]) => 
                  acc + workouts.reduce((wAcc, w) => 
                    wAcc + w.exercises.reduce((eAcc, ex) => 
                      eAcc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
                    , 0)
                  , 0)
                , 0)
              
              return monthVolume >= 1000 
                ? `${(monthVolume / 1000).toFixed(1)}k` 
                : monthVolume.toFixed(0)
            })()}
            <span className="text-xs font-normal text-txt-secondary ml-1">kg</span>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-professional p-5 shadow-card">
          <div className="flex items-center gap-2 text-txt-tertiary mb-2">
            <Dumbbell size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Sets</span>
          </div>
          <div className="text-h2 font-bold text-txt-primary">
            {Array.from(workoutsByDate.entries())
              .filter(([dateKey]) => isSameMonth(new Date(dateKey), currentMonth))
              .reduce((acc, [, workouts]) => 
                acc + workouts.reduce((wAcc, w) => 
                  wAcc + w.exercises.reduce((eAcc, ex) => eAcc + ex.sets.filter(s => s.completed).length, 0)
                , 0)
              , 0)}
          </div>
        </div>
      </div>
    </div>
  )
}
