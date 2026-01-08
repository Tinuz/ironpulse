// Exercise Substitution Engine
// Finds alternative exercises based on muscle groups, equipment, and difficulty

import exercisesData from '@/exercisesv2.json';

export interface ExerciseData {
  name: string;
  group: string;
  groups: string[];
  meta: {
    Type?: string;
    Equipment?: string;
    Mechanics?: string;
    'Exp. Level'?: string;
  };
  url?: string;
  images?: string[];
}

export interface SubstituteExercise {
  name: string;
  matchScore: number; // 0-100 score indicating how good the match is
  muscleGroups: string[];
  equipment: string;
  difficulty: string;
  mechanics: string;
  reason: string; // Why this is a good substitute
}

export interface SubstitutionFilters {
  equipment?: string[]; // Filter by available equipment
  maxDifficulty?: 'Beginner' | 'Intermediate' | 'Advanced'; // Max difficulty level
  lowImpact?: boolean; // Prioritize low-impact alternatives (for injuries)
  mechanics?: 'Compound' | 'Isolation'; // Match movement type
}

const exercises = exercisesData as ExerciseData[];

// Normalize exercise names for matching (remove "Video Exercise Guide" suffix, lowercase, trim)
function normalizeExerciseName(name: string): string {
  return name
    .replace(/video exercise guide/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Find exercise in database by name
function findExercise(exerciseName: string): ExerciseData | null {
  const normalized = normalizeExerciseName(exerciseName);
  return exercises.find(ex => normalizeExerciseName(ex.name) === normalized) || null;
}

// Get primary muscle group (simplified mapping)
function getPrimaryMuscleGroup(groups: string[]): string {
  // Priority order for muscle groups
  const muscleGroupPriority = [
    'chest', 'back', 'shoulders', 'legs', 'quads', 'hamstrings', 'glutes',
    'biceps', 'triceps', 'abs', 'calves', 'forearms'
  ];
  
  for (const muscle of muscleGroupPriority) {
    if (groups.includes(muscle)) {
      return muscle;
    }
  }
  
  return groups[0] || 'unknown';
}

// Calculate match score between two exercises
function calculateMatchScore(
  source: ExerciseData,
  target: ExerciseData,
  filters?: SubstitutionFilters
): number {
  let score = 0;
  
  // Muscle group match (40 points max)
  const sourceMuscles = source.groups || [];
  const targetMuscles = target.groups || [];
  const commonMuscles = sourceMuscles.filter(m => targetMuscles.includes(m));
  const muscleMatchRatio = commonMuscles.length / Math.max(sourceMuscles.length, 1);
  score += muscleMatchRatio * 40;
  
  // Primary muscle group exact match (bonus 20 points)
  const sourcePrimary = getPrimaryMuscleGroup(sourceMuscles);
  const targetPrimary = getPrimaryMuscleGroup(targetMuscles);
  if (sourcePrimary === targetPrimary) {
    score += 20;
  }
  
  // Mechanics match (15 points)
  if (source.meta.Mechanics === target.meta.Mechanics) {
    score += 15;
  }
  
  // Equipment similarity (10 points)
  if (source.meta.Equipment === target.meta.Equipment) {
    score += 10;
  }
  
  // Difficulty level (10 points for exact match, 5 for adjacent)
  const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced'];
  const sourceDiff = difficultyOrder.indexOf(source.meta['Exp. Level'] || 'Intermediate');
  const targetDiff = difficultyOrder.indexOf(target.meta['Exp. Level'] || 'Intermediate');
  const diffDelta = Math.abs(sourceDiff - targetDiff);
  if (diffDelta === 0) score += 10;
  else if (diffDelta === 1) score += 5;
  
  // Apply filter penalties
  if (filters) {
    // Equipment filter (hard requirement)
    if (filters.equipment && filters.equipment.length > 0) {
      if (!filters.equipment.includes(target.meta.Equipment || '')) {
        return 0; // Exclude if equipment not available
      }
    }
    
    // Max difficulty filter
    if (filters.maxDifficulty) {
      const maxDiffIndex = difficultyOrder.indexOf(filters.maxDifficulty);
      if (targetDiff > maxDiffIndex) {
        return 0; // Exclude if too difficult
      }
    }
    
    // Low impact bonus for injuries
    if (filters.lowImpact) {
      const lowImpactEquipment = ['Cable', 'Machine', 'Bodyweight', 'Dumbbell'];
      if (lowImpactEquipment.includes(target.meta.Equipment || '')) {
        score += 5;
      }
      // Penalize high-impact exercises
      const highImpactKeywords = ['jump', 'explosive', 'plyometric', 'olympic'];
      if (highImpactKeywords.some(kw => target.name.toLowerCase().includes(kw))) {
        score -= 10;
      }
    }
    
    // Mechanics filter
    if (filters.mechanics && target.meta.Mechanics !== filters.mechanics) {
      score -= 10;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

// Generate reason why exercise is a good substitute
function generateReason(
  source: ExerciseData,
  target: ExerciseData,
  matchScore: number
): string {
  const reasons: string[] = [];
  
  const sourceMuscles = source.groups || [];
  const targetMuscles = target.groups || [];
  const commonMuscles = sourceMuscles.filter(m => targetMuscles.includes(m));
  
  if (commonMuscles.length > 0) {
    reasons.push(`Targets ${commonMuscles.slice(0, 2).join(', ')}`);
  }
  
  if (source.meta.Mechanics === target.meta.Mechanics) {
    reasons.push(`Same ${source.meta.Mechanics?.toLowerCase()} movement`);
  }
  
  if (source.meta.Equipment === target.meta.Equipment) {
    reasons.push(`Uses ${source.meta.Equipment?.toLowerCase()}`);
  } else if (target.meta.Equipment) {
    reasons.push(`${target.meta.Equipment} alternative`);
  }
  
  if (matchScore >= 80) {
    reasons.push('Excellent match');
  } else if (matchScore >= 60) {
    reasons.push('Good alternative');
  }
  
  return reasons.join(' • ');
}

/**
 * Find substitute exercises for a given exercise
 * @param exerciseName - Name of the exercise to find substitutes for
 * @param filters - Optional filters for equipment, difficulty, etc.
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Array of substitute exercises, sorted by match score
 */
export function findSubstitutes(
  exerciseName: string,
  filters?: SubstitutionFilters,
  maxResults: number = 10
): SubstituteExercise[] {
  // Find source exercise
  const sourceExercise = findExercise(exerciseName);
  
  if (!sourceExercise) {
    // Exercise not in database, return empty array
    console.warn(`Exercise "${exerciseName}" not found in database`);
    return [];
  }
  
  // Calculate match scores for all exercises
  const candidates: SubstituteExercise[] = exercises
    .filter(ex => normalizeExerciseName(ex.name) !== normalizeExerciseName(exerciseName)) // Exclude source exercise
    .map(ex => {
      const matchScore = calculateMatchScore(sourceExercise, ex, filters);
      return {
        name: ex.name.replace(/Video Exercise Guide/i, '').trim(),
        matchScore,
        muscleGroups: ex.groups || [],
        equipment: ex.meta.Equipment || 'Unknown',
        difficulty: ex.meta['Exp. Level'] || 'Intermediate',
        mechanics: ex.meta.Mechanics || 'Unknown',
        reason: generateReason(sourceExercise, ex, matchScore)
      };
    })
    .filter(sub => sub.matchScore > 20) // Only keep reasonable matches
    .sort((a, b) => b.matchScore - a.matchScore) // Sort by match score descending
    .slice(0, maxResults);
  
  return candidates;
}

/**
 * Get available equipment types from database
 */
export function getAvailableEquipment(): string[] {
  const equipmentSet = new Set<string>();
  exercises.forEach(ex => {
    if (ex.meta.Equipment) {
      equipmentSet.add(ex.meta.Equipment);
    }
  });
  return Array.from(equipmentSet).sort();
}

/**
 * Get exercise details from database
 */
export function getExerciseDetails(exerciseName: string): ExerciseData | null {
  return findExercise(exerciseName);
}

/**
 * Find substitutes for injury recovery (low-impact, beginner-friendly)
 */
export function findInjuryFriendlySubstitutes(
  exerciseName: string,
  maxResults: number = 10
): SubstituteExercise[] {
  return findSubstitutes(
    exerciseName,
    {
      lowImpact: true,
      maxDifficulty: 'Intermediate'
    },
    maxResults
  );
}

/**
 * Find substitutes for specific equipment
 */
export function findEquipmentAlternatives(
  exerciseName: string,
  availableEquipment: string[],
  maxResults: number = 10
): SubstituteExercise[] {
  return findSubstitutes(
    exerciseName,
    {
      equipment: availableEquipment
    },
    maxResults
  );
}
