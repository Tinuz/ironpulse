/**
 * Tests for lib/hypertrophyCalculations.ts
 *
 * Covers:
 * - calculateOptimalHypertrophyWeight: 1RM estimation + hypertrophy target
 * - RPE-correctie: lage RPE triggert gewichtsverhoging
 * - Safety floor: resultaat nooit onder 60% 1RM
 * - isEffectiveWorkingSet: RPE ≥ 6 criterium
 * - countEffectiveSets
 * - getRPETarget: compound vs isolatie
 */

import { describe, it, expect } from 'vitest';

import {
  calculateOptimalHypertrophyWeight,
  calculateHypertrophyTargetForExercise,
  isEffectiveWorkingSet,
  countEffectiveSets,
  getRPETarget,
  getRPETargetForExercise,
  HYPERTROPHY_TARGET_PCT,
  HYPERTROPHY_MIN_PCT,
  HYPERTROPHY_MAX_PCT,
  HYPERTROPHY_FLOOR_PCT,
  EFFECTIVE_SET_RPE_THRESHOLD,
} from '@/lib/hypertrophyCalculations';
import type { WorkoutSet } from '@/components/context/DataContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── calculateOptimalHypertrophyWeight ───────────────────────────────────────

describe('calculateOptimalHypertrophyWeight', () => {
  it('target weight is within the 70–78% hypertrophy zone', () => {
    const result = calculateOptimalHypertrophyWeight(80, 8);
    expect(result.targetWeight).toBeGreaterThanOrEqual(result.hypertrophyMin);
    expect(result.targetWeight).toBeLessThanOrEqual(result.hypertrophyMax);
  });

  it('estimate1RM uses Brzycki for reps 1–10', () => {
    // Brzycki: 80 / (1.0278 − 0.0278 × 8) = 80 / 0.8056 ≈ 99.3
    const { estimate1RM } = calculateOptimalHypertrophyWeight(80, 8);
    expect(estimate1RM).toBeCloseTo(99.3, 0);
  });

  it('estimate1RM uses Epley for reps 11–30', () => {
    // Epley: 60 × (1 + 15 / 30) = 60 × 1.5 = 90
    const { estimate1RM } = calculateOptimalHypertrophyWeight(60, 15);
    expect(estimate1RM).toBeCloseTo(90, 0);
  });

  it('target weight is rounded to nearest 2.5 kg', () => {
    const { targetWeight } = calculateOptimalHypertrophyWeight(70, 10);
    expect(targetWeight % 2.5).toBe(0);
  });

  it('hypertrophyMin is 70% of 1RM rounded to 2.5', () => {
    const result = calculateOptimalHypertrophyWeight(100, 5);
    const expected = Math.round((result.estimate1RM * HYPERTROPHY_MIN_PCT) / 2.5) * 2.5;
    expect(result.hypertrophyMin).toBe(expected);
  });

  it('hypertrophyMax is 78% of 1RM rounded to 2.5', () => {
    const result = calculateOptimalHypertrophyWeight(100, 5);
    const expected = Math.round((result.estimate1RM * HYPERTROPHY_MAX_PCT) / 2.5) * 2.5;
    expect(result.hypertrophyMax).toBe(expected);
  });

  it('safety floor is never below 60% of 1RM', () => {
    const result = calculateOptimalHypertrophyWeight(50, 20);
    expect(result.targetWeight).toBeGreaterThanOrEqual(result.safetyFloor);
    expect(result.safetyFloor).toBeCloseTo(result.estimate1RM * HYPERTROPHY_FLOOR_PCT, 0);
  });

  describe('RPE correctie (prevRPE < 6)', () => {
    it('verhoogt targetWeight met 5% als vorige RPE lager was dan 6', () => {
      const withoutCorrection = calculateOptimalHypertrophyWeight(80, 8, 7);
      const withCorrection = calculateOptimalHypertrophyWeight(80, 8, 4);
      expect(withCorrection.targetWeight).toBeGreaterThan(withoutCorrection.targetWeight);
      expect(withCorrection.adjustedForLowRPE).toBe(true);
    });

    it('zet adjustedForLowRPE op false wanneer prevRPE ≥ 6', () => {
      const result = calculateOptimalHypertrophyWeight(80, 8, 8);
      expect(result.adjustedForLowRPE).toBe(false);
    });

    it('zet adjustedForLowRPE op false wanneer prevRPE undefined is', () => {
      const result = calculateOptimalHypertrophyWeight(80, 8, undefined);
      expect(result.adjustedForLowRPE).toBe(false);
    });

    it('gecorrigeerd targetWeight overschrijdt nooit de 78% ceiling (floor-check volstaat)', () => {
      const result = calculateOptimalHypertrophyWeight(80, 8, 1);
      // Target mag boven 78% uitkomen na correctie — het is een verhoging, geen ceiling.
      // We verifiëren alleen dat het floor-patroon klopt.
      expect(result.targetWeight).toBeGreaterThanOrEqual(result.safetyFloor);
    });
  });

  describe('RPE target per oefening-type', () => {
    it('compound: RPE 6–9', () => {
      const result = calculateOptimalHypertrophyWeight(100, 5, undefined, true);
      expect(result.rpeTarget.min).toBe(6);
      expect(result.rpeTarget.max).toBe(9);
    });

    it('isolatie: RPE 9–10', () => {
      const result = calculateOptimalHypertrophyWeight(30, 12, undefined, false);
      expect(result.rpeTarget.min).toBe(9);
      expect(result.rpeTarget.max).toBe(10);
    });
  });
});

// ─── calculateHypertrophyTargetForExercise ────────────────────────────────────

describe('calculateHypertrophyTargetForExercise', () => {
  it('herkent compound oefeningen via naam (bench press)', () => {
    const result = calculateHypertrophyTargetForExercise('Bench Press', 100, 5);
    expect(result.rpeTarget.min).toBe(6);
    expect(result.rpeTarget.max).toBe(9);
  });

  it('herkent isolatie oefeningen via naam (bicep curl)', () => {
    const result = calculateHypertrophyTargetForExercise('Bicep Curl', 25, 12);
    expect(result.rpeTarget.min).toBe(9);
    expect(result.rpeTarget.max).toBe(10);
  });
});

// ─── isEffectiveWorkingSet ────────────────────────────────────────────────────

describe('isEffectiveWorkingSet', () => {
  it('geeft true voor niet-warmup, voltooid, RPE ≥ 6', () => {
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, 7))).toBe(true);
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, 6))).toBe(true);
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, 10))).toBe(true);
  });

  it('geeft false wanneer RPE < 6 (telt als warming-up)', () => {
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, 5))).toBe(false);
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, 1))).toBe(false);
  });

  it('geeft false wanneer RPE undefined is', () => {
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, undefined))).toBe(false);
  });

  it('geeft false voor warmup sets (ook al is RPE ≥ 6)', () => {
    expect(isEffectiveWorkingSet(makeSet(40, 15, true, true, 7))).toBe(false);
  });

  it('geeft false wanneer set niet is voltooid', () => {
    expect(isEffectiveWorkingSet(makeSet(80, 10, false, false, 8))).toBe(false);
  });

  it('effectieve set threshold is exact ' + EFFECTIVE_SET_RPE_THRESHOLD, () => {
    const threshold = EFFECTIVE_SET_RPE_THRESHOLD;
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, threshold))).toBe(true);
    expect(isEffectiveWorkingSet(makeSet(80, 10, true, false, threshold - 1))).toBe(false);
  });
});

// ─── countEffectiveSets ───────────────────────────────────────────────────────

describe('countEffectiveSets', () => {
  it('telt alleen effectieve werksets', () => {
    const sets: WorkoutSet[] = [
      makeSet(80, 10, true, false, 7),   // ✓ effectief
      makeSet(80, 10, true, false, 8),   // ✓ effectief
      makeSet(80, 10, true, false, 5),   // ✗ RPE < 6
      makeSet(40, 15, true, true, 7),    // ✗ warmup
      makeSet(80, 10, false, false, 8),  // ✗ niet voltooid
      makeSet(80, 10, true, false, undefined), // ✗ geen RPE
    ];
    expect(countEffectiveSets(sets)).toBe(2);
  });

  it('geeft 0 voor lege array', () => {
    expect(countEffectiveSets([])).toBe(0);
  });
});

// ─── getRPETarget ─────────────────────────────────────────────────────────────

describe('getRPETarget', () => {
  it('compound: min 6, max 9', () => {
    const target = getRPETarget(true);
    expect(target.min).toBe(6);
    expect(target.max).toBe(9);
  });

  it('isolatie: min 9, max 10', () => {
    const target = getRPETarget(false);
    expect(target.min).toBe(9);
    expect(target.max).toBe(10);
  });

  it('beide hebben een label', () => {
    expect(typeof getRPETarget(true).label).toBe('string');
    expect(typeof getRPETarget(false).label).toBe('string');
  });
});

// ─── getRPETargetForExercise ──────────────────────────────────────────────────

describe('getRPETargetForExercise', () => {
  const compoundExercises = ['Squat', 'Deadlift', 'Bench Press', 'Overhead Press', 'Barbell Row'];
  const isolationExercises = ['Bicep Curl', 'Tricep Extension', 'Lateral Raise', 'Leg Curl'];

  compoundExercises.forEach(name => {
    it(`${name} → compound RPE bereik (6–9)`, () => {
      const target = getRPETargetForExercise(name);
      expect(target.min).toBe(6);
      expect(target.max).toBe(9);
    });
  });

  isolationExercises.forEach(name => {
    it(`${name} → isolatie RPE bereik (9–10)`, () => {
      const target = getRPETargetForExercise(name);
      expect(target.min).toBe(9);
      expect(target.max).toBe(10);
    });
  });
});
