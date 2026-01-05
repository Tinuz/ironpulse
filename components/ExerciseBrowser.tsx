'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Filter, ChevronDown } from 'lucide-react'
import exercisesData from '@/exercisesv2.json'

interface Exercise {
  name: string;
  url: string;
  group: string;
  video: string;
  images: string[];
  views: string;
  comments: string;
  meta?: {
    Type: string;
    Equipment: string;
    Mechanics: string;
    'Exp. Level': string;
  };
}

interface ExerciseBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exerciseName: string) => void;
}

const MUSCLE_GROUPS = [
  { id: 'abs', label: 'Abs', emoji: '🎯' },
  { id: 'chest', label: 'Chest', emoji: '💪' },
  { id: 'shoulders', label: 'Shoulders', emoji: '🔺' },
  { id: 'biceps', label: 'Biceps', emoji: '💪' },
  { id: 'triceps', label: 'Triceps', emoji: '🔨' },
  { id: 'lats', label: 'Back', emoji: '🗻' },
  { id: 'middle-back', label: 'Mid Back', emoji: '⬆️' },
  { id: 'quads', label: 'Quads', emoji: '🦵' },
  { id: 'hamstrings', label: 'Hamstrings', emoji: '🦴' },
  { id: 'glutes', label: 'Glutes', emoji: '🍑' },
  { id: 'calves', label: 'Calves', emoji: '👟' },
  { id: 'forearms', label: 'Forearms', emoji: '🤜' },
];

const EQUIPMENT = [
  { id: 'Dumbbell', label: 'Dumbbell' },
  { id: 'Bodyweight', label: 'Bodyweight' },
  { id: 'Barbell', label: 'Barbell' },
  { id: 'Cable', label: 'Cable' },
  { id: 'Machine', label: 'Machine' },
  { id: 'Kettle Bells', label: 'Kettlebell' },
  { id: 'Bands', label: 'Bands' },
  { id: 'Exercise Ball', label: 'Exercise Ball' },
  { id: 'Medicine Ball', label: 'Medicine Ball' },
  { id: 'EZ Bar', label: 'EZ Bar' },
  { id: 'Other', label: 'Other' },
];

const MECHANICS = [
  { id: 'Compound', label: 'Compound' },
  { id: 'Isolation', label: 'Isolation' },
];

const EXPERIENCE_LEVELS = [
  { id: 'Beginner', label: 'Beginner', color: 'bg-green-500/20 text-green-400' },
  { id: 'Intermediate', label: 'Intermediate', color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'Advanced', label: 'Advanced', color: 'bg-red-500/20 text-red-400' },
];

export default function ExerciseBrowser({ isOpen, onClose, onSelect }: ExerciseBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedMechanics, setSelectedMechanics] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const exercises = exercisesData as Exercise[];

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Muscle group filter (via group field)
      const matchesMuscle = !selectedMuscle || ex.group === selectedMuscle;
      
      // Equipment filter (via meta.Equipment)
      const matchesEquipment = !selectedEquipment || (ex.meta && ex.meta.Equipment === selectedEquipment);
      
      // Mechanics filter (via meta.Mechanics)
      const matchesMechanics = !selectedMechanics || (ex.meta && ex.meta.Mechanics === selectedMechanics);
      
      // Experience level filter (via meta['Exp. Level'])
      const matchesLevel = !selectedLevel || (ex.meta && ex.meta['Exp. Level'] === selectedLevel);
      
      return matchesSearch && matchesMuscle && matchesEquipment && matchesMechanics && matchesLevel;
    });
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment, selectedMechanics, selectedLevel]);

  const handleSelect = (exercise: Exercise) => {
    // Clean up the name - remove "Video Exercise Guide" suffix
    const cleanName = exercise.name
      .replace(/Video Exercise Guide$/i, '')
      .replace(/\(AKA [^)]+\)/g, '')
      .trim();
    
    onSelect(cleanName);
    onClose();
  };

  const clearFilters = () => {
    setSelectedMuscle(null);
    setSelectedEquipment(null);
    setSelectedMechanics(null);
    setSelectedLevel(null);
    setSearchQuery('');
  };

  const activeFilterCount = [selectedMuscle, selectedEquipment, selectedMechanics, selectedLevel].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative bg-background border-t sm:border sm:rounded-2xl border-white/10 w-full sm:max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Browse Exercises</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            >
              <X size={24} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Muscle Groups */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Muscle Group</label>
                    {selectedMuscle && (
                      <button
                        onClick={() => setSelectedMuscle(null)}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map(muscle => (
                      <button
                        key={muscle.id}
                        onClick={() => setSelectedMuscle(selectedMuscle === muscle.id ? null : muscle.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedMuscle === muscle.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        {muscle.emoji} {muscle.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equipment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Equipment</label>
                    {selectedEquipment && (
                      <button
                        onClick={() => setSelectedEquipment(null)}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT.map(equip => (
                      <button
                        key={equip.id}
                        onClick={() => setSelectedEquipment(selectedEquipment === equip.id ? null : equip.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedEquipment === equip.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        {equip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mechanics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Type</label>
                    {selectedMechanics && (
                      <button
                        onClick={() => setSelectedMechanics(null)}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MECHANICS.map(mech => (
                      <button
                        key={mech.id}
                        onClick={() => setSelectedMechanics(selectedMechanics === mech.id ? null : mech.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedMechanics === mech.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        {mech.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience Level */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Experience</label>
                    {selectedLevel && (
                      <button
                        onClick={() => setSelectedLevel(null)}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_LEVELS.map(level => (
                      <button
                        key={level.id}
                        onClick={() => setSelectedLevel(selectedLevel === level.id ? null : level.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedLevel === level.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-primary"
                  >
                    Clear All Filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {filteredExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold mb-2">No exercises found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground mb-3 font-medium">
                {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
              </div>
              {filteredExercises.map((exercise, idx) => {
                const levelConfig = exercise.meta ? EXPERIENCE_LEVELS.find(l => l.id === exercise.meta!['Exp. Level']) : null;
                
                return (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    onClick={() => handleSelect(exercise)}
                    className="w-full bg-card border border-white/5 rounded-xl p-4 text-left hover:bg-white/5 active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors flex-1">
                        {exercise.name.replace(/Video Exercise Guide$/i, '').replace(/\(AKA [^)]+\)/g, '').trim()}
                      </h4>
                      {levelConfig && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${levelConfig.color}`}>
                          {levelConfig.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {/* Muscle Group */}
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold uppercase">
                        {exercise.group}
                      </span>
                      
                      {/* Equipment */}
                      {exercise.meta?.Equipment && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-medium">
                          {exercise.meta.Equipment}
                        </span>
                      )}
                      
                      {/* Mechanics */}
                      {exercise.meta?.Mechanics && (
                        <span className="px-2 py-0.5 bg-white/10 text-muted-foreground rounded text-[10px] font-medium">
                          {exercise.meta.Mechanics}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
