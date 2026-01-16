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
      className="bg-bg-secondary border border-border-default rounded-professional p-5 hover:bg-bg-tertiary hover:border-border-light transition-all cursor-pointer group shadow-card hover:shadow-elevated"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Squad Avatar */}
          <div className="w-14 h-14 rounded-professional bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center flex-shrink-0 border border-border-light">
            <Users size={26} className="text-accent-primary" />
          </div>

          {/* Squad Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-bold text-base truncate text-txt-primary">{squad.name}</h3>
              {squad.privacy === 'private' && (
                <Lock size={14} className="text-txt-tertiary flex-shrink-0" />
              )}
            </div>
            {squad.description && (
              <p className="text-xs text-txt-secondary line-clamp-2 leading-relaxed">
                {squad.description}
              </p>
            )}
          </div>
        </div>

        <ChevronRight
          size={20}
          className="text-txt-tertiary group-hover:text-accent-primary transition-colors flex-shrink-0 ml-2"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-txt-tertiary" />
          <span className="font-semibold text-txt-primary">
            {squad.member_count}
          </span>
          <span className="text-txt-secondary">
            {squad.member_count === 1 ? 'lid' : 'leden'}
          </span>
        </div>

        {!loading && recentActivityCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-success shadow-[0_0_4px_rgba(76,175,80,0.6)]"></div>
            <span className="font-semibold text-accent-success">
              {recentActivityCount}
            </span>
            <span className="text-txt-secondary">
              deze week
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto text-txt-tertiary">
          <Calendar size={12} />
          <span>{formatDate(squad.created_at)}</span>
        </div>
      </div>
    </motion.div>
  )
}
