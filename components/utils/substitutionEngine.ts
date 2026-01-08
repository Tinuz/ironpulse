// Exercise Substitution Engine
// Finds alternative exercises based on muscle groups, equipment, and difficulty

import exercisesData from '@/exercisesv3.json';

export interface ExerciseData {
  name: string;
  group: string;
  groups: string[];
  profile: {
    targetMuscleGroup?: string;
    exerciseType?: string;
    equipmentRequired?: string;
    mechanics?: string;
    forceType?: string;
    experienceLevel?: string;
    secondaryMuscles?: string[];
  };
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
  // Use profile.targetMuscleGroup if available, fallback to groups
  const sourceTarget = source.profile?.targetMuscleGroup?.toLowerCase() || getPrimaryMuscleGroup(sourceMuscles);
  const targetTarget = target.profile?.targetMuscleGroup?.toLowerCase() || getPrimaryMuscleGroup(targetMuscles);
  if (sourceTarget === targetTarget) {
    score += 20;
  }
  
  // Secondary muscles match (bonus 5 points)
  const sourceSecondary = source.profile?.secondaryMuscles || [];
  const targetSecondary = target.profile?.secondaryMuscles || [];
  const commonSecondary = sourceSecondary.filter(m => targetSecondary.includes(m));
  if (commonSecondary.length > 0) {
    score += 5;
  }
  
  // Mechanics match (15 points) - prefer profile.mechanics over meta
  const sourceMechanics = source.profile?.mechanics || source.meta.Mechanics;
  const targetMechanics = target.profile?.mechanics || target.meta.Mechanics;
  if (sourceMechanics === targetMechanics) {
    score += 15;
  }
  
  // Equipment similarity (10 points) - prefer profile.equipmentRequired over meta
  const sourceEquipment = source.profile?.equipmentRequired || source.meta.Equipment;
  const targetEquipment = target.profile?.equipmentRequired || target.meta.Equipment;
  if (sourceEquipment === targetEquipment) {
    score += 10;
  }
  
  // Difficulty level (10 points for exact match, 5 for adjacent) - prefer profile.experienceLevel
  const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced'];
  const sourceDiffLevel = source.profile?.experienceLevel || source.meta['Exp. Level'] || 'Intermediate';
  const targetDiffLevel = target.profile?.experienceLevel || target.meta['Exp. Level'] || 'Intermediate';
  const sourceDiff = difficultyOrder.indexOf(sourceDiffLevel);
  const targetDiff = difficultyOrder.indexOf(targetDiffLevel);
  const diffDelta = Math.abs(sourceDiff - targetDiff);
  if (diffDelta === 0) score += 10;
  else if (diffDelta === 1) score += 5;
  
  // Apply filter penalties
  if (filters) {
    // Equipment filter (hard requirement)
    if (filters.equipment && filters.equipment.length > 0) {
      const targetEq = target.profile?.equipmentRequired || target.meta.Equipment || '';
      if (!filters.equipment.includes(targetEq)) {
        return 0; // Exclude if equipment not available
      }
    }
    
    // Max difficulty filter
    if (filters.maxDifficulty) {
      const maxDiffIndex = difficultyOrder.indexOf(filters.maxDifficulty);
      const targetDiffLevel = target.profile?.experienceLevel || target.meta['Exp. Level'] || 'Intermediate';
      const currentDiffIndex = difficultyOrder.indexOf(targetDiffLevel);
      if (currentDiffIndex > maxDiffIndex) {
        return 0; // Exclude if too difficult
      }
    }
    
    // Low impact bonus for injuries
    if (filters.lowImpact) {
      const lowImpactEquipment = ['Cable', 'Machine', 'Bodyweight', 'Dumbbell'];
      const targetEq = target.profile?.equipmentRequired || target.meta.Equipment || '';
      if (lowImpactEquipment.includes(targetEq)) {
        score += 5;
      }
      // Penalize high-impact exercises
      const highImpactKeywords = ['jump', 'explosive', 'plyometric', 'olympic'];
      if (highImpactKeywords.some(kw => target.name.toLowerCase().includes(kw))) {
        score -= 10;
      }
    }
    
    // Mechanics filter
    if (filters.mechanics) {
      const targetMech = target.profile?.mechanics || target.meta.Mechanics;
      if (targetMech !== filters.mechanics) {
        score -= 10;
      }
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
  
  const sourceMechanics = source.profile?.mechanics || source.meta.Mechanics;
  const targetMechanics = target.profile?.mechanics || target.meta.Mechanics;
  if (sourceMechanics === targetMechanics) {
    reasons.push(`Same ${sourceMechanics?.toLowerCase()} movement`);
  }
  
  const sourceEquipment = source.profile?.equipmentRequired || source.meta.Equipment;
  const targetEquipment = target.profile?.equipmentRequired || target.meta.Equipment;
  if (sourceEquipment === targetEquipment) {
    reasons.push(`Uses ${sourceEquipment?.toLowerCase()}`);
  } else if (targetEquipment) {
    reasons.push(`${targetEquipment} alternative`);
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
        equipment: ex.profile?.equipmentRequired || ex.meta.Equipment || 'Unknown',
        difficulty: ex.profile?.experienceLevel || ex.meta['Exp. Level'] || 'Intermediate',
        mechanics: ex.profile?.mechanics || ex.meta.Mechanics || 'Unknown',
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
    const equipment = ex.profile?.equipmentRequired || ex.meta.Equipment;
    if (equipment) {
      equipmentSet.add(equipment);
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
