import { WorkoutExercise, WorkoutLog } from '@/components/context/DataContext';

/**
 * Brzycki Formula voor 1RM berekening
 * 1RM = gewicht ÷ (1.0278 - 0.0278 × reps)
 * Meest accuraat voor 1-10 reps
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) {
    // Voor hoge reps minder accuraat, gebruik conservatieve schatting
    return weight / (1.0278 - 0.0278 * Math.min(reps, 12));
  }
  return weight / (1.0278 - 0.0278 * reps);
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
  const completedSets = exercise.sets.filter(s => s.completed && s.reps > 0 && s.weight > 0);
  
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
    .filter(s => s.completed)
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
 */
export function getPreviousWorkoutsForExercise(
  exerciseName: string,
  allHistory: WorkoutLog[],
  excludeWorkoutId?: string
): WorkoutLog[] {
  return allHistory
    .filter(w => {
      if (excludeWorkoutId && w.id === excludeWorkoutId) return false;
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
}

export function calculateProgression(
  currentExercise: WorkoutExercise,
  previousExercises: WorkoutExercise[]
): ProgressionData {
  const current1RM = getBest1RM(currentExercise);
  const currentVolume = calculateVolume(currentExercise);

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
      daysSinceLast: null
    };
  }

  // Neem meest recente vorige exercise
  const previousExercise = previousExercises[0];
  const previous1RM = getBest1RM(previousExercise);
  const previousVolume = calculateVolume(previousExercise);

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
      daysSinceLast: null
    };
  }

  const difference = current1RM.oneRM - previous1RM.oneRM;
  const percentageChange = (difference / previous1RM.oneRM) * 100;
  const volumeDifference = currentVolume - previousVolume;

  let status: 'improved' | 'declined' | 'same' | 'first-time';
  if (Math.abs(difference) < 0.5) {
    status = 'same';
  } else if (difference > 0) {
    status = 'improved';
  } else {
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
    daysSinceLast: null // TODO: calculate based on dates
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

  // Check for new PR
  if (progression.status === 'improved' && progression.percentageChange >= 5) {
    return {
      type: 'new-pr',
      message: `🎉 Nieuw PR! +${roundTo(progression.difference, 0.5)}kg 1RM (+${progression.percentageChange.toFixed(1)}%)`
    };
  }

  // High reps = suggest weight increase
  if (best.reps >= 10) {
    const suggestedIncrease = best.weight <= 20 ? 2.5 : 5;
    return {
      type: 'increase-weight',
      message: `Je deed ${best.reps} reps! Probeer volgend keer ${roundTo(best.weight + suggestedIncrease, 2.5)}kg voor 6-8 reps`,
      suggestedWeight: roundTo(best.weight + suggestedIncrease, 2.5)
    };
  }

  // Low reps with heavy weight = suggest more reps
  if (best.reps <= 5 && progression.status === 'same') {
    return {
      type: 'increase-reps',
      message: `Probeer ${best.weight}kg voor ${best.reps + 2}-${best.reps + 3} reps te bereiken`,
      suggestedReps: best.reps + 2
    };
  }

  // Good progression
  if (progression.status === 'improved') {
    return {
      type: 'maintain',
      message: `✅ Goede progressie! Blijf dit gewicht gebruiken tot je 10+ reps haalt`
    };
  }

  // Decline
  if (progression.status === 'declined') {
    return {
      type: 'maintain',
      message: `Focus op herstel. Gebruik ${roundTo(best.weight * 0.9, 2.5)}kg voor volume-werk`,
      suggestedWeight: roundTo(best.weight * 0.9, 2.5)
    };
  }

  // Default
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
