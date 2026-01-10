'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Dumbbell, Trophy, Calendar as CalendarIcon } from 'lucide-react'
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
  endOfWeek
} from 'date-fns'
import { useRouter } from 'next/navigation'
import { useData } from './context/DataContext'

interface WorkoutCalendarProps {
  onDateClick?: (date: Date, workouts: any[]) => void
}

export default function WorkoutCalendar({ onDateClick }: WorkoutCalendarProps) {
  const { history } = useData()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())

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

  // Calculate streak
  const currentStreak = useMemo(() => {
    let streak = 0
    let checkDate = new Date()
    
    // Check if there's a workout today or yesterday (grace period)
    const todayKey = format(new Date(), 'yyyy-MM-dd')
    const yesterdayKey = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
    
    if (!workoutsByDate.has(todayKey) && !workoutsByDate.has(yesterdayKey)) {
      return 0
    }
    
    // Count backwards
    for (let i = 0; i < 365; i++) {
      const dateKey = format(checkDate, 'yyyy-MM-dd')
      if (workoutsByDate.has(dateKey)) {
        streak++
        checkDate = new Date(checkDate.getTime() - 86400000)
      } else {
        break
      }
    }
    
    return streak
  }, [workoutsByDate])

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDayClick = (date: Date, dayWorkouts: typeof history) => {
    if (dayWorkouts.length === 1) {
      router.push(`/workout/${dayWorkouts[0].id}`)
    } else if (dayWorkouts.length > 1) {
      onDateClick?.(date, dayWorkouts)
    }
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
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-white/5 rounded-2xl p-4">
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
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isDayToday = isToday(day)
            const hasWorkouts = dayWorkouts.length > 0

            // Calculate stats for this day
            const totalVolume = dayWorkouts.reduce((acc, w) => 
              acc + w.exercises.reduce((eAcc, ex) => 
                eAcc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
              , 0)
            , 0)

            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => hasWorkouts && handleDayClick(day, dayWorkouts)}
                disabled={!hasWorkouts}
                className={`
                  aspect-square rounded-xl p-1.5 text-center relative transition-all
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${isDayToday ? 'ring-2 ring-primary' : ''}
                  ${hasWorkouts 
                    ? 'bg-primary/20 hover:bg-primary/30 border border-primary/30 cursor-pointer' 
                    : 'bg-white/5 hover:bg-white/10 cursor-default'
                  }
                `}
              >
                <div className={`text-xs font-bold ${isDayToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                {hasWorkouts && (
                  <div className="mt-0.5 space-y-0.5">
                    <div className="flex justify-center gap-1">
                      {dayWorkouts.map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 h-1 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                    {totalVolume > 0 && (
                      <div className="text-[8px] font-bold text-primary/80">
                        {totalVolume >= 1000 
                          ? `${(totalVolume / 1000).toFixed(1)}k` 
                          : totalVolume.toFixed(0)
                        }kg
                      </div>
                    )}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CalendarIcon size={14} />
            <span className="text-xs font-bold uppercase">Workouts</span>
          </div>
          <div className="text-2xl font-black">
            {Array.from(workoutsByDate.entries()).filter(([dateKey]) => {
              const date = new Date(dateKey)
              return isSameMonth(date, currentMonth)
            }).reduce((acc, [, workouts]) => acc + workouts.length, 0)}
          </div>
        </div>

        <div className="bg-card border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Trophy size={14} />
            <span className="text-xs font-bold uppercase">Volume</span>
          </div>
          <div className="text-2xl font-black">
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
            <span className="text-xs font-normal text-muted-foreground ml-1">kg</span>
          </div>
        </div>

        <div className="bg-card border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Dumbbell size={14} />
            <span className="text-xs font-bold uppercase">Sets</span>
          </div>
          <div className="text-2xl font-black">
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
