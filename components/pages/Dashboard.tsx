'use client'

import React from 'react'
import { User, TrendingUp, Utensils, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { format } from 'date-fns';
import StreakWidget from '@/components/StreakWidget';
import MuscleGroupVolumeWidget from '@/components/MuscleGroupVolumeWidget';
import WeeklySummaryWidget from '@/components/WeeklySummaryWidget';
import PlateauDetectionWidget from '@/components/PlateauDetectionWidget';
import DeloadRecommendationWidget from '@/components/DeloadRecommendationWidget';
import AchievementsWidget from '@/components/AchievementsWidget';
import AchievementToast from '@/components/AchievementToast';
import AccessorySuggestionsWidget from '@/components/AccessorySuggestionsWidget';

export default function Dashboard() {
  const { history, nutritionLogs, unlockedAchievement } = useData()
  const { user } = useAuth()
  const router = useRouter()

  const totalWorkouts = history.length;

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysLog = nutritionLogs.find(l => l.date === today);
  const totalCalories = todaysLog ? todaysLog.items.reduce((acc, i) => acc + i.calories, 0) : 0;

  return (
    <div className="p-6 pb-24 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-muted-foreground text-sm uppercase tracking-widest mb-1">Fitness Tracker</h2>
          <h1 className="text-4xl font-black italic tracking-tighter">NXT <span className="text-primary">•</span> REP</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={() => router.push('/settings')}
            className="group relative"
          >
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="h-12 w-12 rounded-full border-2 border-primary/50 shadow-lg hover:scale-105 transition-transform object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform border-2 border-white/20">
                <User size={24} className="text-background" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-background"></div>
          </button>
          <p className="text-xs text-muted-foreground max-w-[120px] truncate">{user?.email}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div 
          onClick={() => router.push('/history')}
          className="bg-card border border-border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-2">
            <Calendar size={14} /> History
          </div>
          <div className="text-3xl font-black tabular-nums group-hover:text-primary transition-colors">{totalWorkouts}</div>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-2">
            <TrendingUp size={14} /> Workouts
          </div>
          <div className="text-3xl font-black tabular-nums">{totalWorkouts}</div>
        </div>
        
        {/* Nutrition Card */}
        <div 
          onClick={() => router.push('/nutrition')}
          className="bg-card border border-border p-4 rounded-2xl cursor-pointer hover:shadow-md transition-all group relative overflow-hidden shadow-sm"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Utensils size={40} />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-2 relative z-10">
            <Utensils size={14} /> Nutrition
          </div>
          <div className="text-2xl font-black tabular-nums text-pink-500 relative z-10">
            {totalCalories} <span className="text-xs font-medium text-muted-foreground">kcal</span>
          </div>
        </div>
      </div>

      {/* Streak Widget */}
      <StreakWidget history={history} />

      {/* Weekly Summary Widget */}
      <WeeklySummaryWidget />

      {/* Muscle Group Volume Widget */}
      <MuscleGroupVolumeWidget />

      {/* Plateau Detection Widget */}
      <PlateauDetectionWidget />

      {/* Deload Recommendation Widget */}
      <DeloadRecommendationWidget />

      {/* Achievements Widget */}
      <AchievementsWidget />

      {/* AI Accessory Suggestions Widget */}
      <AccessorySuggestionsWidget />

      {/* Support Button */}
      <a
        href="https://buymeacoffee.com/nxtrep"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF813F]/5 to-[#FFDD00]/5 hover:from-[#FF813F]/15 hover:to-[#FFDD00]/15 border border-[#FF813F]/20 hover:border-[#FF813F]/40 transition-all text-center group shadow-sm hover:shadow-md"
      >
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-[#FF813F] transition-colors">
            <span className="text-lg">☕</span>
            <span>Buy Me a Coffee</span>
          </div>
          <p className="text-xs text-muted-foreground/70">Steun de doorontwikkeling van NXT•REP</p>
        </div>
      </a>

      {/* Achievement Toast */}
      <AchievementToast 
        achievement={unlockedAchievement ? {
          id: unlockedAchievement.id,
          name: unlockedAchievement.name,
          description: unlockedAchievement.description,
          icon: unlockedAchievement.icon,
          category: unlockedAchievement.category as any,
          threshold: 0
        } : null}
        onClose={() => {}}
      />
    </div>
  );
}
