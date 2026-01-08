'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface ReactionCounts {
  total_reactions: number
  fire_count: number
  strong_count: number
  clap_count: number
  beast_count: number
}

const REACTIONS = [
  { type: 'fire', icon: '🔥', label: 'Fire', color: 'text-orange-500' },
  { type: 'strong', icon: '💪', label: 'Strong', color: 'text-blue-500' },
  { type: 'clap', icon: '👏', label: 'Props', color: 'text-yellow-500' },
  { type: 'beast', icon: '😈', label: 'Beast', color: 'text-purple-500' },
] as const

export default function WorkoutReactions({ workoutId }: { workoutId: string }) {
  const { user } = useAuth()
  const [counts, setCounts] = useState<ReactionCounts>({
    total_reactions: 0,
    fire_count: 0,
    strong_count: 0,
    clap_count: 0,
    beast_count: 0
  })
  const [userReaction, setUserReaction] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReactions()
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`workout-reactions-${workoutId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_reactions',
        filter: `workout_id=eq.${workoutId}`
      }, () => {
        loadReactions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workoutId, user])

  const loadReactions = async () => {
    // Load all reactions
    const { data: reactionsData } = await supabase
      .from('workout_reactions')
      .select('*')
      .eq('workout_id', workoutId)

    if (reactionsData) {
      // Calculate counts
      const newCounts = {
        total_reactions: reactionsData.length,
        fire_count: reactionsData.filter(r => r.reaction_type === 'fire').length,
        strong_count: reactionsData.filter(r => r.reaction_type === 'strong').length,
        clap_count: reactionsData.filter(r => r.reaction_type === 'clap').length,
        beast_count: reactionsData.filter(r => r.reaction_type === 'beast').length,
      }
      setCounts(newCounts)

      // Find user's reaction
      const myReaction = reactionsData.find(r => r.user_id === user?.id)
      setUserReaction(myReaction?.reaction_type || null)
    }
  }

  const handleReaction = async (type: string) => {
    if (!user || loading) return
    setLoading(true)

    try {
      if (userReaction === type) {
        // Remove reaction
        await supabase
          .from('workout_reactions')
          .delete()
          .eq('workout_id', workoutId)
          .eq('user_id', user.id)
        
        setUserReaction(null)
      } else {
        // Add or update reaction
        await supabase
          .from('workout_reactions')
          .upsert({
            workout_id: workoutId,
            user_id: user.id,
            reaction_type: type
          }, {
            onConflict: 'workout_id,user_id'
          })
        
        setUserReaction(type)
      }

      await loadReactions()
    } catch (error) {
      console.error('Error handling reaction:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-white/5 pt-4"
    >
      <div className="flex items-center gap-3">
        {REACTIONS.map(({ type, icon }) => {
          const count = counts[`${type}_count` as keyof ReactionCounts]
          const isActive = userReaction === type
          
          return (
            <motion.button
              key={type}
              onClick={() => handleReaction(type)}
              disabled={loading}
              whileTap={{ scale: 0.9 }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all
                ${isActive 
                  ? 'border-primary/50 bg-primary/10' 
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className={`text-lg ${isActive ? 'scale-110' : ''} transition-transform`}>
                {icon}
              </span>
              
              {count > 0 && (
                <span className={`text-xs font-bold tabular-nums ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {counts.total_reactions === 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Geef als eerste een reactie
        </p>
      )}
    </motion.div>
  )
}
