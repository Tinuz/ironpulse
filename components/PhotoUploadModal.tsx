'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Upload, Calendar, StickyNote, Loader2 } from 'lucide-react'
import { uploadProgressPhoto } from '@/lib/progressPhotos'

interface PhotoUploadModalProps {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export default function PhotoUploadModal({ userId, onClose, onSuccess }: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecteer alsjeblieft een afbeelding')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Afbeelding moet kleiner zijn dan 5MB')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    const result = await uploadProgressPhoto(userId, selectedFile, date, notes)

    setUploading(false)

    if (result) {
      onSuccess()
      onClose()
    } else {
      alert('Fout bij uploaden foto. Probeer opnieuw.')
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  return (
    <AnimatePresence>
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
          className="bg-card border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Upload Progress Foto</h2>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* File Selection */}
            {!selectedFile ? (
              <div className="space-y-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Camera size={32} />
                  <div>
                    <p className="font-bold">Maak Foto</p>
                    <p className="text-xs">Gebruik camera</p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload size={32} />
                  <div>
                    <p className="font-bold">Upload Bestand</p>
                    <p className="text-xs">Kies van apparaat</p>
                  </div>
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Max 5MB • JPG, PNG, WEBP
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                  <img
                    src={previewUrl || ''}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={clearSelection}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 backdrop-blur-sm rounded-full text-white hover:bg-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2 mb-2">
                    <Calendar size={12} />
                    Datum
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2 mb-2">
                    <StickyNote size={12} />
                    Notities (optioneel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="bijv. Na 3 maanden training, ochtend foto, 75kg..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {notes.length}/500
                  </p>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="w-full py-3 bg-primary text-background font-bold rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Uploaden...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload Foto
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
