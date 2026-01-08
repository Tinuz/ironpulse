import { WorkoutLog } from '@/components/context/DataContext';
import { detectPlateau, PlateauDetection } from './strengthAnalytics';

/**
 * Enhanced plateau detection with AI-powered suggestions
 */
export interface EnhancedPlateauDetection extends PlateauDetection {
  exerciseName: string;
  detectionType: 'weight' | 'volume' | 'reps';
  lastWorkoutDate: string;
  weeksStagnant: number;
  aiSuggestions?: string[]; // Generated via AI
  ruleSuggestions: string[]; // Rule-based fallback
}

/**
 * Detect plateaus across all exercises
 */
export function detectAllPlateaus(
  workouts: WorkoutLog[],
  threshold: number = 3
): EnhancedPlateauDetection[] {
  if (workouts.length < threshold) return [];
  
  // Get unique exercises
  const exerciseNames = new Set<string>();
  workouts.forEach(w => {
    w.exercises.forEach(ex => exerciseNames.add(ex.name));
  });
  
  const plateaus: EnhancedPlateauDetection[] = [];
  
  exerciseNames.forEach(exerciseName => {
    const detection = detectPlateau(exerciseName, workouts, threshold);
    
    if (detection.isPlateaued) {
      const relevantWorkouts = workouts
        .filter(w => w.exercises.some(ex => ex.name === exerciseName))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const lastWorkoutDate = relevantWorkouts[0]?.date || new Date().toISOString();
      const firstStagnantDate = new Date(relevantWorkouts[detection.workoutsStagnant - 1]?.date || lastWorkoutDate);
      const weeksStagnant = Math.ceil(
        (new Date().getTime() - firstStagnantDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      
      plateaus.push({
        ...detection,
        exerciseName,
        detectionType: 'weight',
        lastWorkoutDate,
        weeksStagnant,
        ruleSuggestions: generateRuleSuggestions(exerciseName, weeksStagnant)
      });
    }
  });
  
  return plateaus.sort((a, b) => b.weeksStagnant - a.weeksStagnant);
}

/**
 * Generate rule-based suggestions for breaking through plateaus
 */
function generateRuleSuggestions(
  exerciseName: string,
  weeksStagnant: number
): string[] {
  const suggestions: string[] = [];
  
  // Time-based suggestions
  if (weeksStagnant >= 4) {
    suggestions.push('Overweeg een deload week (50-60% intensiteit)');
    suggestions.push('Wissel naar variatie van deze oefening');
  } else if (weeksStagnant >= 2) {
    suggestions.push('Probeer andere rep ranges (5x5 → 3x8-10)');
    suggestions.push('Verhoog sets met zelfde gewicht');
  }
  
  // Exercise-specific suggestions
  const exerciseLower = exerciseName.toLowerCase();
  
  if (exerciseLower.includes('bench') || exerciseLower.includes('press')) {
    suggestions.push('Voeg paused reps toe (2 sec hold)');
    suggestions.push('Probeer close-grip of incline variatie');
  } else if (exerciseLower.includes('squat')) {
    suggestions.push('Check je squat depth - volle ROM kan helpen');
    suggestions.push('Probeer pause squats of box squats');
  } else if (exerciseLower.includes('deadlift')) {
    suggestions.push('Voeg deficit deadlifts toe');
    suggestions.push('Probeer Romanian deadlifts voor hamstring focus');
  } else if (exerciseLower.includes('pull')) {
    suggestions.push('Verhoog time under tension (langzamer neerlaten)');
    suggestions.push('Wissel grip width');
  }
  
  // General suggestions
  suggestions.push('Zorg voor voldoende slaap (7-9u) en voeding');
  suggestions.push('Check of je progressive overload toepast (+2.5kg/week)');
  
  return suggestions.slice(0, 4); // Max 4 suggestions
}

/**
 * Get AI-enhanced suggestions (hybrid approach)
 */
export async function getAISuggestionsForPlateau(
  plateau: EnhancedPlateauDetection,
  _workouts: WorkoutLog[]
): Promise<string[]> {
  // For now, return rule-based suggestions
  // TODO: Integrate with OpenRouter API for AI-enhanced suggestions
  return plateau.ruleSuggestions;
}

/**
 * Categorize plateau severity
 */
export type PlateauSeverity = 'mild' | 'moderate' | 'severe';

export function getPlateauSeverity(weeksStagnant: number): PlateauSeverity {
  if (weeksStagnant >= 4) return 'severe';
  if (weeksStagnant >= 2) return 'moderate';
  return 'mild';
}

/**
 * Generate plateau summary for dashboard
 */
export interface PlateauSummary {
  totalPlateaus: number;
  severeCount: number;
  moderateCount: number;
  mildCount: number;
  topPlateaus: EnhancedPlateauDetection[];
  overallStatus: 'excellent' | 'good' | 'attention' | 'critical';
}

export function generatePlateauSummary(workouts: WorkoutLog[]): PlateauSummary {
  const plateaus = detectAllPlateaus(workouts, 3);
  
  const severeCount = plateaus.filter(p => getPlateauSeverity(p.weeksStagnant) === 'severe').length;
  const moderateCount = plateaus.filter(p => getPlateauSeverity(p.weeksStagnant) === 'moderate').length;
  const mildCount = plateaus.filter(p => getPlateauSeverity(p.weeksStagnant) === 'mild').length;
  
  let overallStatus: PlateauSummary['overallStatus'] = 'excellent';
  if (severeCount > 0) overallStatus = 'critical';
  else if (moderateCount >= 2) overallStatus = 'attention';
  else if (moderateCount > 0 || mildCount > 0) overallStatus = 'good';
  
  return {
    totalPlateaus: plateaus.length,
    severeCount,
    moderateCount,
    mildCount,
    topPlateaus: plateaus.slice(0, 3),
    overallStatus
  };
}
