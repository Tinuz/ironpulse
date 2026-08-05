import type { WorkoutLog, RestDay } from '@/components/context/DataContext';
import { detectPlateau, PlateauDetection } from './strengthAnalytics';
import { isCompoundExercise } from './exerciseClassification';
import { isLightWorkoutSession } from './workoutIntent';

/**
 * Enhanced plateau detection with AI-powered suggestions
 */
export interface EnhancedPlateauDetection extends PlateauDetection {
  exerciseName: string;
  muscleGroup?: string; // Added muscle group field
  detectionType: 'weight' | 'volume' | 'reps';
  lastWorkoutDate: string;
  weeksStagnant: number;
  aiSuggestions?: string[]; // Generated via AI
  ruleSuggestions: string[]; // Rule-based fallback
}

/**
 * Detect plateaus across all exercises
 * Excludes deload workouts from plateau detection.
 * Optionally suppresses plateaus that overlap with a vacation period.
 *
 * @param restDays - User rest days. Exercises whose stagnant period is largely
 *   covered by vacation days (≥5) are excluded — the user wasn't training,
 *   so stagnation is expected and not a true plateau.
 */
export function detectAllPlateaus(
  workouts: WorkoutLog[],
  threshold: number = 3,
  restDays: RestDay[] = [],
): EnhancedPlateauDetection[] {
  // Exclude deload workouts from plateau detection
  const nonDeloadWorkouts = workouts.filter(w => !w.isDeload && !isLightWorkoutSession(w));

  if (nonDeloadWorkouts.length < threshold) return [];

  // Build vacation set for fast lookup
  const vacationSet = new Set(
    restDays
      .filter(r => r.type === 'vacation')
      .map(r => r.date),
  );

  // Get unique exercises
  const exerciseNames = new Set<string>();
  nonDeloadWorkouts.forEach(w => {
    w.exercises.forEach(ex => exerciseNames.add(ex.name));
  });

  const plateaus: EnhancedPlateauDetection[] = [];
  
  exerciseNames.forEach(exerciseName => {
    const isCompound = isCompoundExercise(exerciseName);
    // Evidence-based session thresholds (Schoenfeld et al. 2017):
    // 3 sessions at 2×/week ≈ 10–15 days — far too short to call a plateau.
    // Compound lifts: min 4 sessions (high neural complexity, slower adaptation).
    // Isolation lifts: min 5 sessions (higher natural variance; local fatigue clears faster).
    const exerciseThreshold = isCompound
      ? Math.max(threshold + 1, 4)
      : Math.max(threshold + 2, 5);

    const detection = detectPlateau(exerciseName, nonDeloadWorkouts, exerciseThreshold);
    
    if (detection.isPlateaued) {
      const relevantWorkouts = nonDeloadWorkouts
        .filter(w => w.exercises.some(ex => ex.name === exerciseName))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const lastWorkoutDate = relevantWorkouts[0]?.date || new Date().toISOString();

      // weeksStagnant = calendar span from the first stagnant session to the last workout.
      // plateauStartDate is set by detectPlateau to the exact date the stagnant streak began,
      // so there is no session-index arithmetic that could over-count rest/vacation weeks.
      const newestDate = new Date(lastWorkoutDate);
      const weeksStagnant = detection.plateauStartDate
        ? Math.max(1, Math.ceil(
            (newestDate.getTime() - new Date(detection.plateauStartDate).getTime())
            / (1000 * 60 * 60 * 24 * 7)
          ))
        : 1;
      
      // Minimum calendar-time guard: natural weekly variance makes any window shorter
      // than this meaningless as a plateau signal (Haff & Triplett 2015).
      // Compounds need ≥3 weeks; isolation ≥4 weeks (more local variance / accommodation).
      const minWeeks = isCompound ? 3 : 4;
      if (weeksStagnant < minWeeks) return; // skip — not enough time to be a true plateau

      // Vacation guard: if ≥5 vacation days fall within the stagnant period the user
      // simply wasn't training — stagnation is expected, not a true plateau.
      // (Shephard & Aoyagi 2009: deliberate rest does not impair neural encoding.)
      if (detection.plateauStartDate && vacationSet.size > 0) {
        const stagnantStart = new Date(detection.plateauStartDate);
        const stagnantEnd = new Date(lastWorkoutDate);
        let vacationDaysInRange = 0;
        for (const dateStr of vacationSet) {
          const d = new Date(dateStr);
          if (d >= stagnantStart && d <= stagnantEnd) vacationDaysInRange++;
        }
        if (vacationDaysInRange >= 5) return; // vacation explains the stagnation
      }
      
      // Get muscle group from most recent workout with this exercise
      const muscleGroup = relevantWorkouts[0]?.exercises.find(ex => ex.name === exerciseName)?.muscleGroup;
      
      plateaus.push({
        ...detection,
        exerciseName,
        muscleGroup,
        detectionType: 'weight',
        lastWorkoutDate,
        weeksStagnant,
        ruleSuggestions: generateRuleSuggestions(exerciseName, weeksStagnant, muscleGroup)
      });
    }
  });
  
  return plateaus.sort((a, b) => b.weeksStagnant - a.weeksStagnant);
}

/**
 * Generate rule-based suggestions for breaking through plateaus.
 *
 * Science (Schoenfeld 2010, Zatsiorsky & Kraemer 2006):
 * - Isolation exercises plateau due to accommodation, not systemic fatigue.
 *   Correct response: variation in rep range, tempo, or exercise swap.
 * - Compound lifts plateau due to fatigue or programming. Deload is relevant
 *   when multiple compound lifts stagnate together.
 */
function generateRuleSuggestions(
  exerciseName: string,
  weeksStagnant: number,
  muscleGroup?: string
): string[] {
  const suggestions: string[] = [];
  const isCompound = isCompoundExercise(exerciseName);

  if (isCompound) {
    // Compound lifts: deload is a valid option when stagnation is long
    if (weeksStagnant >= 4) {
      suggestions.push('Overweeg een deload week (50-60% intensiteit)');
      suggestions.push('Wissel naar variatie van deze oefening');
    } else if (weeksStagnant >= 2) {
      suggestions.push('Probeer andere rep ranges (5x5 → 3x8-10)');
      suggestions.push('Verhoog sets met zelfde gewicht');
    }
  } else {
    // Isolation exercises: accommodation is the cause, not fatigue.
    // Variation always first — no deload recommendation.
    suggestions.push('Probeer een andere rep-range (15-20 reps voor meer pomp)');
    suggestions.push('Wissel naar een vergelijkbare oefening (bv. DB in plaats van kabel)');
    if (weeksStagnant >= 4) {
      suggestions.push('Verander de volgorde in je training (eerder = meer focus)');
      suggestions.push('Voeg drop-sets of rest-pause sets toe');
    } else {
      suggestions.push('Verhoog de time-under-tension (langzamer uitvoeren)');
    }
  }
  
  // Muscle group specific suggestions (using granular muscleGroup field!)
  if (muscleGroup) {
    switch (muscleGroup.toLowerCase()) {
      case 'chest':
        suggestions.push('Voeg paused reps toe (2 sec hold)');
        suggestions.push('Probeer incline of decline variatie');
        break;
      case 'back':
        suggestions.push('Verhoog time under tension (langzamer neerlaten)');
        suggestions.push('Wissel grip width of type (overhand/underhand)');
        break;
      case 'lats':
        suggestions.push('Probeer wide-grip pull-ups of lat prayers');
        suggestions.push('Focus op scapular depression en stretch');
        break;
      case 'traps':
        suggestions.push('Voeg shrugs met hold toe (3-5 sec)');
        suggestions.push('Probeer verschillende hoeken (mid/upper traps)');
        break;
      case 'middle-back':
      case 'lower-back':
        suggestions.push('Focus op row variaties (Pendlay, Yates)');
        suggestions.push('Verhoog tempo (3-1-3) voor meer TUT');
        break;
      case 'shoulders':
        suggestions.push('Focus op scapular retraction en controle');
        suggestions.push('Voeg face pulls toe voor rear delts');
        break;
      case 'biceps':
        suggestions.push('Probeer verschillende grips (hammer, reverse)');
        suggestions.push('Voeg eccentrics toe (langzaam neerlaten)');
        break;
      case 'triceps':
        suggestions.push('Wissel tussen close grip en overhead werk');
        suggestions.push('Focus op elbow positie en ROM');
        break;
      case 'forearms':
        suggestions.push('Voeg wrist curls en reverse curls toe');
        suggestions.push('Focus op grip strength (dead hangs, farmers walks)');
        break;
      case 'legs':
        suggestions.push('Check je squat depth - volle ROM kan helpen');
        suggestions.push('Probeer pause reps of tempo variaties');
        break;
      case 'quads':
      case 'quadriceps':
        suggestions.push('Probeer front squats of Bulgarian split squats');
        suggestions.push('Verhoog volume met leg extensions (pump sets)');
        break;
      case 'hamstrings':
        suggestions.push('Voeg RDLs of Nordic curls toe');
        suggestions.push('Focus op eccentrische controle (4 sec neerlaten)');
        break;
      case 'glutes':
        suggestions.push('Hip thrusts met pauses (2 sec hold bovenaan)');
        suggestions.push('Probeer single-leg variaties voor activatie');
        break;
      case 'calves':
        suggestions.push('Verhoog ROM (stretch onderaan, squeeze bovenaan)');
        suggestions.push('Probeer seated + standing variaties');
        break;
      case 'core':
        suggestions.push('Verhoog hold times of add resistance');
        suggestions.push('Probeer anti-rotation oefeningen');
        break;
      case 'abs':
        suggestions.push('Voeg weighted ab work toe (cable crunches)');
        suggestions.push('Focus op lower abs (leg raises, reverse crunches)');
        break;
      case 'obliques':
        suggestions.push('Probeer Pallof press en side planks');
        suggestions.push('Voeg rotational work toe (Russian twists)');
        break;
    }
  } else {
    // Fallback to name-based suggestions (old method)
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
  // Thresholds calibrated to Schoenfeld (2017) and Zatsiorsky & Kraemer (2006):
  //  3–4 weeks: accommodation — consider variation (mild)
  //  5–7 weeks: prolonged stagnation — intervention needed (moderate)
  //  8+  weeks: chronic plateau — major programming change required (severe)
  if (weeksStagnant >= 8) return 'severe';
  if (weeksStagnant >= 5) return 'moderate';
  return 'mild'; // 3–4 weeks
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
