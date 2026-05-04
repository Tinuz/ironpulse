import { describe, it, expect } from 'vitest';

import {
  calculateBurnedCalories,
  calculateTotalWorkoutCalories,
} from '@/components/utils/calorieCalculations';

// ─── calculateBurnedCalories ──────────────────────────────────────────────────

describe('calculateBurnedCalories', () => {
  it('calculates using the MET formula: (MET × 3.5 × weight × duration) / 200', () => {
    const result = calculateBurnedCalories(80, 50, 5);
    const expected = Math.round((5 * 3.5 * 80 * 50) / 200); // 350
    expect(result.kcal).toBe(expected);
  });

  it('uses default MET of 5 when not specified', () => {
    const withDefault = calculateBurnedCalories(80, 50);
    const explicit = calculateBurnedCalories(80, 50, 5);
    expect(withDefault.kcal).toBe(explicit.kcal);
  });

  it('throws for weight below 30 kg', () => {
    expect(() => calculateBurnedCalories(29, 30)).toThrow();
    expect(() => calculateBurnedCalories(0, 30)).toThrow();
  });

  it('throws for non-positive duration', () => {
    expect(() => calculateBurnedCalories(80, 0)).toThrow();
    expect(() => calculateBurnedCalories(80, -5)).toThrow();
  });

  it('throws for MET outside the 3–8 range', () => {
    expect(() => calculateBurnedCalories(80, 30, 2)).toThrow();
    expect(() => calculateBurnedCalories(80, 30, 9)).toThrow();
  });

  it('returns a result with the explanation and disclaimer fields', () => {
    const result = calculateBurnedCalories(80, 30, 5);
    expect(result.explanation).toBeTruthy();
    expect(result.disclaimer).toBeTruthy();
  });

  it('produces higher calories for higher MET values', () => {
    const low = calculateBurnedCalories(80, 30, 3);
    const high = calculateBurnedCalories(80, 30, 8);
    expect(high.kcal).toBeGreaterThan(low.kcal);
  });
});

// ─── calculateTotalWorkoutCalories ───────────────────────────────────────────

describe('calculateTotalWorkoutCalories', () => {
  it('returns 0 for an empty exercise list', () => {
    expect(calculateTotalWorkoutCalories([], 80)).toBe(0);
  });

  it('uses pre-calculated calories when available', () => {
    const exercises = [{ estimatedCalories: 200 }, { estimatedCalories: 150 }];
    expect(calculateTotalWorkoutCalories(exercises, 80)).toBe(350);
  });

  it('calculates from duration when no pre-calculated calories exist', () => {
    const exercises = [{ durationMinutes: 50 }];
    const expected = calculateBurnedCalories(80, 50, 5).kcal;
    expect(calculateTotalWorkoutCalories(exercises, 80)).toBe(expected);
  });

  it('mixes pre-calculated and duration-based entries', () => {
    const exercises = [
      { estimatedCalories: 100 },
      { durationMinutes: 30 },
    ];
    const fromDuration = calculateBurnedCalories(80, 30, 5).kcal;
    expect(calculateTotalWorkoutCalories(exercises, 80)).toBe(100 + fromDuration);
  });
});
