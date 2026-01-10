'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Download, Eye, User, Calendar, Dumbbell, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import type { Exercise } from '@/components/context/DataContext'

interface SharedTemplate {
  id: string
  shareCode: string
  name: string
  description: string | null
  exercises: Exercise[]
  color: string | null
  createdByUsername: string
  createdByAvatar: string | null
  viewCount: number
  importCount: number
  createdAt: string
}

export default function ImportTemplate() {
  const router = useRouter()
  const params = useParams()
  const { addSchema } = useData()
  const { user } = useAuth()
  const shareCode = params.shareCode as string

  const [template, setTemplate] = useState<SharedTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  useEffect(() => {
    if (shareCode) {
      loadTemplate()
    }
  }, [shareCode])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      setError(null)

      // Increment view count
      await supabase.rpc('increment_template_view', { 
        share_code_param: shareCode 
      })

      // Fetch template
      const { data, error: fetchError } = await supabase
        .from('shared_templates')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_active', true)
        .single()

      if (fetchError || !data) {
        setError('Template not found or has been deactivated')
        return
      }

      setTemplate({
        id: data.id,
        shareCode: data.share_code,
        name: data.name,
        description: data.description,
        exercises: data.exercises,
        color: data.color,
        createdByUsername: data.created_by_username,
        createdByAvatar: data.created_by_avatar,
        viewCount: data.view_count,
        importCount: data.import_count,
        createdAt: data.created_at
      })
    } catch (err) {
      console.error('Error loading template:', err)
      setError('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!template || !user) return

    setImporting(true)
    try {
      // Increment import count
      await supabase.rpc('increment_template_import', { 
        share_code_param: shareCode 
      })

      // Add schema to user's library
      const newSchema = {
        id: crypto.randomUUID(),
        name: template.name,
        exercises: template.exercises,
        color: template.color || 'from-orange-500 to-red-500'
      }

      await addSchema(newSchema)

      setImported(true)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err) {
      console.error('Error importing template:', err)
      setError('Failed to import template')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg">Import Template</h1>
          <div className="w-8" />
        </div>

        <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
            <Download size={40} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Template Not Found</h2>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
              {error || 'This template may have been deactivated or the link is invalid.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Import Template</h1>
        <div className="w-8" />
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Template Info */}
        <div className="bg-card border border-white/5 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-black">{template.name}</h2>
            {template.description && (
              <p className="text-muted-foreground mt-2">{template.description}</p>
            )}
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            {template.createdByAvatar ? (
              <img
                src={template.createdByAvatar}
                alt={template.createdByUsername}
                className="h-10 w-10 rounded-full border-2 border-primary/30"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
            )}
            <div>
              <p className="font-bold text-sm">@{template.createdByUsername}</p>
              <p className="text-xs text-muted-foreground">
                Created {new Date(template.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye size={14} />
                <span className="text-xs font-bold uppercase">Views</span>
              </div>
              <div className="text-xl font-black">{template.viewCount}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Download size={14} />
                <span className="text-xs font-bold uppercase">Imports</span>
              </div>
              <div className="text-xl font-black">{template.importCount}</div>
            </div>
          </div>
        </div>

        {/* Exercises Preview */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Exercises ({template.exercises.length})
          </h3>
          {template.exercises.map((exercise, index) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-white/5 rounded-xl p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground font-mono text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">{exercise.name}</h4>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Dumbbell size={12} /> {exercise.targetSets} Sets
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {exercise.targetReps} Reps
                    </span>
                    {exercise.startWeight && (
                      <span className="text-primary">@ {exercise.startWeight}kg</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Import Button */}
        {user ? (
          <button
            onClick={handleImport}
            disabled={importing || imported}
            className="w-full py-4 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {imported ? (
              <>
                <Check size={20} />
                Imported Successfully!
              </>
            ) : importing ? (
              <>Importing...</>
            ) : (
              <>
                <Download size={20} />
                Import to My Library
              </>
            )}
          </button>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <p className="text-yellow-500 font-bold">Please log in to import this template</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-3 px-6 py-2 bg-yellow-500 text-black rounded-full font-bold hover:bg-yellow-400 transition-colors"
            >
              Log In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
