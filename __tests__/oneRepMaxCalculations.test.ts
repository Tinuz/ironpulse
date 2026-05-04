import { describe, it, expect } from 'vitest';

import {
  generateSetsFromOneRM,
  calculateWarmupWeight,
  calculateWorkingWeight,
  roundWeight,
  validateOneRM,
} from '@/components/utils/oneRepMaxCalculations';

// ─── validateOneRM ────────────────────────────────────────────────────────────

describe('validateOneRM', () => {
  it('accepts values in the valid range', () => {
    expect(validateOneRM(5)).toBe(true);
    expect(validateOneRM(100)).toBe(true);
    expect(validateOneRM(500)).toBe(true);
  });

  it('rejects values below 5 kg', () => {
    expect(validateOneRM(0)).toBe(false);
    expect(validateOneRM(4.9)).toBe(false);
    expect(validateOneRM(-10)).toBe(false);
  });

  it('rejects values above 500 kg', () => {
    expect(validateOneRM(500.1)).toBe(false);
    expect(validateOneRM(999)).toBe(false);
  });
});

// ─── roundWeight ─────────────────────────────────────────────────────────────

describe('roundWeight', () => {
  it('rounds weights under 10 kg to 0.5 kg increments', () => {
    expect(roundWeight(7.3)).toBe(7.5);
    expect(roundWeight(7.1)).toBe(7);
    expect(roundWeight(9.9)).toBe(10);
  });

  it('rounds weights between 10–50 kg to whole kg', () => {
    expect(roundWeight(22.4)).toBe(22);
    expect(roundWeight(22.6)).toBe(23);
    expect(roundWeight(49.5)).toBe(50);
  });

  it('rounds weights between 50–100 kg to 2.5 kg increments', () => {
    expect(roundWeight(75)).toBe(75);
    expect(roundWeight(76)).toBe(75);
    expect(roundWeight(76.26)).toBe(77.5);
  });

  it('rounds weights above 100 kg to 5 kg increments', () => {
    expect(roundWeight(100)).toBe(100);
    expect(roundWeight(102)).toBe(100);
    expect(roundWeight(103)).toBe(105);
  });
});

// ─── calculateWarmupWeight / calculateWorkingWeight ──────────────────────────

describe('calculateWarmupWeight', () => {
  it('returns 50% of 1RM rounded appropriately', () => {
    // 100kg 1RM → warmup = 50kg (rounded to nearest 1 since 50 ≤ 50)
    expect(calculateWarmupWeight(100)).toBe(50);
  });

  it('is always less than the working weight', () => {
    expect(calculateWarmupWeight(120)).toBeLessThan(calculateWorkingWeight(120));
  });
});

describe('calculateWorkingWeight', () => {
  it('returns 75% of 1RM rounded appropriately', () => {
    // 100kg 1RM → working = 75kg
    expect(calculateWorkingWeight(100)).toBe(75);
  });
});

// ─── generateSetsFromOneRM ───────────────────────────────────────────────────

describe('generateSetsFromOneRM', () => {
  it('generates 5 sets total (1 warmup + 4 work sets)', () => {
    const sets = generateSetsFromOneRM(100);
    expect(sets).toHaveLength(5);
  });

  it('first set is a warmup', () => {
    const sets = generateSetsFromOneRM(100);
    expect(sets[0].isWarmup).toBe(true);
  });

  it('remaining sets are not warmups', () => {
    const sets = generateSetsFromOneRM(100);
    const workSets = sets.slice(1);
    workSets.forEach(s => expect(s.isWarmup).toBe(false));
  });

  it('warmup weight is approximately 50% of 1RM', () => {
    const sets = generateSetsFromOneRM(100);
    expect(sets[0].weight).toBeCloseTo(50, 0);
  });

  it('work set weight is approximately 75% of 1RM', () => {
    const sets = generateSetsFromOneRM(100);
    const workSets = sets.slice(1);
    workSets.forEach(s => expect(s.weight).toBeCloseTo(75, 0));
  });

  it('set numbers are sequential starting at 1', () => {
    const sets = generateSetsFromOneRM(100);
    sets.forEach((s, i) => expect(s.setNumber).toBe(i + 1));
  });
});
