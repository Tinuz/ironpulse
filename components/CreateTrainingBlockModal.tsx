'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dumbbell, Calendar, Sparkles } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import type { TrainingBlockMuscle, BlockPhase } from '@/components/context/DataContext'

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

// ── Preset mesocyclus templates ─────────────────────────────────────────────
// Based on: Israetel (RP Strength 2019) MEV→MAV volume progression +
// Zourdos et al. (2016) RIR autoregulation.

const CHEST_PHASES: BlockPhase[] = [
  {
    name: 'Instapfase', emoji: '🌱', cycleStart: 1, cycleEnd: 2,
    targetRIR: '2', isDeload: false,
    failurePermittedExercises: [],
    coachNote: 'Techniek en instellingen vastleggen. Borst is de limiterende spier, niet schouder of triceps.',
  },
  {
    name: 'Opbouwfase', emoji: '📈', cycleStart: 3, cycleEnd: 4,
    targetRIR: '1-2', isDeload: false,
    failurePermittedExercises: ['machine chest press', 'chest machine press', 'pec fly', 'low-incline machine press'],
    coachNote: 'Laatste set van machine chest press en pec fly mag naar 0-1 RIR.',
  },
  {
    name: 'Piekfase', emoji: '🔥', cycleStart: 5, cycleEnd: 6,
    targetRIR: '0-1', isDeload: false,
    failurePermittedExercises: ['machine chest press', 'chest machine press', 'pec fly', 'pec fly-machine', 'machine fly', 'low-incline machine press'],
    coachNote: 'Machines: technisch spierfalen OK. Incline Dumbbell Press: stop zodra een nette rep niet meer haalbaar is.',
  },
  {
    name: 'Deload', emoji: '😴', cycleStart: 7, cycleEnd: 7,
    targetRIR: '3-4', isDeload: true,
    failurePermittedExercises: [],
    coachNote: 'Één werkset per oefening, 80–90% gewicht. Nergens tot falen. Herstel en consolideer.',
  },
]

const BACK_PHASES: BlockPhase[] = [
  {
    name: 'Instapfase', emoji: '🌱', cycleStart: 1, cycleEnd: 2,
    targetRIR: '2', isDeload: false,
    failurePermittedExercises: [],
    coachNote: 'Techniek vastleggen. Rug is de limiterende spier — geen biceps uitputting.',
  },
  {
    name: 'Opbouwfase', emoji: '📈', cycleStart: 3, cycleEnd: 4,
    targetRIR: '1-2', isDeload: false,
    failurePermittedExercises: ['lat pulldown', 'cable row', 'machine row', 'seated row'],
    coachNote: 'Laatste set cable-oefeningen mag naar 0-1 RIR.',
  },
  {
    name: 'Piekfase', emoji: '🔥', cycleStart: 5, cycleEnd: 6,
    targetRIR: '0-1', isDeload: false,
    failurePermittedExercises: ['lat pulldown', 'cable row', 'machine row', 'seated row', 'pulldown'],
    coachNote: 'Kabel- en machineoefeningen: technisch spierfalen OK. Vrije gewichten: stop bij technisch falen.',
  },
  {
    name: 'Deload', emoji: '😴', cycleStart: 7, cycleEnd: 7,
    targetRIR: '3-4', isDeload: true,
    failurePermittedExercises: [],
    coachNote: 'Één werkset, 80–90% gewicht, nergens tot falen.',
  },
]

interface PresetTemplate {
  id: string
  label: string
  emoji: string
  description: string
  durationWeeks: 4 | 5 | 6
  totalCycles: number
  focusMuscles: TrainingBlockMuscle[]
  phases: BlockPhase[]
  defaultName: string
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'chest-meso',
    label: 'Borst Mesocyclus',
    emoji: '💪',
    description: '7 cycli · 4 fasen · 10→12→14→5 sets',
    durationWeeks: 6,
    totalCycles: 7,
    focusMuscles: ['chest'],
    phases: CHEST_PHASES,
    defaultName: 'Borst Mesocyclus',
  },
  {
    id: 'back-meso',
    label: 'Rug Mesocyclus',
    emoji: '🦾',
    description: '7 cycli · 4 fasen · progressief rugvolume',
    durationWeeks: 6,
    totalCycles: 7,
    focusMuscles: ['back'],
    phases: BACK_PHASES,
    defaultName: 'Rug Mesocyclus',
  },
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
  const [selectedTemplate, setSelectedTemplate] = useState<PresetTemplate | null>(null)

  const toggleMuscle = (muscle: TrainingBlockMuscle) => {
    if (selectedTemplate) return // muscles locked when template active
    setFocusMuscles(prev =>
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : prev.length < 2 ? [...prev, muscle] : prev
    )
  }

  const applyTemplate = (template: PresetTemplate) => {
    if (selectedTemplate?.id === template.id) {
      // Deselect: restore manual defaults
      setSelectedTemplate(null)
      setFocusMuscles([])
      setDuration(5)
      setName('')
    } else {
      setSelectedTemplate(template)
      setDuration(template.durationWeeks)
      setFocusMuscles(template.focusMuscles)
      setName(prev => prev || template.defaultName)
    }
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
      ...(selectedTemplate ? {
        totalCycles: selectedTemplate.totalCycles,
        phases: selectedTemplate.phases,
      } : {}),
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
    setSelectedTemplate(null)
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

              {/* Preset Templates */}
              <div>
                <label className="text-xs uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Template (optioneel)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
                          : 'border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20'
                      }`}
                    >
                      <div className="text-lg mb-1">{template.emoji}</div>
                      <p className="text-xs font-bold leading-tight">{template.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{template.description}</p>
                    </button>
                  ))}
                </div>
                {selectedTemplate && (
                  <div className="mt-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-[11px] text-primary/80">
                      ✅ Template actief: {selectedTemplate.totalCycles} cycli, {selectedTemplate.phases.length} fasen
                      {' '}— <button type="button" className="underline" onClick={() => applyTemplate(selectedTemplate)}>verwijder</button>
                    </p>
                  </div>
                )}
              </div>

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
