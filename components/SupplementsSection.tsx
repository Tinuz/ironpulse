'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Pill, Clock, Tag, MessageSquare } from 'lucide-react'
import { useData, Supplement } from '@/components/context/DataContext'
import { format } from 'date-fns'

interface SupplementsSectionProps {
  selectedDate: Date
  onOpenCoach: () => void
}

const DOSAGE_UNITS: Array<Supplement['dosageUnit']> = ['g', 'mg', 'pills', 'capsules', 'scoops', 'ml', 'tablets']
const TIMING_OPTIONS: Array<NonNullable<Supplement['timing']>> = ['morning', 'pre-workout', 'post-workout', 'evening', 'with-meal', 'before-bed']

const TIMING_LABELS: Record<NonNullable<Supplement['timing']>, string> = {
  'morning': 'Morning',
  'pre-workout': 'Pre-Workout',
  'post-workout': 'Post-Workout',
  'evening': 'Evening',
  'with-meal': 'With Meal',
  'before-bed': 'Before Bed'
}

export default function SupplementsSection({ selectedDate, onOpenCoach }: SupplementsSectionProps) {
  const { supplements, addSupplement, updateSupplement, deleteSupplement } = useData()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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
  }

  const handleDelete = async (id: string) => {
    await deleteSupplement(id)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      dosageAmount: '',
      dosageUnit: 'g',
      brand: '',
      timing: undefined,
      notes: ''
    })
    setIsAdding(false)
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header with AI Coach Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="text-primary" size={24} />
          <h2 className="text-xl font-bold">Supplements</h2>
        </div>
        <button
          onClick={onOpenCoach}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-medium"
        >
          <MessageSquare size={18} />
          <span className="hidden sm:inline">AI Coach</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-muted/50 rounded-xl p-4 space-y-3">
              {/* Name and Dosage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Supplement name (e.g., Creatine)"
                  className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dosageAmount}
                    onChange={(e) => setFormData({ ...formData, dosageAmount: e.target.value })}
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                  <select
                    value={formData.dosageUnit}
                    onChange={(e) => setFormData({ ...formData, dosageUnit: e.target.value as Supplement['dosageUnit'] })}
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {DOSAGE_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Brand and Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Brand (optional)"
                  className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <select
                  value={formData.timing || ''}
                  onChange={(e) => setFormData({ ...formData, timing: e.target.value ? e.target.value as Supplement['timing'] : undefined })}
                  className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Timing (optional)</option>
                  {TIMING_OPTIONS.map(timing => (
                    <option key={timing} value={timing}>{TIMING_LABELS[timing]}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={2}
              />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingId ? 'Update' : 'Add'} Supplement
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-muted hover:bg-muted/70 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Plus size={20} />
          <span className="font-medium">Add Supplement</span>
        </button>
      )}

      {/* Supplements List */}
      {todaysSupplements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Pill size={48} className="mx-auto mb-2 opacity-20" />
          <p>No supplements logged today</p>
          <p className="text-sm mt-1">Track your protein, creatine, vitamins, and more</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todaysSupplements.map((supplement) => (
            <motion.div
              key={supplement.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-muted/50 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate">{supplement.name}</h3>
                    <span className="text-sm text-primary font-bold shrink-0">
                      {supplement.dosageAmount}{supplement.dosageUnit}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {supplement.brand && (
                      <div className="flex items-center gap-1">
                        <Tag size={14} />
                        <span>{supplement.brand}</span>
                      </div>
                    )}
                    {supplement.timing && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{TIMING_LABELS[supplement.timing]}</span>
                      </div>
                    )}
                  </div>

                  {supplement.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{supplement.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(supplement)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                  >
                    <Edit2 size={16} className="text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplement.id)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
