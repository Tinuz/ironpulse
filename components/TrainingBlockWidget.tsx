'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CheckCircle, Flame, TrendingDown, Trophy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { getBlockProgress, getBlockWeekLabel, isDeloadWeek } from '@/lib/blockAnalytics'
import { MUSCLE_GROUPS } from '@/components/utils/volumeAnalytics'
import type { TrainingBlockMuscle } from '@/components/context/DataContext'
import CreateTrainingBlockModal from '@/components/CreateTrainingBlockModal'

const MUSCLE_LABEL: Record<TrainingBlockMuscle, string> = MUSCLE_GROUPS

export default function TrainingBlockWidget() {
  const { history, activeBlock, completeBlock, deleteBlock } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Empty state
  if (!activeBlock) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-violet-400" />
              <h3 className="font-bold text-sm">Training Blok</h3>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Geen actief blok. Start een GAS-periodisatie blok om progressief volume bij te houden.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 w-full justify-center bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl px-4 py-2.5 text-sm font-semibold text-violet-300 transition-colors"
          >
            <Plus size={15} />
            Start een training blok
          </button>
        </motion.div>

        <CreateTrainingBlockModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  const progress = getBlockProgress(activeBlock, history)
  const weekLabel = getBlockWeekLabel(activeBlock)
  const deload = isDeloadWeek(activeBlock)

  const blockProgressPct = Math.round(((activeBlock.durationWeeks - progress.weeksRemaining) / activeBlock.durationWeeks) * 100)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-violet-400" />
              <h3 className="font-bold text-sm">{activeBlock.name}</h3>
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Week label */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold ${deload ? 'text-blue-400' : 'text-violet-400'}`}>
              {weekLabel}
            </span>
            {!deload && progress.weeksRemaining > 0 && (
              <span className="text-[10px] text-muted-foreground">
                Deload over {progress.weeksRemaining} {progress.weeksRemaining === 1 ? 'week' : 'weken'}
              </span>
            )}
          </div>

          {/* Block progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${blockProgressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Blok voortgang — {blockProgressPct}%
          </p>
        </div>

        {/* Deload banner */}
        {deload && (
          <div className="mx-5 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-blue-400 shrink-0" />
            <p className="text-xs text-blue-300 font-medium">
              Deload week — verlaag volume met 50% voor herstel
            </p>
          </div>
        )}

        {/* Muscle progress (collapsible) */}
        {expanded && (
          <div className="px-5 pb-4 space-y-3">
            {progress.muscles.map(m => {
              const label = MUSCLE_LABEL[m.muscle]
              const pctNum = m.targetSets > 0 ? Math.min(1, m.actualSets / m.targetSets) : 0
              const barColor =
                pctNum >= 1 ? 'bg-green-500' :
                pctNum >= 0.5 ? 'bg-yellow-500' :
                'bg-red-500'

              return (
                <div key={m.muscle}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{label}</span>
                    <span className={`text-xs font-bold ${pctNum >= 1 ? 'text-green-400' : pctNum >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {m.actualSets} / {m.targetSets} sets
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${pctNum * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          {!confirmComplete ? (
            <button
              onClick={() => setConfirmComplete(true)}
              className="flex items-center gap-1.5 flex-1 justify-center bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 rounded-xl py-2.5 text-xs font-semibold text-green-400 transition-colors"
            >
              <Trophy size={13} />
              Blok voltooien
            </button>
          ) : (
            <div className="flex gap-2 flex-1">
              <button
                onClick={async () => { await completeBlock(activeBlock.id); setConfirmComplete(false) }}
                className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl py-2.5 text-xs font-bold text-green-400"
              >
                Bevestigen
              </button>
              <button
                onClick={() => setConfirmComplete(false)}
                className="flex-1 bg-white/5 rounded-xl py-2.5 text-xs text-muted-foreground"
              >
                Annuleren
              </button>
            </div>
          )}

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className="flex gap-1 items-center">
              <button
                onClick={async () => { await deleteBlock(activeBlock.id); setConfirmDelete(false) }}
                className="px-3 py-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-bold text-red-400"
              >
                Verwijderen
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2.5 bg-white/5 rounded-xl text-xs text-muted-foreground"
              >
                Nee
              </button>
            </div>
          )}
        </div>

        {/* Completed indicator for deload end */}
        {deload && progress.weeksRemaining === 0 && !confirmComplete && (
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle size={13} />
              Blok is klaar — voltooi het om een nieuw blok te starten
            </div>
          </div>
        )}
      </motion.div>

      <CreateTrainingBlockModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
