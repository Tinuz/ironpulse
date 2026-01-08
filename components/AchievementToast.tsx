'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { Achievement } from '@/components/utils/achievementEngine'

interface AchievementToastProps {
  achievement: Achievement | null
  onClose: () => void
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [achievement, onClose])
  
  if (!achievement) return null
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="pointer-events-auto relative"
        >
          {/* Confetti effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, times: [0, 0.5, 1] }}
            className="absolute inset-0 -z-10"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 200,
                  y: Math.random() * 100 + 50,
                  rotate: Math.random() * 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: 1,
                  delay: Math.random() * 0.3
                }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#FF6B35', '#F7931E', '#FFC107', '#4CAF50', '#2196F3'][
                    Math.floor(Math.random() * 5)
                  ]
                }}
              />
            ))}
          </motion.div>
          
          {/* Toast Card */}
          <motion.div
            className="bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden min-w-[320px] max-w-md"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
            
            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ rotate: -10, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 200,
                      damping: 10,
                      delay: 0.2
                    }}
                    className="text-5xl"
                  >
                    {achievement.icon}
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={16} className="text-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Achievement Unlocked!
                      </span>
                    </div>
                    <h3 className="font-black text-xl text-foreground">
                      {achievement.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground pl-[68px]">
                {achievement.description}
              </p>
              
              {/* Category Badge */}
              <div className="mt-4 pl-[68px]">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  achievement.category === 'milestone' ? 'bg-blue-500/20 text-blue-400' :
                  achievement.category === 'streak' ? 'bg-orange-500/20 text-orange-400' :
                  achievement.category === 'pr' ? 'bg-green-500/20 text-green-400' :
                  achievement.category === 'volume' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-pink-500/20 text-pink-400'
                }`}>
                  {achievement.category}
                </span>
              </div>
            </div>
            
            {/* Progress bar animation */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 origin-left"
            />
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
