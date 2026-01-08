/**
 * Accessory Exercise Analysis
 * 
 * Analyzes workout history to identify:
 * - Muscle imbalances (push/pull ratio, upper/lower split)
 * - Exercise plateaus (using existing plateau detection)
 * - Weak points (low volume muscle groups)
 * - Injury risk areas (overused muscles without adequate recovery exercises)
 * 
 * This analysis feeds into AI prompts for intelligent accessory suggestions.
 */

import { WorkoutLog } from '@/components/context/DataContext';
import { getMuscleGroup, MuscleGroup, MUSCLE_GROUPS } from './volumeAnalytics';
import { detectAllPlateaus } from './plateauDetection';

export interface MuscleGroupVolume {
  group: MuscleGroup;
  totalVolume: number; // kg lifted
  workoutCount: number;
  averageVolumePerWorkout: number;
  exercises: string[]; // Unique exercises
}

export interface AccessoryAnalysis {
  muscleImbalances: string[];
  plateaus: string[];
  weakPoints: string[];
  recentWorkouts: string[];
  trainingFrequency: number; // Workouts per week
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  volumeByMuscleGroup: MuscleGroupVolume[];
}

/**
 * Analyze workout history for accessory exercise recommendations
 */
export function analyzeForAccessories(workouts: WorkoutLog[]): AccessoryAnalysis {
  // Use last 8 weeks of data (or all if less)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  
  const recentWorkouts = workouts
    .filter(w => new Date(w.date) >= eightWeeksAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate training frequency
  const weeksTracked = Math.max(1, Math.ceil(
    (new Date().getTime() - new Date(recentWorkouts[recentWorkouts.length - 1]?.date || new Date()).getTime()) / 
    (1000 * 60 * 60 * 24 * 7)
  ));
  const trainingFrequency = Math.round(recentWorkouts.length / weeksTracked * 10) / 10;

  // Determine experience level
  const totalWorkouts = workouts.length;
  const experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 
    totalWorkouts < 20 ? 'beginner' :
    totalWorkouts < 100 ? 'intermediate' :
    'advanced';

  // Calculate volume by muscle group
  const volumeByMuscleGroup = calculateMuscleGroupVolume(recentWorkouts);

  // Detect muscle imbalances
  const muscleImbalances = detectMuscleImbalances(volumeByMuscleGroup);

  // Detect plateaus
  const plateauDetections = detectAllPlateaus(workouts, 3);
  const plateaus = plateauDetections
    .slice(0, 3) // Top 3 most concerning plateaus
    .map(p => `${p.exerciseName}: Stagnant for ${p.weeksStagnant} weeks (${p.workoutsStagnant} workouts)`);

  // Detect weak points (muscle groups with low volume)
  const weakPoints = detectWeakPoints(volumeByMuscleGroup);

  // Format recent workouts for context
  const recentWorkoutsFormatted = recentWorkouts
    .slice(0, 5)
    .map(w => {
      const exerciseList = w.exercises.map(e => e.name).join(', ');
      const date = new Date(w.date).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' });
      return `${date}: ${exerciseList}`;
    });

  return {
    muscleImbalances,
    plateaus,
    weakPoints,
    recentWorkouts: recentWorkoutsFormatted,
    trainingFrequency,
    experienceLevel,
    volumeByMuscleGroup,
  };
}

/**
 * Calculate total volume per muscle group
 */
function calculateMuscleGroupVolume(workouts: WorkoutLog[]): MuscleGroupVolume[] {
  const groupData = new Map<MuscleGroup, {
    totalVolume: number;
    workoutCount: number;
    exercises: Set<string>;
  }>();

  // Initialize all muscle groups
  Object.keys(MUSCLE_GROUPS).forEach(group => {
    groupData.set(group as MuscleGroup, {
      totalVolume: 0,
      workoutCount: 0,
      exercises: new Set(),
    });
  });

  // Aggregate volume
  workouts.forEach(workout => {
    const groupsInWorkout = new Set<MuscleGroup>();

    workout.exercises.forEach(exercise => {
      const group = getMuscleGroup(exercise.name);
      if (!group) return;

      const data = groupData.get(group)!;
      
      // Calculate volume for this exercise
      const volume = exercise.sets.reduce((sum, set) => {
        return sum + (set.weight || 0) * (set.reps || 0);
      }, 0);

      data.totalVolume += volume;
      data.exercises.add(exercise.name);
      groupsInWorkout.add(group);
    });

    // Count workouts per group
    groupsInWorkout.forEach(group => {
      groupData.get(group)!.workoutCount++;
    });
  });

  // Convert to array format
  return Array.from(groupData.entries()).map(([group, data]) => ({
    group,
    totalVolume: Math.round(data.totalVolume),
    workoutCount: data.workoutCount,
    averageVolumePerWorkout: data.workoutCount > 0 
      ? Math.round(data.totalVolume / data.workoutCount)
      : 0,
    exercises: Array.from(data.exercises),
  }))
  .filter(item => item.totalVolume > 0) // Only groups with activity
  .sort((a, b) => b.totalVolume - a.totalVolume);
}

/**
 * Detect muscle imbalances (push/pull, upper/lower, etc.)
 */
function detectMuscleImbalances(volumeData: MuscleGroupVolume[]): string[] {
  const imbalances: string[] = [];

  // Helper to get total volume for groups
  const getVolume = (groups: MuscleGroup[]): number => {
    return volumeData
      .filter(v => groups.includes(v.group))
      .reduce((sum, v) => sum + v.totalVolume, 0);
  };

  // Push vs Pull ratio (should be ~1:1 or 1:1.5 favoring pull)
  const pushVolume = getVolume(['chest', 'shoulders']);
  const pullVolume = getVolume(['back']);
  
  if (pushVolume > 0 && pullVolume > 0) {
    const ratio = pushVolume / pullVolume;
    if (ratio > 1.5) {
      const diff = Math.round((ratio - 1) * 100);
      imbalances.push(`Push volume is ${diff}% higher than pull volume. Risk of shoulder issues and poor posture.`);
    } else if (ratio < 0.5) {
      const diff = Math.round((1 / ratio - 1) * 100);
      imbalances.push(`Pull volume is ${diff}% higher than push volume. Consider balancing with more pressing work.`);
    }
  } else if (pushVolume > 0 && pullVolume === 0) {
    imbalances.push('No pulling exercises detected. Critical imbalance - add rows, pull-ups, or lat work.');
  } else if (pullVolume > 0 && pushVolume === 0) {
    imbalances.push('No pushing exercises detected. Add bench press, dips, or overhead pressing.');
  }

  // Upper vs Lower body (should be relatively balanced)
  const upperVolume = getVolume(['chest', 'back', 'shoulders', 'arms']);
  const lowerVolume = getVolume(['legs', 'glutes', 'calves']);

  if (upperVolume > 0 && lowerVolume > 0) {
    const ratio = upperVolume / lowerVolume;
    if (ratio > 2.5) {
      imbalances.push('Upper body volume is significantly higher than lower body. Consider adding more leg work.');
    } else if (ratio < 0.4) {
      imbalances.push('Lower body volume dominates. Balance with more upper body exercises.');
    }
  } else if (upperVolume > 0 && lowerVolume === 0) {
    imbalances.push('No lower body training detected. Add squats, deadlifts, or leg exercises.');
  }

  // Shoulder health (rear delts often neglected)
  const chestVolume = getVolume(['chest']);
  
  // Check if user trains shoulders
  const shoulderData = volumeData.find(v => v.group === 'shoulders');
  if (chestVolume > 5000 && (!shoulderData || shoulderData.totalVolume < chestVolume * 0.3)) {
    imbalances.push('Heavy chest work without adequate shoulder accessories. Add rear delt and rotator cuff exercises.');
  }

  // Core/abs often neglected
  const absData = volumeData.find(v => v.group === 'abs');
  if (!absData || absData.workoutCount < volumeData[0]?.workoutCount * 0.3) {
    imbalances.push('Core training is minimal. Add planks, dead bugs, or ab wheel for injury prevention.');
  }

  return imbalances;
}

/**
 * Detect weak points (muscle groups with low volume relative to others)
 */
function detectWeakPoints(volumeData: MuscleGroupVolume[]): string[] {
  if (volumeData.length < 2) return [];

  const weakPoints: string[] = [];
  const avgVolume = volumeData.reduce((sum, v) => sum + v.totalVolume, 0) / volumeData.length;

  volumeData.forEach(data => {
    // Weak point: less than 30% of average volume
    if (data.totalVolume < avgVolume * 0.3 && data.totalVolume > 0) {
      const groupName = MUSCLE_GROUPS[data.group];
      weakPoints.push(`${groupName}: Only ${Math.round(data.totalVolume)}kg total (${data.exercises.length} exercises). Consider more volume.`);
    }
  });

  // Special cases for commonly neglected areas
  const hasCalves = volumeData.some(v => v.group === 'calves' && v.totalVolume > 0);
  const hasGlutes = volumeData.some(v => v.group === 'glutes' && v.totalVolume > 0);
  
  if (!hasCalves && volumeData.some(v => v.group === 'legs')) {
    weakPoints.push('Calves: No direct calf training. Add calf raises for complete leg development.');
  }
  
  if (!hasGlutes && volumeData.some(v => v.group === 'legs')) {
    weakPoints.push('Glutes: No direct glute work. Add hip thrusts or glute bridges for strength and injury prevention.');
  }

  return weakPoints.slice(0, 3); // Top 3 weak points
}

/**
 * Get a summary string for UI display
 */
export function getAnalysisSummary(analysis: AccessoryAnalysis): string {
  const parts: string[] = [];

  if (analysis.muscleImbalances.length > 0) {
    parts.push(`${analysis.muscleImbalances.length} muscle imbalance(s) detected`);
  }

  if (analysis.plateaus.length > 0) {
    parts.push(`${analysis.plateaus.length} plateau(s) identified`);
  }

  if (analysis.weakPoints.length > 0) {
    parts.push(`${analysis.weakPoints.length} weak point(s) found`);
  }

  if (parts.length === 0) {
    return 'Your training is well-balanced! AI can still suggest exercises to optimize further.';
  }

  return parts.join(' • ');
}
