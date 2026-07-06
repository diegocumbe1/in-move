'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker SOLO en producción, para no interferir con el
 * hot-reload de `next dev`. Se monta una vez desde el layout raíz.
 *
 * En desarrollo, además, des-registra cualquier SW previo (evita el clásico
 * "/sw.js 500" cuando quedó uno viejo cacheado en el navegador).
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* silencioso: la app funciona igual sin SW */
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }
  }, []);

  return null;
}
