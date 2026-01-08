import { WorkoutLog } from '@/components/context/DataContext';
import { calculateWeeklySummary } from './weeklyAnalytics';
import { detectAllPlateaus } from './plateauDetection';

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
  type: 'volume_decline' | 'performance_decline' | 'accumulated_fatigue' | 'multiple_plateaus' | 'overreaching';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface DeloadProtocol {
  volumeReduction: number; // percentage (e.g., 40 for 40% reduction)
  intensityReduction: number; // percentage
  durationWeeks: number;
  suggestions: string[];
}

/**
 * Detect if deload week is needed
 */
export function detectDeloadNeed(
  workouts: WorkoutLog[],
  weeksToAnalyze: number = 6
): DeloadRecommendation {
  const signals: DeloadSignal[] = [];
  
  // Get weekly summaries for trend analysis
  const weeklySummaries = [];
  for (let i = 0; i < weeksToAnalyze; i++) {
    weeklySummaries.push(calculateWeeklySummary(workouts, [], -i));
  }
  weeklySummaries.reverse(); // Oldest first
  
  // Signal 1: Volume declining trend (fatigue)
  const volumeDeclineSignal = detectVolumeDecline(weeklySummaries);
  if (volumeDeclineSignal) signals.push(volumeDeclineSignal);
  
  // Signal 2: Performance decline (decreasing weights despite effort)
  const performanceSignal = detectPerformanceDecline(workouts);
  if (performanceSignal) signals.push(performanceSignal);
  
  // Signal 3: Accumulated high volume (4+ weeks straight)
  const fatigueSignal = detectAccumulatedFatigue(weeklySummaries);
  if (fatigueSignal) signals.push(fatigueSignal);
  
  // Signal 4: Multiple exercises plateaued simultaneously
  const plateauSignal = detectMultiplePlateaus(workouts);
  if (plateauSignal) signals.push(plateauSignal);
  
  // Signal 5: Overreaching (volume spike followed by drop)
  const overreachingSignal = detectOverreaching(weeklySummaries);
  if (overreachingSignal) signals.push(overreachingSignal);
  
  // Calculate urgency based on signals
  const { shouldDeload, urgency } = calculateUrgency(signals);
  
  // Count weeks of high volume
  const weeksOfHighVolume = countHighVolumeWeeks(weeklySummaries);
  
  // Generate recommendation
  const recommendation = generateRecommendation(signals, urgency);
  
  // Generate deload protocol if needed
  const deloadProtocol = shouldDeload 
    ? generateDeloadProtocol(urgency, weeksOfHighVolume)
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
  if (weeklySummaries.length < 3) return null;
  
  const recentWeeks = weeklySummaries.slice(-3);
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
 * Detect accumulated fatigue (high volume for 4+ weeks)
 */
function detectAccumulatedFatigue(weeklySummaries: any[]): DeloadSignal | null {
  if (weeklySummaries.length < 4) return null;
  
  const recentWeeks = weeklySummaries.slice(-4);
  const avgVolume = recentWeeks.reduce((sum, w) => sum + w.stats.totalVolume, 0) / recentWeeks.length;
  
  // Check if all recent weeks are above average
  const highVolumeWeeks = recentWeeks.filter(w => 
    w.stats.totalVolume > avgVolume * 1.1 && w.stats.totalWorkouts >= 3
  ).length;
  
  if (highVolumeWeeks >= 4) {
    return {
      type: 'accumulated_fatigue',
      severity: highVolumeWeeks >= 5 ? 'high' : 'medium',
      description: `${highVolumeWeeks} weken achtereen hoog volume - tijd voor herstel`
    };
  }
  
  return null;
}

/**
 * Detect multiple plateaus (systemic fatigue)
 */
function detectMultiplePlateaus(workouts: WorkoutLog[]): DeloadSignal | null {
  const plateaus = detectAllPlateaus(workouts, 3);
  
  if (plateaus.length >= 3) {
    const severePlateaus = plateaus.filter(p => p.weeksStagnant >= 3).length;
    
    return {
      type: 'multiple_plateaus',
      severity: severePlateaus >= 2 ? 'high' : 'medium',
      description: `${plateaus.length} oefeningen gestagneerd - mogelijk systemische vermoeidheid`
    };
  }
  
  return null;
}

/**
 * Detect overreaching (volume spike then crash)
 */
function detectOverreaching(weeklySummaries: any[]): DeloadSignal | null {
  if (weeklySummaries.length < 4) return null;
  
  const volumes = weeklySummaries.map(w => w.stats.totalVolume);
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
function generateDeloadProtocol(urgency: DeloadRecommendation['urgency'], _weeksOfHighVolume: number): DeloadProtocol {
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
      ]
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
      ]
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
      ]
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
      ]
    }
  };
  
  return protocols[urgency];
}

/**
 * Check if user is currently in deload week (based on volume)
 */
export function isCurrentlyDeloading(workouts: WorkoutLog[]): boolean {
  const currentWeek = calculateWeeklySummary(workouts, [], 0);
  const lastWeek = calculateWeeklySummary(workouts, [], -1);
  
  if (lastWeek.stats.totalVolume === 0) return false;
  
  const volumeReduction = ((lastWeek.stats.totalVolume - currentWeek.stats.totalVolume) / lastWeek.stats.totalVolume) * 100;
  
  // If volume is down 30%+ from last week, likely deloading
  return volumeReduction >= 30 && currentWeek.stats.totalWorkouts >= 2;
}
