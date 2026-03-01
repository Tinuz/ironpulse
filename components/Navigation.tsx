'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Dumbbell, Play, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useLanguage } from '@/components/context/LanguageContext'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Navigation() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    loadUnreadCount()

    const batterySaverMode = localStorage.getItem('battery_saver_mode') === 'true'

    if (batterySaverMode) {
      // Battery saver: refresh on window focus instead of keeping a WebSocket alive
      const handleFocus = () => loadUnreadCount()
      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }

    // Normal mode: real-time Supabase subscription
    const channel = supabase
      .channel('reaction-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workout_reactions'
      }, () => {
        loadUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const loadUnreadCount = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('get_unread_reaction_count', { user_id_param: user.id })

      if (!error && data !== null) {
        setUnreadCount(data)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handleSocialClick = async () => {
    if (!user) return

    // Mark notifications as read when clicking Social tab
    if (pathname !== '/social') {
      await supabase
        .from('user_notification_state')
        .upsert({
          user_id: user.id,
          last_checked_reactions: new Date().toISOString()
        })
      
      setUnreadCount(0)
    }
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: language === 'nl' ? 'Dash' : 'Dash' },
    { path: '/exercises', icon: Dumbbell, label: language === 'nl' ? 'Exercises' : 'Exercises' },
    { path: '/play', icon: Play, label: 'PLAY', isCenter: true },
    { path: '/social', icon: Users, label: language === 'nl' ? 'Social' : 'Social' },
    { path: '/progress', icon: User, label: language === 'nl' ? 'Me' : 'Me' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/98 backdrop-blur-xl border-t border-border-default pb-safe-area shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center h-16 md:h-20 max-w-2xl mx-auto px-2 relative">
        {/* Left side - 2 items */}
        <div className="flex flex-1 justify-around">
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.path || (item.path === '/play' && pathname === '/')
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={clsx(
                  "relative flex flex-col items-center justify-center w-full h-full transition-colors duration-200 group",
                  isActive ? "text-accent-primary" : "text-txt-tertiary hover:text-txt-primary"
                )}
              >
                <div className={clsx(
                  "p-1 rounded-professional transition-all duration-300"
                )}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] uppercase tracking-wider mt-1.5 font-semibold">
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(211,47,47,0.6)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Center PLAY button */}
        <div className="flex-shrink-0 px-4">
          {(() => {
            const item = navItems[2]
            
            return (
              <Link
                href={item.path}
                className="relative flex flex-col items-center justify-center h-full"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary text-txt-primary transition-all duration-300 hover:scale-105 hover:bg-accent-secondary shadow-elevated">
                  <item.icon size={24} fill="currentColor" strokeWidth={2} />
                </div>
              </Link>
            )
          })()}
        </div>

        {/* Right side - 2 items */}
        <div className="flex flex-1 justify-around">
          {navItems.slice(3).map((item) => {
            const isActive = pathname === item.path
            const isSocial = item.path === '/social'
            
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={isSocial ? handleSocialClick : undefined}
                className={clsx(
                  "relative flex flex-col items-center justify-center w-full h-full transition-colors duration-200 group",
                  isActive ? "text-accent-primary" : "text-txt-tertiary hover:text-txt-primary"
                )}
              >
                <div className={clsx(
                  "relative p-1 rounded-professional transition-all duration-300"
                )}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  
                  {/* Notification Badge */}
                  {isSocial && unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-accent-primary rounded-full flex items-center justify-center shadow-card"
                    >
                      <span className="text-[9px] font-bold text-txt-primary leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </motion.div>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider mt-1.5 font-semibold">
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(211,47,47,0.6)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}