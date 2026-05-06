import { WorkoutExercise, WorkoutLog } from '@/components/context/DataContext';

/**
 * 1RM berekening via gecombineerde formule:
 * - Reps 1–10: Brzycki (meest accuraat in kracht-range, Brzycki 1993)
 *   1RM = weight / (1.0278 − 0.0278 × reps)
 * - Reps 11–30: Epley (stabieler bij hogere reps, Epley 1985)
 *   1RM = weight × (1 + reps / 30)
 * - Reps > 30: niet betrouwbaar, geef een conservatieve schatting
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps <= 10) {
    return weight / (1.0278 - 0.0278 * reps);
  }
  if (reps <= 30) {
    // Epley formula
    return weight * (1 + reps / 30);
  }
  // Very high reps: use conservative Epley capped at reps=30
  return weight * (1 + 30 / 30);
}

/**
 * Vind de beste (hoogste) 1RM van alle sets in een exercise
 */
export function getBest1RM(exercise: WorkoutExercise): {
  oneRM: number;
  setIndex: number;
  weight: number;
  reps: number;
} | null {
  const completedSets = exercise.sets.filter(s => s.completed && !s.isWarmup && s.reps > 0 && s.weight > 0);
  
  if (completedSets.length === 0) return null;

  let best = {
    oneRM: 0,
    setIndex: 0,
    weight: 0,
    reps: 0
  };

  completedSets.forEach((set, index) => {
    const estimated1RM = calculate1RM(set.weight, set.reps);
    if (estimated1RM > best.oneRM) {
      best = {
        oneRM: estimated1RM,
        setIndex: index,
        weight: set.weight,
        reps: set.reps
      };
    }
  });

  return best.oneRM > 0 ? best : null;
}

/**
 * Bereken totale volume voor een exercise
 * Volume = sets × reps × gewicht
 */
export function calculateVolume(exercise: WorkoutExercise): number {
  return exercise.sets
    .filter(s => s.completed && !s.isWarmup)
    .reduce((total, set) => total + (set.weight * set.reps), 0);
}

/**
 * Rond 1RM af op halve kilo's voor praktische weergave
 */
export function roundTo(value: number, increment: number = 0.5): number {
  return Math.round(value / increment) * increment;
}

/**
 * Vind vorige workouts voor een specifieke exercise naam
 * Excludes deload workouts from progressive overload tracking
 */
export function getPreviousWorkoutsForExercise(
  exerciseName: string,
  allHistory: WorkoutLog[],
  excludeWorkoutId?: string
): WorkoutLog[] {
  return allHistory
    .filter(w => {
      if (excludeWorkoutId && w.id === excludeWorkoutId) return false;
      if (w.isDeload) return false; // Exclude deload workouts from progression tracking
      return w.exercises.some(ex => ex.name.toLowerCase() === exerciseName.toLowerCase());
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Haal exercise data op uit een specifieke workout
 */
export function getExerciseFromWorkout(
  workout: WorkoutLog,
  exerciseName: string
): WorkoutExercise | null {
  return workout.exercises.find(ex => ex.name.toLowerCase() === exerciseName.toLowerCase()) || null;
}

/**
 * Bereken progressie tussen huidige en vorige exercise
 */
export interface ProgressionData {
  current1RM: number;
  previous1RM: number | null;
  difference: number;
  percentageChange: number;
  currentVolume: number;
  previousVolume: number | null;
  volumeDifference: number;
  status: 'improved' | 'declined' | 'same' | 'first-time';
  daysSinceLast: number | null;
  // Rep progression tracking
  sameWeight: boolean;
  repProgression: number; // Average rep increase at same weight
  readyForWeightIncrease: boolean; // All sets hit target reps
  currentAverageReps: number;
  previousAverageReps: number | null;
}

export function calculateProgression(
  currentExercise: WorkoutExercise,
  previousExercises: WorkoutExercise[]
): ProgressionData {
  const current1RM = getBest1RM(currentExercise);
  const currentVolume = calculateVolume(currentExercise);
  
  // Calculate average reps for current workout (completed sets only)
  const currentCompletedSets = currentExercise.sets.filter(s => s.completed && !s.isWarmup && s.reps > 0);
  const currentAverageReps = currentCompletedSets.length > 0
    ? currentCompletedSets.reduce((sum, s) => sum + s.reps, 0) / currentCompletedSets.length
    : 0;

  // Infer target rep range from the user's own set history (most common rep count in recent sessions).
  // Science (Schoenfeld 2017): hypertrophy occurs across 6–30 reps; there's no universal magic number.
  // We use the user's own pattern rather than a hard-coded value.
  const inferredTargetReps = currentCompletedSets.length > 0
    ? Math.round(currentCompletedSets.reduce((sum, s) => sum + s.reps, 0) / currentCompletedSets.length)
    : 12; // fallback only when no sets exist

  // User is ready to increase weight when all working sets hit or exceed their inferred target
  // AND average reps is at the top of their typical range (Bompa & Haff 2009: double-progression model)
  const readyForWeightIncrease = currentCompletedSets.length > 0 &&
    currentCompletedSets.every(s => s.reps >= inferredTargetReps);

  if (previousExercises.length === 0 || !current1RM) {
    return {
      current1RM: current1RM?.oneRM || 0,
      previous1RM: null,
      difference: 0,
      percentageChange: 0,
      currentVolume,
      previousVolume: null,
      volumeDifference: 0,
      status: 'first-time',
      daysSinceLast: null,
      sameWeight: false,
      repProgression: 0,
      readyForWeightIncrease,
      currentAverageReps,
      previousAverageReps: null
    };
  }

  // Neem meest recente vorige exercise
  const previousExercise = previousExercises[0];
  const previous1RM = getBest1RM(previousExercise);
  const previousVolume = calculateVolume(previousExercise);
  
  // Calculate previous average reps (exclude warmups — same as currentCompletedSets filter)
  const previousCompletedSets = previousExercise.sets.filter(s => s.completed && !s.isWarmup && s.reps > 0);
  const previousAverageReps = previousCompletedSets.length > 0
    ? previousCompletedSets.reduce((sum, s) => sum + s.reps, 0) / previousCompletedSets.length
    : 0;
  
  // Check if weight stayed the same (within 0.5kg tolerance)
  const currentAvgWeight = currentCompletedSets.length > 0
    ? currentCompletedSets.reduce((sum, s) => sum + s.weight, 0) / currentCompletedSets.length
    : 0;
  const previousAvgWeight = previousCompletedSets.length > 0
    ? previousCompletedSets.reduce((sum, s) => sum + s.weight, 0) / previousCompletedSets.length
    : 0;
  const sameWeight = Math.abs(currentAvgWeight - previousAvgWeight) < 0.5;
  
  // Calculate rep progression at same weight
  const repProgression = sameWeight && previousAverageReps > 0
    ? currentAverageReps - previousAverageReps
    : 0;

  if (!previous1RM) {
    return {
      current1RM: current1RM.oneRM,
      previous1RM: null,
      difference: 0,
      percentageChange: 0,
      currentVolume,
      previousVolume,
      volumeDifference: currentVolume - previousVolume,
      status: 'first-time',
      daysSinceLast: null,
      sameWeight,
      repProgression,
      readyForWeightIncrease,
      currentAverageReps,
      previousAverageReps
    };
  }

  const difference = current1RM.oneRM - previous1RM.oneRM;
  const percentageChange = (difference / previous1RM.oneRM) * 100;
  const volumeDifference = currentVolume - previousVolume;

  // Improved status detection: consider both weight and rep progression
  let status: 'improved' | 'declined' | 'same' | 'first-time';
  
  if (sameWeight && repProgression > 0.5) {
    // Rep progression at same weight = improvement
    status = 'improved';
  } else if (sameWeight && repProgression < -0.5) {
    // Fewer reps at same weight = decline
    status = 'declined';
  } else if (Math.abs(difference) < 0.5) {
    // 1RM stayed the same
    status = 'same';
  } else if (difference > 0) {
    // 1RM increased
    status = 'improved';
  } else {
    // 1RM decreased
    status = 'declined';
  }

  return {
    current1RM: current1RM.oneRM,
    previous1RM: previous1RM.oneRM,
    difference,
    percentageChange,
    currentVolume,
    previousVolume,
    volumeDifference,
    status,
    daysSinceLast: null, // TODO: calculate based on dates
    sameWeight,
    repProgression,
    readyForWeightIncrease,
    currentAverageReps,
    previousAverageReps
  };
}

/**
 * Genereer suggesties voor progressive overload
 */
export interface OverloadSuggestion {
  type: 'increase-weight' | 'increase-reps' | 'add-set' | 'maintain' | 'new-pr';
  message: string;
  suggestedWeight?: number;
  suggestedReps?: number;
}

export function generateOverloadSuggestion(
  currentExercise: WorkoutExercise,
  progression: ProgressionData
): OverloadSuggestion {
  const best = getBest1RM(currentExercise);
  
  if (!best) {
    return {
      type: 'maintain',
      message: 'Voer je eerste volledige set uit om suggesties te krijgen'
    };
  }

  // PRIORITY 1: Ready to increase weight (all sets hit target reps)
  if (progression.readyForWeightIncrease) {
    const suggestedIncrease = best.weight <= 20 ? 2.5 : 5;
    const newWeight = roundTo(best.weight + suggestedIncrease, 2.5);
    return {
      type: 'increase-weight',
      message: `💪 Alle sets geraakt! Verhoog naar ${newWeight}kg volgende keer`,
      suggestedWeight: newWeight
    };
  }
  
  // PRIORITY 2: Rep progression at same weight
  if (progression.sameWeight && progression.repProgression > 0.5) {
    const avgRepsGained = Math.round(progression.repProgression * 10) / 10;
    return {
      type: 'increase-reps',
      message: `📈 +${avgRepsGained} reps gemiddeld! Blijf gewicht verhogen tot je doelreps haalt`,
      suggestedReps: Math.ceil(progression.currentAverageReps)
    };
  }

  // PRIORITY 3: Check for new PR (significant 1RM increase)
  if (progression.status === 'improved' && progression.percentageChange >= 5) {
    return {
      type: 'new-pr',
      message: `🎉 Nieuw PR! +${roundTo(progression.difference, 0.5)}kg 1RM (+${progression.percentageChange.toFixed(1)}%)`
    };
  }

  // High reps = suggest weight increase (only if not already at target)
  if (best.reps >= 15) {
    const suggestedIncrease = best.weight <= 20 ? 2.5 : 5;
    return {
      type: 'increase-weight',
      message: `Je deed ${best.reps} reps! Verhoog gewicht naar ${roundTo(best.weight + suggestedIncrease, 2.5)}kg`,
      suggestedWeight: roundTo(best.weight + suggestedIncrease, 2.5)
    };
  }

  // Low reps with heavy weight = suggest more reps
  if (best.reps <= 6 && progression.status === 'same') {
    return {
      type: 'increase-reps',
      message: `Probeer ${best.weight}kg voor ${best.reps + 2}-${best.reps + 4} reps te bereiken`,
      suggestedReps: best.reps + 3
    };
  }

  // Good progression (including rep progression)
  if (progression.status === 'improved') {
    const currentAvg = Math.round(progression.currentAverageReps);
    if (currentAvg < 12) {
      return {
        type: 'maintain',
        message: `✅ Goede progressie! Focus op meer reps voor alle sets`
      };
    }
    return {
      type: 'maintain',
      message: `✅ Goede progressie! Blijf dit gewicht gebruiken`
    };
  }

  // Decline in performance
  if (progression.status === 'declined') {
    if (progression.sameWeight && progression.repProgression < -1) {
      return {
        type: 'maintain',
        message: `⚠️ Minder reps dan vorige keer. Focus op herstel en slaap`,
        suggestedWeight: best.weight
      };
    }
    return {
      type: 'maintain',
      message: `Focus op herstel. Overweeg ${roundTo(best.weight * 0.9, 2.5)}kg voor volume-werk`,
      suggestedWeight: roundTo(best.weight * 0.9, 2.5)
    };
  }

  // Default: add volume
  return {
    type: 'add-set',
    message: `Probeer een extra set toe te voegen voor meer volume`
  };
}

/**
 * Vind persoonlijk record (hoogste 1RM ooit) voor een exercise
 */
export interface PersonalRecord {
  oneRM: number;
  date: string;
  weight: number;
  reps: number;
  workoutName: string;
}

export function getPersonalRecord(
  exerciseName: string,
  allHistory: WorkoutLog[]
): PersonalRecord | null {
  let pr: PersonalRecord | null = null;

  allHistory.forEach(workout => {
    const exercise = workout.exercises.find(
      ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
    );
    
    if (!exercise) return;

    const best = getBest1RM(exercise);
    if (!best) return;

    if (!pr || best.oneRM > pr.oneRM) {
      pr = {
        oneRM: best.oneRM,
        date: workout.date,
        weight: best.weight,
        reps: best.reps,
        workoutName: workout.name
      };
    }
  });

  return pr;
}

/**
 * Bereken trend over laatste X workouts
 */
export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable';
  averageChange: number;
  workoutCount: number;
}

export function calculateTrend(
  exerciseName: string,
  allHistory: WorkoutLog[],
  lastNWorkouts: number = 5
): TrendData {
  const relevantWorkouts = getPreviousWorkoutsForExercise(exerciseName, allHistory)
    .slice(0, lastNWorkouts);

  if (relevantWorkouts.length < 2) {
    return {
      direction: 'stable',
      averageChange: 0,
      workoutCount: relevantWorkouts.length
    };
  }

  const oneRMs = relevantWorkouts
    .map(w => {
      const ex = getExerciseFromWorkout(w, exerciseName);
      return ex ? getBest1RM(ex) : null;
    })
    .filter(rm => rm !== null)
    .map(rm => rm!.oneRM);

  if (oneRMs.length < 2) {
    return {
      direction: 'stable',
      averageChange: 0,
      workoutCount: oneRMs.length
    };
  }

  // Bereken gemiddelde verandering
  let totalChange = 0;
  for (let i = 0; i < oneRMs.length - 1; i++) {
    totalChange += oneRMs[i] - oneRMs[i + 1];
  }

  const averageChange = totalChange / (oneRMs.length - 1);

  let direction: 'increasing' | 'decreasing' | 'stable';
  if (averageChange > 1) {
    direction = 'increasing';
  } else if (averageChange < -1) {
    direction = 'decreasing';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    averageChange,
    workoutCount: oneRMs.length
  };
}
