'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Edit2, X, ChevronDown, ChevronUp,
  FlaskConical, AlertTriangle, BookOpen, ToggleLeft, ToggleRight, Check
} from 'lucide-react'
import { useData, SupplementStack, Supplement } from '@/components/context/DataContext'
import { getSupplementEvidence, GRADE_COLORS, KNOWN_SUPPLEMENTS } from '@/lib/supplementScience'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOSAGE_UNITS: Supplement['dosageUnit'][] = ['g', 'mg', 'pills', 'capsules', 'scoops', 'ml', 'tablets']

const TIMING_OPTIONS: NonNullable<Supplement['timing']>[] = [
  'morning', 'pre-workout', 'post-workout', 'evening', 'with-meal', 'before-bed'
]

const TIMING_LABELS: Record<NonNullable<Supplement['timing']>, string> = {
  'morning': 'Ochtend',
  'pre-workout': 'Pre-workout',
  'post-workout': 'Post-workout',
  'evening': 'Avond',
  'with-meal': 'Bij maaltijd',
  'before-bed': 'Voor het slapen',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EvidenceBadge({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const evidence = getSupplementEvidence(name)

  if (!evidence) return null

  const colors = GRADE_COLORS[evidence.grade]

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${colors.bg} ${colors.text} ${colors.border}`}
      >
        <FlaskConical size={11} />
        Grade {evidence.grade}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`mt-2 rounded-xl border p-3 space-y-2 text-xs ${colors.bg} ${colors.border}`}>
              <p className={`font-semibold ${colors.text}`}>{evidence.gradeLabel}</p>

              {/* Dose warning */}
              {evidence.optimalDose && (
                <div className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Optimale dosis: </span>
                    {evidence.optimalDose}
                  </span>
                </div>
              )}

              {/* Timing */}
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Timing: </span>
                {evidence.optimalTiming}
              </div>

              {/* Benefits */}
              <div>
                <p className="font-medium text-foreground mb-1">Voordelen:</p>
                <ul className="space-y-0.5">
                  {evidence.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                      <Check size={10} className="text-green-400 mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              {evidence.warnings.length > 0 && (
                <div>
                  <p className="font-medium text-foreground mb-1">Let op:</p>
                  <ul className="space-y-0.5">
                    {evidence.warnings.slice(0, 2).map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                        <AlertTriangle size={10} className="text-amber-400 mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key studies */}
              <div>
                <p className="font-medium text-foreground mb-1 flex items-center gap-1">
                  <BookOpen size={10} />
                  Bronnen:
                </p>
                <ul className="space-y-0.5">
                  {evidence.keyStudies.slice(0, 2).map((s, i) => (
                    <li key={i} className="text-muted-foreground">
                      {s.authors} ({s.year}) — {s.title}
                    </li>
                  ))}
                </ul>
              </div>

              {evidence.notes && (
                <p className="text-muted-foreground italic border-t border-white/10 pt-2">{evidence.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stack item form (shared for add / edit)
// ---------------------------------------------------------------------------

interface StackFormData {
  name: string
  dosageAmount: string
  dosageUnit: Supplement['dosageUnit']
  brand: string
  timing: Supplement['timing'] | undefined
  notes: string
}

const emptyForm = (): StackFormData => ({
  name: '', dosageAmount: '', dosageUnit: 'g', brand: '', timing: undefined, notes: ''
})

interface StackFormProps {
  initial?: StackFormData
  onSave: (data: StackFormData) => void
  onCancel: () => void
  submitLabel: string
}

function StackForm({ initial, onSave, onCancel, submitLabel }: StackFormProps) {
  const [form, setForm] = useState<StackFormData>(initial ?? emptyForm())
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = KNOWN_SUPPLEMENTS.filter(s =>
    form.name.length > 0 && s.toLowerCase().includes(form.name.toLowerCase()) && s.toLowerCase() !== form.name.toLowerCase()
  ).slice(0, 5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.dosageAmount) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Name with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={form.name}
          onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Naam (bijv. Creatine)"
          className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          required
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-full bg-card border border-white/10 rounded-xl overflow-hidden shadow-lg">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={() => { setForm(f => ({ ...f, name: s })); setShowSuggestions(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dosage */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number" step="0.01" min="0"
          value={form.dosageAmount}
          onChange={e => setForm(f => ({ ...f, dosageAmount: e.target.value }))}
          placeholder="Hoeveelheid"
          className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm min-w-0"
          required
        />
        <select
          value={form.dosageUnit}
          onChange={e => setForm(f => ({ ...f, dosageUnit: e.target.value as Supplement['dosageUnit'] }))}
          className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        >
          {DOSAGE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Brand + Timing */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.brand}
          onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
          placeholder="Merk (optioneel)"
          className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
        <select
          value={form.timing ?? ''}
          onChange={e => setForm(f => ({ ...f, timing: e.target.value ? e.target.value as Supplement['timing'] : undefined }))}
          className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        >
          <option value="">Tijdstip</option>
          {TIMING_OPTIONS.map(t => <option key={t} value={t}>{TIMING_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Notes */}
      <textarea
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        placeholder="Notities (optioneel)"
        rows={2}
        className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
      />

      {/* Evidence preview while typing */}
      {form.name.length > 2 && (
        <EvidenceBadge name={form.name} />
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors"
        >
          Annuleer
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SupplementStackManagerProps {
  onClose: () => void
}

export default function SupplementStackManager({ onClose }: SupplementStackManagerProps) {
  const { supplementStacks, addSupplementStack, updateSupplementStack, deleteSupplementStack, toggleSupplementStack } = useData()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleAdd = async (data: StackFormData) => {
    await addSupplementStack({
      name: data.name,
      dosageAmount: parseFloat(data.dosageAmount),
      dosageUnit: data.dosageUnit,
      brand: data.brand || undefined,
      timing: data.timing,
      notes: data.notes || undefined,
    })
    setIsAdding(false)
  }

  const handleUpdate = async (id: string, data: StackFormData) => {
    await updateSupplementStack(id, {
      name: data.name,
      dosageAmount: parseFloat(data.dosageAmount),
      dosageUnit: data.dosageUnit,
      brand: data.brand || undefined,
      timing: data.timing,
      notes: data.notes || undefined,
    })
    setEditingId(null)
  }

  const active = supplementStacks.filter(s => s.isActive)
  const inactive = supplementStacks.filter(s => !s.isActive)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="bg-card border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="font-bold text-lg">Mijn Supplement Stack</h2>
            <p className="text-xs text-muted-foreground">{active.length} actief · {supplementStacks.length} totaal</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Add form */}
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm font-semibold mb-3">Nieuw supplement toevoegen</p>
                  <StackForm
                    onSave={handleAdd}
                    onCancel={() => setIsAdding(false)}
                    submitLabel="Toevoegen aan stack"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-sm"
            >
              <Plus size={18} />
              Supplement toevoegen aan stack
            </button>
          )}

          {/* Active list */}
          {supplementStacks.length === 0 && !isAdding && (
            <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
              <FlaskConical size={40} className="mx-auto opacity-20" />
              <p>Je stack is leeg.</p>
              <p>Voeg je dagelijkse supplementen toe en log ze met één tik.</p>
            </div>
          )}

          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actief</p>
              {active.map(stack => (
                <StackItem
                  key={stack.id}
                  stack={stack}
                  isEditing={editingId === stack.id}
                  deleteConfirm={deleteConfirm === stack.id}
                  onToggle={() => toggleSupplementStack(stack.id, !stack.isActive)}
                  onEdit={() => setEditingId(editingId === stack.id ? null : stack.id)}
                  onDelete={() => setDeleteConfirm(stack.id)}
                  onDeleteConfirm={() => { deleteSupplementStack(stack.id); setDeleteConfirm(null) }}
                  onDeleteCancel={() => setDeleteConfirm(null)}
                  onUpdateSave={(data) => handleUpdate(stack.id, data)}
                  onUpdateCancel={() => setEditingId(null)}
                />
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gepauzeerd</p>
              {inactive.map(stack => (
                <StackItem
                  key={stack.id}
                  stack={stack}
                  isEditing={editingId === stack.id}
                  deleteConfirm={deleteConfirm === stack.id}
                  onToggle={() => toggleSupplementStack(stack.id, !stack.isActive)}
                  onEdit={() => setEditingId(editingId === stack.id ? null : stack.id)}
                  onDelete={() => setDeleteConfirm(stack.id)}
                  onDeleteConfirm={() => { deleteSupplementStack(stack.id); setDeleteConfirm(null) }}
                  onDeleteCancel={() => setDeleteConfirm(null)}
                  onUpdateSave={(data) => handleUpdate(stack.id, data)}
                  onUpdateCancel={() => setEditingId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Stack item card
// ---------------------------------------------------------------------------

interface StackItemProps {
  stack: SupplementStack
  isEditing: boolean
  deleteConfirm: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onUpdateSave: (data: StackFormData) => void
  onUpdateCancel: () => void
}

function StackItem({
  stack, isEditing, deleteConfirm,
  onToggle, onEdit, onDelete, onDeleteConfirm, onDeleteCancel,
  onUpdateSave, onUpdateCancel
}: StackItemProps) {
  return (
    <div className={`rounded-xl border transition-colors ${stack.isActive ? 'bg-white/5 border-white/10' : 'bg-white/2 border-white/5 opacity-60'}`}>
      <div className="p-3">
        {/* Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{stack.name}</span>
              <span className="text-xs text-primary font-bold">{stack.dosageAmount}{stack.dosageUnit}</span>
              {stack.timing && (
                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                  {TIMING_LABELS[stack.timing]}
                </span>
              )}
              {stack.brand && (
                <span className="text-xs text-muted-foreground">{stack.brand}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
              <Edit2 size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-400">
              <Trash2 size={14} />
            </button>
            <button onClick={onToggle} className={`p-1.5 rounded-lg transition-colors ${stack.isActive ? 'text-green-400' : 'text-muted-foreground'}`}>
              {stack.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
        </div>

        {/* Evidence badge */}
        <div className="mt-2">
          <EvidenceBadge name={stack.name} />
        </div>

        {/* Edit form */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="border-t border-white/10 pt-3">
                <StackForm
                  initial={{
                    name: stack.name,
                    dosageAmount: stack.dosageAmount.toString(),
                    dosageUnit: stack.dosageUnit,
                    brand: stack.brand ?? '',
                    timing: stack.timing,
                    notes: stack.notes ?? '',
                  }}
                  onSave={onUpdateSave}
                  onCancel={onUpdateCancel}
                  submitLabel="Opslaan"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirm */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="border-t border-white/10 pt-2 flex items-center gap-2">
                <p className="text-xs text-muted-foreground flex-1">Verwijder {stack.name}?</p>
                <button onClick={onDeleteConfirm} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors">
                  Verwijder
                </button>
                <button onClick={onDeleteCancel} className="px-3 py-1 bg-white/5 rounded-lg text-xs hover:bg-white/10 transition-colors">
                  Annuleer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
