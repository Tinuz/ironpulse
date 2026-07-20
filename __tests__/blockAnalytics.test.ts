/**
 * Tests for lib/blockAnalytics.ts
 *
 * Covers:
 *  - getBlockWeekTargets: correct set counts per block length and week
 *  - getCurrentBlockWeek: date math, clamping
 *  - isDeloadWeek: last week detection
 *  - getBlockWeekLabel: display strings
 *  - getBlockProgress: actual vs target, set counting, date windowing
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/context/DataContext', () => ({}));
vi.mock('@/components/utils/volumeAnalytics', () => ({
  getMuscleGroup: (name: string, muscleGroupField?: string) => {
    if (muscleGroupField) return muscleGroupField;
    if (name.toLowerCase().includes('bench')) return 'chest';
    if (name.toLowerCase().includes('squat')) return 'legs';
    if (name.toLowerCase().includes('row')) return 'back';
    return null;
  },
}));

import {
  getBlockWeekTargets,
  getCurrentBlockWeek,
  isDeloadWeek,
  getBlockWeekLabel,
  getBlockProgress,
  getCurrentCycle,
  getCurrentPhase,
  getBlockPhaseLabel,
  isFailurePermitted,
  BLOCK_START_SETS,
  SETS_PER_BUILD_WEEK,
} from '@/lib/blockAnalytics';
import type { TrainingBlock, WorkoutLog, WorkoutExercise, WorkoutSet } from '@/components/context/DataContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBlock(overrides: Partial<TrainingBlock> = {}): TrainingBlock {
  const daysAgo0 = new Date();
  return {
    id: 'block-1',
    name: 'Test Blok',
    startDate: daysAgo0.toISOString().split('T')[0],
    durationWeeks: 5,
    focusMuscles: ['chest', 'back'],
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function dateAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function makeWorkout(
  daysAgo: number,
  exercises: WorkoutExercise[],
  isDeloadOrSchemaId: boolean | string = false,
): WorkoutLog {
  const isDeload = typeof isDeloadOrSchemaId === 'boolean' ? isDeloadOrSchemaId : false;
  const schemaId = typeof isDeloadOrSchemaId === 'string' ? isDeloadOrSchemaId : null;
  return {
    id: `w-${daysAgo}`,
    schemaId,
    name: 'Test',
    date: dateAgo(daysAgo),
    startTime: Date.now(),
    endTime: null,
    exercises,
    isDeload,
  };
}

function makeSet(completed = true, isWarmup = false): WorkoutSet {
  return { id: crypto.randomUUID(), weight: 80, reps: 10, completed, isWarmup };
}

function makeExercise(name: string, sets: WorkoutSet[], muscleGroup?: string): WorkoutExercise {
  return { id: 'ex-1', exerciseId: 'e1', name, sets, muscleGroup } as WorkoutExercise;
}

// ─── getBlockWeekTargets ──────────────────────────────────────────────────────

describe('getBlockWeekTargets', () => {
  it('week 1 equals MEV for each muscle', () => {
    expect(getBlockWeekTargets('chest', 5, 1)).toBe(BLOCK_START_SETS.chest);
    expect(getBlockWeekTargets('back', 5, 1)).toBe(BLOCK_START_SETS.back);
    expect(getBlockWeekTargets('legs', 4, 1)).toBe(BLOCK_START_SETS.legs);
  });

  it('increments by SETS_PER_BUILD_WEEK each build week', () => {
    const mev = BLOCK_START_SETS.chest; // 8
    expect(getBlockWeekTargets('chest', 5, 1)).toBe(mev);
    expect(getBlockWeekTargets('chest', 5, 2)).toBe(mev + SETS_PER_BUILD_WEEK);
    expect(getBlockWeekTargets('chest', 5, 3)).toBe(mev + SETS_PER_BUILD_WEEK * 2);
    expect(getBlockWeekTargets('chest', 5, 4)).toBe(mev + SETS_PER_BUILD_WEEK * 3);
  });

  it('last week is deload (~50% of previous week)', () => {
    // 5-week block, chest: W4 = 8 + 9 = 17, W5 = round(17*0.5) = 9 (rounded? Actually 8.5 → 9)
    const mev = BLOCK_START_SETS.chest; // 8
    const lastBuildSets = mev + (5 - 2) * SETS_PER_BUILD_WEEK; // 8 + 3*3 = 17
    const expectedDeload = Math.round(lastBuildSets * 0.5); // 9 (rounded from 8.5)
    expect(getBlockWeekTargets('chest', 5, 5)).toBe(expectedDeload);
  });

  it('4-week block deload equals round(50% of week 3)', () => {
    const mev = BLOCK_START_SETS.back; // 10
    const lastBuildSets = mev + (4 - 2) * SETS_PER_BUILD_WEEK; // 10 + 6 = 16
    const expected = Math.round(lastBuildSets * 0.5); // 8
    expect(getBlockWeekTargets('back', 4, 4)).toBe(expected);
  });

  it('6-week block last build week before deload', () => {
    const mev = BLOCK_START_SETS.shoulders; // 8
    // W5 = 8 + 4 * 3 = 20
    expect(getBlockWeekTargets('shoulders', 6, 5)).toBe(mev + 4 * SETS_PER_BUILD_WEEK);
    // W6 deload = round(20 * 0.5) = 10
    expect(getBlockWeekTargets('shoulders', 6, 6)).toBe(10);
  });

  it('clamps out-of-range weeks to valid range', () => {
    // week 0 → treated as week 1
    expect(getBlockWeekTargets('chest', 5, 0)).toBe(BLOCK_START_SETS.chest);
    // week > durationWeeks → treated as last week (deload)
    const deload = getBlockWeekTargets('chest', 5, 5);
    expect(getBlockWeekTargets('chest', 5, 99)).toBe(deload);
  });
});

// ─── getCurrentBlockWeek ──────────────────────────────────────────────────────

describe('getCurrentBlockWeek', () => {
  it('returns 1 on day 0 (start date)', () => {
    const block = makeBlock();
    expect(getCurrentBlockWeek(block)).toBe(1);
  });

  it('returns 1 during first 7 days', () => {
    const start = new Date();
    start.setDate(start.getDate() - 6); // 6 days ago = still week 1
    const block = makeBlock({ startDate: start.toISOString().split('T')[0] });
    expect(getCurrentBlockWeek(block)).toBe(1);
  });

  it('returns 2 on day 7', () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const block = makeBlock({ startDate: start.toISOString().split('T')[0] });
    expect(getCurrentBlockWeek(block)).toBe(2);
  });

  it('returns durationWeeks on the final week', () => {
    const start = new Date();
    start.setDate(start.getDate() - 28); // 4 weeks ago → week 5 of 5
    const block = makeBlock({ startDate: start.toISOString().split('T')[0], durationWeeks: 5 });
    expect(getCurrentBlockWeek(block)).toBe(5);
  });

  it('clamps to durationWeeks when past end', () => {
    const start = new Date();
    start.setDate(start.getDate() - 100);
    const block = makeBlock({ startDate: start.toISOString().split('T')[0], durationWeeks: 5 });
    expect(getCurrentBlockWeek(block)).toBe(5);
  });

  it('accepts a `today` override', () => {
    const startDate = '2024-01-01';
    const block = makeBlock({ startDate, durationWeeks: 5 });
    const today = new Date('2024-01-15'); // 14 days later = week 3
    expect(getCurrentBlockWeek(block, today)).toBe(3);
  });
});

// ─── isDeloadWeek ─────────────────────────────────────────────────────────────

describe('isDeloadWeek', () => {
  it('returns false in week 1', () => {
    const block = makeBlock();
    expect(isDeloadWeek(block)).toBe(false);
  });

  it('returns true in the final week', () => {
    const start = new Date();
    start.setDate(start.getDate() - 28); // week 5 of 5
    const block = makeBlock({ startDate: start.toISOString().split('T')[0], durationWeeks: 5 });
    expect(isDeloadWeek(block)).toBe(true);
  });

  it('respects today override', () => {
    const block = makeBlock({ startDate: '2024-01-01', durationWeeks: 4 });
    // Day 21 = week 4 (deload)
    expect(isDeloadWeek(block, new Date('2024-01-22'))).toBe(true);
    // Day 14 = week 3 (build)
    expect(isDeloadWeek(block, new Date('2024-01-15'))).toBe(false);
  });
});

// ─── getBlockWeekLabel ────────────────────────────────────────────────────────

describe('getBlockWeekLabel', () => {
  it('returns "Week 1 van 5" in first week', () => {
    const block = makeBlock({ durationWeeks: 5 });
    expect(getBlockWeekLabel(block)).toBe('Week 1 van 5');
  });

  it('returns "Deload week" in the final week', () => {
    const start = new Date();
    start.setDate(start.getDate() - 28);
    const block = makeBlock({ startDate: start.toISOString().split('T')[0], durationWeeks: 5 });
    expect(getBlockWeekLabel(block)).toBe('Deload week');
  });

  it('returns "Week 3 van 6" using today override', () => {
    const block = makeBlock({ startDate: '2024-01-01', durationWeeks: 6 });
    expect(getBlockWeekLabel(block, new Date('2024-01-15'))).toBe('Week 3 van 6');
  });
});

// ─── getBlockProgress ─────────────────────────────────────────────────────────

describe('getBlockProgress', () => {
  it('returns 0 actual sets when history is empty', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const result = getBlockProgress(block, [], new Date());
    expect(result.muscles[0].actualSets).toBe(0);
    expect(result.muscles[0].pct).toBe(0);
  });

  it('counts completed non-warmup sets for focus muscles', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const workout = makeWorkout(0, [
      makeExercise('Bench Press', [
        makeSet(true, false),  // completed working set
        makeSet(true, false),  // completed working set
        makeSet(true, true),   // warmup — excluded
        makeSet(false, false), // not completed — excluded
      ]),
    ]);
    const result = getBlockProgress(block, [workout]);
    expect(result.muscles[0].actualSets).toBe(2);
  });

  it('excludes sets from deload workouts', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const deloadWorkout = makeWorkout(0, [
      makeExercise('Bench Press', [makeSet(true, false), makeSet(true, false)]),
    ], true); // isDeload = true
    const result = getBlockProgress(block, [deloadWorkout]);
    expect(result.muscles[0].actualSets).toBe(0);
  });

  it('excludes workouts from previous weeks', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const lastWeekWorkout = makeWorkout(8, [ // 8 days ago = last week
      makeExercise('Bench Press', [makeSet(true, false), makeSet(true, false)]),
    ]);
    const result = getBlockProgress(block, [lastWeekWorkout]);
    expect(result.muscles[0].actualSets).toBe(0);
  });

  it('only counts sets for focus muscles', () => {
    const block = makeBlock({ focusMuscles: ['chest'] }); // only chest
    const workout = makeWorkout(0, [
      makeExercise('Bench Press', [makeSet(), makeSet()], 'chest'), // focus
      makeExercise('Squat', [makeSet(), makeSet(), makeSet()], 'legs'), // not focus
    ]);
    const result = getBlockProgress(block, [workout]);
    expect(result.muscles).toHaveLength(1);
    expect(result.muscles[0].muscle).toBe('chest');
    expect(result.muscles[0].actualSets).toBe(2);
  });

  it('computes pct correctly', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const targetSets = getBlockWeekTargets('chest', block.durationWeeks, 1);
    const halfSets = Math.floor(targetSets / 2);
    const sets = Array.from({ length: halfSets }, () => makeSet());
    const workout = makeWorkout(0, [makeExercise('Bench Press', sets, 'chest')]);
    const result = getBlockProgress(block, [workout]);
    expect(result.muscles[0].pct).toBeCloseTo(halfSets / targetSets, 2);
  });

  it('caps pct at 1 when exceeding target', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const manySets = Array.from({ length: 30 }, () => makeSet());
    const workout = makeWorkout(0, [makeExercise('Bench Press', manySets, 'chest')]);
    const result = getBlockProgress(block, [workout]);
    expect(result.muscles[0].pct).toBe(1);
  });

  it('reports correct weekNumber and isDeload', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const result = getBlockProgress(block, [], new Date());
    expect(result.weekNumber).toBe(1);
    expect(result.isDeload).toBe(false);
    expect(result.weeksRemaining).toBe(block.durationWeeks - 1);
  });

  // ── maintenance muscles ───────────────────────────────────────────────────

  it('includes all non-focus muscles in maintenanceMuscles', () => {
    const block = makeBlock({ focusMuscles: ['chest', 'back'] });
    const result = getBlockProgress(block, []);
    const mainMuscles = result.maintenanceMuscles.map(m => m.muscle);
    expect(mainMuscles).not.toContain('chest');
    expect(mainMuscles).not.toContain('back');
    expect(mainMuscles).toContain('shoulders');
    expect(mainMuscles).toContain('legs');
    expect(mainMuscles).toHaveLength(6); // 8 total - 2 focus
  });

  it('status is "under" when no sets done for maintenance muscle', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const result = getBlockProgress(block, []);
    result.maintenanceMuscles.forEach(m => {
      expect(m.status).toBe('under');
      expect(m.actualSets).toBe(0);
    });
  });

  it('status is "ok" when maintenance muscle is at MEV', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const mev = BLOCK_START_SETS.back; // 10
    const sets = Array.from({ length: mev }, () => makeSet());
    const workout = makeWorkout(0, [makeExercise('Barbell Row', sets, 'back')]);
    const result = getBlockProgress(block, [workout]);
    const back = result.maintenanceMuscles.find(m => m.muscle === 'back')!;
    expect(back.status).toBe('ok');
    expect(back.actualSets).toBe(mev);
  });

  it('status is "over" when maintenance muscle exceeds MEV + SETS_PER_BUILD_WEEK', () => {
    const block = makeBlock({ focusMuscles: ['chest'] });
    const tooMany = BLOCK_START_SETS.back + SETS_PER_BUILD_WEEK + 1; // > MEV + 3
    const sets = Array.from({ length: tooMany }, () => makeSet());
    const workout = makeWorkout(0, [makeExercise('Barbell Row', sets, 'back')]);
    const result = getBlockProgress(block, [workout]);
    const back = result.maintenanceMuscles.find(m => m.muscle === 'back')!;
    expect(back.status).toBe('over');
  });

  it('uses halved MEV target for maintenance muscles during deload week', () => {
    const start = new Date();
    start.setDate(start.getDate() - 28); // week 5 = deload
    const block = makeBlock({ startDate: start.toISOString().split('T')[0], durationWeeks: 5, focusMuscles: ['chest'] });
    const result = getBlockProgress(block, []);
    const back = result.maintenanceMuscles.find(m => m.muscle === 'back')!;
    const expectedTarget = Math.max(1, Math.round(BLOCK_START_SETS.back * 0.5));
    expect(back.mevTarget).toBe(expectedTarget);
  });
});

// ─── getCurrentCycle ──────────────────────────────────────────────────────────

describe('getCurrentCycle', () => {
  it('returns 1 when no workouts logged yet (schemaRotation)', () => {
    const block = makeBlock({
      totalCycles: 7,
      schemaRotation: ['schema-upper-a'],
    });
    expect(getCurrentCycle(block, [])).toBe(1);
  });

  it('counts occurrences of first schema as cycle number', () => {
    const schemaId = 'schema-upper-a';
    const block = makeBlock({
      totalCycles: 7,
      schemaRotation: [schemaId, 'schema-lower-a', 'schema-upper-b', 'schema-lower-b'],
      startDate: dateAgo(30).split('T')[0], // block started 30 days ago so workouts fit within
    });
    const workouts: WorkoutLog[] = [
      makeWorkout(10, [], schemaId),
      makeWorkout(7,  [], 'schema-lower-a'),
      makeWorkout(4,  [], 'schema-upper-b'),
      makeWorkout(1,  [], schemaId),   // second Upper A = cycle 2
    ];
    // Two Upper A sessions → cycle 2
    expect(getCurrentCycle(block, workouts)).toBe(2);
  });

  it('clamps to totalCycles when more sessions exist than cycles', () => {
    const schemaId = 'schema-upper-a';
    const block = makeBlock({
      totalCycles: 3,
      schemaRotation: [schemaId],
      startDate: dateAgo(30).split('T')[0],
    });
    const workouts: WorkoutLog[] = [
      makeWorkout(20, [], schemaId),
      makeWorkout(15, [], schemaId),
      makeWorkout(10, [], schemaId),
      makeWorkout(5,  [], schemaId), // 4 sessions but max 3 cycles
    ];
    expect(getCurrentCycle(block, workouts)).toBe(3);
  });

  it('falls back to calendar estimate when no schemaRotation', () => {
    // 12 days in → floor(12 / 6) + 1 = 3
    const start = new Date();
    start.setDate(start.getDate() - 12);
    const block = makeBlock({
      totalCycles: 7,
      startDate: start.toISOString().split('T')[0],
      // No schemaRotation
    });
    expect(getCurrentCycle(block, [])).toBe(3);
  });

  it('calendar fallback clamps to 1 on day 0', () => {
    const block = makeBlock({ totalCycles: 7 });
    // startDate is today, so daysDiff = 0 → floor(0 / 6) + 1 = 1
    expect(getCurrentCycle(block, [])).toBe(1);
  });
});

// ─── getCurrentPhase ──────────────────────────────────────────────────────────

const SAMPLE_PHASES = [
  { name: 'Instapfase', emoji: '🌱', cycleStart: 1, cycleEnd: 2, targetRIR: '2', isDeload: false },
  { name: 'Opbouwfase', emoji: '📈', cycleStart: 3, cycleEnd: 4, targetRIR: '1-2', isDeload: false, failurePermittedExercises: ['machine chest press'] },
  { name: 'Piekfase',   emoji: '🔥', cycleStart: 5, cycleEnd: 6, targetRIR: '0-1', isDeload: false, failurePermittedExercises: ['machine chest press', 'pec fly'] },
  { name: 'Deload',     emoji: '😴', cycleStart: 7, cycleEnd: 7, targetRIR: '3-4', isDeload: true },
];

describe('getCurrentPhase', () => {
  it('returns null when block has no phases', () => {
    const block = makeBlock({ totalCycles: 7 });
    expect(getCurrentPhase(block, [])).toBeNull();
  });

  it('returns Instapfase for cycle 1', () => {
    const block = makeBlock({
      totalCycles: 7,
      phases: SAMPLE_PHASES,
      schemaRotation: ['upper-a'],
    });
    // 0 upper-a sessions → cycle 1
    const result = getCurrentPhase(block, [])!;
    expect(result).not.toBeNull();
    expect(result.name).toBe('Instapfase');
  });

  it('returns Opbouwfase for cycle 3', () => {
    const block = makeBlock({
      totalCycles: 7,
      phases: SAMPLE_PHASES,
      schemaRotation: ['upper-a'],
      startDate: dateAgo(30).split('T')[0],
    });
    const workouts: WorkoutLog[] = [
      makeWorkout(14, [], 'upper-a'),
      makeWorkout(7,  [], 'upper-a'),
      makeWorkout(1,  [], 'upper-a'), // 3 upper-a → cycle 3
    ];
    const result = getCurrentPhase(block, workouts)!;
    expect(result.name).toBe('Opbouwfase');
  });

  it('returns Piekfase for cycle 5', () => {
    const block = makeBlock({
      totalCycles: 7,
      phases: SAMPLE_PHASES,
      schemaRotation: ['upper-a'],
      startDate: dateAgo(40).split('T')[0],
    });
    const workouts = Array.from({ length: 5 }, (_, i) =>
      makeWorkout((5 - i) * 5, [], 'upper-a'),
    );
    const result = getCurrentPhase(block, workouts)!;
    expect(result.name).toBe('Piekfase');
  });

  it('returns Deload for cycle 7', () => {
    const block = makeBlock({
      totalCycles: 7,
      phases: SAMPLE_PHASES,
      schemaRotation: ['upper-a'],
      startDate: dateAgo(50).split('T')[0],
    });
    const workouts = Array.from({ length: 7 }, (_, i) =>
      makeWorkout((7 - i) * 5, [], 'upper-a'),
    );
    const result = getCurrentPhase(block, workouts)!;
    expect(result.name).toBe('Deload');
    expect(result.isDeload).toBe(true);
  });
});

// ─── getBlockPhaseLabel ───────────────────────────────────────────────────────

describe('getBlockPhaseLabel', () => {
  it('returns week label for legacy block without phases', () => {
    const block = makeBlock({ durationWeeks: 5 });
    const label = getBlockPhaseLabel(block, []);
    // Uses getBlockWeekLabel internally
    expect(label).toMatch(/week/i);
  });

  it('returns phase label with cycle counter for phase-aware block', () => {
    const block = makeBlock({
      totalCycles: 7,
      phases: SAMPLE_PHASES,
      schemaRotation: ['upper-a'],
      startDate: dateAgo(30).split('T')[0],
    });
    const workouts: WorkoutLog[] = [
      makeWorkout(14, [], 'upper-a'),
      makeWorkout(7,  [], 'upper-a'),
      makeWorkout(1,  [], 'upper-a'), // 3 sessions → cycle 3 → Opbouwfase
    ];
    const label = getBlockPhaseLabel(block, workouts);
    expect(label).toContain('Opbouwfase');
    expect(label).toContain('3/7');
  });
});

// ─── isFailurePermitted ───────────────────────────────────────────────────────

describe('isFailurePermitted', () => {
  const peakPhase = SAMPLE_PHASES[2]; // Piekfase: pec fly, machine chest press

  it('returns false for null phase', () => {
    expect(isFailurePermitted(null, 'Machine Chest Press')).toBe(false);
  });

  it('returns false when no failurePermittedExercises', () => {
    expect(isFailurePermitted(SAMPLE_PHASES[0], 'Machine Chest Press')).toBe(false);
  });

  it('returns true for permitted exercise (case insensitive)', () => {
    expect(isFailurePermitted(peakPhase, 'MACHINE CHEST PRESS')).toBe(true);
  });

  it('returns true for partial name match', () => {
    // "pec fly" substring in "Low Cable Pec Fly"
    expect(isFailurePermitted(peakPhase, 'Low Cable Pec Fly')).toBe(true);
  });

  it('returns false for non-permitted exercise', () => {
    // Dumbbell bench is not in the failure-permitted list for Piekfase
    expect(isFailurePermitted(peakPhase, 'Incline Dumbbell Press')).toBe(false);
  });

  it('returns false for deload phase (empty list)', () => {
    expect(isFailurePermitted(SAMPLE_PHASES[3], 'Machine Chest Press')).toBe(false);
  });
});
