'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PlusSquare, Dumbbell, History as HistoryIcon, User, Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useData } from '@/components/context/DataContext'

export default function Navigation() {
  const { activeWorkout, startWorkout } = useData()
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dash' },
    { path: '/schema', icon: PlusSquare, label: 'Build' },
    { path: '/workout', icon: Dumbbell, label: 'Work', highlight: !!activeWorkout, requiresWorkout: true },
    { path: '/trainer', icon: Bot, label: 'Coach', special: true },
    { path: '/history', icon: HistoryIcon, label: 'Logs' },
    { path: '/progress', icon: User, label: 'Me' },
  ]

  const handleWorkoutClick = (e: React.MouseEvent) => {
    if (!activeWorkout) {
      e.preventDefault()
      // Start a quick freestyle workout
      startWorkout()
      router.push('/workout')
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-border pb-safe-area shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 md:h-20 max-w-2xl mx-auto px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path.startsWith('/workout') && pathname.startsWith('/workout'))
          
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={item.requiresWorkout ? handleWorkoutClick : undefined}
              className={clsx(
                "relative flex flex-col items-center justify-center w-full h-full transition-colors duration-200 group",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                item.highlight && "text-primary font-bold",
                item.special && !isActive && "text-purple-400"
              )}
            >
              <div className={clsx(
                "p-1 rounded-xl transition-all duration-300",
                item.highlight && isActive && "bg-primary/20 scale-110",
                item.highlight && !isActive && "animate-pulse text-primary",
                item.special && isActive && "bg-purple-500/20 text-purple-400"
              )}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[9px] uppercase tracking-wider mt-1 font-medium opacity-80 scale-90 sm:scale-100">
                {item.label}
              </span>
              
              {isActive && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-10 h-[2px] bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
