import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));

import {
  findLastWorkoutWithExercise,
  calculateProgression,
  getTotalVolume,
} from '@/components/utils/progressionAnalytics';
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
  dateOffset: number,
  exercises: WorkoutExercise[],
  isDeload = false,
): WorkoutLog {
  const date = new Date();
  date.setDate(date.getDate() - dateOffset);
  return {
    id,
    schemaId: null,
    name: 'Test Workout',
    date: date.toISOString(),
    startTime: Date.now(),
    endTime: Date.now() + 3600000,
    exercises,
    isDeload,
  };
}

// ─── findLastWorkoutWithExercise ─────────────────────────────────────────────

describe('findLastWorkoutWithExercise', () => {
  it('returns null for an empty history', () => {
    expect(findLastWorkoutWithExercise([], 'Bench Press')).toBeNull();
  });

  it('returns null when the exercise is not in any workout', () => {
    const history = [makeWorkout('w1', 7, [makeExercise('Squat', [makeSet(100, 5)])])];
    expect(findLastWorkoutWithExercise(history, 'Bench Press')).toBeNull();
  });

  it('skips deload workouts', () => {
    const history = [
      makeWorkout('w1', 3, [makeExercise('Bench Press', [makeSet(80, 5)])], true),
      makeWorkout('w2', 10, [makeExercise('Bench Press', [makeSet(70, 5)])], false),
    ];
    const result = findLastWorkoutWithExercise(history, 'Bench Press');
    expect(result).not.toBeNull();
    expect(result!.sets[0].weight).toBe(70);
  });

  it('skips the excluded workout id', () => {
    const history = [
      makeWorkout('w1', 0, [makeExercise('Bench Press', [makeSet(100, 5)])]),
      makeWorkout('w2', 7, [makeExercise('Bench Press', [makeSet(90, 5)])]),
    ];
    const result = findLastWorkoutWithExercise(history, 'Bench Press', 'w1');
    expect(result).not.toBeNull();
    expect(result!.sets[0].weight).toBe(90);
  });

  it('returns the most recent non-deload workout with the exercise', () => {
    const history = [
      makeWorkout('w1', 14, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 7, [makeExercise('Bench Press', [makeSet(85, 5)])]),
    ];
    const result = findLastWorkoutWithExercise(history, 'Bench Press');
    expect(result!.sets[0].weight).toBe(85);
  });

  it('is case-insensitive for exercise names', () => {
    const history = [makeWorkout('w1', 3, [makeExercise('bench press', [makeSet(80, 5)])])];
    expect(findLastWorkoutWithExercise(history, 'Bench Press')).not.toBeNull();
  });
});

// ─── getTotalVolume ──────────────────────────────────────────────────────────

describe('getTotalVolume', () => {
  it('returns 0 for empty sets', () => {
    expect(getTotalVolume(makeExercise('Bench Press', []))).toBe(0);
  });

  it('returns 0 when no sets are completed', () => {
    const ex = makeExercise('Bench Press', [makeSet(100, 5, false)]);
    expect(getTotalVolume(ex)).toBe(0);
  });

  it('sums weight × reps for all completed sets', () => {
    const ex = makeExercise('Bench Press', [
      makeSet(100, 5, true),  // 500
      makeSet(100, 4, true),  // 400
      makeSet(100, 3, false), // excluded
    ]);
    expect(getTotalVolume(ex)).toBe(900);
  });
});

// ─── calculateProgression ────────────────────────────────────────────────────

describe('calculateProgression', () => {
  it('returns maintained when there is no previous exercise', () => {
    const current = makeExercise('Bench Press', [makeSet(80, 5)]);
    const result = calculateProgression(current, null);
    expect(result.status).toBe('maintained');
    expect(result.delta).toBe(0);
  });

  it('detects improvement when current best volume exceeds previous', () => {
    const previous = makeExercise('Bench Press', [makeSet(80, 5)]);
    const current = makeExercise('Bench Press', [makeSet(85, 5)]);
    const result = calculateProgression(current, previous);
    expect(result.status).toBe('improved');
    expect(result.delta).toBeGreaterThan(0);
  });

  it('detects decrease when current best volume is lower', () => {
    const previous = makeExercise('Bench Press', [makeSet(85, 5)]);
    const current = makeExercise('Bench Press', [makeSet(80, 5)]);
    const result = calculateProgression(current, previous);
    expect(result.status).toBe('decreased');
    expect(result.delta).toBeLessThan(0);
  });

  it('returns maintained when current and previous volumes are equal', () => {
    const previous = makeExercise('Bench Press', [makeSet(80, 5)]);
    const current = makeExercise('Bench Press', [makeSet(80, 5)]);
    const result = calculateProgression(current, previous);
    expect(result.status).toBe('maintained');
  });
});
