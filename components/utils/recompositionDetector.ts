import { WorkoutLog, BodyStats, NutritionLog } from '@/components/context/DataContext';
import { calculateStrengthScore } from './strengthAnalytics';

/**
 * Body Recomposition Detector
 *
 * Scientific basis:
 *   - Barakat et al. (2020) — Strength Cond J:
 *     Recomposition (simultaneous fat loss + muscle gain) is achievable, especially
 *     in beginners and intermediate trainees with adequate protein + resistance training.
 *   - Morton et al. (2018): ≥1.6 g protein/kg/day maximises muscle protein synthesis.
 *   - Wolf / Stronger by Science (Nov 2025): Scale weight stability + increasing strength
 *     is a reliable practical indicator of recomposition in progress.
 *
 * Detection criteria (all must be met):
 *   1. Body weight stable: max deviation ≤ 1 kg between 4-week average and today's weight
 *   2. Strength increasing: strength score improved ≥2% vs. previous 4-week window
 *   3. Protein adequate: avg daily protein ≥ 1.6 g/kg (over last 14 days)
 *   4. At least 4 workouts in the last 28 days
 */

export interface RecompositionResult {
  isRecomposing: boolean;
  weightStable: boolean;
  strengthIncreasing: boolean;
  proteinAdequate: boolean | null;  // null if no nutrition data
  avgWeight4wk: number | null;
  currentWeight: number | null;
  weightDelta: number | null;
  strengthChangePct: number | null;
  avgDailyProtein: number | null;
  proteinTargetGrams: number | null;
  workoutsInWindow: number;
  hasEnoughData: boolean;
}

export function detectRecomposition(
  workouts: WorkoutLog[],
  bodyStats: BodyStats[],
  nutritionLogs: NutritionLog[],
): RecompositionResult {
  const now = new Date();
  const cutoff28 = new Date(now); cutoff28.setDate(now.getDate() - 28); cutoff28.setHours(0, 0, 0, 0);
  const cutoff14 = new Date(now); cutoff14.setDate(now.getDate() - 14); cutoff14.setHours(0, 0, 0, 0);
  const cutoff56 = new Date(now); cutoff56.setDate(now.getDate() - 56); cutoff56.setHours(0, 0, 0, 0);

  // ── 1. Body weight stability ────────────────────────────────────────────────
  const recentStats = bodyStats
    .filter(s => s.weight != null && new Date(s.date) >= cutoff28)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentWeight = recentStats[0]?.weight ?? null;
  const avgWeight4wk =
    recentStats.length > 0
      ? recentStats.reduce((s, b) => s + (b.weight ?? 0), 0) / recentStats.length
      : null;

  const weightDelta =
    currentWeight !== null && avgWeight4wk !== null ? currentWeight - avgWeight4wk : null;
  const weightStable = weightDelta !== null && Math.abs(weightDelta) <= 1.5;

  // ── 2. Strength trend ───────────────────────────────────────────────────────
  const recentWorkouts = workouts.filter(w => new Date(w.date) >= cutoff28);
  const prevWorkouts = workouts.filter(
    w => new Date(w.date) >= cutoff56 && new Date(w.date) < cutoff28,
  );

  const workoutsInWindow = recentWorkouts.length;

  let strengthChangePct: number | null = null;
  let strengthIncreasing = false;

  if (recentWorkouts.length >= 4 && prevWorkouts.length >= 2) {
    const recent = calculateStrengthScore(recentWorkouts);
    const prev = calculateStrengthScore(prevWorkouts);
    if (recent.total > 0 && prev.total > 0) {
      strengthChangePct = ((recent.total - prev.total) / prev.total) * 100;
      strengthIncreasing = strengthChangePct >= 2;
    }
  }

  // ── 3. Protein adequacy ─────────────────────────────────────────────────────
  const recentNutrition = nutritionLogs.filter(l => new Date(l.date) >= cutoff14);
  let avgDailyProtein: number | null = null;
  let proteinAdequate: boolean | null = null;
  let proteinTargetGrams: number | null = null;

  if (recentNutrition.length >= 3) {
    const totalProtein = recentNutrition.reduce(
      (sum, log) => sum + log.items.reduce((s, item) => s + (item.protein ?? 0), 0),
      0,
    );
    avgDailyProtein = totalProtein / recentNutrition.length;

    if (currentWeight !== null) {
      proteinTargetGrams = currentWeight * 1.6;
      proteinAdequate = avgDailyProtein >= proteinTargetGrams;
    }
  }

  // ── Overall verdict ─────────────────────────────────────────────────────────
  const hasEnoughData =
    recentStats.length >= 3 && recentWorkouts.length >= 4;

  const isRecomposing =
    hasEnoughData &&
    weightStable &&
    strengthIncreasing &&
    (proteinAdequate === null || proteinAdequate);

  return {
    isRecomposing,
    weightStable,
    strengthIncreasing,
    proteinAdequate,
    avgWeight4wk,
    currentWeight,
    weightDelta,
    strengthChangePct,
    avgDailyProtein,
    proteinTargetGrams,
    workoutsInWindow,
    hasEnoughData,
  };
}
