'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle, ChevronRight, Plus } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { analyzeForAccessories, getAnalysisSummary } from '@/components/utils/accessoryAnalysis'
import { getAccessorySuggestions, buildAccessoryPrompt, AccessorySuggestion } from '@/lib/openrouter'

export default function AccessorySuggestionsWidget() {
  const { history } = useData();
  const [suggestions, setSuggestions] = useState<AccessorySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Analyze workout history
      const analysis = analyzeForAccessories(history);

      // Build prompt
      const prompt = buildAccessoryPrompt(analysis);

      // Get AI suggestions
      const aiSuggestions = await getAccessorySuggestions(prompt);

      if (aiSuggestions.length === 0) {
        setError('No suggestions available. AI service may be unavailable.');
      } else {
        setSuggestions(aiSuggestions);
        setHasGenerated(true);
      }
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: AccessorySuggestion['category']): string => {
    switch (category) {
      case 'strength': return 'text-orange-400 bg-orange-500/10';
      case 'hypertrophy': return 'text-purple-400 bg-purple-500/10';
      case 'mobility': return 'text-blue-400 bg-blue-500/10';
      case 'injury-prevention': return 'text-green-400 bg-green-500/10';
    }
  };

  const getPriorityIcon = (priority: AccessorySuggestion['priority']): string => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  };

  // Don't show widget if user has very few workouts
  if (history.length < 5) {
    return null;
  }

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-lg leading-tight">AI Accessory Suggestions</h3>
            <p className="text-xs text-muted-foreground">Optimize your training with intelligent recommendations</p>
          </div>
        </div>
      </div>

      {/* Analysis Summary (before generation) */}
      {!hasGenerated && !isLoading && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/5">
          <p className="text-sm text-muted-foreground">
            {getAnalysisSummary(analyzeForAccessories(history))}
          </p>
        </div>
      )}

      {/* Generate Button */}
      {!hasGenerated && !isLoading && (
        <button
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles size={18} />
          Generate AI Suggestions
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 size={32} className="text-purple-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing your training data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-bold">Error</p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <AnimatePresence mode="popLayout">
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Regenerate Button */}
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {suggestions.length} Suggestions
              </p>
              <button
                onClick={handleGenerateSuggestions}
                disabled={isLoading}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Sparkles size={12} />
                Regenerate
              </button>
            </div>

            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors group"
              >
                {/* Exercise Name + Priority */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getPriorityIcon(suggestion.priority)}</span>
                      <h4 className="font-bold text-base leading-tight">{suggestion.exercise}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.reason}</p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {/* Category Badge */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${getCategoryColor(suggestion.category)}`}>
                    {suggestion.category.replace('-', ' ')}
                  </span>

                  {/* Target Muscles */}
                  {suggestion.targetMuscles.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {suggestion.targetMuscles.slice(0, 2).join(', ')}
                      {suggestion.targetMuscles.length > 2 && ` +${suggestion.targetMuscles.length - 2}`}
                    </span>
                  )}

                  {/* Sets x Reps */}
                  {suggestion.sets && suggestion.reps && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {suggestion.sets}×{suggestion.reps}
                    </span>
                  )}
                </div>

                {/* Add to Routine Button */}
                <button
                  onClick={() => {
                    // Navigate to SchemaBuilder with this exercise pre-selected
                    const params = new URLSearchParams({
                      selectedExercise: suggestion.exercise,
                      sets: suggestion.sets?.toString() || '3',
                      reps: suggestion.reps?.toString() || '10',
                      source: 'ai'
                    });
                    window.location.href = `/schema?${params.toString()}`;
                  }}
                  className="w-full mt-3 py-2 px-3 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 rounded-lg text-xs font-bold text-muted-foreground hover:text-purple-400 transition-all flex items-center justify-center gap-2 group-hover:bg-purple-500/10"
                >
                  <Plus size={14} />
                  Add to Routine
                  <ChevronRight size={14} className="opacity-50" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Footer */}
      {hasGenerated && suggestions.length > 0 && (
        <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            💡 <span className="font-bold">AI Tip:</span> These suggestions are based on your recent training patterns, muscle imbalances, and plateaus. 
            Add 1-2 accessories per week for best results.
          </p>
        </div>
      )}
    </div>
  );
}
