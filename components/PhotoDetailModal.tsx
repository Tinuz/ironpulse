'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X, Trash2, Calendar, Edit2, ChevronLeft, ChevronRight, StickyNote } from 'lucide-react'
import { ProgressPhoto, updateProgressPhoto, getProgressPhotoUrl } from '@/lib/progressPhotos'

interface PhotoDetailModalProps {
  photo: ProgressPhoto
  allPhotos: ProgressPhoto[]
  onClose: () => void
  onDelete: (photo: ProgressPhoto) => void
  onNavigate?: (photo: ProgressPhoto) => void
}

export default function PhotoDetailModal({
  photo,
  allPhotos,
  onClose,
  onDelete,
  onNavigate
}: PhotoDetailModalProps) {
  const [currentPhoto, setCurrentPhoto] = useState(photo)
  const [editMode, setEditMode] = useState(false)
  const [editedNotes, setEditedNotes] = useState(photo.notes || '')
  const [editedDate, setEditedDate] = useState(photo.date)
  const [saving, setSaving] = useState(false)

  // Update current photo when prop changes
  useEffect(() => {
    setCurrentPhoto(photo)
    setEditedNotes(photo.notes || '')
    setEditedDate(photo.date)
  }, [photo])

  const currentIndex = allPhotos.findIndex(p => p.id === currentPhoto.id)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < allPhotos.length - 1

  const navigatePrevious = () => {
    if (hasPrevious) {
      const prevPhoto = allPhotos[currentIndex - 1]
      setCurrentPhoto(prevPhoto)
      onNavigate?.(prevPhoto)
      setEditMode(false)
    }
  }

  const navigateNext = () => {
    if (hasNext) {
      const nextPhoto = allPhotos[currentIndex + 1]
      setCurrentPhoto(nextPhoto)
      onNavigate?.(nextPhoto)
      setEditMode(false)
    }
  }

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const swipeThreshold = 50
    
    if (info.offset.x > swipeThreshold && hasPrevious) {
      navigatePrevious()
    } else if (info.offset.x < -swipeThreshold && hasNext) {
      navigateNext()
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)

    const result = await updateProgressPhoto(currentPhoto.id, {
      date: editedDate,
      notes: editedNotes || undefined
    })

    setSaving(false)

    if (result) {
      setCurrentPhoto(result)
      setEditMode(false)
    } else {
      alert('Fout bij opslaan. Probeer opnieuw.')
    }
  }

  const handleDelete = () => {
    if (confirm('Weet je zeker dat je deze foto wilt verwijderen?')) {
      onDelete(currentPhoto)
    }
  }

  const formatPhotoDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20"
            >
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-2">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 bg-red-500/20 backdrop-blur-sm rounded-full text-red-400 hover:bg-red-500/30"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-primary backdrop-blur-sm rounded-full text-background font-bold hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              )}
            </div>
          </div>

          {/* Photo Counter */}
          <div className="text-center mt-2">
            <p className="text-xs text-white/60 font-mono">
              {currentIndex + 1} / {allPhotos.length}
            </p>
          </div>
        </div>

        {/* Navigation Arrows */}
        {hasPrevious && (
          <button
            onClick={navigatePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {hasNext && (
          <button
            onClick={navigateNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Main Photo */}
        <div className="flex items-center justify-center h-full p-4 pt-24 pb-32">
          <motion.img
            key={currentPhoto.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            src={getProgressPhotoUrl(currentPhoto.photo_url)}
            alt="Progress foto"
            className="max-w-full max-h-full object-contain rounded-xl cursor-grab active:cursor-grabbing"
          />
        </div>

        {/* Bottom Info Panel */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pt-12">
          {editMode ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Date Edit */}
              <div>
                <label className="text-xs uppercase font-bold text-white/60 flex items-center gap-2 mb-2">
                  <Calendar size={12} />
                  Datum
                </label>
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Notes Edit */}
              <div>
                <label className="text-xs uppercase font-bold text-white/60 flex items-center gap-2 mb-2">
                  <StickyNote size={12} />
                  Notities
                </label>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Voeg notities toe..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-[10px] text-white/40 mt-1 text-right">
                  {editedNotes.length}/500
                </p>
              </div>

              <button
                onClick={() => {
                  setEditMode(false)
                  setEditedNotes(currentPhoto.notes || '')
                  setEditedDate(currentPhoto.date)
                }}
                className="w-full py-2 text-sm text-white/60 hover:text-white"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-2">
              <div className="flex items-center gap-2 text-white/80">
                <Calendar size={16} />
                <span className="text-sm font-bold">
                  {formatPhotoDate(currentPhoto.date)}
                </span>
              </div>
              {currentPhoto.notes && (
                <div className="flex items-start gap-2 text-white">
                  <StickyNote size={16} className="mt-0.5 flex-shrink-0 text-white/60" />
                  <p className="text-sm leading-relaxed">{currentPhoto.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
