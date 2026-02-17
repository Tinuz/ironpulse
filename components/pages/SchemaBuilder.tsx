'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, GripVertical, RotateCcw, Edit2, Search, RefreshCw, Share2, Lightbulb, Heart, Dumbbell, Clock, Route } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useData, Schema, Exercise, ExerciseType } from '@/components/context/DataContext'
import ExerciseSubstitutionModal from '@/components/ExerciseSubstitutionModal'
import TemplateShareModal from '@/components/TemplateShareModal'
import { suggestStartingWeight, StartingWeightSuggestion } from '@/components/utils/startingWeightSuggestions'
import { useLanguage } from '@/components/context/LanguageContext'

export default function SchemaBuilder() {
  const { t } = useLanguage();
  const { addSchema, schemas, updateSchema, history, userProfile } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isAddingEx, setIsAddingEx] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  
  // New Exercise Form State
  const [exerciseType, setExerciseType] = useState<ExerciseType>('strength');
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState(10);
  const [newExStartWeight, setNewExStartWeight] = useState<number | undefined>(undefined);
  const [newExMuscleGroup, setNewExMuscleGroup] = useState<Exercise['muscleGroup']>(undefined);
  const [newExOneRM, setNewExOneRM] = useState<number | undefined>(undefined);
  
  // Cardio-specific state
  const [cardioDuration, setCardioDuration] = useState<number>(1800); // 30 min default in seconds
  const [cardioDistance, setCardioDistance] = useState<number | undefined>(undefined); // in meters
  const [cardioHeartRate, setCardioHeartRate] = useState<number | undefined>(undefined); // bpm
  const [cardioIntensity, setCardioIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  
  // AI Weight Suggestion State
  const [weightSuggestion, setWeightSuggestion] = useState<StartingWeightSuggestion | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Substitution Modal State
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [exerciseToSubstitute, setExerciseToSubstitute] = useState<Exercise | null>(null);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);

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

  // Generate AI weight suggestion when exercise name changes
  useEffect(() => {
    if (newExName.trim() && history.length > 0) {
      const suggestion = suggestStartingWeight(newExName, history, userProfile);
      setWeightSuggestion(suggestion);
      setShowSuggestion(true);
      
      // Only auto-apply if user hasn't manually set a weight
      if (suggestion && newExStartWeight === undefined && !editingExercise) {
        setNewExStartWeight(suggestion.suggestedWeight);
      }
    } else {
      setWeightSuggestion(null);
      setShowSuggestion(false);
    }
  }, [newExName, history, userProfile, editingExercise]); // Excluded newExStartWeight to avoid infinite loop

  const handleAddExercise = () => {
    if (!newExName.trim()) return;
    
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name: newExName,
      type: exerciseType,
      muscleGroup: newExMuscleGroup,
      targetSets: exerciseType === 'strength' ? newExSets : 0,
      targetReps: exerciseType === 'strength' ? newExReps : 0,
      startWeight: exerciseType === 'strength' ? newExStartWeight : undefined,
      oneRepMax: exerciseType === 'strength' ? newExOneRM : undefined,
      cardioData: exerciseType === 'cardio' ? {
        duration: cardioDuration,
        distance: cardioDistance,
        heartRate: cardioHeartRate,
        intensity: cardioIntensity
      } : undefined
    };
    
    setExercises([...exercises, exercise]);
    setNewExName('');
    setExerciseType('strength');
    setNewExSets(3);
    setNewExReps(10);
    setNewExStartWeight(undefined);
    setNewExMuscleGroup(undefined);
    setNewExOneRM(undefined);
    setCardioDuration(1800);
    setCardioDistance(undefined);
    setCardioHeartRate(undefined);
    setCardioIntensity('moderate');
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
    setExerciseType(exercise.type || 'strength');
    setNewExName(exercise.name);
    setNewExSets(exercise.targetSets);
    setNewExReps(exercise.targetReps);
    setNewExStartWeight(exercise.startWeight);
    setNewExMuscleGroup(exercise.muscleGroup);
    setNewExOneRM(exercise.oneRepMax);
    
    // Load cardio data if exists
    if (exercise.cardioData) {
      setCardioDuration(exercise.cardioData.duration);
      setCardioDistance(exercise.cardioData.distance);
      setCardioHeartRate(exercise.cardioData.heartRate);
      setCardioIntensity(typeof exercise.cardioData.intensity === 'string' 
        ? exercise.cardioData.intensity 
        : 'moderate');
    }
  };

  const handleUpdateExercise = () => {
    if (!editingExercise || !newExName.trim()) return;
    
    setExercises(exercises.map(ex => 
      ex.id === editingExercise.id 
        ? { 
            ...ex, 
            name: newExName, 
            type: exerciseType,
            muscleGroup: newExMuscleGroup,
            targetSets: exerciseType === 'strength' ? newExSets : 0, 
            targetReps: exerciseType === 'strength' ? newExReps : 0, 
            startWeight: exerciseType === 'strength' ? newExStartWeight : undefined,
            oneRepMax: exerciseType === 'strength' ? newExOneRM : undefined,
            cardioData: exerciseType === 'cardio' ? {
              duration: cardioDuration,
              distance: cardioDistance,
              heartRate: cardioHeartRate,
              intensity: cardioIntensity
            } : undefined
          }
        : ex
    ));
    
    setEditingExercise(null);
    setNewExName('');
    setExerciseType('strength');
    setNewExSets(3);
    setNewExReps(10);
    setNewExStartWeight(undefined);
    setNewExMuscleGroup(undefined);
    setNewExOneRM(undefined);
    setCardioDuration(1800);
    setCardioDistance(undefined);
    setCardioHeartRate(undefined);
    setCardioIntensity('moderate');
  };

  const cancelEdit = () => {
    setEditingExercise(null);
    setNewExName('');
    setExerciseType('strength');
    setNewExSets(3);
    setNewExReps(10);
    setNewExStartWeight(undefined);
    setNewExMuscleGroup(undefined);
    setNewExOneRM(undefined);
    setCardioDuration(1800);
    setCardioDistance(undefined);
    setCardioHeartRate(undefined);
    setCardioIntensity('moderate');
    setIsAddingEx(false);
    setWeightSuggestion(null);
    setShowSuggestion(false);
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
        <h1 className="font-bold text-lg">{isEditMode ? t.schema.editSchema : t.schema.newRoutine}</h1>
        <div className="flex gap-2">
          {isEditMode && exercises.length > 0 && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title={t.schema.shareSchema}
            >
              <Share2 size={20} />
            </button>
          )}
          <button 
            onClick={handleSaveSchema}
            disabled={!name.trim() || exercises.length === 0}
            className="text-primary font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {t.common.save}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-8">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold pl-1">{t.schema.schemaName}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.schema.schemaName}
            className="w-full bg-transparent border-b-2 border-white/10 py-2 text-2xl font-black placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold pl-1">{t.workout.exercises} ({exercises.length})</label>
          </div>

          <Reorder.Group axis="y" values={exercises} onReorder={setExercises} className="space-y-3">
            {exercises.map((ex, i) => (
              <Reorder.Item
                key={ex.id}
                value={ex}
                className="bg-card border border-white/5 rounded-xl overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between group">
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing p-2 -ml-2 mr-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    title="Sleep om volgorde te wijzigen"
                  >
                    <GripVertical size={20} />
                  </div>

                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      ex.type === 'cardio' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-white/5 text-muted-foreground'
                    }`}>
                      {ex.type === 'cardio' ? <Heart size={18} /> : i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg leading-tight">{ex.name}</h4>
                        {ex.type === 'cardio' && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                            {t.schema.cardio}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1 font-mono">
                        {ex.type === 'cardio' ? (
                          <>
                            {ex.cardioData && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock size={12}/> {Math.floor(ex.cardioData.duration / 60)}:{(ex.cardioData.duration % 60).toString().padStart(2, '0')}
                                </span>
                                {ex.cardioData.distance && (
                                  <span className="flex items-center gap-1">
                                    <Route size={12}/> {(ex.cardioData.distance / 1000).toFixed(1)}km
                                  </span>
                                )}
                                {ex.cardioData.intensity && (
                                  <span className={`uppercase font-bold ${
                                    ex.cardioData.intensity === 'high' ? 'text-red-400' :
                                    ex.cardioData.intensity === 'moderate' ? 'text-yellow-400' :
                                    'text-blue-400'
                                  }`}>
                                    {ex.cardioData.intensity === 'high' ? t.schema.high :
                                     ex.cardioData.intensity === 'moderate' ? t.schema.moderate : t.schema.low}
                                  </span>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1"><RotateCcw size={12}/> {ex.targetSets} {t.workout.sets}</span>
                            <span className="flex items-center gap-1"><RotateCcw size={12}/> {ex.targetReps} {t.workout.reps}</span>
                            {ex.startWeight && <span className="text-primary">@ {ex.startWeight}kg</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openSubstitutionModal(ex)}
                      className="p-2 text-blue-400/40 hover:text-blue-400 transition-colors"
                      title={t.common.search}
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button 
                      onClick={() => startEditExercise(ex)}
                      className="p-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => removeExercise(ex.id)}
                      className="p-2 text-red-500/40 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* Add/Edit Exercise Form */}
          {(isAddingEx || editingExercise) ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-primary/50 rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                  {editingExercise ? t.common.edit : t.workout.addExercise}
                </h3>
              </div>
              
              {/* Exercise Type Toggle */}
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">
                  {t.schema.exerciseType}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-lg">
                  <button
                    onClick={() => setExerciseType('strength')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-bold text-sm transition-all ${
                      exerciseType === 'strength'
                        ? 'bg-primary text-background shadow-lg shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Dumbbell size={16} />
                    {t.schema.strength}
                  </button>
                  <button
                    onClick={() => setExerciseType('cardio')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-md font-bold text-sm transition-all ${
                      exerciseType === 'cardio'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Heart size={16} />
                    {t.schema.cardio}
                  </button>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">{t.schema.exerciseName}</label>
                  <button
                    onClick={() => {
                      const returnPath = editId ? `/schema?edit=${editId}` : '/schema';
                      router.push(`/exercises?mode=select&return=${encodeURIComponent(returnPath)}`);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <Search size={12} />
                    {t.common.search}
                  </button>
                </div>
                <input
                  autoFocus
                  type="text"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  placeholder={t.schema.exerciseName}
                />
              </div>

              {/* Muscle Group Selector */}
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Spiergroep</label>
                <select
                  value={newExMuscleGroup || ''}
                  onChange={(e) => setNewExMuscleGroup(e.target.value as Exercise['muscleGroup'] || undefined)}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-medium border border-white/10 hover:bg-[#202020] transition-colors"
                >
                  <option value="" className="bg-[#1a1a1a] text-white/60">Selecteer spiergroep (optioneel)</option>
                  
                  <optgroup label="Borst" className="bg-[#1a1a1a] text-white font-bold">
                    <option value="chest" className="bg-[#1a1a1a] text-white">Borst (algemeen)</option>
                  </optgroup>
                  
                  <optgroup label="Rug" className="bg-[#1a1a1a] text-white font-bold">
                    <option value="back" className="bg-[#1a1a1a] text-white">Rug (algemeen)</option>
                    <option value="lats" className="bg-[#1a1a1a] text-white">Latissimus (lats)</option>
                    <option value="traps" className="bg-[#1a1a1a] text-white">Trapezius (traps)</option>
                    <option value="middle-back" className="bg-[#1a1a1a] text-white">Midden rug</option>
                    <option value="lower-back" className="bg-[#1a1a1a] text-white">Onderrug</option>
                  </optgroup>
                  
                  <optgroup label="Schouders" className="bg-[#1a1a1a] text-white font-bold">
                    <option value="shoulders" className="bg-[#1a1a1a] text-white">Schouders</option>
                  </optgroup>
                  
                  <optgroup label="Armen" className="bg-[#1a1a1a] text-white font-bold">
                    <option value="biceps" className="bg-[#1a1a1a] text-white">Biceps</option>
                    <option value="triceps" className="bg-[#1a1a1a] text-white">Triceps</option>
                    <option value="forearms" className="bg-[#1a1a1a] text-white">Onderarmen</option>
                  </optgroup>
                  
                  <optgroup label="Benen" className="bg-[#1a1a1a] text-white font-bold">
                    <option value="legs" className="bg-[#1a1a1a] text-white">Benen (algemeen)</option>
                    <option value="quads" className="bg-[#1a1a1a] text-white">Dijbenen (quads)</option>
                    <option value="hamstrings" className="bg-[#1a1a1a] text-white">Hamstrings</option>
                    <option value="glutes" className="bg-[#1a1a1a] text-white">Billen (glutes)</option>
                    <option value="calves" className="bg-[#1a1a1a] text-white">Kuiten</option>
                  </optgroup>
                  
                  <optgroup label="Core" className="bg-[#1a1a1a] text-white font-bold">
                    <option value="abs" className="bg-[#1a1a1a] text-white">Buikspieren (abs)</option>
                    <option value="obliques" className="bg-[#1a1a1a] text-white">Schuin buikspieren</option>
                    <option value="core" className="bg-[#1a1a1a] text-white">Core (algemeen)</option>
                  </optgroup>
                </select>
              </div>
              
              {/* Strength-specific fields */}
              {exerciseType === 'strength' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">{t.workout.sets}</label>
                      <div className="flex items-center mt-1 bg-white/5 rounded-lg overflow-hidden">
                        <button onClick={() => setNewExSets(s => Math.max(1, s - 1))} className="p-2 hover:bg-white/10">-</button>
                        <div className="flex-1 text-center font-mono font-bold">{newExSets}</div>
                        <button onClick={() => setNewExSets(s => s + 1)} className="p-2 hover:bg-white/10">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">{t.workout.reps}</label>
                      <div className="flex items-center mt-1 bg-white/5 rounded-lg overflow-hidden">
                        <button onClick={() => setNewExReps(r => Math.max(1, r - 1))} className="p-2 hover:bg-white/10">-</button>
                        <div className="flex-1 text-center font-mono font-bold">{newExReps}</div>
                        <button onClick={() => setNewExReps(r => r + 1)} className="p-2 hover:bg-white/10">+</button>
                      </div>
                    </div>
                  </div>
                  <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">{t.schema.startWeight} (kg)</label>
                  {weightSuggestion && showSuggestion && (
                    <button
                      onClick={() => setNewExStartWeight(weightSuggestion.suggestedWeight)}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <Lightbulb size={12} />
                      AI
                    </button>
                  )}
                </div>
                
                {/* AI Weight Suggestion Banner */}
                <AnimatePresence>
                  {weightSuggestion && showSuggestion && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="bg-primary/10 border border-primary/30 rounded-lg p-3 overflow-hidden"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <Lightbulb size={16} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-bold text-primary">
                              {weightSuggestion.suggestedWeight}kg
                            </span>
                            <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                              weightSuggestion.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                              weightSuggestion.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {weightSuggestion.confidence === 'high' ? t.schema.high :
                               weightSuggestion.confidence === 'medium' ? t.schema.moderate :
                               t.schema.low}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {weightSuggestion.reasoning}
                          </p>
                          <p className="text-[9px] text-muted-foreground/60 mt-1 italic">
                            {weightSuggestion.basedOn}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowSuggestion(false)}
                          className="text-muted-foreground/40 hover:text-muted-foreground text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <input
                  type="number"
                  value={newExStartWeight ?? ''}
                  onChange={(e) => setNewExStartWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
                  placeholder="20"
                  step="0.5"
                  min="0"
                />
                <p className="text-[9px] text-muted-foreground mt-1 px-1">{t.schema.startWeight}</p>
              </div>

              {/* 1RM Input Field */}
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                  1RM (kg)
                  <span className="text-[9px] font-normal text-muted-foreground/60 normal-case italic">{t.common.optional || 'Optioneel'}</span>
                </label>
                <input
                  type="number"
                  value={newExOneRM ?? ''}
                  onChange={(e) => setNewExOneRM(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
                  placeholder="100"
                  step="0.5"
                  min="0"
                />
                {newExOneRM && newExOneRM >= 5 && (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-[9px] font-bold text-blue-400 mb-1">💡 Sets worden automatisch ingevuld</div>
                    <div className="text-[10px] text-blue-300/80 space-y-0.5">
                      <div>• Warmup: <span className="font-bold">{(newExOneRM * 0.5).toFixed(1)}kg</span></div>
                      <div>• Werksets: <span className="font-bold">{(newExOneRM * 0.75).toFixed(1)}kg × 12</span></div>
                    </div>
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground mt-1 px-1">Bij starten workout worden sets automatisch ingevuld op basis van 1RM</p>
              </div>
                </>
              )}
              
              {/* Cardio-specific fields */}
              {exerciseType === 'cardio' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {t.workout.duration}
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-1">{t.workout.durationMinutes}</div>
                        <div className="flex items-center bg-white/5 rounded-lg overflow-hidden">
                          <button onClick={() => setCardioDuration(d => Math.max(0, d - 60))} className="p-2 hover:bg-white/10">-</button>
                          <div className="flex-1 text-center font-mono font-bold">{Math.floor(cardioDuration / 60)}</div>
                          <button onClick={() => setCardioDuration(d => d + 60)} className="p-2 hover:bg-white/10">+</button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-1">s</div>
                        <div className="flex items-center bg-white/5 rounded-lg overflow-hidden">
                          <button onClick={() => setCardioDuration(d => Math.max(0, Math.floor(d / 60) * 60 + ((d % 60) - 15 + 60) % 60))} className="p-2 hover:bg-white/10">-15s</button>
                          <div className="flex-1 text-center font-mono font-bold">{cardioDuration % 60}</div>
                          <button onClick={() => setCardioDuration(d => Math.floor(d / 60) * 60 + (d % 60 + 15) % 60 + (d % 60 + 15 >= 60 ? 60 : 0))} className="p-2 hover:bg-white/10">+15s</button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center text-sm font-bold text-green-500">
                      {Math.floor(cardioDuration / 60)}:{(cardioDuration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Route size={12} />
                      {t.workout.cardioStats.distance}
                    </label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={cardioDistance ? (cardioDistance / 1000).toFixed(2) : ''}
                        onChange={(e) => setCardioDistance(e.target.value ? parseFloat(e.target.value) * 1000 : undefined)}
                        className="flex-1 bg-white/5 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono font-bold"
                        placeholder="0.00"
                        step="0.1"
                        min="0"
                      />
                      <div className="flex items-center px-3 bg-white/5 rounded-lg text-muted-foreground font-bold">
                        km
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Heart size={12} />
                      {t.workout.cardioStats.heartRate}
                    </label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={cardioHeartRate ?? ''}
                        onChange={(e) => setCardioHeartRate(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="flex-1 bg-white/5 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono font-bold"
                        placeholder="145"
                        min="40"
                        max="220"
                      />
                      <div className="flex items-center px-3 bg-white/5 rounded-lg text-muted-foreground font-bold">
                        bpm
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">
                      {t.schema.intensity}
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {(['low', 'moderate', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setCardioIntensity(level)}
                          className={`py-2 rounded-lg font-bold text-xs transition-all ${
                            cardioIntensity === level
                              ? level === 'low' ? 'bg-blue-500 text-white' :
                                level === 'moderate' ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                          }`}
                        >
                          {level === 'low' ? t.schema.low : level === 'moderate' ? t.schema.moderate : t.schema.high}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={cancelEdit}
                  className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button 
                  onClick={editingExercise ? handleUpdateExercise : handleAddExercise}
                  disabled={!newExName.trim()}
                  className="flex-1 py-3 text-sm font-bold bg-primary text-background rounded-lg shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {editingExercise ? t.common.edit : t.workout.addExercise}
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
              {t.workout.addExercise}
            </motion.button>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && editId && (
        <TemplateShareModal
          schema={{
            id: editId,
            name,
            exercises,
            color: schemas.find(s => s.id === editId)?.color
          }}
          onClose={() => setShareModalOpen(false)}
        />
      )}

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
