import { WorkoutLog } from '@/components/context/DataContext';
import { getMuscleGroup, MuscleGroup, MUSCLE_GROUPS } from './volumeAnalytics';

/**
 * Proximity-to-Failure Analytics per Muscle Group
 *
 * Scientific basis:
 *   - Robinson et al. (2024) — Sports Med (PMID 38970765):
 *     Meta-regression of RIR vs. hypertrophy. Hypertrophy improves as sets are
 *     terminated closer to failure (negative slope, CI excludes null).
 *     Strength gains are similar across a wide RIR range (CI contains null).
 *
 *   - Larsen et al. (2025) — Front Psychol (PMID 39995432):
 *     Past-failure partials in lengthened position → +9.6% vs +6.7% gastrocnemius
 *     hypertrophy. Strong evidence (BF = 13.3).
 *
 *   - Hermann et al. (2025) — Med Sci Sports Exerc (PMID 40249908):
 *     Single-set to failure vs. reps-in-reserve: failure produced more hypertrophy.
 *
 * Key thresholds (based on Robinson 2024 dose-response):
 *   RIR 0–1 : Near-failure — maximum hypertrophic stimulus
 *   RIR 2–3 : Highly stimulating — optimal balance stimulus/fatigue for most sets
 *   RIR 4–5 : Moderate — acceptable for strength, sub-optimal for hypertrophy
 *   RIR 6+  : Too far — leaving significant hypertrophy gains on the table
 *
 * Note: For strength goals, RIR matters less (wide range is fine per Robinson 2024).
 * This analytics module is most actionable for users with a bulk/hypertrophy goal.
 */

export type RIRScore = 'optimal' | 'suboptimal' | 'too_far' | 'no_data';

export interface MuscleProximityScore {
  group: MuscleGroup;
  label: string;
  avgRIR: number | null;
  setsWithRIR: number;
  totalWorkingSets: number;
  score: RIRScore;
  scoreLabel: string;
  scoreColor: string;
  bgColor: string;
  borderColor: string;
}

export interface ProximityToFailureResult {
  muscles: MuscleProximityScore[];
  globalAvgRIR: number | null;
  setsWithRIRPct: number;         // % of working sets that have RIR logged
  hasEnoughData: boolean;         // true if ≥10 working sets in window
  hasRIRData: boolean;            // true if any sets have RIR logged
  tooFarCount: number;            // muscles with avg RIR ≥ 5
  suboptimalCount: number;        // muscles with avg RIR 3–4
  optimalCount: number;           // muscles with avg RIR ≤ 2
}

function classifyRIR(avgRIR: number | null): {
  score: RIRScore;
  scoreLabel: string;
  scoreColor: string;
  bgColor: string;
  borderColor: string;
} {
  if (avgRIR === null) {
    return {
      score: 'no_data',
      scoreLabel: 'Geen RIR data',
      scoreColor: 'text-zinc-500',
      bgColor: 'bg-zinc-500/10',
      borderColor: 'border-zinc-500/20',
    };
  }
  if (avgRIR <= 2) {
    return {
      score: 'optimal',
      scoreLabel: 'Optimaal',
      scoreColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    };
  }
  if (avgRIR <= 4) {
    return {
      score: 'suboptimal',
      scoreLabel: 'Matig',
      scoreColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    };
  }
  return {
    score: 'too_far',
    scoreLabel: 'Te weinig intensiteit',
    scoreColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  };
}

/**
 * Analyse proximity-to-failure per muscle group over `daysBack` days.
 * Returns per-muscle average RIR with hypertrophy-relevant scoring.
 */
export function analyzeProximityToFailure(
  workouts: WorkoutLog[],
  daysBack = 28,
): ProximityToFailureResult {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  cutoff.setHours(0, 0, 0, 0);

  // group → { totalSets, setsWithRIR, rirSum }
  const data = new Map<MuscleGroup, { totalSets: number; setsWithRIR: number; rirSum: number }>();
  for (const mg of Object.keys(MUSCLE_GROUPS) as MuscleGroup[]) {
    data.set(mg, { totalSets: 0, setsWithRIR: 0, rirSum: 0 });
  }

  let globalTotal = 0;
  let globalWithRIR = 0;
  let globalRIRSum = 0;

  for (const w of workouts) {
    if (new Date(w.date) < cutoff) continue;
    for (const ex of w.exercises) {
      if (ex.type === 'cardio') continue;
      const mg = getMuscleGroup(ex.name);
      if (!mg) continue;
      const entry = data.get(mg)!;
      for (const s of ex.sets) {
        if (!s.completed || s.isWarmup) continue;
        entry.totalSets++;
        globalTotal++;
        if (s.rir !== undefined && s.rir !== null) {
          entry.setsWithRIR++;
          entry.rirSum += s.rir;
          globalWithRIR++;
          globalRIRSum += s.rir;
        }
      }
    }
  }

  const muscles: MuscleProximityScore[] = [];
  for (const [group, entry] of data.entries()) {
    if (entry.totalSets === 0) continue;
    const avgRIR = entry.setsWithRIR > 0 ? entry.rirSum / entry.setsWithRIR : null;
    muscles.push({
      group,
      label: MUSCLE_GROUPS[group],
      avgRIR,
      setsWithRIR: entry.setsWithRIR,
      totalWorkingSets: entry.totalSets,
      ...classifyRIR(avgRIR),
    });
  }

  // Sort: too_far first, then suboptimal, then optimal, then no_data
  const order: Record<RIRScore, number> = { too_far: 0, suboptimal: 1, optimal: 2, no_data: 3 };
  muscles.sort((a, b) => order[a.score] - order[b.score]);

  const globalAvgRIR = globalWithRIR > 0 ? globalRIRSum / globalWithRIR : null;
  const setsWithRIRPct = globalTotal > 0 ? (globalWithRIR / globalTotal) * 100 : 0;

  return {
    muscles,
    globalAvgRIR,
    setsWithRIRPct,
    hasEnoughData: globalTotal >= 10,
    hasRIRData: globalWithRIR > 0,
    tooFarCount: muscles.filter(m => m.score === 'too_far').length,
    suboptimalCount: muscles.filter(m => m.score === 'suboptimal').length,
    optimalCount: muscles.filter(m => m.score === 'optimal').length,
  };
}
