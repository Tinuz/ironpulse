import { WorkoutLog } from '@/components/context/DataContext';

/**
 * Agonist:Antagonist Muscle Balance Ratios
 *
 * Scientific basis:
 *   - Kolber & Beekhuizen (2007) — J Strength Cond Res
 *   - Ratamess et al. (2009) — NSCA guidelines
 *   - Cools et al. (2016) — Shoulder muscle balance
 *
 * Key ratios for injury prevention and balanced development:
 *   1. Push:Pull (chest+shoulders vs back) — ideaal ≥ 1:1, liefst 1:1.5 voor schouderbalans
 *   2. Quad:Hip-hinge (squats vs deadlifts/RDL) — ideaal ~1:1
 *   3. Horizontal push:Vertical push (bench vs OHP) — ideaal ~2:1
 *
 * Imbalance threshold: >30% verschil = aandacht nodig, >50% = waarschuwing
 */

export type BalanceStatus = 'balanced' | 'slight_imbalance' | 'significant_imbalance';

export interface MuscleBalanceRatio {
  id: string;
  name: string;
  agonistLabel: string;
  antagonistLabel: string;
  agonistVolume: number;  // kg × reps
  antagonistVolume: number;
  ratio: number;           // agonist / antagonist (>1 = agonist dominates)
  idealRatio: number;      // target ratio
  idealLabel: string;
  status: BalanceStatus;
  recommendation: string | null;
  hasEnoughData: boolean;
}

export interface MuscleBalanceResult {
  ratios: MuscleBalanceRatio[];
  overallStatus: BalanceStatus;
}

// Keyword sets for classifying exercises
const PUSH_KEYWORDS = ['bench', 'bankdruk', 'chest', 'push', 'dip', 'fly', 'flye', 'pec', 'press'];
const PULL_KEYWORDS = ['row', 'pull', 'lat', 'chin', 'face pull', 'cable row', 'seated row', 'bent', 'trekken', 'pulldown'];
const QUAD_KEYWORDS = ['squat', 'leg press', 'leg extension', 'hack squat', 'lunge', 'step up', 'front squat', 'beunsquat', 'split squat'];
const HIP_KEYWORDS = ['deadlift', 'rdl', 'romanian', 'hip hinge', 'good morning', 'hip thrust', 'glute bridge', 'sumo', 'stiff leg'];
const H_PUSH_KEYWORDS = ['bench', 'bankdruk', 'chest press', 'push up', 'dip', 'incline', 'decline', 'fly'];
const V_PUSH_KEYWORDS = ['overhead press', 'ohp', 'shoulder press', 'military press', 'arnold', 'pike', 'z press', 'landmine press'];

function matchesKeywords(name: string, keywords: string[]): boolean {
  const n = name.toLowerCase();
  return keywords.some(kw => n.includes(kw));
}

function computeVolume(workouts: WorkoutLog[], daysBack: number, matchFn: (name: string) => boolean): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  cutoff.setHours(0, 0, 0, 0);

  let total = 0;
  for (const w of workouts) {
    if (new Date(w.date) < cutoff) continue;
    for (const ex of w.exercises) {
      if (ex.type === 'cardio') continue;
      if (!matchFn(ex.name)) continue;
      for (const s of ex.sets) {
        if (s.completed && !s.isWarmup) {
          total += (s.weight || 0) * (s.reps || 0);
        }
      }
    }
  }
  return total;
}

function getStatus(actualRatio: number, idealRatio: number): BalanceStatus {
  const deviation = Math.abs(actualRatio - idealRatio) / idealRatio;
  if (deviation < 0.2) return 'balanced';
  if (deviation < 0.4) return 'slight_imbalance';
  return 'significant_imbalance';
}

export const BALANCE_STATUS_META: Record<BalanceStatus, { label: string; color: string; bg: string; border: string }> = {
  balanced:              { label: 'In balans',    color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30' },
  slight_imbalance:      { label: 'Lichte disbalans', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
  significant_imbalance: { label: 'Disbalans',    color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30' },
};

export function calculateMuscleBalanceRatios(
  workouts: WorkoutLog[],
  daysBack: number = 28
): MuscleBalanceResult {
  // 1. Push : Pull
  const pushVol = computeVolume(workouts, daysBack, n => matchesKeywords(n, PUSH_KEYWORDS));
  const pullVol = computeVolume(workouts, daysBack, n => matchesKeywords(n, PULL_KEYWORDS));

  // 2. Quad : Hip-hinge
  const quadVol = computeVolume(workouts, daysBack, n => matchesKeywords(n, QUAD_KEYWORDS));
  const hipVol  = computeVolume(workouts, daysBack, n => matchesKeywords(n, HIP_KEYWORDS));

  // 3. Horizontal push : Vertical push
  const hPushVol = computeVolume(workouts, daysBack, n => matchesKeywords(n, H_PUSH_KEYWORDS));
  const vPushVol = computeVolume(workouts, daysBack, n => matchesKeywords(n, V_PUSH_KEYWORDS));

  const ratioData: Omit<MuscleBalanceRatio, 'status' | 'recommendation' | 'hasEnoughData'>[] = [
    {
      id: 'push_pull',
      name: 'Push : Pull',
      agonistLabel: 'Push (borst + schouders)',
      antagonistLabel: 'Pull (rug)',
      agonistVolume: pushVol,
      antagonistVolume: pullVol,
      ratio: pullVol > 0 ? pushVol / pullVol : 0,
      idealRatio: 0.8,  // Pull should be ≥ push for shoulder health
      idealLabel: '0.8–1.0',
    },
    {
      id: 'quad_hip',
      name: 'Quad : Hip-hinge',
      agonistLabel: 'Quad-dominant (squat, leg press)',
      antagonistLabel: 'Hip-dominant (deadlift, RDL)',
      agonistVolume: quadVol,
      antagonistVolume: hipVol,
      ratio: hipVol > 0 ? quadVol / hipVol : 0,
      idealRatio: 1.0,
      idealLabel: '0.8–1.2',
    },
    {
      id: 'h_v_push',
      name: 'H-push : V-push',
      agonistLabel: 'Horizontaal (bench press)',
      antagonistLabel: 'Verticaal (OHP)',
      agonistVolume: hPushVol,
      antagonistVolume: vPushVol,
      ratio: vPushVol > 0 ? hPushVol / vPushVol : 0,
      idealRatio: 2.0,
      idealLabel: '1.5–2.5',
    },
  ];

  const ratios: MuscleBalanceRatio[] = ratioData.map(r => {
    const hasEnoughData = r.agonistVolume > 0 || r.antagonistVolume > 0;
    const status = hasEnoughData ? getStatus(r.ratio, r.idealRatio) : 'balanced';

    let recommendation: string | null = null;
    if (hasEnoughData && status !== 'balanced') {
      if (r.id === 'push_pull') {
        recommendation = r.ratio > r.idealRatio
          ? 'Meer rug-oefeningen (rows, pull-ups) toevoegen voor schouderbalans.'
          : null;
      } else if (r.id === 'quad_hip') {
        recommendation = r.ratio > 1.3
          ? 'Meer hip-hinge werk (deadlift, RDL) voor achterste ketenbalans.'
          : r.ratio < 0.7
          ? 'Meer quad-dominant werk (squats) voor beenbalans.'
          : null;
      } else if (r.id === 'h_v_push') {
        recommendation = r.ratio < 1.5
          ? 'Verhoog OHP-volume of verminder bench ten opzichte van OHP.'
          : r.ratio > 3
          ? 'Meer overhead pressing (OHP, Arnold press) voor schouderkracht.'
          : null;
      }
    }

    return { ...r, status, recommendation, hasEnoughData };
  });

  const overallStatus = ratios.some(r => r.status === 'significant_imbalance')
    ? 'significant_imbalance'
    : ratios.some(r => r.status === 'slight_imbalance')
    ? 'slight_imbalance'
    : 'balanced';

  return { ratios, overallStatus };
}
