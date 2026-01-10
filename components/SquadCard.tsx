'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Lock, ChevronRight, Calendar } from 'lucide-react'
import { Squad, getSquadFeed } from '@/lib/squads'
import { useRouter } from 'next/navigation'

interface SquadCardProps {
  squad: Squad
  onSelect?: () => void
}

export default function SquadCard({ squad, onSelect }: SquadCardProps) {
  const router = useRouter()
  const [recentActivityCount, setRecentActivityCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSquadActivity()
  }, [squad.id])

  const loadSquadActivity = async () => {
    setLoading(true)
    // Get posts from last 7 days
    const posts = await getSquadFeed(squad.id, 100)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentPosts = posts.filter(
      post => new Date(post.created_at) > sevenDaysAgo
    )
    
    setRecentActivityCount(recentPosts.length)
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Vandaag'
    if (diffDays === 1) return 'Gisteren'
    if (diffDays < 7) return `${diffDays} dagen geleden`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weken geleden`
    return date.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })
  }

  const handleClick = () => {
    if (onSelect) {
      onSelect()
    } else {
      router.push(`/squad/${squad.id}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-white/5 rounded-xl p-4 hover:bg-white/5 transition-colors cursor-pointer group"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Squad Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Users size={24} className="text-primary" />
          </div>

          {/* Squad Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base truncate">{squad.name}</h3>
              {squad.privacy === 'private' && (
                <Lock size={14} className="text-muted-foreground flex-shrink-0" />
              )}
            </div>
            {squad.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {squad.description}
              </p>
            )}
          </div>
        </div>

        <ChevronRight
          size={20}
          className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-muted-foreground" />
          <span className="font-mono font-bold">
            {squad.member_count}
          </span>
          <span className="text-muted-foreground">
            {squad.member_count === 1 ? 'lid' : 'leden'}
          </span>
        </div>

        {!loading && recentActivityCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="font-mono font-bold text-green-500">
              {recentActivityCount}
            </span>
            <span className="text-muted-foreground">
              deze week
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto text-muted-foreground/60">
          <Calendar size={12} />
          <span>{formatDate(squad.created_at)}</span>
        </div>
      </div>
    </motion.div>
  )
}
