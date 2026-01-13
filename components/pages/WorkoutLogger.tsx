'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Check, X, Clock, Play, Trash2, TrendingUp, TrendingDown, Minus, Award, Zap, StickyNote, Flame, RefreshCw, Heart, Dumbbell } from 'lucide-react'
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
    <div className="px-4 pb-4 space-y-3">
      {/* 1RM en Volume */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
            {t.workout.estimated1RM}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-primary">
              {roundTo(best1RM.oneRM, 0.5)}
            </span>
            <span className="text-xs text-muted-foreground font-bold">KG</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {best1RM.weight}kg × {best1RM.reps} reps
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
            {t.workout.totalVolume}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black">
              {Math.round(volume)}
            </span>
            <span className="text-xs text-muted-foreground font-bold">KG</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {exercise.sets.filter(s => s.completed).length} {t.workout.setsCompleted}
          </div>
        </div>
      </div>

      {/* Progressie vs Vorige */}
      {progression.previous1RM && (
        <div className={clsx(
          "rounded-lg p-3 border",
          progression.status === 'improved' ? "bg-green-500/10 border-green-500/30" :
          progression.status === 'declined' ? "bg-red-500/10 border-red-500/30" :
          "bg-white/5 border-white/10"
        )}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              {progression.status === 'improved' ? (
                <>
                  <TrendingUp size={12} className="text-green-500" />
                  <span className="text-green-500">{t.workout.improved}</span>
                </>
              ) : progression.status === 'declined' ? (
                <>
                  <TrendingDown size={12} className="text-red-500" />
                  <span className="text-red-500">{t.workout.declined}</span>
                </>
              ) : (
                <>
                  <Minus size={12} />
                  <span>{t.workout.maintained}</span>
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
              {progression.percentageChange !== 0 && (
                <span className="ml-1">
                  ({progression.percentageChange >= 0 ? '+' : ''}{progression.percentageChange.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {t.workout.previous}: {roundTo(progression.previous1RM, 0.5)}kg 1RM
          </div>
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

export default function WorkoutLogger() {
  const { activeWorkout, updateActiveWorkout, finishWorkout, cancelWorkout, history, bodyStats, userProfile } = useData();
  const router = useRouter();
  const workoutPreferences = useWorkoutPreferences();
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);
  const [workoutData, setWorkoutData] = useState<typeof activeWorkout>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Substitution modal state
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [exerciseIndexToSubstitute, setExerciseIndexToSubstitute] = useState<number | null>(null);
  
  // Cardio logging modal state
  const [cardioLoggingIndex, setCardioLoggingIndex] = useState<number | null>(null);

  // Add Exercise Modal state
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState<'strength' | 'cardio'>('strength');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState(10);
  const [newExerciseWeight, setNewExerciseWeight] = useState<number | undefined>(undefined);
  
  // Cardio fields for new exercise
  const [newCardioDuration, setNewCardioDuration] = useState(1800); // 30 min
  const [newCardioDistance, setNewCardioDistance] = useState<number | undefined>(undefined);
  const [newCardioIntensity, setNewCardioIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');

  // Load workout on mount - check both context and localStorage
  useEffect(() => {
    // First check localStorage (most reliable)
    const savedActive = localStorage.getItem('ft_active');
    
    if (savedActive) {
      const parsed = JSON.parse(savedActive);
      setWorkoutData(parsed);
      setIsReady(true);
    } else if (activeWorkout) {
      setWorkoutData(activeWorkout);
      setIsReady(true);
    } else {
      setIsReady(true);
    }
  }, []);

  // Sync with context updates
  useEffect(() => {
    if (activeWorkout && !workoutData) {
      setWorkoutData(activeWorkout);
    }
  }, [activeWorkout]);

  // Timer effect - pause when summary is shown
  useEffect(() => {
    if (!workoutData || showSummary) return;
    
    setElapsed(Math.floor((Date.now() - workoutData.startTime) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - workoutData.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [workoutData, showSummary]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rir' | 'rpe', value: number | undefined) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value as any;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].sets[setIndex].completed = !newExercises[exerciseIndex].sets[setIndex].completed;
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
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

  const openAddExerciseModal = () => {
    setIsAddingExercise(true);
    setNewExerciseName('');
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
    
    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exerciseId: crypto.randomUUID(),
      name: newExerciseName.trim(),
      type: newExerciseType,
      sets: newExerciseType === 'strength' ? [{
        id: crypto.randomUUID(),
        weight: newExerciseWeight || 0,
        reps: newExerciseReps,
        completed: false
      }] : [],
      cardioData: newExerciseType === 'cardio' ? {
        duration: newCardioDuration,
        distance: newCardioDistance,
        intensity: newCardioIntensity
      } : undefined
    };

    // Add remaining sets for strength exercises
    if (newExerciseType === 'strength') {
      for (let i = 1; i < newExerciseSets; i++) {
        newExercise.sets.push({
          id: crypto.randomUUID(),
          weight: newExerciseWeight || 0,
          reps: newExerciseReps,
          completed: false
        });
      }
    }

    const updated = { ...workoutData, exercises: [...workoutData.exercises, newExercise] };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
    setIsAddingExercise(false);
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

  const handleFinish = () => {
    setShowSummary(true);
  };

  const confirmFinish = () => {
    if (!workoutData) return;
    
    // Calculate total calories from all exercises
    const totalCalories = workoutData.exercises.reduce((sum, exercise) => {
      return sum + (exercise.estimatedCalories || 0);
    }, 0);
    
    // Update workout with total calories before finishing
    const finalWorkout = {
      ...workoutData,
      totalCalories: totalCalories > 0 ? totalCalories : undefined,
      metValue: workoutData.metValue || 5
    };
    
    updateActiveWorkout(finalWorkout);
    finishWorkout();
    router.push('/history');
  };

  const handleCancel = () => {
    if (window.confirm(t.workout.cancelWorkoutConfirm)) {
      cancelWorkout();
      router.push('/');
    }
  };

  // Calculate progress
  const totalSets = workoutData.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = workoutData.exercises.reduce((acc, ex) => acc + (ex.sets?.filter(s => s.completed)?.length || 0), 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="font-bold text-sm uppercase tracking-wide">{workoutData.name}</h1>
            <div className="font-mono text-xs text-primary font-bold flex items-center gap-1">
              <Clock size={10} /> {formatTime(elapsed)}
            </div>
          </div>

          <button onClick={handleCancel} className="p-2 -mr-2 text-muted-foreground hover:text-destructive">
            <X size={24} />
          </button>
        </div>

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
              <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  {exercise.type === 'cardio' && <Heart size={18} className="text-green-500" />}
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                    className="flex-1 bg-transparent font-bold text-lg focus:outline-none focus:bg-white/5 px-2 py-1 rounded transition-colors"
                  />
                  {progression.previousBest && exercise.type !== 'cardio' && (
                    <ProgressionBadge 
                      status={progression.status}
                      delta={formatProgressionDelta(progression)}
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex gap-2">
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
                          const updatedExercises = [...(workoutData?.exercises || [])]
                          if (updatedExercises[exerciseIndex]) {
                            const updatedSets = [...updatedExercises[exerciseIndex].sets]
                            updatedSets[setIndex] = {
                              ...updatedSets[setIndex],
                              isWarmup: !updatedSets[setIndex].isWarmup
                            }
                            updatedExercises[exerciseIndex] = {
                              ...updatedExercises[exerciseIndex],
                              sets: updatedSets
                            }
                            setWorkoutData(prev => prev ? { ...prev, exercises: updatedExercises } : null)
                          }
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

        <div className="pt-8 px-4">
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
                      {formatTime(elapsed)}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={cancelAddExercise}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-white/10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
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
                  </>
                )}

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
