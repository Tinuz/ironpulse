import { LibraryExercise, ExerciseFilters } from '@/types/exerciseLibrary'

// Lazy load exercise data to reduce initial bundle size
let exercisesData: LibraryExercise[] | null = null

// Synchronous access for when data is already loaded
function getExercises(): LibraryExercise[] {
  if (!exercisesData) {
    // Fallback: load synchronously (only happens on first access)
    const data = require('@/exercisesv3.json')
    exercisesData = data as LibraryExercise[]
  }
  return exercisesData
}

// Type-safe exercise library (loaded synchronously for now - optimize later)
export const EXERCISES_LIBRARY: LibraryExercise[] = getExercises()

// Pre-built index for fast lookups by name
export const EXERCISE_BY_NAME = new Map(
  EXERCISES_LIBRARY.map(ex => [ex.name.toLowerCase(), ex])
)

// Group exercises by muscle group
export const EXERCISES_BY_GROUP = EXERCISES_LIBRARY.reduce((acc, ex) => {
  if (!acc[ex.group]) {
    acc[ex.group] = []
  }
  acc[ex.group].push(ex)
  return acc
}, {} as Record<string, LibraryExercise[]>)

// Get all unique muscle groups
export const MUSCLE_GROUPS = Array.from(
  new Set(EXERCISES_LIBRARY.map(ex => ex.group))
).sort()

// Get all unique equipment types
export const EQUIPMENT_TYPES = Array.from(
  new Set(
    EXERCISES_LIBRARY.flatMap(ex => 
      ex.profile.equipmentRequired ? [ex.profile.equipmentRequired] : []
    )
  )
).sort()

// Get all unique experience levels
export const EXPERIENCE_LEVELS = Array.from(
  new Set(EXERCISES_LIBRARY.map(ex => ex.profile.experienceLevel))
).sort()

// Get all unique mechanics types
export const MECHANICS_TYPES = Array.from(
  new Set(EXERCISES_LIBRARY.map(ex => ex.profile.mechanics))
).sort()

/**
 * Filter and search exercises based on criteria
 */
export function filterExercises(filters: ExerciseFilters): LibraryExercise[] {
  let results = EXERCISES_LIBRARY

  // Search by name (case-insensitive)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    results = results.filter(ex => 
      ex.name?.toLowerCase().includes(searchLower) ||
      ex.overview?.toLowerCase().includes(searchLower) ||
      ex.profile?.targetMuscleGroup?.toLowerCase().includes(searchLower)
    )
  }

  // Filter by muscle group
  if (filters.muscleGroup) {
    results = results.filter(ex => ex.group === filters.muscleGroup)
  }

  // Filter by equipment
  if (filters.equipment) {
    results = results.filter(ex => 
      ex.profile.equipmentRequired === filters.equipment
    )
  }

  // Filter by experience level
  if (filters.experienceLevel) {
    results = results.filter(ex => 
      ex.profile.experienceLevel === filters.experienceLevel
    )
  }

  // Filter by mechanics
  if (filters.mechanics) {
    results = results.filter(ex => 
      ex.profile.mechanics === filters.mechanics
    )
  }

  return results
}

/**
 * Get a single exercise by name
 */
export function getExerciseByName(name: string): LibraryExercise | undefined {
  return EXERCISE_BY_NAME.get(name.toLowerCase())
}

/**
 * Get exercises by muscle group
 */
export function getExercisesByGroup(group: string): LibraryExercise[] {
  return EXERCISES_BY_GROUP[group] || []
}

/**
 * Get random exercises for recommendations
 */
export function getRandomExercises(count: number, filters?: Partial<ExerciseFilters>): LibraryExercise[] {
  let pool = EXERCISES_LIBRARY
  
  if (filters) {
    pool = filterExercises({
      search: filters.search || '',
      muscleGroup: filters.muscleGroup || null,
      equipment: filters.equipment || null,
      experienceLevel: filters.experienceLevel || null,
      mechanics: filters.mechanics || null,
    })
  }
  
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Get similar exercises (same muscle group, different exercise)
 */
export function getSimilarExercises(exercise: LibraryExercise, count: number = 5): LibraryExercise[] {
  const similar = EXERCISES_BY_GROUP[exercise.group]
    ?.filter(ex => ex.name !== exercise.name) || []
  
  return similar.slice(0, count)
}
