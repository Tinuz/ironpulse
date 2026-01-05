import { WorkoutLog } from '@/components/context/DataContext';
import { getBest1RM, getPersonalRecord, calculateTrend } from './workoutCalculations';

/**
 * Get all unique exercises from workout history
 */
export function getUniqueExercises(workouts: WorkoutLog[]): string[] {
  const exerciseSet = new Set<string>();
  workouts.forEach(workout => {
    workout.exercises.forEach(ex => {
      exerciseSet.add(ex.name);
    });
  });
  return Array.from(exerciseSet).sort();
}

/**
 * Get most frequently trained exercises
 */
export function getMostFrequentExercises(workouts: WorkoutLog[], limit: number = 6): string[] {
  const exerciseCounts = new Map<string, number>();
  
  workouts.forEach(workout => {
    workout.exercises.forEach(ex => {
      exerciseCounts.set(ex.name, (exerciseCounts.get(ex.name) || 0) + 1);
    });
  });

  return Array.from(exerciseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * Calculate overall strength score (sum of 1RMs for big lifts)
 */
export interface StrengthScore {
  total: number;
  lifts: { name: string; oneRM: number }[];
  previousTotal: number | null;
  change: number;
  percentageChange: number;
}

export function calculateStrengthScore(
  workouts: WorkoutLog[],
  bigLifts: string[] = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press']
): StrengthScore {
  if (workouts.length === 0) {
    return {
      total: 0,
      lifts: [],
      previousTotal: null,
      change: 0,
      percentageChange: 0
    };
  }

  const lifts: { name: string; oneRM: number }[] = [];
  let total = 0;

  bigLifts.forEach(liftName => {
    const pr = getPersonalRecord(liftName, workouts);
    if (pr) {
      lifts.push({ name: liftName, oneRM: pr.oneRM });
      total += pr.oneRM;
    }
  });

  // Get previous month's total for comparison
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oldWorkouts = workouts.filter(w => new Date(w.date) <= oneMonthAgo);

  let previousTotal: number | null = null;
  if (oldWorkouts.length > 0) {
    previousTotal = 0;
    bigLifts.forEach(liftName => {
      const pr = getPersonalRecord(liftName, oldWorkouts);
      if (pr) {
        previousTotal! += pr.oneRM;
      }
    });
  }

  const change = previousTotal !== null ? total - previousTotal : 0;
  const percentageChange = previousTotal !== null && previousTotal > 0 
    ? (change / previousTotal) * 100 
    : 0;

  return {
    total,
    lifts,
    previousTotal,
    change,
    percentageChange
  };
}

/**
 * Get recent PRs (last 30 days)
 */
export interface RecentPR {
  exerciseName: string;
  oneRM: number;
  date: string;
  workoutName: string;
  weight: number;
  reps: number;
  daysAgo: number;
}

export function getRecentPRs(workouts: WorkoutLog[], daysBack: number = 30): RecentPR[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const prs: RecentPR[] = [];
  const exerciseHistory = new Map<string, { oneRM: number; date: Date }>();

  // Process workouts chronologically (oldest first)
  const sortedWorkouts = [...workouts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedWorkouts.forEach(workout => {
    workout.exercises.forEach(ex => {
      const best = getBest1RM(ex);
      if (!best) return;

      const existingBest = exerciseHistory.get(ex.name);
      const workoutDate = new Date(workout.date);

      // Check if this is a new PR
      if (!existingBest || best.oneRM > existingBest.oneRM) {
        exerciseHistory.set(ex.name, { oneRM: best.oneRM, date: workoutDate });

        // If within recent period, add to list
        if (workoutDate >= cutoffDate) {
          const daysAgo = Math.floor(
            (new Date().getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          prs.push({
            exerciseName: ex.name,
            oneRM: best.oneRM,
            date: workout.date,
            workoutName: workout.name,
            weight: best.weight,
            reps: best.reps,
            daysAgo
          });
        }
      }
    });
  });

  // Sort by most recent first
  return prs.sort((a, b) => a.daysAgo - b.daysAgo);
}

/**
 * Calculate period progress for an exercise
 */
export interface PeriodProgress {
  current1RM: number | null;
  previous1RM: number | null;
  change: number;
  percentageChange: number;
  workoutCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export function calculatePeriodProgress(
  exerciseName: string,
  workouts: WorkoutLog[],
  periodDays: number
): PeriodProgress {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);

  const periodWorkouts = workouts.filter(w => new Date(w.date) >= cutoffDate);
  
  if (periodWorkouts.length === 0) {
    return {
      current1RM: null,
      previous1RM: null,
      change: 0,
      percentageChange: 0,
      workoutCount: 0,
      trend: 'stable'
    };
  }

  // Get current PR (latest in period)
  const currentPR = getPersonalRecord(exerciseName, periodWorkouts);
  
  // Get previous PR (before period)
  const beforeWorkouts = workouts.filter(w => new Date(w.date) < cutoffDate);
  const previousPR = getPersonalRecord(exerciseName, beforeWorkouts);

  const current1RM = currentPR?.oneRM || null;
  const previous1RM = previousPR?.oneRM || null;

  const change = current1RM && previous1RM ? current1RM - previous1RM : 0;
  const percentageChange = current1RM && previous1RM && previous1RM > 0
    ? (change / previous1RM) * 100
    : 0;

  const trend = calculateTrend(exerciseName, workouts, Math.min(periodWorkouts.length, 5));

  return {
    current1RM,
    previous1RM,
    change,
    percentageChange,
    workoutCount: periodWorkouts.length,
    trend: trend.direction
  };
}

/**
 * Detect plateaus (3+ workouts without improvement)
 */
export interface PlateauDetection {
  isPlateaued: boolean;
  workoutsStagnant: number;
  last1RM: number | null;
  suggestedAction: string;
}

export function detectPlateau(
  exerciseName: string,
  workouts: WorkoutLog[],
  threshold: number = 3
): PlateauDetection {
  const relevantWorkouts = workouts
    .filter(w => w.exercises.some(ex => ex.name.toLowerCase() === exerciseName.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, threshold + 2);

  if (relevantWorkouts.length < threshold) {
    return {
      isPlateaued: false,
      workoutsStagnant: 0,
      last1RM: null,
      suggestedAction: 'Keep training to establish baseline'
    };
  }

  const oneRMs = relevantWorkouts.map(w => {
    const ex = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (!ex) return null;
    const best = getBest1RM(ex);
    return best?.oneRM || null;
  }).filter(rm => rm !== null);

  if (oneRMs.length < threshold) {
    return {
      isPlateaued: false,
      workoutsStagnant: 0,
      last1RM: oneRMs[0] || null,
      suggestedAction: 'Complete more sets to track progress'
    };
  }

  // Check if last N workouts have same or decreasing 1RM
  let stagnantCount = 0;
  const baseline = oneRMs[0]!;

  for (let i = 1; i < Math.min(threshold, oneRMs.length); i++) {
    if (oneRMs[i]! <= baseline + 1) { // Allow 1kg variance
      stagnantCount++;
    }
  }

  const isPlateaued = stagnantCount >= threshold - 1;

  return {
    isPlateaued,
    workoutsStagnant: stagnantCount + 1,
    last1RM: baseline,
    suggestedAction: isPlateaued 
      ? 'Tijd voor deload of variatie in reps/sets' 
      : 'Blijf progressive overload toepassen'
  };
}

/**
 * Generate sparkline data for mini charts
 */
export function getSparklineData(
  exerciseName: string,
  workouts: WorkoutLog[],
  points: number = 10
): number[] {
  const relevantWorkouts = workouts
    .filter(w => w.exercises.some(ex => ex.name.toLowerCase() === exerciseName.toLowerCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-points);

  return relevantWorkouts.map(w => {
    const ex = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (!ex) return 0;
    const best = getBest1RM(ex);
    return best?.oneRM || 0;
  });
}
