'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Lock, Loader2 } from 'lucide-react'
import { createSquad, Squad } from '@/lib/squads'
import { useAuth } from '@/components/context/AuthContext'

interface CreateSquadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (squad: Squad) => void
}

export default function CreateSquadModal({ isOpen, onClose, onSuccess }: CreateSquadModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<'private' | 'invite_only'>('invite_only')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!user) return
    
    if (!name.trim()) {
      setError('Naam is verplicht')
      return
    }

    setCreating(true)
    setError('')

    const squad = await createSquad(name, description, privacy, user.id)

    setCreating(false)

    if (squad) {
      onSuccess(squad)
      onClose()
    } else {
      setError('Fout bij aanmaken squad. Probeer opnieuw.')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-white/10 rounded-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="border-b border-white/5 p-4 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Nieuwe Squad
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Squad Name */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                Squad Naam *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Ochtend Warriors, Gym Bros, Beast Mode..."
                maxLength={50}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {name.length}/50
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground mb-2 block">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Wat is het doel van deze squad? Bijv: 5x per week trainen, kracht opbouwen, samen afvallen..."
                maxLength={200}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {description.length}/200
              </p>
            </div>

            {/* Privacy Settings */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground mb-3 block">
                Privacy
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setPrivacy('invite_only')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    privacy === 'invite_only'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${privacy === 'invite_only' ? 'text-primary' : 'text-muted-foreground'}`}>
                      <Users size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Alleen op uitnodiging</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alleen jij kan mensen uitnodigen. Aanbevolen voor kleine groepen.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPrivacy('private')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    privacy === 'private'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${privacy === 'private' ? 'text-primary' : 'text-muted-foreground'}`}>
                      <Lock size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Privé</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Volledig privé. Alleen jij bepaalt wie lid wordt.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400 leading-relaxed">
                💡 Je kunt later nog mensen uitnodigen via de squad pagina
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={creating}
                className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="flex-1 py-3 text-sm font-bold bg-primary text-background rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Aanmaken...
                  </>
                ) : (
                  'Squad Aanmaken'
                )}
              </button>
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
