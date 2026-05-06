'use client'

import React from 'react'
import { User, Utensils, Calendar, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { format } from 'date-fns';
import WeeklyConsistencyWidget from '@/components/WeeklyConsistencyWidget';
import MuscleGroupVolumeWidget from '@/components/MuscleGroupVolumeWidget';
import WeeklySummaryWidget from '@/components/WeeklySummaryWidget';
import PlateauDetectionWidget from '@/components/PlateauDetectionWidget';
import DeloadRecommendationWidget from '@/components/DeloadRecommendationWidget';
import AchievementsWidget from '@/components/AchievementsWidget';
import AchievementToast from '@/components/AchievementToast';
import AccessorySuggestionsWidget from '@/components/AccessorySuggestionsWidget';
import ACWRWidget from '@/components/ACWRWidget';
import DailyCheckInWidget from '@/components/DailyCheckInWidget';

export default function Dashboard() {
  const { history, nutritionLogs, unlockedAchievement } = useData()
  const { user } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const totalWorkouts = history.length;

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysLog = nutritionLogs.find(l => l.date === today);
  const totalCalories = todaysLog ? todaysLog.items.reduce((acc, i) => acc + i.calories, 0) : 0;

  return (
    <div className="p-6 pb-24 max-w-2xl mx-auto space-y-8" data-tour="dashboard">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-txt-tertiary text-xs uppercase tracking-widest mb-2 font-medium">{t.dashboard.fitnessTracker}</h2>
          <h1 className="text-h1 font-bold text-txt-primary">
            {t.dashboard.brandName.split(' • ')[0]} <span className="text-accent-primary">•</span> {t.dashboard.brandName.split(' • ')[1]}
          </h1>
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
                className="h-12 w-12 rounded-professional border-2 border-accent-primary/50 shadow-card hover:scale-105 transition-transform object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-professional bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center shadow-card hover:scale-105 transition-transform border-2 border-border-light">
                <User size={24} className="text-txt-primary" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-accent-success h-3 w-3 rounded-full border-2 border-bg-primary"></div>
          </button>
          <p className="text-xs text-txt-tertiary max-w-[120px] truncate">{user?.email}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => router.push('/history')}
          className="bg-bg-secondary border border-border-default p-5 rounded-professional shadow-card hover:shadow-elevated hover:border-border-light transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-txt-tertiary text-xs uppercase font-semibold mb-3 tracking-wider">
            <Calendar size={16} /> {t.dashboard.history}
          </div>
          <div className="text-metric font-bold text-txt-primary tabular-nums group-hover:text-accent-primary transition-colors">{totalWorkouts}</div>
        </div>
        
        <div 
          onClick={() => router.push('/analytics')}
          className="bg-bg-secondary border border-border-default p-5 rounded-professional shadow-card hover:shadow-elevated hover:border-border-light transition-all cursor-pointer group"
          data-tour="progress"
        >
          <div className="flex items-center gap-2 text-txt-tertiary text-xs uppercase font-semibold mb-3 tracking-wider">
            <BarChart3 size={16} /> {t.dashboard.analytics}
          </div>
          <div className="text-metric font-bold text-txt-primary tabular-nums group-hover:text-accent-primary transition-colors flex items-center">
            <BarChart3 size={36} />
          </div>
        </div>
        
        {/* Nutrition Card */}
        <div 
          onClick={() => router.push('/nutrition')}
          data-tour="nutrition"
          className="bg-bg-secondary border border-border-default p-5 rounded-professional cursor-pointer hover:shadow-elevated hover:border-border-light transition-all group relative overflow-hidden shadow-card col-span-2"
        >
          <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
             <Utensils size={48} />
          </div>
          <div className="flex items-center gap-2 text-txt-tertiary text-xs uppercase font-semibold mb-3 relative z-10 tracking-wider">
            <Utensils size={16} /> {t.nutrition.title}
          </div>
          <div className="text-h2 font-bold tabular-nums text-accent-secondary relative z-10">
            {totalCalories} <span className="text-sm font-medium text-txt-secondary">{t.nutrition.kcal}</span>
          </div>
        </div>
      </div>

      <DailyCheckInWidget />

      <WeeklyConsistencyWidget history={history} />
      <ACWRWidget />
      <WeeklySummaryWidget />
      <MuscleGroupVolumeWidget />
      <PlateauDetectionWidget />
      <DeloadRecommendationWidget />
      <AchievementsWidget />
      <AccessorySuggestionsWidget />

      {/* Support Button */}
      <a
        href="https://buymeacoffee.com/nxtrep"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-4 px-5 rounded-professional bg-gradient-to-r from-accent-secondary/10 to-accent-success/10 hover:from-accent-secondary/20 hover:to-accent-success/20 border border-accent-secondary/30 hover:border-accent-secondary/50 transition-all text-center group shadow-card hover:shadow-elevated"
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-txt-secondary group-hover:text-accent-secondary transition-colors">
            <span className="text-xl">☕</span>
            <span>{t.dashboard.buyMeACoffee}</span>
          </div>
          <p className="text-xs text-txt-tertiary">{t.dashboard.supportDevelopment}</p>
        </div>
      </a>

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
