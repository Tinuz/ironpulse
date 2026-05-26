'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dumbbell, Calendar } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import type { TrainingBlockMuscle } from '@/components/context/DataContext'

interface CreateTrainingBlockModalProps {
  isOpen: boolean
  onClose: () => void
}

const MUSCLE_OPTIONS: { key: TrainingBlockMuscle; label: string; emoji: string }[] = [
  { key: 'chest',     label: 'Borst',      emoji: '💪' },
  { key: 'back',      label: 'Rug',        emoji: '🦾' },
  { key: 'shoulders', label: 'Schouders',  emoji: '🏋️' },
  { key: 'legs',      label: 'Benen',      emoji: '🦵' },
  { key: 'arms',      label: 'Armen',      emoji: '💪' },
  { key: 'abs',       label: 'Buik',       emoji: '🎯' },
  { key: 'glutes',    label: 'Billen',     emoji: '🍑' },
  { key: 'calves',    label: 'Kuiten',     emoji: '🦿' },
]

const DURATION_OPTIONS: { weeks: 4 | 5 | 6; label: string; description: string }[] = [
  { weeks: 4, label: '4 weken', description: '3 opbouw + 1 deload' },
  { weeks: 5, label: '5 weken', description: '4 opbouw + 1 deload' },
  { weeks: 6, label: '6 weken', description: '5 opbouw + 1 deload' },
]

export default function CreateTrainingBlockModal({ isOpen, onClose }: CreateTrainingBlockModalProps) {
  const { createBlock } = useData()

  // Default start date = Monday of the current week so block weeks always
  // align with calendar weeks (same as Volume Targets widget).
  const d = new Date();
  const daysFromMon = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - daysFromMon);
  const today = d.toISOString().split('T')[0];
  const [name, setName] = useState('')
  const [duration, setDuration] = useState<4 | 5 | 6>(5)
  const [focusMuscles, setFocusMuscles] = useState<TrainingBlockMuscle[]>([])
  const [startDate, setStartDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleMuscle = (muscle: TrainingBlockMuscle) => {
    setFocusMuscles(prev =>
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : prev.length < 2 ? [...prev, muscle] : prev
    )
  }

  const handleCreate = async () => {
    if (focusMuscles.length === 0) {
      setError('Selecteer minimaal 1 focusspiergroep')
      return
    }
    setSaving(true)
    setError('')
    await createBlock({
      name: name.trim() || 'Training Blok',
      startDate,
      durationWeeks: duration,
      focusMuscles,
    })
    setSaving(false)
    handleClose()
  }

  const handleClose = () => {
    setName('')
    setDuration(5)
    setFocusMuscles([])
    setStartDate(today)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center sm:items-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-card border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Dumbbell size={18} className="text-primary" />
                Nieuw Training Blok
              </h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Block Name */}
              <div>
                <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                  Naam (optioneel)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="bijv. Zomer Bulk, Kracht Fase..."
                  maxLength={40}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs uppercase font-bold text-muted-foreground mb-3 block">
                  Duur
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.weeks}
                      onClick={() => setDuration(opt.weeks)}
                      className={`flex flex-col items-center p-3 rounded-xl border text-sm transition-colors ${
                        duration === opt.weeks
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-white/10 text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[10px] mt-0.5 opacity-70">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Muscles */}
              <div>
                <label className="text-xs uppercase font-bold text-muted-foreground mb-1 block">
                  Focus spiergroepen
                </label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Kies maximaal 2 spiergroepen voor progressief volume
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {MUSCLE_OPTIONS.map(opt => {
                    const selected = focusMuscles.includes(opt.key)
                    const disabled = !selected && focusMuscles.length >= 2
                    return (
                      <button
                        key={opt.key}
                        onClick={() => !disabled && toggleMuscle(opt.key)}
                        disabled={disabled}
                        className={`flex flex-col items-center p-2.5 rounded-xl border text-xs transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : disabled
                              ? 'border-white/5 text-muted-foreground/30 cursor-not-allowed'
                              : 'border-white/10 text-muted-foreground hover:border-white/20'
                        }`}
                      >
                        <span className="text-lg mb-1">{opt.emoji}</span>
                        <span className="font-medium leading-tight text-center">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar size={12} />
                  Startdatum
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={saving || focusMuscles.length === 0}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {saving ? 'Aanmaken...' : 'Training blok starten'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
