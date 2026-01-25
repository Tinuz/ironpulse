import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, TrendingUp, CheckCircle2 } from 'lucide-react';
import { WorkoutLog } from '@/components/context/DataContext';
import { startOfWeek, endOfWeek, isWithinInterval, subWeeks, differenceInDays } from 'date-fns';

interface WeeklyConsistencyWidgetProps {
  history: WorkoutLog[];
}

interface WeeklyStats {
  currentWeekStreak: number; // Consecutive weeks hitting goal
  longestWeekStreak: number;
  totalWeeks: number;
  currentWeekWorkouts: number;
  weeklyGoal: number; // Personalized based on user's average
  isOnTrack: boolean;
  daysUntilWeekEnd: number;
}

function calculateWeeklyConsistency(history: WorkoutLog[]): WeeklyStats {
  if (history.length === 0) {
    return {
      currentWeekStreak: 0,
      longestWeekStreak: 0,
      totalWeeks: 0,
      currentWeekWorkouts: 0,
      weeklyGoal: 3,
      isOnTrack: false,
      daysUntilWeekEnd: 7
    };
  }

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  
  // Calculate user's average weekly frequency over last 8 weeks
  const eightWeeksAgo = subWeeks(now, 8);
  const recentWorkouts = history.filter(w => new Date(w.date) >= eightWeeksAgo);
  const avgPerWeek = recentWorkouts.length / 8;
  
  // Set realistic weekly goal (3-4 workouts is typical)
  let weeklyGoal = 3; // Default minimum
  if (avgPerWeek >= 5) weeklyGoal = 4; // High frequency athlete
  else if (avgPerWeek >= 4) weeklyGoal = 3; // Regular athlete
  else if (avgPerWeek >= 2) weeklyGoal = 2; // Beginner/casual
  
  // Current week workouts
  const currentWeekWorkouts = history.filter(w => {
    const workoutDate = new Date(w.date);
    return isWithinInterval(workoutDate, { start: currentWeekStart, end: currentWeekEnd });
  }).length;

  // Days until week end
  const daysUntilWeekEnd = differenceInDays(currentWeekEnd, now);

  // Calculate weekly streaks (going backwards from current week)
  let currentWeekStreak = 0;
  let longestWeekStreak = 0;
  let tempStreak = 0;
  
  // Check last 52 weeks
  for (let i = 0; i < 52; i++) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    
    const weekWorkouts = history.filter(w => {
      const workoutDate = new Date(w.date);
      return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
    }).length;

    const hitGoal = weekWorkouts >= weeklyGoal;

    if (hitGoal) {
      tempStreak++;
      if (i === 0 && currentWeekWorkouts >= weeklyGoal) {
        // Current week counts if goal is already met
        currentWeekStreak = tempStreak;
      } else if (i > 0) {
        // For past weeks, count the streak
        if (currentWeekStreak === 0) currentWeekStreak = tempStreak;
      }
      
      if (tempStreak > longestWeekStreak) {
        longestWeekStreak = tempStreak;
      }
    } else {
      // Streak broken
      if (i === 0 && currentWeekWorkouts < weeklyGoal) {
        // Current week hasn't hit goal yet, don't break the streak until week ends
        continue;
      }
      tempStreak = 0;
    }
  }

  // If current week hasn't met goal yet, streak continues from last week
  if (currentWeekWorkouts < weeklyGoal && currentWeekStreak === 0) {
    // Check if last week met the goal
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekWorkouts = history.filter(w => {
      const workoutDate = new Date(w.date);
      return isWithinInterval(workoutDate, { start: lastWeekStart, end: lastWeekEnd });
    }).length;

    if (lastWeekWorkouts >= weeklyGoal) {
      // Calculate streak from last week
      let streak = 0;
      for (let i = 1; i < 52; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekWorkouts = history.filter(w => {
          const workoutDate = new Date(w.date);
          return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
        }).length;
        
        if (weekWorkouts >= weeklyGoal) {
          streak++;
        } else {
          break;
        }
      }
      currentWeekStreak = streak;
    }
  }

  // Total weeks trained (at least 1 workout)
  const totalWeeks = new Set(
    history.map(w => {
      const weekStart = startOfWeek(new Date(w.date), { weekStartsOn: 1 });
      return weekStart.toISOString();
    })
  ).size;

  const isOnTrack = currentWeekWorkouts >= weeklyGoal;

  return {
    currentWeekStreak,
    longestWeekStreak,
    totalWeeks,
    currentWeekWorkouts,
    weeklyGoal,
    isOnTrack,
    daysUntilWeekEnd
  };
}

export default function WeeklyConsistencyWidget({ history }: WeeklyConsistencyWidgetProps) {
  const stats = calculateWeeklyConsistency(history);

  if (stats.totalWeeks === 0) {
    return null; // Don't show widget if no workouts yet
  }

  const needsMoreWorkouts = stats.currentWeekWorkouts < stats.weeklyGoal;
  const workoutsNeeded = stats.weeklyGoal - stats.currentWeekWorkouts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${
        stats.isOnTrack 
          ? 'from-green-500/15 to-emerald-500/15 border-green-500/30' 
          : 'from-orange-500/15 to-amber-500/15 border-orange-500/30'
      } border rounded-professional p-6 shadow-elevated`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`${
            stats.isOnTrack 
              ? 'bg-green-500/20 border-green-500/30' 
              : 'bg-orange-500/20 border-orange-500/30'
          } p-2.5 rounded-professional border`}>
            <Calendar className={stats.isOnTrack ? 'text-green-500' : 'text-orange-500'} size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-txt-secondary uppercase tracking-wider">
              Wekelijkse Consistentie
            </h3>
          </div>
        </div>
        {stats.isOnTrack && (
          <div className="bg-green-500/15 border border-green-500/40 text-green-500 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-professional flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Op Schema</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Current Week Streak */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className={`text-metric font-bold ${
              stats.currentWeekStreak > 0 ? 'text-green-500' : 'text-orange-500'
            }`}>
              {stats.currentWeekStreak}
            </span>
            <span className="text-sm text-txt-secondary font-semibold">
              {stats.currentWeekStreak === 1 ? 'week' : 'weken'}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary uppercase tracking-wide font-semibold">
            Huidige
          </div>
        </div>

        {/* Longest Streak */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <Trophy className="text-accent-secondary mb-1" size={18} />
            <span className="text-h1 font-bold text-accent-secondary">
              {stats.longestWeekStreak}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary uppercase tracking-wide font-semibold">
            Best
          </div>
        </div>

        {/* Total Weeks */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <TrendingUp className="text-accent-success mb-1" size={18} />
            <span className="text-h1 font-bold text-accent-success">
              {stats.totalWeeks}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary uppercase tracking-wide font-semibold">
            Totaal
          </div>
        </div>
      </div>

      {/* Progress bar for current week */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-txt-tertiary font-semibold">
            Deze week: {stats.currentWeekWorkouts}/{stats.weeklyGoal} trainingen
          </span>
          <span className="text-xs text-txt-tertiary">
            {stats.daysUntilWeekEnd} {stats.daysUntilWeekEnd === 1 ? 'dag' : 'dagen'} resterend
          </span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((stats.currentWeekWorkouts / stats.weeklyGoal) * 100, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${
              stats.isOnTrack 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : 'bg-gradient-to-r from-orange-500 to-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Motivational message */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-center text-txt-secondary leading-relaxed">
          {stats.isOnTrack && stats.currentWeekStreak > 0 && (
            <span className="text-green-500 font-semibold">
              💪 Geweldig! {stats.currentWeekStreak} {stats.currentWeekStreak === 1 ? 'week' : 'weken'} op rij consistent getraind!
            </span>
          )}
          {stats.isOnTrack && stats.currentWeekStreak === 0 && (
            <span className="text-green-500 font-semibold">
              ✅ Doel behaald deze week! Blijf zo doorgaan.
            </span>
          )}
          {needsMoreWorkouts && workoutsNeeded === 1 && (
            <span className="text-orange-500 font-semibold">
              🎯 Nog {workoutsNeeded} training nodig om je weekdoel te behalen!
            </span>
          )}
          {needsMoreWorkouts && workoutsNeeded > 1 && (
            <span className="text-orange-500 font-semibold">
              🎯 Nog {workoutsNeeded} trainingen nodig om je weekdoel te behalen!
            </span>
          )}
        </p>
      </div>
    </motion.div>
  );
}
