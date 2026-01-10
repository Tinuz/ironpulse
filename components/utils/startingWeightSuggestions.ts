import { WorkoutLog, UserProfile } from '@/components/context/DataContext';
import { getBest1RM } from './workoutCalculations';
import { getMuscleGroup } from './volumeAnalytics';
import { getExerciseByName } from '@/lib/exerciseData';

export interface StartingWeightSuggestion {
  suggestedWeight: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  basedOn: string; // What exercises/data this is based on
}

/**
 * Suggest starting weight for a new exercise based on user history
 */
export function suggestStartingWeight(
  exerciseName: string,
  history: WorkoutLog[],
  userProfile?: UserProfile | null
): StartingWeightSuggestion | null {
  // Check if user has done this exercise before
  const previousPerformance = getExerciseHistory(exerciseName, history);
  
  if (previousPerformance.length > 0) {
    return suggestFromPreviousPerformance(exerciseName, previousPerformance);
  }

  // Check for similar exercises based on muscle group
  const muscleGroup = getMuscleGroup(exerciseName);
  if (muscleGroup) {
    const similarExercisesPerformance = getSimilarExercisesPerformance(muscleGroup, history);
    
    if (similarExercisesPerformance.length > 0) {
      return suggestFromSimilarExercises(exerciseName, muscleGroup, similarExercisesPerformance);
    }
  }

  // Fallback to exercise profile-based estimates
  const exerciseProfile = getExerciseByName(exerciseName);
  if (exerciseProfile && userProfile) {
    return suggestFromProfile(exerciseProfile, userProfile);
  }

  return null;
}

/**
 * Get exercise history from workout logs
 */
function getExerciseHistory(exerciseName: string, history: WorkoutLog[]) {
  const performance: Array<{ date: string; best1RM: number; avgWeight: number }> = [];

  history.forEach(workout => {
    const exercise = workout.exercises.find(ex => 
      ex.name.toLowerCase() === exerciseName.toLowerCase()
    );

    if (exercise) {
      const best = getBest1RM(exercise);
      if (best) {
        const avgWeight = exercise.sets
          .filter(s => s.completed && s.weight > 0)
          .reduce((sum, s) => sum + s.weight, 0) / exercise.sets.filter(s => s.completed).length;

        performance.push({
          date: workout.date,
          best1RM: best.oneRM,
          avgWeight
        });
      }
    }
  });

  return performance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Suggest based on previous performance of this exact exercise
 */
function suggestFromPreviousPerformance(
  exerciseName: string,
  previousPerformance: Array<{ date: string; best1RM: number; avgWeight: number }>
): StartingWeightSuggestion {
  const recentPerformance = previousPerformance.slice(0, 3); // Last 3 sessions
  const avgWeight = recentPerformance.reduce((sum, p) => sum + p.avgWeight, 0) / recentPerformance.length;
  
  // Suggest slightly lower than average to allow for progression
  const suggestedWeight = Math.round(avgWeight * 0.95 / 2.5) * 2.5; // Round to nearest 2.5kg

  return {
    suggestedWeight,
    confidence: 'high',
    reasoning: `Based on your recent performance (avg ${avgWeight.toFixed(1)}kg). Start slightly lighter to allow for progressive overload.`,
    basedOn: `Last ${recentPerformance.length} workouts with ${exerciseName}`
  };
}

/**
 * Get performance data for similar exercises (same muscle group)
 */
function getSimilarExercisesPerformance(
  muscleGroup: string,
  history: WorkoutLog[]
): Array<{ exerciseName: string; avg1RM: number; avgWeight: number; compound: boolean }> {
  const performanceMap = new Map<string, { total1RM: number; totalWeight: number; count: number; compound: boolean }>();

  history.forEach(workout => {
    workout.exercises.forEach(exercise => {
      const exMuscleGroup = getMuscleGroup(exercise.name);
      if (exMuscleGroup === muscleGroup) {
        const best = getBest1RM(exercise);
        if (best) {
          const avgWeight = exercise.sets
            .filter(s => s.completed && s.weight > 0)
            .reduce((sum, s) => sum + s.weight, 0) / exercise.sets.filter(s => s.completed).length;

          if (!performanceMap.has(exercise.name)) {
            // Determine if compound (basic heuristic)
            const isCompound = isCompoundExercise(exercise.name);
            performanceMap.set(exercise.name, { 
              total1RM: 0, 
              totalWeight: 0, 
              count: 0,
              compound: isCompound
            });
          }

          const data = performanceMap.get(exercise.name)!;
          data.total1RM += best.oneRM;
          data.totalWeight += avgWeight;
          data.count++;
        }
      }
    });
  });

  return Array.from(performanceMap.entries())
    .map(([exerciseName, data]) => ({
      exerciseName,
      avg1RM: data.total1RM / data.count,
      avgWeight: data.totalWeight / data.count,
      compound: data.compound
    }))
    .sort((a, b) => b.avg1RM - a.avg1RM);
}

/**
 * Suggest based on similar exercises (same muscle group)
 */
function suggestFromSimilarExercises(
  exerciseName: string,
  muscleGroup: string,
  similarPerformance: Array<{ exerciseName: string; avg1RM: number; avgWeight: number; compound: boolean }>
): StartingWeightSuggestion {
  const isNewCompound = isCompoundExercise(exerciseName);
  
  // Filter to same exercise type (compound vs isolation)
  const relevantExercises = similarPerformance.filter(ex => ex.compound === isNewCompound);
  
  if (relevantExercises.length === 0) {
    // Fallback to all exercises, but adjust
    const avgWeight = similarPerformance[0]?.avgWeight || 20;
    const adjustment = isNewCompound ? 1.0 : 0.6; // Compound = full, isolation = 60%
    const suggestedWeight = Math.round(avgWeight * adjustment / 2.5) * 2.5;

    return {
      suggestedWeight,
      confidence: 'low',
      reasoning: `Estimated based on other ${muscleGroup} exercises. ${isNewCompound ? 'Compound movements' : 'Isolation exercises'} typically use ${isNewCompound ? 'similar' : 'lighter'} weights.`,
      basedOn: `Performance on ${similarPerformance[0].exerciseName}`
    };
  }

  // Average the top 2 similar exercises
  const topExercises = relevantExercises.slice(0, 2);
  const avgWeight = topExercises.reduce((sum, ex) => sum + ex.avgWeight, 0) / topExercises.length;
  
  // Start with 85% of similar exercises (conservative)
  const suggestedWeight = Math.round(avgWeight * 0.85 / 2.5) * 2.5;

  const exampleExercises = topExercises.map(ex => ex.exerciseName).join(', ');

  return {
    suggestedWeight,
    confidence: 'medium',
    reasoning: `Based on your performance on similar ${muscleGroup} exercises. Starting conservatively at 85% to ensure proper form.`,
    basedOn: exampleExercises
  };
}

/**
 * Suggest based on exercise profile and user experience level
 */
function suggestFromProfile(
  exerciseProfile: any,
  userProfile: UserProfile
): StartingWeightSuggestion {
  // Determine experience level based on age and activity level (simplified heuristic)
  let experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  
  // If user has activityLevel > 1.5, likely intermediate or advanced
  if (userProfile.activityLevel >= 1.7) {
    experienceLevel = 'advanced';
  } else if (userProfile.activityLevel >= 1.5) {
    experienceLevel = 'intermediate';
  }
  
  const bodyWeight = userProfile.weight || 75; // Default 75kg
  
  // Difficulty multipliers based on exercise type
  const difficultyMultipliers = {
    beginner: 0.3,
    intermediate: 0.5,
    advanced: 0.7
  };

  // Compound vs isolation multipliers
  const isCompound = isCompoundExercise(exerciseProfile.name);
  const typeMultiplier = isCompound ? 1.0 : 0.4; // Isolation = 40% of compound

  // Base suggestion on body weight
  const baseWeight = bodyWeight * difficultyMultipliers[experienceLevel] * typeMultiplier;
  const suggestedWeight = Math.max(5, Math.round(baseWeight / 2.5) * 2.5); // Min 5kg

  return {
    suggestedWeight,
    confidence: 'low',
    reasoning: `Estimated for ${experienceLevel} level. ${isCompound ? 'Compound exercise' : 'Isolation exercise'} - start light and increase gradually.`,
    basedOn: `Experience level: ${experienceLevel}, body weight: ${bodyWeight}kg`
  };
}

/**
 * Determine if exercise is compound (involves multiple joints/muscle groups)
 */
function isCompoundExercise(exerciseName: string): boolean {
  const name = exerciseName.toLowerCase();
  
  // Common compound exercises
  const compoundKeywords = [
    'squat', 'deadlift', 'bench', 'press', 'row', 'pull up', 'pullup',
    'chin up', 'dip', 'lunge', 'clean', 'snatch', 'thruster'
  ];

  // Common isolation exercises
  const isolationKeywords = [
    'curl', 'extension', 'raise', 'fly', 'flye', 'crunch', 'shrug',
    'calf', 'lateral', 'front raise', 'rear delt'
  ];

  // Check isolation first (more specific)
  for (const keyword of isolationKeywords) {
    if (name.includes(keyword)) {
      return false;
    }
  }

  // Check compound
  for (const keyword of compoundKeywords) {
    if (name.includes(keyword)) {
      return true;
    }
  }

  // Default to isolation if unknown (safer)
  return false;
}

/**
 * Bulk suggest starting weights for multiple exercises (e.g., when creating a schema)
 */
export function suggestStartingWeightsForSchema(
  exercises: Array<{ name: string; targetSets: number; targetReps: number }>,
  history: WorkoutLog[],
  userProfile?: UserProfile | null
): Map<string, StartingWeightSuggestion> {
  const suggestions = new Map<string, StartingWeightSuggestion>();

  exercises.forEach(exercise => {
    const suggestion = suggestStartingWeight(exercise.name, history, userProfile);
    if (suggestion) {
      suggestions.set(exercise.name, suggestion);
    }
  });

  return suggestions;
}
