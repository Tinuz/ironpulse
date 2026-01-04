'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, Check, LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { COACH_PROFILES } from '@/components/utils/coachProfiles'

export default function Settings() {
  const router = useRouter()
  const { coachProfile, setCoachProfile } = useData()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Instellingen</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6">
        {/* Account Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Account</h2>
          </div>
          
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            
            <div className="pt-3 border-t border-white/10">
              <motion.button
                onClick={handleSignOut}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-red-500/20"
              >
                <LogOut size={18} />
                <span>Uitloggen</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* AI Coach Profile Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="text-primary" size={20} />
            <h2 className="text-lg font-bold">AI Coach Profiel</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Kies het gedrag en de stijl van je persoonlijke AI coach
          </p>

          <div className="space-y-3">
            {COACH_PROFILES.map((profile) => (
              <motion.button
                key={profile.id}
                onClick={() => setCoachProfile(profile.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                  coachProfile === profile.id
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{profile.icon}</span>
                      <h3 className="font-bold">{profile.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {profile.description}
                    </p>
                  </div>
                  {coachProfile === profile.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check size={14} className="text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {coachProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <Bot size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase text-primary">Preview</span>
            </div>
            <p className="text-sm leading-relaxed">
              {coachProfile === 'motiverend' && "🔥 Yes! Laten we samen je doelen bereiken! Elke rep telt, elke dag is een kans om beter te worden. You got this! 💪"}
              {coachProfile === 'streng' && "Je hebt 3 workouts deze week gemist. Excuses veranderen niets - actie wel. Morgen verwacht ik je in de gym. Geen onderhandelingen."}
              {coachProfile === 'wetenschappelijk' && "Voor optimale hypertrofie adviseer ik 10-20 sets per spiergroep per week, met een training frequency van 2x. Dit maximaliseert muscle protein synthesis volgens recente meta-analyses."}
              {coachProfile === 'vriendelijk' && "Hey! 😊 Ik zie dat je het druk hebt gehad. Geen zorgen, we pakken het rustig aan. Zelfs een korte workout is beter dan niets. Wat past er vandaag bij jou?"}
              {coachProfile === 'powerlifting' && "Focus deze week op je squat depth en bracing. Werk aan 70-80% van je 1RM voor volume. Deadlift accessories op vrijdag voor posterior chain. Low bar of high bar?"}
              {coachProfile === 'bodybuilding' && "Time under tension is key voor groei. Probeer 3-4 seconden eccentric bij je chest flies. Richt op de stretch en squeeze. Mind-muscle connection > ego lifting. 💎"}
            </p>
          </motion.div>
        )}

        {/* Info */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 <strong>Tip:</strong> Je kunt het profiel altijd aanpassen. De AI coach past zijn gedrag direct aan op basis van je keuze.
          </p>
        </div>
      </div>
    </div>
  )
}
