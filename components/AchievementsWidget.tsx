'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Target, TrendingUp } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { 
  checkAchievements, 
  getRecentlyUnlocked,
  getNextAchievements,
  ALL_ACHIEVEMENTS 
} from '@/components/utils/achievementEngine'

export default function AchievementsWidget() {
  const { history, achievements: unlockedAchievementIds } = useData()
  
  if (history.length === 0) return null
  
  // Get achievement progress
  const achievementProgress = checkAchievements(history, unlockedAchievementIds)
  
  // Get unlocked achievements with dates
  const unlockedAchievements = ALL_ACHIEVEMENTS
    .filter(a => unlockedAchievementIds.includes(a.id))
    .map(a => ({
      ...a,
      unlockedAt: new Date() // This will be properly set from context
    }))
  
  const recentlyUnlocked = getRecentlyUnlocked(unlockedAchievements, 5)
  const nextAchievements = getNextAchievements(achievementProgress, 3)
  
  const totalAchievements = ALL_ACHIEVEMENTS.length
  const unlockedCount = unlockedAchievementIds.length
  const completionPercentage = Math.round((unlockedCount / totalAchievements) * 100)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20 rounded-2xl p-6 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Trophy size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-lg">Achievements</h3>
            <p className="text-xs text-muted-foreground">
              {unlockedCount} / {totalAchievements} unlocked ({completionPercentage}%)
            </p>
          </div>
        </div>
        
        {/* Completion Ring */}
        <div className="relative w-12 h-12">
          <svg className="transform -rotate-90" width="48" height="48">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-white/10"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="url(#achievement-gradient)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPercentage / 100)}`}
              className="transition-all duration-500"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="achievement-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-purple-400">{completionPercentage}%</span>
          </div>
        </div>
      </div>
      
      {/* Recently Unlocked */}
      {recentlyUnlocked.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-purple-400" />
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Recent Unlocks
            </h4>
          </div>
          <div className="space-y-2">
            {recentlyUnlocked.map((achievement) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10"
              >
                <span className="text-2xl">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm leading-tight truncate">{achievement.name}</h5>
                  <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  achievement.category === 'milestone' ? 'bg-blue-500/20 text-blue-400' :
                  achievement.category === 'streak' ? 'bg-orange-500/20 text-orange-400' :
                  achievement.category === 'pr' ? 'bg-green-500/20 text-green-400' :
                  achievement.category === 'volume' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-pink-500/20 text-pink-400'
                }`}>
                  {achievement.category}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Next Achievements */}
      {nextAchievements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-pink-400" />
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Up Next
            </h4>
          </div>
          <div className="space-y-3">
            {nextAchievements.map((progress) => (
              <div key={progress.achievement.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{progress.achievement.icon}</span>
                    <div>
                      <h5 className="font-bold text-sm leading-tight">{progress.achievement.name}</h5>
                      <p className="text-xs text-muted-foreground">{progress.achievement.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-primary">
                      {progress.percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  />
                </div>
                
                <div className="text-xs text-muted-foreground font-mono">
                  {Math.floor(progress.current).toLocaleString()} / {progress.target.toLocaleString()}
                  {progress.achievement.category === 'volume' ? ' kg' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {recentlyUnlocked.length === 0 && nextAchievements.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp size={48} className="mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-bold text-muted-foreground">Start training to unlock achievements!</p>
        </div>
      )}
    </motion.div>
  )
}
