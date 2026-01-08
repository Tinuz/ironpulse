/**
 * Workout Streak Analytics
 * 
 * Calculate and track workout streaks and consistency metrics
 */

import { WorkoutLog } from '@/components/context/DataContext';

export interface StreakData {
  currentStreak: number; // Days with consecutive workouts
  longestStreak: number; // All-time longest streak
  totalWorkouts: number; // Total completed workouts
  workoutDates: string[]; // Array of workout dates (YYYY-MM-DD)
  streakDates: string[]; // Dates in current streak
  lastWorkoutDate: string | null; // Most recent workout date
}

/**
 * Calculate workout streak from history
 * A streak continues if workouts happen on consecutive or same days
 */
export function calculateWorkoutStreak(history: WorkoutLog[]): StreakData {
  if (history.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalWorkouts: 0,
      workoutDates: [],
      streakDates: [],
      lastWorkoutDate: null
    };
  }

  // Sort workouts by date (newest first)
  const sortedWorkouts = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get unique workout dates (YYYY-MM-DD format)
  const workoutDates = Array.from(
    new Set(sortedWorkouts.map(w => w.date.split('T')[0]))
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (workoutDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalWorkouts: history.length,
      workoutDates: [],
      streakDates: [],
      lastWorkoutDate: null
    };
  }

  // Calculate current streak
  let currentStreak = 0;
  const streakDates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let checkDate = new Date(today);
  
  for (let i = 0; i < workoutDates.length; i++) {
    const workoutDate = new Date(workoutDates[i]);
    workoutDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((checkDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0 || daysDiff === 1) {
      // Same day or previous day = streak continues
      currentStreak++;
      streakDates.push(workoutDates[i]);
      checkDate = new Date(workoutDate);
      checkDate.setDate(checkDate.getDate() - 1); // Move to day before
    } else {
      // Gap found, streak broken
      break;
    }
  }

  // Calculate longest streak ever
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 0; i < workoutDates.length - 1; i++) {
    const currentDate = new Date(workoutDates[i]);
    const nextDate = new Date(workoutDates[i + 1]);
    currentDate.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalWorkouts: history.length,
    workoutDates,
    streakDates,
    lastWorkoutDate: workoutDates[0] || null
  };
}

/**
 * Check if user is at risk of breaking their streak
 */
export function isStreakAtRisk(streakData: StreakData): boolean {
  if (streakData.currentStreak === 0) return false;
  if (!streakData.lastWorkoutDate) return false;

  const lastWorkout = new Date(streakData.lastWorkoutDate);
  lastWorkout.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysSinceLastWorkout = Math.floor((today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));
  
  // At risk if it's been 1 day (today is the last day to maintain streak)
  return daysSinceLastWorkout === 1;
}

/**
 * Get workout calendar data for heatmap visualization (last 90 days)
 */
export function getWorkoutCalendar(history: WorkoutLog[], days: number = 90): Map<string, number> {
  const calendar = new Map<string, number>();
  
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    calendar.set(dateStr, 0);
  }
  
  // Count workouts per day
  history.forEach(workout => {
    const dateStr = workout.date.split('T')[0];
    if (calendar.has(dateStr)) {
      calendar.set(dateStr, (calendar.get(dateStr) || 0) + 1);
    }
  });
  
  return calendar;
}
