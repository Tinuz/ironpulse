'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, UserCheck, Search, TrendingUp, Dumbbell, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDistance } from 'date-fns'
import { nl } from 'date-fns/locale'

interface SocialProfile {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean
  total_workouts?: number
  achievement_count?: number
  workouts_last_30_days?: number
}

interface FriendActivity {
  workout_id: string
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  workout_name: string
  workout_date: string
  exercise_count: number
  duration_minutes: number
}

export default function Social() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'feed' | 'discover'>('feed')
  const [searchQuery, setSearchQuery] = useState('')
  const [following, setFollowing] = useState<SocialProfile[]>([])
  const [suggested, setSuggested] = useState<SocialProfile[]>([])
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSocialData()
    }
  }, [user])

  const loadSocialData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Load who current user is following
      const { data: followsData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingUserIds = followsData?.map(f => f.following_id) || []
      setFollowingIds(new Set(followingUserIds))

      // Load following profiles with stats
      if (followingUserIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('user_profile_stats')
          .select('*')
          .in('user_id', followingUserIds)
          .eq('is_public', true)

        setFollowing(followingProfiles || [])

        // Load friend activity feed
        const { data: activityData } = await supabase
          .from('friend_activity_feed')
          .select('*')
          .in('user_id', followingUserIds)
          .order('workout_date', { ascending: false })
          .limit(20)

        setFriendActivity(activityData || [])
      }

      // Load suggested users (public profiles not yet followed)
      let suggestedQuery = supabase
        .from('user_profile_stats')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', user.id)
        .order('total_workouts', { ascending: false })
        .limit(10)

      // Exclude users already followed
      if (followingUserIds.length > 0) {
        suggestedQuery = suggestedQuery.not('user_id', 'in', `(${followingUserIds.join(',')})`)
      }

      const { data: suggestedData } = await suggestedQuery

      setSuggested(suggestedData || [])

    } catch (error) {
      console.error('Error loading social data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string) => {
    if (!user) return

    try {
      await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        })

      setFollowingIds(prev => new Set(prev).add(userId))
      await loadSocialData() // Refresh
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleUnfollow = async (userId: string) => {
    if (!user) return

    try {
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId)

      setFollowingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      await loadSocialData() // Refresh
    } catch (error) {
      console.error('Error unfollowing user:', error)
    }
  }

  const filteredSuggested = suggested.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4">
        <h1 className="font-black text-2xl mb-4">Social</h1>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
              activeTab === 'feed'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={18} />
              Feed
            </div>
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
              activeTab === 'discover'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search size={18} />
              Discover
            </div>
          </button>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {activeTab === 'feed' ? (
          <>
            {/* Following Section */}
            {following.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  Volgt ({following.length})
                </h3>
                
                <div className="grid gap-3">
                  {following.map(profile => (
                    <UserCard
                      key={profile.user_id}
                      profile={profile}
                      isFollowing={true}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                      onViewProfile={() => router.push(`/profile/${profile.username}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Friend Activity Feed */}
            {friendActivity.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-500" />
                  Recent Activity
                </h3>
                
                <div className="space-y-3">
                  {friendActivity.map(activity => (
                    <ActivityCard key={activity.workout_id} activity={activity} router={router} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-bold text-lg mb-2">Nog geen activiteit</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Volg vrienden om hun workouts te zien
                </p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Ontdek Gebruikers
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Zoek gebruikers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Suggested Users */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus size={20} className="text-primary" />
                Ontdek
              </h3>
              
              {filteredSuggested.length > 0 ? (
                <div className="grid gap-3">
                  {filteredSuggested.map(profile => (
                    <UserCard
                      key={profile.user_id}
                      profile={profile}
                      isFollowing={followingIds.has(profile.user_id)}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                      onViewProfile={() => router.push(`/profile/${profile.username}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Geen gebruikers gevonden' : 'Geen suggesties beschikbaar'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// User Card Component
function UserCard({
  profile,
  isFollowing,
  onFollow,
  onUnfollow,
  onViewProfile
}: {
  profile: SocialProfile
  isFollowing: boolean
  onFollow: (userId: string) => void
  onUnfollow: (userId: string) => void
  onViewProfile: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          onClick={onViewProfile}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xl cursor-pointer hover:scale-105 transition-transform"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={onViewProfile}>
          <h4 className="font-bold truncate cursor-pointer hover:text-primary transition-colors">
            {profile.display_name || profile.username}
          </h4>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{profile.bio}</p>
          )}
        </div>

        {/* Follow Button */}
        <button
          onClick={() => isFollowing ? onUnfollow(profile.user_id) : onFollow(profile.user_id)}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            isFollowing
              ? 'bg-white/10 text-foreground hover:bg-white/20'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isFollowing ? (
            <div className="flex items-center gap-1">
              <UserCheck size={16} />
              Volgt
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <UserPlus size={16} />
              Volg
            </div>
          )}
        </button>
      </div>

      {/* Stats */}
      {profile.total_workouts !== undefined && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs">
          <div>
            <span className="font-bold text-primary">{profile.total_workouts}</span>
            <span className="text-muted-foreground ml-1">workouts</span>
          </div>
          <div>
            <span className="font-bold text-green-500">{profile.workouts_last_30_days || 0}</span>
            <span className="text-muted-foreground ml-1">last 30d</span>
          </div>
          <div>
            <span className="font-bold text-amber-500">{profile.achievement_count || 0}</span>
            <span className="text-muted-foreground ml-1">badges</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Activity Card Component
function ActivityCard({ activity, router }: { activity: FriendActivity; router: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => router.push(`/workout/${activity.workout_id}`)}
      className="bg-card border border-white/5 rounded-xl p-4 hover:border-green-500/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold flex-shrink-0">
          {activity.avatar_url ? (
            <img src={activity.avatar_url} alt={activity.username} className="w-full h-full rounded-full object-cover" />
          ) : (
            activity.username[0].toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm group-hover:text-green-500 transition-colors">
              {activity.display_name || activity.username}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-muted-foreground text-xs">
              {formatDistance(new Date(activity.workout_date), new Date(), { addSuffix: true, locale: nl })}
            </span>
          </div>

          {/* Workout Info */}
          <p className="font-bold mb-2">{activity.workout_name}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Dumbbell size={14} className="text-primary" />
              {activity.exercise_count} exercises
            </div>
            {activity.duration_minutes > 0 && (
              <div>
                ⏱️ {Math.round(activity.duration_minutes)} min
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
