'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (authLoading || !user || hasChecked) return
    
    // Skip check for onboarding routes and login
    if (pathname?.startsWith('/onboarding') || pathname === '/login') {
      setHasChecked(true)
      return
    }

    // Check localStorage first to avoid repeated database queries
    const sessionKey = `onboarding_checked_${user.id}`
    const checked = sessionStorage.getItem(sessionKey)
    
    if (checked === 'true') {
      setHasChecked(true)
      return
    }
    
    const checkOnboarding = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profile')
          .select('age, height, weight')
          .eq('user_id', user.id)
          .maybeSingle()

        // Mark as checked regardless of result
        sessionStorage.setItem(sessionKey, 'true')
        setHasChecked(true)

        // If no profile, redirect to onboarding
        if (!profile || !profile.age || !profile.height || !profile.weight) {
          router.push('/onboarding/profile')
        }
      } catch (error) {
        console.error('Error checking onboarding:', error)
        setHasChecked(true)
      }
    }

    checkOnboarding()
  }, [user, authLoading, hasChecked, pathname, router])

  return <>{children}</>
}
