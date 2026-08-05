export type WorkoutIntent = 'standard' | 'technique' | 'speed' | 'form_focus';

export const DEFAULT_WORKOUT_INTENT: WorkoutIntent = 'standard';

export const LIGHT_WORKOUT_INTENTS: WorkoutIntent[] = ['technique', 'speed', 'form_focus'];

const INTENT_ALIASES: Record<string, WorkoutIntent> = {
  standard: 'standard',
  normaal: 'standard',
  normal: 'standard',
  techniek: 'technique',
  technique: 'technique',
  techniekworkout: 'technique',
  techniqueworkout: 'technique',
  speed: 'speed',
  snelheid: 'speed',
  formfocus: 'form_focus',
  form_focus: 'form_focus',
  'form-focus': 'form_focus',
  vorm: 'form_focus',
  vormfocus: 'form_focus',
  technieksessie: 'technique',
  speedsessie: 'speed',
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z_]/g, '');
}

export function normalizeWorkoutIntent(value?: string | null): WorkoutIntent | null {
  if (!value) return null;
  const key = normalizeKey(value);
  if (key in INTENT_ALIASES) return INTENT_ALIASES[key];
  // Also try a collapsed key for aliases like "techniek workout".
  const collapsed = key.replace(/_/g, '');
  return INTENT_ALIASES[collapsed] ?? null;
}

export function inferWorkoutIntent(name?: string, value?: string | null): WorkoutIntent {
  const explicit = normalizeWorkoutIntent(value);
  if (explicit) return explicit;

  const n = (name || '').toLowerCase();
  if (!n) return DEFAULT_WORKOUT_INTENT;

  if (/(technique|techniek|skill|techniekdag)/.test(n)) return 'technique';
  if (/(speed|snelheid|explosief|explosive)/.test(n)) return 'speed';
  if (/(form|vorm|rom|range of motion|movement quality)/.test(n)) return 'form_focus';

  return DEFAULT_WORKOUT_INTENT;
}

export function isLightWorkoutSession(workout?: { name?: string | null; trainingIntent?: string | null }): boolean {
  if (!workout) return false;
  const inferred = inferWorkoutIntent(workout.name || undefined, workout.trainingIntent);
  return LIGHT_WORKOUT_INTENTS.includes(inferred);
}

export function isLightWorkoutIntent(intent?: string | null): boolean {
  const normalized = normalizeWorkoutIntent(intent);
  return !!normalized && LIGHT_WORKOUT_INTENTS.includes(normalized);
}

export function isStandardWorkoutIntent(intent?: string | null): boolean {
  const normalized = normalizeWorkoutIntent(intent);
  return !normalized || normalized === 'standard';
}