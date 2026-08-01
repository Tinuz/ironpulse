export type WorkoutIntent = 'standard' | 'technique' | 'speed' | 'form_focus';

export const DEFAULT_WORKOUT_INTENT: WorkoutIntent = 'standard';

export const LIGHT_WORKOUT_INTENTS: WorkoutIntent[] = ['technique', 'speed', 'form_focus'];

export function isLightWorkoutIntent(intent?: WorkoutIntent | null): boolean {
  return !!intent && LIGHT_WORKOUT_INTENTS.includes(intent);
}

export function isStandardWorkoutIntent(intent?: WorkoutIntent | null): boolean {
  return !intent || intent === 'standard';
}