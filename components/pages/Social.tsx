'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, UserCheck, Search, TrendingUp, Dumbbell, X, Plus, Sparkles, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { formatDistance } from 'date-fns'
import { nl } from 'date-fns/locale'
import { getUserSquads, Squad } from '@/lib/squads'
import SquadCard from '@/components/SquadCard'
import CreateSquadModal from '@/components/CreateSquadModal'
import { getSmartUserSuggestions, getFriendsOfFriends } from '@/lib/userMatching'

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
  matchScore?: number
  matchReasons?: string[]
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
  const { t } = useLanguage()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'feed' | 'squads' | 'discover'>('feed')
  const [searchQuery, setSearchQuery] = useState('')
  const [following, setFollowing] = useState<SocialProfile[]>([])
  const [suggested, setSuggested] = useState<SocialProfile[]>([])
  const [friendsOfFriends, setFriendsOfFriends] = useState<SocialProfile[]>([])
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // Squads state
  const [squads, setSquads] = useState<Squad[]>([])
  const [createSquadModalOpen, setCreateSquadModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadSocialData()
    }
  }, [user])

  const loadSocialData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Load user's squads
      const userSquads = await getUserSquads(user.id)
      setSquads(userSquads)
      
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

      // Load smart suggestions based on profile similarity
      const smartSuggestions = await getSmartUserSuggestions(user.id, 10)
      setSuggested(smartSuggestions)

      // Load friends of friends
      const fofSuggestions = await getFriendsOfFriends(user.id, 5)
      setFriendsOfFriends(fofSuggestions)

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
        <div className="text-muted-foreground">{t.common.loading}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4">
        <h1 className="font-black text-2xl mb-4">{t.social.title}</h1>
        
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
              {t.social.feed}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('squads')}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
              activeTab === 'squads'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={18} />
              {t.social.squads}
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
              {t.social.discover}
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
                  {t.social.following} ({following.length})
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
                      t={t}
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
                  {t.social.recentActivity}
                </h3>
                
                <div className="space-y-3">
                  {friendActivity.map(activity => (
                    <ActivityCard key={activity.workout_id} activity={activity} router={router} t={t} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-bold text-lg mb-2">{t.social.noActivity}</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t.social.followFriendsMessage}
                </p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  {t.social.discoverUsers}
                </button>
              </div>
            )}
          </>
        ) : activeTab === 'squads' ? (
          <>
            {/* Squads Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  {t.social.mySquads} ({squads.length})
                </h3>
                <button
                  onClick={() => setCreateSquadModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-bold rounded-lg hover:scale-105 transition-transform"
                >
                  <Plus size={18} />
                  {t.social.newSquad}
                </button>
              </div>

              {squads.length > 0 ? (
                <div className="space-y-3">
                  {squads.map(squad => (
                    <SquadCard key={squad.id} squad={squad} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card border border-white/5 rounded-xl">
                  <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t.social.noSquads}</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                    {t.social.noSquadsMessage}
                  </p>
                  <button
                    onClick={() => setCreateSquadModalOpen(true)}
                    className="px-6 py-3 bg-primary text-background rounded-lg font-bold hover:scale-105 transition-transform inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    {t.social.createFirstSquad}
                  </button>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-transparent border border-primary/20 rounded-xl p-4">
              <h4 className="font-bold text-sm mb-2">{t.social.squadsInfoTitle}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {t.social.squadsInfoDescription}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white/10 rounded">{t.social.privateGroups}</span>
                <span className="px-2 py-1 bg-white/10 rounded">{t.social.inviteOnly}</span>
                <span className="px-2 py-1 bg-white/10 rounded">{t.social.shareCheckins}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t.social.searchPlaceholder}
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
              {/* Smart Suggestions Section */}
              {suggested.length > 0 && (
                <>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    Aanbevolen voor jou
                  </h3>
                  <div className="grid gap-3">
                    {filteredSuggested.slice(0, 5).map(profile => (
                      <UserCard
                        key={profile.user_id}
                        profile={profile}
                        isFollowing={followingIds.has(profile.user_id)}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                        onViewProfile={() => router.push(`/profile/${profile.username}`)}
                        showMatchScore={true}
                        t={t}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Friends of Friends Section */}
              {friendsOfFriends.length > 0 && (
                <>
                  <h3 className="text-lg font-bold flex items-center gap-2 mt-6">
                    <Users size={20} className="text-blue-500" />
                    Mensen die je vrienden volgen
                  </h3>
                  <div className="grid gap-3">
                    {friendsOfFriends.map(profile => (
                      <UserCard
                        key={profile.user_id}
                        profile={profile}
                        isFollowing={followingIds.has(profile.user_id)}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                        onViewProfile={() => router.push(`/profile/${profile.username}`)}
                        showMatchScore={false}
                        t={t}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* More users to discover */}
              {filteredSuggested.length > 5 && (
                <>
                  <h3 className="text-lg font-bold flex items-center gap-2 mt-6">
                    <UserPlus size={20} className="text-primary" />
                    Meer ontdekken
                  </h3>
                  <div className="grid gap-3">
                    {filteredSuggested.slice(5).map(profile => (
                      <UserCard
                        key={profile.user_id}
                        profile={profile}
                        isFollowing={followingIds.has(profile.user_id)}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                        onViewProfile={() => router.push(`/profile/${profile.username}`)}
                        showMatchScore={false}
                        t={t}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* No results */}
              {filteredSuggested.length === 0 && friendsOfFriends.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {searchQuery ? t.social.noUsersFound : 'Geen gebruikers gevonden'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Squad Modal */}
      <CreateSquadModal
        isOpen={createSquadModalOpen}
        onClose={() => setCreateSquadModalOpen(false)}
        onSuccess={(_squad) => {
          setCreateSquadModalOpen(false)
          loadSocialData() // Refresh squads list
        }}
      />
    </div>
  )
}

// User Card Component
function UserCard({
  profile,
  isFollowing,
  onFollow,
  onUnfollow,
  onViewProfile,
  showMatchScore = false,
  t
}: {
  profile: SocialProfile
  isFollowing: boolean
  onFollow: (userId: string) => void
  onUnfollow: (userId: string) => void
  onViewProfile: () => void
  showMatchScore?: boolean
  t: any
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          onClick={onViewProfile}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xl cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div onClick={onViewProfile} className="cursor-pointer">
            <h4 className="font-bold truncate hover:text-primary transition-colors">
              {profile.display_name || profile.username}
            </h4>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
            )}
          </div>

          {/* Match Score & Reasons */}
          {showMatchScore && profile.matchScore !== undefined && profile.matchScore > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-bold text-primary">
                  <Target size={12} />
                  {profile.matchScore}% match
                </div>
              </div>
              {profile.matchReasons && profile.matchReasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profile.matchReasons.slice(0, 2).map((reason, idx) => (
                    <span key={idx} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {profile.total_workouts !== undefined && (
              <div className="flex items-center gap-1">
                <Dumbbell size={12} />
                {profile.total_workouts} workouts
              </div>
            )}
            {profile.workouts_last_30_days !== undefined && profile.workouts_last_30_days > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp size={12} />
                {profile.workouts_last_30_days}/maand
              </div>
            )}
          </div>
        </div>

        {/* Follow Button */}
        <button
          onClick={() => isFollowing ? onUnfollow(profile.user_id) : onFollow(profile.user_id)}
          className={`px-4 py-2 rounded-lg font-bold transition-colors flex-shrink-0 ${
            isFollowing
              ? 'bg-white/10 text-foreground hover:bg-white/20'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isFollowing ? (
            <div className="flex items-center gap-1">
              <UserCheck size={16} />
              {t.social.following}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <UserPlus size={16} />
              {t.social.follow}
            </div>
          )}
        </button>
      </div>

      {/* Stats */}
      {profile.total_workouts !== undefined && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs">
          <div>
            <span className="font-bold text-primary">{profile.total_workouts}</span>
            <span className="text-muted-foreground ml-1">{t.social.workouts}</span>
          </div>
          <div>
            <span className="font-bold text-green-500">{profile.workouts_last_30_days || 0}</span>
            <span className="text-muted-foreground ml-1">{t.social.last30d}</span>
          </div>
          <div>
            <span className="font-bold text-amber-500">{profile.achievement_count || 0}</span>
            <span className="text-muted-foreground ml-1">{t.social.badges}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Activity Card Component
function ActivityCard({ activity, router, t }: { activity: FriendActivity; router: any; t: any }) {
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
              {activity.exercise_count} {t.social.exercises}
            </div>
            {activity.duration_minutes > 0 && (
              <div>
                ⏱️ {Math.round(activity.duration_minutes)} {t.social.min}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
