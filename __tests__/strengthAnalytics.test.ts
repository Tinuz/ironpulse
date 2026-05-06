/**
 * Tests for strengthAnalytics.ts
 *
 * Covers:
 *  - detectPlateau: rewritten algorithm — scans backwards for consecutive
 *    sessions with no improvement vs historical best (with ±1kg noise tolerance)
 *  - getUniqueExercises
 *  - getMostFrequentExercises
 *  - calculateStrengthScore
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));

import {
  detectPlateau,
  getUniqueExercises,
  getMostFrequentExercises,
  calculateStrengthScore,
} from '@/components/utils/strengthAnalytics';
import type { WorkoutLog, WorkoutExercise, WorkoutSet } from '@/components/context/DataContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// Helper: build N workouts all with the same 1RM (stagnation)
function buildStagnantHistory(n: number, weight = 80, reps = 5, intervalDays = 7): WorkoutLog[] {
  return Array.from({ length: n }, (_, i) =>
    makeWorkout(`w${i}`, (n - 1 - i) * intervalDays, [
      makeExercise('Bench Press', [makeSet(weight, reps)]),
    ]),
  );
}

// ─── detectPlateau ────────────────────────────────────────────────────────────

describe('detectPlateau', () => {
  // Default threshold is 3

  it('returns not-plateaued with 0 stagnant when no workouts contain the exercise', () => {
    const workouts = [makeWorkout('w1', 7, [makeExercise('Squat', [makeSet(100, 5)])])];
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(false);
    expect(result.workoutsStagnant).toBe(0);
  });

  it('returns not-plateaued when below the threshold', () => {
    // threshold=3 requires 3 sessions without improvement; 2 sessions is not enough
    const workouts = buildStagnantHistory(2);
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(false);
  });

  it('detects plateau after threshold consecutive sessions without improvement', () => {
    // 4 sessions, same 80kg×5 → stagnantCount = 4 ≥ threshold(3)
    const workouts = buildStagnantHistory(4);
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(true);
    expect(result.workoutsStagnant).toBeGreaterThanOrEqual(3);
  });

  it('does NOT flag plateau when progress exists above noise tolerance', () => {
    // Clear progression: 70 → 75 → 80 → 85 kg — each session beats the historical best by >1kg
    const workouts = [
      makeWorkout('w1', 28, [makeExercise('Bench Press', [makeSet(70, 5)])]),
      makeWorkout('w2', 21, [makeExercise('Bench Press', [makeSet(75, 5)])]),
      makeWorkout('w3', 14, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w4', 7,  [makeExercise('Bench Press', [makeSet(85, 5)])]),
    ];
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(false);
  });

  it('noise tolerance: ±1kg oscillation does NOT break the stagnant streak', () => {
    // 80 → 81 → 80 → 80.5: all within 1kg of 81 → still plateaued
    const workouts = [
      makeWorkout('w1', 28, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 21, [makeExercise('Bench Press', [makeSet(81, 5)])]),
      makeWorkout('w3', 14, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w4', 7,  [makeExercise('Bench Press', [makeSet(80, 5)])]),
    ];
    // last1RM ≈ 89.1; prevBest ≈ 90.2 (from 81kg set); diff ≤ 1 → stagnant
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(true);
  });

  it('a clear improvement in the most recent session resets stagnation', () => {
    // 3 stagnant sessions, then a big jump in the last one
    const workouts = [
      makeWorkout('w1', 28, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 21, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w3', 14, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w4', 7,  [makeExercise('Bench Press', [makeSet(87, 5)])]),
    ];
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(false);
  });

  it('respects a custom threshold', () => {
    // 2 stagnant sessions, threshold=2 → plateau
    const workouts = buildStagnantHistory(2);
    const result = detectPlateau('Bench Press', workouts, 2);
    expect(result.isPlateaued).toBe(true);
  });

  it('is case-insensitive for exercise names', () => {
    const workouts = buildStagnantHistory(4);
    const lower = detectPlateau('bench press', workouts);
    const upper = detectPlateau('BENCH PRESS', workouts);
    expect(lower.isPlateaued).toBe(upper.isPlateaued);
  });

  it('reports the correct last1RM value', () => {
    const workouts = buildStagnantHistory(4, 100, 5);
    const result = detectPlateau('Bench Press', workouts);
    // Brzycki: 100 / (1.0278 - 0.0278×5) ≈ 111.3
    expect(result.last1RM).toBeGreaterThan(100);
    expect(result.last1RM).toBeLessThan(120);
  });

  it('ignores workouts that do not contain the target exercise', () => {
    // Interleave squats — should not affect bench press plateau count
    const workouts = [
      makeWorkout('w1', 35, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 28, [makeExercise('Squat', [makeSet(100, 5)])]),
      makeWorkout('w3', 21, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w4', 14, [makeExercise('Squat', [makeSet(100, 5)])]),
      makeWorkout('w5', 7,  [makeExercise('Bench Press', [makeSet(80, 5)])]),
    ];
    const result = detectPlateau('Bench Press', workouts);
    expect(result.isPlateaued).toBe(true);
  });
});

// ─── getUniqueExercises ───────────────────────────────────────────────────────

describe('getUniqueExercises', () => {
  it('returns empty array for empty history', () => {
    expect(getUniqueExercises([])).toEqual([]);
  });

  it('returns sorted unique exercise names', () => {
    const workouts = [
      makeWorkout('w1', 14, [makeExercise('Squat', [makeSet(100, 5)]), makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 7,  [makeExercise('Squat', [makeSet(100, 5)])]),
    ];
    const names = getUniqueExercises(workouts);
    expect(names).toEqual(['Bench Press', 'Squat']);
  });

  it('deduplicates exercises that appear multiple times', () => {
    const workouts = Array.from({ length: 5 }, (_, i) =>
      makeWorkout(`w${i}`, i * 7, [makeExercise('Deadlift', [makeSet(120, 5)])]),
    );
    expect(getUniqueExercises(workouts)).toEqual(['Deadlift']);
  });
});

// ─── getMostFrequentExercises ─────────────────────────────────────────────────

describe('getMostFrequentExercises', () => {
  it('returns empty array for empty history', () => {
    expect(getMostFrequentExercises([])).toEqual([]);
  });

  it('returns exercises ordered by frequency (most first)', () => {
    const workouts = [
      makeWorkout('w1', 21, [makeExercise('Bench Press', [makeSet(80, 5)]), makeExercise('Squat', [makeSet(100, 5)])]),
      makeWorkout('w2', 14, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w3', 7,  [makeExercise('Bench Press', [makeSet(80, 5)])]),
    ];
    const result = getMostFrequentExercises(workouts, 2);
    expect(result[0]).toBe('Bench Press');
    expect(result[1]).toBe('Squat');
  });

  it('respects the limit parameter', () => {
    const workouts = [
      makeWorkout('w1', 14, [
        makeExercise('A', [makeSet(50, 5)]),
        makeExercise('B', [makeSet(50, 5)]),
        makeExercise('C', [makeSet(50, 5)]),
      ]),
    ];
    expect(getMostFrequentExercises(workouts, 2)).toHaveLength(2);
  });
});

// ─── calculateStrengthScore ───────────────────────────────────────────────────

describe('calculateStrengthScore', () => {
  it('returns zero total for empty workout history', () => {
    const result = calculateStrengthScore([]);
    expect(result.total).toBe(0);
    expect(result.lifts).toHaveLength(0);
  });

  it('sums 1RMs of all tracked big lifts', () => {
    const workouts = [
      makeWorkout('w1', 7, [
        makeExercise('Bench Press', [makeSet(100, 1)]),
        makeExercise('Squat', [makeSet(120, 1)]),
        makeExercise('Deadlift', [makeSet(140, 1)]),
      ]),
    ];
    const result = calculateStrengthScore(workouts, ['Bench Press', 'Squat', 'Deadlift']);
    expect(result.total).toBeCloseTo(100 + 120 + 140, 0);
    expect(result.lifts).toHaveLength(3);
  });

  it('excludes lifts not present in any workout', () => {
    const workouts = [
      makeWorkout('w1', 7, [makeExercise('Bench Press', [makeSet(100, 1)])]),
    ];
    const result = calculateStrengthScore(workouts, ['Bench Press', 'Squat']);
    expect(result.lifts).toHaveLength(1);
    expect(result.lifts[0].name).toBe('Bench Press');
  });

  it('previousTotal is null when there are no workouts older than 1 month', () => {
    const workouts = [makeWorkout('w1', 7, [makeExercise('Bench Press', [makeSet(100, 1)])])];
    const result = calculateStrengthScore(workouts, ['Bench Press']);
    expect(result.previousTotal).toBeNull();
  });

  it('calculates change vs month-old baseline', () => {
    const workouts = [
      // Current
      makeWorkout('w1', 7, [makeExercise('Bench Press', [makeSet(110, 1)])]),
      // Old (>30 days)
      makeWorkout('w2', 35, [makeExercise('Bench Press', [makeSet(100, 1)])]),
    ];
    const result = calculateStrengthScore(workouts, ['Bench Press']);
    expect(result.previousTotal).toBeCloseTo(100, 0);
    expect(result.change).toBeCloseTo(10, 0);
    expect(result.percentageChange).toBeCloseTo(10, 0);
  });
});
