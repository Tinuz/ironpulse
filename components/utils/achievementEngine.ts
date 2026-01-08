// Achievement System Engine
// Detects and tracks user achievements based on workout history

import { WorkoutLog } from '@/components/context/DataContext';

export type AchievementCategory = 'milestone' | 'streak' | 'pr' | 'volume' | 'consistency';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string; // Emoji
  threshold: number;
  unlockedAt?: Date;
}

export interface AchievementProgress {
  achievement: Achievement;
  current: number;
  target: number;
  percentage: number;
  unlocked: boolean;
}

// All available achievements
export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Milestone Achievements
  {
    id: 'first_workout',
    name: 'Eerste Stap',
    description: 'Voltooi je eerste workout',
    category: 'milestone',
    icon: '🎯',
    threshold: 1
  },
  {
    id: 'workout_10',
    name: 'Op Stoom',
    description: 'Voltooi 10 workouts',
    category: 'milestone',
    icon: '💪',
    threshold: 10
  },
  {
    id: 'workout_25',
    name: 'Toegewijd',
    description: 'Voltooi 25 workouts',
    category: 'milestone',
    icon: '🔥',
    threshold: 25
  },
  {
    id: 'workout_50',
    name: 'Half Honderd',
    description: 'Voltooi 50 workouts',
    category: 'milestone',
    icon: '⭐',
    threshold: 50
  },
  {
    id: 'workout_100',
    name: 'Honderd Keer Sterk',
    description: 'Voltooi 100 workouts',
    category: 'milestone',
    icon: '👑',
    threshold: 100
  },
  
  // Streak Achievements
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7 dagen streak',
    category: 'streak',
    icon: '🔥',
    threshold: 7
  },
  {
    id: 'streak_30',
    name: 'Maand Master',
    description: '30 dagen streak',
    category: 'streak',
    icon: '🌟',
    threshold: 30
  },
  {
    id: 'streak_60',
    name: 'Onbreekbaar',
    description: '60 dagen streak',
    category: 'streak',
    icon: '💎',
    threshold: 60
  },
  {
    id: 'streak_90',
    name: 'Legendary Streak',
    description: '90 dagen streak',
    category: 'streak',
    icon: '🏆',
    threshold: 90
  },
  
  // PR Achievements
  {
    id: 'first_pr',
    name: 'Eerste PR',
    description: 'Behaal je eerste personal record',
    category: 'pr',
    icon: '🎉',
    threshold: 1
  },
  {
    id: 'pr_5',
    name: 'PR Collector',
    description: 'Behaal 5 personal records',
    category: 'pr',
    icon: '📈',
    threshold: 5
  },
  {
    id: 'pr_10',
    name: 'PR Machine',
    description: 'Behaal 10 personal records',
    category: 'pr',
    icon: '⚡',
    threshold: 10
  },
  {
    id: 'pr_25',
    name: 'PR Legend',
    description: 'Behaal 25 personal records',
    category: 'pr',
    icon: '🌠',
    threshold: 25
  },
  
  // Volume Achievements
  {
    id: 'volume_10k',
    name: '10K Club',
    description: 'Til 10.000 kg totaal volume',
    category: 'volume',
    icon: '💪',
    threshold: 10000
  },
  {
    id: 'volume_25k',
    name: '25K Beast',
    description: 'Til 25.000 kg totaal volume',
    category: 'volume',
    icon: '🦍',
    threshold: 25000
  },
  {
    id: 'volume_50k',
    name: '50K Titan',
    description: 'Til 50.000 kg totaal volume',
    category: 'volume',
    icon: '🏔️',
    threshold: 50000
  },
  {
    id: 'volume_100k',
    name: '100K Hercules',
    description: 'Til 100.000 kg totaal volume',
    category: 'volume',
    icon: '⚡',
    threshold: 100000
  },
  
  // Consistency Achievements
  {
    id: 'consistency_2week',
    name: 'Consistent Starter',
    description: 'Train 3x per week, 2 weken lang',
    category: 'consistency',
    icon: '📅',
    threshold: 2
  },
  {
    id: 'consistency_4week',
    name: 'Routine Master',
    description: 'Train 3x per week, 4 weken lang',
    category: 'consistency',
    icon: '🎯',
    threshold: 4
  },
  {
    id: 'consistency_8week',
    name: 'Discipline King',
    description: 'Train 3x per week, 8 weken lang',
    category: 'consistency',
    icon: '👑',
    threshold: 8
  }
];

// Calculate current streak from workout history
export function calculateStreak(workouts: WorkoutLog[]): number {
  if (workouts.length === 0) return 0;
  
  const sortedWorkouts = [...workouts].sort((a, b) => {
    const dateA = a.completedAt || a.date;
    const dateB = b.completedAt || b.date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (const workout of sortedWorkouts) {
    const workoutDate = new Date(workout.completedAt || workout.date);
    workoutDate.setHours(0, 0, 0, 0);
    
    const dayDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === streak) {
      streak++;
      currentDate = new Date(workoutDate);
    } else if (dayDiff > streak) {
      break;
    }
  }
  
  return streak;
}

// Count total PRs achieved
export function countPRs(workouts: WorkoutLog[]): number {
  const prsByExercise = new Map<string, number>();
  
  const sortedWorkouts = [...workouts].sort((a, b) => {
    const dateA = a.completedAt || a.date;
    const dateB = b.completedAt || b.date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  
  let totalPRs = 0;
  
  for (const workout of sortedWorkouts) {
    for (const exercise of workout.exercises) {
      const completedSets = exercise.sets.filter(s => s.completed);
      if (completedSets.length === 0) continue;
      
      // Calculate best 1RM for this exercise in this workout
      const best1RM = Math.max(...completedSets.map(set => {
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        return weight * (1 + reps / 30); // Brzycki formula
      }));
      
      const previousBest = prsByExercise.get(exercise.name) || 0;
      
      if (best1RM > previousBest) {
        totalPRs++;
        prsByExercise.set(exercise.name, best1RM);
      }
    }
  }
  
  return totalPRs;
}

// Calculate total volume lifted (kg)
export function calculateTotalVolume(workouts: WorkoutLog[]): number {
  let totalVolume = 0;
  
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (set.completed) {
          const weight = set.weight || 0;
          const reps = set.reps || 0;
          totalVolume += weight * reps;
        }
      }
    }
  }
  
  return totalVolume;
}

// Check consistency: weeks with at least 3 workouts
export function calculateConsistencyWeeks(workouts: WorkoutLog[]): number {
  if (workouts.length === 0) return 0;
  
  const sortedWorkouts = [...workouts].sort((a, b) => {
    const dateA = a.completedAt || a.date;
    const dateB = b.completedAt || b.date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  
  // Group workouts by week
  const workoutsByWeek = new Map<string, number>();
  
  for (const workout of sortedWorkouts) {
    const date = new Date(workout.completedAt || workout.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    workoutsByWeek.set(weekKey, (workoutsByWeek.get(weekKey) || 0) + 1);
  }
  
  // Count consecutive weeks with 3+ workouts (from most recent)
  const weekKeys = Array.from(workoutsByWeek.keys()).sort().reverse();
  let consecutiveWeeks = 0;
  
  for (const weekKey of weekKeys) {
    if ((workoutsByWeek.get(weekKey) || 0) >= 3) {
      consecutiveWeeks++;
    } else {
      break; // Stop at first week with <3 workouts
    }
  }
  
  return consecutiveWeeks;
}

/**
 * Check all achievements and return progress
 */
export function checkAchievements(
  workouts: WorkoutLog[],
  unlockedAchievements: string[]
): AchievementProgress[] {
  const workoutCount = workouts.length;
  const currentStreak = calculateStreak(workouts);
  const totalPRs = countPRs(workouts);
  const totalVolume = calculateTotalVolume(workouts);
  const consistencyWeeks = calculateConsistencyWeeks(workouts);
  
  return ALL_ACHIEVEMENTS.map(achievement => {
    let current = 0;
    
    switch (achievement.category) {
      case 'milestone':
        current = workoutCount;
        break;
      case 'streak':
        current = currentStreak;
        break;
      case 'pr':
        current = totalPRs;
        break;
      case 'volume':
        current = totalVolume;
        break;
      case 'consistency':
        current = consistencyWeeks;
        break;
    }
    
    const unlocked = unlockedAchievements.includes(achievement.id);
    
    return {
      achievement,
      current,
      target: achievement.threshold,
      percentage: Math.min(100, (current / achievement.threshold) * 100),
      unlocked
    };
  });
}

/**
 * Get newly unlocked achievements
 */
export function getNewlyUnlocked(
  achievementProgress: AchievementProgress[],
  previousUnlocked: string[]
): Achievement[] {
  return achievementProgress
    .filter(progress => 
      progress.current >= progress.target && 
      !previousUnlocked.includes(progress.achievement.id)
    )
    .map(progress => progress.achievement);
}

/**
 * Get next achievements to unlock (closest to completion)
 */
export function getNextAchievements(
  achievementProgress: AchievementProgress[],
  count: number = 3
): AchievementProgress[] {
  return achievementProgress
    .filter(progress => !progress.unlocked)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, count);
}

/**
 * Get recently unlocked achievements
 */
export function getRecentlyUnlocked(
  achievements: Achievement[],
  count: number = 5
): Achievement[] {
  return achievements
    .filter(a => a.unlockedAt)
    .sort((a, b) => {
      const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, count);
}
