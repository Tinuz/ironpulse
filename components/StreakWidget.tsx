import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, TrendingUp } from 'lucide-react';
import { calculateWorkoutStreak, isStreakAtRisk } from '@/components/utils/streakAnalytics';
import { WorkoutLog } from '@/components/context/DataContext';

interface StreakWidgetProps {
  history: WorkoutLog[];
}

export default function StreakWidget({ history }: StreakWidgetProps) {
  const streakData = calculateWorkoutStreak(history);
  const atRisk = isStreakAtRisk(streakData);

  if (streakData.totalWorkouts === 0) {
    return null; // Don't show widget if no workouts yet
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5 shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Flame className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Workout Streak
            </h3>
          </div>
        </div>
        {atRisk && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase px-2 py-1 rounded animate-pulse">
            At Risk!
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-black text-primary">
              {streakData.currentStreak}
            </span>
            <span className="text-sm text-muted-foreground font-bold">
              {streakData.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            Current
          </div>
        </div>

        {/* Longest Streak */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <Trophy className="text-accent mb-1" size={16} />
            <span className="text-3xl font-black text-accent">
              {streakData.longestStreak}
            </span>
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            Best
          </div>
        </div>

        {/* Total Workouts */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <TrendingUp className="text-green-500 mb-1" size={16} />
            <span className="text-3xl font-black text-green-500">
              {streakData.totalWorkouts}
            </span>
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            Total
          </div>
        </div>
      </div>

      {/* Motivational message */}
      {streakData.currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            {atRisk && (
              <span className="text-yellow-500 font-semibold">
                🔥 Don't break your streak! Train today to keep it alive.
              </span>
            )}
            {!atRisk && streakData.currentStreak >= 7 && (
              <span className="text-primary font-semibold">
                💪 Amazing! {streakData.currentStreak} days strong. Keep crushing it!
              </span>
            )}
            {!atRisk && streakData.currentStreak < 7 && streakData.currentStreak > 0 && (
              <span className="text-primary font-semibold">
                🚀 {streakData.currentStreak} {streakData.currentStreak === 1 ? 'day' : 'days'} down! Keep the momentum going.
              </span>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}
