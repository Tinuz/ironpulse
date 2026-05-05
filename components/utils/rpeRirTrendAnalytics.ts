import { WorkoutLog } from '@/components/context/DataContext';

/**
 * RPE / RIR Trend Analytics
 *
 * Scientific basis:
 *   - Zourdos et al. (2016) — NSCA J Strength Cond Res: Autoregulation via RPE/RIR
 *   - Helms et al. (2016): RIR-based RPE scale for strength training
 *
 * Key insights:
 *   - Rising RPE at the same (or lower) weight over weeks → fatigue accumulation
 *   - Consistently high RIR (>4) → insufficient intensity, leaving gains on the table
 *   - Consistently low RIR (0–1) → on the edge of failure, may affect recovery
 *   - Ideal working RIR: 1–3 for most working sets
 */

export interface RPERIRDataPoint {
  date: string;
  rpe: number | null;
  rir: number | null;
  weight: number;
  reps: number;
}

export interface ExerciseRPERIRTrend {
  exerciseName: string;
  dataPoints: RPERIRDataPoint[];
  avgRPE: number | null;
  avgRIR: number | null;
  rpeTrend: 'rising' | 'stable' | 'falling' | 'insufficient_data';
  rirTrend: 'rising' | 'stable' | 'falling' | 'insufficient_data';
  insight: string | null;
  hasRPEData: boolean;
  hasRIRData: boolean;
}

export interface RPERIRAnalysis {
  exercises: ExerciseRPERIRTrend[];
  globalAvgRPE: number | null;
  globalAvgRIR: number | null;
  overallFatigueSignal: boolean; // true if multiple exercises show rising RPE
}

/** Simple linear regression slope (positive = rising) */
function slope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (values[i] - yMean), 0);
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function classifySlope(s: number, threshold = 0.15): 'rising' | 'stable' | 'falling' {
  if (s > threshold) return 'rising';
  if (s < -threshold) return 'falling';
  return 'stable';
}

export function analyzeRPERIRTrends(
  workouts: WorkoutLog[],
  daysBack: number = 42,   // 6 weeks
  minDataPoints: number = 3
): RPERIRAnalysis {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  cutoff.setHours(0, 0, 0, 0);

  // Collect per-exercise session summaries (one data point per exercise per workout)
  const exerciseMap = new Map<string, RPERIRDataPoint[]>();

  for (const w of workouts) {
    if (new Date(w.date) < cutoff) continue;
    for (const ex of w.exercises) {
      if (ex.type === 'cardio') continue;
      // Aggregate top sets (completed, non-warmup) for this exercise in this workout
      const workingSets = ex.sets.filter(s => s.completed && !s.isWarmup);
      if (workingSets.length === 0) continue;

      // Use the heaviest set as representative for that session
      const heaviest = workingSets.reduce((best, s) =>
        (s.weight || 0) > (best.weight || 0) ? s : best
      );

      // Average RPE/RIR across all working sets in this session
      const rpeVals = workingSets.map(s => s.rpe).filter((v): v is number => v !== undefined && v !== null);
      const rirVals = workingSets.map(s => s.rir).filter((v): v is number => v !== undefined && v !== null);
      const avgSessionRPE = rpeVals.length > 0 ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : null;
      const avgSessionRIR = rirVals.length > 0 ? rirVals.reduce((a, b) => a + b, 0) / rirVals.length : null;

      const point: RPERIRDataPoint = {
        date: w.date,
        rpe: avgSessionRPE !== null ? Math.round(avgSessionRPE * 10) / 10 : null,
        rir: avgSessionRIR !== null ? Math.round(avgSessionRIR * 10) / 10 : null,
        weight: heaviest.weight || 0,
        reps: heaviest.reps || 0,
      };

      if (!exerciseMap.has(ex.name)) exerciseMap.set(ex.name, []);
      exerciseMap.get(ex.name)!.push(point);
    }
  }

  const exercises: ExerciseRPERIRTrend[] = [];
  let globalRPESum = 0, globalRPECount = 0;
  let globalRIRSum = 0, globalRIRCount = 0;
  let risingRPECount = 0;

  for (const [name, points] of exerciseMap.entries()) {
    // Sort chronologically
    points.sort((a, b) => a.date.localeCompare(b.date));

    const rpePoints = points.map(p => p.rpe).filter((v): v is number => v !== null);
    const rirPoints = points.map(p => p.rir).filter((v): v is number => v !== null);

    const hasRPEData = rpePoints.length >= minDataPoints;
    const hasRIRData = rirPoints.length >= minDataPoints;

    const avgRPE = rpePoints.length > 0 ? Math.round((rpePoints.reduce((a, b) => a + b, 0) / rpePoints.length) * 10) / 10 : null;
    const avgRIR = rirPoints.length > 0 ? Math.round((rirPoints.reduce((a, b) => a + b, 0) / rirPoints.length) * 10) / 10 : null;

    if (avgRPE !== null) { globalRPESum += avgRPE; globalRPECount++; }
    if (avgRIR !== null) { globalRIRSum += avgRIR; globalRIRCount++; }

    const rpeTrend: ExerciseRPERIRTrend['rpeTrend'] = hasRPEData ? classifySlope(slope(rpePoints)) : 'insufficient_data';
    const rirTrend: ExerciseRPERIRTrend['rirTrend'] = hasRIRData ? classifySlope(slope(rirPoints)) : 'insufficient_data';

    if (rpeTrend === 'rising') risingRPECount++;

    // Generate insight
    let insight: string | null = null;
    if (rpeTrend === 'rising' && hasRPEData) {
      insight = 'RPE stijgt — mogelijke vermoeidheidsaccumulatie. Overweeg een herstelweek.';
    } else if (rirTrend === 'rising' && hasRIRData && (avgRIR ?? 0) > 4) {
      insight = `Gemiddeld RIR ${avgRIR} — je laat mogelijk te veel reps in de tank. Verhoog de intensiteit.`;
    } else if (hasRIRData && (avgRIR ?? 10) <= 1) {
      insight = 'Laag RIR — je traint dicht bij falen. Let op voldoende herstel.';
    } else if (rpeTrend === 'falling' && hasRPEData) {
      insight = 'RPE daalt — je wordt sterker of herstelt goed. Goed bezig!';
    }

    exercises.push({ exerciseName: name, dataPoints: points, avgRPE, avgRIR, rpeTrend, rirTrend, insight, hasRPEData, hasRIRData });
  }

  // Sort: exercises with insights first, then by name
  exercises.sort((a, b) => {
    if (a.insight && !b.insight) return -1;
    if (!a.insight && b.insight) return 1;
    return a.exerciseName.localeCompare(b.exerciseName);
  });

  return {
    exercises,
    globalAvgRPE: globalRPECount > 0 ? Math.round((globalRPESum / globalRPECount) * 10) / 10 : null,
    globalAvgRIR: globalRIRCount > 0 ? Math.round((globalRIRSum / globalRIRCount) * 10) / 10 : null,
    overallFatigueSignal: risingRPECount >= 2,
  };
}
