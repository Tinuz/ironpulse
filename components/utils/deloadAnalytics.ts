import { WorkoutLog } from '@/components/context/DataContext';
import { calculateWeeklySummary } from './weeklyAnalytics';
import { detectAllPlateaus } from './plateauDetection';
import { isCompoundExercise } from './exerciseClassification';

/**
 * Deload recommendation data structure
 */
export interface DeloadRecommendation {
  shouldDeload: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  weeksOfHighVolume: number;
  signals: DeloadSignal[];
  recommendation: string;
  deloadProtocol?: DeloadProtocol;
}

export interface DeloadSignal {
  type: 'volume_decline' | 'performance_decline' | 'accumulated_fatigue' | 'multiple_plateaus' | 'overreaching' | 'muscle_group_overload';
  severity: 'low' | 'medium' | 'high';
  description: string;
  muscleGroup?: string; // Specific muscle group affected
}

export interface DeloadProtocol {
  volumeReduction: number; // percentage (e.g., 40 for 40% reduction)
  intensityReduction: number; // percentage
  durationWeeks: number;
  suggestions: string[];
  muscleGroupAdvice?: Record<string, string>; // Muscle-specific deload advice
}

/**
 * Detect if deload week is needed
 * Excludes existing deload workouts from analysis
 */
export function detectDeloadNeed(
  workouts: WorkoutLog[],
  weeksToAnalyze: number = 6
): DeloadRecommendation {
  // Exclude deload workouts from fatigue analysis
  const nonDeloadWorkouts = workouts.filter(w => !w.isDeload);
  
  const signals: DeloadSignal[] = [];
  
  // Get weekly summaries for trend analysis
  const weeklySummaries = [];
  for (let i = 0; i < weeksToAnalyze; i++) {
    weeklySummaries.push(calculateWeeklySummary(nonDeloadWorkouts, [], -i));
  }
  weeklySummaries.reverse(); // Oldest first
  
  // Signal 1: Volume declining trend (fatigue)
  const volumeDeclineSignal = detectVolumeDecline(weeklySummaries);
  if (volumeDeclineSignal) signals.push(volumeDeclineSignal);
  
  // Signal 2: Performance decline (decreasing weights despite effort)
  const performanceSignal = detectPerformanceDecline(nonDeloadWorkouts);
  if (performanceSignal) signals.push(performanceSignal);
  
  // Signal 3: Accumulated high volume (4+ weeks straight)
  const fatigueSignal = detectAccumulatedFatigue(weeklySummaries);
  if (fatigueSignal) signals.push(fatigueSignal);
  
  // Signal 4: Multiple exercises plateaued simultaneously
  const plateauSignal = detectMultiplePlateaus(nonDeloadWorkouts);
  if (plateauSignal) signals.push(plateauSignal);
  
  // Signal 5: Overreaching (volume spike followed by drop)
  const overreachingSignal = detectOverreaching(weeklySummaries);
  if (overreachingSignal) signals.push(overreachingSignal);
  
  // Signal 6: Muscle group specific overload (NEW - uses granular muscle groups!)
  const muscleGroupSignals = detectMuscleGroupOverload(nonDeloadWorkouts, weeksToAnalyze);
  signals.push(...muscleGroupSignals);
  
  // Calculate urgency based on signals
  const { shouldDeload, urgency } = calculateUrgency(signals);
  
  // Count weeks of high volume
  const weeksOfHighVolume = countHighVolumeWeeks(weeklySummaries);
  
  // Generate recommendation
  const recommendation = generateRecommendation(signals, urgency);
  
  // Generate deload protocol if needed
  const deloadProtocol = shouldDeload 
    ? generateDeloadProtocol(urgency, weeksOfHighVolume, nonDeloadWorkouts)
    : undefined;
  
  return {
    shouldDeload,
    urgency,
    weeksOfHighVolume,
    signals,
    recommendation,
    deloadProtocol
  };
}

/**
 * Detect declining volume trend (sign of accumulated fatigue)
 */
function detectVolumeDecline(weeklySummaries: any[]): DeloadSignal | null {
  // Skip weeks with no training (vacation, planned rest) — they are not fatigue signals
  const activeWeeks = weeklySummaries.filter(w => w.stats.totalWorkouts >= 1);
  if (activeWeeks.length < 3) return null;

  const recentWeeks = activeWeeks.slice(-3);
  const volumes = recentWeeks.map(w => w.stats.totalVolume);
  
  // Check if each week is lower than previous
  let consecutiveDeclines = 0;
  for (let i = 1; i < volumes.length; i++) {
    if (volumes[i] < volumes[i - 1] * 0.95) { // 5% decline threshold
      consecutiveDeclines++;
    }
  }
  
  if (consecutiveDeclines >= 2) {
    const totalDecline = ((volumes[0] - volumes[volumes.length - 1]) / volumes[0]) * 100;
    
    return {
      type: 'volume_decline',
      severity: totalDecline > 20 ? 'high' : totalDecline > 10 ? 'medium' : 'low',
      description: `Volume gedaald met ${totalDecline.toFixed(0)}% over 3 weken - mogelijk vermoeidheid`
    };
  }
  
  return null;
}

/**
 * Detect performance decline (weights going down)
 */
function detectPerformanceDecline(workouts: WorkoutLog[]): DeloadSignal | null {
  if (workouts.length < 6) return null;
  
  // Check recent 6 workouts vs previous 6
  const recentWorkouts = workouts.slice(0, 6);
  const previousWorkouts = workouts.slice(6, 12);
  
  if (previousWorkouts.length < 3) return null;
  
  const recentAvgWeight = calculateAverageWeight(recentWorkouts);
  const previousAvgWeight = calculateAverageWeight(previousWorkouts);
  
  if (recentAvgWeight < previousAvgWeight * 0.95) {
    const decline = ((previousAvgWeight - recentAvgWeight) / previousAvgWeight) * 100;
    
    return {
      type: 'performance_decline',
      severity: decline > 10 ? 'high' : 'medium',
      description: `Gemiddeld gewicht ${decline.toFixed(0)}% lager dan vorige periode`
    };
  }
  
  return null;
}

/**
 * Calculate average weight across all sets in workouts
 */
function calculateAverageWeight(workouts: WorkoutLog[]): number {
  let totalWeight = 0;
  let totalSets = 0;
  
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.weight > 0) {
          totalWeight += set.weight;
          totalSets++;
        }
      });
    });
  });
  
  return totalSets > 0 ? totalWeight / totalSets : 0;
}

/**
 * Detect accumulated fatigue (high volume for 3+ recent weeks vs older baseline)
 */
function detectAccumulatedFatigue(weeklySummaries: any[]): DeloadSignal | null {
  // Skip weeks with no training — including them lowers the baseline artificially
  const activeWeeks = weeklySummaries.filter(w => w.stats.totalWorkouts >= 1);
  if (activeWeeks.length < 4) return null;

  // Use oldest available weeks as baseline, most recent 3 as "recent load"
  const baselineWeeks = activeWeeks.slice(0, Math.max(1, activeWeeks.length - 3));
  const recentWeeks = activeWeeks.slice(-3);

  const baselineAvg = baselineWeeks.reduce((sum: number, w: any) => sum + w.stats.totalVolume, 0) / baselineWeeks.length;

  // A week counts as "high volume" if it's >15% above baseline and has >=2 workouts
  const highVolumeWeeks = recentWeeks.filter((w: any) =>
    baselineAvg > 0
      ? w.stats.totalVolume > baselineAvg * 1.15 && w.stats.totalWorkouts >= 2
      : w.stats.totalWorkouts >= 3
  ).length;

  if (highVolumeWeeks >= 3) {
    return {
      type: 'accumulated_fatigue',
      severity: 'high',
      description: `${highVolumeWeeks} weken achtereen hoog volume boven baseline - tijd voor herstel`
    };
  }

  if (highVolumeWeeks >= 2) {
    return {
      type: 'accumulated_fatigue',
      severity: 'medium',
      description: `${highVolumeWeeks} weken boven baseline volume - vermoeidheid opbouwen`
    };
  }

  return null;
}

/**
 * Detect multiple plateaus (systemic fatigue).
 *
 * Science (Bannister 1975 fitness-fatigue model; Zatsiorsky & Kraemer 2006):
 * Only compound lifts stagnating together indicates systemic fatigue.
 * Isolation exercises (lateral raise, curl, extension, etc.) reach their
 * ceiling due to accommodation — not because the body needs rest.
 * Counting isolation plateaus here would trigger false deload recommendations.
 */
function detectMultiplePlateaus(workouts: WorkoutLog[]): DeloadSignal | null {
  const allPlateaus = detectAllPlateaus(workouts, 3);

  // Filter to compound lifts only — isolation plateaus ≠ systemic fatigue
  const compoundPlateaus = allPlateaus.filter(p => isCompoundExercise(p.exerciseName));

  if (compoundPlateaus.length >= 3) {
    const severePlateaus = compoundPlateaus.filter(p => p.weeksStagnant >= 3).length;

    return {
      type: 'multiple_plateaus',
      severity: severePlateaus >= 2 ? 'high' : 'medium',
      description: `${compoundPlateaus.length} compound oefeningen gestagneerd - mogelijk systemische vermoeidheid`
    };
  }

  return null;
}

/**
 * Detect overreaching (volume spike then crash)
 */
function detectOverreaching(weeklySummaries: any[]): DeloadSignal | null {
  // Skip weeks with no training — vacation weeks would falsely look like a crash
  const activeWeeks = weeklySummaries.filter(w => w.stats.totalWorkouts >= 1);
  if (activeWeeks.length < 4) return null;

  const volumes = activeWeeks.map(w => w.stats.totalVolume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  // Look for spike (>150% avg) followed by drop (<80% avg)
  for (let i = 0; i < volumes.length - 2; i++) {
    const spike = volumes[i] > avgVolume * 1.5;
    const drop = volumes[i + 1] < avgVolume * 0.8 || volumes[i + 2] < avgVolume * 0.8;
    
    if (spike && drop) {
      return {
        type: 'overreaching',
        severity: 'high',
        description: 'Volume spike gevolgd door crash - overreaching gedetecteerd'
      };
    }
  }
  
  return null;
}

/**
 * NEW: Detect muscle group specific overload using granular muscle groups
 * More accurate than total volume - can detect if only chest is overtrained while legs are fine
 */
function detectMuscleGroupOverload(workouts: WorkoutLog[], weeksToAnalyze: number): DeloadSignal[] {
  const signals: DeloadSignal[] = [];
  
  // Track volume per muscle group per week
  const muscleGroupWeeklyVolumes: Record<string, number[]> = {};
  
  for (let weekOffset = 0; weekOffset < weeksToAnalyze; weekOffset++) {
    // weekOffset=0 → most recent completed week (7 days ago → today)
    // weekOffset=1 → the week before that, etc.
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - weekOffset * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= weekStart && workoutDate < weekEnd;
    });
    
    weekWorkouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        const muscleGroup = ex.muscleGroup || 'unknown';
        const volume = ex.sets.reduce((sum, set) => 
          sum + (set.completed && !set.isWarmup ? (set.weight || 0) * (set.reps || 0) : 0), 0
        );
        
        if (!muscleGroupWeeklyVolumes[muscleGroup]) {
          muscleGroupWeeklyVolumes[muscleGroup] = new Array(weeksToAnalyze).fill(0);
        }
        muscleGroupWeeklyVolumes[muscleGroup][weekOffset] += volume;
      });
    });
  }
  
  // Analyze each muscle group for overload patterns
  Object.entries(muscleGroupWeeklyVolumes).forEach(([muscleGroup, weeklyVolumes]) => {
    if (muscleGroup === 'unknown' || muscleGroup === 'cardio' || muscleGroup === 'full-body') return;
    
    const avgVolume = weeklyVolumes.reduce((a, b) => a + b, 0) / weeklyVolumes.length;
    if (avgVolume === 0) return;
    
    // Pattern 1: High volume for 3+ consecutive weeks (accumulated fatigue)
    const recentWeeks = weeklyVolumes.slice(0, 3);
    const highVolumeWeeks = recentWeeks.filter(v => v > avgVolume * 1.2).length;
    
    if (highVolumeWeeks >= 3) {
      signals.push({
        type: 'muscle_group_overload',
        severity: 'high',
        description: `${muscleGroup}: 3+ weken hoog volume - specifieke deload nodig`,
        muscleGroup
      });
    }
    
    // Pattern 2: Volume spike > 200% of average (single muscle overreaching)
    const hasSpike = weeklyVolumes.some(v => v > avgVolume * 2);
    if (hasSpike) {
      signals.push({
        type: 'muscle_group_overload',
        severity: 'medium',
        description: `${muscleGroup}: Volume spike gedetecteerd - risico op overtraining`,
        muscleGroup
      });
    }
    
    // Pattern 3: Declining trend in specific muscle group (local fatigue)
    if (recentWeeks.length >= 3) {
      let consecutiveDeclines = 0;
      for (let i = 1; i < recentWeeks.length; i++) {
        if (recentWeeks[i] < recentWeeks[i - 1] * 0.9) {
          consecutiveDeclines++;
        }
      }
      
      if (consecutiveDeclines >= 2) {
        signals.push({
          type: 'muscle_group_overload',
          severity: 'medium',
          description: `${muscleGroup}: Volume daalt - mogelijk lokale vermoeidheid`,
          muscleGroup
        });
      }
    }
  });
  
  return signals;
}

/**
 * Calculate deload urgency based on signals
 */
function calculateUrgency(signals: DeloadSignal[]): { shouldDeload: boolean; urgency: DeloadRecommendation['urgency'] } {
  if (signals.length === 0) {
    return { shouldDeload: false, urgency: 'low' };
  }
  
  const highSeverityCount = signals.filter(s => s.severity === 'high').length;
  const mediumSeverityCount = signals.filter(s => s.severity === 'medium').length;
  
  // Critical: 2+ high severity signals
  if (highSeverityCount >= 2) {
    return { shouldDeload: true, urgency: 'critical' };
  }
  
  // High: 1 high + 1 medium, or 3+ medium
  if ((highSeverityCount >= 1 && mediumSeverityCount >= 1) || mediumSeverityCount >= 3) {
    return { shouldDeload: true, urgency: 'high' };
  }
  
  // Medium: 1 high or 2 medium
  if (highSeverityCount >= 1 || mediumSeverityCount >= 2) {
    return { shouldDeload: true, urgency: 'medium' };
  }
  
  // Low: 1 medium signal
  if (mediumSeverityCount >= 1 || signals.length >= 2) {
    return { shouldDeload: false, urgency: 'low' };
  }
  
  return { shouldDeload: false, urgency: 'low' };
}

/**
 * Count weeks with high volume (>3 workouts and above average)
 */
function countHighVolumeWeeks(weeklySummaries: any[]): number {
  if (weeklySummaries.length === 0) return 0;
  
  const avgVolume = weeklySummaries.reduce((sum, w) => sum + w.stats.totalVolume, 0) / weeklySummaries.length;
  
  return weeklySummaries.filter(w => 
    w.stats.totalWorkouts >= 3 && w.stats.totalVolume > avgVolume * 1.1
  ).length;
}

/**
 * Generate recommendation text
 */
function generateRecommendation(signals: DeloadSignal[], urgency: DeloadRecommendation['urgency']): string {
  if (signals.length === 0) {
    return 'Je training ziet er goed uit! Blijf progressive overload toepassen.';
  }
  
  switch (urgency) {
    case 'critical':
      return '🚨 Deload STERK aanbevolen! Meerdere signalen van overtraining - neem deze week rust.';
    case 'high':
      return '⚠️ Deload aanbevolen deze of volgende week. Je lichaam heeft herstel nodig.';
    case 'medium':
      return '💡 Overweeg een deload binnen 1-2 weken. Meerdere signalen van vermoeidheid.';
    default:
      return 'Monitor je progressie. Enkele signalen van vermoeidheid gedetecteerd.';
  }
}

/**
 * Generate deload protocol
 */
function generateDeloadProtocol(urgency: DeloadRecommendation['urgency'], _weeksOfHighVolume: number, workouts?: WorkoutLog[]): DeloadProtocol {
  // Calculate muscle group specific advice if workouts provided
  const muscleGroupAdvice: Record<string, string> = {};
  
  if (workouts && workouts.length > 0) {
    // Get muscle groups from recent workouts
    const muscleGroupVolumes = new Map<string, number>();
    
    workouts.slice(0, 10).forEach(workout => {
      workout.exercises.forEach(ex => {
        const muscleGroup = ex.muscleGroup || 'unknown';
        const volume = ex.sets.reduce((sum, set) => 
          sum + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0), 0
        );
        muscleGroupVolumes.set(
          muscleGroup,
          (muscleGroupVolumes.get(muscleGroup) || 0) + volume
        );
      });
    });
    
    // Generate specific advice for highly trained muscle groups
    const sortedMuscles = Array.from(muscleGroupVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    sortedMuscles.forEach(([muscle, _volume]) => {
      switch (muscle.toLowerCase()) {
        case 'chest':
          muscleGroupAdvice[muscle] = 'Focus op lichte dumbbell work en stretching';
          break;
        case 'back':
          muscleGroupAdvice[muscle] = 'Vervang zware rows door band pull-aparts';
          break;
        case 'lats':
          muscleGroupAdvice[muscle] = 'Lichte pulldowns (60%), skip heavy pull-ups';
          break;
        case 'traps':
        case 'middle-back':
        case 'lower-back':
          muscleGroupAdvice[muscle] = 'Band pull-aparts en lichte rows, focus op mobility';
          break;
        case 'shoulders':
          muscleGroupAdvice[muscle] = 'Gebruik lichte lateral raises, skip overhead press';
          break;
        case 'biceps':
        case 'triceps':
        case 'forearms':
          muscleGroupAdvice[muscle] = 'Lichte pump werk met hoge reps (15-20)';
          break;
        case 'legs':
          muscleGroupAdvice[muscle] = 'Goblet squats i.p.v. back squats, focus op mobility';
          break;
        case 'quads':
        case 'quadriceps':
          muscleGroupAdvice[muscle] = 'Lichte goblet squats, focus op stretching en mobility';
          break;
        case 'hamstrings':
          muscleGroupAdvice[muscle] = 'Lichte RDLs (60%), verhoog hamstring stretching';
          break;
        case 'glutes':
          muscleGroupAdvice[muscle] = 'Bodyweight glute bridges, skip heavy hip thrusts';
          break;
        case 'calves':
          muscleGroupAdvice[muscle] = 'Lichte calf raises, focus op stretch en mobility';
          break;
        case 'core':
          muscleGroupAdvice[muscle] = 'Dead bugs en bird dogs, skip heavy loaded core';
          break;
        case 'abs':
          muscleGroupAdvice[muscle] = 'Lichte planks en stretching, skip weighted ab work';
          break;
        case 'obliques':
          muscleGroupAdvice[muscle] = 'Side planks met lage intensiteit, focus op ademhaling';
          break;
      }
    });
  }
  
  const protocols: Record<DeloadRecommendation['urgency'], DeloadProtocol> = {
    critical: {
      volumeReduction: 50,
      intensityReduction: 40,
      durationWeeks: 1,
      suggestions: [
        'Reduceer alle oefeningen tot 50% van normale sets',
        'Gebruik 60% van je normale gewichten',
        'Focus op techniek en mindful movement',
        'Verhoog slaap tot 8-9 uur per nacht',
        'Overweeg extra rustdag(en) deze week'
      ],
      muscleGroupAdvice
    },
    high: {
      volumeReduction: 40,
      intensityReduction: 30,
      durationWeeks: 1,
      suggestions: [
        'Reduceer volume met 40% (bijv. 5 sets → 3 sets)',
        'Gebruik 70% van je normale gewichten',
        'Behoud frequentie maar verkort workouts',
        'Focus op compound movements, skip accessories',
        'Verhoog protein intake (2g/kg) voor herstel'
      ],
      muscleGroupAdvice
    },
    medium: {
      volumeReduction: 30,
      intensityReduction: 20,
      durationWeeks: 1,
      suggestions: [
        'Reduceer sets met ~30% deze week',
        'Gebruik 75-80% van normale gewichten',
        'Behoud alle oefeningen maar minder volume',
        'Extra stretching en mobility work',
        'Zorg voor adequate voeding en hydratatie'
      ],
      muscleGroupAdvice
    },
    low: {
      volumeReduction: 20,
      intensityReduction: 10,
      durationWeeks: 1,
      suggestions: [
        'Lichte deload: reduceer 1-2 sets per oefening',
        'Gebruik ~85% van normale gewichten',
        'Optioneel: vervang 1 workout door actief herstel',
        'Focus op slaap en stress management'
      ],
      muscleGroupAdvice
    }
  };
  
  return protocols[urgency];
}

/**
 * Check if user is currently in deload week (based on volume or manual rest days).
 * Accepts an optional array of rest day dates (YYYY-MM-DD) so manually marked
 * rest/deload/vacation days are treated as active deload.
 */
export function isCurrentlyDeloading(workouts: WorkoutLog[], restDayDates: string[] = []): boolean {
  // Check if the last 3 days are all manually marked as rest/deload/vacation
  const restDaySet = new Set(restDayDates);
  const today = new Date();
  let consecutiveRestDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (restDaySet.has(key)) {
      consecutiveRestDays++;
    } else {
      break;
    }
  }
  if (consecutiveRestDays >= 3) return true;

  const currentWeek = calculateWeeklySummary(workouts, [], 0);
  const lastWeek = calculateWeeklySummary(workouts, [], -1);
  
  if (lastWeek.stats.totalVolume === 0) return false;
  
  const volumeReduction = ((lastWeek.stats.totalVolume - currentWeek.stats.totalVolume) / lastWeek.stats.totalVolume) * 100;
  
  // If volume is down 30%+ from last week, likely deloading
  return volumeReduction >= 30 && currentWeek.stats.totalWorkouts >= 2;
}
