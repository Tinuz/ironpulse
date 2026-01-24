'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw, Trash2, Clock } from 'lucide-react'
import { WorkoutLog } from '@/components/context/DataContext'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface WorkoutRecoveryModalProps {
  workout: WorkoutLog
  onRecover: () => void
  onDiscard: () => void
}

export default function WorkoutRecoveryModal({ 
  workout, 
  onRecover, 
  onDiscard 
}: WorkoutRecoveryModalProps) {
  const completedSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length, 
    0
  )
  const totalSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.length, 
    0
  )

  // Calculate time since last activity
  const timeSinceStart = formatDistanceToNow(
    new Date(workout.startTime), 
    { addSuffix: true, locale: nl }
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/30 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 border-b border-yellow-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="text-yellow-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Onvoltooide Workout
                </h2>
                <p className="text-sm text-yellow-500/80">
                  Herstel je vorige sessie
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Workout Info */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Workout
                </p>
                <p className="text-lg font-bold text-white">
                  {workout.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Voortgang
                  </p>
                  <p className="text-2xl font-bold text-blue-400">
                    {completedSets}/{totalSets}
                  </p>
                  <p className="text-xs text-gray-500">sets voltooid</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Gestart
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-300">
                    <Clock size={14} className="text-gray-500" />
                    <span>{timeSinceStart}</span>
                  </div>
                </div>
              </div>

              {/* Exercise List */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Oefeningen ({workout.exercises.length})
                </p>
                <div className="space-y-1">
                  {workout.exercises.slice(0, 3).map((ex, idx) => {
                    const exCompletedSets = ex.sets.filter(s => s.completed).length
                    const exTotalSets = ex.sets.length
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-300 truncate flex-1">
                          {ex.name}
                        </span>
                        <span className={`ml-2 ${
                          exCompletedSets === exTotalSets 
                            ? 'text-green-500' 
                            : exCompletedSets > 0 
                            ? 'text-yellow-500' 
                            : 'text-gray-500'
                        }`}>
                          {exCompletedSets}/{exTotalSets}
                        </span>
                      </div>
                    )
                  })}
                  {workout.exercises.length > 3 && (
                    <p className="text-xs text-gray-500 italic">
                      +{workout.exercises.length - 3} meer...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-500/90">
                <strong>Let op:</strong> Deze workout werd niet correct afgesloten. 
                Je kunt doorgaan waar je gebleven was of de sessie verwijderen.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={onDiscard}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors"
            >
              <Trash2 size={18} />
              Verwijder
            </button>
            <button
              onClick={onRecover}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-yellow-500/25"
            >
              <RefreshCw size={18} />
              Herstel Workout
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
