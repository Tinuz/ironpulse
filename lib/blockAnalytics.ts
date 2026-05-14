/**
 * Block Analytics — GAS Periodization
 *
 * Implements Frank's General Adaptation Syndrome (GAS) training principle:
 *   - 4–6 week progressive volume blocks per focus muscle group
 *   - Each build week adds 3 sets on top of MEV (Minimum Effective Volume)
 *   - Final week is a deload at ~50% of the last build week
 *
 * Example 5-week block (back, MEV=10):
 *   W1=10, W2=13, W3=16, W4=19, W5=10 (deload)
 */

import type { TrainingBlock, TrainingBlockMuscle, WorkoutLog } from '@/components/context/DataContext';
import { getMuscleGroup } from '@/components/utils/volumeAnalytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Starting sets per muscle group (MEV — minimum effective volume). */
export const BLOCK_START_SETS: Record<TrainingBlockMuscle, number> = {
  chest:     8,
  back:      10,
  shoulders: 8,
  legs:      8,
  arms:      6,
  abs:       6,
  glutes:    6,
  calves:    8,
};

/** Sets added per build week. */
export const SETS_PER_BUILD_WEEK = 3;

/** Fraction of last build week used for the deload week. */
export const DELOAD_FRACTION = 0.5;

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Returns the target set count for a focus muscle in a specific block week.
 *
 * @param muscle        The muscle group being tracked
 * @param durationWeeks Total block length (4 | 5 | 6), last week = deload
 * @param weekNumber    1-indexed week within the block
 */
export function getBlockWeekTargets(
  muscle: TrainingBlockMuscle,
  durationWeeks: 4 | 5 | 6,
  weekNumber: number,
): number {
  const mev = BLOCK_START_SETS[muscle];
  const buildWeeks = durationWeeks - 1;

  // Clamp to valid range
  const week = Math.max(1, Math.min(weekNumber, durationWeeks));

  if (week === durationWeeks) {
    // Deload: round-half of last build week's sets
    const lastBuildSets = mev + (buildWeeks - 1) * SETS_PER_BUILD_WEEK;
    return Math.max(1, Math.round(lastBuildSets * DELOAD_FRACTION));
  }

  return mev + (week - 1) * SETS_PER_BUILD_WEEK;
}

/**
 * Returns the 1-indexed week number currently active in the block.
 * Clamped to [1, block.durationWeeks].
 *
 * @param block  The training block
 * @param today  Override for the current date (useful in tests)
 */
export function getCurrentBlockWeek(block: TrainingBlock, today?: Date): number {
  const start = new Date(block.startDate);
  const now = today ?? new Date();

  const daysDiff = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const week = Math.floor(daysDiff / 7) + 1;
  return Math.max(1, Math.min(week, block.durationWeeks));
}

/**
 * Returns true if the block is currently in its final (deload) week.
 */
export function isDeloadWeek(block: TrainingBlock, today?: Date): boolean {
  return getCurrentBlockWeek(block, today) === block.durationWeeks;
}

/**
 * Returns a display label for the current block week.
 * Examples: "Week 3 van 5", "Deload week"
 */
export function getBlockWeekLabel(block: TrainingBlock, today?: Date): string {
  const week = getCurrentBlockWeek(block, today);
  if (week === block.durationWeeks) return 'Deload week';
  return `Week ${week} van ${block.durationWeeks}`;
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

export interface MuscleProgress {
  muscle: TrainingBlockMuscle;
  targetSets: number;
  actualSets: number;
  /** 0–1 completion fraction (capped at 1) */
  pct: number;
}

export interface BlockProgress {
  weekNumber: number;
  isDeload: boolean;
  muscles: MuscleProgress[];
  /** Weeks left until the block ends (0 on the last week) */
  weeksRemaining: number;
}

/**
 * Calculates actual vs target sets per focus muscle for the active block week.
 * Only counts completed, non-warmup sets from non-deload workouts.
 *
 * @param block    The training block
 * @param history  Full workout history
 * @param today    Override for the current date (useful in tests)
 */
export function getBlockProgress(
  block: TrainingBlock,
  history: WorkoutLog[],
  today?: Date,
): BlockProgress {
  const week = getCurrentBlockWeek(block, today);
  const deload = week === block.durationWeeks;

  // Compute this week's date window [weekStart, weekEnd)
  const blockStart = new Date(block.startDate);
  const weekStart = new Date(blockStart);
  weekStart.setDate(blockStart.getDate() + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Filter to workouts within this week
  const weekWorkouts = history.filter(w => {
    const d = new Date(w.date);
    return d >= weekStart && d < weekEnd && !w.isDeload;
  });

  // Count effective sets per focus muscle
  const setCounts = new Map<TrainingBlockMuscle, number>();

  for (const workout of weekWorkouts) {
    for (const ex of workout.exercises) {
      const resolved = getMuscleGroup(ex.name, ex.muscleGroup);
      if (!resolved) continue;
      const muscle = resolved as TrainingBlockMuscle;
      if (!block.focusMuscles.includes(muscle)) continue;

      for (const set of ex.sets) {
        if (set.completed && !set.isWarmup) {
          setCounts.set(muscle, (setCounts.get(muscle) ?? 0) + 1);
        }
      }
    }
  }

  const muscles: MuscleProgress[] = block.focusMuscles.map(muscle => {
    const targetSets = getBlockWeekTargets(muscle, block.durationWeeks, week);
    const actualSets = setCounts.get(muscle) ?? 0;
    return {
      muscle,
      targetSets,
      actualSets,
      pct: targetSets > 0 ? Math.min(1, actualSets / targetSets) : 0,
    };
  });

  return {
    weekNumber: week,
    isDeload: deload,
    muscles,
    weeksRemaining: block.durationWeeks - week,
  };
}
