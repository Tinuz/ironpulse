import { supabase } from './supabase'

export interface MatchableUser {
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

export interface UserPreferences {
  age?: number
  goal?: string
  experience?: string
  totalWorkouts?: number
  workoutsLast30Days?: number
}

interface ScoredUser extends MatchableUser {
  matchScore: number
  matchReasons: string[]
}

/**
 * Calculate compatibility score between two users
 * Score ranges from 0-100
 */
function calculateMatchScore(
  currentUser: UserPreferences,
  targetUser: MatchableUser & { age?: number; goal?: string; experience?: string }
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Base score for being active (has workouts)
  if (targetUser.total_workouts && targetUser.total_workouts > 0) {
    score += 10
  }

  // Goal alignment (25 points)
  if (currentUser.goal && targetUser.goal && currentUser.goal === targetUser.goal) {
    score += 25
    reasons.push(`Hetzelfde doel: ${getGoalLabel(currentUser.goal)}`)
  }

  // Experience level match (20 points)
  if (currentUser.experience && targetUser.experience) {
    if (currentUser.experience === targetUser.experience) {
      score += 20
      reasons.push(`Zelfde ervaring: ${getExperienceLabel(currentUser.experience)}`)
    } else {
      // Partial points for adjacent levels
      const levels = ['beginner', 'intermediate', 'advanced']
      const currentIdx = levels.indexOf(currentUser.experience)
      const targetIdx = levels.indexOf(targetUser.experience)
      if (Math.abs(currentIdx - targetIdx) === 1) {
        score += 10
        reasons.push(`Vergelijkbare ervaring`)
      }
    }
  }

  // Age proximity (15 points)
  if (currentUser.age && targetUser.age) {
    const ageDiff = Math.abs(currentUser.age - targetUser.age)
    if (ageDiff <= 5) {
      score += 15
      reasons.push(`Vergelijkbare leeftijd`)
    } else if (ageDiff <= 10) {
      score += 10
    } else if (ageDiff <= 15) {
      score += 5
    }
  }

  // Activity level match (15 points)
  if (currentUser.workoutsLast30Days && targetUser.workouts_last_30_days) {
    const diff = Math.abs(currentUser.workoutsLast30Days - targetUser.workouts_last_30_days)
    if (diff <= 3) {
      score += 15
      reasons.push(`Vergelijkbare trainingsfrequentie`)
    } else if (diff <= 6) {
      score += 10
    } else if (diff <= 10) {
      score += 5
    }
  }

  // Bonus for very active users (10 points)
  if (targetUser.workouts_last_30_days && targetUser.workouts_last_30_days >= 12) {
    score += 10
    reasons.push(`Zeer actief (${targetUser.workouts_last_30_days} workouts/maand)`)
  }

  // Bonus for users with achievements (5 points)
  if (targetUser.achievement_count && targetUser.achievement_count > 0) {
    score += 5
  }

  return { score, reasons }
}

function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    'strength': 'Kracht opbouwen',
    'muscle': 'Spiergroei',
    'endurance': 'Uithoudingsvermogen',
    'weight-loss': 'Afvallen',
    'general-fitness': 'Algemene fitness'
  }
  return labels[goal] || goal
}

function getExperienceLabel(experience: string): string {
  const labels: Record<string, string> = {
    'beginner': 'Beginner',
    'intermediate': 'Gemiddeld',
    'advanced': 'Gevorderd'
  }
  return labels[experience] || experience
}

/**
 * Get personalized user suggestions based on profile similarity
 */
export async function getSmartUserSuggestions(
  currentUserId: string,
  limit: number = 10
): Promise<ScoredUser[]> {
  try {
    // Get current user's preferences from onboarding drafts and profile
    const draftStr = localStorage.getItem('ft_onboarding_draft')
    const draft = draftStr ? JSON.parse(draftStr) : {}
    
    const { data: profileData } = await supabase
      .from('user_profile')
      .select('age')
      .eq('user_id', currentUserId)
      .single()

    const { data: workoutData } = await supabase
      .from('workout_history')
      .select('id, date')
      .eq('user_id', currentUserId)

    const workoutsLast30Days = workoutData?.filter(w => {
      const workoutDate = new Date(w.date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return workoutDate >= thirtyDaysAgo
    }).length || 0

    const currentUserPrefs: UserPreferences = {
      age: profileData?.age,
      goal: draft.profileDraft?.goal,
      experience: draft.profileDraft?.experience,
      totalWorkouts: workoutData?.length || 0,
      workoutsLast30Days
    }

    // Get users already followed
    const { data: followsData } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId)

    const followingUserIds = followsData?.map(f => f.following_id) || []

    // Get all public user profiles with additional data
    const { data: users } = await supabase
      .from('user_profile_stats')
      .select('*')
      .eq('is_public', true)
      .neq('user_id', currentUserId)

    if (!users || users.length === 0) {
      return []
    }

    // Filter out already followed users client-side
    const followingSet = new Set(followingUserIds)
    const unfollowedUsers = users.filter(u => !followingSet.has(u.user_id))

    // Get additional profile data for each user
    const userIds = unfollowedUsers.map(u => u.user_id)
    const { data: profiles } = await supabase
      .from('user_profile')
      .select('user_id, age')
      .in('user_id', userIds)

    // Get onboarding data (stored in localStorage, but we'll try to infer from their workout patterns)
    // For now, we'll score based on available data
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

    // Score each user
    const scoredUsers: ScoredUser[] = unfollowedUsers.map(user => {
      const profile = profileMap.get(user.user_id)
      const userWithProfile = {
        ...user,
        age: profile?.age,
        // We don't have goal/experience in DB yet, so score based on activity
      }

      const { score, reasons } = calculateMatchScore(currentUserPrefs, userWithProfile)

      return {
        ...user,
        matchScore: score,
        matchReasons: reasons
      }
    })

    // Sort by score (highest first) and limit
    return scoredUsers
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)

  } catch (error) {
    console.error('Error getting smart suggestions:', error)
    return []
  }
}

/**
 * Get users with similar workout patterns (friends of friends logic)
 */
export async function getFriendsOfFriends(
  currentUserId: string,
  limit: number = 5
): Promise<MatchableUser[]> {
  try {
    // Get who current user follows
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId)

    if (!following || following.length === 0) {
      return []
    }

    const followingIds = following.map(f => f.following_id)

    // Get who THEY follow (friends of friends)
    const { data: friendsOfFriends } = await supabase
      .from('user_follows')
      .select('following_id, user_profile_stats(*)')
      .in('follower_id', followingIds)

    if (!friendsOfFriends) {
      return []
    }

    // Filter out current user and already followed users client-side
    const followingSet = new Set([currentUserId, ...followingIds])
    const filteredFoF = friendsOfFriends.filter(fof => !followingSet.has(fof.following_id))

    // Count how many mutual friends each suggestion has
    const suggestionCounts = new Map<string, { count: number; profile: any }>()

    filteredFoF.forEach(fof => {
      const userId = fof.following_id
      const existing = suggestionCounts.get(userId)
      if (existing) {
        existing.count++
      } else {
        suggestionCounts.set(userId, {
          count: 1,
          profile: fof.user_profile_stats
        })
      }
    })

    // Sort by number of mutual friends
    return Array.from(suggestionCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([_, data]) => data.profile)
      .filter(Boolean)

  } catch (error) {
    console.error('Error getting friends of friends:', error)
    return []
  }
}
