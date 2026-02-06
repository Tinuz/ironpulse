/**
 * 1RM (One Rep Max) Calculations
 * Automatische gewicht berekeningen op basis van 1RM
 */

export interface SetConfiguration {
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
}

/**
 * Genereer set configuraties op basis van 1RM
 * - 1 warmup set: 50% van 1RM
 * - 4 werksets: 75% van 1RM, 12 reps
 * 
 * @param oneRepMax - De 1RM waarde in kg
 * @returns Array van set configuraties
 */
export function generateSetsFromOneRM(oneRepMax: number): SetConfiguration[] {
  const warmupWeight = roundWeight(oneRepMax * 0.5);
  const workingWeight = roundWeight(oneRepMax * 0.75);
  
  const sets: SetConfiguration[] = [
    // Warmup set
    {
      setNumber: 1,
      weight: warmupWeight,
      reps: 12,
      isWarmup: true
    },
    // 4 werksets
    ...Array.from({ length: 4 }, (_, i) => ({
      setNumber: i + 2,
      weight: workingWeight,
      reps: 12,
      isWarmup: false
    }))
  ];
  
  return sets;
}

/**
 * Bereken warmup gewicht (50% van 1RM)
 */
export function calculateWarmupWeight(oneRepMax: number): number {
  return roundWeight(oneRepMax * 0.5);
}

/**
 * Bereken werkset gewicht (75% van 1RM)
 */
export function calculateWorkingWeight(oneRepMax: number): number {
  return roundWeight(oneRepMax * 0.75);
}

/**
 * Rond gewicht af naar bruikbare incrementen (0.5kg, 1kg, 2.5kg, 5kg afhankelijk van grootte)
 */
export function roundWeight(weight: number): number {
  if (weight < 10) {
    // Onder 10kg: rond op 0.5kg
    return Math.round(weight * 2) / 2;
  } else if (weight < 50) {
    // 10-50kg: rond op 1kg
    return Math.round(weight);
  } else if (weight < 100) {
    // 50-100kg: rond op 2.5kg
    return Math.round(weight / 2.5) * 2.5;
  } else {
    // Boven 100kg: rond op 5kg
    return Math.round(weight / 5) * 5;
  }
}

/**
 * Valideer of 1RM waarde realistisch is (tussen 5kg en 500kg)
 */
export function validateOneRM(oneRepMax: number): boolean {
  return oneRepMax >= 5 && oneRepMax <= 500;
}
