import { WorkoutLog } from '@/components/context/DataContext';
import { getMuscleGroup, MuscleGroup, MUSCLE_GROUPS } from './volumeAnalytics';

/**
 * Training Frequency Optimization Analytics
 *
 * Scientific basis:
 *   - Pelland et al. (2026) — Sports Med (PMID 41343037):
 *     Meta-regressions for weekly volume AND frequency on hypertrophy and strength.
 *     Volume × frequency interaction: high weekly sets are most effective when
 *     distributed across multiple sessions per week.
 *
 *   - Schoenfeld et al. (2016) — NSCA J Strength Cond Res:
 *     Training each muscle group ≥2×/week superior to 1×/week for hypertrophy.
 *
 * Key thresholds used here:
 *   ≥15 sets/week + ≤1 session/week → recommend splitting to 2×/week
 *   ≥20 sets/week + ≤1.5 sessions/week → recommend splitting to 3×/week
 *
 * Rationale: above ~15 sets/week in a single session, recovery capacity is
 * challenged within that session, reducing per-set quality. Distributing the
 * same volume across more sessions maintains set quality and increases total
 * weekly mechanical tension.
 */

export interface FrequencyRecommendation {
  group: MuscleGroup;
  label: string;
  avgWeeklySets: number;
  avgWeeklyFrequency: number;    // sessions per week
  idealFrequency: number;        // recommended sessions per week
  setsPerSession: number;        // suggested sets per session at ideal frequency
  priority: 'high' | 'medium';  // high = ≥20 sets in 1 session, medium = ≥15 sets in 1 session
}

export interface FrequencyOptimizationResult {
  recommendations: FrequencyRecommendation[];
  hasEnoughData: boolean;
  weeksAnalyzed: number;
}

/** ISO year-week key for grouping by calendar week */
function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Analyse per-muscle training frequency vs. weekly volume over the last `daysBack` days.
 * Returns muscles where volume is high but frequency is low (splitting opportunity).
 */
export function analyzeFrequencyOptimization(
  workouts: WorkoutLog[],
  daysBack = 28,
): FrequencyOptimizationResult {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  cutoff.setHours(0, 0, 0, 0);

  // group → week → { sets, uniqueDates }
  type WeekData = { sets: number; uniqueDates: Set<string> };
  const muscleWeeks = new Map<MuscleGroup, Map<string, WeekData>>();
  for (const mg of Object.keys(MUSCLE_GROUPS) as MuscleGroup[]) {
    muscleWeeks.set(mg, new Map());
  }

  const allWeeks = new Set<string>();

  for (const w of workouts) {
    const workoutDate = new Date(w.date);
    if (workoutDate < cutoff) continue;
    const wk = weekKey(workoutDate);
    allWeeks.add(wk);
    const dateStr = w.date.split('T')[0];

    for (const ex of w.exercises) {
      if (ex.type === 'cardio') continue;
      const mg = getMuscleGroup(ex.name);
      if (!mg) continue;
      const weekMap = muscleWeeks.get(mg)!;
      if (!weekMap.has(wk)) weekMap.set(wk, { sets: 0, uniqueDates: new Set() });
      const entry = weekMap.get(wk)!;
      const workingSets = ex.sets.filter(s => s.completed && !s.isWarmup).length;
      entry.sets += workingSets;
      entry.uniqueDates.add(dateStr);
    }
  }

  const weeksAnalyzed = allWeeks.size;

  if (weeksAnalyzed === 0) {
    return { recommendations: [], hasEnoughData: false, weeksAnalyzed: 0 };
  }

  const recommendations: FrequencyRecommendation[] = [];

  for (const [group, weekMap] of muscleWeeks.entries()) {
    if (weekMap.size === 0) continue;

    const totalSets = [...weekMap.values()].reduce((s, d) => s + d.sets, 0);
    const totalSessions = [...weekMap.values()].reduce((s, d) => s + d.uniqueDates.size, 0);
    const avgWeeklySets = totalSets / weeksAnalyzed;
    const avgWeeklyFrequency = totalSessions / weeksAnalyzed;

    // Only flag if: significant volume but low frequency
    if (avgWeeklySets < 15 || avgWeeklyFrequency > 1.6) continue;

    const isHigh = avgWeeklySets >= 20;
    const idealFrequency = isHigh ? 3 : 2;
    const setsPerSession = Math.round(avgWeeklySets / idealFrequency);

    recommendations.push({
      group,
      label: MUSCLE_GROUPS[group],
      avgWeeklySets: Math.round(avgWeeklySets * 10) / 10,
      avgWeeklyFrequency: Math.round(avgWeeklyFrequency * 10) / 10,
      idealFrequency,
      setsPerSession,
      priority: isHigh ? 'high' : 'medium',
    });
  }

  // Sort: high priority first, then by most sets/week
  recommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.avgWeeklySets - a.avgWeeklySets;
  });

  return {
    recommendations,
    hasEnoughData: weeksAnalyzed >= 2,
    weeksAnalyzed,
  };
}
