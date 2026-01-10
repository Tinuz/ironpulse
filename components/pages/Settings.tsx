'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, Check, LogOut, User, Languages, Coffee, UserCircle, Lock, Eye, EyeOff, Dumbbell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { COACH_PROFILES } from '@/components/utils/coachProfiles'
import { supabase } from '@/lib/supabase'

interface SocialProfile {
  username: string
  display_name: string | null
  bio: string | null
  is_public: boolean
  show_workouts: boolean
  show_achievements: boolean
  show_stats: boolean
}

export default function Settings() {
  const router = useRouter()
  const { coachProfile, setCoachProfile } = useData()
  const { user, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedProfile, setEditedProfile] = useState<SocialProfile | null>(null)
  const [usernameError, setUsernameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showRIR, setShowRIR] = useState(false)
  const [showRPE, setShowRPE] = useState(false)
  const [showWarmupToggle, setShowWarmupToggle] = useState(true)

  useEffect(() => {
    if (user) {
      loadSocialProfile()
      loadWorkoutPreferences()
    }
  }, [user])

  const loadWorkoutPreferences = () => {
    const savedRIR = localStorage.getItem('workout_show_rir')
    const savedRPE = localStorage.getItem('workout_show_rpe')
    const savedWarmup = localStorage.getItem('workout_show_warmup_toggle')
    
    if (savedRIR !== null) setShowRIR(savedRIR === 'true')
    if (savedRPE !== null) setShowRPE(savedRPE === 'true')
    if (savedWarmup !== null) setShowWarmupToggle(savedWarmup === 'true')
  }

  const loadSocialProfile = async () => {
    if (!user) return

    const { data } = await supabase
      .from('user_social_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setSocialProfile(data)
      setEditedProfile(data)
    } else {
      // Create default profile
      const defaultUsername = user.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user'
      const newProfile = {
        username: defaultUsername,
        display_name: null,
        bio: null,
        is_public: true,
        show_workouts: true,
        show_achievements: true,
        show_stats: true
      }
      setSocialProfile(newProfile)
      setEditedProfile(newProfile)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !editedProfile) return

    // Validate username
    if (editedProfile.username.length < 3 || editedProfile.username.length > 20) {
      setUsernameError('Username moet tussen 3 en 20 karakters zijn')
      return
    }

    if (!/^[a-zA-Z0-9]+$/.test(editedProfile.username)) {
      setUsernameError('Username mag alleen letters en cijfers bevatten')
      return
    }

    setSaving(true)
    setUsernameError('')

    try {
      const { data: existingProfile } = await supabase
        .from('user_social_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('user_social_profiles')
          .update(editedProfile)
          .eq('user_id', user.id)
      } else {
        // Insert new profile
        await supabase
          .from('user_social_profiles')
          .insert({
            user_id: user.id,
            ...editedProfile
          })
      }

      setSocialProfile(editedProfile)
      setIsEditingProfile(false)
    } catch (error: any) {
      if (error.code === '23505') {
        setUsernameError('Deze username is al in gebruik')
      } else {
        console.error('Error saving profile:', error)
      }
    } finally {
      setSaving(false)
    }
  }

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
        <h1 className="text-xl font-bold">{t.settings.title}</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6">
        {/* Social Profile Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <UserCircle className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Social Profiel</h2>
          </div>

          {socialProfile && (
            isEditingProfile ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                {/* Username */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={editedProfile?.username || ''}
                    onChange={(e) => {
                      setEditedProfile(prev => prev ? { ...prev, username: e.target.value.toLowerCase() } : null)
                      setUsernameError('')
                    }}
                    className="w-full px-4 py-3 bg-card border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
                    placeholder="username"
                  />
                  {usernameError && (
                    <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">3-20 karakters, alleen letters en cijfers</p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                    Weergavenaam
                  </label>
                  <input
                    type="text"
                    value={editedProfile?.display_name || ''}
                    onChange={(e) => setEditedProfile(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                    className="w-full px-4 py-3 bg-card border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
                    placeholder="Je naam"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                    Bio
                  </label>
                  <textarea
                    value={editedProfile?.bio || ''}
                    onChange={(e) => setEditedProfile(prev => prev ? { ...prev, bio: e.target.value.slice(0, 150) } : null)}
                    className="w-full px-4 py-3 bg-card border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Vertel iets over jezelf..."
                    rows={3}
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(editedProfile?.bio?.length || 0)}/150
                  </p>
                </div>

                {/* Privacy Section */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock size={16} className="text-muted-foreground" />
                    <h3 className="font-bold text-sm">Privacy Instellingen</h3>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Publiek Profiel</p>
                        <p className="text-xs text-muted-foreground">Anderen kunnen je profiel zien</p>
                      </div>
                      <button
                        onClick={() => setEditedProfile(prev => prev ? { ...prev, is_public: !prev.is_public } : null)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          editedProfile?.is_public ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          editedProfile?.is_public ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Toon Workouts</p>
                        <p className="text-xs text-muted-foreground">Vrienden zien je workout geschiedenis</p>
                      </div>
                      <button
                        onClick={() => setEditedProfile(prev => prev ? { ...prev, show_workouts: !prev.show_workouts } : null)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          editedProfile?.show_workouts ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          editedProfile?.show_workouts ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Toon Achievements</p>
                        <p className="text-xs text-muted-foreground">Vrienden zien je badges</p>
                      </div>
                      <button
                        onClick={() => setEditedProfile(prev => prev ? { ...prev, show_achievements: !prev.show_achievements } : null)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          editedProfile?.show_achievements ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          editedProfile?.show_achievements ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Toon Statistieken</p>
                        <p className="text-xs text-muted-foreground">Vrienden zien je workout stats</p>
                      </div>
                      <button
                        onClick={() => setEditedProfile(prev => prev ? { ...prev, show_stats: !prev.show_stats } : null)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          editedProfile?.show_stats ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          editedProfile?.show_stats ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEditedProfile(socialProfile)
                      setIsEditingProfile(false)
                      setUsernameError('')
                    }}
                    className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                  >
                    Annuleer
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                  <p className="font-medium">@{socialProfile.username}</p>
                </div>
                {socialProfile.display_name && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Weergavenaam</p>
                    <p className="font-medium">{socialProfile.display_name}</p>
                  </div>
                )}
                {socialProfile.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bio</p>
                    <p className="text-sm">{socialProfile.bio}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs pt-2">
                  {socialProfile.is_public ? (
                    <span className="flex items-center gap-1 text-green-500">
                      <Eye size={14} /> Publiek
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <EyeOff size={14} /> Privé
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10">
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full py-3 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold transition-colors"
                  >
                    Bewerk Profiel
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Account Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="text-primary" size={20} />
            <h2 className="text-lg font-bold">{t.settings.account}</h2>
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
                <span>{t.settings.logout}</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Workout Preferences Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Workout Voorkeuren</h2>
          </div>
          
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-sm">RIR Tracking</p>
                <p className="text-xs text-muted-foreground">Reps In Reserve (0-10) per set</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !showRIR
                  setShowRIR(newValue)
                  localStorage.setItem('workout_show_rir', String(newValue))
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showRIR ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showRIR ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-sm">RPE Tracking</p>
                <p className="text-xs text-muted-foreground">Rate of Perceived Exertion (1-10) per set</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !showRPE
                  setShowRPE(newValue)
                  localStorage.setItem('workout_show_rpe', String(newValue))
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showRPE ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showRPE ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-sm">Warm-up Sets</p>
                <p className="text-xs text-muted-foreground">Markeer sets als warm-up (uitgesloten van volume)</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !showWarmupToggle
                  setShowWarmupToggle(newValue)
                  localStorage.setItem('workout_show_warmup_toggle', String(newValue))
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showWarmupToggle ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showWarmupToggle ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </label>

            <div className="pt-3 border-t border-white/10">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-xs text-blue-400">
                  <span className="font-bold">💡 Tip:</span> RIR en RPE helpen bij progressive overload en recovery tracking. 
                  Warm-up sets worden automatisch uitgesloten van je totale volume berekeningen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Languages className="text-primary" size={20} />
            <h2 className="text-lg font-bold">{t.settings.language}</h2>
          </div>
          
          <div className="space-y-2">
            <motion.button
              onClick={() => setLanguage('nl')}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                language === 'nl'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇳🇱</span>
                <div>
                  <h3 className="font-bold">{t.settings.dutch}</h3>
                  <p className="text-xs text-muted-foreground">Nederlands</p>
                </div>
              </div>
              {language === 'nl' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check size={14} className="text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>

            <motion.button
              onClick={() => setLanguage('en')}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                language === 'en'
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇬🇧</span>
                <div>
                  <h3 className="font-bold">{t.settings.english}</h3>
                  <p className="text-xs text-muted-foreground">English</p>
                </div>
              </div>
              {language === 'en' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check size={14} className="text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
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

        {/* Support Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="text-primary" size={20} />
            <h2 className="text-lg font-bold">{language === 'nl' ? 'Support de App' : 'Support the App'}</h2>
          </div>
          
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF813F]/10 to-[#FF813F]/5 border border-[#FF813F]/20">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {language === 'nl' 
                ? 'IronPulse is volledig gratis en zonder advertenties. Als je de app waardevol vindt en de doorontwikkeling wilt ondersteunen, kun je een donatie doen.' 
                : 'IronPulse is completely free and ad-free. If you find the app valuable and want to support its development, you can make a donation.'}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {language === 'nl'
                ? '💪 Klik op het koffie-icoontje rechtsonder om te doneren'
                : '💪 Click the coffee icon at the bottom right to donate'}
            </p>
          </div>
        </div>

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
