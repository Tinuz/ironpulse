import { WorkoutLog, NutritionLog } from '@/components/context/DataContext';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { calculateMuscleGroupVolume, detectMuscleImbalances, MUSCLE_GROUPS } from './volumeAnalytics';

/**
 * Weekly summary data structure
 */
export interface WeeklySummary {
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  stats: {
    totalWorkouts: number;
    totalExercises: number;
    totalSets: number;
    totalReps: number;
    totalVolume: number; // kg × reps
    totalCalories: number;
    avgWorkoutDuration: number; // minutes
  };
  muscleGroups: {
    group: string;
    sets: number;
    volume: number;
  }[];
  topExercises: {
    name: string;
    sets: number;
    bestWeight: number;
  }[];
  nutrition?: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFats: number;
    daysLogged: number;
  };
  insights: string[]; // AI-generated or rule-based insights
}

/**
 * Calculate weekly summary for a given week
 */
export function calculateWeeklySummary(
  workouts: WorkoutLog[],
  nutritionLogs: NutritionLog[],
  weekOffset: number = 0 // 0 = current week, -1 = last week, etc.
): WeeklySummary {
  const now = new Date();
  const weekStart = startOfWeek(subDays(now, weekOffset * 7), { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(subDays(now, weekOffset * 7), { weekStartsOn: 1 }); // Sunday
  
  // Filter workouts for this week
  const weekWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date);
    return workoutDate >= weekStart && workoutDate <= weekEnd;
  });
  
  // Calculate stats
  let totalExercises = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let totalCalories = 0;
  let totalDuration = 0;
  
  const exerciseStats = new Map<string, { sets: number; bestWeight: number }>();
  
  weekWorkouts.forEach(workout => {
    totalExercises += workout.exercises.length;
    totalCalories += workout.totalCalories || 0;
    
    if (workout.endTime && workout.startTime) {
      totalDuration += (workout.endTime - workout.startTime) / (1000 * 60); // minutes
    }
    
    workout.exercises.forEach(ex => {
      let exSets = 0;
      let bestWeight = 0;
      
      ex.sets.forEach(set => {
        if (set.completed) {
          totalSets++;
          totalReps += set.reps;
          totalVolume += set.weight * set.reps;
          exSets++;
          if (set.weight > bestWeight) {
            bestWeight = set.weight;
          }
        }
      });
      
      const existing = exerciseStats.get(ex.name);
      if (existing) {
        existing.sets += exSets;
        existing.bestWeight = Math.max(existing.bestWeight, bestWeight);
      } else {
        exerciseStats.set(ex.name, { sets: exSets, bestWeight });
      }
    });
  });
  
  // Top exercises
  const topExercises = Array.from(exerciseStats.entries())
    .map(([name, stats]) => ({
      name,
      sets: stats.sets,
      bestWeight: stats.bestWeight
    }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 5);
  
  // Muscle group volume
  const muscleGroupVolume = calculateMuscleGroupVolume(weekWorkouts, 7);
  const muscleGroups = muscleGroupVolume.map(mg => ({
    group: MUSCLE_GROUPS[mg.group],
    sets: mg.totalSets,
    volume: mg.totalVolume
  }));
  
  // Nutrition summary
  const weekNutrition = nutritionLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= weekStart && logDate <= weekEnd;
  });
  
  let nutrition: WeeklySummary['nutrition'] = undefined;
  if (weekNutrition.length > 0) {
    const totalCals = weekNutrition.reduce((sum, log) => 
      sum + log.items.reduce((s, i) => s + i.calories, 0), 0);
    const totalProtein = weekNutrition.reduce((sum, log) => 
      sum + log.items.reduce((s, i) => s + i.protein, 0), 0);
    const totalCarbs = weekNutrition.reduce((sum, log) => 
      sum + log.items.reduce((s, i) => s + i.carbs, 0), 0);
    const totalFats = weekNutrition.reduce((sum, log) => 
      sum + log.items.reduce((s, i) => s + i.fats, 0), 0);
    
    nutrition = {
      avgCalories: Math.round(totalCals / weekNutrition.length),
      avgProtein: Math.round(totalProtein / weekNutrition.length),
      avgCarbs: Math.round(totalCarbs / weekNutrition.length),
      avgFats: Math.round(totalFats / weekNutrition.length),
      daysLogged: weekNutrition.length
    };
  }
  
  // Generate insights (rule-based)
  const insights: string[] = [];
  
  if (weekWorkouts.length === 0) {
    insights.push('Geen workouts deze week - tijd om te beginnen!');
  } else if (weekWorkouts.length >= 4) {
    insights.push(`Geweldige week! ${weekWorkouts.length} workouts voltooid 💪`);
  } else if (weekWorkouts.length >= 2) {
    insights.push(`Goed bezig! ${weekWorkouts.length} workouts deze week`);
  }
  
  if (totalVolume > 0) {
    insights.push(`Totaal volume: ${Math.round(totalVolume / 1000)}k kg verplaatst`);
  }
  
  // Check muscle imbalances
  const imbalances = detectMuscleImbalances(muscleGroupVolume);
  if (imbalances.length > 0) {
    insights.push(`⚠️ ${imbalances[0].suggestion}`);
  }
  
  // Top exercise
  if (topExercises.length > 0) {
    insights.push(`Top oefening: ${topExercises[0].name} (${topExercises[0].sets} sets)`);
  }
  
  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    stats: {
      totalWorkouts: weekWorkouts.length,
      totalExercises,
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      totalCalories,
      avgWorkoutDuration: weekWorkouts.length > 0 ? Math.round(totalDuration / weekWorkouts.length) : 0
    },
    muscleGroups,
    topExercises,
    nutrition,
    insights
  };
}

/**
 * Compare current week to previous weeks
 */
export interface WeeklyComparison {
  currentWeek: WeeklySummary;
  lastWeek: WeeklySummary;
  trend: 'improving' | 'declining' | 'stable';
  volumeChange: number; // percentage
  workoutChange: number; // absolute
}

export function compareWeeks(
  workouts: WorkoutLog[],
  nutritionLogs: NutritionLog[]
): WeeklyComparison {
  const currentWeek = calculateWeeklySummary(workouts, nutritionLogs, 0);
  const lastWeek = calculateWeeklySummary(workouts, nutritionLogs, -1);
  
  const volumeChange = lastWeek.stats.totalVolume > 0
    ? ((currentWeek.stats.totalVolume - lastWeek.stats.totalVolume) / lastWeek.stats.totalVolume) * 100
    : 0;
  
  const workoutChange = currentWeek.stats.totalWorkouts - lastWeek.stats.totalWorkouts;
  
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (volumeChange > 5) trend = 'improving';
  else if (volumeChange < -5) trend = 'declining';
  
  return {
    currentWeek,
    lastWeek,
    trend,
    volumeChange,
    workoutChange
  };
}
