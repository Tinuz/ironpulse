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
  /** ISO date string of the first session in the stagnant streak; null when not plateaued */
  plateauStartDate: string | null;
  suggestedAction: string;
}

export function detectPlateau(
  exerciseName: string,
  workouts: WorkoutLog[],
  threshold: number = 3
): PlateauDetection {
  // Haff & Triplett (2015): typical day-to-day 1RM variation is 2–3%; use 2.5% as noise floor
  const NOISE_TOLERANCE = 0.025;
  // Zatsiorsky & Kraemer (2006): a >10% load reduction below the session-window peak
  // signals an intentional reset (injury recovery, form reset) — not a true plateau.
  const RESET_THRESHOLD = 0.10;

  // Wider window (Schoenfeld et al. 2017: plateau meaningful after 3–4 sessions;
  // use 8 sessions minimum to capture the full stagnant streak accurately)
  const relevantWorkouts = workouts
    .filter(w => w.exercises.some(ex => ex.name.toLowerCase() === exerciseName.toLowerCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-Math.max(threshold + 5, 8));

  interface SessionPoint { oneRM: number; date: string }

  const notPlateaued = (last1RM: number | null): PlateauDetection => ({
    isPlateaued: false,
    workoutsStagnant: 0,
    last1RM,
    plateauStartDate: null,
    suggestedAction: 'Blijf progressive overload toepassen',
  });

  if (relevantWorkouts.length < threshold) {
    return notPlateaued(null);
  }

  const sessionData: SessionPoint[] = relevantWorkouts
    .map(w => {
      const ex = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
      if (!ex) return null;
      const best = getBest1RM(ex);
      return best ? { oneRM: best.oneRM, date: w.date } : null;
    })
    .filter((d): d is SessionPoint => d !== null);

  if (sessionData.length < threshold) {
    return notPlateaued(sessionData[sessionData.length - 1]?.oneRM ?? null);
  }

  const currentRM = sessionData[sessionData.length - 1].oneRM;
  const windowPeakRM = Math.max(...sessionData.map(s => s.oneRM));

  // Reset detection: if the user's current 1RM is >10% below their session-window peak,
  // they intentionally reduced load — this is recovery/reset, not a plateau.
  if (currentRM < windowPeakRM * (1 - RESET_THRESHOLD)) {
    return notPlateaued(currentRM);
  }

  // Backward scan (oldest→newest perspective, iterating newest→oldest):
  // Count consecutive sessions where currentRM did NOT beat the historical best
  // by more than the noise tolerance. If it did beat it → progress happened → stop.
  let stagnantCount = 1; // always includes the current session
  for (let i = sessionData.length - 2; i >= 0; i--) {
    const prevBestRM = Math.max(...sessionData.slice(0, i + 1).map(s => s.oneRM));
    // Current meaningfully exceeds everything before session i → genuine progress since then
    if (currentRM > prevBestRM * (1 + NOISE_TOLERANCE)) {
      break;
    }
    stagnantCount++;
  }

  const isPlateaued = stagnantCount >= threshold;
  const plateauStartDate = isPlateaued
    ? sessionData[sessionData.length - stagnantCount].date
    : null;

  return {
    isPlateaued,
    workoutsStagnant: stagnantCount,
    last1RM: currentRM,
    plateauStartDate,
    suggestedAction: isPlateaued
      ? 'Tijd voor variatie in reps/sets'
      : 'Blijf progressive overload toepassen',
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

/**
 * Get 1RM progression over time for top exercises
 */
export interface StrengthProgressionPoint {
  date: string
  exercises: Array<{
    name: string
    estimated1RM: number
  }>
}

export function get1RMProgression(
  workouts: WorkoutLog[],
  timeRange: 'week' | 'month' | 'quarter' | 'year'
): StrengthProgressionPoint[] {
  if (workouts.length === 0) return []
  
  const now = new Date()
  const points: StrengthProgressionPoint[] = []
  
  // Determine number of data points
  let numPoints = 7
  let daysPerPoint = 1
  
  switch (timeRange) {
    case 'week':
      numPoints = 7
      daysPerPoint = 1
      break
    case 'month':
      numPoints = 30
      daysPerPoint = 1
      break
    case 'quarter':
      numPoints = 13
      daysPerPoint = 7
      break
    case 'year':
      numPoints = 12
      daysPerPoint = 30
      break
  }
  
  // Get all exercises from workouts to determine top ones
  const allExerciseData = new Map<string, number[]>()
  
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      const best = getBest1RM(ex)
      if (best) {
        if (!allExerciseData.has(ex.name)) {
          allExerciseData.set(ex.name, [])
        }
        allExerciseData.get(ex.name)!.push(best.oneRM)
      }
    })
  })
  
  // Get top 5 exercises by average 1RM
  const topExercises = Array.from(allExerciseData.entries())
    .map(([name, rms]) => ({
      name,
      avgRM: rms.reduce((a, b) => a + b, 0) / rms.length
    }))
    .sort((a, b) => b.avgRM - a.avgRM)
    .slice(0, 5)
    .map(e => e.name)
  
  // Generate data points
  for (let i = numPoints - 1; i >= 0; i--) {
    const pointDate = new Date(now)
    pointDate.setDate(pointDate.getDate() - (i * daysPerPoint))
    const endDate = new Date(pointDate)
    endDate.setDate(endDate.getDate() + daysPerPoint)
    
    // Get best 1RM for each top exercise up to this point
    const workoutsUpToPoint = workouts.filter(w => {
      const wDate = new Date(w.date)
      return wDate <= endDate
    })
    
    const exercises = topExercises.map(name => {
      const pr = getPersonalRecord(name, workoutsUpToPoint)
      return {
        name,
        estimated1RM: pr?.oneRM || 0
      }
    }).filter(e => e.estimated1RM > 0)
    
    points.push({
      date: pointDate.toISOString(),
      exercises
    })
  }
  
  return points
}
