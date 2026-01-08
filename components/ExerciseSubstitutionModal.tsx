'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Filter, ArrowRight, Zap, Heart, Activity } from 'lucide-react'
import { 
  findSubstitutes, 
  SubstituteExercise, 
  SubstitutionFilters
} from '@/components/utils/substitutionEngine'

interface ExerciseSubstitutionModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseName: string
  onSelectSubstitute: (newExerciseName: string) => void
}

export default function ExerciseSubstitutionModal({
  isOpen,
  onClose,
  exerciseName,
  onSelectSubstitute
}: ExerciseSubstitutionModalProps) {
  const [substitutes, setSubstitutes] = useState<SubstituteExercise[]>([])
  const [filteredSubstitutes, setFilteredSubstitutes] = useState<SubstituteExercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | null>(null)
  const [lowImpactOnly, setLowImpactOnly] = useState(false)
  const [mechanicsFilter, setMechanicsFilter] = useState<'Compound' | 'Isolation' | null>(null)

  // Load substitutes when modal opens
  useEffect(() => {
    if (isOpen && exerciseName) {
      const filters: SubstitutionFilters = {
        equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
        maxDifficulty: selectedDifficulty || undefined,
        lowImpact: lowImpactOnly,
        mechanics: mechanicsFilter || undefined
      }
      
      const results = findSubstitutes(exerciseName, filters, 20)
      setSubstitutes(results)
      setFilteredSubstitutes(results)
    }
  }, [isOpen, exerciseName, selectedEquipment, selectedDifficulty, lowImpactOnly, mechanicsFilter])

  // Apply search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubstitutes(substitutes)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredSubstitutes(
        substitutes.filter(sub => 
          sub.name.toLowerCase().includes(query) ||
          sub.muscleGroups.some(m => m.toLowerCase().includes(query))
        )
      )
    }
  }, [searchQuery, substitutes])

  const handleSelectSubstitute = (substituteName: string) => {
    onSelectSubstitute(substituteName)
    onClose()
  }

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    )
  }

  const resetFilters = () => {
    setSelectedEquipment([])
    setSelectedDifficulty(null)
    setLowImpactOnly(false)
    setMechanicsFilter(null)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="relative w-full max-w-2xl mx-4 mb-4 sm:mb-0 bg-card border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h2 className="text-xl font-black mb-1">Find Substitute</h2>
                <p className="text-sm text-muted-foreground">
                  Alternatives for <span className="text-primary font-bold">{exerciseName}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 -mt-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alternatives..."
                className="w-full bg-white/5 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  showFilters ? 'bg-primary text-background' : 'bg-white/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Filter size={14} />
                Filters
              </button>

              {/* Quick Filters */}
              <button
                onClick={() => setLowImpactOnly(!lowImpactOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  lowImpactOnly ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart size={14} />
                Injury Safe
              </button>

              {substitutes.length > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {filteredSubstitutes.length} of {substitutes.length} matches
                </span>
              )}
            </div>

            {/* Expandable Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 bg-white/5 rounded-lg space-y-4">
                    {/* Equipment Filter */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Equipment</label>
                      <div className="flex flex-wrap gap-2">
                        {['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell'].map(eq => (
                          <button
                            key={eq}
                            onClick={() => toggleEquipment(eq)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                              selectedEquipment.includes(eq)
                                ? 'bg-primary text-background'
                                : 'bg-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {eq}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Filter */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Max Difficulty</label>
                      <div className="flex gap-2">
                        {(['Beginner', 'Intermediate', 'Advanced'] as const).map(diff => (
                          <button
                            key={diff}
                            onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? null : diff)}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                              selectedDifficulty === diff
                                ? 'bg-primary text-background'
                                : 'bg-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mechanics Filter */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Movement Type</label>
                      <div className="flex gap-2">
                        {(['Compound', 'Isolation'] as const).map(mech => (
                          <button
                            key={mech}
                            onClick={() => setMechanicsFilter(mechanicsFilter === mech ? null : mech)}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                              mechanicsFilter === mech
                                ? 'bg-primary text-background'
                                : 'bg-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {mech}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={resetFilters}
                      className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Substitutes List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {filteredSubstitutes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No substitutes found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredSubstitutes.map((sub, index) => (
                <motion.div
                  key={sub.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 hover:border-primary/30 transition-all group cursor-pointer"
                  onClick={() => handleSelectSubstitute(sub.name)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base leading-tight truncate">{sub.name}</h3>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.matchScore >= 80 ? 'bg-green-500/20 text-green-400' :
                          sub.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {sub.matchScore}% match
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{sub.reason}</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="px-2 py-1 bg-white/5 rounded font-mono font-bold">{sub.equipment}</span>
                        <span className="px-2 py-1 bg-white/5 rounded font-mono font-bold">{sub.mechanics}</span>
                        <span className={`px-2 py-1 rounded font-mono font-bold ${
                          sub.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                          sub.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {sub.difficulty}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer Info */}
          {filteredSubstitutes.length > 0 && (
            <div className="p-4 border-t border-white/5 bg-white/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap size={14} className="text-primary" />
                <span>Click any exercise to substitute <span className="font-bold text-foreground">{exerciseName}</span></span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
