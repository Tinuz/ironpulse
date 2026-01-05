'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Chrome, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/context/AuthContext'

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Login error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent mb-6 shadow-2xl shadow-primary/30"
          >
            <Dumbbell size={40} className="text-background" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-black italic tracking-tighter mb-2"
          >
            NEXT<span className="text-primary">•</span>REP
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-sm uppercase tracking-widest"
          >
            Fitness Tracker
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-2xl font-bold mb-2 text-center">Welkom terug! 💪</h2>
          <p className="text-muted-foreground text-center mb-8">
            Log in om je fitness journey voort te zetten
          </p>

          <motion.button
            onClick={handleGoogleSignIn}
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Aan het inloggen...</span>
              </>
            ) : (
              <>
                <Chrome size={20} />
                <span>Inloggen met Google</span>
              </>
            )}
          </motion.button>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Door in te loggen ga je akkoord met onze voorwaarden.
              <br />
              Je data wordt veilig opgeslagen in Supabase.
            </p>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div>
            <div className="text-2xl mb-1">🏋️</div>
            <p className="text-xs text-muted-foreground">Track Workouts</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🤖</div>
            <p className="text-xs text-muted-foreground">AI Coach</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs text-muted-foreground">Progress Analytics</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
