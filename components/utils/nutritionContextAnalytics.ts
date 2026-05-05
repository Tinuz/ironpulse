import { WorkoutLog, NutritionItem, NutritionLog } from '@/components/context/DataContext';

/**
 * Nutrition Workout Context Analytics
 *
 * Generates evidence-based nutrition insights that depend on workout context
 * (training day vs rest day, post-workout timing, goal-adjusted guidance).
 *
 * Scientific foundations:
 *   - Aragon & Schoenfeld (2013), JISSN: post-exercise protein synthesis window (4–6 h)
 *   - Burke et al. (2011), J Sports Sci: CHO + protein for glycogen resynthesis
 *   - Morton et al. (2018), BJSM: protein dose recommendations per goal
 *   - Areta et al. (2013), J Physiol: 0.4 g/kg protein per meal, 4× for maximal MPS
 */

export type NutritionContextInsightType =
  | 'training_day_carbs'    // On training day: higher carbs beneficial
  | 'post_workout_protein'  // Trained today: check protein sufficiency
  | 'rest_day_deficit'      // Rest day + cut goal: good time for deficit
  | 'low_protein_warning'   // Current protein already behind target
  | 'yesterday_recovery'    // Trained yesterday: glycogen still replenishing
  | 'high_acwr_rest_day';   // High ACWR: rest day nutrition guidance

export type NutritionContextSeverity = 'info' | 'warning' | 'tip';

export interface NutritionContextInsight {
  type: NutritionContextInsightType;
  severity: NutritionContextSeverity;
  title: string;
  message: string;
  reference?: string;
}

export interface NutritionContextResult {
  trainedToday: boolean;
  trainedYesterday: boolean;
  insights: NutritionContextInsight[];
}

/**
 * Generate training-day context insights for the nutrition view.
 *
 * @param history      - all workout logs
 * @param items        - food items logged for targetDate
 * @param targetDate   - date to analyse (ISO YYYY-MM-DD)
 * @param targets      - goal-adjusted macro targets for targetDate
 * @param fitnessGoal  - user's current fitness goal
 */
export function generateNutritionContextInsights(
  history: WorkoutLog[],
  items: NutritionItem[],
  targetDate: string,
  targets: { calories: number; protein: number; carbs: number },
  fitnessGoal: 'bulk' | 'cut' | 'maintain',
): NutritionContextResult {
  const insights: NutritionContextInsight[] = [];

  // ── Determine training context ────────────────────────────
  const yesterday = getPreviousDay(targetDate);
  const trainedToday = history.some(w => w.date === targetDate);
  const trainedYesterday = history.some(w => w.date === yesterday);

  // ── Current intake totals ─────────────────────────────────
  const totalProtein = items.reduce((s, i) => s + (i.protein || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (i.carbs || 0), 0);

  // ── Training day: carb insight ────────────────────────────
  // Burke et al. 2011 — carbohydrate intake on training days supports
  // performance and glycogen resynthesis
  if (trainedToday) {
    const carbPct = targets.carbs > 0 ? (totalCarbs / targets.carbs) * 100 : 0;
    if (carbPct < 60) {
      insights.push({
        type: 'training_day_carbs',
        severity: 'warning',
        title: 'Trainingdag: koolhydraten laag',
        message: `Je hebt vandaag getraind maar nog maar ${Math.round(carbPct)}% van je koolhydraatdoel gehaald. Koolhydraten accelereren glycogeenherstel na krachttraining.`,
        reference: 'Burke et al. 2011, J Sports Sci',
      });
    } else {
      insights.push({
        type: 'training_day_carbs',
        severity: 'info',
        title: 'Trainingdag: koolhydraten goed',
        message: `Goed bezig — je koolhydraatinname ondersteunt glycogeenherstel vandaag.`,
        reference: 'Burke et al. 2011, J Sports Sci',
      });
    }
  }

  // ── Training day: post-workout protein check ──────────────
  // Aragon & Schoenfeld 2013 — protein synthesis remains elevated for 4–6 h
  // post-exercise; total daily protein matters most
  if (trainedToday) {
    const proteinPct = targets.protein > 0 ? (totalProtein / targets.protein) * 100 : 0;
    if (proteinPct < 70) {
      insights.push({
        type: 'post_workout_protein',
        severity: 'warning',
        title: 'Haal je eiwitdoel',
        message: `Na de training is je proteïnesynthese verhoogd (4–6 uur). Je hebt nog ${Math.round(targets.protein - totalProtein)} g eiwit te gaan vandaag.`,
        reference: 'Aragon & Schoenfeld 2013, JISSN',
      });
    }
  }

  // ── Yesterday workout: glycogen replenishment tip ─────────
  // Burke et al. 2011 — recovery extends into the day after training
  if (!trainedToday && trainedYesterday) {
    const carbPct = targets.carbs > 0 ? (totalCarbs / targets.carbs) * 100 : 0;
    if (carbPct < 50) {
      insights.push({
        type: 'yesterday_recovery',
        severity: 'tip',
        title: 'Hersteldag: glycogeen aanvullen',
        message: `Gisteren getraind? Je spierglycogeen is nog aan het herstellen. Een koolhydraatrijke maaltijd vandaag helpt het herstel te voltooien.`,
        reference: 'Burke et al. 2011, J Sports Sci',
      });
    }
  }

  // ── Rest day + cut: good moment for calorie deficit ───────
  // On rest days during a cut, TDEE is lower anyway (no exercise calorie burn
  // on top), making it easier to stay in a meaningful deficit without
  // impairing recovery from the previous session
  if (!trainedToday && !trainedYesterday && fitnessGoal === 'cut') {
    insights.push({
      type: 'rest_day_deficit',
      severity: 'tip',
      title: 'Rustdag: ideaal voor tekort',
      message: `Op rustdagen zonder recente training is het makkelijker om in je calorietekort te blijven zonder herstel te belemmeren.`,
      reference: 'Slater & Phillips 2011, J Sports Sci',
    });
  }

  // ── Low protein warning (general, any day) ────────────────
  // Morton et al. 2018 — protein is the primary driver of muscle retention
  const proteinPct = targets.protein > 0 ? (totalProtein / targets.protein) * 100 : 0;
  if (
    proteinPct < 50 &&
    !insights.some(i => i.type === 'post_workout_protein')
  ) {
    insights.push({
      type: 'low_protein_warning',
      severity: 'warning',
      title: 'Eiwit achter op schema',
      message: `Je hebt nog ${Math.round(targets.protein - totalProtein)} g eiwit te gaan. Spierbehoud bij ${fitnessGoal === 'cut' ? 'een tekort' : 'krachttraining'} vereist voldoende dagelijks eiwit.`,
      reference: 'Morton et al. 2018, BJSM',
    });
  }

  return {
    trainedToday,
    trainedYesterday,
    insights,
  };
}

/**
 * Returns the ISO date string for the day before the given date.
 */
function getPreviousDay(isoDate: string): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Weekly protein consistency ──────────────────────────────

export interface ProteinConsistencyDay {
  date: string;
  protein: number;
  target: number;
  met: boolean; // ≥ 80% of target
  hasLog: boolean;
}

export interface ProteinConsistencyResult {
  days: ProteinConsistencyDay[];
  /** % of logged days in the last 7 where protein ≥ 80% of target */
  consistencyScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Analyse protein consistency over the last `daysBack` days.
 * Uses 80% of target as the "met" threshold (practical adherence buffer).
 * Scientific basis: Areta et al. 2013 — consistent daily protein distribution
 * significantly outperforms infrequent bolus intake for MPS.
 *
 * @param nutritionLogs - all nutrition logs
 * @param proteinTarget - daily protein target in grams
 * @param daysBack      - window to analyse (default 14, shown: last 7)
 */
export function analyseProteinConsistency(
  nutritionLogs: NutritionLog[],
  proteinTarget: number,
  daysBack = 14,
): ProteinConsistencyResult {
  const today = new Date();
  const days: ProteinConsistencyDay[] = [];

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const log = nutritionLogs.find(l => l.date === dateStr);
    const protein = log ? log.items.reduce((s, item) => s + (item.protein || 0), 0) : 0;
    const hasLog = !!log;
    days.push({
      date: dateStr,
      protein,
      target: proteinTarget,
      met: hasLog && protein >= proteinTarget * 0.8,
      hasLog,
    });
  }

  // Consistency score: % of logged days in last 7 that met target
  const last7 = days.slice(-7);
  const loggedDays = last7.filter(d => d.hasLog);
  const metDays = last7.filter(d => d.met);
  const consistencyScore =
    loggedDays.length > 0 ? Math.round((metDays.length / loggedDays.length) * 100) : 0;

  // Trend: compare first half vs second half of the 14-day window
  const firstHalf = days.slice(0, 7).filter(d => d.hasLog);
  const secondHalf = days.slice(7).filter(d => d.hasLog);
  const firstScore = firstHalf.length > 0
    ? firstHalf.filter(d => d.met).length / firstHalf.length
    : 0;
  const secondScore = secondHalf.length > 0
    ? secondHalf.filter(d => d.met).length / secondHalf.length
    : 0;
  const diff = secondScore - firstScore;
  const trend =
    diff > 0.15 ? 'improving' :
    diff < -0.15 ? 'declining' :
    'stable';

  return { days, consistencyScore, trend };
}
