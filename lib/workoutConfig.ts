/**
 * Centralised configuration for workout-related constants.
 * Replace magic numbers scattered across the codebase with named values here.
 */

// ─── Rest Times (seconds) ─────────────────────────────────────────────────────

export const REST_TIMES = {
  /** Compound movements: squat, deadlift, bench press, overhead press, rows, pull-ups */
  COMPOUND: 180,
  /** Isolation accessories: curls, extensions, raises, flies */
  ACCESSORY: 60,
  /** Default for everything else */
  DEFAULT: 90,
} as const;

/** Keywords that classify an exercise as a compound lift */
export const COMPOUND_KEYWORDS = [
  'squat', 'deadlift', 'bench press', 'overhead press', 'row', 'pull up',
] as const;

/** Keywords that classify an exercise as an isolation accessory */
export const ACCESSORY_KEYWORDS = [
  'curl', 'extension', 'raise', 'fly',
] as const;

// ─── Progressive Overload ─────────────────────────────────────────────────────

export const PROGRESSIVE_OVERLOAD = {
  /** Default weight increment for the +2.5 kg copy-last-set suggestion */
  DEFAULT_INCREMENT_KG: 2.5,
  /** Weight rounding increment for suggested weights */
  WEIGHT_ROUND_INCREMENT: 2.5,
} as const;

// ─── Deload ──────────────────────────────────────────────────────────────────

export const DELOAD = {
  /** Factor applied to weights when entering deload mode (80% = 20% reduction) */
  WEIGHT_REDUCTION_FACTOR: 0.8,
  /** Factor applied when restoring from deload to original weights */
  WEIGHT_RESTORE_FACTOR: 1.25,
  /** Number of recent weeks analysed by deload analytics */
  ANALYSIS_WINDOW_WEEKS: 6,
} as const;

// ─── Plateau Detection ────────────────────────────────────────────────────────

export const PLATEAU = {
  /** Minimum number of workouts before plateau detection fires */
  MIN_WORKOUTS_THRESHOLD: 3,
  /** Allowed 1RM variance (kg) before considering two sessions "the same" */
  VARIANCE_KG: 1,
} as const;

// ─── Progression Models ────────────────────────────────────────────────────────
//
// Frank's dual-model approach (Helms et al. 2016):
//   Compounds → Reverse Linear: stay in rep range at RPE 9; increase weight when top hit
//   Isolation → Pseudo Reverse Linear: increase weight only when ALL sets reach max reps

export const COMPOUND_PROGRESSION = {
  /** Default rep range min for compound lifts (4–6 model) */
  REP_RANGE_MIN: 4,
  /** Default rep range max for compound lifts */
  REP_RANGE_MAX: 6,
  /** RPE ceiling — increase weight when top reps achieved at ≤ this RPE */
  RPE_CEILING: 9,
  /** Standard weight step on progression */
  WEIGHT_INCREMENT_KG: 2.5,
} as const;

export const ISOLATION_PROGRESSION = {
  /** Default rep range min for isolation exercises */
  REP_RANGE_MIN: 8,
  /** Default rep range max for isolation exercises */
  REP_RANGE_MAX: 15,
  /** RPE target — approach failure */
  RPE_TARGET: 10,
  /**
   * Minimum working sets that must all hit max reps before weight increase.
   * Prevents premature jumps when only 1 set was performed.
   */
  MIN_SETS_FOR_READINESS: 2,
  /** Smaller increment for isolation — plates are lighter */
  WEIGHT_INCREMENT_KG: 1.25,
} as const;

// ─── 1RM Validation ───────────────────────────────────────────────────────────

export const ONE_RM = {
  MIN_KG: 5,
  MAX_KG: 500,
} as const;
