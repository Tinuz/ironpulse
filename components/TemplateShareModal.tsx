'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, Check, Share2, QrCode, Eye, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/context/AuthContext'
import type { Schema } from '@/components/context/DataContext'
import QRCode from 'react-qr-code'

interface TemplateShareModalProps {
  schema: Schema
  onClose: () => void
}

interface SharedTemplate {
  shareCode: string
  viewCount: number
  importCount: number
  createdAt: string
}

export default function TemplateShareModal({ schema, onClose }: TemplateShareModalProps) {
  const { user } = useAuth()
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [stats, setStats] = useState<SharedTemplate | null>(null)
  const [description, setDescription] = useState('')

  useEffect(() => {
    loadExistingShare()
  }, [schema.id])

  const loadExistingShare = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('shared_templates')
      .select('share_code, view_count, import_count, created_at')
      .eq('schema_id', schema.id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (data && !error) {
      setShareCode(data.share_code)
      setStats({
        shareCode: data.share_code,
        viewCount: data.view_count,
        importCount: data.import_count,
        createdAt: data.created_at
      })
    }
  }

  const generateShareCode = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get user profile for username/avatar
      const { data: profileData } = await supabase
        .from('user_social_profiles')
        .select('username, avatar_url')
        .eq('user_id', user.id)
        .single()

      // Generate unique code
      let code = ''
      let isUnique = false
      
      while (!isUnique) {
        code = generateRandomCode()
        const { data } = await supabase
          .from('shared_templates')
          .select('share_code')
          .eq('share_code', code)
          .single()
        
        if (!data) isUnique = true
      }

      // Create shared template
      const { data, error } = await supabase
        .from('shared_templates')
        .insert({
          user_id: user.id,
          schema_id: schema.id,
          share_code: code,
          name: schema.name,
          description: description || null,
          exercises: schema.exercises,
          color: schema.color || null,
          created_by_username: profileData?.username || 'Anonymous',
          created_by_avatar: profileData?.avatar_url || null
        })
        .select('share_code, view_count, import_count, created_at')
        .single()

      if (error) throw error

      setShareCode(data.share_code)
      setStats({
        shareCode: data.share_code,
        viewCount: data.view_count,
        importCount: data.import_count,
        createdAt: data.created_at
      })
    } catch (error) {
      console.error('Error generating share code:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const getShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/import/${shareCode}`
  }

  const copyToClipboard = async () => {
    if (!shareCode) return

    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const shareNative = async () => {
    if (!shareCode) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${schema.name} - Workout Template`,
          text: `Check out this workout template: ${schema.name}`,
          url: getShareUrl()
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      copyToClipboard()
    }
  }

  const deactivateShare = async () => {
    if (!user || !shareCode) return

    const { error } = await supabase
      .from('shared_templates')
      .update({ is_active: false })
      .eq('share_code', shareCode)
      .eq('user_id', user.id)

    if (!error) {
      setShareCode(null)
      setStats(null)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-6"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black">Share Template</h2>
            <p className="text-sm text-muted-foreground mt-1">{schema.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!shareCode ? (
          /* Generate Share */
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 block">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your template..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                rows={3}
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/150 characters
              </p>
            </div>

            <button
              onClick={generateShareCode}
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              {loading ? 'Generating...' : 'Generate Share Link'}
            </button>

            <div className="bg-white/5 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">ℹ️ About sharing:</p>
              <ul className="space-y-1 text-xs">
                <li>• Anyone with the link can view and import this template</li>
                <li>• Track views and imports</li>
                <li>• You can deactivate the link anytime</li>
                <li>• Template includes all exercises and sets/reps</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Share Options */
          <div className="space-y-4">
            {/* Share Code Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">
                Share Code
              </div>
              <div className="text-3xl font-black text-primary font-mono tracking-wider text-center py-2">
                {shareCode}
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye size={14} />
                    <span className="text-xs font-bold uppercase">Views</span>
                  </div>
                  <div className="text-2xl font-black">{stats.viewCount}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Download size={14} />
                    <span className="text-xs font-bold uppercase">Imports</span>
                  </div>
                  <div className="text-2xl font-black">{stats.importCount}</div>
                </div>
              </div>
            )}

            {/* Share URL */}
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 block">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getShareUrl()}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2"
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareNative}
                className="py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Share
              </button>
              <button
                onClick={() => setShowQR(!showQR)}
                className="py-3 bg-white/5 hover:bg-white/10 rounded-full font-bold transition-colors flex items-center justify-center gap-2"
              >
                <QrCode size={18} />
                QR Code
              </button>
            </div>

            {/* QR Code */}
            {showQR && (
              <div className="bg-white p-4 rounded-xl">
                <QRCode
                  value={getShareUrl()}
                  size={256}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Deactivate */}
            <button
              onClick={deactivateShare}
              className="w-full py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Deactivate Share Link
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
