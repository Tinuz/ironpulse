import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));
// plateauDetection imports strengthAnalytics which imports workoutCalculations.
// workoutCalculations imports DataContext for types only — mock prevents module execution issues.

import { detectAllPlateaus, getPlateauSeverity } from '@/components/utils/plateauDetection';
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
  name = 'Test',
  trainingIntent?: WorkoutLog['trainingIntent'],
): WorkoutLog {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    schemaId: null,
    name,
    date: date.toISOString(),
    startTime: Date.now(),
    endTime: null,
    exercises,
    isDeload,
    trainingIntent,
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
    // Bench Press is a compound → internal threshold = 4; only 2 workouts → no plateau
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

  it('excludes technique intent workouts from plateau detection', () => {
    const stagnantSet = [makeSet(80, 5)];
    const workouts = [
      makeWorkout('w1', 21, [makeExercise('Bench Press', stagnantSet)]),
      makeWorkout('w2', 14, [makeExercise('Bench Press', stagnantSet)]),
      makeWorkout('w3', 7, [makeExercise('Bench Press', stagnantSet)], false, 'Techniek Push', 'technique'),
      makeWorkout('w4', 0, [makeExercise('Bench Press', stagnantSet)], false, 'Techniek Push', 'technique'),
    ];
    // After excluding technique sessions only 2 valid sessions remain -> below threshold
    const plateaus = detectAllPlateaus(workouts);
    expect(plateaus.length).toBe(0);
  });

  it('infers technique intent from workout name when intent field is missing', () => {
    const stagnantSet = [makeSet(80, 5)];
    const workouts = [
      makeWorkout('w1', 21, [makeExercise('Bench Press', stagnantSet)], false, 'Upper A'),
      makeWorkout('w2', 14, [makeExercise('Bench Press', stagnantSet)], false, 'Upper B'),
      makeWorkout('w3', 7, [makeExercise('Bench Press', stagnantSet)], false, 'Techniek borst sessie'),
      makeWorkout('w4', 0, [makeExercise('Bench Press', stagnantSet)], false, 'Techniek borst sessie'),
    ];
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

  // ─── Compound vs isolation thresholds ────────────────────────────────────

  it('does NOT flag compound with 4 stagnant sessions spanning only 2 calendar weeks', () => {
    // 2× per week training: 4 sessions but only 2 weeks — minimum is 3 weeks for compounds
    const sameWeightSet = [makeSet(80, 5)];
    const workouts = [
      makeWorkout('w1', 14, [makeExercise('Bench Press', sameWeightSet)]),
      makeWorkout('w2', 9,  [makeExercise('Bench Press', sameWeightSet)]),
      makeWorkout('w3', 5,  [makeExercise('Bench Press', sameWeightSet)]),
      makeWorkout('w4', 0,  [makeExercise('Bench Press', sameWeightSet)]),
    ];
    // 4 sessions ≥ compound threshold (4) but weeksStagnant = 2 < minimum 3 weeks
    expect(detectAllPlateaus(workouts)).toEqual([]);
  });

  it('does NOT flag isolation exercise with only 4 sessions (below threshold of 5)', () => {
    const sameWeightSet = [makeSet(15, 15)];
    const workouts = [
      makeWorkout('w1', 28, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w2', 21, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w3', 14, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w4', 7,  [makeExercise('Lateral Raise', sameWeightSet)]),
    ];
    // 4 sessions < isolation threshold (5) → no plateau, even with 3 weeks span
    expect(detectAllPlateaus(workouts)).toEqual([]);
  });

  it('detects plateau for isolation exercise with 5 sessions spanning 4+ weeks', () => {
    const sameWeightSet = [makeSet(15, 15)];
    const workouts = [
      makeWorkout('w1', 35, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w2', 28, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w3', 21, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w4', 14, [makeExercise('Lateral Raise', sameWeightSet)]),
      makeWorkout('w5', 7,  [makeExercise('Lateral Raise', sameWeightSet)]),
    ];
    // 5 sessions ≥ isolation threshold (5), 35 days ≥ 4-week minimum → plateau detected
    const plateaus = detectAllPlateaus(workouts);
    expect(plateaus.length).toBeGreaterThan(0);
    expect(plateaus[0].exerciseName).toBe('Lateral Raise');
  });
});

// ─── getPlateauSeverity ───────────────────────────────────────────────────────

describe('getPlateauSeverity', () => {
  it('mild for 3–4 weeks stagnant', () => {
    expect(getPlateauSeverity(3)).toBe('mild');
    expect(getPlateauSeverity(4)).toBe('mild');
  });

  it('moderate for 5–7 weeks stagnant', () => {
    expect(getPlateauSeverity(5)).toBe('moderate');
    expect(getPlateauSeverity(7)).toBe('moderate');
  });

  it('severe for 8+ weeks stagnant', () => {
    expect(getPlateauSeverity(8)).toBe('severe');
    expect(getPlateauSeverity(12)).toBe('severe');
  });
});
