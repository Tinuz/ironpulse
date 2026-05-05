import { WorkoutLog } from '@/components/context/DataContext';
import { getMuscleGroup, MuscleGroup, MUSCLE_GROUPS } from './volumeAnalytics';

/**
 * Volume Landmarks per Muscle Group
 *
 * Scientific basis: RP Strength / Israetel & Hoffman (Renaissance Periodization)
 * Based on peer-reviewed research on weekly set volume for hypertrophy.
 *
 * Landmarks (direct sets per muscle per week):
 *   MV  (Maintenance Volume):      ~6 sets/week  — maintain existing muscle
 *   MEV (Minimum Effective Volume): ~8 sets/week  — minimum to stimulate growth
 *   MAV (Maximum Adaptive Volume):  10–20 sets/week — optimal growth range
 *   MRV (Maximum Recoverable Volume): ~20+ sets/week — recovery fails above this
 *
 * These are population averages; individual variation is high.
 */

export interface VolumeLandmark {
  mv: number;   // Maintenance Volume (sets/week)
  mev: number;  // Minimum Effective Volume
  mavLow: number;  // MAV lower bound
  mavHigh: number; // MAV upper bound
  mrv: number;  // Maximum Recoverable Volume
}

// Muscle-specific landmarks (some muscles recover faster/need more volume)
const LANDMARKS: Record<MuscleGroup, VolumeLandmark> = {
  chest:     { mv: 6, mev: 8,  mavLow: 10, mavHigh: 18, mrv: 22 },
  back:      { mv: 6, mev: 10, mavLow: 12, mavHigh: 20, mrv: 25 },
  shoulders: { mv: 6, mev: 8,  mavLow: 10, mavHigh: 20, mrv: 26 },
  legs:      { mv: 6, mev: 8,  mavLow: 12, mavHigh: 20, mrv: 25 },
  arms:      { mv: 4, mev: 6,  mavLow: 8,  mavHigh: 18, mrv: 26 },
  abs:       { mv: 4, mev: 6,  mavLow: 8,  mavHigh: 16, mrv: 20 },
  glutes:    { mv: 4, mev: 6,  mavLow: 8,  mavHigh: 16, mrv: 20 },
  calves:    { mv: 6, mev: 8,  mavLow: 10, mavHigh: 16, mrv: 20 },
};

export type VolumeStatus = 'below_mv' | 'mv_to_mev' | 'mav' | 'approaching_mrv' | 'at_mrv';

export interface MuscleVolumeLandmark {
  group: MuscleGroup;
  label: string;
  weeklySets: number;
  landmarks: VolumeLandmark;
  status: VolumeStatus;
  statusLabel: string;
  statusColor: string;
  fillPct: number; // 0-100 for progress bar (capped at MRV)
}

export interface VolumeLandmarksResult {
  muscles: MuscleVolumeLandmark[];
  hasEnoughData: boolean;
}

function getStatus(sets: number, lm: VolumeLandmark): VolumeStatus {
  if (sets < lm.mv) return 'below_mv';
  if (sets < lm.mev) return 'mv_to_mev';
  if (sets < lm.mavHigh) return 'mav';
  if (sets < lm.mrv) return 'approaching_mrv';
  return 'at_mrv';
}

const STATUS_META: Record<VolumeStatus, { label: string; color: string }> = {
  below_mv:        { label: 'Te laag',  color: 'text-zinc-500' },
  mv_to_mev:       { label: 'Onderhoud', color: 'text-blue-400' },
  mav:             { label: 'Optimaal', color: 'text-green-400' },
  approaching_mrv: { label: 'Hoog',     color: 'text-yellow-400' },
  at_mrv:          { label: 'Max.',     color: 'text-red-400' },
};

/**
 * Count completed non-warmup sets per muscle group in the last 7 days (current week).
 */
export function calculateVolumeLandmarks(workouts: WorkoutLog[]): VolumeLandmarksResult {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);

  const setCounts: Partial<Record<MuscleGroup, number>> = {};

  for (const w of workouts) {
    if (new Date(w.date) < cutoff) continue;
    for (const ex of w.exercises) {
      if (ex.type === 'cardio') continue;
      const mg = getMuscleGroup(ex.name, ex.muscleGroup);
      if (!mg) continue;
      for (const s of ex.sets) {
        if (s.completed && !s.isWarmup) {
          setCounts[mg] = (setCounts[mg] ?? 0) + 1;
        }
      }
    }
  }

  const muscles: MuscleVolumeLandmark[] = (Object.keys(MUSCLE_GROUPS) as MuscleGroup[]).map(group => {
    const weeklySets = setCounts[group] ?? 0;
    const lm = LANDMARKS[group];
    const status = getStatus(weeklySets, lm);
    const fillPct = Math.min(100, Math.round((weeklySets / lm.mrv) * 100));
    return {
      group,
      label: MUSCLE_GROUPS[group],
      weeklySets,
      landmarks: lm,
      status,
      statusLabel: STATUS_META[status].label,
      statusColor: STATUS_META[status].color,
      fillPct,
    };
  });

  // Only show muscles that have been trained at least once OR are active targets
  const hasEnoughData = Object.values(setCounts).some(v => (v ?? 0) > 0);

  return { muscles, hasEnoughData };
}

export { LANDMARKS, STATUS_META };
