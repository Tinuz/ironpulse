import { WorkoutLog } from '@/components/context/DataContext';

/**
 * Rep Zone Distribution Analytics
 *
 * Scientific basis: Schoenfeld (2017) — J Strength Cond Res
 * Different rep ranges target different physiological adaptations:
 *   Strength (neural):     1–5 reps  (~>85% 1RM)
 *   Hypertrophy (muscle):  6–20 reps (~65–85% 1RM)
 *   Endurance (metabolic): 21+ reps  (<65% 1RM)
 *
 * Note: research shows hypertrophy occurs across all rep ranges at similar volumes,
 * but lower-rep strength work has greater neural adaptation value.
 */

export type RepZone = 'strength' | 'hypertrophy' | 'endurance';

export interface RepZoneData {
  zone: RepZone;
  sets: number;
  percentage: number;
  totalReps: number;
  totalVolume: number;
}

export interface RepZoneDistribution {
  zones: RepZoneData[];
  totalSets: number;
  recommendation: string | null;
  hasEnoughData: boolean;
}

export const REP_ZONE_CONFIG: Record<RepZone, { label: string; range: string; minReps: number; maxReps: number; color: string; bg: string; border: string }> = {
  strength: {
    label: 'Kracht',
    range: '1–5 reps',
    minReps: 1,
    maxReps: 5,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
  },
  hypertrophy: {
    label: 'Hypertrofie',
    range: '6–20 reps',
    minReps: 6,
    maxReps: 20,
    color: 'text-primary',
    bg: 'bg-primary/20',
    border: 'border-primary/30',
  },
  endurance: {
    label: 'Uithoudingsvermogen',
    range: '21+ reps',
    minReps: 21,
    maxReps: Infinity,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
};

function getRepZone(reps: number): RepZone {
  if (reps <= 5) return 'strength';
  if (reps <= 20) return 'hypertrophy';
  return 'endurance';
}

export function calculateRepZoneDistribution(
  workouts: WorkoutLog[],
  daysBack: number = 28
): RepZoneDistribution {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  cutoff.setHours(0, 0, 0, 0);

  const counts: Record<RepZone, { sets: number; reps: number; volume: number }> = {
    strength: { sets: 0, reps: 0, volume: 0 },
    hypertrophy: { sets: 0, reps: 0, volume: 0 },
    endurance: { sets: 0, reps: 0, volume: 0 },
  };

  for (const w of workouts) {
    if (new Date(w.date) < cutoff) continue;
    for (const ex of w.exercises) {
      if (ex.type === 'cardio') continue;
      for (const s of ex.sets) {
        if (!s.completed || s.isWarmup || !s.reps) continue;
        const zone = getRepZone(s.reps);
        counts[zone].sets += 1;
        counts[zone].reps += s.reps;
        counts[zone].volume += (s.weight || 0) * s.reps;
      }
    }
  }

  const totalSets = counts.strength.sets + counts.hypertrophy.sets + counts.endurance.sets;

  const zones: RepZoneData[] = (['strength', 'hypertrophy', 'endurance'] as RepZone[]).map(zone => ({
    zone,
    sets: counts[zone].sets,
    percentage: totalSets > 0 ? Math.round((counts[zone].sets / totalSets) * 100) : 0,
    totalReps: counts[zone].reps,
    totalVolume: counts[zone].volume,
  }));

  // Simple recommendation based on distribution
  let recommendation: string | null = null;
  if (totalSets >= 10) {
    const hypPct = zones.find(z => z.zone === 'hypertrophy')?.percentage ?? 0;
    const strPct = zones.find(z => z.zone === 'strength')?.percentage ?? 0;
    if (hypPct < 40) {
      recommendation = 'Voeg meer sets in het 6–20 rep-bereik toe voor maximale spiergroei.';
    } else if (strPct < 10) {
      recommendation = 'Overweeg af en toe zware sets (1–5 reps) voor neurale krachtaanpassing.';
    } else {
      recommendation = 'Goede verdeling — je traint zowel kracht als hypertrofie effectief.';
    }
  }

  return { zones, totalSets, recommendation, hasEnoughData: totalSets >= 10 };
}
