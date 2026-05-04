'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Shows a sticky bottom banner when the device is offline.
 * Disappears automatically once the connection is restored.
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-red-500/40 rounded-full shadow-xl text-sm font-semibold text-red-400"
          role="status"
          aria-live="polite"
        >
          <WifiOff size={16} />
          Geen internetverbinding
        </motion.div>
      )}
    </AnimatePresence>
  );
}
