'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import {
  getProgressPhotos,
  getProgressPhotoUrl,
  deleteProgressPhoto,
  ProgressPhoto
} from '@/lib/progressPhotos'
import PhotoUploadModal from '@/components/PhotoUploadModal'
import PhotoDetailModal from '@/components/PhotoDetailModal'

export default function ProgressPhotos() {
  const router = useRouter()
  const { user } = useAuth()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'thisMonth' | 'thisYear'>('all')

  useEffect(() => {
    if (user) {
      loadPhotos()
    }
  }, [user])

  const loadPhotos = async () => {
    if (!user) return
    setLoading(true)
    const data = await getProgressPhotos(user.id)
    setPhotos(data)
    setLoading(false)
  }

  const handleDeletePhoto = async (photo: ProgressPhoto) => {
    if (!confirm('Weet je zeker dat je deze foto wilt verwijderen?')) return

    const success = await deleteProgressPhoto(photo.id, photo.photo_url)
    if (success) {
      setPhotos(photos.filter(p => p.id !== photo.id))
      setSelectedPhoto(null)
    } else {
      alert('Fout bij verwijderen foto')
    }
  }

  const getFilteredPhotos = () => {
    if (filterMode === 'all') return photos

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return photos.filter(photo => {
      const photoDate = new Date(photo.date)
      
      if (filterMode === 'thisMonth') {
        return photoDate.getMonth() === currentMonth && photoDate.getFullYear() === currentYear
      }
      
      if (filterMode === 'thisYear') {
        return photoDate.getFullYear() === currentYear
      }

      return true
    })
  }

  // Group photos by month
  const groupPhotosByMonth = (photos: ProgressPhoto[]) => {
    const groups: Record<string, ProgressPhoto[]> = {}
    
    photos.forEach(photo => {
      const date = new Date(photo.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(photo)
    })

    return groups
  }

  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
  }

  const formatPhotoDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filteredPhotos = getFilteredPhotos()
  const groupedPhotos = groupPhotosByMonth(filteredPhotos)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="font-bold text-lg">Progress Foto's</h1>
              <p className="text-xs text-muted-foreground">
                {filteredPhotos.length} {filteredPhotos.length === 1 ? 'foto' : "foto's"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-bold rounded-lg hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Upload
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors ${
              filterMode === 'all'
                ? 'bg-primary text-background'
                : 'bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilterMode('thisMonth')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors ${
              filterMode === 'thisMonth'
                ? 'bg-primary text-background'
                : 'bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            Deze Maand
          </button>
          <button
            onClick={() => setFilterMode('thisYear')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors ${
              filterMode === 'thisYear'
                ? 'bg-primary text-background'
                : 'bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            Dit Jaar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Camera size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">Nog geen foto's</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Upload je eerste progress foto om je transformatie bij te houden
            </p>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold rounded-lg hover:scale-105 transition-transform"
            >
              <Camera size={18} />
              Upload Foto
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPhotos).map(([monthKey, monthPhotos]) => (
              <div key={monthKey}>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {formatMonthHeader(monthKey)}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {monthPhotos.map(photo => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-white/5 cursor-pointer group"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={getProgressPhotoUrl(photo.photo_url)}
                        alt={`Progress foto van ${formatPhotoDate(photo.date)}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs font-bold text-white">
                            {formatPhotoDate(photo.date)}
                          </p>
                          {photo.notes && (
                            <p className="text-[10px] text-white/80 mt-1 line-clamp-2">
                              {photo.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoDetailModal
            photo={selectedPhoto}
            allPhotos={filteredPhotos}
            onClose={() => setSelectedPhoto(null)}
            onDelete={handleDeletePhoto}
            onNavigate={(photo) => setSelectedPhoto(photo)}
          />
        )}
      </AnimatePresence>

      {/* Upload Modal - Placeholder (will be created next) */}
      {uploadModalOpen && user && (
        <PhotoUploadModal
          userId={user.id}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={loadPhotos}
        />
      )}
    </div>
  )
}
