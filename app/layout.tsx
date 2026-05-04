import type { Metadata } from 'next'
import { Oswald, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import OfflineIndicator from '@/components/OfflineIndicator'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NXT•REP - Fitness Tracker',
  description: 'A comprehensive fitness progression tracker',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${oswald.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#a3e635" />
        <link rel="manifest" href="/manifest.json" />
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </head>
      <body className="w-full font-sans">
        {children}
        <OfflineIndicator />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
