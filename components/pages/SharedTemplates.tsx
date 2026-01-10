'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Share2, Eye, Download, Copy, Check, Trash2, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/context/AuthContext'
import { format } from 'date-fns'

interface SharedTemplate {
  id: string
  schemaId: string
  shareCode: string
  name: string
  description: string | null
  exerciseCount: number
  color: string | null
  viewCount: number
  importCount: number
  isActive: boolean
  createdAt: string
}

export default function SharedTemplates() {
  const router = useRouter()
  const { user } = useAuth()
  const [templates, setTemplates] = useState<SharedTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadSharedTemplates()
    }
  }, [user])

  const loadSharedTemplates = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shared_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        setTemplates(data.map(t => ({
          id: t.id,
          schemaId: t.schema_id,
          shareCode: t.share_code,
          name: t.name,
          description: t.description,
          exerciseCount: Array.isArray(t.exercises) ? t.exercises.length : 0,
          color: t.color,
          viewCount: t.view_count,
          importCount: t.import_count,
          isActive: t.is_active,
          createdAt: t.created_at
        })))
      }
    } catch (error) {
      console.error('Error loading shared templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getShareUrl = (shareCode: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/import/${shareCode}`
  }

  const copyToClipboard = async (shareCode: string) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(shareCode))
      setCopiedCode(shareCode)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_templates')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id)

      if (!error) {
        setTemplates(prev => prev.map(t => 
          t.id === id ? { ...t, isActive: !currentStatus } : t
        ))
      }
    } catch (error) {
      console.error('Error toggling template status:', error)
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (!error) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        setConfirmDelete(null)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const activeTemplates = templates.filter(t => t.isActive)
  const inactiveTemplates = templates.filter(t => !t.isActive)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Shared Templates</h1>
        <div className="w-8" />
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
              <Share2 size={40} />
            </div>
            <div>
              <h2 className="text-xl font-bold">No Shared Templates</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                Share your workout templates to let others import them.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Share2 size={14} />
                  <span className="text-xs font-bold uppercase">Shared</span>
                </div>
                <div className="text-2xl font-black">{activeTemplates.length}</div>
              </div>
              <div className="bg-card border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Eye size={14} />
                  <span className="text-xs font-bold uppercase">Views</span>
                </div>
                <div className="text-2xl font-black">
                  {templates.reduce((acc, t) => acc + t.viewCount, 0)}
                </div>
              </div>
              <div className="bg-card border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Download size={14} />
                  <span className="text-xs font-bold uppercase">Imports</span>
                </div>
                <div className="text-2xl font-black">
                  {templates.reduce((acc, t) => acc + t.importCount, 0)}
                </div>
              </div>
            </div>

            {/* Active Templates */}
            {activeTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Active Templates ({activeTemplates.length})
                </h3>
                {activeTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border border-white/5 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-primary">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        )}
                        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                          <span>{template.exerciseCount} exercises</span>
                          <span>•</span>
                          <span>{format(new Date(template.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Share Code */}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                      <div className="text-xs uppercase tracking-widest text-primary font-bold mb-1">
                        Share Code
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-black text-primary font-mono tracking-wider">
                          {template.shareCode}
                        </div>
                        <button
                          onClick={() => copyToClipboard(template.shareCode)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-bold"
                        >
                          {copiedCode === template.shareCode ? (
                            <>
                              <Check size={14} />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copy Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Eye size={12} />
                          <span className="text-xs font-bold uppercase">Views</span>
                        </div>
                        <div className="text-xl font-black">{template.viewCount}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Download size={12} />
                          <span className="text-xs font-bold uppercase">Imports</span>
                        </div>
                        <div className="text-xl font-black">{template.importCount}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => router.push(`/schema?edit=${template.schemaId}`)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm transition-colors"
                      >
                        Edit Schema
                      </button>
                      <button
                        onClick={() => toggleActive(template.id, template.isActive)}
                        className="flex-1 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg font-bold text-sm transition-colors"
                      >
                        Deactivate
                      </button>
                      <button
                        onClick={() => setConfirmDelete(template.id)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Inactive Templates */}
            {inactiveTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Deactivated Templates ({inactiveTemplates.length})
                </h3>
                {inactiveTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-card border border-white/5 rounded-xl p-4 opacity-60"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold">{template.name}</h4>
                        <div className="text-xs text-muted-foreground mt-1">
                          Code: <span className="font-mono">{template.shareCode}</span> • {template.viewCount} views • {template.importCount} imports
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(template.id, template.isActive)}
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                          title="Reactivate"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(template.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4"
          >
            <h3 className="text-xl font-bold">Delete Shared Template?</h3>
            <p className="text-muted-foreground">
              This will permanently delete the share link. Anyone with the link will no longer be able to view or import this template.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-white/5 rounded-full font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTemplate(confirmDelete)}
                className="flex-1 py-3 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
