import { WorkoutLog, Schema } from '@/components/context/DataContext';
import { calculateACWR } from './acwrAnalytics';
import { detectDeloadNeed } from './deloadAnalytics';
import { calculateVolumeLandmarks } from './volumeLandmarksAnalytics';
import { analyzeRPERIRTrends } from './rpeRirTrendAnalytics';
import { detectAllPlateaus } from './plateauDetection';
import { generateProgressiveOverloadSuggestion } from './progressiveOverload';
import { suggestStartingWeight } from './startingWeightSuggestions';
import { getMuscleGroup } from './volumeAnalytics';

/**
 * Pre-Workout Briefing Analytics
 *
 * Aggregates multiple evidence-based analytics into a single briefing object
 * that the user can consult before starting a scheduled workout.
 *
 * Scientific foundations:
 *  - Gabbett (2016), BJSM — ACWR for injury risk assessment
 *  - Israetel & Hoffman (RP Strength) — MEV/MAV/MRV volume landmarks
 *  - Zourdos et al. (2016) — RPE/RIR autoregulation and fatigue detection
 *  - Zatsiorsky & Kraemer (2006) — muscle recovery timelines (48–96 h)
 *  - Peterson et al. (2011) — progressive overload as primary hypertrophy stimulus
 */

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type BriefingInsightType =
  | 'acwr_warning'     // ACWR outside optimal zone (caution/danger)
  | 'acwr_low'         // ACWR undertraining zone
  | 'deload_alert'     // Deload is recommended
  | 'mrv_warning'      // ≥1 schema muscle group is at/near MRV
  | 'plateau_warning'  // ≥1 schema exercise is plateaued
  | 'rpe_fatigue'      // ≥1 schema exercise has rising RPE trend
  | 'overload_ready'   // ≥1 schema exercise ready for weight increase
  | 'recovery_low';    // A schema muscle group hasn't recovered (< 48 h since training)

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface BriefingInsight {
  type: BriefingInsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  reference?: string; // scientific reference label
}

export interface ExerciseBriefing {
  exerciseName: string;
  muscleGroup: string | null;
  /** Best set weight from the most recent workout containing this exercise */
  lastWeight: number | null;
  /** Best working reps from the most recent workout */
  lastReps: number | null;
  /** Date of the most recent workout with this exercise */
  lastTrainedDate: string | null;
  /** Suggested weight for today */
  suggestedWeight: number | null;
  suggestedWeightReason: string | null;
  /** True when a progressive overload increase is indicated */
  readyForOverload: boolean;
  overloadSuggestion: string | null;
  /** Numeric overload target weight (null when not ready for overload) */
  overloadWeight: number | null;
  /** True when the exercise is detected as plateaued */
  isPlateau: boolean;
  plateauDescription: string | null;
  /** True when RPE trend is rising on this exercise */
  rpeRising: boolean;
  rpeInsight: string | null;
}

export interface MuscleRecovery {
  muscleGroup: string;
  label: string;
  /** Days since this muscle group was last trained */
  daysSinceTrained: number;
  /** True if less than 48 h since last training (insufficient recovery) */
  insufficientRecovery: boolean;
  /** 0–100 readiness score based on recovery curve */
  readinessScore: number;
  volumeStatus: string | null; // from volume landmarks (e.g. 'Optimaal', 'Max.')
  volumeStatusColor: string | null;
}

export interface PreWorkoutBriefing {
  schemaName: string;
  /** 0–100 composite readiness score */
  readinessScore: number;
  readinessLabel: string;
  readinessColor: 'green' | 'yellow' | 'red';
  /** Whether a deload is recommended (influences footer button) */
  deloadRecommended: boolean;
  deloadUrgency: 'low' | 'medium' | 'high' | 'critical';
  /** Top-level insights sorted by severity */
  insights: BriefingInsight[];
  /** Recovery status per muscle group targeted by this schema */
  muscleRecoveries: MuscleRecovery[];
  /** Per-exercise briefing for schema exercises */
  exercises: ExerciseBriefing[];
}

// ────────────────────────────────────────────────────────────
// Muscle-group recovery curve (Zatsiorsky & Kraemer 2006)
// ────────────────────────────────────────────────────────────

const RECOVERY_CURVE: Record<number, number> = {
  0: 0,
  1: 20,
  2: 45,
  3: 70,
  4: 90,
};

function recoveryScore(daysSince: number): number {
  if (daysSince >= 5) return 100;
  return RECOVERY_CURVE[daysSince] ?? 100;
}

// Maps Schema.Exercise.muscleGroup values to human-readable labels
const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Borst',
  back: 'Rug',
  shoulders: 'Schouders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Benen',
  core: 'Core',
  'full-body': 'Full body',
  cardio: 'Cardio',
};

// ────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────

export function generatePreWorkoutBriefing(
  history: WorkoutLog[],
  schema: Schema
): PreWorkoutBriefing {
  const insights: BriefingInsight[] = [];
  let readiness = 100;

  // ── 1. ACWR ──────────────────────────────────────────────
  const acwr = calculateACWR(history);
  if (acwr.hasEnoughData) {
    if (acwr.zone === 'danger') {
      readiness -= 30;
      insights.push({
        type: 'acwr_warning',
        severity: 'critical',
        title: 'Hoog trainingsvolume (ACWR)',
        description: `Je acute:chronische workload ratio is ${acwr.acwr.toFixed(2)} — boven de veilige grens van 1.5. Verminder volume of intensiteit om blessurerisico te beperken.`,
        reference: 'Gabbett 2016, BJSM',
      });
    } else if (acwr.zone === 'caution') {
      readiness -= 15;
      insights.push({
        type: 'acwr_warning',
        severity: 'warning',
        title: 'Verhoogde trainingsbelasting (ACWR)',
        description: `Je ACWR is ${acwr.acwr.toFixed(2)} — in de voorzichtigheidszone (1.3–1.5). Let op herstel en overweeg minder extra volume toe te voegen.`,
        reference: 'Gabbett 2016, BJSM',
      });
    } else if (acwr.zone === 'undertraining') {
      readiness -= 5;
      insights.push({
        type: 'acwr_low',
        severity: 'info',
        title: 'Trainingsfrequentie laag (ACWR)',
        description: `Je ACWR is ${acwr.acwr.toFixed(2)} — je traint minder dan gewoonlijk. Overweeg meer volume toe te voegen om progressie te stimuleren.`,
        reference: 'Gabbett 2016, BJSM',
      });
    }
  }

  // ── 2. Deload detection ───────────────────────────────────
  const deloadRec = detectDeloadNeed(history);
  if (deloadRec.shouldDeload) {
    if (deloadRec.urgency === 'critical' || deloadRec.urgency === 'high') {
      readiness -= 25;
      insights.push({
        type: 'deload_alert',
        severity: 'critical',
        title: 'Deload aanbevolen',
        description: deloadRec.recommendation,
        reference: 'Zatsiorsky & Kraemer 2006',
      });
    } else {
      readiness -= 10;
      insights.push({
        type: 'deload_alert',
        severity: 'warning',
        title: 'Overweeg een deload',
        description: deloadRec.recommendation,
        reference: 'Zatsiorsky & Kraemer 2006',
      });
    }
  }

  // ── 3. Volume landmarks — filter to schema muscle groups ──
  const volumeLandmarks = calculateVolumeLandmarks(history);
  const schemaMuscleGroups = new Set<string>();
  schema.exercises.forEach(ex => {
    if (ex.muscleGroup) schemaMuscleGroups.add(ex.muscleGroup);
  });

  let mrvCount = 0;
  for (const muscle of volumeLandmarks.muscles) {
    if (schemaMuscleGroups.has(muscle.group) && muscle.status === 'at_mrv') {
      mrvCount++;
    }
  }
  if (mrvCount > 0) {
    readiness -= 10 * Math.min(mrvCount, 3);
    insights.push({
      type: 'mrv_warning',
      severity: mrvCount >= 2 ? 'critical' : 'warning',
      title: `${mrvCount > 1 ? `${mrvCount} spiergroepen` : '1 spiergroep'} op maximaal herstelvolume (MRV)`,
      description: 'Je wekelijks volume overschrijdt de MRV voor spiergroepen in dit schema. Extra sets zullen herstel belemmeren zonder extra groei te stimuleren.',
      reference: 'Israetel & Hoffman (RP Strength)',
    });
  }

  // ── 4. Plateau detection ──────────────────────────────────
  const plateaus = detectAllPlateaus(history);
  const schemaExerciseNames = schema.exercises.map(e => e.name.toLowerCase());
  const schemaPlateaus = plateaus.filter(p =>
    schemaExerciseNames.includes(p.exerciseName.toLowerCase())
  );
  if (schemaPlateaus.length >= 2) {
    readiness -= 5;
    insights.push({
      type: 'plateau_warning',
      severity: 'warning',
      title: `${schemaPlateaus.length} oefeningen in plateau`,
      description: `${schemaPlateaus.map(p => p.exerciseName).join(', ')} tonen geen vooruitgang. Overweeg variabelen aan te passen: gewicht, reps, tempo of oefening.`,
      reference: 'Peterson et al. 2011',
    });
  } else if (schemaPlateaus.length === 1) {
    insights.push({
      type: 'plateau_warning',
      severity: 'info',
      title: `${schemaPlateaus[0].exerciseName} in plateau`,
      description: schemaPlateaus[0].ruleSuggestions?.[0] ?? 'Probeer een variabele te wijzigen om progressie te hervatten.',
      reference: 'Peterson et al. 2011',
    });
  }

  // ── 5. RPE/RIR fatigue trends ─────────────────────────────
  const rpeAnalysis = analyzeRPERIRTrends(history);
  const schemaRisingRPE = rpeAnalysis.exercises.filter(
    e =>
      schemaExerciseNames.includes(e.exerciseName.toLowerCase()) &&
      e.rpeTrend === 'rising'
  );
  if (schemaRisingRPE.length >= 2) {
    readiness -= 10;
    insights.push({
      type: 'rpe_fatigue',
      severity: 'warning',
      title: 'Toenemende RPE bij meerdere oefeningen',
      description: `Bij ${schemaRisingRPE.map(e => e.exerciseName).join(', ')} stijgt de RPE over de afgelopen weken bij gelijk gewicht. Dit duidt op vermoeidheidsaccumulatie.`,
      reference: 'Zourdos et al. 2016',
    });
  } else if (schemaRisingRPE.length === 1) {
    insights.push({
      type: 'rpe_fatigue',
      severity: 'info',
      title: `RPE stijgt bij ${schemaRisingRPE[0].exerciseName}`,
      description: schemaRisingRPE[0].insight ?? 'Vermoeidheid neemt toe bij deze oefening. Overweeg iets minder volume of een lichtere dag.',
      reference: 'Zourdos et al. 2016',
    });
  }

  // ── 6. Muscle recovery per schema muscle group ────────────
  const muscleRecoveries: MuscleRecovery[] = [];
  const now = new Date();

  for (const muscleId of Array.from(schemaMuscleGroups)) {
    if (muscleId === 'full-body' || muscleId === 'cardio') continue;

    // Find most recent workout that included this muscle
    const muscleWorkouts = history.filter(w =>
      w.exercises.some(ex => ex.muscleGroup === muscleId)
    );
    const lastWorkout = muscleWorkouts[0]; // history is sorted newest-first
    const daysSince = lastWorkout
      ? Math.floor((now.getTime() - new Date(lastWorkout.date).getTime()) / 86_400_000)
      : 999;

    const score = recoveryScore(Math.min(daysSince, 5));
    const insufficient = daysSince < 2; // < 48 h

    if (insufficient) {
      readiness -= 8;
    }

    const landmarkForMuscle = volumeLandmarks.muscles.find(m => m.group === muscleId);

    muscleRecoveries.push({
      muscleGroup: muscleId,
      label: MUSCLE_LABEL[muscleId] ?? muscleId,
      daysSinceTrained: daysSince === 999 ? -1 : daysSince,
      insufficientRecovery: insufficient,
      readinessScore: score,
      volumeStatus: landmarkForMuscle?.statusLabel ?? null,
      volumeStatusColor: landmarkForMuscle?.statusColor ?? null,
    });
  }

  // ── 7. Per-exercise briefing ──────────────────────────────
  const exerciseBriefings: ExerciseBriefing[] = schema.exercises
    .filter(ex => ex.type !== 'cardio')
    .map(ex => {
      const name = ex.name;
      const nameLower = name.toLowerCase();

      // Last performance
      const workoutsWithEx = history.filter(w =>
        w.exercises.some(e => e.name.toLowerCase() === nameLower)
      );
      const lastWorkout = workoutsWithEx[0];
      let lastWeight: number | null = null;
      let lastReps: number | null = null;
      let lastTrainedDate: string | null = null;

      if (lastWorkout) {
        const lastEx = lastWorkout.exercises.find(
          e => e.name.toLowerCase() === nameLower
        );
        const workingSets =
          lastEx?.sets.filter(s => s.completed && !s.isWarmup) ?? [];
        const bestSet = workingSets.reduce<{ weight: number; reps: number } | null>(
          (best, s) =>
            !best || s.weight > best.weight ? { weight: s.weight, reps: s.reps } : best,
          null
        );
        lastWeight = bestSet?.weight ?? null;
        lastReps = bestSet?.reps ?? null;
        lastTrainedDate = lastWorkout.date;
      }

      // Weight suggestion
      const weightSuggestion = suggestStartingWeight(name, history, null);
      const suggestedWeight = weightSuggestion?.suggestedWeight ?? null;
      const suggestedWeightReason = weightSuggestion?.reasoning ?? null;

      // Overload suggestion
      const overload = generateProgressiveOverloadSuggestion(name, history);
      const readyForOverload = overload !== null && overload.confidence !== 'low';
      const overloadSuggestion = readyForOverload
        ? `${overload!.suggestedWeight} kg (+${overload!.increasePercentage}%) — ${overload!.reason}`
        : null;

      // Plateau
      const plateau = schemaPlateaus.find(
        p => p.exerciseName.toLowerCase() === nameLower
      );

      // RPE trend
      const rpeTrend = rpeAnalysis.exercises.find(
        e => e.exerciseName.toLowerCase() === nameLower
      );

      // Overload-ready insight (only show if no MRV warning already for this muscle)
      if (readyForOverload) {
        insights.push({
          type: 'overload_ready',
          severity: 'info',
          title: `${name} klaar voor progressie`,
          description: `Suggestie: ${overload!.suggestedWeight} kg (+${overload!.increasePercentage}%). ${overload!.reason}`,
          reference: 'Peterson et al. 2011',
        });
      }

      return {
        exerciseName: name,
        muscleGroup: ex.muscleGroup ?? getMuscleGroup(name),
        lastWeight,
        lastReps,
        lastTrainedDate,
        suggestedWeight,
        suggestedWeightReason,
        readyForOverload,
        overloadSuggestion,
        overloadWeight: readyForOverload ? (overload?.suggestedWeight ?? null) : null,
        isPlateau: !!plateau,
        plateauDescription: plateau?.ruleSuggestions?.[0] ?? null,
        rpeRising: rpeTrend?.rpeTrend === 'rising',
        rpeInsight: rpeTrend?.insight ?? null,
      };
    });

  // ── 8. Remove duplicate overload_ready insights above limit ─
  // Keep max 2 overload insights to avoid overwhelming the user
  const overloadInsights = insights.filter(i => i.type === 'overload_ready');
  if (overloadInsights.length > 2) {
    const toRemove = overloadInsights.slice(2);
    toRemove.forEach(ins => {
      const idx = insights.indexOf(ins);
      if (idx !== -1) insights.splice(idx, 1);
    });
  }

  // ── 9. Clamp readiness and derive label ───────────────────
  readiness = Math.max(0, Math.min(100, readiness));

  let readinessLabel: string;
  let readinessColor: 'green' | 'yellow' | 'red';
  if (readiness >= 75) {
    readinessLabel = 'Goed herstel';
    readinessColor = 'green';
  } else if (readiness >= 45) {
    readinessLabel = 'Matig herstel';
    readinessColor = 'yellow';
  } else {
    readinessLabel = 'Onvoldoende herstel';
    readinessColor = 'red';
  }

  // Sort: critical > warning > info
  const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    schemaName: schema.name,
    readinessScore: readiness,
    readinessLabel,
    readinessColor,
    deloadRecommended: deloadRec.shouldDeload,
    deloadUrgency: deloadRec.urgency,
    insights,
    muscleRecoveries,
    exercises: exerciseBriefings,
  };
}
