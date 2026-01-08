/**
 * Progressive Overload Analytics
 * 
 * Utilities for tracking and comparing workout progression.
 * Helps identify improvements, plateaus, and regressions across workouts.
 */

import { WorkoutLog, WorkoutExercise } from '@/components/context/DataContext';

export type ProgressionStatus = 'improved' | 'maintained' | 'decreased';

export interface ProgressionResult {
  status: ProgressionStatus;
  delta: number; // Change in primary metric (weight or reps)
  metric: 'weight' | 'reps' | 'volume';
  previousBest?: {
    weight: number;
    reps: number;
    volume: number;
  };
  currentBest?: {
    weight: number;
    reps: number;
    volume: number;
  };
}

/**
 * Find the most recent workout that contains a specific exercise
 */
export function findLastWorkoutWithExercise(
  history: WorkoutLog[],
  exerciseName: string,
  excludeWorkoutId?: string
): WorkoutExercise | null {
  // Sort history by date (most recent first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const workout of sortedHistory) {
    // Skip if this is the current workout
    if (excludeWorkoutId && workout.id === excludeWorkoutId) {
      continue;
    }

    // Find exercise by name (case-insensitive)
    const exercise = workout.exercises.find(
      ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
    );

    if (exercise) {
      return exercise;
    }
  }

  return null;
}

/**
 * Get the best set from an exercise (highest weight × reps)
 */
function getBestSet(exercise: WorkoutExercise): { weight: number; reps: number; volume: number } | null {
  const completedSets = exercise.sets.filter(set => set.completed);
  
  if (completedSets.length === 0) {
    return null;
  }

  // Find set with highest volume (weight × reps)
  const bestSet = completedSets.reduce((best, current) => {
    const currentVolume = current.weight * current.reps;
    const bestVolume = best.weight * best.reps;
    return currentVolume > bestVolume ? current : best;
  });

  return {
    weight: bestSet.weight,
    reps: bestSet.reps,
    volume: bestSet.weight * bestSet.reps
  };
}

/**
 * Calculate total volume for an exercise (sum of all weight × reps)
 * Exported for potential future use in volume tracking
 */
export function getTotalVolume(exercise: WorkoutExercise): number {
  return exercise.sets
    .filter(set => set.completed)
    .reduce((total, set) => total + (set.weight * set.reps), 0);
}

/**
 * Compare current exercise performance to previous workout
 */
export function calculateProgression(
  currentExercise: WorkoutExercise,
  previousExercise: WorkoutExercise | null
): ProgressionResult {
  const currentBest = getBestSet(currentExercise);
  
  // No previous data - can't determine progression
  if (!previousExercise || !currentBest) {
    return {
      status: 'maintained',
      delta: 0,
      metric: 'weight',
      currentBest: currentBest || undefined
    };
  }

  const previousBest = getBestSet(previousExercise);
  
  if (!previousBest) {
    return {
      status: 'maintained',
      delta: 0,
      metric: 'weight',
      currentBest: currentBest || undefined
    };
  }

  // Compare metrics
  const weightDelta = currentBest.weight - previousBest.weight;
  const repsDelta = currentBest.reps - previousBest.reps;
  const volumeDelta = currentBest.volume - previousBest.volume;

  // Determine status based on improvements
  // Priority: weight > reps > volume
  if (weightDelta > 0) {
    return {
      status: 'improved',
      delta: weightDelta,
      metric: 'weight',
      previousBest,
      currentBest
    };
  }

  if (weightDelta < 0) {
    return {
      status: 'decreased',
      delta: weightDelta,
      metric: 'weight',
      previousBest,
      currentBest
    };
  }

  // Weight is the same, check reps
  if (repsDelta > 0) {
    return {
      status: 'improved',
      delta: repsDelta,
      metric: 'reps',
      previousBest,
      currentBest
    };
  }

  if (repsDelta < 0) {
    return {
      status: 'decreased',
      delta: repsDelta,
      metric: 'reps',
      previousBest,
      currentBest
    };
  }

  // Weight and reps are the same, check total volume
  if (volumeDelta > 0) {
    return {
      status: 'improved',
      delta: volumeDelta,
      metric: 'volume',
      previousBest,
      currentBest
    };
  }

  if (volumeDelta < 0) {
    return {
      status: 'decreased',
      delta: volumeDelta,
      metric: 'volume',
      previousBest,
      currentBest
    };
  }

  // Everything is exactly the same
  return {
    status: 'maintained',
    delta: 0,
    metric: 'weight',
    previousBest,
    currentBest
  };
}

/**
 * Get progression for current exercise based on workout history
 */
export function getExerciseProgression(
  exerciseName: string,
  currentExercise: WorkoutExercise,
  history: WorkoutLog[],
  excludeWorkoutId?: string
): ProgressionResult {
  const previousExercise = findLastWorkoutWithExercise(history, exerciseName, excludeWorkoutId);
  return calculateProgression(currentExercise, previousExercise);
}

/**
 * Format progression delta for display
 */
export function formatProgressionDelta(result: ProgressionResult): string {
  const sign = result.delta > 0 ? '+' : '';
  
  switch (result.metric) {
    case 'weight':
      return `${sign}${result.delta}kg`;
    case 'reps':
      return `${sign}${result.delta} reps`;
    case 'volume':
      return `${sign}${result.delta.toFixed(0)}kg total`;
    default:
      return '';
  }
}
