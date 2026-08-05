import { WorkoutLog } from '@/components/context/DataContext';
import { isLightWorkoutSession } from './workoutIntent';

/**
 * Week-over-Week Volume Progression Analytics
 *
 * Scientific basis:
 *   - Kraemer & Ratamess (2004) — Med Sci Sports Exerc: Progressive overload principles
 *   - Gabbett (2016) — Load management: limit increases to <10% per week to minimize injury risk
 *   - Helms et al. (2014) — Mesocycle periodization: volume should climb within a block
 *
 * Shows weekly total volume (kg × reps) for the last N weeks and the % change
 * between consecutive weeks. Flags spikes >10% as high risk.
 */

export interface WeeklyVolumePoint {
  weekLabel: string;    // e.g. "W-5", "W-4" ... "Deze week"
  weekStart: string;    // ISO date
  volume: number;       // total kg × reps
  changePercent: number | null; // vs previous week (null for first point)
  isSpike: boolean;     // change > 10% increase
  isDrop: boolean;      // change < -20% decrease (possible recovery week)
}

export interface WeeklyVolumeProgressionResult {
  weeks: WeeklyVolumePoint[];
  avgWeeklyChange: number | null;  // avg % change across all consecutive pairs
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string | null;
  hasEnoughData: boolean;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function calcWeekVolume(workouts: WorkoutLog[], weekStart: Date): number {
  const weekEnd = addDays(weekStart, 7);
  let total = 0;
  for (const w of workouts) {
    if (w.isDeload || isLightWorkoutSession(w)) continue;
    const d = new Date(w.date);
    if (d >= weekStart && d < weekEnd) {
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

export function calculateWeeklyVolumeProgression(
  workouts: WorkoutLog[],
  weeksBack: number = 8
): WeeklyVolumeProgressionResult {
  const standardWorkouts = workouts.filter(w => !w.isDeload && !isLightWorkoutSession(w));
  const thisMonday = getMondayOf(new Date());

  const weekStarts: Date[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    weekStarts.push(addDays(thisMonday, -i * 7));
  }

  const volumes = weekStarts.map(ws => calcWeekVolume(standardWorkouts, ws));

  const weeks: WeeklyVolumePoint[] = weekStarts.map((ws, i) => {
    const volume = volumes[i];
    const prev = i > 0 ? volumes[i - 1] : null;
    const changePercent = prev !== null && prev > 0
      ? Math.round(((volume - prev) / prev) * 100)
      : null;

    const isSpike = changePercent !== null && changePercent > 10;
    const isDrop = changePercent !== null && changePercent < -20;

    const isCurrentWeek = i === weekStarts.length - 1;
    const label = isCurrentWeek
      ? 'Deze week'
      : `W-${weekStarts.length - 1 - i}`;

    return {
      weekLabel: label,
      weekStart: ws.toISOString().split('T')[0],
      volume,
      changePercent,
      isSpike,
      isDrop,
    };
  });

  // Filter to weeks with actual data
  const activeWeeks = weeks.filter(w => w.volume > 0);
  const hasEnoughData = activeWeeks.length >= 3;

  // Average change
  const changes = weeks.map(w => w.changePercent).filter((v): v is number => v !== null);
  const avgWeeklyChange = changes.length > 0
    ? Math.round(changes.reduce((a, b) => a + b, 0) / changes.length)
    : null;

  // Trend
  let trend: WeeklyVolumeProgressionResult['trend'] = 'stable';
  if (avgWeeklyChange !== null) {
    if (avgWeeklyChange > 3) trend = 'increasing';
    else if (avgWeeklyChange < -3) trend = 'decreasing';
  }

  // Recommendation
  let recommendation: string | null = null;
  const spikeCount = weeks.filter(w => w.isSpike).length;
  const lastWeek = weeks[weeks.length - 1];

  if (spikeCount >= 2) {
    recommendation = 'Meerdere volumepieken gevonden. Bouw volume geleidelijker op (max. 10% per week).';
  } else if (lastWeek?.isSpike) {
    recommendation = `Volumestijging van ${lastWeek.changePercent}% deze week. Dit overschrijdt de veilige grens van 10%.`;
  } else if (trend === 'decreasing' && hasEnoughData) {
    recommendation = 'Volume daalt de afgelopen weken. Zorg dat je progressieve overload handhaaft.';
  } else if (trend === 'increasing' && hasEnoughData) {
    recommendation = 'Goed bezig — je volume bouwt consistent op.';
  }

  return { weeks, avgWeeklyChange, trend, recommendation, hasEnoughData };
}
