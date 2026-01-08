import type { Metadata } from 'next'
import { Oswald, JetBrains_Mono } from 'next/font/google'
import './globals.css'

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
  title: 'NEXT•REP - Fitness Tracker',
  description: 'A comprehensive fitness progression tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${oswald.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script 
          data-name="BMC-Widget" 
          data-cfasync="false" 
          src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" 
          data-id="nxtrep" 
          data-description="Support me on Buy me a coffee!" 
          data-message="Dank je wel voor je donatie! Jouw support wordt enorm gewaardeerd.💪" 
          data-color="#FF813F" 
          data-position="Right" 
          data-x_margin="18" 
          data-y_margin="18"
        />
      </head>
      <body className="w-full h-screen font-sans">{children}</body>
    </html>
  )
}
