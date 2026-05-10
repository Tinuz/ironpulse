'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Edit2, Pill, Clock, Tag, MessageSquare,
  Settings2, Check, ChevronDown, ChevronUp, Zap
} from 'lucide-react'
import { useData, Supplement } from '@/components/context/DataContext'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'

const SupplementStackManager = dynamic(() => import('@/components/SupplementStackManager'), { ssr: false })

interface SupplementsSectionProps {
  selectedDate: Date
  onOpenCoach: () => void
}

const DOSAGE_UNITS: Array<Supplement['dosageUnit']> = ['g', 'mg', 'pills', 'capsules', 'scoops', 'ml', 'tablets']
const TIMING_OPTIONS: Array<NonNullable<Supplement['timing']>> = ['morning', 'pre-workout', 'post-workout', 'evening', 'with-meal', 'before-bed']

const TIMING_LABELS: Record<NonNullable<Supplement['timing']>, string> = {
  'morning': 'Ochtend',
  'pre-workout': 'Pre-workout',
  'post-workout': 'Post-workout',
  'evening': 'Avond',
  'with-meal': 'Bij maaltijd',
  'before-bed': 'Voor het slapen',
}

const TIMING_ORDER: NonNullable<Supplement['timing']>[] = [
  'morning', 'pre-workout', 'post-workout', 'with-meal', 'evening', 'before-bed'
]

export default function SupplementsSection({ selectedDate, onOpenCoach }: SupplementsSectionProps) {
  const {
    supplements, addSupplement, updateSupplement, deleteSupplement,
    supplementStacks, logStackToday
  } = useData()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showExtras, setShowExtras] = useState(false)
  const [showStackManager, setShowStackManager] = useState(false)
  const [loggingStack, setLoggingStack] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    dosageAmount: '',
    dosageUnit: 'g' as Supplement['dosageUnit'],
    brand: '',
    timing: undefined as Supplement['timing'] | undefined,
    notes: ''
  })

  const currentDateStr = format(selectedDate, 'yyyy-MM-dd')
  const todaysSupplements = supplements.filter(s => s.date === currentDateStr)
  const activeStacks = supplementStacks.filter(s => s.isActive)

  // Which active stack items are already logged today?
  const loggedNames = new Set(todaysSupplements.map(s => s.name.toLowerCase()))
  const allStacksLogged = activeStacks.every(s => loggedNames.has(s.name.toLowerCase()))
  const unloggedCount = activeStacks.filter(s => !loggedNames.has(s.name.toLowerCase())).length

  // Group today's supplements by timing for the daily log view
  const supplementsByTiming: Record<string, Supplement[]> = {}
  const noTimingGroup: Supplement[] = []
  for (const s of todaysSupplements) {
    if (s.timing) {
      supplementsByTiming[s.timing] = supplementsByTiming[s.timing] ?? []
      supplementsByTiming[s.timing].push(s)
    } else {
      noTimingGroup.push(s)
    }
  }
  const orderedTimingKeys = TIMING_ORDER.filter(t => supplementsByTiming[t]?.length > 0)

  const handleLogAllStack = async () => {
    setLoggingStack(true)
    await logStackToday(currentDateStr)
    setLoggingStack(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.dosageAmount) return

    if (editingId) {
      await updateSupplement(editingId, {
        name: formData.name,
        dosageAmount: parseFloat(formData.dosageAmount),
        dosageUnit: formData.dosageUnit,
        brand: formData.brand || undefined,
        timing: formData.timing,
        notes: formData.notes || undefined
      })
      setEditingId(null)
    } else {
      await addSupplement({
        date: currentDateStr,
        name: formData.name,
        dosageAmount: parseFloat(formData.dosageAmount),
        dosageUnit: formData.dosageUnit,
        brand: formData.brand || undefined,
        timing: formData.timing,
        notes: formData.notes || undefined
      })
    }

    resetForm()
  }

  const handleEdit = (supplement: Supplement) => {
    setFormData({
      name: supplement.name,
      dosageAmount: supplement.dosageAmount.toString(),
      dosageUnit: supplement.dosageUnit,
      brand: supplement.brand || '',
      timing: supplement.timing,
      notes: supplement.notes || ''
    })
    setEditingId(supplement.id)
    setIsAdding(true)
    setShowExtras(true)
  }

  const handleDelete = async (id: string) => {
    await deleteSupplement(id)
  }

  const resetForm = () => {
    setFormData({ name: '', dosageAmount: '', dosageUnit: 'g', brand: '', timing: undefined, notes: '' })
    setIsAdding(false)
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="text-primary" size={24} />
          <h2 className="text-xl font-bold">Supplementen</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStackManager(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
          >
            <Settings2 size={16} />
            <span className="hidden sm:inline">Mijn Stack</span>
          </button>
          <button
            onClick={onOpenCoach}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-medium text-sm"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">AI Coach</span>
          </button>
        </div>
      </div>

      {/* Stack quick-log panel */}
      {activeStacks.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Stack — vandaag loggen</p>
            {!allStacksLogged && (
              <button
                onClick={handleLogAllStack}
                disabled={loggingStack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Zap size={13} />
                {loggingStack ? 'Bezig...' : `Log alles (${unloggedCount})`}
              </button>
            )}
            {allStacksLogged && (
              <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                <Check size={13} />
                Alles gelogd
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {activeStacks.map(stack => {
              const isLogged = loggedNames.has(stack.name.toLowerCase())
              return (
                <div key={stack.id} className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${isLogged ? 'bg-green-500/10' : 'bg-white/3'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isLogged ? 'bg-green-500 border-green-500' : 'border-white/20'}`}>
                      {isLogged && <Check size={10} className="text-white" />}
                    </div>
                    <span className={`text-sm ${isLogged ? 'text-muted-foreground line-through' : ''}`}>{stack.name}</span>
                    <span className="text-xs text-primary font-bold">{stack.dosageAmount}{stack.dosageUnit}</span>
                    {stack.timing && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">{TIMING_LABELS[stack.timing]}</span>
                    )}
                  </div>
                  {!isLogged && (
                    <button
                      onClick={() => addSupplement({
                        date: currentDateStr,
                        name: stack.name,
                        dosageAmount: stack.dosageAmount,
                        dosageUnit: stack.dosageUnit,
                        brand: stack.brand,
                        timing: stack.timing,
                        notes: stack.notes,
                      })}
                      className="text-xs text-primary hover:underline"
                    >
                      Log
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeStacks.length === 0 && (
        <button
          onClick={() => setShowStackManager(true)}
          className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
        >
          <Settings2 size={16} />
          Stel je supplement stack in voor snel loggen
        </button>
      )}

      {/* Today's logged supplements */}
      {todaysSupplements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vandaag gelogd</p>

          {/* Grouped by timing */}
          {orderedTimingKeys.map(timing => (
            <div key={timing} className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Clock size={11} />
                {TIMING_LABELS[timing]}
              </p>
              {supplementsByTiming[timing].map(supplement => (
                <SupplementCard
                  key={supplement.id}
                  supplement={supplement}
                  onEdit={() => handleEdit(supplement)}
                  onDelete={() => handleDelete(supplement.id)}
                />
              ))}
            </div>
          ))}

          {/* No timing */}
          {noTimingGroup.length > 0 && (
            <div className="space-y-1.5">
              {orderedTimingKeys.length > 0 && (
                <p className="text-xs text-muted-foreground font-medium">Overig</p>
              )}
              {noTimingGroup.map(supplement => (
                <SupplementCard
                  key={supplement.id}
                  supplement={supplement}
                  onEdit={() => handleEdit(supplement)}
                  onDelete={() => handleDelete(supplement.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extra / one-off add form (collapsible) */}
      <div>
        <button
          onClick={() => setShowExtras(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Eenmalig supplement toevoegen
        </button>

        <AnimatePresence>
          {showExtras && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                <AnimatePresence>
                  {isAdding && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleSubmit} className="bg-muted/50 rounded-xl p-4 space-y-3">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Supplement naam (bijv. Creatine)"
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            required
                          />
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input
                              type="number" step="0.01"
                              value={formData.dosageAmount}
                              onChange={(e) => setFormData({ ...formData, dosageAmount: e.target.value })}
                              placeholder="Hoeveelheid"
                              className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 text-sm"
                              required
                            />
                            <select
                              value={formData.dosageUnit}
                              onChange={(e) => setFormData({ ...formData, dosageUnit: e.target.value as Supplement['dosageUnit'] })}
                              className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            >
                              {DOSAGE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            placeholder="Merk (optioneel)"
                            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                          />
                          <select
                            value={formData.timing || ''}
                            onChange={(e) => setFormData({ ...formData, timing: e.target.value ? e.target.value as Supplement['timing'] : undefined })}
                            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                          >
                            <option value="">Tijdstip</option>
                            {TIMING_OPTIONS.map(timing => <option key={timing} value={timing}>{TIMING_LABELS[timing]}</option>)}
                          </select>
                        </div>

                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Notities (optioneel)"
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                          rows={2}
                        />

                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm">
                            {editingId ? 'Bijwerken' : 'Toevoegen'}
                          </button>
                          <button type="button" onClick={resetForm} className="px-4 py-2 bg-muted hover:bg-muted/70 rounded-xl font-medium transition-colors text-sm">
                            Annuleer
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isAdding && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-sm"
                  >
                    <Plus size={18} />
                    <span>Supplement toevoegen</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stack Manager modal */}
      <AnimatePresence>
        {showStackManager && (
          <SupplementStackManager onClose={() => setShowStackManager(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Supplement card (today's log)
// ---------------------------------------------------------------------------

interface SupplementCardProps {
  supplement: Supplement
  onEdit: () => void
  onDelete: () => void
}

function SupplementCard({ supplement, onEdit, onDelete }: SupplementCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-muted/50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm truncate">{supplement.name}</span>
        <span className="text-xs text-primary font-bold shrink-0">{supplement.dosageAmount}{supplement.dosageUnit}</span>
        {supplement.brand && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
            <Tag size={11} />
            {supplement.brand}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 hover:bg-background rounded-lg transition-colors">
          <Edit2 size={14} className="text-muted-foreground hover:text-foreground" />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-background rounded-lg transition-colors">
          <Trash2 size={14} className="text-muted-foreground hover:text-red-500" />
        </button>
      </div>
    </motion.div>
  )
}
