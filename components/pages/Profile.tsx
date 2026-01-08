'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Dumbbell, Trophy, UserPlus, UserCheck } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  user_id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_public: boolean
  show_workouts: boolean
  total_workouts: number
  workouts_last_30_days: number
  achievement_count: number
  last_workout_date: string | null
}

interface WorkoutHistoryItem {
  id: string
  name: string
  date: string
  start_time: number
  end_time: number | null
  exercises: any[]
  total_calories: number | null
}

export default function Profile() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  
  // Get username from URL path (e.g., /profile/username)
  const username = pathname.split('/profile/')[1]

  useEffect(() => {
    if (user && username) {
      loadProfile()
    }
  }, [user, username])

  const loadProfile = async () => {
    if (!user || !username) return

    setLoading(true)
    try {
      // Load profile with stats
      const { data: profileData, error: profileError } = await supabase
        .from('user_profile_stats')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError

      if (profileData) {
        setProfile(profileData)
        setIsOwnProfile(user.id === profileData.user_id)

        // Check if following
        if (user.id !== profileData.user_id) {
          const { data: followData } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profileData.user_id)
            .single()

          setIsFollowing(!!followData)
        }

        // Load user's workouts (if public or own profile)
        if (profileData.is_public || profileData.show_workouts || user.id === profileData.user_id) {
          const { data: workoutsData } = await supabase
            .from('workout_history')
            .select('*')
            .eq('user_id', profileData.user_id)
            .order('date', { ascending: false })
            .limit(20)

          setWorkouts(workoutsData || [])
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!user || !profile || isOwnProfile) return

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.user_id)
        setIsFollowing(false)
      } else {
        // Follow
        await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: profile.user_id
          })
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
          <Calendar size={40} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic">USER NOT FOUND</h1>
          <p className="text-muted-foreground mt-2">This profile doesn't exist or is private.</p>
        </div>
        <button 
          onClick={() => router.push('/social')}
          className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
        >
          Back to Social
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Profile</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black italic">
                {profile.display_name || profile.username}
              </h2>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm mt-2">{profile.bio}</p>
              )}

              {/* Follow Button (not for own profile) */}
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  className={`mt-4 px-6 py-2 rounded-full font-bold transition-colors ${
                    isFollowing
                      ? 'bg-white/10 text-foreground hover:bg-white/20'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isFollowing ? (
                    <div className="flex items-center gap-2">
                      <UserCheck size={18} />
                      Volgt
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus size={18} />
                      Volg
                    </div>
                  )}
                </button>
              )}

              {isOwnProfile && (
                <button
                  onClick={() => router.push('/settings')}
                  className="mt-4 px-6 py-2 rounded-full bg-white/10 text-foreground hover:bg-white/20 font-bold transition-colors"
                >
                  Bewerk Profiel
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
            <div className="text-center">
              <div className="text-2xl font-black text-primary">{profile.total_workouts || 0}</div>
              <div className="text-xs text-muted-foreground uppercase">Workouts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-green-500">{profile.workouts_last_30_days || 0}</div>
              <div className="text-xs text-muted-foreground uppercase">Last 30d</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-amber-500">{profile.achievement_count || 0}</div>
              <div className="text-xs text-muted-foreground uppercase">Badges</div>
            </div>
          </div>
        </motion.div>

        {/* Workouts */}
        {(profile.show_workouts || isOwnProfile) && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black italic">Recent Workouts</h3>
            </div>

            {workouts.length === 0 ? (
              <div className="bg-card border border-white/5 rounded-2xl p-8 text-center">
                <Dumbbell size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No workouts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workouts.map((workout, i) => {
                  const duration = workout.end_time 
                    ? Math.round((workout.end_time - workout.start_time) / 1000 / 60) 
                    : 0
                  const totalSets = workout.exercises.reduce(
                    (acc: number, ex: any) => acc + ex.sets.filter((s: any) => s.completed).length, 
                    0
                  )
                  const volume = workout.exercises.reduce(
                    (acc: number, ex: any) => 
                      acc + ex.sets.filter((s: any) => s.completed).reduce((sAcc: number, s: any) => sAcc + (s.weight * s.reps), 0),
                    0
                  )

                  return (
                    <motion.div
                      key={workout.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => router.push(`/workout/${workout.id}`)}
                      className="bg-card border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-lg">{workout.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(workout.date), 'MMM d, yyyy')}
                        </p>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Dumbbell size={14} className="text-primary" />
                          {totalSets} sets
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Trophy size={14} className="text-amber-500" />
                          {(volume / 1000).toFixed(1)}k volume
                        </div>
                        {duration > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            ⏱️ {duration}m
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
