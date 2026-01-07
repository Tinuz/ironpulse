'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Search, Filter, X, ChevronDown, Play, Dumbbell, ArrowLeft, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  filterExercises,
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EXPERIENCE_LEVELS,
  MECHANICS_TYPES,
} from '@/lib/exerciseData'
import { LibraryExercise, ExerciseFilters } from '@/types/exerciseLibrary'
import { useLanguage } from '@/components/context/LanguageContext'

const ITEMS_PER_PAGE = 48 // Show 48 items at a time (4 columns x 12 rows)

export default function ExerciseLibrary() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isSelectMode = searchParams.get('mode') === 'select'
  const returnPath = searchParams.get('return') || '/schema'
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<LibraryExercise | null>(null)
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  
  const [filters, setFilters] = useState<ExerciseFilters>({
    search: '',
    muscleGroup: null,
    equipment: null,
    experienceLevel: null,
    mechanics: null,
  })

  // Apply search and filters
  const filteredExercises = useMemo(() => {
    return filterExercises({
      ...filters,
      search: searchQuery,
    })
  }, [searchQuery, filters])

  // Only show subset of exercises for performance
  const displayedExercises = useMemo(() => {
    return filteredExercises.slice(0, displayCount)
  }, [filteredExercises, displayCount])

  const hasMore = displayCount < filteredExercises.length

  const loadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredExercises.length))
  }, [filteredExercises.length])

  const handleSelectExercise = useCallback((exerciseName: string) => {
    // Navigate back with selected exercise in URL params
    router.push(`${returnPath}?selectedExercise=${encodeURIComponent(exerciseName)}`)
  }, [router, returnPath])

  const handleFilterChange = (key: keyof Omit<ExerciseFilters, 'search'>, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setDisplayCount(ITEMS_PER_PAGE) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      muscleGroup: null,
      equipment: null,
      experienceLevel: null,
      mechanics: null,
    })
    setSearchQuery('')
    setDisplayCount(ITEMS_PER_PAGE)
  }

  const hasActiveFilters = filters.muscleGroup || filters.equipment || filters.experienceLevel || filters.mechanics

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {isSelectMode && (
              <button
                onClick={() => router.push(returnPath)}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Dumbbell className="text-primary" size={28} />
              {isSelectMode 
                ? (language === 'nl' ? 'Selecteer Oefening' : 'Select Exercise')
                : (language === 'nl' ? 'Oefeningen Bibliotheek' : 'Exercise Library')
              }
            </h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Filter size={18} />
              <span className="hidden sm:inline">
                {language === 'nl' ? 'Filters' : 'Filters'}
              </span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'nl' ? 'Zoek oefeningen...' : 'Search exercises...'}
              className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-visible"
              >
                <div className="pt-4 space-y-3 pb-2">
                  {/* Muscle Group Filter */}
                  <FilterDropdown
                    label={language === 'nl' ? 'Spiergroep' : 'Muscle Group'}
                    options={MUSCLE_GROUPS}
                    value={filters.muscleGroup}
                    onChange={(val) => handleFilterChange('muscleGroup', val)}
                  />

                  {/* Equipment Filter */}
                  <FilterDropdown
                    label={language === 'nl' ? 'Apparatuur' : 'Equipment'}
                    options={EQUIPMENT_TYPES}
                    value={filters.equipment}
                    onChange={(val) => handleFilterChange('equipment', val)}
                  />

                  {/* Experience Level Filter */}
                  <FilterDropdown
                    label={language === 'nl' ? 'Niveau' : 'Level'}
                    options={EXPERIENCE_LEVELS}
                    value={filters.experienceLevel}
                    onChange={(val) => handleFilterChange('experienceLevel', val)}
                  />

                  {/* Mechanics Filter */}
                  <FilterDropdown
                    label={language === 'nl' ? 'Type' : 'Type'}
                    options={MECHANICS_TYPES}
                    value={filters.mechanics}
                    onChange={(val) => handleFilterChange('mechanics', val)}
                  />

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full py-2 text-sm text-destructive hover:underline"
                    >
                      {language === 'nl' ? 'Wis alle filters' : 'Clear all filters'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <p className="text-sm text-muted-foreground">
          {language === 'nl' 
            ? `${displayedExercises.length} van ${filteredExercises.length} oefeningen getoond`
            : `Showing ${displayedExercises.length} of ${filteredExercises.length} exercises`
          }
        </p>
      </div>

      {/* Exercise Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {language === 'nl' ? 'Geen oefeningen gevonden' : 'No exercises found'}
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-primary hover:underline"
            >
              {language === 'nl' ? 'Reset filters' : 'Reset filters'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {displayedExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.name}
                  exercise={exercise}
                  onClick={() => setSelectedExercise(exercise)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center py-8">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
                >
                  <span>
                    {language === 'nl' 
                      ? `Meer laden (nog ${filteredExercises.length - displayCount})`
                      : `Load More (${filteredExercises.length - displayCount} remaining)`
                    }
                  </span>
                </button>
              </div>
            )}

            <div className="pb-8" />
          </>
        )}
      </div>

      {/* Exercise Detail Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <ExerciseDetailModal
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
            onSelect={isSelectMode ? handleSelectExercise : undefined}
            isSelectMode={isSelectMode}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Filter Dropdown Component
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <span className="text-sm">
          {value || label}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-[70] max-h-64 overflow-y-auto"
            >
              <button
                onClick={() => {
                  onChange(null)
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b border-border"
              >
                All {label}
              </button>
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors capitalize ${
                    value === option ? 'bg-primary/10 text-primary font-medium' : ''
                  }`}
                >
                  {option}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Exercise Card Component
const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: LibraryExercise
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all text-left"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {exercise.image ? (
          <Image
            src={exercise.image}
            alt={exercise.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play size={32} />
          </div>
        )}
        
        {/* Video Badge */}
        {exercise.video && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
            <Play size={12} className="text-white" />
          </div>
        )}

        {/* Experience Level Badge */}
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
          <span className="text-[10px] text-white font-medium">
            {exercise.profile.experienceLevel}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {exercise.name.replace(' Video Exercise Guide', '')}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full capitalize">
            {exercise.group}
          </span>
          {exercise.profile.equipmentRequired && (
            <span className="text-xs text-muted-foreground capitalize">
              {exercise.profile.equipmentRequired}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
})

// Exercise Detail Modal Component
function ExerciseDetailModal({
  exercise,
  onClose,
  onSelect,
  isSelectMode,
}: {
  exercise: LibraryExercise
  onClose: () => void
  onSelect?: (name: string) => void
  isSelectMode?: boolean
}) {
  const { language } = useLanguage()

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-x-4 top-4 bottom-20 sm:top-[5vh] sm:bottom-[5vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-3xl bg-background rounded-2xl shadow-2xl z-[90] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold pr-8">
            {exercise.name.replace(' Video Exercise Guide', '')}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Video */}
          {exercise.video && (
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={exercise.video}
                className="w-full h-full"
                allowFullScreen
                title={exercise.name}
              />
            </div>
          )}

          {/* Hero Image */}
          {!exercise.video && exercise.media.heroImage && (
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <Image
                src={exercise.media.heroImage}
                alt={exercise.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium capitalize">
              {exercise.group}
            </span>
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm">
              {exercise.profile.equipmentRequired}
            </span>
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm">
              {exercise.profile.experienceLevel}
            </span>
            <span className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm capitalize">
              {exercise.profile.mechanics}
            </span>
          </div>

          {/* Overview */}
          {exercise.overview && (
            <div>
              <h3 className="font-semibold mb-2">
                {language === 'nl' ? 'Overzicht' : 'Overview'}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {exercise.overview}
              </p>
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">
                {language === 'nl' ? 'Instructies' : 'Instructions'}
              </h3>
              <ol className="space-y-2">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tips */}
          {exercise.tips && exercise.tips.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">
                {language === 'nl' ? 'Tips' : 'Tips'}
              </h3>
              <ul className="space-y-2">
                {exercise.tips.map((tip, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Add to Workout Button (Select Mode Only) */}
        {isSelectMode && onSelect && (
          <div className="sticky bottom-0 p-4 bg-background border-t border-border shrink-0">
            <button
              onClick={() => {
                onSelect(exercise.name.replace(' Video Exercise Guide', ''))
                onClose()
              }}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              {language === 'nl' ? 'Toevoegen aan Workout' : 'Add to Workout'}
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
