'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  ArrowLeft, 
  UserPlus, 
  Dumbbell, 
  MessageSquare,
  MoreVertical,
  Lock,
  Shield,
  Crown,
  Activity
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { 
  getSquadMembers, 
  getSquadFeed, 
  createSquadPost,
  SquadMember,
  SquadPost,
  Squad
} from '@/lib/squads'
import { supabase } from '@/lib/supabase'
import SquadFeedPost from '@/components/SquadFeedPost'

interface SquadDetailProps {
  squadId: string
}

export default function SquadDetail({ squadId }: SquadDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [squad, setSquad] = useState<Squad | null>(null)
  const [members, setMembers] = useState<SquadMember[]>([])
  const [posts, setPosts] = useState<SquadPost[]>([])
  const [loading, setLoading] = useState(true)
  const [checkInText, setCheckInText] = useState('')
  const [showCheckInInput, setShowCheckInInput] = useState(false)
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null)

  useEffect(() => {
    loadSquadData()
  }, [squadId])

  const loadSquadData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Load squad info
      const { data: squadData } = await supabase
        .from('squads')
        .select('*')
        .eq('id', squadId)
        .single()

      if (squadData) {
        setSquad(squadData)
      }

      // Load members and find user's role
      const squadMembers = await getSquadMembers(squadId)
      setMembers(squadMembers)
      
      const currentMember = squadMembers.find(m => m.user_id === user.id)
      if (currentMember) {
        setUserRole(currentMember.role)
      }

      // Load squad feed
      const squadPosts = await getSquadFeed(squadId)
      setPosts(squadPosts)

    } catch (error) {
      console.error('Error loading squad data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!user || !checkInText.trim()) return

    try {
      await createSquadPost(squadId, user.id, 'check_in', {}, checkInText.trim())

      setCheckInText('')
      setShowCheckInInput(false)
      loadSquadData() // Refresh feed
    } catch (error) {
      console.error('Error posting check-in:', error)
    }
  }

  // TODO: Implement workout sharing from history
  // const handleShareWorkout = async (workoutId: string) => {
  //   if (!user) return
  //   try {
  //     await shareWorkoutToSquad(squadId, workoutId, user.id)
  //     loadSquadData()
  //   } catch (error) {
  //     console.error('Error sharing workout:', error)
  //   }
  // }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading squad...</p>
        </div>
      </div>
    )
  }

  if (!squad) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Squad niet gevonden</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Ga terug
          </button>
        </div>
      </div>
    )
  }

  const canManageSquad = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-white/5 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{squad.name}</h1>
                {squad.privacy === 'private' && (
                  <Lock size={16} className="text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users size={12} />
                {squad.member_count} {squad.member_count === 1 ? 'lid' : 'leden'}
              </p>
            </div>

            {canManageSquad && (
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <MoreVertical size={20} />
              </button>
            )}
          </div>

          {squad.description && (
            <p className="mt-3 text-sm text-muted-foreground">{squad.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowCheckInInput(!showCheckInInput)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-4 font-bold hover:opacity-90 transition-opacity"
          >
            <Activity size={20} />
            Check-in
          </button>
          
          <button
            onClick={() => router.push('/history')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-blue-500 text-white rounded-xl p-4 font-bold hover:opacity-90 transition-opacity"
          >
            <Dumbbell size={20} />
            Deel Workout
          </button>
        </div>

        {/* Check-in Input */}
        <AnimatePresence>
          {showCheckInInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-white/5 rounded-xl p-4 space-y-3"
            >
              <textarea
                value={checkInText}
                onChange={(e) => setCheckInText(e.target.value)}
                placeholder="Hoe ging je training? 💪"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {checkInText.length}/500
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCheckInInput(false)
                      setCheckInText('')
                    }}
                    className="px-4 py-2 text-sm text-muted-foreground hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Annuleer
                  </button>
                  <button
                    onClick={handleCheckIn}
                    disabled={!checkInText.trim()}
                    className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Plaats Check-in
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Members Preview */}
        <div className="bg-card border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold flex items-center gap-2">
              <Users size={18} className="text-primary" />
              Leden ({members.length})
            </h2>
            {canManageSquad && (
              <button className="flex items-center gap-1 text-sm text-primary hover:underline">
                <UserPlus size={16} />
                Uitnodigen
              </button>
            )}
          </div>

          <div className="space-y-2">
            {members.slice(0, 5).map((member) => (
              <div key={member.user_id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {member.avatar_url ? (
                    <img 
                      src={member.avatar_url} 
                      alt={member.username || 'User'} 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    (member.username || '?')[0].toUpperCase()
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {member.display_name || member.username || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">@{member.username || 'unknown'}</p>
                </div>

                <div className="flex items-center gap-1">
                  {member.role === 'owner' && (
                    <Crown size={16} className="text-amber-500" />
                  )}
                  {member.role === 'admin' && (
                    <Shield size={16} className="text-blue-500" />
                  )}
                </div>
              </div>
            ))}
            
            {members.length > 5 && (
              <button className="w-full text-sm text-primary hover:underline text-center py-2">
                Toon alle {members.length} leden
              </button>
            )}
          </div>
        </div>

        {/* Squad Feed */}
        <div className="space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Squad Feed
          </h2>

          {posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => (
                <SquadFeedPost
                  key={post.id}
                  post={post}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-white/5 rounded-xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-bold mb-1">Nog geen posts</p>
              <p className="text-sm text-muted-foreground">
                Wees de eerste om een check-in of workout te delen!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
