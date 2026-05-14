/**
 * Hypertrophy Engine
 *
 * Berekent het optimale trainingsgewicht voor spiergroei op basis van
 * geschatte 1RM (Brzycki/Epley), RPE-feedback van de vorige sessie en
 * het type oefening (compound vs. isolatie).
 *
 * Wetenschappelijke onderbouwing:
 * - Schoenfeld (2010): optimale hypertrofie range 70–78% van 1RM
 * - Krieger (2010): minimale intensiteitsgrens voor adaptatie ≥ 60% 1RM
 * - Zourdos et al. (2016): RPE ≥ 6 als criterium voor effectieve werkset
 * - Helms et al. (2016): isolatieoefeningen mogen richting falen gaan (RPE 9–10)
 * - Compounds: RPE 6–9 om voldoende volume te bewaken
 */

import { calculate1RM } from '@/components/utils/workoutCalculations';
import { isCompoundExercise } from '@/components/utils/exerciseClassification';
import type { WorkoutSet } from '@/components/context/DataContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HypertrophyTarget {
  /** Geschatte 1 Repetition Maximum (kg) */
  estimate1RM: number;
  /** Optimaal doelgewicht (74% van 1RM, gecorrigeerd voor RPE) */
  targetWeight: number;
  /** Ondergrens hypertrofie zone (70% van 1RM) */
  hypertrophyMin: number;
  /** Bovengrens hypertrofie zone (78% van 1RM) */
  hypertrophyMax: number;
  /** Absolute minimumgrens – sets eronder geven onvoldoende prikkel (60% 1RM) */
  safetyFloor: number;
  /** Aanbevolen RPE-doelbereik op basis van oefening-type */
  rpeTarget: RPETarget;
  /** Of het gewicht omhoog is bijgesteld omdat vorige RPE te laag was */
  adjustedForLowRPE: boolean;
}

export interface RPETarget {
  min: number;
  max: number;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Procentueel doelgewicht voor hypertrofie (midpoint 70–78% range) */
export const HYPERTROPHY_TARGET_PCT = 0.74;
/** Ondergrens hypertrofie zone */
export const HYPERTROPHY_MIN_PCT = 0.70;
/** Bovengrens hypertrofie zone */
export const HYPERTROPHY_MAX_PCT = 0.78;
/** Minimale intensiteitsgrens voor spiergroei-adaptatie */
export const HYPERTROPHY_FLOOR_PCT = 0.60;

/** RPE-drempel: sets met RPE < 6 worden niet als effectieve werkset beschouwd */
export const EFFECTIVE_SET_RPE_THRESHOLD = 6;

/**
 * RPE-correctiefactor: als vorige RPE < 6 was, dan telt die set als warming-up
 * en verhogen we het voorgestelde gewicht met 5%.
 */
export const LOW_RPE_CORRECTION_FACTOR = 1.05;

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Berekent het optimale trainingsgewicht voor hypertrofie.
 *
 * Algoritme:
 * 1. Schat 1RM op basis van laatste gewicht + herhalingen
 * 2. Bereken doelgewicht = 1RM × 0.74 (midpoint 70–78%)
 * 3. Als vorige RPE < 6: verhoog gewicht +5% (set telde niet als effectieve prikkel)
 * 4. Floor-validatie: zorg dat target ≥ 1RM × 0.60
 *
 * @param lastWeight  Gewicht gebruikt in de laatste set (kg)
 * @param reps        Aantal herhalingen in de laatste set
 * @param prevRPE     RPE van de vorige training voor deze oefening (optioneel)
 * @param isCompound  Of het een compound oefening is (true) of isolatie (false)
 */
export function calculateOptimalHypertrophyWeight(
  lastWeight: number,
  reps: number,
  prevRPE?: number,
  isCompound: boolean = true
): HypertrophyTarget {
  // Stap 1: schat 1RM
  const estimate1RM = calculate1RM(lastWeight, reps);

  // Stap 2: bereken initieel doelgewicht
  let targetWeight = estimate1RM * HYPERTROPHY_TARGET_PCT;

  // Stap 3: RPE-correctie – als vorige set niet effectief was, verhoog gewicht
  const adjustedForLowRPE = prevRPE !== undefined && prevRPE < EFFECTIVE_SET_RPE_THRESHOLD;
  if (adjustedForLowRPE) {
    targetWeight *= LOW_RPE_CORRECTION_FACTOR;
  }

  // Stap 4: floor-validatie – nooit onder 60% van 1RM
  const safetyFloor = estimate1RM * HYPERTROPHY_FLOOR_PCT;
  if (targetWeight < safetyFloor) {
    targetWeight = safetyFloor;
  }

  // Rond af op dichtstbijzijnde 2.5 kg (standaard platensets)
  targetWeight = Math.round(targetWeight / 2.5) * 2.5;

  return {
    estimate1RM: Math.round(estimate1RM * 10) / 10,
    targetWeight,
    hypertrophyMin: Math.round((estimate1RM * HYPERTROPHY_MIN_PCT) / 2.5) * 2.5,
    hypertrophyMax: Math.round((estimate1RM * HYPERTROPHY_MAX_PCT) / 2.5) * 2.5,
    safetyFloor: Math.round((safetyFloor) / 2.5) * 2.5,
    rpeTarget: getRPETarget(isCompound),
    adjustedForLowRPE,
  };
}

/**
 * Wrapper die automatisch het oefening-type opzoekt via de naam.
 */
export function calculateHypertrophyTargetForExercise(
  exerciseName: string,
  lastWeight: number,
  reps: number,
  prevRPE?: number
): HypertrophyTarget {
  return calculateOptimalHypertrophyWeight(
    lastWeight,
    reps,
    prevRPE,
    isCompoundExercise(exerciseName)
  );
}

// ─── Effective set logic ──────────────────────────────────────────────────────

/**
 * Bepaalt of een set telt als effectieve werkset voor hypertrofie.
 * Criteria: niet-warmup, voltooid, en RPE ≥ 6 (Zourdos et al. 2016).
 * Sets met RPE < 6 worden als warming-up beschouwd en tellen niet mee
 * voor progressiestatistieken.
 */
export function isEffectiveWorkingSet(set: WorkoutSet): boolean {
  if (!set.completed || set.isWarmup) return false;
  if (set.rpe === undefined) return false;
  return set.rpe >= EFFECTIVE_SET_RPE_THRESHOLD;
}

/**
 * Telt het aantal effectieve werksets in een array.
 */
export function countEffectiveSets(sets: WorkoutSet[]): number {
  return sets.filter(isEffectiveWorkingSet).length;
}

// ─── RPE targets ──────────────────────────────────────────────────────────────

/**
 * Geeft het aanbevolen RPE-bereik op basis van oefening-type.
 *
 * Compounds (squat, bench, deadlift, row, press):
 *   RPE 6–9 — veiligheidsmarges voor volumebehoud over de week.
 *
 * Isolatie (curl, extension, raise, fly):
 *   RPE 9–10 — nabij falen stimuleert maximale spieractivering.
 *   (Helms et al. 2016; Schoenfeld 2010)
 */
export function getRPETarget(isCompound: boolean): RPETarget {
  if (isCompound) {
    return { min: 6, max: 9, label: 'RPE 6–9 (compound)' };
  }
  return { min: 9, max: 10, label: 'RPE 9–10 (isolatie)' };
}

/**
 * Geeft het RPE-doelbereik op basis van de oefening-naam.
 */
export function getRPETargetForExercise(exerciseName: string): RPETarget {
  return getRPETarget(isCompoundExercise(exerciseName));
}
