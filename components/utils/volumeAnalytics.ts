import { WorkoutLog } from '@/components/context/DataContext';
import exercisesData from '@/exercisesv3.json';

// Muscle group mapping (Engels → Nederlands voor UI)
export const MUSCLE_GROUPS = {
  chest: 'Borst',
  back: 'Rug',
  shoulders: 'Schouders',
  legs: 'Benen',
  arms: 'Armen',
  abs: 'Buik',
  glutes: 'Billen',
  calves: 'Kuiten'
} as const;

export type MuscleGroup = keyof typeof MUSCLE_GROUPS;

// Exercise → Muscle Group mapping (vanuit exercisesv3.json)
const exerciseToMuscleGroup = new Map<string, MuscleGroup>();

// Initialize mapping from exercisesv3.json
interface ExerciseData {
  name: string;
  group: string;
  groups?: string[];
  profile?: {
    targetMuscleGroup?: string;
  };
}

(exercisesData as ExerciseData[]).forEach((ex) => {
  const primaryGroup = ex.group as MuscleGroup;
  if (primaryGroup in MUSCLE_GROUPS) {
    exerciseToMuscleGroup.set(ex.name.toLowerCase(), primaryGroup);
  }
});

// Manual mapping voor veelvoorkomende Nederlandse/custom oefeningen
const CUSTOM_MAPPINGS: Record<string, MuscleGroup> = {
  'bench press': 'chest',
  'bankdrukken': 'chest',
  'squat': 'legs',
  'deadlift': 'back',
  'pull up': 'back',
  'pullup': 'back',
  'lat pulldown': 'back',
  'overhead press': 'shoulders',
  'shoulder press': 'shoulders',
  'bicep curl': 'arms',
  'tricep': 'arms',
  'leg press': 'legs',
  'leg curl': 'legs',
  'leg extension': 'legs',
  'calf raise': 'calves',
  'plank': 'abs',
  'crunch': 'abs',
  'glute bridge': 'glutes'
};

/**
 * Determine muscle group for an exercise
 */
export function getMuscleGroup(exerciseName: string): MuscleGroup | null {
  const normalized = exerciseName.toLowerCase().trim();
  
  // Check exercise database first
  if (exerciseToMuscleGroup.has(normalized)) {
    return exerciseToMuscleGroup.get(normalized)!;
  }
  
  // Check custom mappings (keyword matching)
  for (const [keyword, group] of Object.entries(CUSTOM_MAPPINGS)) {
    if (normalized.includes(keyword)) {
      return group;
    }
  }
  
  // Fallback: return null if unknown
  return null;
}

/**
 * Volume per muscle group data structure
 */
export interface MuscleGroupVolume {
  group: MuscleGroup;
  totalSets: number;
  totalReps: number;
  totalVolume: number; // weight * reps sum
  exercises: string[]; // unique exercises
}

/**
 * Calculate volume per muscle group for a given period
 */
export function calculateMuscleGroupVolume(
  workouts: WorkoutLog[],
  daysBack: number = 7
): MuscleGroupVolume[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const filteredWorkouts = workouts.filter(w => 
    new Date(w.date) >= cutoffDate
  );
  
  // Aggregate by muscle group
  const volumeMap = new Map<MuscleGroup, {
    sets: number;
    reps: number;
    volume: number;
    exercises: Set<string>;
  }>();
  
  filteredWorkouts.forEach(workout => {
    workout.exercises.forEach(ex => {
      const muscleGroup = getMuscleGroup(ex.name);
      if (!muscleGroup) return; // Skip unknown exercises
      
      if (!volumeMap.has(muscleGroup)) {
        volumeMap.set(muscleGroup, {
          sets: 0,
          reps: 0,
          volume: 0,
          exercises: new Set()
        });
      }
      
      const data = volumeMap.get(muscleGroup)!;
      
      ex.sets.forEach(set => {
        if (set.completed) {
          data.sets += 1;
          data.reps += set.reps;
          data.volume += set.weight * set.reps;
        }
      });
      
      data.exercises.add(ex.name);
    });
  });
  
  // Convert to array and sort by volume
  return Array.from(volumeMap.entries())
    .map(([group, data]) => ({
      group,
      totalSets: data.sets,
      totalReps: data.reps,
      totalVolume: Math.round(data.volume),
      exercises: Array.from(data.exercises)
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

/**
 * Detect muscle imbalances (e.g., chest >> back)
 */
export interface MuscleImbalance {
  overtrainedGroup: MuscleGroup;
  undertrainedGroup: MuscleGroup;
  ratio: number; // overtrainedVolume / undertrainedVolume
  suggestion: string;
}

const ANTAGONIST_PAIRS: [MuscleGroup, MuscleGroup][] = [
  ['chest', 'back'],
  ['arms', 'back'], // biceps vs triceps (simplified)
  ['abs', 'back']
];

export function detectMuscleImbalances(
  volumeData: MuscleGroupVolume[]
): MuscleImbalance[] {
  const imbalances: MuscleImbalance[] = [];
  const volumeMap = new Map(volumeData.map(v => [v.group, v.totalVolume]));
  
  ANTAGONIST_PAIRS.forEach(([group1, group2]) => {
    const vol1 = volumeMap.get(group1) || 0;
    const vol2 = volumeMap.get(group2) || 0;
    
    if (vol1 === 0 || vol2 === 0) return; // Skip if one is not trained
    
    const ratio = vol1 / vol2;
    
    // Flag if ratio > 2.0 (one group has 2x+ volume)
    if (ratio > 2.0) {
      imbalances.push({
        overtrainedGroup: group1,
        undertrainedGroup: group2,
        ratio,
        suggestion: `Train meer ${MUSCLE_GROUPS[group2]} - nu ${ratio.toFixed(1)}x minder dan ${MUSCLE_GROUPS[group1]}`
      });
    } else if (ratio < 0.5) {
      imbalances.push({
        overtrainedGroup: group2,
        undertrainedGroup: group1,
        ratio: 1 / ratio,
        suggestion: `Train meer ${MUSCLE_GROUPS[group1]} - nu ${(1/ratio).toFixed(1)}x minder dan ${MUSCLE_GROUPS[group2]}`
      });
    }
  });
  
  return imbalances;
}

/**
 * Compare current week vs previous week volume
 */
export interface VolumeComparison {
  currentWeek: MuscleGroupVolume[];
  previousWeek: MuscleGroupVolume[];
  changes: {
    group: MuscleGroup;
    currentVolume: number;
    previousVolume: number;
    change: number;
    percentageChange: number;
  }[];
}

export function compareWeeklyVolume(workouts: WorkoutLog[]): VolumeComparison {
  const currentWeek = calculateMuscleGroupVolume(workouts, 7);
  const previousWeek = calculateMuscleGroupVolume(
    workouts.filter(w => {
      const date = new Date(w.date);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysAgo >= 7 && daysAgo < 14;
    }),
    7
  );
  
  const currentMap = new Map(currentWeek.map(v => [v.group, v.totalVolume]));
  const previousMap = new Map(previousWeek.map(v => [v.group, v.totalVolume]));
  
  const allGroups = new Set([...currentMap.keys(), ...previousMap.keys()]);
  
  const changes = Array.from(allGroups).map(group => {
    const current = currentMap.get(group) || 0;
    const previous = previousMap.get(group) || 0;
    const change = current - previous;
    const percentageChange = previous > 0 ? (change / previous) * 100 : 0;
    
    return {
      group,
      currentVolume: current,
      previousVolume: previous,
      change,
      percentageChange
    };
  }).sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));
  
  return {
    currentWeek,
    previousWeek,
    changes
  };
}
