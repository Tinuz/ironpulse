/**
 * Block Analytics — GAS Periodization
 *
 * Implements Frank's General Adaptation Syndrome (GAS) training principle:
 *   - 4–6 week progressive volume blocks per focus muscle group
 *   - Each build week adds 3 sets on top of MEV (Minimum Effective Volume)
 *   - Final week is a deload at ~50% of the last build week
 *
 * Example 5-week block (back, MEV=10):
 *   W1=10, W2=13, W3=16, W4=19, W5=10 (deload)
 */

import type { TrainingBlock, TrainingBlockMuscle, WorkoutLog, BlockPhase, BodyStats } from '@/components/context/DataContext';
import { getMuscleGroup } from '@/components/utils/volumeAnalytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Starting sets per muscle group (MEV — minimum effective volume).
 * Sources: Israetel & Hoffman (RP Strength 2019) — maintenance MEV values.
 */
export const BLOCK_START_SETS: Record<TrainingBlockMuscle, number> = {
  chest:      8,
  back:       10,
  shoulders:  8,
  // Broad fallbacks — used when focus muscle is set to the generic category
  legs:       8,
  arms:       6,
  // Specific sub-groups shown in maintenance tracking
  quadriceps: 8,   // Israetel: ~8 MEV for quad-dominant work
  hamstrings: 6,   // Israetel: ~6 MEV; hamstrings get indirect volume from deadlift patterns
  biceps:     8,   // Israetel: ~8 MEV for direct bicep work
  triceps:    6,   // Israetel: ~6 MEV; heavy indirect volume from pressing
  abs:        6,
  glutes:     6,
  calves:     8,
};

/** Sets added per build week. */
export const SETS_PER_BUILD_WEEK = 3;

/** Fraction of last build week used for the deload week. */
export const DELOAD_FRACTION = 0.5;

/** All muscle groups tracked for maintenance MEV in a block.
 * Uses granular sub-groups (quadriceps/hamstrings, biceps/triceps) so the
 * widget shows specific muscles instead of the broad "Benen" / "Armen" buckets.
 * The broad 'legs' and 'arms' keys are kept in TrainingBlockMuscle only for
 * backward-compat with existing blocks that stored them as focus muscles.
 */
export const ALL_BLOCK_MUSCLES: TrainingBlockMuscle[] = [
  'chest', 'back', 'shoulders',
  'quadriceps', 'hamstrings',   // replaces broad 'legs'
  'biceps', 'triceps',          // replaces broad 'arms'
  'abs', 'glutes', 'calves',
];

/**
 * Maps broad focus-muscle keys to the specific sub-groups they cover.
 * Used to exclude the correct maintenance muscles when a block focuses on
 * e.g. 'legs' (old blocks) — the maintenance list should then hide both
 * 'quadriceps' and 'hamstrings'.
 */
export const FOCUS_MUSCLE_COVERS: Partial<Record<TrainingBlockMuscle, TrainingBlockMuscle[]>> = {
  legs: ['quadriceps', 'hamstrings'],
  arms: ['biceps', 'triceps'],
};

/**
 * Maps broad getMuscleGroup() return values to their primary specific bucket
 * for set counting. Exercises tagged as generic 'legs' default to 'quadriceps'
 * (most compound leg exercises are quad-dominant). Generic 'arms' default to
 * 'biceps' (curl patterns are most common in arm blocks).
 */
const BROAD_MUSCLE_NORMALIZE: Partial<Record<string, TrainingBlockMuscle>> = {
  legs: 'quadriceps',
  arms: 'biceps',
};

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Returns the target set count for a focus muscle in a specific block week.
 *
 * @param muscle        The muscle group being tracked
 * @param durationWeeks Total block length (4 | 5 | 6), last week = deload
 * @param weekNumber    1-indexed week within the block
 */
export function getBlockWeekTargets(
  muscle: TrainingBlockMuscle,
  durationWeeks: 4 | 5 | 6,
  weekNumber: number,
): number {
  const mev = BLOCK_START_SETS[muscle];
  const buildWeeks = durationWeeks - 1;

  // Clamp to valid range
  const week = Math.max(1, Math.min(weekNumber, durationWeeks));

  if (week === durationWeeks) {
    // Deload: round-half of last build week's sets
    const lastBuildSets = mev + (buildWeeks - 1) * SETS_PER_BUILD_WEEK;
    return Math.max(1, Math.round(lastBuildSets * DELOAD_FRACTION));
  }

  return mev + (week - 1) * SETS_PER_BUILD_WEEK;
}

/**
 * Returns the 1-indexed week number currently active in the block.
 * Clamped to [1, block.durationWeeks].
 *
 * @param block  The training block
 * @param today  Override for the current date (useful in tests)
 */
export function getCurrentBlockWeek(block: TrainingBlock, today?: Date): number {
  const start = new Date(block.startDate);
  const now = today ?? new Date();

  const daysDiff = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const week = Math.floor(daysDiff / 7) + 1;
  return Math.max(1, Math.min(week, block.durationWeeks));
}

/**
 * Returns true if the block is currently in its final (deload) week.
 */
export function isDeloadWeek(block: TrainingBlock, today?: Date): boolean {
  return getCurrentBlockWeek(block, today) === block.durationWeeks;
}

/**
 * Returns a display label for the current block week.
 * Examples: "Week 3 van 5", "Deload week"
 */
export function getBlockWeekLabel(block: TrainingBlock, today?: Date): string {
  const week = getCurrentBlockWeek(block, today);
  if (week === block.durationWeeks) return 'Deload week';
  return `Week ${week} van ${block.durationWeeks}`;
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

export interface MuscleProgress {
  muscle: TrainingBlockMuscle;
  targetSets: number;
  actualSets: number;
  /** 0–1 completion fraction (capped at 1) */
  pct: number;
}

/** Status of a maintenance (non-focus) muscle relative to its MEV target. */
export type MaintenanceMuscleStatus = 'under' | 'ok' | 'over';

export interface MaintenanceMuscleProgress {
  muscle: TrainingBlockMuscle;
  /** MEV target for this week (halved during deload). */
  mevTarget: number;
  actualSets: number;
  /** under: below MEV (risk of muscle loss) | ok: MEV to MEV+3 | over: excess volume spending recovery capacity */
  status: MaintenanceMuscleStatus;
}

export interface BlockProgress {
  weekNumber: number;
  isDeload: boolean;
  muscles: MuscleProgress[];
  /** Maintenance progress for all non-focus muscle groups. */
  maintenanceMuscles: MaintenanceMuscleProgress[];
  /** Weeks left until the block ends (0 on the last week) */
  weeksRemaining: number;
}

/**
 * Calculates actual vs target sets per focus muscle for the active block week.
 * Only counts completed, non-warmup sets from non-deload workouts.
 *
 * @param block    The training block
 * @param history  Full workout history
 * @param today    Override for the current date (useful in tests)
 */
export function getBlockProgress(
  block: TrainingBlock,
  history: WorkoutLog[],
  today?: Date,
): BlockProgress {
  const week = getCurrentBlockWeek(block, today);
  const deload = week === block.durationWeeks;

  // Compute this week's date window aligned to the calendar week (Mon–Sun).
  // Snapping to Monday ensures the block window matches Volume Targets and
  // other widgets that also use calendar weeks.
  const blockStart = new Date(block.startDate);
  const weekMidpoint = new Date(blockStart);
  weekMidpoint.setDate(blockStart.getDate() + (week - 1) * 7);
  const dayOfWeek = weekMidpoint.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(weekMidpoint);
  weekStart.setDate(weekMidpoint.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Filter to workouts within this week
  const weekWorkouts = history.filter(w => {
    const d = new Date(w.date);
    return d >= weekStart && d < weekEnd && !w.isDeload;
  });

  // Count effective sets per ALL tracked muscle groups (focus and maintenance)
  const setCounts = new Map<TrainingBlockMuscle, number>();

  for (const workout of weekWorkouts) {
    for (const ex of workout.exercises) {
      let resolved = getMuscleGroup(ex.name, ex.muscleGroup) as string | null;
      if (!resolved) continue;

      // Normalize broad buckets ('legs'/'arms') to their primary specific muscle
      // so sets are always counted at the granular level used by ALL_BLOCK_MUSCLES.
      if (resolved in BROAD_MUSCLE_NORMALIZE) {
        resolved = BROAD_MUSCLE_NORMALIZE[resolved]!;
      }

      const muscle = resolved as TrainingBlockMuscle;
      if (!ALL_BLOCK_MUSCLES.includes(muscle)) continue;

      for (const set of ex.sets) {
        if (set.completed && !set.isWarmup) {
          setCounts.set(muscle, (setCounts.get(muscle) ?? 0) + 1);
        }
      }
    }
  }

  // Focus muscles — use the block's own focusMuscles array.
  // When focusMuscles contains a broad key ('legs', 'arms'), the set counts
  // come from its normalized specific muscle ('quadriceps', 'biceps').
  const muscles: MuscleProgress[] = block.focusMuscles.map(muscle => {
    // Look up actual sets using the normalized key when the focus muscle is broad.
    const countKey = (BROAD_MUSCLE_NORMALIZE[muscle] as TrainingBlockMuscle | undefined) ?? muscle;
    const targetSets = getBlockWeekTargets(muscle, block.durationWeeks, week);
    const actualSets = setCounts.get(countKey) ?? 0;
    return {
      muscle,
      targetSets,
      actualSets,
      pct: targetSets > 0 ? Math.min(1, actualSets / targetSets) : 0,
    };
  });

  // Maintenance muscles — exclude muscles covered by the focus selection.
  // A broad focus key ('legs') covers its specific sub-groups ('quadriceps', 'hamstrings').
  const focusCovered = new Set<TrainingBlockMuscle>(block.focusMuscles);
  block.focusMuscles.forEach(fm => {
    (FOCUS_MUSCLE_COVERS[fm] ?? []).forEach(specific => focusCovered.add(specific));
  });

  const maintenanceMuscles: MaintenanceMuscleProgress[] = ALL_BLOCK_MUSCLES
    .filter(m => !focusCovered.has(m))
    .map(m => {
      const mevFull = BLOCK_START_SETS[m];
      const mevTarget = deload ? Math.max(1, Math.round(mevFull * DELOAD_FRACTION)) : mevFull;
      const actualSets = setCounts.get(m) ?? 0;
      const status: MaintenanceMuscleStatus =
        actualSets < mevTarget ? 'under' :
        actualSets <= mevTarget + SETS_PER_BUILD_WEEK ? 'ok' :
        'over';
      return { muscle: m, mevTarget, actualSets, status };
    });

  return {
    weekNumber: week,
    isDeload: deload,
    muscles,
    maintenanceMuscles,
    weeksRemaining: block.durationWeeks - week,
  };
}

// ============================================================================
// Phase-aware analytics (cycle-based periodization)
// ============================================================================

/**
 * Returns the current training cycle number (1-indexed).
 *
 * Cycle-based periodization (Poliquin 1988; Bompa & Haff 2009):
 * Adaptation follows the training stimulus, not the calendar clock.
 * Counting cycles via workout history is more accurate than counting days.
 *
 * @param block    The training block
 * @param history  Full workout history (used when schemaRotation is set)
 * @param today    Override for the current date (used in tests / calendar fallback)
 */
export function getCurrentCycle(
  block: TrainingBlock,
  history: WorkoutLog[],
  today?: Date,
): number {
  if (!block.totalCycles) {
    // Legacy block without cycle tracking: fall back to week number
    return getCurrentBlockWeek(block, today);
  }

  const blockStart = new Date(block.startDate);
  blockStart.setHours(0, 0, 0, 0);

  if (block.schemaRotation && block.schemaRotation.length > 0) {
    // Count how many times the first schema in the rotation was done since block start.
    // Each occurrence of the first schema = the start of a new cycle.
    const firstSchemaId = block.schemaRotation[0];
    const count = history.filter(w =>
      w.schemaId === firstSchemaId &&
      new Date(w.date) >= blockStart,
    ).length;
    // If no Upper-A workouts logged yet, we're still in cycle 1
    return Math.max(1, Math.min(count === 0 ? 1 : count, block.totalCycles));
  }

  // No schemaRotation: estimate via calendar days.
  // Assume a 6-day cycle (4 training sessions + 2 rest days).
  const now = today ?? new Date();
  const daysDiff = Math.floor(
    (now.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, Math.min(Math.floor(daysDiff / 6) + 1, block.totalCycles));
}

/**
 * Returns the phase the user is currently in, or null when the block has no phases.
 */
export function getCurrentPhase(
  block: TrainingBlock,
  history: WorkoutLog[],
  today?: Date,
): BlockPhase | null {
  if (!block.phases || block.phases.length === 0) return null;
  const cycle = getCurrentCycle(block, history, today);
  return block.phases.find(p => cycle >= p.cycleStart && cycle <= p.cycleEnd) ?? null;
}

/**
 * Returns a human-readable phase label for display.
 *
 * Examples:
 *  - "🔥 Piekfase · Cyclus 5/7"
 *  - "😴 Deload · Cyclus 7/7"
 *  - "Week 3 van 5"  (legacy block without phases)
 */
export function getBlockPhaseLabel(
  block: TrainingBlock,
  history: WorkoutLog[],
  today?: Date,
): string {
  if (!block.phases || !block.totalCycles) {
    return getBlockWeekLabel(block, today);
  }
  const cycle = getCurrentCycle(block, history, today);
  const phase = getCurrentPhase(block, history, today);
  if (phase) {
    return `${phase.emoji} ${phase.name} · Cyclus ${cycle}/${block.totalCycles}`;
  }
  return `Cyclus ${cycle}/${block.totalCycles}`;
}

/**
 * Returns true when the given exercise is allowed to approach technical failure
 * in the supplied phase.
 *
 * Schoenfeld (2010): training to failure with free weights carries higher injury
 * risk; machine exercises allow safer approaches to momentary failure.
 * Match is case-insensitive substring to handle name variations.
 */
export function isFailurePermitted(
  phase: BlockPhase | null,
  exerciseName: string,
): boolean {
  if (!phase || !phase.failurePermittedExercises || phase.failurePermittedExercises.length === 0) {
    return false;
  }
  const name = exerciseName.toLowerCase();
  return phase.failurePermittedExercises.some(e => name.includes(e.toLowerCase()));
}

// ── Phase readiness check ────────────────────────────────────────────────────

export interface PhaseReadinessItem {
  id: string;
  label: string;
  /** true = ok, false = concern, null = cannot determine automatically */
  passed: boolean | null;
  note?: string;
}

export interface PhaseReadinessCheck {
  /** Overall automated verdict (null when no automated data available) */
  ready: boolean | null;
  items: PhaseReadinessItem[];
}

/**
 * Evaluates whether biofeedback data suggests the user is ready to advance
 * to the next phase.
 *
 * Automated checks:
 *  - Sleep quality ≥ 3.5 / 5 averaged over last 5 logged days
 *    (Dattilo et al. 2011: sleep deprivation impairs muscle protein synthesis)
 *
 * Manual checks (shown to user, not automatable):
 *  - Reps or weight still increasing
 *  - Focus muscle recovered before next upper session
 *  - Joints (shoulders, elbows) comfortable
 *  - Motivation and sleep feel good
 */
export function checkPhaseReadiness(
  _block: TrainingBlock,
  _history: WorkoutLog[],
  bodyStats: BodyStats[],
): PhaseReadinessCheck {
  // Sleep quality check (automated)
  const recentSleep = bodyStats
    .filter(s => s.sleepQuality != null)
    .slice(0, 5);

  let sleepPassed: boolean | null = null;
  let sleepNote: string | undefined;

  if (recentSleep.length >= 3) {
    const avg = recentSleep.reduce((s, b) => s + (b.sleepQuality ?? 0), 0) / recentSleep.length;
    sleepPassed = avg >= 3.5;
    if (!sleepPassed) {
      sleepNote = `Gemiddeld ${avg.toFixed(1)}/5 — suboptimaal herstel`;
    }
  } else {
    sleepNote = 'Log slaapkwaliteit voor automatische check';
  }

  const items: PhaseReadinessItem[] = [
    {
      id: 'progression',
      label: 'Gewicht of reps stijgen nog',
      passed: null,
      note: 'Controleer zelf: zijn de laatste 2 cycli verbeterd?',
    },
    {
      id: 'sleep',
      label: 'Slaapkwaliteit ≥ 3.5/5 (laatste 5 dagen)',
      passed: sleepPassed,
      note: sleepNote,
    },
    {
      id: 'recovery',
      label: 'Focusspier hersteld voor de volgende uppersessie',
      passed: null,
      note: 'Controleer zelf: geen aanhoudende spierpijn',
    },
    {
      id: 'joints',
      label: 'Schouders en ellebogen rustig',
      passed: null,
      note: 'Subjectieve beoordeling vereist',
    },
    {
      id: 'motivation',
      label: 'Motivatie en energie goed',
      passed: null,
      note: 'Bij twee slechte trainingen achter elkaar: wacht een cyclus',
    },
  ];

  // Overall: only give a verdict if we have at least one automated result
  const automatedPassed = items
    .filter(i => i.id === 'sleep' && i.passed !== null)
    .map(i => i.passed as boolean);

  const ready = automatedPassed.length > 0
    ? automatedPassed.every(p => p)
    : null;

  return { ready, items };
}
