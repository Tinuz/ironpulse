'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Award, Calendar, BarChart3, Info } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { 
  getBest1RM, 
  calculateVolume, 
  roundTo,
  getPreviousWorkoutsForExercise,
  getExerciseFromWorkout,
  getPersonalRecord,
  calculateTrend
} from '@/components/utils/workoutCalculations'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function ExerciseProgress() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exerciseName = searchParams.get('name') || '';
  const { history } = useData();
  const [showInfo, setShowInfo] = useState(false);

  // Get all workouts containing this exercise
  const relevantWorkouts = useMemo(() => {
    return getPreviousWorkoutsForExercise(exerciseName, history);
  }, [exerciseName, history]);

  // Build chart data
  const chartData = useMemo(() => {
    return relevantWorkouts
      .map(workout => {
        const exercise = getExerciseFromWorkout(workout, exerciseName);
        if (!exercise) return null;

        const best = getBest1RM(exercise);
        const volume = calculateVolume(exercise);

        return {
          date: workout.date,
          dateLabel: format(new Date(workout.date), 'd MMM', { locale: nl }),
          oneRM: best ? roundTo(best.oneRM, 0.5) : 0,
          volume: Math.round(volume),
          workoutName: workout.name,
          sets: exercise.sets.filter(s => s.completed).length
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null && d.oneRM > 0)
      .reverse(); // Chronological order
  }, [relevantWorkouts, exerciseName]);

  // Get PR and trends
  const pr = useMemo(() => getPersonalRecord(exerciseName, history), [exerciseName, history]);
  const trend = useMemo(() => calculateTrend(exerciseName, history, 5), [exerciseName, history]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgOneRM: 0,
        avgVolume: 0,
        totalWorkouts: 0,
        bestRecent: null,
        improvement: 0
      };
    }

    const avgOneRM = chartData.reduce((sum, d) => sum + d.oneRM, 0) / chartData.length;
    const avgVolume = chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length;
    
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const improvement = last.oneRM - first.oneRM;

    return {
      avgOneRM: roundTo(avgOneRM, 0.5),
      avgVolume: Math.round(avgVolume),
      totalWorkouts: chartData.length,
      bestRecent: last,
      improvement: roundTo(improvement, 0.5)
    };
  }, [chartData]);

  if (!exerciseName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Geen exercise geselecteerd</p>
          <button 
            onClick={() => router.push('/history')}
            className="mt-4 px-6 py-2 bg-primary text-background font-bold rounded-lg"
          >
            Terug naar History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="font-bold text-sm uppercase tracking-wide">Exercise Progress</h1>
          </div>

          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Exercise Name */}
        <div className="text-center">
          <h2 className="text-3xl font-black italic">{exerciseName}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.totalWorkouts} workouts getrackt
          </p>
        </div>

        {/* Info Disclaimer */}
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
          >
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-100 leading-relaxed">
                <strong>Let op:</strong> 1RM (One Repetition Maximum) is een <strong>schatting</strong> gebaseerd op de Brzycki-formule. 
                Deze is het meest accuraat voor 1-10 herhalingen. Voor sets boven 12 reps kan de schatting minder nauwkeurig zijn. 
                Gebruik deze data als richtlijn voor progressie, niet als exacte meting.
              </div>
            </div>
          </motion.div>
        )}

        {/* PR Card */}
        {pr && (
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award size={24} className="text-primary" />
              <h3 className="font-bold text-lg">Persoonlijk Record</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Beste 1RM</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-primary">{roundTo(pr.oneRM, 0.5)}</span>
                  <span className="text-lg text-muted-foreground font-bold">KG</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {pr.weight}kg × {pr.reps} reps
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Behaald op</div>
                <div className="text-xl font-bold">
                  {format(new Date(pr.date), 'd MMMM yyyy', { locale: nl })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {pr.workoutName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trend Indicator */}
        {trend.workoutCount >= 2 && (
          <div className={`
            rounded-lg p-4 border
            ${trend.direction === 'increasing' ? 'bg-green-500/10 border-green-500/30' :
              trend.direction === 'decreasing' ? 'bg-red-500/10 border-red-500/30' :
              'bg-white/5 border-white/10'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {trend.direction === 'increasing' ? (
                  <>
                    <TrendingUp size={20} className="text-green-500" />
                    <span className="font-bold text-green-500">Stijgende Trend</span>
                  </>
                ) : trend.direction === 'decreasing' ? (
                  <>
                    <TrendingDown size={20} className="text-red-500" />
                    <span className="font-bold text-red-500">Dalende Trend</span>
                  </>
                ) : (
                  <>
                    <Minus size={20} />
                    <span className="font-bold">Stabiele Trend</span>
                  </>
                )}
              </div>
              <div className="text-sm">
                <span className="font-bold">
                  {trend.averageChange >= 0 ? '+' : ''}{roundTo(trend.averageChange, 0.5)}kg
                </span>
                <span className="text-muted-foreground ml-1">gemiddeld</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Gebaseerd op laatste {trend.workoutCount} workouts
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Gemiddelde 1RM
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{stats.avgOneRM}</span>
              <span className="text-sm text-muted-foreground font-bold">KG</span>
            </div>
          </div>

          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Gem. Volume
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black">{stats.avgVolume}</span>
              <span className="text-sm text-muted-foreground font-bold">KG</span>
            </div>
          </div>

          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Totale Workouts
            </div>
            <div className="text-3xl font-black">{stats.totalWorkouts}</div>
          </div>

          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Totale Verbetering
            </div>
            <div className={`text-3xl font-black ${stats.improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.improvement >= 0 ? '+' : ''}{stats.improvement}kg
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-primary" />
              <h3 className="font-bold text-lg">1RM Progressie</h3>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#ffffff40"
                  style={{ fontSize: 11, fontWeight: 'bold' }}
                />
                <YAxis 
                  stroke="#ffffff40"
                  style={{ fontSize: 11, fontWeight: 'bold' }}
                  label={{ value: 'KG', angle: -90, position: 'insideLeft', style: { fill: '#ffffff60' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#f59e0b' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'oneRM') return [`${value}kg`, '1RM'];
                    if (name === 'volume') return [`${value}kg`, 'Volume'];
                    return value;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="oneRM" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-card border border-white/5 rounded-2xl p-12 text-center">
            <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nog geen data beschikbaar voor deze exercise
            </p>
          </div>
        )}

        {/* Workout History List */}
        {chartData.length > 0 && (
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Workout Historie</h3>
            <div className="space-y-3">
              {chartData.slice().reverse().map((data) => {
                const isPR = pr && data.oneRM === pr.oneRM && data.date === pr.date;
                
                return (
                  <div 
                    key={data.date}
                    className={`
                      p-3 rounded-lg border flex items-center justify-between
                      ${isPR ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10'}
                    `}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{data.dateLabel}</span>
                        {isPR && <Award size={14} className="text-primary" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.workoutName} • {data.sets} sets
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg text-primary">{data.oneRM}kg</div>
                      <div className="text-xs text-muted-foreground">{data.volume}kg vol</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
