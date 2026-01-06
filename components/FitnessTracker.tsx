'use client'

import React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import Dashboard from '@/components/pages/Dashboard'
import SchemaBuilder from '@/components/pages/SchemaBuilder'
import WorkoutLogger from '@/components/pages/WorkoutLogger'
import History from '@/components/pages/History'
import Progress from '@/components/pages/Progress'
import AITrainer from '@/components/pages/AITrainer'
import Nutrition from '@/components/pages/Nutrition'
import Settings from '@/components/pages/Settings'
import Login from '@/components/pages/Login'
import WorkoutDetail from '@/components/pages/WorkoutDetail'
import WorkoutEditor from '@/components/pages/WorkoutEditor'
import ExerciseProgress from '@/components/pages/ExerciseProgress'
import { DataProvider } from '@/components/context/DataContext'
import { AuthProvider, useAuth } from '@/components/context/AuthContext'
import { LanguageProvider, useLanguage } from '@/components/context/LanguageContext'
import Navigation from '@/components/Navigation'
import { Loader2 } from 'lucide-react'

// Protected Layout component with auth check
const ProtectedLayout = () => {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />
  }

  // Render page based on pathname
  const renderPage = () => {
    if (pathname === '/') return <Dashboard />
    if (pathname === '/schema') return <SchemaBuilder />
    if (pathname === '/exercise-progress') return <ExerciseProgress />
    if (pathname.startsWith('/workout/')) {
      const id = pathname.split('/workout/')[1]
      const isEdit = searchParams.get('edit') === 'true'
      if (id && isEdit) return <WorkoutEditor />
      return id ? <WorkoutDetail /> : <WorkoutLogger />
    }
    if (pathname === '/workout') return <WorkoutLogger />
    if (pathname === '/history') return <History />
    if (pathname === '/progress') return <Progress />
    if (pathname === '/trainer') return <AITrainer />
    if (pathname === '/nutrition') return <Nutrition />
    if (pathname === '/settings') return <Settings />
    return <Dashboard />
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
        <AnimatePresence mode="wait">
          <div key={pathname}>
            {renderPage()}
          </div>
        </AnimatePresence>
      </main>
      <Navigation />
    </div>
  )
}

export function FitnessTracker() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DataProvider>
          <ProtectedLayout />
        </DataProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default FitnessTracker
