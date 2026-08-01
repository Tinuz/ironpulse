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
import { getExerciseImages } from '@/lib/exerciseData';
import { DEFAULT_WORKOUT_INTENT, type WorkoutIntent } from '@/components/utils/workoutIntent';

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

export interface CircuitConfig {
  workDuration: number;        // seconds per exercise (default 30)
  supersetDuration: number;    // seconds for superset exercise between each exercise (default 30)
  restDuration: number;        // rest between exercises in seconds (default 30)
  roundRestDuration: number;   // rest between rounds (default 60)
  rounds: number;              // number of full circuit rounds (default 3)
  supersetExerciseId?: string; // exerciseId of the superset exercise (e.g. kettlebell swing)
}

export interface Exercise {
  id: string;
  name: string;
  type?: ExerciseType; // 'strength' (default) or 'cardio'
  muscleGroup?: 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'full-body' | 'cardio';
  // Strength fields
  targetSets: number;
  targetReps: number; // upper bound / max reps
  minReps?: number; // lower bound (e.g. 8 in "8-12")
  startWeight?: number;
  oneRepMax?: number; // 1RM for automatic set weight calculation
  // Cardio fields
  cardioData?: CardioData;
  // Image fields
  anatomyImage?: string; // Muscle anatomy/diagram image
  anatomyAlt?: string; // Alt text for anatomy image
}

export interface Schema {
  id: string;
  name: string;
  exercises: Exercise[];
  color?: string;
  mode?: 'standard' | 'circuit';
  circuitConfig?: CircuitConfig;
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
  rir?: number; // Reps In Reserve (0-10)
  rpe?: number; // Rate of Perceived Exertion (1-10)
  isWarmup?: boolean; // Exclude from volume calculations
  isDropset?: boolean; // Dropset — reduced weight, counts toward volume
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
  /** One-liner note surfaced prominently at the START of the *next* workout for this exercise. */
  nextSessionNote?: string;
  tags?: string[]; // Quick-tap condition tags (e.g. 'Makkelijk', 'Vermoeid', 'Pijn', 'PR', 'Top set')
  durationMinutes?: number; // Duration of exercise in minutes (deprecated, use cardioData.duration)
  estimatedCalories?: number; // Calculated calories for this exercise
  oneRepMax?: number; // 1RM for automatic set weight calculation
  targetMinReps?: number; // rep range lower bound from schema (e.g. 8 in "8-12")
  targetMaxReps?: number; // rep range upper bound from schema
  images?: string[]; // Exercise demonstration images
  anatomyImage?: string; // Muscle anatomy/diagram image
  anatomyAlt?: string; // Alt text for anatomy image
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
  trainingIntent?: WorkoutIntent; // Standard vs technique/speed/form-focus session intent
  circuitConfig?: CircuitConfig;       // Present when this log is a circuit workout
  circuitWeights?: Record<string, number>; // exerciseId → weight used
  circuitRoundsCompleted?: number;     // rounds actually completed
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
  calves?: number;
  shoulders?: number;
  /** Subjectieve slaapkwaliteit 1–5 (1=erg slecht, 5=uitstekend) */
  sleepQuality?: number;
}

export interface NutritionItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  saturatedFat?: number; // g - saturated fat
  unsaturatedFat?: number; // g - unsaturated fat (mono + poly)
  type: 'food' | 'drink';
  volume?: number; // in ml for drinks
  grams?: number; // consumed amount in grams (food only) — used to back-calculate per-100g values when editing
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

export interface SupplementStack {
  id: string;
  name: string;
  dosageAmount: number;
  dosageUnit: 'g' | 'mg' | 'pills' | 'capsules' | 'scoops' | 'ml' | 'tablets';
  brand?: string;
  timing?: 'morning' | 'pre-workout' | 'post-workout' | 'evening' | 'with-meal' | 'before-bed';
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: number;
  fitnessGoal?: 'bulk' | 'lean-bulk' | 'maintain' | 'lean-cut' | 'cut';
  // Legal acceptance tracking
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  legalAcceptanceDate?: string;
  termsVersion?: string;
  privacyVersion?: string;
}

export type RestDayType = 'rest' | 'deload' | 'vacation';

export interface RestDay {
  id: string;
  date: string; // YYYY-MM-DD
  type: RestDayType;
  note?: string;
}

export type TrainingBlockStatus = 'active' | 'completed';
export type TrainingBlockMuscle =
  | 'chest' | 'back' | 'shoulders'
  | 'legs'       // broad fallback (backward-compat for existing blocks)
  | 'quadriceps' | 'hamstrings'
  | 'arms'       // broad fallback (backward-compat for existing blocks)
  | 'biceps' | 'triceps'
  | 'abs' | 'glutes' | 'calves';

/**
 * A named training phase within a mesocyclus block.
 * Based on RIR-autoregulation (Zourdos et al. 2016) and MEV→MAV→MRV
 * volume progression (Israetel, RP Strength 2019).
 */
export interface BlockPhase {
  /** Display name, e.g. "Instapfase", "Piekfase", "Deload" */
  name: string;
  /** Single emoji shown in the workout logger and widget */
  emoji: string;
  /** 1-indexed first cycle of this phase */
  cycleStart: number;
  /** 1-indexed last cycle of this phase (inclusive) */
  cycleEnd: number;
  /** RIR target shown to the user, e.g. "2", "1-2", "0-1", "3-4" */
  targetRIR: string;
  /** True only for the recovery/deload phase */
  isDeload: boolean;
  /**
   * Exercise names (case-insensitive substring match) for which
   * approaching technical failure is permitted in this phase.
   * Schoenfeld (2010): machines allow safer approaches than free weights.
   */
  failurePermittedExercises?: string[];
  /** Short coaching hint shown below the phase banner in the workout logger */
  coachNote?: string;
}

export interface TrainingBlock {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  durationWeeks: 4 | 5 | 6;
  focusMuscles: TrainingBlockMuscle[];
  status: TrainingBlockStatus;
  createdAt: string;
  // ── Enhanced cycle/phase tracking (optional — backward compatible) ──────
  /** Total number of training cycles in the block (e.g. 7 for a chest mesocyclus) */
  totalCycles?: number;
  /** Schema IDs in rotation order used to count cycles from workout history */
  schemaRotation?: string[];
  /** Named phases with RIR targets and failure permissions */
  phases?: BlockPhase[];
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
  supplementStacks: SupplementStack[];
  coachProfile: CoachProfileType;
  userProfile: UserProfile | null;
  achievements: string[]; // Array of unlocked achievement IDs
  unlockedAchievement: { id: string; name: string; description: string; icon: string; category: string } | null;
  /** True once the initial Supabase data load has completed. Use this to guard startWorkout calls. */
  isDataLoaded: boolean;
  addSchema: (schema: Schema) => void;
  updateSchema: (id: string, schema: Schema) => Promise<void>;
  deleteSchema: (id: string) => void;
  startWorkout: (schema?: Schema, exercises?: WorkoutExercise[], customName?: string, trainingIntent?: WorkoutIntent) => WorkoutLog;
  updateActiveWorkout: (workout: WorkoutLog) => void;
  finishWorkout: (workoutOverride?: WorkoutLog) => void;
  cancelWorkout: () => void;
  updateWorkout: (id: string, workout: Partial<WorkoutLog>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  addBodyStats: (stats: BodyStats) => void;
  updateBodyStats: (id: string, updates: Partial<Pick<BodyStats, 'weight' | 'biceps' | 'waist' | 'chest' | 'thighs' | 'calves' | 'shoulders' | 'sleepQuality'>>) => Promise<void>;
  deleteBodyStats: (id: string) => void;
  addMeal: (date: string, item: Omit<NutritionItem, 'id'>) => void;
  updateMeal: (date: string, itemId: string, item: Omit<NutritionItem, 'id'>) => void;
  deleteMeal: (date: string, itemId: string) => void;
  addWater: (date: string, amount: number) => void;
  setWaterIntake: (date: string, amount: number) => Promise<void>;
  addSupplement: (supplement: Omit<Supplement, 'id'>) => Promise<void>;
  updateSupplement: (id: string, supplement: Partial<Supplement>) => Promise<void>;
  deleteSupplement: (id: string) => Promise<void>;
  addSupplementStack: (stack: Omit<SupplementStack, 'id' | 'sortOrder' | 'isActive'>) => Promise<void>;
  updateSupplementStack: (id: string, stack: Partial<SupplementStack>) => Promise<void>;
  deleteSupplementStack: (id: string) => Promise<void>;
  toggleSupplementStack: (id: string, isActive: boolean) => Promise<void>;
  logStackToday: (date: string) => Promise<void>;
  setCoachProfile: (profile: CoachProfileType) => void;
  saveUserProfile: (profile: Omit<UserProfile, 'id'>) => Promise<void>;
  restDays: RestDay[];
  addRestDay: (date: string, type: RestDayType, note?: string) => Promise<void>;
  removeRestDay: (date: string) => Promise<void>;
  trainingBlocks: TrainingBlock[];
  activeBlock: TrainingBlock | null;
  createBlock: (data: Omit<TrainingBlock, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  completeBlock: (id: string) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const DataContext = createContext<DataContextType | undefined>(undefined);

function normalizeWorkoutLog(workout: any): WorkoutLog | null {
  if (!workout) return null;
  return {
    ...workout,
    trainingIntent: workout.trainingIntent || DEFAULT_WORKOUT_INTENT,
    isDeload: workout.isDeload || false,
  };
}

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
  const [supplementStacks, setSupplementStacks] = useState<SupplementStack[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [restDays, setRestDays] = useState<RestDay[]>([]);
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [unlockedAchievement, setUnlockedAchievement] = useState<{ id: string; name: string; description: string; icon: string; category: string } | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [incompleteWorkout, setIncompleteWorkout] = useState<WorkoutLog | null>(null);
  const [hasCheckedIncomplete, setHasCheckedIncomplete] = useState(false); // Track if we've checked for incomplete workout
  // True once loadAllData() has finished — used to gate startWorkout so set pre-fill uses real history
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
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
      // Fetch all independent tables in parallel — ~5× faster on slow connections
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

      const [
        { data: schemasData },
        { data: historyData },
        { data: statsData },
        { data: nutritionData },
        { data: supplementsData },
        { data: profileData },
        { data: restDaysData },
        { data: trainingBlocksData },
      ] = await Promise.all([
        supabase.from('schemas').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }),
        supabase.from('workout_history').select('*').eq('user_id', USER_ID).order('date', { ascending: false }),
        supabase.from('body_stats').select('*').eq('user_id', USER_ID).order('date', { ascending: false }),
        supabase.from('nutrition_logs').select('*').eq('user_id', USER_ID).gte('date', ninetyDaysAgoStr).order('date', { ascending: false }),
        supabase.from('supplements').select('*').eq('user_id', USER_ID).order('date', { ascending: false }),
        supabase.from('user_profile').select('*').eq('user_id', USER_ID).single(),
        supabase.from('user_rest_days').select('*').eq('user_id', USER_ID).order('date', { ascending: false }),
        supabase.from('training_blocks').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }),
      ]);

      // Supplement stacks (routine templates)
      const { data: stacksData } = await supabase
        .from('supplement_stacks')
        .select('*')
        .eq('user_id', USER_ID)
        .order('sort_order', { ascending: true });

      if (stacksData) {
        setSupplementStacks(stacksData.map(s => ({
          id: s.id,
          name: s.name,
          dosageAmount: s.dosage_amount,
          dosageUnit: s.dosage_unit,
          brand: s.brand || undefined,
          timing: s.timing || undefined,
          notes: s.notes || undefined,
          isActive: s.is_active,
          sortOrder: s.sort_order,
          createdAt: s.created_at,
        })));
      }

      // Schemas
      if (schemasData && schemasData.length > 0) {
        setSchemas(schemasData.map(s => {
          const { exercises, mode, circuitConfig } = unpackExercises(s.exercises);
          return { id: s.id, name: s.name, exercises, color: s.color || undefined, mode, circuitConfig };
        }));
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
          setSchemas(inserted.map(s => {
            const { exercises, mode, circuitConfig } = unpackExercises(s.exercises);
            return { id: s.id, name: s.name, exercises, color: s.color || undefined, mode, circuitConfig };
          }));
        }
      }

      // Workout history
      if (historyData) {
        setHistory(historyData.map(h => ({
          id: h.id,
          schemaId: h.schema_id,
          name: h.name,
          date: h.date,
          startTime: h.start_time,
          endTime: h.end_time,
          exercises: h.exercises,
          isDeload: h.is_deload || false,
          trainingIntent: h.training_intent || DEFAULT_WORKOUT_INTENT,
          totalCalories: h.total_calories || undefined,
          metValue: h.met_value || undefined
        })));
      }

      // Body stats
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
          calves: s.calves || undefined,
          shoulders: s.shoulders || undefined,
          sleepQuality: s.sleep_quality || undefined,
        })));
      }

      // Nutrition logs (last 90 days only)
      if (nutritionData) {
        setNutritionLogs(nutritionData.map(n => ({
          id: n.id,
          date: n.date,
          items: n.items || [],
          waterIntake: n.water_intake || 0
        })));
      }

      // Supplements
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

      // User profile
      if (profileData) {
        setUserProfile({
          id: profileData.id,
          age: profileData.age,
          weight: profileData.weight,
          height: profileData.height,
          gender: profileData.gender,
          activityLevel: profileData.activity_level,
          fitnessGoal: (profileData.fitness_goal as 'bulk' | 'lean-bulk' | 'maintain' | 'lean-cut' | 'cut' | undefined) || 'maintain',
          termsAccepted: profileData.terms_accepted,
          privacyAccepted: profileData.privacy_accepted,
          legalAcceptanceDate: profileData.legal_acceptance_date,
          termsVersion: profileData.terms_version,
          privacyVersion: profileData.privacy_version
        });
      }

      // Rest days
      if (restDaysData) {
        setRestDays(restDaysData.map(r => ({
          id: r.id,
          date: r.date,
          type: r.type as RestDayType,
          note: r.note || undefined,
        })));
      }

      // Training blocks
      if (trainingBlocksData) {
        setTrainingBlocks(trainingBlocksData.map(b => ({
          id: b.id,
          name: b.name,
          startDate: b.start_date,
          durationWeeks: b.duration_weeks as 4 | 5 | 6,
          focusMuscles: (b.focus_muscles ?? []) as TrainingBlockMuscle[],
          status: b.status as TrainingBlockStatus,
          createdAt: b.created_at,
          totalCycles: b.total_cycles ?? undefined,
          schemaRotation: (b.schema_rotation && b.schema_rotation.length > 0) ? b.schema_rotation : undefined,
          phases: b.phases ?? undefined,
        })));
      }

      // Achievements — sequential after main data (depends on history for checks)
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
          const parsedWorkout = normalizeWorkoutLog(savedActive ? JSON.parse(savedActive) : null);
          setActiveWorkout(parsedWorkout);
        }
        
        // Mark session as active and check as done
        sessionStorage.setItem('ft_session_active', 'true');
        setHasCheckedIncomplete(true);
      } else {
        // Already checked OR active session, just load from localStorage
        const savedActive = localStorage.getItem('ft_active');
        const parsedWorkout = normalizeWorkoutLog(savedActive ? JSON.parse(savedActive) : null);
        setActiveWorkout(parsedWorkout);
      }

      // Mark data as fully loaded so UI can enable the start-workout buttons
      setIsDataLoaded(true);

    } catch (error) {
      console.error('Error loading data:', error);
      // Still mark as loaded so the UI doesn't stay blocked on error
      setIsDataLoaded(true);
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
  // Helpers to pack/unpack mode+circuitConfig inside the exercises JSONB column
  const packExercises = (schema: Schema): unknown => {
    if (schema.mode === 'circuit') {
      return { _v: 2, _mode: 'circuit', _circuitConfig: schema.circuitConfig, items: schema.exercises };
    }
    return schema.exercises;
  };

  const unpackExercises = (raw: unknown): { exercises: Exercise[]; mode?: 'standard' | 'circuit'; circuitConfig?: CircuitConfig } => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string,unknown>)._v === 2) {
      const r = raw as Record<string, unknown>;
      return { exercises: (r.items as Exercise[]) ?? [], mode: r._mode as 'circuit', circuitConfig: r._circuitConfig as CircuitConfig };
    }
    return { exercises: (raw as Exercise[]) ?? [] };
  };

  const addSchema = async (schema: Schema) => {
    console.log('🔧 Adding schema to database:', schema.name)
    
    const { data, error } = await supabase
      .from('schemas')
      .insert({
        id: schema.id,
        user_id: USER_ID,
        name: schema.name,
        exercises: packExercises(schema),
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
      const { exercises, mode, circuitConfig } = unpackExercises(data.exercises);
      setSchemas(prev => [...prev, {
        id: data.id,
        name: data.name,
        exercises,
        color: data.color || undefined,
        mode,
        circuitConfig,
      }]);
    }
  };

  const updateSchema = async (id: string, schema: Schema) => {
    const { data, error } = await supabase
      .from('schemas')
      .update({
        name: schema.name,
        exercises: packExercises(schema),
        color: schema.color
      })
      .eq('id', id)
      .eq('user_id', USER_ID)
      .select()
      .single();

    if (!error && data) {
      const { exercises, mode, circuitConfig } = unpackExercises(data.exercises);
      setSchemas(prev => prev.map(s => s.id === id ? {
        id: data.id,
        name: data.name,
        exercises,
        color: data.color || undefined,
        mode,
        circuitConfig,
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

  const startWorkout = (schema?: Schema, exercises?: WorkoutExercise[], customName?: string, trainingIntent: WorkoutIntent = DEFAULT_WORKOUT_INTENT): WorkoutLog => {
    // Clear any existing workout first
    localStorage.removeItem('ft_active');
    setActiveWorkout(null);

    // Sort history once (newest first, skip deload weeks) for cross-schema last-value lookups
    const sortedHistory = [...history]
      .filter(w => !w.isDeload)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const newWorkout: WorkoutLog = {
      id: crypto.randomUUID(),
      schemaId: schema ? schema.id : null,
      name: customName || (schema ? schema.name : 'Freestyle Workout'),
      date: new Date().toISOString(),
      startTime: Date.now(),
      endTime: null,
      trainingIntent,
      circuitConfig: schema?.circuitConfig,
      exercises: exercises ? exercises : (schema ? schema.exercises.map(e => {
        // Look up the most recent logged session for this exercise across ALL schemas
        const lastSession = sortedHistory.find(w =>
          w.exercises.some(ex => ex.name.toLowerCase() === e.name.toLowerCase())
        );
        const lastExercise = lastSession?.exercises.find(
          ex => ex.name.toLowerCase() === e.name.toLowerCase()
        );

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
            // Use last logged weights if available (consistent across schemas),
            // otherwise fall back to the schema's startWeight.
            // Prefer completed non-warmup sets; if none were marked completed
            // (e.g. user forgot to check them off), fall back to ALL non-warmup sets
            // so the weight data from the previous session is never silently discarded.
            const lastWorkingSets = (lastExercise?.sets ?? []).filter(s => !s.isWarmup);
            const lastCompletedSets = lastWorkingSets.some(s => s.completed)
              ? lastWorkingSets.filter(s => s.completed)
              : lastWorkingSets;
            sets = Array(e.targetSets).fill(null).map((_, i) => {
              const lastSet = lastCompletedSets[i] ?? lastCompletedSets[lastCompletedSets.length - 1];
              return {
                id: crypto.randomUUID(),
                weight: lastSet?.weight ?? e.startWeight ?? 0,
                reps: lastSet?.reps ?? e.targetReps,
                completed: false,
              };
            });
          }
        }
        
        // Get exercise images from library (only if not already set in schema)
        const imageData = !e.anatomyImage ? getExerciseImages(e.name) : null;
        
        return {
          id: crypto.randomUUID(),
          exerciseId: e.id,
          name: e.name,
          type: e.type,
          muscleGroup: e.muscleGroup,
          oneRepMax: e.oneRepMax,
          sets,
          notes: lastExercise?.notes,
          cardioData: e.cardioData,
          images: imageData?.images,
          anatomyImage: e.anatomyImage || imageData?.anatomyImage,
          anatomyAlt: e.anatomyAlt || imageData?.anatomyAlt,
          targetMinReps: e.minReps,
          targetMaxReps: e.targetReps > 0 ? e.targetReps : undefined,
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

  const finishWorkout = async (workoutOverride?: WorkoutLog) => {
    const base = workoutOverride || activeWorkout;
    if (base) {
      const finishedWorkout = { ...base, endTime: Date.now(), completedAt: new Date().toISOString() };
      
      // Clean up exercises data - remove any fields that might cause serialization issues
      const cleanedExercises = finishedWorkout.exercises.map(ex => ({
        id: ex.id,
        exerciseId: ex.exerciseId,
        name: ex.name,
        type: ex.type,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets,
        cardioData: ex.cardioData,
        notes: ex.notes,
        tags: ex.tags,
        durationMinutes: ex.durationMinutes,
        estimatedCalories: ex.estimatedCalories,
        oneRepMax: ex.oneRepMax,
        targetMinReps: ex.targetMinReps,
        targetMaxReps: ex.targetMaxReps,
        images: ex.images,
        anatomyImage: ex.anatomyImage,
        anatomyAlt: ex.anatomyAlt,
      }));
      
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
          exercises: cleanedExercises,
          is_deload: finishedWorkout.isDeload || false,
          training_intent: finishedWorkout.trainingIntent || DEFAULT_WORKOUT_INTENT,
          total_calories: finishedWorkout.totalCalories || null,
          met_value: finishedWorkout.metValue || 5.0
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
          isDeload: data.is_deload || false,
          trainingIntent: data.training_intent || DEFAULT_WORKOUT_INTENT,
          totalCalories: data.total_calories || undefined,
          metValue: data.met_value || undefined
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
        is_deload: updatedWorkout.isDeload || false,
        total_calories: updatedWorkout.totalCalories || null,
        met_value: updatedWorkout.metValue || null
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
        calves: stats.calves,
        shoulders: stats.shoulders,
        sleep_quality: stats.sleepQuality,
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
        calves: data.calves || undefined,
        shoulders: data.shoulders || undefined,
        sleepQuality: data.sleep_quality || undefined,
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

  const updateBodyStats = async (
    id: string,
    updates: Partial<Pick<BodyStats, 'weight' | 'biceps' | 'waist' | 'chest' | 'thighs' | 'calves' | 'shoulders' | 'sleepQuality'>>
  ) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.biceps !== undefined) dbUpdates.biceps = updates.biceps;
    if (updates.waist !== undefined) dbUpdates.waist = updates.waist;
    if (updates.chest !== undefined) dbUpdates.chest = updates.chest;
    if (updates.thighs !== undefined) dbUpdates.thighs = updates.thighs;
    if (updates.calves !== undefined) dbUpdates.calves = updates.calves;
    if (updates.shoulders !== undefined) dbUpdates.shoulders = updates.shoulders;
    if (updates.sleepQuality !== undefined) dbUpdates.sleep_quality = updates.sleepQuality ?? null;

    const { error } = await supabase
      .from('body_stats')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setBodyStats(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
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

  const updateMeal = async (date: string, itemId: string, updatedItemData: Omit<NutritionItem, 'id'>) => {
    const existingLog = nutritionLogs.find(l => l.date === date);
    if (!existingLog) return;

    const oldItem = existingLog.items.find(i => i.id === itemId);
    const newItem = { ...updatedItemData, id: itemId };
    const updatedItems = existingLog.items.map(i => i.id === itemId ? newItem : i);

    // Recalculate water intake when drink volume changes
    const oldWater = (oldItem?.type === 'drink' && oldItem.volume) ? oldItem.volume : 0;
    const newWater = (updatedItemData.type === 'drink' && updatedItemData.volume) ? updatedItemData.volume : 0;
    const updatedWaterIntake = Math.max(0, (existingLog.waterIntake || 0) - oldWater + newWater);

    const { error } = await supabase
      .from('nutrition_logs')
      .update({ items: updatedItems, water_intake: updatedWaterIntake })
      .eq('id', existingLog.id)
      .eq('user_id', USER_ID);

    if (!error) {
      setNutritionLogs(prev => prev.map(l => l.date === date
        ? { ...l, items: updatedItems, waterIntake: updatedWaterIntake }
        : l
      ));
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

  // Set water intake to an exact value (used for subtract/undo).
  // Clamps to 0 minimum; only creates a new log row if amount > 0.
  const setWaterIntake = async (date: string, amount: number) => {
    const clamped = Math.max(0, amount);
    const existingLog = nutritionLogs.find(l => l.date === date);

    if (existingLog) {
      const { error } = await supabase
        .from('nutrition_logs')
        .update({ water_intake: clamped })
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.map(l => l.date === date
          ? { ...l, waterIntake: clamped }
          : l
        ));
      }
    } else if (clamped > 0) {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({ user_id: USER_ID, date, items: [], water_intake: clamped })
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

  // ---------------------------------------------------------------------------
  // SUPPLEMENT STACKS CRUD
  // ---------------------------------------------------------------------------

  const addSupplementStack = async (stack: Omit<SupplementStack, 'id' | 'sortOrder' | 'isActive'>) => {
    const nextOrder = supplementStacks.length;
    const { data, error } = await supabase
      .from('supplement_stacks')
      .insert({
        user_id: USER_ID,
        name: stack.name,
        dosage_amount: stack.dosageAmount,
        dosage_unit: stack.dosageUnit,
        brand: stack.brand || null,
        timing: stack.timing || null,
        notes: stack.notes || null,
        is_active: true,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (!error && data) {
      setSupplementStacks(prev => [...prev, {
        id: data.id,
        name: data.name,
        dosageAmount: data.dosage_amount,
        dosageUnit: data.dosage_unit,
        brand: data.brand || undefined,
        timing: data.timing || undefined,
        notes: data.notes || undefined,
        isActive: data.is_active,
        sortOrder: data.sort_order,
        createdAt: data.created_at,
      }]);
    }
  };

  const updateSupplementStack = async (id: string, stack: Partial<SupplementStack>) => {
    const update: Record<string, unknown> = {};
    if (stack.name !== undefined) update.name = stack.name;
    if (stack.dosageAmount !== undefined) update.dosage_amount = stack.dosageAmount;
    if (stack.dosageUnit !== undefined) update.dosage_unit = stack.dosageUnit;
    if (stack.brand !== undefined) update.brand = stack.brand || null;
    if (stack.timing !== undefined) update.timing = stack.timing || null;
    if (stack.notes !== undefined) update.notes = stack.notes || null;
    if (stack.isActive !== undefined) update.is_active = stack.isActive;

    const { error } = await supabase
      .from('supplement_stacks')
      .update(update)
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setSupplementStacks(prev => prev.map(s =>
        s.id === id ? { ...s, ...stack } : s
      ));
    }
  };

  const deleteSupplementStack = async (id: string) => {
    const { error } = await supabase
      .from('supplement_stacks')
      .delete()
      .eq('id', id)
      .eq('user_id', USER_ID);

    if (!error) {
      setSupplementStacks(prev => prev.filter(s => s.id !== id));
    }
  };

  const toggleSupplementStack = async (id: string, isActive: boolean) => {
    await updateSupplementStack(id, { isActive });
  };

  /**
   * Log all active stack items as daily supplement entries for the given date.
   * Skips items already logged that day (matched by name + date).
   */
  const logStackToday = async (date: string) => {
    const activeStacks = supplementStacks.filter(s => s.isActive);
    const alreadyLogged = new Set(
      supplements.filter(s => s.date === date).map(s => s.name.toLowerCase())
    );

    for (const stack of activeStacks) {
      if (alreadyLogged.has(stack.name.toLowerCase())) continue;
      await addSupplement({
        date,
        name: stack.name,
        dosageAmount: stack.dosageAmount,
        dosageUnit: stack.dosageUnit,
        brand: stack.brand,
        timing: stack.timing,
        notes: stack.notes,
      });
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
            fitness_goal: profile.fitnessGoal || 'maintain',
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
            fitnessGoal: (data.fitness_goal as 'bulk' | 'lean-bulk' | 'maintain' | 'lean-cut' | 'cut' | undefined) || 'maintain',
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
            activity_level: profile.activityLevel,
            fitness_goal: profile.fitnessGoal || 'maintain'
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
            fitnessGoal: (data.fitness_goal as 'bulk' | 'lean-bulk' | 'maintain' | 'lean-cut' | 'cut' | undefined) || 'maintain',
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

  // ---------------------------------------------------------------------------
  // REST DAYS CRUD
  // ---------------------------------------------------------------------------

  const addRestDay = async (date: string, type: RestDayType, note?: string) => {
    if (!USER_ID) return;
    // Optimistic update
    const tempId = crypto.randomUUID();
    const newDay: RestDay = { id: tempId, date, type, note };
    setRestDays(prev => {
      const filtered = prev.filter(r => r.date !== date);
      return [...filtered, newDay];
    });
    const { data, error } = await supabase
      .from('user_rest_days')
      .upsert({ user_id: USER_ID, date, type, note: note ?? null }, { onConflict: 'user_id,date' })
      .select()
      .single();
    if (!error && data) {
      setRestDays(prev => prev.map(r => r.id === tempId ? { ...r, id: data.id } : r));
    } else if (error) {
      // Rollback
      setRestDays(prev => prev.filter(r => r.id !== tempId));
      console.error('Error adding rest day:', error);
    }
  };

  const removeRestDay = async (date: string) => {
    if (!USER_ID) return;
    const removed = restDays.find(r => r.date === date);
    setRestDays(prev => prev.filter(r => r.date !== date));
    const { error } = await supabase
      .from('user_rest_days')
      .delete()
      .eq('user_id', USER_ID)
      .eq('date', date);
    if (error) {
      if (removed) setRestDays(prev => [...prev, removed]);
      console.error('Error removing rest day:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // TRAINING BLOCKS CRUD
  // ---------------------------------------------------------------------------

  const createBlock = async (data: Omit<TrainingBlock, 'id' | 'status' | 'createdAt'>) => {
    if (!USER_ID) return;
    const { data: inserted, error } = await supabase
      .from('training_blocks')
      .insert({
        user_id: USER_ID,
        name: data.name,
        start_date: data.startDate,
        duration_weeks: data.durationWeeks,
        focus_muscles: data.focusMuscles,
        status: 'active',
        total_cycles: data.totalCycles ?? null,
        schema_rotation: data.schemaRotation ?? [],
        phases: data.phases ?? null,
      })
      .select()
      .single();
    if (!error && inserted) {
      const newBlock: TrainingBlock = {
        id: inserted.id,
        name: inserted.name,
        startDate: inserted.start_date,
        durationWeeks: inserted.duration_weeks as 4 | 5 | 6,
        focusMuscles: (inserted.focus_muscles ?? []) as TrainingBlockMuscle[],
        status: 'active',
        createdAt: inserted.created_at,
        totalCycles: inserted.total_cycles ?? undefined,
        schemaRotation: (inserted.schema_rotation && inserted.schema_rotation.length > 0) ? inserted.schema_rotation : undefined,
        phases: inserted.phases ?? undefined,
      };
      setTrainingBlocks(prev => [newBlock, ...prev]);
    }
  };

  const completeBlock = async (id: string) => {
    if (!USER_ID) return;
    const { error } = await supabase
      .from('training_blocks')
      .update({ status: 'completed' })
      .eq('id', id)
      .eq('user_id', USER_ID);
    if (!error) {
      setTrainingBlocks(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b));
    }
  };

  const deleteBlock = async (id: string) => {
    if (!USER_ID) return;
    const { error } = await supabase
      .from('training_blocks')
      .delete()
      .eq('id', id)
      .eq('user_id', USER_ID);
    if (!error) {
      setTrainingBlocks(prev => prev.filter(b => b.id !== id));
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
      supplementStacks,
      coachProfile,
      userProfile,
      achievements,
      unlockedAchievement,
      isDataLoaded,
      restDays,
      addRestDay,
      removeRestDay,
      trainingBlocks,
      activeBlock: trainingBlocks.find(b => b.status === 'active') ?? null,
      createBlock,
      completeBlock,
      deleteBlock,
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
      updateBodyStats,
      deleteBodyStats,
      addMeal,
      updateMeal,
      deleteMeal,
      addWater,
      setWaterIntake,
      addSupplement,
      updateSupplement,
      deleteSupplement,
      addSupplementStack,
      updateSupplementStack,
      deleteSupplementStack,
      toggleSupplementStack,
      logStackToday,
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
