'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CoachProfileType } from '@/components/utils/coachProfiles';
import { useAuth } from '@/components/context/AuthContext';
import { checkAchievements, getNewlyUnlocked } from '@/components/utils/achievementEngine';
import { checkIncompleteWorkout, clearIncompleteWorkout } from '@/components/utils/useWorkoutAutoSave';
import WorkoutRecoveryModal from '@/components/WorkoutRecoveryModal';
import { useRouter } from 'next/navigation';
import { generateSetsFromOneRM, validateOneRM } from '@/components/utils/oneRepMaxCalculations';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ExerciseType = 'strength' | 'cardio';

export interface CardioData {
  duration: number; // in seconds
  distance?: number; // in meters
  heartRate?: number; // average bpm
  intensity?: 'low' | 'moderate' | 'high' | number; // RPE 1-10
  pace?: string; // calculated, e.g., "5:30/km"
  estimatedCalories?: number;
}

export interface Exercise {
  id: string;
  name: string;
  type?: ExerciseType; // 'strength' (default) or 'cardio'
  muscleGroup?: 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'full-body' | 'cardio';
  // Strength fields
  targetSets: number;
  targetReps: number;
  startWeight?: number;
  oneRepMax?: number; // 1RM for automatic set weight calculation
  // Cardio fields
  cardioData?: CardioData;
}

export interface Schema {
  id: string;
  name: string;
  exercises: Exercise[];
  color?: string;
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
  rir?: number; // Reps In Reserve (0-10)
  rpe?: number; // Rate of Perceived Exertion (1-10)
  isWarmup?: boolean; // Exclude from volume calculations
}

export interface WorkoutExercise {
  id: string; // instance id
  exerciseId: string;
  name: string;
  type?: ExerciseType; // 'strength' or 'cardio'
  muscleGroup?: 'chest' | 'back' | 'lats' | 'traps' | 'middle-back' | 'lower-back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'legs' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'abs' | 'obliques' | 'full-body' | 'cardio';
  sets: WorkoutSet[]; // for strength exercises
  cardioData?: CardioData; // for cardio exercises
  notes?: string;
  durationMinutes?: number; // Duration of exercise in minutes (deprecated, use cardioData.duration)
  estimatedCalories?: number; // Calculated calories for this exercise
  oneRepMax?: number; // 1RM for automatic set weight calculation
}

export interface WorkoutLog {
  id: string;
  schemaId: string | null;
  name: string;
  date: string;
  startTime: number;
  endTime: number | null;
  exercises: WorkoutExercise[];
  totalCalories?: number; // Total estimated calories burned
  metValue?: number; // MET value used for calculation (default: 5)
  completedAt?: string; // ISO timestamp when workout was completed
  isDeload?: boolean; // Whether this is a deload/recovery week workout (excludes from progressive overload tracking)
  cardioSummary?: {
    totalDuration: number; // total cardio seconds
    totalDistance?: number; // total meters
    avgHeartRate?: number; // average bpm
    estimatedCalories?: number; // cardio-specific calories
  };
}

export interface BodyStats {
  id: string;
  date: string;
  weight?: number;
  height?: number;
  age?: number;
  chest?: number;
  biceps?: number;
  waist?: number;
  thighs?: number;
  shoulders?: number;
}

export interface NutritionItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  type: 'food' | 'drink';
  volume?: number; // in ml for drinks
}

export interface NutritionLog {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  items: NutritionItem[];
  waterIntake: number; // total water in ml
}

export interface Supplement {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  name: string;
  dosageAmount: number;
  dosageUnit: 'g' | 'mg' | 'pills' | 'capsules' | 'scoops' | 'ml' | 'tablets';
  brand?: string;
  timing?: 'morning' | 'pre-workout' | 'post-workout' | 'evening' | 'with-meal' | 'before-bed';
  notes?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: number;
  // Legal acceptance tracking
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  legalAcceptanceDate?: string;
  termsVersion?: string;
  privacyVersion?: string;
}

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface DataContextType {
  schemas: Schema[];
  history: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  bodyStats: BodyStats[];
  nutritionLogs: NutritionLog[];
  supplements: Supplement[];
  coachProfile: CoachProfileType;
  userProfile: UserProfile | null;
  achievements: string[]; // Array of unlocked achievement IDs
  unlockedAchievement: { id: string; name: string; description: string; icon: string; category: string } | null;
  addSchema: (schema: Schema) => void;
  updateSchema: (id: string, schema: Schema) => Promise<void>;
  deleteSchema: (id: string) => void;
  startWorkout: (schema?: Schema, exercises?: WorkoutExercise[], customName?: string) => WorkoutLog;
  updateActiveWorkout: (workout: WorkoutLog) => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;
  updateWorkout: (id: string, workout: Partial<WorkoutLog>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  addBodyStats: (stats: BodyStats) => void;
  deleteBodyStats: (id: string) => void;
  addMeal: (date: string, item: Omit<NutritionItem, 'id'>) => void;
  deleteMeal: (date: string, itemId: string) => void;
  addWater: (date: string, amount: number) => void;
  addSupplement: (supplement: Omit<Supplement, 'id'>) => Promise<void>;
  updateSupplement: (id: string, supplement: Partial<Supplement>) => Promise<void>;
  deleteSupplement: (id: string) => Promise<void>;
  setCoachProfile: (profile: CoachProfileType) => void;
  saveUserProfile: (profile: Omit<UserProfile, 'id'>) => Promise<void>;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

// ============================================================================
// MOCK DATA (for initial setup)
// ============================================================================

// Initial mock data
const MOCK_SCHEMAS: Schema[] = [
  {
    id: 's1',
    name: 'Upper Body Power',
    color: 'from-orange-500 to-red-500',
    exercises: [
      { id: 'e1', name: 'Bench Press', targetSets: 4, targetReps: 5 },
      { id: 'e2', name: 'Overhead Press', targetSets: 3, targetReps: 8 },
      { id: 'e3', name: 'Barbell Row', targetSets: 4, targetReps: 8 },
    ]
  },
  {
    id: 's2',
    name: 'Lower Body Hypertrophy',
    color: 'from-blue-500 to-cyan-500',
    exercises: [
      { id: 'e4', name: 'Squat', targetSets: 4, targetReps: 10 },
      { id: 'e5', name: 'Romanian Deadlift', targetSets: 3, targetReps: 12 },
      { id: 'e6', name: 'Lunges', targetSets: 3, targetReps: 15 },
    ]
  }
];

// ============================================================================
// DATA PROVIDER COMPONENT
// ============================================================================

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  
  const router = useRouter();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [bodyStats, setBodyStats] = useState<BodyStats[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [unlockedAchievement, setUnlockedAchievement] = useState<{ id: string; name: string; description: string; icon: string; category: string } | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [incompleteWorkout, setIncompleteWorkout] = useState<WorkoutLog | null>(null);
  const [hasCheckedIncomplete, setHasCheckedIncomplete] = useState(false); // Track if we've checked for incomplete workout
  
  // Session flag - set in sessionStorage to detect app restarts
  const isNewSession = typeof window !== 'undefined' && !sessionStorage.getItem('ft_session_active');
  
  const [coachProfile, setCoachProfileState] = useState<CoachProfileType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ironpulse_coach_profile');
      return (saved as CoachProfileType) || 'motiverend';
    }
    return 'motiverend';
  });

  const { user } = useAuth();
  const USER_ID = user?.id;

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  
  // Load all data from Supabase when user changes
  useEffect(() => {
    if (USER_ID) {
      loadAllData();
    }
  }, [USER_ID]);

  const loadAllData = async () => {
    try {
      // Load schemas
      const { data: schemasData } = await supabase
        .from('schemas')
        .select('*')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false });

      if (schemasData && schemasData.length > 0) {
        setSchemas(schemasData.map(s => ({
          id: s.id,
          name: s.name,
          exercises: s.exercises,
          color: s.color || undefined
        })));
      } else {
        // Insert mock data if empty
        const { data: inserted } = await supabase
          .from('schemas')
          .insert(MOCK_SCHEMAS.map(s => ({
            user_id: USER_ID,
            name: s.name,
            exercises: s.exercises,
            color: s.color
          })))
          .select();
        if (inserted) {
          setSchemas(inserted.map(s => ({
            id: s.id,
            name: s.name,
            exercises: s.exercises,
            color: s.color || undefined
          })));
        }
      }

      // Load workout history
      const { data: historyData } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', USER_ID)
        .order('date', { ascending: false });

      if (historyData) {
        setHistory(historyData.map(h => ({
          id: h.id,
          schemaId: h.schema_id,
          name: h.name,
          date: h.date,
          startTime: h.start_time,
          endTime: h.end_time,
          exercises: h.exercises,
          isDeload: h.is_deload || false
        })));
      }

      // Load body stats
      const { data: statsData } = await supabase
        .from('body_stats')
        .select('*')
        .eq('user_id', USER_ID)
        .order('date', { ascending: false });

      if (statsData) {
        setBodyStats(statsData.map(s => ({
          id: s.id,
          date: s.date,
          weight: s.weight || undefined,
          height: s.height || undefined,
          age: s.age || undefined,
          chest: s.chest || undefined,
          biceps: s.biceps || undefined,
          waist: s.waist || undefined,
          thighs: s.thighs || undefined,
          shoulders: s.shoulders || undefined
        })));
      }

      // Load nutrition logs
      const { data: nutritionData } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', USER_ID)
        .order('date', { ascending: false });

      if (nutritionData) {
        setNutritionLogs(nutritionData.map(n => ({
          id: n.id,
          date: n.date,
          items: n.items || [],
          waterIntake: n.water_intake || 0
        })));
      }

      // Load supplements
      const { data: supplementsData } = await supabase
        .from('supplements')
        .select('*')
        .eq('user_id', USER_ID)
        .order('date', { ascending: false });

      if (supplementsData) {
        setSupplements(supplementsData.map(s => ({
          id: s.id,
          date: s.date,
          name: s.name,
          dosageAmount: s.dosage_amount,
          dosageUnit: s.dosage_unit,
          brand: s.brand || undefined,
          timing: s.timing || undefined,
          notes: s.notes || undefined,
          createdAt: s.created_at
        })));
      }

      // Load user profile
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', USER_ID)
        .single();

      if (profileData) {
        setUserProfile({
          id: profileData.id,
          age: profileData.age,
          weight: profileData.weight,
          height: profileData.height,
          gender: profileData.gender,
          activityLevel: profileData.activity_level,
          termsAccepted: profileData.terms_accepted,
          privacyAccepted: profileData.privacy_accepted,
          legalAcceptanceDate: profileData.legal_acceptance_date,
          termsVersion: profileData.terms_version,
          privacyVersion: profileData.privacy_version
        });
      }

      // Load achievements from Supabase
      await loadAchievements();

      // Check for incomplete workout ONLY on first app load (new session)
      if (isNewSession && !hasCheckedIncomplete) {
        const { workout: incomplete, ageMinutes } = checkIncompleteWorkout();
        
        // If there's an incomplete workout (crashed), show recovery modal
        if (incomplete && ageMinutes < 120) {
          setIncompleteWorkout(incomplete);
          setShowRecoveryModal(true);
          // Don't set as activeWorkout yet - let user decide via modal
        } else {
          // No incomplete workout found, load normally from localStorage
          const savedActive = localStorage.getItem('ft_active');
          const parsedWorkout = savedActive ? JSON.parse(savedActive) : null;
          setActiveWorkout(parsedWorkout);
        }
        
        // Mark session as active and check as done
        sessionStorage.setItem('ft_session_active', 'true');
        setHasCheckedIncomplete(true);
      } else {
        // Already checked OR active session, just load from localStorage
        const savedActive = localStorage.getItem('ft_active');
        const parsedWorkout = savedActive ? JSON.parse(savedActive) : null;
        setActiveWorkout(parsedWorkout);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Load achievements from Supabase with localStorage migration
  const loadAchievements = async () => {
    try {
      // First, check if there are achievements in localStorage that need migrating
      const localAchievements = typeof window !== 'undefined' 
        ? localStorage.getItem('ironpulse_achievements') 
        : null;
      
      // Load from Supabase
      const { data: achievementsData, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', USER_ID);

      if (error) {
        console.error('Error loading achievements from Supabase:', error);
        // Fallback to localStorage
        if (localAchievements) {
          setAchievements(JSON.parse(localAchievements));
        }
        return;
      }

      const dbAchievements = achievementsData?.map(a => a.achievement_id) || [];

      // Migrate localStorage achievements to database if they exist
      if (localAchievements) {
        const localAchievementIds: string[] = JSON.parse(localAchievements);
        const achievementsToMigrate = localAchievementIds.filter(
          id => !dbAchievements.includes(id)
        );

        if (achievementsToMigrate.length > 0) {
          console.log(`Migrating ${achievementsToMigrate.length} achievements from localStorage to database...`);
          
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert(
              achievementsToMigrate.map(id => ({
                user_id: USER_ID,
                achievement_id: id,
                unlocked_at: new Date().toISOString()
              }))
            );

          if (!insertError) {
            // Migration successful, clear localStorage
            localStorage.removeItem('ironpulse_achievements');
            console.log('Achievement migration completed successfully');
            // Combine migrated and existing
            setAchievements([...dbAchievements, ...achievementsToMigrate]);
          } else {
            console.error('Error migrating achievements:', insertError);
            // Keep using localStorage as fallback
            setAchievements(localAchievementIds);
          }
        } else {
          // No migration needed, use database achievements
          setAchievements(dbAchievements);
          // Clean up localStorage
          localStorage.removeItem('ironpulse_achievements');
        }
      } else {
        // No localStorage data, just use database
        setAchievements(dbAchievements);
      }
    } catch (error) {
      console.error('Error in loadAchievements:', error);
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const localAchievements = localStorage.getItem('ironpulse_achievements');
        if (localAchievements) {
          setAchievements(JSON.parse(localAchievements));
        }
      }
    }
  };

  // Save new achievements to Supabase
  const saveAchievements = async (newAchievementIds: string[]) => {
    try {
      // Insert new achievements into database
      const { error } = await supabase
        .from('user_achievements')
        .insert(
          newAchievementIds.map(id => ({
            user_id: USER_ID,
            achievement_id: id,
            unlocked_at: new Date().toISOString()
          }))
        );

      if (error) {
        console.error('Error saving achievements to Supabase:', error);
        // Fallback: save to localStorage
        const updatedAchievements = [...achievements, ...newAchievementIds];
        localStorage.setItem('ironpulse_achievements', JSON.stringify(updatedAchievements));
        setAchievements(updatedAchievements);
      } else {
        // Success: update local state
        setAchievements([...achievements, ...newAchievementIds]);
      }
    } catch (error) {
      console.error('Error in saveAchievements:', error);
      // Fallback to localStorage
      const updatedAchievements = [...achievements, ...newAchievementIds];
      localStorage.setItem('ironpulse_achievements', JSON.stringify(updatedAchievements));
      setAchievements(updatedAchievements);
    }
  };

  // Keep active workout in localStorage for temporary state
  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem('ft_active', JSON.stringify(activeWorkout));
    }
    // Don't remove from localStorage when activeWorkout is null during loading
    // Only the cancelWorkout and finishWorkout functions should remove it
  }, [activeWorkout]);

  const addSchema = async (schema: Schema) => {
    console.log('🔧 Adding schema to database:', schema.name)
    
    const { data, error } = await supabase
      .from('schemas')
      .insert({
        id: schema.id,
        user_id: USER_ID,
        name: schema.name,
        exercises: schema.exercises,
        color: schema.color
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding schema:', error)
      throw new Error(`Failed to add schema: ${error.message}`)
    }

    if (data) {
      console.log('✅ Schema added successfully:', data.id)
      setSchemas(prev => [...prev, {
        id: data.id,
        name: data.name,
        exercises: data.exercises,
        color: data.color || undefined
      }]);
    }
  };

  const updateSchema = async (id: string, schema: Schema) => {
    const { data, error } = await supabase
      .from('schemas')
      .update({
        name: schema.name,
        exercises: schema.exercises,
        color: schema.color
      })
      .eq('id', id)
      .eq('user_id', USER_ID)
      .select()
      .single();

    if (!error && data) {
      setSchemas(prev => prev.map(s => s.id === id ? {
        id: data.id,
        name: data.name,
        exercises: data.exercises,
        color: data.color || undefined
      } : s));
    }
  };

  const deleteSchema = async (id: string) => {
    const { error } = await supabase
      .from('schemas')
      .delete()
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setSchemas(prev => prev.filter(s => s.id !== id));
    }
  };

  const startWorkout = (schema?: Schema, exercises?: WorkoutExercise[], customName?: string): WorkoutLog => {
    // Clear any existing workout first
    localStorage.removeItem('ft_active');
    setActiveWorkout(null);
    
    const newWorkout: WorkoutLog = {
      id: crypto.randomUUID(),
      schemaId: schema ? schema.id : null,
      name: customName || (schema ? schema.name : 'Freestyle Workout'),
      date: new Date().toISOString(),
      startTime: Date.now(),
      endTime: null,
      exercises: exercises ? exercises : (schema ? schema.exercises.map(e => {
        let sets: WorkoutSet[] = [];
        
        // Generate sets based on 1RM or target values
        if (e.type !== 'cardio') {
          if (e.oneRepMax && validateOneRM(e.oneRepMax)) {
            // Generate sets from 1RM: 1 warmup + 4 work sets
            const setsConfig = generateSetsFromOneRM(e.oneRepMax);
            sets = setsConfig.map(config => ({
              id: crypto.randomUUID(),
              weight: config.weight,
              reps: config.reps,
              completed: false,
              isWarmup: config.isWarmup
            }));
          } else {
            // Use manual values
            sets = Array(e.targetSets).fill(null).map(() => ({
              id: crypto.randomUUID(),
              weight: e.startWeight ?? 0,
              reps: e.targetReps,
              completed: false
            }));
          }
        }
        
        return {
          id: crypto.randomUUID(),
          exerciseId: e.id,
          name: e.name,
          type: e.type,
          muscleGroup: e.muscleGroup,
          oneRepMax: e.oneRepMax,
          sets,
          cardioData: e.cardioData
        };
      }) : [])
    };
    // Save to localStorage immediately
    localStorage.setItem('ft_active', JSON.stringify(newWorkout));
    // Update state
    setActiveWorkout(newWorkout);
    // Return the workout so caller can use it immediately
    return newWorkout;
  };

  const updateActiveWorkout = (workout: WorkoutLog) => {
    setActiveWorkout(workout);
    // Also update localStorage to keep them in sync
    localStorage.setItem('ft_active', JSON.stringify(workout));
  };

  const finishWorkout = async () => {
    if (activeWorkout) {
      const finishedWorkout = { ...activeWorkout, endTime: Date.now(), completedAt: new Date().toISOString() };
      
      const { data, error } = await supabase
        .from('workout_history')
        .insert({
          id: finishedWorkout.id,
          user_id: USER_ID,
          schema_id: finishedWorkout.schemaId,
          name: finishedWorkout.name,
          date: finishedWorkout.date,
          start_time: finishedWorkout.startTime,
          end_time: finishedWorkout.endTime,
          exercises: finishedWorkout.exercises,
          is_deload: finishedWorkout.isDeload || false
        })
        .select()
        .single();

      if (!error && data) {
        const newWorkout = {
          id: data.id,
          schemaId: data.schema_id,
          name: data.name,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          exercises: data.exercises,
          completedAt: finishedWorkout.completedAt,
          isDeload: data.is_deload || false
        };
        
        const updatedHistory = [newWorkout, ...history];
        setHistory(updatedHistory);
        
        // Check for newly unlocked achievements
        const achievementProgress = checkAchievements(updatedHistory, achievements);
        const newlyUnlocked = getNewlyUnlocked(achievementProgress, achievements);
        
        if (newlyUnlocked.length > 0) {
          // Show first unlocked achievement
          const firstUnlocked = newlyUnlocked[0];
          setUnlockedAchievement({
            id: firstUnlocked.id,
            name: firstUnlocked.name,
            description: firstUnlocked.description,
            icon: firstUnlocked.icon,
            category: firstUnlocked.category
          });
          
          // Save new achievements to Supabase
          await saveAchievements(newlyUnlocked.map(a => a.id));
          
          // Clear toast after animation
          setTimeout(() => setUnlockedAchievement(null), 6000);
        }
      }
      setActiveWorkout(null);
      localStorage.removeItem('ft_active');
      localStorage.removeItem('ft_active_timestamp');
    }
  };

  const cancelWorkout = () => {
    setActiveWorkout(null);
    localStorage.removeItem('ft_active');
    localStorage.removeItem('ft_active_timestamp');
  };

  const updateWorkout = async (id: string, updates: Partial<WorkoutLog>) => {
    const workoutToUpdate = history.find(w => w.id === id);
    if (!workoutToUpdate) return;

    const updatedWorkout = { ...workoutToUpdate, ...updates };

    const { error } = await supabase
      .from('workout_history')
      .update({
        name: updatedWorkout.name,
        date: updatedWorkout.date,
        start_time: updatedWorkout.startTime,
        end_time: updatedWorkout.endTime,
        exercises: updatedWorkout.exercises,
        is_deload: updatedWorkout.isDeload || false
      })
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setHistory(prev => prev.map(w => w.id === id ? updatedWorkout : w));
    }
  };

  const deleteWorkout = async (id: string) => {
    const { error } = await supabase
      .from('workout_history')
      .delete()
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setHistory(prev => prev.filter(w => w.id !== id));
    }
  };

  const addBodyStats = async (stats: BodyStats) => {
    const { data, error } = await supabase
      .from('body_stats')
      .insert({
        id: stats.id,
        user_id: USER_ID,
        date: stats.date,
        weight: stats.weight,
        height: stats.height,
        age: stats.age,
        chest: stats.chest,
        biceps: stats.biceps,
        waist: stats.waist,
        thighs: stats.thighs,
        shoulders: stats.shoulders
      })
      .select()
      .single();

    if (!error && data) {
      setBodyStats(prev => [...prev, {
        id: data.id,
        date: data.date,
        weight: data.weight || undefined,
        height: data.height || undefined,
        age: data.age || undefined,
        chest: data.chest || undefined,
        biceps: data.biceps || undefined,
        waist: data.waist || undefined,
        thighs: data.thighs || undefined,
        shoulders: data.shoulders || undefined
      }].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  };

  const deleteBodyStats = async (id: string) => {
    const { error } = await supabase
      .from('body_stats')
      .delete()
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setBodyStats(prev => prev.filter(s => s.id !== id));
    }
  };

  const addMeal = async (date: string, item: Omit<NutritionItem, 'id'>) => {
    const existingLog = nutritionLogs.find(l => l.date === date);
    const newItem = { ...item, id: crypto.randomUUID() };
    
    if (existingLog) {
      const updatedItems = [...existingLog.items, newItem];
      // Update water intake if it's a drink with volume
      const waterIncrease = (item.type === 'drink' && item.volume) ? item.volume : 0;
      const updatedWaterIntake = (existingLog.waterIntake || 0) + waterIncrease;
      
      const { error } = await supabase
        .from('nutrition_logs')
        .update({ 
          items: updatedItems,
          water_intake: updatedWaterIntake
        })
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.map(l => l.date === date 
          ? { ...l, items: updatedItems, waterIntake: updatedWaterIntake }
          : l
        ));
      }
    } else {
      const waterIntake = (item.type === 'drink' && item.volume) ? item.volume : 0;
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: USER_ID,
          date,
          items: [newItem],
          water_intake: waterIntake
        })
        .select()
        .single();

      if (!error && data) {
        setNutritionLogs(prev => [...prev, {
          id: data.id,
          date: data.date,
          items: data.items,
          waterIntake: data.water_intake || 0
        }]);
      }
    }
  };

  const deleteMeal = async (date: string, itemId: string) => {
    const existingLog = nutritionLogs.find(l => l.date === date);
    if (!existingLog) return;

    const itemToDelete = existingLog.items.find(i => i.id === itemId);
    const updatedItems = existingLog.items.filter(i => i.id !== itemId);
    
    // Update water intake if deleting a drink
    const waterDecrease = (itemToDelete?.type === 'drink' && itemToDelete.volume) ? itemToDelete.volume : 0;
    const updatedWaterIntake = Math.max(0, (existingLog.waterIntake || 0) - waterDecrease);

    if (updatedItems.length === 0) {
      // Delete the entire log if no items left
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.filter(l => l.id !== existingLog.id));
      }
    } else {
      // Update with remaining items
      const { error } = await supabase
        .from('nutrition_logs')
        .update({ 
          items: updatedItems,
          water_intake: updatedWaterIntake
        })
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.map(l => l.date === date 
          ? { ...l, items: updatedItems, waterIntake: updatedWaterIntake }
          : l
        ));
      }
    }
  };

  const addWater = async (date: string, amount: number) => {
    const existingLog = nutritionLogs.find(l => l.date === date);
    
    if (existingLog) {
      const updatedWaterIntake = (existingLog.waterIntake || 0) + amount;
      const { error } = await supabase
        .from('nutrition_logs')
        .update({ water_intake: updatedWaterIntake })
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.map(l => l.date === date 
          ? { ...l, waterIntake: updatedWaterIntake }
          : l
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: USER_ID,
          date,
          items: [],
          water_intake: amount
        })
        .select()
        .single();

      if (!error && data) {
        setNutritionLogs(prev => [...prev, {
          id: data.id,
          date: data.date,
          items: data.items || [],
          waterIntake: data.water_intake || 0
        }]);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // SUPPLEMENTS CRUD
  // ---------------------------------------------------------------------------

  const addSupplement = async (supplement: Omit<Supplement, 'id'>) => {
    const { data, error } = await supabase
      .from('supplements')
      .insert({
        user_id: USER_ID,
        date: supplement.date,
        name: supplement.name,
        dosage_amount: supplement.dosageAmount,
        dosage_unit: supplement.dosageUnit,
        brand: supplement.brand || null,
        timing: supplement.timing || null,
        notes: supplement.notes || null
      })
      .select()
      .single();

    if (!error && data) {
      const newSupplement: Supplement = {
        id: data.id,
        date: data.date,
        name: data.name,
        dosageAmount: data.dosage_amount,
        dosageUnit: data.dosage_unit,
        brand: data.brand,
        timing: data.timing,
        notes: data.notes,
        createdAt: data.created_at
      };
      setSupplements(prev => [...prev, newSupplement]);
    }
  };

  const updateSupplement = async (id: string, supplement: Partial<Supplement>) => {
    const updateData: any = {};
    if (supplement.name !== undefined) updateData.name = supplement.name;
    if (supplement.dosageAmount !== undefined) updateData.dosage_amount = supplement.dosageAmount;
    if (supplement.dosageUnit !== undefined) updateData.dosage_unit = supplement.dosageUnit;
    if (supplement.brand !== undefined) updateData.brand = supplement.brand;
    if (supplement.timing !== undefined) updateData.timing = supplement.timing;
    if (supplement.notes !== undefined) updateData.notes = supplement.notes;

    const { error } = await supabase
      .from('supplements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setSupplements(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            name: supplement.name ?? s.name,
            dosageAmount: supplement.dosageAmount ?? s.dosageAmount,
            dosageUnit: supplement.dosageUnit ?? s.dosageUnit,
            brand: supplement.brand ?? s.brand,
            timing: supplement.timing ?? s.timing,
            notes: supplement.notes ?? s.notes
          };
        }
        return s;
      }));
    }
  };

  const deleteSupplement = async (id: string) => {
    const { error } = await supabase
      .from('supplements')
      .delete()
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setSupplements(prev => prev.filter(s => s.id !== id));
    }
  };

  const setCoachProfile = (profile: CoachProfileType) => {
    setCoachProfileState(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ironpulse_coach_profile', profile);
    }
  };

  const saveUserProfile = async (profile: Omit<UserProfile, 'id'>) => {
    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('user_profile')
        .select('id')
        .eq('user_id', USER_ID)
        .single();

      if (existing) {
        // Update existing profile
        const { data, error } = await supabase
          .from('user_profile')
          .update({
            age: profile.age,
            weight: profile.weight,
            height: profile.height,
            gender: profile.gender,
            activity_level: profile.activityLevel,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', USER_ID)
          .select()
          .single();

        if (!error && data) {
          setUserProfile({
            id: data.id,
            age: data.age,
            weight: data.weight,
            height: data.height,
            gender: data.gender,
            activityLevel: data.activity_level,
            termsAccepted: data.terms_accepted,
            privacyAccepted: data.privacy_accepted,
            legalAcceptanceDate: data.legal_acceptance_date,
            termsVersion: data.terms_version,
            privacyVersion: data.privacy_version
          });
        }
      } else {
        // Insert new profile
        const { data, error } = await supabase
          .from('user_profile')
          .insert({
            user_id: USER_ID,
            age: profile.age,
            weight: profile.weight,
            height: profile.height,
            gender: profile.gender,
            activity_level: profile.activityLevel
          })
          .select()
          .single();

        if (!error && data) {
          setUserProfile({
            id: data.id,
            age: data.age,
            weight: data.weight,
            height: data.height,
            gender: data.gender,
            activityLevel: data.activity_level,
            termsAccepted: data.terms_accepted,
            privacyAccepted: data.privacy_accepted,
            legalAcceptanceDate: data.legal_acceptance_date,
            termsVersion: data.terms_version,
            privacyVersion: data.privacy_version
          });
        }
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      schemas,
      history,
      activeWorkout,
      bodyStats,
      nutritionLogs,
      supplements,
      coachProfile,
      userProfile,
      achievements,
      unlockedAchievement,
      addSchema,
      updateSchema,
      deleteSchema,
      startWorkout,
      updateActiveWorkout,
      finishWorkout,
      cancelWorkout,
      updateWorkout,
      deleteWorkout,
      addBodyStats,
      deleteBodyStats,
      addMeal,
      deleteMeal,
      addWater,
      addSupplement,
      updateSupplement,
      deleteSupplement,
      setCoachProfile,
      saveUserProfile
    }}>
      {children}
      
      {/* Workout Recovery Modal */}
      {showRecoveryModal && incompleteWorkout && (
        <WorkoutRecoveryModal
          workout={incompleteWorkout}
          onRecover={() => {
            setActiveWorkout(incompleteWorkout);
            setShowRecoveryModal(false);
            setIncompleteWorkout(null);
            router.push('/workout');
          }}
          onDiscard={() => {
            clearIncompleteWorkout();
            setShowRecoveryModal(false);
            setIncompleteWorkout(null);
          }}
        />
      )}
    </DataContext.Provider>
  );
};
