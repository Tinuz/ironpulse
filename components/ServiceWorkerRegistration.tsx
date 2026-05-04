'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker at /sw.js once the page has loaded.
 * Renders nothing — purely a side-effect component.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('[SW] Registration failed:', err));
    }
  }, []);

  return null;
}
