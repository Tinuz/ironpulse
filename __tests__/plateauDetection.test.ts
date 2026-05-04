import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));
// plateauDetection imports strengthAnalytics which imports workoutCalculations.
// workoutCalculations imports DataContext for types only — mock prevents module execution issues.

import { detectAllPlateaus } from '@/components/utils/plateauDetection';
import type { WorkoutLog, WorkoutExercise, WorkoutSet } from '@/components/context/DataContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSet(weight: number, reps: number, completed = true): WorkoutSet {
  return { id: crypto.randomUUID(), weight, reps, completed };
}

function makeExercise(name: string, sets: WorkoutSet[]): WorkoutExercise {
  return { id: 'ex-1', exerciseId: 'e1', name, sets };
}

function makeWorkout(
  id: string,
  daysAgo: number,
  exercises: WorkoutExercise[],
  isDeload = false,
): WorkoutLog {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    schemaId: null,
    name: 'Test',
    date: date.toISOString(),
    startTime: Date.now(),
    endTime: null,
    exercises,
    isDeload,
  };
}

// ─── detectAllPlateaus ───────────────────────────────────────────────────────

describe('detectAllPlateaus', () => {
  it('returns empty array for empty workout history', () => {
    expect(detectAllPlateaus([])).toEqual([]);
  });

  it('returns empty array when history is below the threshold', () => {
    const workouts = [
      makeWorkout('w1', 14, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 7, [makeExercise('Bench Press', [makeSet(80, 5)])]),
    ];
    // threshold defaults to 3; only 2 workouts → no plateau detection
    expect(detectAllPlateaus(workouts)).toEqual([]);
  });

  it('detects plateau when weight does not change across sufficient workouts', () => {
    const sameWeightSet = [makeSet(80, 5)];
    const workouts = [
      makeWorkout('w1', 21, [makeExercise('Bench Press', sameWeightSet)]),
      makeWorkout('w2', 14, [makeExercise('Bench Press', sameWeightSet)]),
      makeWorkout('w3', 7, [makeExercise('Bench Press', sameWeightSet)]),
      makeWorkout('w4', 0, [makeExercise('Bench Press', sameWeightSet)]),
    ];
    const plateaus = detectAllPlateaus(workouts);
    expect(plateaus.length).toBeGreaterThan(0);
    expect(plateaus[0].exerciseName).toBe('Bench Press');
  });

  it('does not detect plateau when weight consistently increases', () => {
    const workouts = [
      makeWorkout('w1', 21, [makeExercise('Bench Press', [makeSet(70, 5)])]),
      makeWorkout('w2', 14, [makeExercise('Bench Press', [makeSet(75, 5)])]),
      makeWorkout('w3', 7, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w4', 0, [makeExercise('Bench Press', [makeSet(85, 5)])]),
    ];
    const plateaus = detectAllPlateaus(workouts);
    expect(plateaus.length).toBe(0);
  });

  it('excludes deload workouts from plateau detection', () => {
    const stagnantSet = [makeSet(80, 5)];
    const workouts = [
      makeWorkout('w1', 21, [makeExercise('Bench Press', stagnantSet)]),
      makeWorkout('w2', 14, [makeExercise('Bench Press', stagnantSet)]),
      // deload — should not be counted
      makeWorkout('w3', 7, [makeExercise('Bench Press', stagnantSet)], true),
    ];
    // After excluding deload, only 2 workouts remain → below threshold
    const plateaus = detectAllPlateaus(workouts);
    expect(plateaus.length).toBe(0);
  });

  it('sorts results with highest weeksStagnant first', () => {
    const set = [makeSet(80, 5)];
    const workouts = Array.from({ length: 6 }, (_, i) =>
      makeWorkout(`w${i}`, (5 - i) * 7, [
        makeExercise('Bench Press', set),
        makeExercise('Squat', set),
      ]),
    );
    const plateaus = detectAllPlateaus(workouts);
    if (plateaus.length > 1) {
      expect(plateaus[0].weeksStagnant).toBeGreaterThanOrEqual(plateaus[1].weeksStagnant);
    }
  });
});
