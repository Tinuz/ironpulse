'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Check, X, Clock, Play, Trash2, TrendingUp, TrendingDown, Minus, Award, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { useData, WorkoutSet, WorkoutExercise } from '@/components/context/DataContext'
import { 
  getBest1RM, 
  calculateVolume, 
  roundTo, 
  getPreviousWorkoutsForExercise,
  getExerciseFromWorkout,
  calculateProgression,
  generateOverloadSuggestion
} from '@/components/utils/workoutCalculations'

const SetRow = ({ 
  set, 
  index, 
  onUpdate, 
  onToggle 
}: { 
  set: WorkoutSet; 
  index: number; 
  onUpdate: (field: 'weight' | 'reps', value: number) => void;
  onToggle: () => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        "grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center py-2 px-1 rounded-lg transition-colors",
        set.completed ? "bg-primary/10" : "hover:bg-white/5"
      )}
    >
      <div className="w-6 text-center text-xs font-mono text-muted-foreground font-bold">
        {index + 1}
      </div>
      
      <div className="relative">
        <input
          type="number"
          value={set.weight || ''}
          placeholder="0"
          onChange={(e) => onUpdate('weight', Number(e.target.value))}
          className={clsx(
            "w-full bg-transparent text-center font-black text-xl focus:outline-none p-1 border-b border-transparent focus:border-primary transition-colors",
            set.completed && "text-primary"
          )}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">KG</span>
      </div>

      <div className="relative">
        <input
          type="number"
          value={set.reps || ''}
          placeholder="0"
          onChange={(e) => onUpdate('reps', Number(e.target.value))}
          className={clsx(
            "w-full bg-transparent text-center font-black text-xl focus:outline-none p-1 border-b border-transparent focus:border-primary transition-colors",
            set.completed && "text-primary"
          )}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">REPS</span>
      </div>

      <button
        onClick={onToggle}
        className={clsx(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
          set.completed 
            ? "bg-primary text-background shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110" 
            : "bg-white/10 text-muted-foreground hover:bg-white/20"
        )}
      >
        <Check size={16} strokeWidth={3} />
      </button>
    </motion.div>
  );
};

const ExerciseStats = ({ 
  exercise, 
  previousExercises
}: { 
  exercise: WorkoutExercise;
  previousExercises: WorkoutExercise[];
}) => {
  const best1RM = getBest1RM(exercise);
  const volume = calculateVolume(exercise);
  
  if (!best1RM) {
    return (
      <div className="px-4 pb-2 text-xs text-muted-foreground italic">
        Voltooi je eerste set om statistieken te zien
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
            Geschatte 1RM
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
            Totaal Volume
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black">
              {Math.round(volume)}
            </span>
            <span className="text-xs text-muted-foreground font-bold">KG</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {exercise.sets.filter(s => s.completed).length} sets voltooid
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
                  <span className="text-green-500">Progressie</span>
                </>
              ) : progression.status === 'declined' ? (
                <>
                  <TrendingDown size={12} className="text-red-500" />
                  <span className="text-red-500">Afname</span>
                </>
              ) : (
                <>
                  <Minus size={12} />
                  <span>Stabiel</span>
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
            Vorige: {roundTo(progression.previous1RM, 0.5)}kg 1RM
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
  const { activeWorkout, updateActiveWorkout, finishWorkout, cancelWorkout, history } = useData();
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [workoutData, setWorkoutData] = useState<typeof activeWorkout>(null);
  const [isReady, setIsReady] = useState(false);

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

  // Timer effect
  useEffect(() => {
    if (!workoutData) return;
    
    setElapsed(Math.floor((Date.now() - workoutData.startTime) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - workoutData.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [workoutData]);

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

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    if (!workoutData) return;
    const newExercises = [...workoutData.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value;
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
    const previousSet = newExercises[exerciseIndex].sets[newExercises[exerciseIndex].sets.length - 1];
    
    newExercises[exerciseIndex].sets.push({
      id: crypto.randomUUID(),
      weight: previousSet ? previousSet.weight : 0,
      reps: previousSet ? previousSet.reps : 0,
      completed: false
    });
    const updated = { ...workoutData, exercises: newExercises };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const addExercise = () => {
    if (!workoutData) return;
    const newExercise: WorkoutExercise = {
      id: crypto.randomUUID(),
      exerciseId: crypto.randomUUID(),
      name: 'New Exercise',
      sets: [{
        id: crypto.randomUUID(),
        weight: 0,
        reps: 0,
        completed: false
      }]
    };
    const updated = { ...workoutData, exercises: [...workoutData.exercises, newExercise] };
    setWorkoutData(updated);
    updateActiveWorkout(updated);
  };

  const removeExercise = (exerciseIndex: number) => {
    if (!workoutData) return;
    if (!window.confirm('Remove this exercise?')) return;
    const newExercises = workoutData.exercises.filter((_, idx) => idx !== exerciseIndex);
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

  const handleFinish = () => {
    if (window.confirm('Finish this workout?')) {
      finishWorkout();
      router.push('/history');
    }
  };

  const handleCancel = () => {
    if (window.confirm('Cancel workout? All progress will be lost.')) {
      cancelWorkout();
      router.push('/');
    }
  };

  // Calculate progress
  const totalSets = workoutData.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = workoutData.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
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

          return (
            <motion.div 
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: exerciseIndex * 0.1 }}
              className="bg-card border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center gap-3">
                <input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                  className="flex-1 bg-transparent font-bold text-lg focus:outline-none focus:bg-white/5 px-2 py-1 rounded transition-colors"
                />
                <button 
                  onClick={() => removeExercise(exerciseIndex)}
                  className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  <div className="w-6 text-center">Set</div>
                  <div className="text-center">KG</div>
                  <div className="text-center">Reps</div>
                  <div className="w-8 text-center">✓</div>
                </div>

                {exercise.sets.map((set, setIndex) => (
                  <SetRow 
                    key={set.id}
                    set={set}
                    index={setIndex}
                    onUpdate={(field, val) => updateSet(exerciseIndex, setIndex, field, val)}
                    onToggle={() => toggleSet(exerciseIndex, setIndex)}
                  />
                ))}

                <button 
                  onClick={() => addSet(exerciseIndex)}
                  className="w-full py-3 mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Set
                </button>
              </div>

              {/* Stats Section */}
              <ExerciseStats 
                exercise={exercise}
                previousExercises={previousExercises}
              />
            </motion.div>
          );
        })}

        {/* Add Exercise Button */}
        <button
          onClick={addExercise}
          className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors font-bold uppercase tracking-wide flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Add Exercise
        </button>

        <div className="pt-8 px-4">
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-primary text-background font-black text-lg uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Finish Workout
          </button>
        </div>
      </div>
    </div>
  );
}
