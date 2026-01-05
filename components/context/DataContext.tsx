'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CoachProfileType } from '@/components/utils/coachProfiles';
import { useAuth } from '@/components/context/AuthContext';

export interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
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
}

export interface WorkoutExercise {
  id: string; // instance id
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutLog {
  id: string;
  schemaId: string | null;
  name: string;
  date: string;
  startTime: number;
  endTime: number | null;
  exercises: WorkoutExercise[];
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
}

export interface NutritionLog {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  items: NutritionItem[];
}

export interface UserProfile {
  id: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: number;
}

interface DataContextType {
  schemas: Schema[];
  history: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  bodyStats: BodyStats[];
  nutritionLogs: NutritionLog[];
  coachProfile: CoachProfileType;
  userProfile: UserProfile | null;
  addSchema: (schema: Schema) => void;
  updateSchema: (id: string, schema: Schema) => Promise<void>;
  deleteSchema: (id: string) => void;
  startWorkout: (schema?: Schema) => WorkoutLog;
  updateActiveWorkout: (workout: WorkoutLog) => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;
  updateWorkout: (id: string, workout: Partial<WorkoutLog>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  addBodyStats: (stats: BodyStats) => void;
  deleteBodyStats: (id: string) => void;
  addMeal: (date: string, item: Omit<NutritionItem, 'id'>) => void;
  deleteMeal: (date: string, itemId: string) => void;
  setCoachProfile: (profile: CoachProfileType) => void;
  saveUserProfile: (profile: Omit<UserProfile, 'id'>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [bodyStats, setBodyStats] = useState<BodyStats[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [coachProfile, setCoachProfileState] = useState<CoachProfileType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ironpulse_coach_profile');
      return (saved as CoachProfileType) || 'motiverend';
    }
    return 'motiverend';
  });

  const { user } = useAuth();
  const USER_ID = user?.id;

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
          exercises: h.exercises
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
          items: n.items
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
          activityLevel: profileData.activity_level
        });
      }

      // Load active workout from localStorage (temporary state)
      const savedActive = localStorage.getItem('ft_active');
      setActiveWorkout(savedActive ? JSON.parse(savedActive) : null);

    } catch (error) {
      console.error('Error loading data:', error);
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

    if (!error && data) {
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

  const startWorkout = (schema?: Schema): WorkoutLog => {
    // Clear any existing workout first
    localStorage.removeItem('ft_active');
    setActiveWorkout(null);
    
    const newWorkout: WorkoutLog = {
      id: crypto.randomUUID(),
      schemaId: schema ? schema.id : null,
      name: schema ? schema.name : 'Freestyle Workout',
      date: new Date().toISOString(),
      startTime: Date.now(),
      endTime: null,
      exercises: schema ? schema.exercises.map(e => ({
        id: crypto.randomUUID(),
        exerciseId: e.id,
        name: e.name,
        sets: Array(e.targetSets).fill(null).map(() => ({
          id: crypto.randomUUID(),
          weight: 0,
          reps: e.targetReps,
          completed: false
        }))
      })) : []
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
      const finishedWorkout = { ...activeWorkout, endTime: Date.now() };
      
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
          exercises: finishedWorkout.exercises
        })
        .select()
        .single();

      if (!error && data) {
        setHistory(prev => [{
          id: data.id,
          schemaId: data.schema_id,
          name: data.name,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          exercises: data.exercises
        }, ...prev]);
      }
      setActiveWorkout(null);
      localStorage.removeItem('ft_active');
    }
  };

  const cancelWorkout = () => {
    setActiveWorkout(null);
    localStorage.removeItem('ft_active');
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
        exercises: updatedWorkout.exercises
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
      const { error } = await supabase
        .from('nutrition_logs')
        .update({ items: updatedItems })
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.map(l => l.date === date 
          ? { ...l, items: updatedItems }
          : l
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: USER_ID,
          date,
          items: [newItem]
        })
        .select()
        .single();

      if (!error && data) {
        setNutritionLogs(prev => [...prev, {
          id: data.id,
          date: data.date,
          items: data.items
        }]);
      }
    }
  };

  const deleteMeal = async (date: string, itemId: string) => {
    const existingLog = nutritionLogs.find(l => l.date === date);
    if (!existingLog) return;

    const updatedItems = existingLog.items.filter(i => i.id !== itemId);

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
        .update({ items: updatedItems })
        .eq('id', existingLog.id)
        .eq('user_id', USER_ID);

      if (!error) {
        setNutritionLogs(prev => prev.map(l => l.date === date 
          ? { ...l, items: updatedItems }
          : l
        ));
      }
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
            activityLevel: data.activity_level
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
            activityLevel: data.activity_level
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
      coachProfile,
      userProfile,
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
      setCoachProfile,
      saveUserProfile
    }}>
      {children}
    </DataContext.Provider>
  );
};
