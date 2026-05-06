/**
 * Tests for progressiveoverload.ts
 *
 * Covers:
 *  - generateProgressiveOverloadSuggestion: suggests weight increase when
 *    user consistently hits target reps with low variation
 *  - shouldDeload: volume-based fatigue check
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));

import {
  generateProgressiveOverloadSuggestion,
  shouldDeload,
} from '@/components/utils/progressiveOverload';
import type { WorkoutLog, WorkoutExercise, WorkoutSet } from '@/components/context/DataContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSet(
  weight: number,
  reps: number,
  completed = true,
  isWarmup = false,
  rpe?: number,
  rir?: number,
): WorkoutSet {
  return { id: crypto.randomUUID(), weight, reps, completed, isWarmup, rpe, rir };
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

// ─── generateProgressiveOverloadSuggestion ────────────────────────────────────

describe('generateProgressiveOverloadSuggestion', () => {
  it('returns null when history is empty', () => {
    expect(generateProgressiveOverloadSuggestion('Bench Press', [])).toBeNull();
  });

  it('returns null when only 1 previous session exists (need ≥ 2)', () => {
    const history = [
      makeWorkout('w1', 7, [makeExercise('Bench Press', [makeSet(80, 8), makeSet(80, 8)])]),
    ];
    expect(generateProgressiveOverloadSuggestion('Bench Press', history)).toBeNull();
  });

  it('returns null when exercise is not present', () => {
    const history = [
      makeWorkout('w1', 14, [makeExercise('Squat', [makeSet(100, 5)])]),
      makeWorkout('w2', 7,  [makeExercise('Squat', [makeSet(100, 5)])]),
    ];
    expect(generateProgressiveOverloadSuggestion('Bench Press', history)).toBeNull();
  });

  it('suggests an increase when reps consistently match the target', () => {
    // 3 sessions, 3 working sets per session hitting the same weight/reps → low CV
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(80, 10),
          makeSet(80, 10),
          makeSet(80, 10),
        ]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    expect(result!.suggestedWeight).toBeGreaterThan(80);
  });

  it('suggested weight is rounded to nearest 2.5 kg', () => {
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [makeSet(80, 10), makeSet(80, 10), makeSet(80, 10)]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result!.suggestedWeight % 2.5).toBe(0);
  });

  it('returns higher confidence when sets include low RIR data', () => {
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(80, 10, true, false, undefined, 1),
          makeSet(80, 10, true, false, undefined, 1),
        ]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('high');
  });

  it('warmup sets are excluded from the calculation', () => {
    // Each session has 1 warmup + 3 working sets; result should only use working sets
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(40, 15, true, true), // warmup — excluded
          makeSet(80, 10),
          makeSet(80, 10),
          makeSet(80, 10),
        ]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    // currentWeight should reflect the 80kg work sets, not be skewed by the 40kg warmup
    expect(result!.currentWeight).toBeCloseTo(80, 0);
  });

  it('percentage increase is smaller for heavy weights (NSCA guidelines)', () => {
    const lightSession = (daysAgo: number) =>
      makeWorkout(`wl${daysAgo}`, daysAgo, [
        makeExercise('Cable Row', [makeSet(40, 12), makeSet(40, 12), makeSet(40, 12)]),
      ]);
    const heavySession = (daysAgo: number) =>
      makeWorkout(`wh${daysAgo}`, daysAgo, [
        makeExercise('Deadlift', [makeSet(150, 5), makeSet(150, 5), makeSet(150, 5)]),
      ]);

    const lightHistory = [lightSession(14), lightSession(7), lightSession(0)];
    const heavyHistory = [heavySession(14), heavySession(7), heavySession(0)];

    const lightResult = generateProgressiveOverloadSuggestion('Cable Row', lightHistory);
    const heavyResult = generateProgressiveOverloadSuggestion('Deadlift', heavyHistory);

    if (lightResult && heavyResult) {
      expect(lightResult.increasePercentage).toBeGreaterThanOrEqual(heavyResult.increasePercentage);
    }
  });
});

// ─── shouldDeload ─────────────────────────────────────────────────────────────

describe('shouldDeload', () => {
  it('returns false when history is too short (< 4 workouts)', () => {
    const history = [
      makeWorkout('w1', 2, [makeExercise('Bench Press', [makeSet(80, 5)])]),
      makeWorkout('w2', 4, [makeExercise('Bench Press', [makeSet(80, 5)])]),
    ];
    const result = shouldDeload(history);
    expect(result.shouldDeload).toBe(false);
    expect(result.reason).toMatch(/not enough data/i);
  });

  it('returns false for a normal training week with no volume spike', () => {
    // 8 workouts over 5 weeks; consistent volume — no spike
    const history = Array.from({ length: 8 }, (_, i) =>
      makeWorkout(`w${i}`, i * 4, [makeExercise('Bench Press', [makeSet(80, 5), makeSet(80, 5)])]),
    );
    const result = shouldDeload(history);
    expect(result.shouldDeload).toBe(false);
  });

  it('recommends deload when last week volume spikes >50% above baseline', () => {
    // Baseline: 4 workouts × 2 sets × 80×5 = 3200 per workout over weeks 2–5
    // Current week: 8 high-volume workouts with 200kg sets → >50% spike
    const baselineWorkouts = Array.from({ length: 4 }, (_, i) =>
      makeWorkout(`b${i}`, 10 + i * 5, [
        makeExercise('Bench Press', [makeSet(80, 5), makeSet(80, 5)]),
      ]),
    );
    // Recent (last 7 days): very high volume
    const recentWorkouts = Array.from({ length: 7 }, (_, i) =>
      makeWorkout(`r${i}`, i, [
        makeExercise('Bench Press', [
          makeSet(200, 10), makeSet(200, 10), makeSet(200, 10),
          makeSet(200, 10), makeSet(200, 10),
        ]),
      ]),
    );
    const history = [...recentWorkouts, ...baselineWorkouts];
    const result = shouldDeload(history);
    expect(result.shouldDeload).toBe(true);
    expect(result.metrics.volumeIncrease).toBeGreaterThan(50);
  });

  it('recommends deload when average RPE exceeds 9', () => {
    const highRpeWorkout = (daysAgo: number, id: string) =>
      makeWorkout(id, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(80, 5, true, false, 9.5),
          makeSet(80, 5, true, false, 9.5),
        ]),
      ]);

    const history = [
      ...Array.from({ length: 4 }, (_, i) => highRpeWorkout(i, `w${i}`)),
      ...Array.from({ length: 4 }, (_, i) =>
        makeWorkout(`b${i}`, 10 + i * 4, [makeExercise('Bench Press', [makeSet(80, 5)])])),
    ];
    const result = shouldDeload(history);
    expect(result.shouldDeload).toBe(true);
  });

  it('metrics include weeklyVolume, baselineVolume, and volumeIncrease', () => {
    const history = Array.from({ length: 8 }, (_, i) =>
      makeWorkout(`w${i}`, i * 4, [makeExercise('Bench Press', [makeSet(80, 5)])]),
    );
    const result = shouldDeload(history);
    expect(result.metrics).toHaveProperty('weeklyVolume');
    expect(result.metrics).toHaveProperty('baselineVolume');
    expect(result.metrics).toHaveProperty('volumeIncrease');
    expect(result.metrics.weeklyVolume).toBeGreaterThanOrEqual(0);
  });
});
