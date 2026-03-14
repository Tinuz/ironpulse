'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Check, X, Clock, Play, Trash2, TrendingUp, TrendingDown, Minus, Award, Zap, StickyNote, Flame, RefreshCw, Heart, Dumbbell, Timer, SkipForward, PlusCircle, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { useData, WorkoutExercise } from '@/components/context/DataContext'
import { 
  getBest1RM, 
  calculateVolume, 
  roundTo, 
  getPreviousWorkoutsForExercise,
  getExerciseFromWorkout,
  calculateProgression,
  generateOverloadSuggestion
} from '@/components/utils/workoutCalculations'
import { calculateBurnedCalories } from '@/components/utils/calorieCalculations'
import { getExerciseProgression, formatProgressionDelta, findLastWorkoutWithExercise } from '@/components/utils/progressionAnalytics'
import ProgressionBadge from '@/components/ProgressionBadge'
import ExerciseSubstitutionModal from '@/components/ExerciseSubstitutionModal'
import EnhancedSetRow from '@/components/EnhancedSetRow'
import { useWorkoutPreferences } from '@/components/utils/useWorkoutPreferences'
import { generateProgressiveOverloadSuggestion } from '@/components/utils/progressiveOverload'
import CardioExerciseLogger from '@/components/CardioExerciseLogger'
import { formatDuration, formatDistance } from '@/components/utils/cardioCalculations'
import { useLanguage } from '@/components/context/LanguageContext'
import { useWakeLock } from '@/components/utils/useWakeLock'
import { useWorkoutAutoSave } from '@/components/utils/useWorkoutAutoSave'
import { type MuscleGroup } from '@/components/utils/volumeAnalytics'
import CircuitPlayer from '@/components/CircuitPlayer'
import { generateSetsFromOneRM, validateOneRM } from '@/components/utils/oneRepMaxCalculations'
import { getExerciseImages } from '@/lib/exerciseData'

const ExerciseStats = ({ 
  exercise,
  previousExercises
}: { 
  exercise: WorkoutExercise;
  previousExercises: WorkoutExercise[];
}) => {
  const { t } = useLanguage();
  const best1RM = getBest1RM(exercise);
  const volume = calculateVolume(exercise);
  
  if (!best1RM) {
    return (
      <div className="px-4 pb-2 text-xs text-muted-foreground italic">
        {t.workout.completeFirstSet}
      </div>
    );
  }

  const progression = calculateProgression(exercise, previousExercises);
  const suggestion = generateOverloadSuggestion(exercise, progression);

  return (
    <div className="px-4 pb-3 space-y-2.5">
      {/* 1RM en Volume - Compact */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
            {t.workout.estimated1RM}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-primary">
              {roundTo(best1RM.oneRM, 0.5)}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">KG</span>
          </div>
          <div className="text-[9px] text-muted-foreground">
            {best1RM.weight}kg × {best1RM.reps}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
            {t.workout.totalVolume}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black">
              {Math.round(volume)}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">KG</span>
          </div>
          <div className="text-[9px] text-muted-foreground">
            {exercise.sets.filter(s => s.completed).length} sets
          </div>
        </div>
      </div>

      {/* Progressie vs Vorige - Compact */}
      {progression.previous1RM && (
        <div className={clsx(
          "rounded-lg p-2 border text-xs",
          progression.status === 'improved' ? "bg-green-500/10 border-green-500/30" :
          progression.status === 'declined' ? "bg-red-500/10 border-red-500/30" :
          "bg-white/5 border-white/10"
        )}>
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1">
              {progression.status === 'improved' ? (
                <>
                  <TrendingUp size={11} className="text-green-500" />
                  <span className="text-green-500">Verbeterd</span>
                </>
              ) : progression.status === 'declined' ? (
                <>
                  <TrendingDown size={11} className="text-red-500" />
                  <span className="text-red-500">Achteruit</span>
                </>
              ) : (
                <>
                  <Minus size={11} />
                  <span>Gelijk</span>
                </>
              )}
            </div>
            <div className={clsx(
              "text-xs font-bold",
              progression.status === 'improved' ? "text-green-500" :
              progression.status === 'declined' ? "text-red-500" :
              "text-muted-foreground"
            )}>
              {progression.difference >= 0 ? '+' : ''}{roundTo(progression.difference, 0.5)}kg
            </div>
          </div>
          
          {/* Ready for weight increase - Most important indicator */}
          {progression.readyForWeightIncrease && (
            <div className="mt-1.5 pt-1.5 border-t border-green-500/30 flex items-center gap-1.5 text-green-400">
              <TrendingUp size={11} />
              <div className="text-[9px] font-bold">
                🎯 Klaar voor meer gewicht!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestie */}
      <div className={clsx(
        "rounded-lg p-3",
        suggestion.type === 'new-pr' ? "bg-primary/10 border border-primary/30" :
        suggestion.type === 'increase-weight' ? "bg-blue-500/10 border border-blue-500/30" :
        "bg-white/5"
      )}>
        <div className="flex items-start gap-2">
          {suggestion.type === 'new-pr' && <Award size={14} className="text-primary mt-0.5 flex-shrink-0" />}
          {suggestion.type === 'increase-weight' && <Zap size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />}
          <div className="text-xs leading-relaxed">
            {suggestion.message}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Battery-friendly isolated timer components ───────────────────────────────

/** Shared formatTime utility (module-level) */
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * WorkoutTimerDisplay — self-contained elapsed counter.
 * Only this tiny component re-renders every second, keeping WorkoutLogger static.
 */
const WorkoutTimerDisplay = React.memo(({ startTime, isPaused }: { startTime: number; isPaused: boolean }) => {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startTime) / 1000));
  useEffect(() => {
    if (isPaused) return;
    const batterySaverMode = localStorage.getItem('battery_saver_mode') === 'true';
    const updateInterval = batterySaverMode ? 5000 : 1000;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, updateInterval);
    return () => clearInterval(interval);
  }, [startTime, isPaused]);
  return (
    <div className="font-mono text-xs text-muted-foreground font-bold flex items-center gap-1">
      <Clock size={10} /> {formatTime(elapsed)}
    </div>
  );
});
WorkoutTimerDisplay.displayName = 'WorkoutTimerDisplay';

/**
 * RestTimerInlineDisplay — isolated countdown shown in the header.
 * Manages its own interval; vibrates on completion.
 */
const RestTimerInlineDisplay = React.memo(({ restTimer }: {
  restTimer: { startTime: number; duration: number };
}) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, restTimer.duration - Math.floor((Date.now() - restTimer.startTime) / 1000)));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const update = () => {
      const tl = Math.max(0, restTimer.duration - Math.floor((Date.now() - restTimer.startTime) / 1000));
      setTimeLeft(tl);
      if (tl === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [restTimer.startTime, restTimer.duration]);
  return (
    <>
      <div className="w-px h-3 bg-white/20" />
      <div className={`font-mono text-xs font-bold flex items-center gap-1 ${
        timeLeft === 0 ? 'text-green-500' : timeLeft < 10 ? 'text-amber-500' : 'text-blue-400'
      }`}>
        <Timer size={10} /> {formatTime(timeLeft)}
      </div>
    </>
  );
});
RestTimerInlineDisplay.displayName = 'RestTimerInlineDisplay';

/**
 * RestTimerBar — isolated progress bar + controls.
 * Keeps its own countdown; parent only stores the restTimer config object.
 */
const RestTimerBar = React.memo(({ restTimer, onAddTime, onStop }: {
  restTimer: { startTime: number; duration: number };
  onAddTime: (seconds: number) => void;
  onStop: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, restTimer.duration - Math.floor((Date.now() - restTimer.startTime) / 1000)));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const update = () => {
      const tl = Math.max(0, restTimer.duration - Math.floor((Date.now() - restTimer.startTime) / 1000));
      setTimeLeft(tl);
      if (tl === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [restTimer.startTime, restTimer.duration]);
  return (
    <div className="px-4 pb-3 flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${timeLeft === 0 ? 'bg-green-500' : timeLeft < 10 ? 'bg-amber-500' : 'bg-blue-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / restTimer.duration) * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onAddTime(30)}
          className="p-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          title="Add 30s"
        >
          <PlusCircle size={16} className="text-blue-400" />
        </button>
        <button
          onClick={onStop}
          className="p-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          title="Skip rest"
        >
          <SkipForward size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
});
RestTimerBar.displayName = 'RestTimerBar';

export default function WorkoutLogger() {
  const { activeWorkout, updateActiveWorkout, finishWorkout, cancelWorkout, history, bodyStats, userProfile } = useData();
  const router = useRouter();
  const workoutPreferences = useWorkoutPreferences();
  const { t } = useLanguage();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const [workoutData, setWorkoutData] = useState<typeof activeWorkout>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isDeload, setIsDeload] = useState(false); // Deload mode: reduces all weights by 20%

  // Auto-save workout every 30 seconds to prevent data loss
  useWorkoutAutoSave(workoutData, 30000);

  // Substitution modal state
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [exerciseIndexToSubstitute, setExerciseIndexToSubstitute] = useState<number | null>(null);
  
  // Cardio logging modal state
  const [cardioLoggingIndex, setCardioLoggingIndex] = useState<number | null>(null);

  // Add Exercise Modal state
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState<'strength' | 'cardio'>('strength');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState<MuscleGroup | ''>('');
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState(10);
  const [newExerciseWeight, setNewExerciseWeight] = useState<number | undefined>(undefined);
  const [newExerciseOneRM, setNewExerciseOneRM] = useState<number | undefined>(undefined);
  
  // Cardio fields for new exercise
  const [newCardioDuration, setNewCardioDuration] = useState(1800); // 30 min
  const [newCardioDistance, setNewCardioDistance] = useState<number | undefined>(undefined);
  const [newCardioIntensity, setNewCardioIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');

  // Image view state - track which exercise has expanded image
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);

  // Rest Timer state
  const [restTimer, setRestTimer] = useState<{
    active: boolean;
    startTime: number;
    duration: number; // in seconds
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);

  // Default rest times based on exercise type (in seconds)
  const getDefaultRestTime = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();
    // Compound movements: 180-300 seconds (3-5 min)
    if (name.includes('squat') || name.includes('deadlift') || 
        name.includes('bench press') || name.includes('overhead press') ||
        name.includes('row') || name.includes('pull up')) {
      return 180; // 3 min
    }
    // Accessories: 60-90 seconds
    if (name.includes('curl') || name.includes('extension') || 
        name.includes('raise') || name.includes('fly')) {
      return 60; // 60 sec
    }
    // Default: 90 seconds
    return 90;
  };

  // Load workout on mount - check both context and localStorage
  useEffect(() => {
    // First check localStorage (most reliable)
    const savedActive = localStorage.getItem('ft_active');
    
    if (savedActive) {
      const parsed = JSON.parse(savedActive);
      setWorkoutData(parsed);
      setIsReady(true);
      // Request wake lock when workout is active
      requestWakeLock();
    } else if (activeWorkout) {
      setWorkoutData(activeWorkout);
      setIsReady(true);
      // Request wake lock when workout is active
      requestWakeLock();
    } else {
      setIsReady(true);
    }

    // Cleanup: release wake lock when component unmounts
    return () => {
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Sync with context updates
  useEffect(() => {
    if (activeWorkout && !workoutData) {
      setWorkoutData(activeWorkout);
    }
  }, [activeWorkout]);



  // Show loading while checking
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workout...</p>
        </div>
      </div>
    );
  }

  // If no workout found
  if (!workoutData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
          <Play size={40} className="text-primary ml-1" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">NO ACTIVE WORKOUT</h1>
          <p className="text-muted-foreground mt-2">Go back to dashboard to start a session.</p>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rir' | 'rpe', value: number | undefined) => {
    if (!workoutData) return;
    const newExercises = workoutData.exercises.map((ex, eIdx) => {
      if (eIdx !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, sIdx) => sIdx === setIndex ? { ...s, [field]: value } : s)
      };
    });
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    if (!workoutData) return;
    const wasCompleted = workoutData.exercises[exerciseIndex].sets[setIndex].completed;
    const newExercises = workoutData.exercises.map((ex, eIdx) => {
      if (eIdx !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, sIdx) => sIdx === setIndex ? { ...s, completed: !s.completed } : s)
      };
    });
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);

    // Auto-start rest timer when completing a set (not when uncompleting)
    if (!wasCompleted && newExercises[exerciseIndex].type !== 'cardio') {
      const exerciseName = newExercises[exerciseIndex].name;
      const defaultRest = getDefaultRestTime(exerciseName);
      startRestTimer(exerciseIndex, setIndex, defaultRest);
    }
  };

  const startRestTimer = (exerciseIndex: number, setIndex: number, duration: number) => {
    setRestTimer({
      active: true,
      startTime: Date.now(),
      duration,
      exerciseIndex,
      setIndex
    });
  };

  const stopRestTimer = () => {
    setRestTimer(null);
  };

  const addRestTime = (seconds: number) => {
    if (!restTimer) return;
    setRestTimer({
      ...restTimer,
      duration: restTimer.duration + seconds
    });
  };

  const setCustomRestTime = (exerciseIndex: number, setIndex: number, seconds: number) => {
    startRestTimer(exerciseIndex, setIndex, seconds);
  };

  const addSet = (exerciseIndex: number) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    const exercise = newExercises[exerciseIndex];
    
    // Smart weight suggestion logic
    let suggestedWeight = 0;
    let suggestedReps = 0;
    
    if (exercise.sets.length > 0) {
      // Suggest based on previous set in this workout (same weight)
      const previousSet = exercise.sets[exercise.sets.length - 1];
      suggestedWeight = previousSet.weight || 0;
      suggestedReps = previousSet.reps || 0;
    } else {
      // First set: suggest based on last workout with progression
      const previousExercise = findLastWorkoutWithExercise(history, exercise.name, workoutData.id);
      if (previousExercise && previousExercise.sets.length > 0) {
        const completedSets = previousExercise.sets.filter(s => s.completed);
        if (completedSets.length > 0) {
          // Find heaviest set from last workout
          const heaviestSet = completedSets.reduce((best, current) => 
            current.weight > best.weight ? current : best
          );
          // Suggest +2.5kg for progressive overload
          suggestedWeight = heaviestSet.weight + 2.5;
          suggestedReps = heaviestSet.reps;
        }
      }
    }
    
    newExercises[exerciseIndex].sets.push({
      id: crypto.randomUUID(),
      weight: suggestedWeight,
      reps: suggestedReps,
      completed: false
    });
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    
    // Prevent removing last set
    if (newExercises[exerciseIndex].sets.length <= 1) return;
    
    newExercises[exerciseIndex].sets = newExercises[exerciseIndex].sets.filter((_, idx) => idx !== setIndex);
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const updateExerciseOneRM = (exerciseIndex: number, oneRM: number | undefined) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].oneRepMax = oneRM;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const regenerateSetsFromOneRM = (exerciseIndex: number) => {
    if (!workoutData) return;
    const exercise = workoutData.exercises[exerciseIndex];
    
    if (!exercise.oneRepMax || !validateOneRM(exercise.oneRepMax)) {
      alert('Voer eerst een geldige 1RM in (tussen 5kg en 500kg)');
      return;
    }

    if (!window.confirm('Wil je alle sets vervangen met automatisch berekende sets op basis van je 1RM?')) {
      return;
    }

    const newExercises = [...workoutData.exercises];
    const setsConfig = generateSetsFromOneRM(exercise.oneRepMax);
    
    newExercises[exerciseIndex].sets = setsConfig.map(config => ({
      id: crypto.randomUUID(),
      weight: config.weight,
      reps: config.reps,
      completed: false,
      isWarmup: config.isWarmup
    }));

    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const openAddExerciseModal = () => {
    setIsAddingExercise(true);
    setNewExerciseName('');
    setNewExerciseMuscleGroup('');
    setNewExerciseType('strength');
    setNewExerciseSets(3);
    setNewExerciseReps(10);
    setNewExerciseWeight(undefined);
    setNewCardioDuration(1800);
    setNewCardioDistance(undefined);
    setNewCardioIntensity('moderate');
  };

  const handleAddExercise = () => {
    if (!workoutData || !newExerciseName.trim()) return;
    
    // Get exercise images from library
    const imageData = getExerciseImages(newExerciseName.trim());
    
    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exerciseId: crypto.randomUUID(),
      name: newExerciseName.trim(),
      muscleGroup: (newExerciseMuscleGroup || undefined) as WorkoutExercise['muscleGroup'],
      type: newExerciseType,
      sets: [],
      cardioData: newExerciseType === 'cardio' ? {
        duration: newCardioDuration,
        distance: newCardioDistance,
        intensity: newCardioIntensity
      } : undefined,
      oneRepMax: newExerciseOneRM,
      images: imageData?.images,
      anatomyImage: imageData?.anatomyImage,
      anatomyAlt: imageData?.anatomyAlt,
    };

    // Generate sets based on 1RM or manually specified values
    if (newExerciseType === 'strength') {
      if (newExerciseOneRM && validateOneRM(newExerciseOneRM)) {
        // Generate sets from 1RM: 1 warmup + 4 work sets
        const setsConfig = generateSetsFromOneRM(newExerciseOneRM);
        newExercise.sets = setsConfig.map(config => ({
          id: crypto.randomUUID(),
          weight: config.weight,
          reps: config.reps,
          completed: false,
          isWarmup: config.isWarmup
        }));
      } else {
        // Use manual values
        for (let i = 0; i < newExerciseSets; i++) {
          newExercise.sets.push({
            id: crypto.randomUUID(),
            weight: newExerciseWeight || 0,
            reps: newExerciseReps,
            completed: false
          });
        }
      }
    }

    const updated = { ...workoutData, exercises: [...workoutData.exercises, newExercise] };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
    setIsAddingExercise(false);
    
    // Reset form
    setNewExerciseName('');
    setNewExerciseOneRM(undefined);
    setNewExerciseWeight(undefined);
    setNewExerciseMuscleGroup('');
  };

  const cancelAddExercise = () => {
    setIsAddingExercise(false);
    setNewExerciseName('');
  };

  const removeExercise = (exerciseIndex: number) => {
    if (!workoutData) return;
    if (!window.confirm('Remove this exercise?')) return;
    const newExercises = workoutData.exercises.filter((_, idx) => idx !== exerciseIndex);
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const updateExerciseNotes = (exerciseIndex: number, notes: string) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].notes = notes;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };
  
  const handleCardioComplete = (exerciseIndex: number, cardioData: any) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].cardioData = cardioData;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
    setCardioLoggingIndex(null);
  };

  // Helper: Get user weight from latest BodyStats or UserProfile
  const getUserWeight = (): number | null => {
    // Check most recent body stats first
    if (bodyStats && bodyStats.length > 0) {
      const sorted = [...bodyStats].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (sorted[0].weight) return sorted[0].weight;
    }
    
    // Fallback to user profile
    return userProfile?.weight || null;
  };

  const updateExerciseDuration = (exerciseIndex: number, durationMinutes: number) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].durationMinutes = durationMinutes;
    
    // Auto-calculate calories if weight is available
    const weight = getUserWeight();
    if (weight && durationMinutes > 0) {
      try {
        const result = calculateBurnedCalories(weight, durationMinutes, workoutData.metValue || 5);
        newExercises[exerciseIndex].estimatedCalories = result.kcal;
      } catch {
        newExercises[exerciseIndex].estimatedCalories = undefined;
      }
    } else {
      newExercises[exerciseIndex].estimatedCalories = undefined;
    }
    
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const updateExerciseName = (exerciseIndex: number, name: string) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].name = name;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const openSubstitutionModal = (exerciseIndex: number) => {
    setExerciseIndexToSubstitute(exerciseIndex);
    setSubstitutionModalOpen(true);
  };



  const handleSubstituteExercise = (newExerciseName: string) => {
    if (!workoutData || exerciseIndexToSubstitute === null) return;
    
    // Update exercise name, preserve all sets and data
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndexToSubstitute].name = newExerciseName;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
    
    setSubstitutionModalOpen(false);
    setExerciseIndexToSubstitute(null);
  };

  const toggleDeloadMode = () => {
    if (!workoutData) return;
    
    const newDeloadState = !isDeload;
    
    // Confirmation dialog when toggling
    if (newDeloadState) {
      if (!window.confirm('Deload mode zal alle gewichten met 20% verlagen voor herstel. Doorgaan?')) {
        return;
      }
    } else {
      if (!window.confirm('Deload mode uitschakelen? Gewichten worden teruggezet naar origineel.')) {
        return;
      }
    }
    
    // Adjust all weights by 20% reduction (deload) or 25% increase (restore)
    const multiplier = newDeloadState ? 0.8 : 1.25;
    
    const updatedExercises = workoutData.exercises.map(exercise => {
      if (exercise.type === 'cardio') return exercise;
      
      return {
        ...exercise,
        sets: exercise.sets.map(set => ({
          ...set,
          weight: roundTo(set.weight * multiplier, 0.5)
        })),
        // Also update 1RM if present
        oneRepMax: exercise.oneRepMax ? roundTo(exercise.oneRepMax * multiplier, 0.5) : undefined
      };
    });
    
    const updated = { ...workoutData, exercises: updatedExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
    setIsDeload(newDeloadState);
  };

  const handleFinish = () => {
    setShowSummary(true);
  };

  const confirmFinish = () => {
    if (!workoutData) return;
    
    // Calculate total calories from all exercises
    const totalCalories = workoutData.exercises.reduce((sum, exercise) => {
      return sum + (exercise.estimatedCalories || 0);
    }, 0);
    
    // Update workout with total calories and deload flag before finishing
    const finalWorkout = {
      ...workoutData,
      totalCalories: totalCalories > 0 ? totalCalories : undefined,
      metValue: workoutData.metValue || 5,
      isDeload: isDeload // Save deload state to exclude from progressive overload tracking
    };
    
    updateActiveWorkout(finalWorkout);
    finishWorkout();
    
    // Release wake lock when workout is finished
    releaseWakeLock();
    
    router.push('/history');
  };

  const handleCancel = () => {
    if (window.confirm(t.workout.cancelWorkoutConfirm)) {
      // Release wake lock when workout is cancelled
      releaseWakeLock();
      
      cancelWorkout();
      router.push('/');
    }
  };

  // Calculate progress
  const totalSets = workoutData.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = workoutData.exercises.reduce((acc, ex) => acc + (ex.sets?.filter(s => s.completed)?.length || 0), 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // ── Circuit mode ────────────────────────────────────────────────────────────
  if (workoutData.circuitConfig) {
    return (
      <div className="min-h-screen bg-background">
        <CircuitPlayer
          workout={workoutData}
          circuitConfig={workoutData.circuitConfig}
          onFinish={(weights: Record<string, number>, roundsCompleted: number) => {
            const syntheticSets = (exId: string) =>
              Array.from({ length: roundsCompleted }, () => ({
                id: crypto.randomUUID(),
                weight: weights[exId] ?? 0,
                reps: 0,
                completed: true,
              }));
            const finalWorkout = {
              ...workoutData,
              endTime: Date.now(),
              circuitWeights: weights,
              circuitRoundsCompleted: roundsCompleted,
              exercises: workoutData.exercises.map(ex => ({
                ...ex,
                sets: syntheticSets(ex.id),
              })),
            };
            finishWorkout(finalWorkout);
            releaseWakeLock();
            router.push('/history');
          }}
          onCancel={() => {
            if (window.confirm(t.workout.cancelWorkoutConfirm)) {
              releaseWakeLock();
              cancelWorkout();
              router.push('/');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="font-bold text-sm uppercase tracking-wide">{workoutData.name}</h1>
            <div className="flex items-center gap-3">
              <WorkoutTimerDisplay startTime={workoutData.startTime} isPaused={showSummary} />
              {restTimer?.active && <RestTimerInlineDisplay restTimer={restTimer} />}
            </div>
            {/* Deload Mode Toggle */}
            <button
              onClick={toggleDeloadMode}
              className={clsx(
                "mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                isDeload 
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                  : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
              )}
            >
              {isDeload ? '🔻 Deload -20%' : '💪 Normal'}
            </button>
          </div>

          <button 
            onClick={handleCancel} 
            className="px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Beëindig
          </button>
        </div>

        {/* Rest Timer Bar */}
        {restTimer?.active && (
          <RestTimerBar restTimer={restTimer} onAddTime={addRestTime} onStop={stopRestTimer} />
        )}

        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/5">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_10px_var(--primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {workoutData.exercises.map((exercise, exerciseIndex) => {
          // Get previous exercises for progression
          const previousWorkouts = getPreviousWorkoutsForExercise(
            exercise.name, 
            history,
            workoutData.id
          );
          const previousExercises = previousWorkouts
            .map(w => getExerciseFromWorkout(w, exercise.name))
            .filter(ex => ex !== null) as WorkoutExercise[];

          // Calculate progression for this exercise
          const progression = getExerciseProgression(
            exercise.name,
            exercise,
            history,
            workoutData.id
          );

          return (
            <motion.div 
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: exerciseIndex * 0.1 }}
              className="bg-card border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="p-4 bg-white/5 border-b border-white/5">
                {/* Row 1: name + action buttons — always on one line */}
                <div className="flex items-center gap-2">
                  {exercise.type === 'cardio' && <Heart size={18} className="text-green-500 shrink-0" />}
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent font-bold text-lg focus:outline-none focus:bg-white/5 px-2 py-1 rounded transition-colors"
                  />
                  <div className="flex gap-1 shrink-0">
                    {exercise.type !== 'cardio' && (
                      <button 
                        onClick={() => openSubstitutionModal(exerciseIndex)}
                        className="text-blue-400 hover:bg-blue-400/10 p-2 rounded-lg transition-colors"
                        title="Can't do this exercise?"
                      >
                        <RefreshCw size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => removeExercise(exerciseIndex)}
                      className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {/* Row 2: rep range + progression badges */}
                {(exercise.type !== 'cardio' && (exercise.targetMinReps || exercise.targetMaxReps) || (progression.previousBest && exercise.type !== 'cardio')) && (
                  <div className="flex items-center gap-2 mt-1.5 px-2">
                    {(exercise.targetMinReps || exercise.targetMaxReps) && (
                      <span className="text-[10px] font-bold text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {exercise.targetMinReps && exercise.targetMaxReps
                          ? `${exercise.targetMinReps}–${exercise.targetMaxReps} reps`
                          : `${exercise.targetMaxReps ?? exercise.targetMinReps} reps`}
                      </span>
                    )}
                    {progression.previousBest && (
                      <ProgressionBadge 
                        status={progression.status}
                        delta={formatProgressionDelta(progression)}
                        size="sm"
                      />
                    )}
                  </div>
                )}
              </div>
              
              {/* Anatomy Image Section - Collapsible */}
              <div className="border-b border-white/5">
                <button
                  onClick={() => setExpandedImageIndex(expandedImageIndex === exerciseIndex ? null : exerciseIndex)}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {exercise.anatomyImage ? (t.workout.muscleDiagram || 'Spiergroep Diagram') : 'Geen afbeelding'}
                    </span>
                  </div>
                  {expandedImageIndex === exerciseIndex ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedImageIndex === exerciseIndex && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-white/5 space-y-3">
                        {exercise.anatomyImage ? (
                          <>
                            <img
                              src={exercise.anatomyImage}
                              alt={exercise.anatomyAlt || exercise.name}
                              className="w-full max-w-md mx-auto rounded-xl border border-white/10 shadow-lg"
                              loading="lazy"
                            />
                            {exercise.anatomyAlt && (
                              <p className="text-xs text-muted-foreground text-center">
                                {exercise.anatomyAlt}
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="py-8 px-4 text-center">
                            <ImageIcon size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground mb-1">Geen afbeelding beschikbaar</p>
                            <p className="text-xs text-muted-foreground/60">
                              Voeg een afbeelding toe via de routine editor of workout editor
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* 1RM Section - Compact for strength exercises */}
              {exercise.type !== 'cardio' && (
                <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                      1RM
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={exercise.oneRepMax || ''}
                      onChange={(e) => updateExerciseOneRM(exerciseIndex, e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="100"
                      className="w-16 bg-white/10 border border-white/20 rounded-md px-2 py-1 text-center text-sm font-bold focus:outline-none focus:border-primary focus:bg-white/15 transition-colors"
                    />
                    <span className="text-[9px] text-muted-foreground font-semibold">KG</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    {exercise.muscleGroup && (
                      <div className="px-2.5 py-1 bg-primary/20 border border-primary/30 rounded-md">
                        <span className="text-[9px] text-primary uppercase tracking-wider font-bold">
                          {(() => {
                            const muscleGroupLabels: Record<string, string> = {
                              'chest': 'Borst',
                              'back': 'Rug',
                              'lats': 'Lats',
                              'traps': 'Traps',
                              'middle-back': 'Midden Rug',
                              'lower-back': 'Onderrug',
                              'shoulders': 'Schouders',
                              'biceps': 'Biceps',
                              'triceps': 'Triceps',
                              'forearms': 'Onderarmen',
                              'legs': 'Benen',
                              'quads': 'Quads',
                              'hamstrings': 'Hamstrings',
                              'glutes': 'Billen',
                              'calves': 'Kuiten',
                              'abs': 'Buik',
                              'obliques': 'Obliques',
                              'core': 'Core',
                              'full-body': 'Full Body',
                              'cardio': 'Cardio'
                            };
                            return muscleGroupLabels[exercise.muscleGroup] || exercise.muscleGroup;
                          })()}
                        </span>
                      </div>
                    )}
                    {exercise.oneRepMax && validateOneRM(exercise.oneRepMax) && (
                      <button
                        onClick={() => regenerateSetsFromOneRM(exerciseIndex)}
                        className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-md font-bold text-[9px] transition-colors flex items-center gap-1"
                      >
                        <RefreshCw size={11} />
                        Auto-fill
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {exercise.type === 'cardio' ? (
                <div className="p-4 space-y-3">
                  {exercise.cardioData ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t.workout.cardioStats.duration}</div>
                          <div className="text-lg font-bold text-green-500">{formatDuration(exercise.cardioData.duration)}</div>
                        </div>
                        {exercise.cardioData.distance && exercise.cardioData.distance > 0 && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t.workout.cardioStats.distance}</div>
                            <div className="text-lg font-bold text-green-500">{formatDistance(exercise.cardioData.distance, 'km')}</div>
                          </div>
                        )}
                        {exercise.cardioData.pace && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t.workout.cardioStats.pace}</div>
                            <div className="text-lg font-bold text-green-500">{exercise.cardioData.pace}</div>
                          </div>
                        )}
                        {exercise.cardioData.heartRate && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t.workout.cardioStats.heartRate}</div>
                            <div className="text-lg font-bold text-green-500">{exercise.cardioData.heartRate} bpm</div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setCardioLoggingIndex(exerciseIndex)}
                        className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={16} />
                        {t.workout.updateCardio}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCardioLoggingIndex(exerciseIndex)}
                      className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <Heart size={20} />
                      {t.workout.logCardio}
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    <div className="w-6 text-center">Set</div>
                    <div className="text-center">KG</div>
                    <div className="text-center">Reps</div>
                    <div className="w-8 text-center">✓</div>
                    <div className="w-8"></div>
                  </div>

                  <AnimatePresence mode="popLayout">
                  {exercise.sets.map((set, setIndex) => {
                    // Get progressive overload suggestion
                    const suggestion = generateProgressiveOverloadSuggestion(exercise.name, history)
                    const previousWorkout = getPreviousWorkoutsForExercise(exercise.name, history)[0]
                    const previousExercise = previousWorkout ? getExerciseFromWorkout(previousWorkout, exercise.name) : null
                    const previousBest = previousExercise 
                      ? getBest1RM(previousExercise) 
                      : null
                    
                    return (
                      <EnhancedSetRow 
                        key={set.id}
                        set={set}
                        index={setIndex}
                        onUpdate={(field, val) => {
                          if (field === 'rir' || field === 'rpe') {
                            updateSet(exerciseIndex, setIndex, field, val)
                          } else {
                            updateSet(exerciseIndex, setIndex, field, val as number)
                          }
                        }}
                        onToggleComplete={() => toggleSet(exerciseIndex, setIndex)}
                        onToggleWarmup={() => {
                          // Toggle isWarmup field
                          if (!workoutData) return;
                          const updatedExercises = workoutData.exercises.map((ex, eIdx) => {
                            if (eIdx !== exerciseIndex) return ex;
                            return {
                              ...ex,
                              sets: ex.sets.map((s, sIdx) =>
                                sIdx === setIndex ? { ...s, isWarmup: !s.isWarmup } : s
                              )
                            };
                          });
                          const updated = { ...workoutData, exercises: updatedExercises };
                          setWorkoutData(updated);
                          updateActiveWorkout(updated);
                        }}
                        onRemove={() => removeSet(exerciseIndex, setIndex)}
                        canRemove={exercise.sets.length > 1}
                        showRIR={workoutPreferences.showRIR}
                        showRPE={workoutPreferences.showRPE}
                        previousBest={previousBest ? {
                          weight: previousBest.weight,
                          reps: previousBest.reps
                        } : null}
                        suggestion={suggestion && !set.completed && !set.isWarmup ? {
                          weight: suggestion.suggestedWeight,
                          reason: suggestion.reason
                        } : null}
                      />
                    )
                  })}
                </AnimatePresence>

                {/* Quick Rest Timer Buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setCustomRestTime(exerciseIndex, 0, 30)}
                    className="flex-1 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-lg text-xs font-bold text-muted-foreground hover:text-blue-400 transition-colors"
                  >
                    30s
                  </button>
                  <button
                    onClick={() => setCustomRestTime(exerciseIndex, 0, 60)}
                    className="flex-1 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-lg text-xs font-bold text-muted-foreground hover:text-blue-400 transition-colors"
                  >
                    1min
                  </button>
                  <button
                    onClick={() => setCustomRestTime(exerciseIndex, 0, 90)}
                    className="flex-1 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-lg text-xs font-bold text-muted-foreground hover:text-blue-400 transition-colors"
                  >
                    1:30
                  </button>
                  <button
                    onClick={() => setCustomRestTime(exerciseIndex, 0, 120)}
                    className="flex-1 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-lg text-xs font-bold text-muted-foreground hover:text-blue-400 transition-colors"
                  >
                    2min
                  </button>
                  <button
                    onClick={() => setCustomRestTime(exerciseIndex, 0, 180)}
                    className="flex-1 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-lg text-xs font-bold text-muted-foreground hover:text-blue-400 transition-colors"
                  >
                    3min
                  </button>
                </div>

                <button 
                  onClick={() => addSet(exerciseIndex)}
                  className="w-full py-3 mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {t.workout.addSet}
                </button>

                {/* Notes Section */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    <StickyNote size={14} />
                    {t.workout.notes}
                  </label>
                  <textarea
                    value={exercise.notes || ''}
                    onChange={(e) => updateExerciseNotes(exerciseIndex, e.target.value)}
                    placeholder={t.workout.notesPlaceholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-colors resize-none"
                    rows={3}
                  />
                </div>

                {/* Duration & Calories Section */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                        <Clock size={12} />
                        {t.workout.durationMinutes}
                      </label>
                      <input
                        type="number"
                        value={exercise.durationMinutes || ''}
                        onChange={(e) => updateExerciseDuration(exerciseIndex, Number(e.target.value))}
                        placeholder="0"
                        min="0"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-colors"
                      />
                    </div>
                    {exercise.durationMinutes && exercise.estimatedCalories && getUserWeight() && (
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                          <Flame size={12} />
                          {t.workout.estimatedCalories}
                        </div>
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2.5 flex items-baseline gap-1">
                          <span className="text-primary font-black text-xl">{exercise.estimatedCalories}</span>
                          <span className="text-primary/60 text-xs font-bold">kcal</span>
                        </div>
                      </div>
                    )}
                    {exercise.durationMinutes && !getUserWeight() && (
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground/60 italic mt-7 px-1">
                          {t.workout.caloriesNote}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Section */}
                <ExerciseStats 
                  exercise={exercise}
                  previousExercises={previousExercises}
                />
              </div>
              )}
            </motion.div>
          );
        })}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Add Exercise Button */}
          <button
            onClick={openAddExerciseModal}
            className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors font-bold uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <Plus size={20} /> {t.workout.addExercise}
          </button>
        </div>

        <div className="pt-8 px-4 pb-6">
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-primary text-background font-black text-lg uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {t.workout.finishWorkout}
          </button>
        </div>
      </div>

      {/* Workout Summary Modal */}
      <AnimatePresence>
        {showSummary && workoutData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowSummary(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-white/10 max-w-md w-full overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/20 to-orange-500/20 p-6 text-center border-b border-primary/20">
                <Award size={48} className="text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-black uppercase tracking-wide">Workout Voltooid!</h2>
                <p className="text-sm text-muted-foreground mt-1">{workoutData.name}</p>
              </div>

              {/* Stats Grid */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Total Time */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                      <Clock size={12} />
                      {t.workout.duration}
                    </div>
                    <div className="text-2xl font-black text-foreground">
                      {formatTime(Math.floor((Date.now() - workoutData.startTime) / 1000))}
                    </div>
                  </div>

                  {/* Exercises */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                      <TrendingUp size={12} />
                      {t.workout.totalExercises}
                    </div>
                    <div className="text-2xl font-black text-foreground">
                      {workoutData.exercises.length}
                    </div>
                  </div>

                  {/* Completed Sets */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                      <Check size={12} />
                      {t.workout.totalSets}
                    </div>
                    <div className="text-2xl font-black text-foreground">
                      {completedSets}
                    </div>
                  </div>

                  {/* Calories Burned */}
                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                    <div className="flex items-center gap-2 text-xs text-primary/80 mb-1 uppercase tracking-wider font-bold">
                      <Flame size={12} />
                      {t.workout.estimatedBurn}
                    </div>
                    <div className="text-2xl font-black text-primary">
                      {workoutData.exercises.reduce((sum, ex) => sum + (ex.estimatedCalories || 0), 0) > 0 
                        ? `~${workoutData.exercises.reduce((sum, ex) => sum + (ex.estimatedCalories || 0), 0)}`
                        : '—'}
                    </div>
                    {workoutData.exercises.reduce((sum, ex) => sum + (ex.estimatedCalories || 0), 0) > 0 && (
                      <div className="text-xs text-primary/60 mt-0.5">kcal</div>
                    )}
                  </div>
                </div>

                {/* Disclaimer - Only show if calories were calculated */}
                {workoutData.exercises.reduce((sum, ex) => sum + (ex.estimatedCalories || 0), 0) > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-200/90 leading-relaxed">
                    <strong className="block mb-1">⚠️ {t.workout.calorieDisclaimer}</strong>
                    {t.workout.calorieDisclaimerText}
                  </div>
                )}

                {/* Breakdown if multiple exercises with calories */}
                {workoutData.exercises.filter(ex => ex.estimatedCalories).length > 1 && (
                  <div className="border-t border-white/5 pt-4 mt-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {t.workout.breakdown}
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {workoutData.exercises.map((ex) => (
                        ex.estimatedCalories && (
                          <div key={ex.id} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-2">
                            <span className="text-muted-foreground truncate flex-1">{ex.name}</span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-muted-foreground/60">{ex.durationMinutes} min</span>
                              <span className="text-primary font-bold">{ex.estimatedCalories} kcal</span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3">
                <button 
                  onClick={() => setShowSummary(false)}
                  className="flex-1 py-3 bg-white/10 text-foreground font-bold rounded-xl hover:bg-white/20 transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button 
                  onClick={confirmFinish}
                  className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20"
                >
                  {t.common.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise Substitution Modal */}
      <ExerciseSubstitutionModal
        isOpen={substitutionModalOpen}
        onClose={() => {
          setSubstitutionModalOpen(false);
          setExerciseIndexToSubstitute(null);
        }}
        exerciseName={
          workoutData && exerciseIndexToSubstitute !== null
            ? workoutData.exercises[exerciseIndexToSubstitute]?.name || ''
            : ''
        }
        onSelectSubstitute={handleSubstituteExercise}
      />

      {/* Cardio Exercise Logger Modal */}
      {cardioLoggingIndex !== null && workoutData && (
        <CardioExerciseLogger
          exerciseName={workoutData.exercises[cardioLoggingIndex]?.name || ''}
          initialData={workoutData.exercises[cardioLoggingIndex]?.cardioData}
          userWeight={getUserWeight()}
          onComplete={(data) => handleCardioComplete(cardioLoggingIndex, data)}
          onCancel={() => setCardioLoggingIndex(null)}
        />
      )}

      {/* Add Exercise Modal */}
      <AnimatePresence>
        {isAddingExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={cancelAddExercise}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-2xl border border-white/10 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{t.workout.addExercise}</h2>
                <button
                  onClick={cancelAddExercise}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Exercise Name */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                    {t.workout.exerciseName}
                  </label>
                  <input
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="Bench Press, Running, etc..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {/* Muscle Group Selector */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                    Spiergroep - {t.common.optional || 'Optioneel'}
                  </label>
                  <select
                    value={newExerciseMuscleGroup}
                    onChange={(e) => setNewExerciseMuscleGroup(e.target.value as MuscleGroup | '')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors text-foreground"
                  >
                    <option value="" className="bg-background text-foreground">-- Kies spiergroep --</option>
                    
                    <optgroup label="Borst" className="bg-background text-foreground font-bold">
                      <option value="chest" className="bg-background text-foreground">Borst (algemeen)</option>
                    </optgroup>
                    
                    <optgroup label="Rug" className="bg-background text-foreground font-bold">
                      <option value="back" className="bg-background text-foreground">Rug (algemeen)</option>
                      <option value="lats" className="bg-background text-foreground">Latissimus (lats)</option>
                      <option value="traps" className="bg-background text-foreground">Trapezius (traps)</option>
                      <option value="middle-back" className="bg-background text-foreground">Midden rug</option>
                      <option value="lower-back" className="bg-background text-foreground">Onderrug</option>
                    </optgroup>
                    
                    <optgroup label="Schouders" className="bg-background text-foreground font-bold">
                      <option value="shoulders" className="bg-background text-foreground">Schouders</option>
                    </optgroup>
                    
                    <optgroup label="Armen" className="bg-background text-foreground font-bold">
                      <option value="biceps" className="bg-background text-foreground">Biceps</option>
                      <option value="triceps" className="bg-background text-foreground">Triceps</option>
                      <option value="forearms" className="bg-background text-foreground">Onderarmen</option>
                    </optgroup>
                    
                    <optgroup label="Benen" className="bg-background text-foreground font-bold">
                      <option value="legs" className="bg-background text-foreground">Benen (algemeen)</option>
                      <option value="quads" className="bg-background text-foreground">Dijbenen (quads)</option>
                      <option value="hamstrings" className="bg-background text-foreground">Hamstrings</option>
                      <option value="glutes" className="bg-background text-foreground">Billen (glutes)</option>
                      <option value="calves" className="bg-background text-foreground">Kuiten</option>
                    </optgroup>
                    
                    <optgroup label="Core" className="bg-background text-foreground font-bold">
                      <option value="abs" className="bg-background text-foreground">Buikspieren (abs)</option>
                      <option value="obliques" className="bg-background text-foreground">Schuin buikspieren</option>
                      <option value="core" className="bg-background text-foreground">Core (algemeen)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Exercise Type Toggle */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                    {t.workout.exerciseType || 'Type'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewExerciseType('strength')}
                      className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        newExerciseType === 'strength'
                          ? 'bg-primary text-background'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      <Dumbbell size={18} />
                      Strength
                    </button>
                    <button
                      onClick={() => setNewExerciseType('cardio')}
                      className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        newExerciseType === 'cardio'
                          ? 'bg-green-500 text-white'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      <Heart size={18} />
                      Cardio
                    </button>
                  </div>
                </div>

                {/* Strength Fields */}
                {newExerciseType === 'strength' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                          {t.workout.sets}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newExerciseSets}
                          onChange={(e) => setNewExerciseSets(parseInt(e.target.value) || 1)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                          {t.workout.reps}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newExerciseReps}
                          onChange={(e) => setNewExerciseReps(parseInt(e.target.value) || 1)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                        {t.workout.startingWeight} (kg) - {t.common.optional || 'Optional'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={newExerciseWeight || ''}
                        onChange={(e) => setNewExerciseWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="20"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 flex items-center gap-2">
                        1RM (kg) - {t.common.optional || 'Optional'}
                        <span className="text-[10px] font-normal text-muted-foreground/60 normal-case">(One Rep Max)</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={newExerciseOneRM || ''}
                        onChange={(e) => setNewExerciseOneRM(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="100"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                      />
                      {newExerciseOneRM && newExerciseOneRM >= 5 && (
                        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div className="text-xs font-bold text-blue-400 mb-1.5">💡 Automatische gewichten</div>
                          <div className="text-[11px] text-blue-300/80 space-y-0.5">
                            <div>• 1 warmup set: <span className="font-bold">{(newExerciseOneRM * 0.5).toFixed(1)}kg</span> (50% 1RM)</div>
                            <div>• 4 werksets: <span className="font-bold">{(newExerciseOneRM * 0.75).toFixed(1)}kg</span> × 12 reps (75% 1RM)</div>
                          </div>
                          <div className="text-[10px] text-blue-300/60 mt-1.5 italic">Sets worden automatisch ingevuld. Je kunt alles handmatig aanpassen.</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
```

                {/* Cardio Fields */}
                {newExerciseType === 'cardio' && (
                  <>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                        {t.workout.cardioStats?.duration || 'Duration'} ({t.workout.minutes || 'minutes'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={Math.round(newCardioDuration / 60)}
                        onChange={(e) => setNewCardioDuration((parseInt(e.target.value) || 1) * 60)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                        {t.workout.cardioStats?.distance || 'Distance'} (km) - {t.common.optional || 'Optional'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={newCardioDistance ? newCardioDistance / 1000 : ''}
                        onChange={(e) => setNewCardioDistance(e.target.value ? parseFloat(e.target.value) * 1000 : undefined)}
                        placeholder="5.0"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                        {t.workout.cardioStats?.intensity || 'Intensity'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['low', 'moderate', 'high'] as const).map((level) => (
                          <button
                            key={level}
                            onClick={() => setNewCardioIntensity(level)}
                            className={`py-2 px-3 rounded-lg font-bold text-xs uppercase transition-all ${
                              newCardioIntensity === level
                                ? 'bg-green-500 text-white'
                                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                            }`}
                          >
                            {level === 'low' && (t.workout.low || 'Low')}
                            {level === 'moderate' && (t.workout.moderate || 'Moderate')}
                            {level === 'high' && (t.workout.high || 'High')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={cancelAddExercise}
                  className="flex-1 py-3 bg-white/10 text-foreground font-bold rounded-xl hover:bg-white/20 transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleAddExercise}
                  disabled={!newExerciseName.trim()}
                  className="flex-1 py-3 bg-primary text-background font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.common.add || 'Add'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
