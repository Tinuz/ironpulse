/**
 * Exercise classification utilities.
 *
 * Lightweight module with no heavy dependencies — safe to import in analytics
 * files that are tested in a Node/Vitest environment without Next.js data loading.
 */

/**
 * Determine if exercise is compound (involves multiple joints/muscle groups).
 *
 * Science: Only compound lifts stagnating together indicate systemic fatigue
 * (Bannister 1975 fitness-fatigue model; Zatsiorsky & Kraemer 2006).
 * Isolation exercises plateau due to accommodation, not accumulated fatigue.
 */
export function isCompoundExercise(exerciseName: string): boolean {
  const name = exerciseName.toLowerCase();

  // Common isolation exercises — check first (more specific patterns)
  const isolationKeywords = [
    'curl', 'extension', 'raise', 'fly', 'flye', 'crunch', 'shrug',
    'calf', 'lateral', 'front raise', 'rear delt', 'kickback', 'pullover',
  ];
  for (const keyword of isolationKeywords) {
    if (name.includes(keyword)) return false;
  }

  // Common compound exercises
  const compoundKeywords = [
    'squat', 'deadlift', 'bench', 'press', 'row', 'pull up', 'pullup',
    'chin up', 'dip', 'lunge', 'clean', 'snatch', 'thruster',
  ];
  for (const keyword of compoundKeywords) {
    if (name.includes(keyword)) return true;
  }

  // Default to isolation if unknown (safer — avoids false deload triggers)
  return false;
}
