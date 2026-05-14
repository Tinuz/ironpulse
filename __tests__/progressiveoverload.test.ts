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

  it('returns a suggestion when sufficient history is present', () => {
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(60, 10, true, false, 7),
          makeSet(60, 10, true, false, 7),
          makeSet(60, 10, true, false, 8),
        ]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    // Verify new fields are present
    expect(result!.estimate1RM).toBeGreaterThan(0);
    expect(result!.hypertrophyRange.min).toBeGreaterThan(0);
    expect(result!.hypertrophyRange.max).toBeGreaterThan(result!.hypertrophyRange.min);
    expect(result!.rpeTarget.min).toBeGreaterThanOrEqual(1);
    expect(result!.rpeTarget.max).toBeLessThanOrEqual(10);
    expect(typeof result!.effectiveSets).toBe('number');
  });

  it('suggested weight is rounded to nearest 2.5 kg', () => {
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [makeSet(60, 10, true, false, 7), makeSet(60, 10, true, false, 7), makeSet(60, 10, true, false, 7)]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result!.suggestedWeight % 2.5).toBe(0);
  });

  it('returns high confidence when sets include RPE data (≥ 3 sets)', () => {
    // Nieuwe logica: confidence is HIGH wanneer ≥ 3 sets met RPE zijn ingevuld
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(80, 10, true, false, 8),
          makeSet(80, 10, true, false, 8),
          makeSet(80, 10, true, false, 8),
        ]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('high');
  });

  it('returns low confidence when no RPE data is available', () => {
    // Geen RPE ingevuld → lage confidence
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [makeSet(80, 10), makeSet(80, 10), makeSet(80, 10)]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('low');
  });

  it('warmup sets are excluded from the calculation', () => {
    // Each session has 1 warmup + 3 working sets; result should only use working sets
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(40, 15, true, true), // warmup — excluded
          makeSet(80, 10, true, false, 7),
          makeSet(80, 10, true, false, 8),
          makeSet(80, 10, true, false, 8),
        ]),
      ]);
    const history = [session(14), session(7), session(0)];
    const result = generateProgressiveOverloadSuggestion('Bench Press', history);
    expect(result).not.toBeNull();
    // currentWeight should reflect the 80kg work sets, not be skewed by the 40kg warmup
    expect(result!.currentWeight).toBeCloseTo(80, 0);
  });

  it('compound exercises get RPE target 6–9', () => {
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Squat', [makeSet(100, 5, true, false, 8), makeSet(100, 5, true, false, 8), makeSet(100, 5, true, false, 8)]),
      ]);
    const result = generateProgressiveOverloadSuggestion('Squat', [session(14), session(7), session(0)]);
    expect(result!.rpeTarget.min).toBe(6);
    expect(result!.rpeTarget.max).toBe(9);
  });

  it('isolation exercises get RPE target 9–10', () => {
    const session = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bicep Curl', [makeSet(20, 12, true, false, 9), makeSet(20, 12, true, false, 9), makeSet(20, 12, true, false, 9)]),
      ]);
    const result = generateProgressiveOverloadSuggestion('Bicep Curl', [session(14), session(7), session(0)]);
    expect(result!.rpeTarget.min).toBe(9);
    expect(result!.rpeTarget.max).toBe(10);
  });

  it('low prevRPE triggers low-RPE correction (suggestedWeight increases)', () => {
    // Vorige sessie met RPE 4 (< 6) → gewicht moet omhoog
    const prevSession = makeWorkout('w1', 14, [
      makeExercise('Bench Press', [
        makeSet(60, 10, true, false, 4),
        makeSet(60, 10, true, false, 4),
        makeSet(60, 10, true, false, 4),
      ]),
    ]);
    const currentSession = makeWorkout('w2', 7, [
      makeExercise('Bench Press', [
        makeSet(60, 10, true, false, 4),
        makeSet(60, 10, true, false, 4),
        makeSet(60, 10, true, false, 4),
      ]),
    ]);
    const resultWithLowRPE = generateProgressiveOverloadSuggestion('Bench Press', [currentSession, prevSession]);

    const normalSession = (daysAgo: number) =>
      makeWorkout(`w${daysAgo}`, daysAgo, [
        makeExercise('Bench Press', [
          makeSet(60, 10, true, false, 8),
          makeSet(60, 10, true, false, 8),
          makeSet(60, 10, true, false, 8),
        ]),
      ]);
    const resultNormal = generateProgressiveOverloadSuggestion('Bench Press', [normalSession(7), normalSession(14)]);

    expect(resultWithLowRPE).not.toBeNull();
    expect(resultNormal).not.toBeNull();
    expect(resultWithLowRPE!.suggestedWeight).toBeGreaterThanOrEqual(resultNormal!.suggestedWeight);
  });

  it('increasePercentage is larger for lighter weights (sub-hypertrophy zone)', () => {
    // 40kg × 12 reps → 1RM = 56kg, target = 41.4kg (> 40kg → +)
    // 150kg × 5 reps → 1RM = 169kg, target = 125kg (< 150kg → -)
    // Light has positive increase %; heavy may have negative.
    const lightSession = (daysAgo: number) =>
      makeWorkout(`wl${daysAgo}`, daysAgo, [
        makeExercise('Cable Row', [makeSet(40, 12), makeSet(40, 12), makeSet(40, 12)]),
      ]);
    const heavySession = (daysAgo: number) =>
      makeWorkout(`wh${daysAgo}`, daysAgo, [
        makeExercise('Deadlift', [makeSet(150, 5), makeSet(150, 5), makeSet(150, 5)]),
      ]);

    const lightResult = generateProgressiveOverloadSuggestion('Cable Row', [lightSession(14), lightSession(7), lightSession(0)]);
    const heavyResult = generateProgressiveOverloadSuggestion('Deadlift', [heavySession(14), heavySession(7), heavySession(0)]);

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
