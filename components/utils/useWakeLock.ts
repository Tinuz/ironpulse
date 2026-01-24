import { useEffect, useRef } from 'react'

const isDev = process.env.NODE_ENV === 'development'

/**
 * Screen Wake Lock Hook
 * Keeps the screen awake during active workouts
 * 
 * Usage:
 * const { requestWakeLock, releaseWakeLock } = useWakeLock();
 * 
 * requestWakeLock() when workout starts
 * releaseWakeLock() when workout ends
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const requestWakeLock = async () => {
    try {
      // Check if Wake Lock API is supported
      if ('wakeLock' in navigator) {
        // Release any existing wake lock first
        if (wakeLockRef.current) {
          await wakeLockRef.current.release()
        }

        // Request new wake lock
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        
        if (isDev) {
          console.log('✅ Screen Wake Lock activated')
        }

        // Handle wake lock release (e.g., when tab becomes hidden)
        wakeLockRef.current.addEventListener('release', () => {
          if (isDev) {
            console.log('🔓 Screen Wake Lock released')
          }
        })
      } else {
        console.warn('⚠️ Wake Lock API not supported in this browser')
      }
    } catch (err) {
      console.error('❌ Failed to activate Wake Lock:', err)
    }
  }

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        if (isDev) {
          console.log('🔓 Screen Wake Lock manually released')
        }
      }
    } catch (err) {
      console.error('❌ Failed to release Wake Lock:', err)
    }
  }

  // Re-acquire wake lock when page becomes visible again (if it was active)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [])

  return {
    requestWakeLock,
    releaseWakeLock,
    isActive: wakeLockRef.current !== null
  }
}
