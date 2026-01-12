'use client'

import { AuthProvider } from '@/components/context/AuthContext'
import { DataProvider } from '@/components/context/DataContext'
import { LanguageProvider } from '@/components/context/LanguageContext'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}
