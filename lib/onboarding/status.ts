import { supabase } from '@/lib/supabase'

export interface OnboardingStatus {
  user_id: string
  profile_completed: boolean
  first_workout_completed: boolean
  tour_completed: boolean
  current_phase: 'profile' | 'workout' | 'tour' | 'completed'
  updated_at: string
}

export interface OnboardingDraft {
  profileDraft?: {
    age?: number
    height_cm?: number
    weight_kg?: number
    goal?: string
    experience?: string
    session_minutes?: number
  }
  workoutDraft?: {
    planType?: string
    duration?: number
    focus?: string
  }
  lastUpdatedAt?: string
}

const ONBOARDING_DRAFT_KEY = 'onboarding_draft_v1'

/**
 * Check if profile has all required fields
 */
export function isProfileComplete(profile: any): boolean {
  if (!profile) return false
  
  const requiredFields = ['age', 'height_cm', 'weight_kg']
  return requiredFields.every(field => {
    const value = profile[field]
    return value !== null && value !== undefined && value !== ''
  })
}

/**
 * Get onboarding status for user
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
  const { data, error } = await supabase
    .from('onboarding_status')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching onboarding status:', error)
    return null
  }

  return data
}

/**
 * Initialize onboarding status for new user
 */
export async function initializeOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
  const { data, error } = await supabase
    .from('onboarding_status')
    .upsert({
      user_id: userId,
      profile_completed: false,
      first_workout_completed: false,
      tour_completed: false,
      current_phase: 'profile'
    })
    .select()
    .single()

  if (error) {
    console.error('Error initializing onboarding:', error)
    return null
  }

  return data
}

/**
 * Update onboarding status
 */
export async function updateOnboardingStatus(
  userId: string,
  updates: Partial<Omit<OnboardingStatus, 'user_id' | 'updated_at'>>
): Promise<OnboardingStatus | null> {
  const { data, error } = await supabase
    .from('onboarding_status')
    .upsert({
      user_id: userId,
      ...updates
    })
    .select()
    .single()

  if (error) {
    console.error('Error updating onboarding status:', error)
    return null
  }

  return data
}

/**
 * Determine next onboarding route based on status
 */
export function getNextOnboardingRoute(status: OnboardingStatus | null): string {
  if (!status) return '/onboarding/profile'
  
  if (!status.profile_completed) return '/onboarding/profile'
  if (!status.first_workout_completed) return '/onboarding/workout'
  if (!status.tour_completed) return '/onboarding/tour'
  
  return '/app'
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(status: OnboardingStatus | null): boolean {
  if (!status) return false
  return status.profile_completed && status.first_workout_completed && status.tour_completed
}

/**
 * Save draft to localStorage
 */
export function saveOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === 'undefined') return
  
  try {
    const existingDraft = getOnboardingDraft()
    const updatedDraft = {
      ...existingDraft,
      ...draft,
      lastUpdatedAt: new Date().toISOString()
    }
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(updatedDraft))
  } catch (error) {
    console.error('Error saving onboarding draft:', error)
  }
}

/**
 * Get draft from localStorage
 */
export function getOnboardingDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return {}
  
  try {
    const draft = localStorage.getItem(ONBOARDING_DRAFT_KEY)
    return draft ? JSON.parse(draft) : {}
  } catch (error) {
    console.error('Error getting onboarding draft:', error)
    return {}
  }
}

/**
 * Clear onboarding draft
 */
export function clearOnboardingDraft(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY)
  } catch (error) {
    console.error('Error clearing onboarding draft:', error)
  }
}

/**
 * Log onboarding event (telemetry)
 */
export async function logOnboardingEvent(
  userId: string,
  eventType: string,
  eventData?: any
): Promise<void> {
  try {
    await supabase
      .from('onboarding_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData || {}
      })
  } catch (error) {
    console.error('Error logging onboarding event:', error)
  }
}
