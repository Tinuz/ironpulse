/**
 * Calorie Calculations using MET (Metabolic Equivalent of Task) formula
 * 
 * Formula: kcal = (MET × 3.5 × weight_kg × duration_min) / 200
 * 
 * References:
 * - Compendium of Physical Activities (https://pacompendium.com)
 * - American College of Sports Medicine (ACSM) guidelines
 * - Harvard Health Publishing
 */

export interface CalorieResult {
  kcal: number;
  explanation: string;
  disclaimer: string;
}

/**
 * Calculate estimated calories burned during exercise using MET formula
 * 
 * @param weightKg - Body weight in kilograms
 * @param durationMinutes - Exercise duration in minutes (including rest between sets)
 * @param met - Metabolic Equivalent of Task value (default: 5 for moderate strength training)
 * @returns CalorieResult with estimated calories, explanation, and disclaimer
 * 
 * @throws Error if inputs are invalid
 * 
 * @example
 * const result = calculateBurnedCalories(80, 50, 5);
 * console.log(result.kcal); // ~350 kcal
 */
export function calculateBurnedCalories(
  weightKg: number,
  durationMinutes: number,
  met: number = 5
): CalorieResult {
  // Input validation
  if (!weightKg || weightKg < 30) {
    throw new Error("Gewicht moet minimaal 30 kg zijn");
  }
  if (!durationMinutes || durationMinutes <= 0) {
    throw new Error("Duur moet groter dan 0 minuten zijn");
  }
  if (met < 3 || met > 8) {
    throw new Error("MET-waarde voor krachttraining moet tussen 3 en 8 zijn");
  }

  // MET Formula: kcal = (MET × 3.5 × weight_kg × duration_min) / 200
  const kcal = (met * 3.5 * weightKg * durationMinutes) / 200;

  return {
    kcal: Math.round(kcal),
    explanation: `Berekening: (${met} × 3.5 × ${weightKg} kg × ${durationMinutes} min) / 200 = ${Math.round(kcal)} kcal`,
    disclaimer: "Dit is een schatting op basis van de MET-formule en gemiddelde waarden. De werkelijke verbranding kan variëren afhankelijk van individuele factoren zoals leeftijd, geslacht, lichaamssamenstelling, intensiteit, rusttijden en persoonlijke stofwisseling. Voor nauwkeurige metingen raden we een hartslagmeter of wearable aan."
  };
}

/**
 * Calculate total workout calories from multiple exercises
 * 
 * @param exercises - Array of exercises with duration and optional individual calories
 * @param weightKg - Body weight in kilograms
 * @param met - MET value (default: 5)
 * @returns Total estimated calories burned
 */
export function calculateTotalWorkoutCalories(
  exercises: Array<{ durationMinutes?: number; estimatedCalories?: number }>,
  weightKg: number,
  met: number = 5
): number {
  return exercises.reduce((total, exercise) => {
    // Use pre-calculated calories if available
    if (exercise.estimatedCalories) {
      return total + exercise.estimatedCalories;
    }
    
    // Otherwise calculate from duration
    if (exercise.durationMinutes && weightKg) {
      try {
        const result = calculateBurnedCalories(weightKg, exercise.durationMinutes, met);
        return total + result.kcal;
      } catch {
        return total;
      }
    }
    
    return total;
  }, 0);
}

/**
 * Get MET value recommendations based on intensity
 */
export const MET_VALUES = {
  LIGHT: 3.5,        // Light resistance training, stretching
  MODERATE: 5.0,     // Moderate intensity machine exercises
  VIGOROUS: 6.0,     // Vigorous free weights, circuit training
  INTENSE: 8.0       // High intensity interval training, heavy compound lifts
} as const;

/**
 * Format calorie range for display (showing uncertainty)
 * 
 * @param baseCalories - Base calorie estimate
 * @param variance - Variance percentage (default: 15%)
 * @returns Formatted string like "300-450 kcal"
 */
export function formatCalorieRange(baseCalories: number, variance: number = 0.15): string {
  const lower = Math.round(baseCalories * (1 - variance));
  const upper = Math.round(baseCalories * (1 + variance));
  return `${lower}-${upper} kcal`;
}
