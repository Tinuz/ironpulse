import type { WorkoutLog, RestDay } from '@/components/context/DataContext';
import { isLightWorkoutIntent } from './workoutIntent';

/**
 * Acute:Chronic Workload Ratio (ACWR)
 *
 * Scientific basis: Banister et al. (1975), Gabbett (2016) — British Journal of Sports Medicine
 * Uses training volume (kg × reps) as the load metric for strength training.
 *
 * Zones:
 *  < 0.80  → Undertraining / higher relative injury risk
 *  0.80–1.30 → Sweet spot / lowest injury risk
 *  1.30–1.50 → Caution
 *  > 1.50  → Danger zone / highest injury risk
 */

export type ACWRZone = 'undertraining' | 'optimal' | 'caution' | 'danger';

export interface ACWRResult {
  acwr: number;
  zone: ACWRZone;
  acuteLoad: number;   // total volume last 7 days
  chronicLoad: number; // 4-week average weekly volume
  weeklyLoads: number[]; // volumes for each of the last 4 weeks (oldest → newest)
  hasEnoughData: boolean; // false if < 2 weeks of data
  /**
   * True when ≥4 of the 7 acute days are marked as vacation.
   * The widget uses this to suppress the "undertraining" alarm.
   */
  onVacation: boolean;
}

function weeklyVolume(workouts: WorkoutLog[], startDate: Date, endDate: Date): number {
  let total = 0;
  for (const w of workouts) {
    const d = new Date(w.date);
    if (d >= startDate && d < endDate) {
      for (const ex of w.exercises) {
        if (ex.type === 'cardio') continue;
        for (const s of ex.sets) {
          if (s.completed && !s.isWarmup) {
            total += (s.weight || 0) * (s.reps || 0);
          }
        }
      }
    }
  }
  return total;
}

export function calculateACWR(workouts: WorkoutLog[], restDays: RestDay[] = []): ACWRResult {
  const standardWorkouts = workouts.filter(w => !w.isDeload && !isLightWorkoutIntent(w.trainingIntent));
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // Acute = last 7 days
  const acuteStart = new Date(now);
  acuteStart.setDate(acuteStart.getDate() - 6);
  acuteStart.setHours(0, 0, 0, 0);
  const acuteLoad = weeklyVolume(standardWorkouts, acuteStart, new Date(now.getTime() + 1));

  // Chronic = 4-week rolling average (last 28 days split into 4 × 7-day windows)
  const weeklyLoads: number[] = [];
  for (let i = 3; i >= 0; i--) {
    const wEnd = new Date(now);
    wEnd.setDate(wEnd.getDate() - i * 7);
    const wStart = new Date(wEnd);
    wStart.setDate(wStart.getDate() - 6);
    wStart.setHours(0, 0, 0, 0);
    wEnd.setHours(23, 59, 59, 999);
    weeklyLoads.push(weeklyVolume(standardWorkouts, wStart, new Date(wEnd.getTime() + 1)));
  }

  // The most recent week IS the acute load (already in weeklyLoads[3])
  const chronicLoad =
    weeklyLoads.length > 0
      ? weeklyLoads.reduce((a, b) => a + b, 0) / weeklyLoads.length
      : 0;

  // Need at least 2 weeks with non-zero load for meaningful data
  const nonZeroWeeks = weeklyLoads.filter(v => v > 0).length;
  const hasEnoughData = nonZeroWeeks >= 2;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  // Vacation detection: ≥4 of the last 7 days are marked as vacation.
  // When true, the widget suppresses the "undertraining" alarm — the user
  // is intentionally away from training (Shephard & Aoyagi 2009: planned rest
  // is not equivalent to unplanned under-recovery).
  const vacationSet = new Set(
    restDays
      .filter(r => r.type === 'vacation')
      .map(r => r.date),
  );
  let vacationDaysInAcuteWindow = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (vacationSet.has(key)) vacationDaysInAcuteWindow++;
  }
  const onVacation = vacationDaysInAcuteWindow >= 4;

  let zone: ACWRZone;
  if (acwr < 0.8) zone = 'undertraining';
  else if (acwr <= 1.3) zone = 'optimal';
  else if (acwr <= 1.5) zone = 'caution';
  else zone = 'danger';

  return { acwr, zone, acuteLoad, chronicLoad, weeklyLoads, hasEnoughData, onVacation };
}

export const ACWR_ZONES: Record<ACWRZone, { label: string; color: string; bg: string; border: string; description: string }> = {
  undertraining: {
    label: 'Onder training',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    description: 'Je trainingsvolume is aan de lage kant deze week. Verhoog geleidelijk.',
  },
  optimal: {
    label: 'Optimaal',
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    border: 'border-green-500/30',
    description: 'Je belasting ligt in de sweet spot. Ideaal voor progressie én herstel.',
  },
  caution: {
    label: 'Let op',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/30',
    description: 'Je belasting is hoog t.o.v. je chronische gemiddelde. Houd herstel in de gaten.',
  },
  danger: {
    label: 'Gevarenzone',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    description: 'Sterk verhoogd blessurerisico. Overweeg een hersteldag of deload.',
  },
};
