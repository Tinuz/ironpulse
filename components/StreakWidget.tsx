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
      className="bg-gradient-to-br from-accent-primary/15 to-accent-secondary/15 border border-accent-primary/30 rounded-professional p-6 shadow-elevated"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-accent-primary/20 p-2.5 rounded-professional border border-accent-primary/30">
            <Flame className="text-accent-primary" size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-txt-secondary uppercase tracking-wider">
              Workout Streak
            </h3>
          </div>
        </div>
        {atRisk && (
          <div className="bg-accent-secondary/15 border border-accent-secondary/40 text-accent-secondary text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-professional animate-pulse">
            At Risk!
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-metric font-bold text-accent-primary">
              {streakData.currentStreak}
            </span>
            <span className="text-sm text-txt-secondary font-semibold">
              {streakData.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary uppercase tracking-wide font-semibold">
            Current
          </div>
        </div>

        {/* Longest Streak */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <Trophy className="text-accent-secondary mb-1" size={18} />
            <span className="text-h1 font-bold text-accent-secondary">
              {streakData.longestStreak}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary uppercase tracking-wide font-semibold">
            Best
          </div>
        </div>

        {/* Total Workouts */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <TrendingUp className="text-accent-success mb-1" size={18} />
            <span className="text-h1 font-bold text-accent-success">
              {streakData.totalWorkouts}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary uppercase tracking-wide font-semibold">
            Total
          </div>
        </div>
      </div>

      {/* Motivational message */}
      {streakData.currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-accent-primary/30">
          <p className="text-xs text-center text-txt-secondary leading-relaxed">
            {atRisk && (
              <span className="text-accent-secondary font-semibold">
                🔥 Don't break your streak! Train today to keep it alive.
              </span>
            )}
            {!atRisk && streakData.currentStreak >= 7 && (
              <span className="text-accent-primary font-semibold">
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
