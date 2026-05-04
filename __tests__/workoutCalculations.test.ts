import { describe, it, expect, vi } from 'vitest';

// Mock DataContext — utility functions only import types from it, so an empty mock suffices
vi.mock('@/components/context/DataContext', () => ({}));

import {
  calculate1RM,
  getBest1RM,
  calculateVolume,
  roundTo,
} from '@/components/utils/workoutCalculations';
import type { WorkoutExercise, WorkoutSet } from '@/components/context/DataContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSet(
  weight: number,
  reps: number,
  completed = true,
  isWarmup = false,
): WorkoutSet {
  return { id: crypto.randomUUID(), weight, reps, completed, isWarmup };
}

function makeExercise(sets: WorkoutSet[]): WorkoutExercise {
  return {
    id: 'ex-1',
    exerciseId: 'e1',
    name: 'Bench Press',
    sets,
  };
}

// ─── calculate1RM ────────────────────────────────────────────────────────────

describe('calculate1RM', () => {
  it('returns weight directly for single rep', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('is greater than the lifted weight for multi-rep sets', () => {
    expect(calculate1RM(80, 5)).toBeGreaterThan(80);
  });

  it('caps reps at 12 for high-rep calculations (conservative estimate)', () => {
    // 20 reps should not wildly exceed the 12-rep estimate
    const at12 = calculate1RM(40, 12);
    const at20 = calculate1RM(40, 20);
    expect(at20).toBeCloseTo(at12, 1);
  });

  it('higher reps produce a higher estimated 1RM at the same weight', () => {
    expect(calculate1RM(60, 8)).toBeGreaterThan(calculate1RM(60, 5));
  });
});

// ─── getBest1RM ──────────────────────────────────────────────────────────────

describe('getBest1RM', () => {
  it('returns null when there are no completed sets', () => {
    const exercise = makeExercise([makeSet(100, 5, false)]);
    expect(getBest1RM(exercise)).toBeNull();
  });

  it('returns null when all completed sets are warmups', () => {
    const exercise = makeExercise([makeSet(60, 10, true, true)]);
    expect(getBest1RM(exercise)).toBeNull();
  });

  it('returns null when reps or weight are zero', () => {
    const exercise = makeExercise([makeSet(0, 5, true), makeSet(100, 0, true)]);
    expect(getBest1RM(exercise)).toBeNull();
  });

  it('picks the set with the highest estimated 1RM', () => {
    // 100kg × 3 reps vs 80kg × 10 reps — the higher-reps set might win
    const exercise = makeExercise([
      makeSet(100, 3, true), // lower 1RM
      makeSet(80, 10, true), // higher 1RM (~107kg)
    ]);
    const result = getBest1RM(exercise);
    expect(result).not.toBeNull();
    expect(result!.weight).toBe(80);
    expect(result!.reps).toBe(10);
  });

  it('excludes warmup sets from 1RM calculation', () => {
    const exercise = makeExercise([
      makeSet(150, 1, true, true), // warmup — should be ignored
      makeSet(100, 5, true, false), // work set
    ]);
    const result = getBest1RM(exercise);
    expect(result).not.toBeNull();
    expect(result!.weight).toBe(100);
  });
});

// ─── calculateVolume ─────────────────────────────────────────────────────────

describe('calculateVolume', () => {
  it('returns 0 for no sets', () => {
    expect(calculateVolume(makeExercise([]))).toBe(0);
  });

  it('returns 0 when no sets are completed', () => {
    const exercise = makeExercise([makeSet(100, 5, false)]);
    expect(calculateVolume(exercise)).toBe(0);
  });

  it('excludes warmup sets from volume', () => {
    const exercise = makeExercise([
      makeSet(60, 10, true, true), // warmup — excluded
      makeSet(100, 5, true, false), // work set — 500
      makeSet(100, 5, true, false), // work set — 500
    ]);
    expect(calculateVolume(exercise)).toBe(1000);
  });

  it('sums weight × reps for all completed non-warmup sets', () => {
    const exercise = makeExercise([
      makeSet(80, 8, true),  // 640
      makeSet(80, 7, true),  // 560
      makeSet(80, 6, true),  // 480
    ]);
    expect(calculateVolume(exercise)).toBe(1680);
  });

  it('ignores incomplete sets', () => {
    const exercise = makeExercise([
      makeSet(100, 10, true),  // 1000
      makeSet(100, 10, false), // incomplete — excluded
    ]);
    expect(calculateVolume(exercise)).toBe(1000);
  });
});

// ─── roundTo ─────────────────────────────────────────────────────────────────

describe('roundTo', () => {
  it('rounds to the nearest 0.5 by default', () => {
    expect(roundTo(100.3)).toBe(100.5);
    expect(roundTo(100.2)).toBe(100);
    expect(roundTo(100.7)).toBe(100.5);
  });

  it('rounds to a custom increment', () => {
    expect(roundTo(102, 2.5)).toBe(102.5);
    expect(roundTo(103, 2.5)).toBe(102.5);
    // 101.26 / 2.5 = 40.504 → rounds to 41 → 41 × 2.5 = 102.5
    expect(roundTo(101.26, 2.5)).toBe(102.5);
  });
});
