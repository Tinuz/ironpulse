'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Trophy, Dumbbell, Edit2, BarChart3, Award, Trash2, Flame } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'
import WorkoutReactions from '@/components/WorkoutReactions'
import { 
  getBest1RM, 
  roundTo, 
  getPreviousWorkoutsForExercise,
  getExerciseFromWorkout,
  getPersonalRecord 
} from '@/components/utils/workoutCalculations'
import type { WorkoutLog } from '@/components/context/DataContext'

export default function WorkoutDetail() {
  const { history, deleteWorkout } = useData();
  const { user } = useAuth();
  const router = useRouter()
  const pathname = usePathname()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnWorkout, setIsOwnWorkout] = useState(false);
  
  // Get workout ID from URL path (e.g., /workout/abc123)
  const workoutId = pathname.split('/workout/')[1]

  useEffect(() => {
    loadWorkout();
  }, [workoutId, history, user]);

  const loadWorkout = async () => {
    if (!workoutId) {
      setLoading(false);
      return;
    }

    // First try to find in local history (own workouts)
    const localWorkout = history.find(w => w.id === workoutId);
    if (localWorkout) {
      setWorkout(localWorkout);
      setIsOwnWorkout(true);
      setLoading(false);
      return;
    }

    // If not found locally, fetch from Supabase (other users' workouts)
    try {
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (error) throw error;

      if (data) {
        // Convert Supabase data to WorkoutLog format
        const fetchedWorkout: WorkoutLog = {
          id: data.id,
          schemaId: null,
          name: data.name,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          exercises: data.exercises,
          totalCalories: data.total_calories
        };
        setWorkout(fetchedWorkout);
        setIsOwnWorkout(user?.id === data.user_id);
      }
    } catch (error) {
      console.error('Error loading workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!workoutId) return;
    setIsDeleting(true);
    try {
      await deleteWorkout(workoutId);
      router.push('/history');
    } catch (error) {
      console.error('Error deleting workout:', error);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
          <Calendar size={40} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">WORKOUT NOT FOUND</h1>
          <p className="text-muted-foreground mt-2">This workout doesn't exist or was deleted.</p>
        </div>
        <button 
          onClick={() => router.push('/history')}
          className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
        >
          Back to History
        </button>
      </div>
    )
  }

  const duration = workout.endTime ? Math.round((workout.endTime - workout.startTime) / 1000 / 60) : 0
  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0)
  const volume = workout.exercises.reduce((acc, ex) => 
    acc + ex.sets.filter(s => s.completed).reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
  , 0)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Workout Details</h1>
        {isOwnWorkout && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={() => router.push(`/workout/${workoutId}?edit=true`)}
              className="p-2 -mr-2 text-primary hover:text-primary/80"
            >
              <Edit2 size={20} />
            </button>
          </div>
        )}
        {!isOwnWorkout && <div className="w-10" />}
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Header Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <h2 className="text-3xl font-black italic tracking-tight text-primary">{workout.name}</h2>
            <p className="text-muted-foreground font-mono mt-1">
              {format(new Date(workout.date), 'EEEE, MMMM d, yyyy • h:mm a')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className={`grid gap-3 ${
            workout.totalCalories && workout.totalCalories > 0 
              ? 'grid-cols-2 sm:grid-cols-4' 
              : 'grid-cols-3'
          }`}>
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Clock size={10} /> Duration
              </div>
              <div className="text-2xl font-black tabular-nums">
                {duration}<span className="text-sm font-normal text-muted-foreground">m</span>
              </div>
            </div>
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Trophy size={10} /> Volume
              </div>
              <div className="text-2xl font-black tabular-nums">
                {(volume / 1000).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">k</span>
              </div>
            </div>
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <Dumbbell size={10} /> Sets
              </div>
              <div className="text-2xl font-black tabular-nums">
                {totalSets}
              </div>
            </div>
            {workout.totalCalories && workout.totalCalories > 0 && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                <div className="text-[10px] uppercase font-bold text-primary/80 mb-2 flex items-center gap-1">
                  <Flame size={10} /> Calories
                </div>
                <div className="text-2xl font-black tabular-nums text-primary">
                  ~{workout.totalCalories}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Exercises */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold uppercase tracking-wide text-muted-foreground">Exercises</h3>
            
            {/* Workout Reactions */}
            <WorkoutReactions workoutId={workoutId!} />
          </div>
          {workout.exercises.map((exercise, i) => {
            const best1RM = getBest1RM(exercise);
            const exerciseVolume = exercise.sets.filter(s => s.completed).reduce((acc, s) => acc + (s.weight * s.reps), 0);
            const pr = getPersonalRecord(exercise.name, history);
            const isPR = pr && best1RM && Math.abs(best1RM.oneRM - pr.oneRM) < 0.5 && workout.date === pr.date;

            // Get previous workouts for comparison
            const previousWorkouts = getPreviousWorkoutsForExercise(exercise.name, history, workout.id);
            const previousExercise = previousWorkouts.length > 0 ? getExerciseFromWorkout(previousWorkouts[0], exercise.name) : null;
            const previous1RM = previousExercise ? getBest1RM(previousExercise) : null;

            return (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-white/5 rounded-2xl overflow-hidden"
              >
                {/* Exercise Header with Progress Link */}
                <div className="p-5 pb-3 flex items-center justify-between">
                  <h4 className="font-bold text-lg">{exercise.name}</h4>
                  <button
                    onClick={() => router.push(`/exercise-progress?name=${encodeURIComponent(exercise.name)}`)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="View Progress"
                  >
                    <BarChart3 size={18} />
                  </button>
                </div>

                {/* 1RM Display */}
                {best1RM && (
                  <div className="px-5 pb-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      isPR ? 'bg-primary/20 border border-primary/40' : 'bg-white/5'
                    }`}>
                      {isPR && <Award size={14} className="text-primary" />}
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                        {isPR ? 'Nieuw PR!' : 'Beste 1RM'}
                      </span>
                      <span className="font-black text-lg text-primary">
                        {roundTo(best1RM.oneRM, 0.5)}kg
                      </span>
                      {previous1RM && (
                        <span className={`text-xs font-bold ${
                          best1RM.oneRM > previous1RM.oneRM ? 'text-green-500' :
                          best1RM.oneRM < previous1RM.oneRM ? 'text-red-500' :
                          'text-muted-foreground'
                        }`}>
                          {best1RM.oneRM > previous1RM.oneRM ? '+' : ''}
                          {roundTo(best1RM.oneRM - previous1RM.oneRM, 0.5)}kg
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="px-5 pb-5">
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b border-white/5">
                      <div className="w-6 text-center">Set</div>
                      <div className="text-center">Weight</div>
                      <div className="text-center">Reps</div>
                      <div className="w-6"></div>
                    </div>
                    
                    {/* Sets */}
                    {exercise.sets.map((set, idx) => (
                      <div 
                        key={set.id}
                        className={`grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center py-2 px-1 rounded-lg ${
                          set.completed ? 'bg-primary/10' : 'bg-white/5'
                        }`}
                      >
                        <div className="w-6 text-center text-xs font-mono font-bold text-muted-foreground">
                          {idx + 1}
                        </div>
                        <div className="text-center font-black text-lg">
                          {set.weight} <span className="text-xs text-muted-foreground">kg</span>
                        </div>
                        <div className="text-center font-black text-lg">
                          {set.reps} <span className="text-xs text-muted-foreground">reps</span>
                        </div>
                        <div className="w-6 flex justify-center">
                          {set.completed && (
                            <div className="w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Exercise Summary */}
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Volume:</span>
                      <span className="ml-2 font-bold">
                        {exerciseVolume} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="ml-2 font-bold">
                        {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} sets
                      </span>
                    </div>
                    {exercise.durationMinutes && exercise.durationMinutes > 0 && (
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="ml-2 font-bold">
                          {exercise.durationMinutes} min
                        </span>
                      </div>
                    )}
                    {exercise.estimatedCalories && exercise.estimatedCalories > 0 && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Flame size={12} className="text-primary" />
                          Calories:
                        </span>
                        <span className="ml-2 font-bold text-primary">
                          ~{exercise.estimatedCalories} kcal
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <Trash2 size={24} className="text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Workout verwijderen?</h3>
                <p className="text-sm text-muted-foreground">Deze actie kan niet ongedaan worden.</p>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-sm font-medium">{workout.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(workout.date), 'EEEE, d MMMM yyyy')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-lg font-bold bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
