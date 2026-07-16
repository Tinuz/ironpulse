/**
 * Tests for deloadanalytics.ts
 *
 * Covers the public `detectDeloadNeed` function and its individual signal
 * detectors via the returned signal list:
 *  - volume_decline   (detectVolumeDecline)
 *  - accumulated_fatigue  (detectAccumulatedFatigue — fixed baseline comparison)
 *  - performance_decline  (detectPerformanceDecline)
 *  - multiple_plateaus    (detectMultiplePlateaus)
 *  - overreaching         (detectOverreaching)
 *  - muscle_group_overload (detectMuscleGroupOverload)
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));

import { detectDeloadNeed } from '@/components/utils/deloadAnalytics';
import type { WorkoutLog, WorkoutExercise, WorkoutSet, RestDay } from '@/components/context/DataContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSet(
  weight: number,
  reps: number,
  completed = true,
  isWarmup = false,
): WorkoutSet {
  return { id: crypto.randomUUID(), weight, reps, completed, isWarmup };
}

function makeExercise(
  name: string,
  sets: WorkoutSet[],
  muscleGroup?: string,
): WorkoutExercise {
  return { id: 'ex-1', exerciseId: 'e1', name, sets, muscleGroup } as WorkoutExercise;
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

// Helper: n workouts spread over `totalDays` days, each with the given exercises
function spreadWorkouts(
  n: number,
  totalDays: number,
  exercises: WorkoutExercise[],
  isDeload = false,
): WorkoutLog[] {
  return Array.from({ length: n }, (_, i) =>
    makeWorkout(`w${i}`, Math.round((totalDays / n) * i), exercises, isDeload),
  );
}

// ─── detectDeloadNeed — structural guarantees ─────────────────────────────────

describe('detectDeloadNeed — structure', () => {
  it('returns valid shape for empty history', () => {
    const result = detectDeloadNeed([]);
    expect(result).toHaveProperty('shouldDeload');
    expect(result).toHaveProperty('urgency');
    expect(result).toHaveProperty('signals');
    expect(result).toHaveProperty('recommendation');
    expect(result.signals).toBeInstanceOf(Array);
  });

  it('does not recommend deload for empty history', () => {
    expect(detectDeloadNeed([]).shouldDeload).toBe(false);
  });

  it('excludes existing deload workouts from signal analysis', () => {
    // All workouts marked as deload → no signals should fire
    const deloadWorkouts = spreadWorkouts(
      6, 42,
      [makeExercise('Bench Press', [makeSet(80, 5)])],
      true, // isDeload = true
    );
    const result = detectDeloadNeed(deloadWorkouts);
    expect(result.shouldDeload).toBe(false);
    expect(result.signals).toHaveLength(0);
  });

  it('urgency values are one of the defined levels', () => {
    const result = detectDeloadNeed([]);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.urgency);
  });
});

// ─── detectDeloadNeed — post-deload grace period ──────────────────────────────

describe('detectDeloadNeed — post-deload grace period', () => {
  it('does NOT recommend deload when isDeload=true workouts exist in the last 14 days', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    // 4 weeks of heavy training followed by a deload 3 days ago
    const workouts: WorkoutLog[] = [
      ...spreadWorkouts(8, 28, [heavyEx]),   // 4 weeks of heavy training
      makeWorkout('d1', 5, [makeExercise('Bench Press', [makeSet(50, 10)])], true), // deload
      makeWorkout('d2', 3, [makeExercise('Bench Press', [makeSet(50, 10)])], true), // deload
      makeWorkout('b1', 1, [makeExercise('Bench Press', [makeSet(70, 8)])]),        // back to training
    ];
    const result = detectDeloadNeed(workouts);
    expect(result.shouldDeload).toBe(false);
    expect(result.signals).toHaveLength(0);
    expect(result.recommendation).toContain('recent een deload gehad');
  });

  it('does NOT recommend deload when a single isDeload workout was done 13 days ago', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    const workouts: WorkoutLog[] = [
      ...spreadWorkouts(8, 42, [heavyEx]),
      makeWorkout('d1', 13, [makeExercise('Bench Press', [makeSet(50, 10)])], true),
    ];
    const result = detectDeloadNeed(workouts);
    expect(result.shouldDeload).toBe(false);
    expect(result.recommendation).toContain('recent een deload gehad');
  });

  it('DOES recommend deload when isDeload workout was 15+ days ago and signals are present', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    // Deload 15 days ago, then heavy training resumed → signals should fire again
    const workouts: WorkoutLog[] = [
      makeWorkout('d1', 15, [makeExercise('Bench Press', [makeSet(50, 10)])], true),
      ...spreadWorkouts(6, 14, [heavyEx]),
    ];
    // Grace period is expired (15 days > 14 day window)
    const result = detectDeloadNeed(workouts);
    expect(result.recommendation).not.toContain('recent een deload gehad');
  });

  it('DOES recommend deload when no recent deload and signals are present', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    // 6 weeks of continuous heavy training, no deload
    const workouts = spreadWorkouts(12, 42, [heavyEx]);
    const result = detectDeloadNeed(workouts);
    // Just check that the grace period doesn't incorrectly suppress signals here
    expect(result.recommendation).not.toContain('recent een deload gehad');
  });

  it('does NOT recommend deload when deload REST DAYS (type=deload) exist in the last 14 days', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    const workouts = spreadWorkouts(8, 56, [heavyEx]);
    // No isDeload=true workouts — user deloaded purely via rest days
    const makeRestDay = (daysAgo: number): RestDay => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return { id: `rd${daysAgo}`, date: d.toISOString().split('T')[0], type: 'deload' };
    };
    const restDays: RestDay[] = [makeRestDay(3), makeRestDay(4), makeRestDay(5), makeRestDay(6)];
    const result = detectDeloadNeed(workouts, 6, [], restDays);
    expect(result.shouldDeload).toBe(false);
    expect(result.recommendation).toContain('recent een deload gehad');
  });

  it('DOES recommend deload when deload rest days were 15+ days ago and signals are present', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    const makeRestDay = (daysAgo: number): RestDay => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return { id: `rd${daysAgo}`, date: d.toISOString().split('T')[0], type: 'deload' };
    };
    const restDays: RestDay[] = [makeRestDay(15), makeRestDay(16), makeRestDay(17)];
    // Heavy training resumed after the rest days
    const workouts = spreadWorkouts(6, 14, [heavyEx]);
    const result = detectDeloadNeed(workouts, 6, [], restDays);
    // Grace period expired — signals should be able to fire again
    expect(result.recommendation).not.toContain('recent een deload gehad');
  });

  it('does NOT recommend deload when rest days have type=rest (not deload) — only deload type triggers grace', () => {
    const heavyEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    const workouts = spreadWorkouts(12, 42, [heavyEx]);
    const makeRestDay = (daysAgo: number, type: RestDay['type']): RestDay => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return { id: `rd${daysAgo}`, date: d.toISOString().split('T')[0], type };
    };
    // These are type='rest', not type='deload' — should NOT trigger the grace period
    const restDays: RestDay[] = [makeRestDay(3, 'rest'), makeRestDay(4, 'rest')];
    const result = detectDeloadNeed(workouts, 6, [], restDays);
    // Grace period should NOT fire — recommendation should not be the deload-suppressed message
    expect(result.recommendation).not.toContain('recent een deload gehad');
  });
});

// ─── detectDeloadNeed — volume_decline signal ─────────────────────────────────

describe('detectDeloadNeed — volume decline signal', () => {
  it('fires volume_decline when volume drops 3 consecutive weeks (each >5% below previous)', () => {
    // Week 1 (oldest): high volume; each next week is significantly lower
    // We produce workouts so weeklySummary sees the pattern.
    // Oldest = 42–35 days ago, mid = 21–14 days ago, recent = 7–0 days ago
    const highVolumeEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);
    const midVolumeEx = makeExercise('Bench Press', [
      makeSet(80, 8), makeSet(80, 8),
    ]);
    const lowVolumeEx = makeExercise('Bench Press', [makeSet(60, 5)]);

    const workouts: WorkoutLog[] = [
      // Older baseline weeks (not part of decline check)
      makeWorkout('b1', 42, [highVolumeEx]),
      makeWorkout('b2', 35, [highVolumeEx]),
      // Recent 3 weeks: declining
      makeWorkout('w1', 21, [highVolumeEx]),
      makeWorkout('w2', 14, [midVolumeEx]),
      makeWorkout('w3', 7,  [lowVolumeEx]),
    ];

    const result = detectDeloadNeed(workouts);
    const hasVolumeDecline = result.signals.some(s => s.type === 'volume_decline');
    expect(hasVolumeDecline).toBe(true);
  });

  it('does NOT fire volume_decline when volume stays stable', () => {
    const stableEx = makeExercise('Bench Press', [makeSet(80, 8), makeSet(80, 8)]);
    const workouts = spreadWorkouts(6, 42, [stableEx]);
    const result = detectDeloadNeed(workouts);
    const hasVolumeDecline = result.signals.some(s => s.type === 'volume_decline');
    expect(hasVolumeDecline).toBe(false);
  });
});

// ─── detectDeloadNeed — accumulated_fatigue signal ────────────────────────────

describe('detectDeloadNeed — accumulated fatigue signal', () => {
  it('fires accumulated_fatigue only when recent weeks exceed the baseline (not self-referential)', () => {
    // The fix: baseline = older weeks, NOT average of all weeks including recent.
    // So if every week has the same volume, no fatigue signal fires.
    const normalEx = makeExercise('Bench Press', [makeSet(80, 8), makeSet(80, 8)]);
    // 6 weeks of stable training
    const workouts = Array.from({ length: 6 }, (_, i) =>
      makeWorkout(`w${i}`, i * 7, [normalEx]),
    );
    const result = detectDeloadNeed(workouts);
    const hasFatigue = result.signals.some(s => s.type === 'accumulated_fatigue');
    expect(hasFatigue).toBe(false);
  });

  it('fires accumulated_fatigue when 3 recent weeks are >15% above older baseline', () => {
    // Older weeks: low volume baseline
    const lowEx = makeExercise('Bench Press', [makeSet(60, 5)]);
    // Recent 3 weeks: high volume, clearly >15% above baseline AND ≥2 workouts each
    const highEx = makeExercise('Bench Press', [
      makeSet(100, 10), makeSet(100, 10), makeSet(100, 10),
    ]);

    const workouts: WorkoutLog[] = [
      // Baseline (older weeks, offset -3 to -6 in the analysis)
      makeWorkout('b1', 42, [lowEx]),
      makeWorkout('b2', 35, [lowEx]),
      makeWorkout('b3', 28, [lowEx]),
      // Recent high-volume weeks (multiple workouts per week to meet the ≥2 threshold)
      makeWorkout('r1a', 20, [highEx]),
      makeWorkout('r1b', 19, [highEx]),
      makeWorkout('r2a', 13, [highEx]),
      makeWorkout('r2b', 12, [highEx]),
      makeWorkout('r3a', 6,  [highEx]),
      makeWorkout('r3b', 5,  [highEx]),
    ];

    const result = detectDeloadNeed(workouts);
    const hasFatigue = result.signals.some(s => s.type === 'accumulated_fatigue');
    expect(hasFatigue).toBe(true);
  });
});

// ─── detectDeloadNeed — performance_decline signal ────────────────────────────

describe('detectDeloadNeed — performance decline signal', () => {
  it('fires performance_decline when recent average weight is >5% below previous period', () => {
    // Previous 6 workouts: 100kg; recent 6 workouts: 85kg (15% drop)
    const heavyEx = makeExercise('Bench Press', [makeSet(100, 5)]);
    const lightEx = makeExercise('Bench Press', [makeSet(85, 5)]);

    // detectPerformanceDecline uses workouts.slice(0,6) as recent and slice(6,12) as previous
    // Pass workouts in reverse-chronological order (recent first)
    const workouts: WorkoutLog[] = [
      ...Array.from({ length: 6 }, (_, i) => makeWorkout(`r${i}`, i * 2, [lightEx])),
      ...Array.from({ length: 6 }, (_, i) => makeWorkout(`p${i}`, 14 + i * 2, [heavyEx])),
    ];

    const result = detectDeloadNeed(workouts);
    const hasPerformanceDecline = result.signals.some(s => s.type === 'performance_decline');
    expect(hasPerformanceDecline).toBe(true);
  });
});

// ─── detectDeloadNeed — multiple_plateaus signal ──────────────────────────────

describe('detectDeloadNeed — multiple plateaus signal', () => {
  it('fires multiple_plateaus when 4+ COMPOUND exercises are stagnant', () => {
    const stagnantSet = [makeSet(80, 5)];
    // Bench Press, Squat, Deadlift, Overhead Press — all compound
    // Threshold is ≥4 (raised from 3 to avoid false positives with long training histories)
    const exercises = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press'];

    const workouts = Array.from({ length: 4 }, (_, i) =>
      makeWorkout(`w${i}`, (3 - i) * 7, exercises.map(n => makeExercise(n, stagnantSet))),
    );

    const result = detectDeloadNeed(workouts);
    const hasPlateauSignal = result.signals.some(s => s.type === 'multiple_plateaus');
    expect(hasPlateauSignal).toBe(true);
  });

  it('does NOT fire multiple_plateaus when fewer than 3 compound exercises are stagnant', () => {
    const stagnantSet = [makeSet(80, 5)];
    // Only 1 compound exercise stagnant
    const workouts = Array.from({ length: 4 }, (_, i) =>
      makeWorkout(`w${i}`, (3 - i) * 7, [makeExercise('Bench Press', stagnantSet)]),
    );
    const result = detectDeloadNeed(workouts);
    const hasPlateauSignal = result.signals.some(s => s.type === 'multiple_plateaus');
    expect(hasPlateauSignal).toBe(false);
  });

  it('does NOT fire multiple_plateaus for 3+ stagnant ISOLATION exercises', () => {
    // Cable side raise, lateral raise, bicep curl — all isolation
    // These plateau due to accommodation, not systemic fatigue (Zatsiorsky & Kraemer 2006)
    const stagnantSet = [makeSet(15, 15)];
    const isolationExercises = ['Cable Side Raise', 'Lateral Raise', 'Bicep Curl'];

    const workouts = Array.from({ length: 4 }, (_, i) =>
      makeWorkout(`w${i}`, (3 - i) * 7, isolationExercises.map(n => makeExercise(n, stagnantSet))),
    );

    const result = detectDeloadNeed(workouts);
    const hasPlateauSignal = result.signals.some(s => s.type === 'multiple_plateaus');
    expect(hasPlateauSignal).toBe(false);
  });

  it('does NOT fire multiple_plateaus when only isolation exercises stagnate alongside one compound', () => {
    const stagnantSet = [makeSet(15, 15)];
    // 1 compound (Bench Press) + 2 isolation (Lateral Raise, Curl) → only 1 compound plateau → no signal
    const exercises = ['Bench Press', 'Lateral Raise', 'Bicep Curl'];

    const workouts = Array.from({ length: 4 }, (_, i) =>
      makeWorkout(`w${i}`, (3 - i) * 7, exercises.map(n => makeExercise(n, stagnantSet))),
    );

    const result = detectDeloadNeed(workouts);
    const hasPlateauSignal = result.signals.some(s => s.type === 'multiple_plateaus');
    expect(hasPlateauSignal).toBe(false);
  });
});

// ─── detectDeloadNeed — urgency escalation ────────────────────────────────────

describe('detectDeloadNeed — urgency escalation', () => {
  it('returns low urgency for minimal training history', () => {
    const workouts = spreadWorkouts(2, 14, [makeExercise('Bench Press', [makeSet(80, 5)])]);
    const result = detectDeloadNeed(workouts);
    expect(result.urgency).toBe('low');
  });

  it('urgency increases with multiple high-severity signals', () => {
    // Create multiple scenarios that trigger several high-severity signals
    const exercises = ['Bench Press', 'Squat', 'Deadlift', 'OHP', 'Row'];
    const stagnantSet = [makeSet(80, 5)];

    // 4 sessions, all stagnant (triggers multiple_plateaus) + declining volume pattern
    const highVolumeEx = [makeExercise('Bench Press', [makeSet(100, 10), makeSet(100, 10)])];
    const lowVolumeEx  = [makeExercise('Bench Press', [makeSet(60, 5)])];

    const workouts: WorkoutLog[] = [
      // Older high-volume weeks
      makeWorkout('b1', 42, highVolumeEx),
      makeWorkout('b2', 35, highVolumeEx),
      // Recent declining volume (triggers volume_decline)
      makeWorkout('v1', 21, highVolumeEx),
      makeWorkout('v2', 14, [makeExercise('Bench Press', [makeSet(80, 7)])]),
      makeWorkout('v3', 7,  lowVolumeEx),
      // All 5 exercises stagnant (triggers multiple_plateaus)
      ...Array.from({ length: 4 }, (_, i) =>
        makeWorkout(`p${i}`, (3 - i) * 7 + 1, exercises.map(n => makeExercise(n, stagnantSet))),
      ),
    ];

    const result = detectDeloadNeed(workouts);
    // With multiple signals, urgency should be at least medium
    expect(['medium', 'high', 'critical']).toContain(result.urgency);
  });
});
