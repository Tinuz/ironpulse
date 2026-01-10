'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Dumbbell, Heart, Star, MessageCircle, Send, Trash2 } from 'lucide-react'
import {
  SquadPost,
  getPostReactions,
  getPostComments,
  addPostReaction,
  removePostReaction,
  addPostComment,
  deletePostComment,
  SquadPostReaction,
  SquadPostComment
} from '@/lib/squads'
import { WorkoutLog } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'

interface SquadFeedPostProps {
  post: SquadPost
  userProfile?: any // From social_profiles or friends table
}

const REACTION_ICONS = {
  fire: { icon: Flame, color: 'text-orange-500', label: '🔥' },
  muscle: { icon: Dumbbell, color: 'text-purple-500', label: '💪' },
  clap: { icon: Star, color: 'text-yellow-500', label: '👏' },
  heart: { icon: Heart, color: 'text-red-500', label: '❤️' },
  star: { icon: Star, color: 'text-blue-500', label: '⭐' }
}

export default function SquadFeedPost({ post, userProfile }: SquadFeedPostProps) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<SquadPostReaction[]>([])
  const [comments, setComments] = useState<SquadPostComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReactionsAndComments()
  }, [post.id])

  const loadReactionsAndComments = async () => {
    const [reactionsData, commentsData] = await Promise.all([
      getPostReactions(post.id),
      getPostComments(post.id)
    ])
    setReactions(reactionsData)
    setComments(commentsData)
  }

  const handleReaction = async (reactionType: 'fire' | 'muscle' | 'clap' | 'heart' | 'star') => {
    if (!user) return

    const existingReaction = reactions.find(
      r => r.user_id === user.id && r.reaction === reactionType
    )

    if (existingReaction) {
      // Remove reaction
      const success = await removePostReaction(post.id, user.id, reactionType)
      if (success) {
        setReactions(reactions.filter(r => r.id !== existingReaction.id))
      }
    } else {
      // Add reaction
      const success = await addPostReaction(post.id, user.id, reactionType)
      if (success) {
        // Optimistic update
        setReactions([...reactions, {
          id: crypto.randomUUID(),
          post_id: post.id,
          user_id: user.id,
          reaction: reactionType,
          created_at: new Date().toISOString()
        }])
      }
    }
  }

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return

    setLoading(true)
    const comment = await addPostComment(post.id, user.id, newComment)
    setLoading(false)

    if (comment) {
      setComments([...comments, comment])
      setNewComment('')
      setShowComments(true)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const success = await deletePostComment(commentId)
    if (success) {
      setComments(comments.filter(c => c.id !== commentId))
    }
  }

  const formatPostTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Nu'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}u`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  const renderPostContent = () => {
    switch (post.post_type) {
      case 'workout': {
        const workout = post.content as WorkoutLog
        return (
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">{workout.name}</h4>
              <span className="text-xs text-muted-foreground">
                {workout.exercises.length} oefeningen
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                {workout.exercises.reduce((sum, ex) => 
                  sum + ex.sets.filter(s => s.completed).length, 0
                )} sets
              </span>
              {workout.totalCalories && (
                <span>{Math.round(workout.totalCalories)} kcal</span>
              )}
            </div>
          </div>
        )
      }
      case 'check_in':
        return (
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm">{post.content.message || 'Check-in geplaatst'}</p>
          </div>
        )
      case 'routine':
        return (
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-3">
            <p className="text-sm font-bold">Routine gedeeld: {post.content.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {post.content.exercises?.length || 0} oefeningen
            </p>
          </div>
        )
      case 'announcement':
        return (
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm">{post.content.message}</p>
          </div>
        )
      default:
        return null
    }
  }

  // Group reactions by type
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userReactions = reactions
    .filter(r => r.user_id === user?.id)
    .map(r => r.reaction)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-white/5 rounded-xl p-4 space-y-3"
    >
      {/* Post Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 font-bold text-sm">
          {userProfile?.display_name?.[0]?.toUpperCase() || post.user_id.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm">
            {userProfile?.display_name || 'Squad Member'}
          </h4>
          <p className="text-xs text-muted-foreground">
            {formatPostTime(post.created_at)}
          </p>
        </div>
      </div>

      {/* Post Caption */}
      {post.text && (
        <p className="text-sm leading-relaxed">{post.text}</p>
      )}

      {/* Post Content */}
      {renderPostContent()}

      {/* Reactions Bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {Object.entries(REACTION_ICONS).map(([type, { icon: Icon, color }]) => {
          const count = reactionCounts[type] || 0
          const isActive = userReactions.includes(type as any)

          return (
            <button
              key={type}
              onClick={() => handleReaction(type as any)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/10 ' + color
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <Icon size={14} className={isActive ? color : ''} />
              {count > 0 && (
                <span className="text-xs font-mono font-bold">{count}</span>
              )}
            </button>
          )
        })}

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 ml-auto"
        >
          <MessageCircle size={14} />
          {comments.length > 0 && (
            <span className="text-xs font-mono font-bold">{comments.length}</span>
          )}
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2 border-t border-white/5"
          >
            {/* Existing Comments */}
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {comment.user_id.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 bg-white/5 rounded-lg p-2">
                  <p className="text-xs leading-relaxed">{comment.comment}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatPostTime(comment.created_at)}
                  </p>
                </div>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-500/60 hover:text-red-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Voeg reactie toe..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                className="px-3 py-2 bg-primary text-background rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
