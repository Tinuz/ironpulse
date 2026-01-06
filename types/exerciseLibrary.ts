// Exercise Library Type Definitions
// Based on exercisesv3.json structure

export interface ExerciseProfile {
  targetMuscleGroup: string
  exerciseType: string
  equipmentRequired: string
  mechanics: string
  forceType: string
  experienceLevel: string
  secondaryMuscles: string[]
}

export interface ExerciseAnatomy {
  muscleGroup: string
  image: string
  alt: string
}

export interface ExerciseMedia {
  heroImage: string
  videoThumb: string
}

export interface ExerciseMeta {
  Type: string
  Equipment: string
  Mechanics: string
  'Exp. Level': string
}

export interface LibraryExercise {
  name: string
  url: string
  group: string
  profile: ExerciseProfile
  instructions: string[]
  video: string
  images: string[]
  tips?: string[]
  views: string
  comments: string
  meta: ExerciseMeta
  groups: string[]
  image: string
  overview: string
  overviewParagraphs: string[]
  anatomy: ExerciseAnatomy
  media: ExerciseMedia
}

export interface ExerciseFilters {
  search: string
  muscleGroup: string | null
  equipment: string | null
  experienceLevel: string | null
  mechanics: string | null
}

export type MuscleGroup = 
  | 'abs' | 'biceps' | 'triceps' | 'chest' | 'back' 
  | 'shoulders' | 'legs' | 'calves' | 'glutes' | 'forearms'
  | 'lats' | 'middle-back' | 'lower-back' | 'quads' 
  | 'hamstrings' | 'traps' | 'obliques' | 'hip-flexors'

export type EquipmentType = 
  | 'bodyweight' | 'barbell' | 'dumbbell' | 'cable' 
  | 'machine' | 'exercise-ball' | 'ez-bar'

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced'

export type MechanicsType = 'compound' | 'isolation'
