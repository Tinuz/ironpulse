'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, GripHorizontal, RotateCcw, Edit2, Search, RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useData, Schema, Exercise } from '@/components/context/DataContext'
import ExerciseSubstitutionModal from '@/components/ExerciseSubstitutionModal'

export default function SchemaBuilder() {
  const { addSchema, schemas, updateSchema } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isAddingEx, setIsAddingEx] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  
  // New Exercise Form State
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState(10);
  const [newExStartWeight, setNewExStartWeight] = useState<number | undefined>(undefined);

  // Substitution Modal State
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [exerciseToSubstitute, setExerciseToSubstitute] = useState<Exercise | null>(null);

  // Load schema for editing
  useEffect(() => {
    if (editId) {
      const schemaToEdit = schemas.find(s => s.id === editId);
      if (schemaToEdit) {
        setName(schemaToEdit.name);
        setExercises([...schemaToEdit.exercises]);
        setIsEditMode(true);
      }
    }
  }, [editId, schemas]);

  // Handle selected exercise from Exercise Library or AI Suggestions
  useEffect(() => {
    const selectedExercise = searchParams.get('selectedExercise');
    const sets = searchParams.get('sets');
    const reps = searchParams.get('reps');
    
    if (selectedExercise) {
      setNewExName(decodeURIComponent(selectedExercise));
      
      // Use suggested sets/reps if provided (from AI)
      if (sets) setNewExSets(parseInt(sets, 10) || 3);
      if (reps) setNewExReps(parseInt(reps, 10) || 10);
      
      // Auto-open add form if not already adding/editing
      if (!isAddingEx && !editingExercise) {
        setIsAddingEx(true);
      }
      
      // Clean up URL params
      router.replace(editId ? `/schema?edit=${editId}` : '/schema');
    }
  }, [searchParams, router, editId, isAddingEx, editingExercise]);

  const handleAddExercise = () => {
    if (!newExName.trim()) return;
    
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name: newExName,
      targetSets: newExSets,
      targetReps: newExReps,
      startWeight: newExStartWeight
    };
    
    setExercises([...exercises, exercise]);
    setNewExName('');
    setNewExSets(3);
    setNewExReps(10);
    setNewExStartWeight(undefined);
    setIsAddingEx(false);
  };

  const handleSaveSchema = async () => {
    if (!name.trim() || exercises.length === 0) return;
    
    if (isEditMode && editId) {
      // Update existing schema
      const schemaToEdit = schemas.find(s => s.id === editId);
      const updatedSchema: Schema = {
        id: editId,
        name,
        exercises,
        color: schemaToEdit?.color || 'from-orange-500 to-red-500'
      };
      await updateSchema(editId, updatedSchema);
    } else {
      // Create new schema
      const colors = [
        'from-orange-500 to-red-500',
        'from-blue-500 to-cyan-500', 
        'from-purple-500 to-pink-500',
        'from-green-500 to-emerald-500'
      ];
      
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newSchema: Schema = {
        id: crypto.randomUUID(),
        name,
        exercises,
        color: randomColor
      };
      
      addSchema(newSchema);
    }
    
    router.push('/');
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const startEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setNewExName(exercise.name);
    setNewExSets(exercise.targetSets);
    setNewExReps(exercise.targetReps);
    setNewExStartWeight(exercise.startWeight);
  };

  const handleUpdateExercise = () => {
    if (!editingExercise || !newExName.trim()) return;
    
    setExercises(exercises.map(ex => 
      ex.id === editingExercise.id 
        ? { ...ex, name: newExName, targetSets: newExSets, targetReps: newExReps, startWeight: newExStartWeight }
        : ex
    ));
    
    setEditingExercise(null);
    setNewExName('');
    setNewExSets(3);
    setNewExReps(10);
    setNewExStartWeight(undefined);
  };

  const cancelEdit = () => {
    setEditingExercise(null);
    setNewExName('');
    setNewExSets(3);
    setNewExReps(10);
    setNewExStartWeight(undefined);
    setIsAddingEx(false);
  };

  const openSubstitutionModal = (exercise: Exercise) => {
    setExerciseToSubstitute(exercise);
    setSubstitutionModalOpen(true);
  };

  const handleSubstituteExercise = (newExerciseName: string) => {
    if (!exerciseToSubstitute) return;
    
    setExercises(exercises.map(ex => 
      ex.id === exerciseToSubstitute.id 
        ? { ...ex, name: newExerciseName }
        : ex
    ));
    
    setSubstitutionModalOpen(false);
    setExerciseToSubstitute(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{isEditMode ? 'Edit Routine' : 'New Routine'}</h1>
        <button 
          onClick={handleSaveSchema}
          disabled={!name.trim() || exercises.length === 0}
          className="text-primary font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          Save
        </button>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-8">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold pl-1">Routine Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Upper Body Strength"
            className="w-full bg-transparent border-b-2 border-white/10 py-2 text-2xl font-black placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold pl-1">Exercises ({exercises.length})</label>
          </div>

          <AnimatePresence mode="popLayout">
            {exercises.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-white/5 rounded-xl p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground font-mono text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight">{ex.name}</h4>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1 font-mono">
                      <span className="flex items-center gap-1"><GripHorizontal size={12}/> {ex.targetSets} Sets</span>
                      <span className="flex items-center gap-1"><RotateCcw size={12}/> {ex.targetReps} Reps</span>
                      {ex.startWeight && <span className="text-primary">@ {ex.startWeight}kg</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openSubstitutionModal(ex)}
                    className="p-2 text-blue-400/60 md:opacity-0 md:group-hover:opacity-100 hover:text-blue-400 transition-colors"
                    title="Find substitute exercise"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button 
                    onClick={() => startEditExercise(ex)}
                    className="p-2 text-muted-foreground/60 md:opacity-0 md:group-hover:opacity-100 hover:text-primary transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => removeExercise(ex.id)}
                    className="p-2 text-red-500/60 md:opacity-0 md:group-hover:opacity-100 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add/Edit Exercise Form */}
          {(isAddingEx || editingExercise) ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-primary/50 rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                  {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
                </h3>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Exercise Name</label>
                  <button
                    onClick={() => {
                      const returnPath = editId ? `/schema?edit=${editId}` : '/schema';
                      router.push(`/exercises?mode=select&return=${encodeURIComponent(returnPath)}`);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <Search size={12} />
                    Browse
                  </button>
                </div>
                <input
                  autoFocus
                  type="text"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  placeholder="e.g. Bench Press"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Sets</label>
                  <div className="flex items-center mt-1 bg-white/5 rounded-lg overflow-hidden">
                    <button onClick={() => setNewExSets(s => Math.max(1, s - 1))} className="p-2 hover:bg-white/10">-</button>
                    <div className="flex-1 text-center font-mono font-bold">{newExSets}</div>
                    <button onClick={() => setNewExSets(s => s + 1)} className="p-2 hover:bg-white/10">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Reps</label>
                  <div className="flex items-center mt-1 bg-white/5 rounded-lg overflow-hidden">
                    <button onClick={() => setNewExReps(r => Math.max(1, r - 1))} className="p-2 hover:bg-white/10">-</button>
                    <div className="flex-1 text-center font-mono font-bold">{newExReps}</div>
                    <button onClick={() => setNewExReps(r => r + 1)} className="p-2 hover:bg-white/10">+</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Start Weight (kg) - Optioneel</label>
                <input
                  type="number"
                  value={newExStartWeight ?? ''}
                  onChange={(e) => setNewExStartWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
                  placeholder="20"
                  step="0.5"
                  min="0"
                />
                <p className="text-[9px] text-muted-foreground mt-1 px-1">Dit wordt automatisch ingevuld bij nieuwe workouts</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={cancelEdit}
                  className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={editingExercise ? handleUpdateExercise : handleAddExercise}
                  disabled={!newExName.trim()}
                  className="flex-1 py-3 text-sm font-bold bg-primary text-background rounded-lg shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {editingExercise ? 'Update Exercise' : 'Add Exercise'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              layout
              onClick={() => setIsAddingEx(true)}
              className="w-full py-4 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 text-muted-foreground font-bold hover:bg-white/5 hover:text-primary transition-all group"
            >
              <div className="h-6 w-6 rounded-full border border-current flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-background transition-colors">
                <Plus size={14} />
              </div>
              Add Exercise
            </motion.button>
          )}
        </div>
      </div>

      {/* Exercise Substitution Modal */}
      <ExerciseSubstitutionModal
        isOpen={substitutionModalOpen}
        onClose={() => {
          setSubstitutionModalOpen(false);
          setExerciseToSubstitute(null);
        }}
        exerciseName={exerciseToSubstitute?.name || ''}
        onSelectSubstitute={handleSubstituteExercise}
      />
    </div>
  );
}
