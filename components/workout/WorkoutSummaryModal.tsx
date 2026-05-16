'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Clock, TrendingUp, Check, Flame } from 'lucide-react'
import { WorkoutLog, useData } from '@/components/context/DataContext'
import { useLanguage } from '@/components/context/LanguageContext'
import clsx from 'clsx'
import { calculateVolumeLandmarks } from '@/components/utils/volumeLandmarksAnalytics'
import { getMuscleGroup } from '@/components/utils/volumeAnalytics'

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  workoutData: WorkoutLog;
  completedSets: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function WorkoutSummaryModal({
  isOpen,
  workoutData,
  completedSets,
  onClose,
  onConfirm,
}: WorkoutSummaryModalProps) {
  const { t } = useLanguage();
  const { history } = useData()

  // Compute which muscle groups were trained in this workout
  const trainedMuscleGroups = new Set(
    workoutData.exercises
      .filter(ex => ex.type !== 'cardio' && ex.sets.some(s => s.completed && !s.isWarmup))
      .map(ex => getMuscleGroup(ex.name, ex.muscleGroup))
      .filter((mg): mg is NonNullable<typeof mg> => mg !== null)
  )
  const { muscles } = calculateVolumeLandmarks([...history, workoutData])
  const trainedMuscles = muscles.filter(m => trainedMuscleGroups.has(m.group))

  const totalCalories = workoutData.exercises.reduce(
    (sum, ex) => sum + (ex.estimatedCalories || 0),
    0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 rounded-2xl border border-white/10 max-w-md w-full overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-orange-500/20 p-6 text-center border-b border-primary/20">
              <Award size={48} className="text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-black uppercase tracking-wide">Workout Voltooid!</h2>
              <p className="text-sm text-muted-foreground mt-1">{workoutData.name}</p>
            </div>

            {/* Stats Grid */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Total Time */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    <Clock size={12} />
                    {t.workout.duration}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {formatTime(Math.floor((Date.now() - workoutData.startTime) / 1000))}
                  </div>
                </div>

                {/* Exercises */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    <TrendingUp size={12} />
                    {t.workout.totalExercises}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {workoutData.exercises.length}
                  </div>
                </div>

                {/* Completed Sets */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    <Check size={12} />
                    {t.workout.totalSets}
                  </div>
                  <div className="text-2xl font-black text-foreground">{completedSets}</div>
                </div>

                {/* Calories Burned */}
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                  <div className="flex items-center gap-2 text-xs text-primary/80 mb-1 uppercase tracking-wider font-bold">
                    <Flame size={12} />
                    {t.workout.estimatedBurn}
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {totalCalories > 0 ? `~${totalCalories}` : '—'}
                  </div>
                  {totalCalories > 0 && (
                    <div className="text-xs text-primary/60 mt-0.5">kcal</div>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              {totalCalories > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-200/90 leading-relaxed">
                  <strong className="block mb-1">⚠️ {t.workout.calorieDisclaimer}</strong>
                  {t.workout.calorieDisclaimerText}
                </div>
              )}

              {/* Per-exercise breakdown */}
              {workoutData.exercises.filter(ex => ex.estimatedCalories).length > 1 && (
                <div className="border-t border-white/5 pt-4 mt-4">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {t.workout.breakdown}
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {workoutData.exercises.map((ex) =>
                      ex.estimatedCalories ? (
                        <div key={ex.id} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-2">
                          <span className="text-muted-foreground truncate flex-1">{ex.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-muted-foreground/60">{ex.durationMinutes} min</span>
                            <span className="text-primary font-bold">{ex.estimatedCalories} kcal</span>
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Volume Targets — MEV/MAV/MRV per spiergroep na deze workout */}
            {trainedMuscles.length > 0 && (
              <div className="px-6 pb-4">
                <div className="border-t border-white/5 pt-4">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                    Wekelijks volume
                  </div>
                  <div className="space-y-2">
                    {trainedMuscles.map(m => (
                      <div key={m.group} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{m.label}</span>
                        <div className="flex-1 relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="absolute top-0 bottom-0 w-px bg-blue-400/50" style={{ left: `${Math.round((m.landmarks.mev / m.landmarks.mrv) * 100)}%` }} />
                          <div className="absolute top-0 bottom-0 w-px bg-green-400/50" style={{ left: `${Math.round((m.landmarks.mavLow / m.landmarks.mrv) * 100)}%` }} />
                          <div
                            className={clsx('h-full rounded-full',
                              m.status === 'mav' || m.status === 'approaching_mrv' ? 'bg-green-500' :
                              m.status === 'at_mrv' ? 'bg-red-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${m.fillPct}%` }}
                          />
                        </div>
                        <span className={clsx('text-[10px] font-semibold flex-shrink-0', m.statusColor)}>
                          {m.weeklySets} sets · {m.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                  {trainedMuscles.some(m => m.status === 'below_mv' || m.status === 'mv_to_mev') && (
                    <p className="text-[10px] text-amber-400/80 mt-2 leading-tight">
                      ⚠️ Spiergroepen onder MEV groeien minder snel deze week
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/10 text-foreground font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20"
              >
                {t.common.save}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
