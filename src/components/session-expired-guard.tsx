'use client';

import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveDrafts } from '@/lib/session-draft';
import { notifySessionExpired, onSessionExpired } from '@/lib/session-expired';

/**
 * Detecta globalmente la pérdida de sesión: cualquier 401 de la propia app
 * (Server Actions y /api) abre el modal, sin que cada pantalla lo tenga que
 * manejar. Se envuelve `fetch` porque es el único punto por el que pasan todas
 * esas llamadas; los 401 de otros orígenes no cuentan.
 */
export function SessionExpiredGuard() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 && response.url.startsWith(window.location.origin)) notifySessionExpired();
      return response;
    };
    const unsubscribe = onSessionExpired(() => {
      saveDrafts();
      setExpired(true);
    });
    return () => {
      window.fetch = originalFetch;
      unsubscribe();
    };
  }, []);

  if (!expired) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-4 py-6">
      <section
        className="surface-2 w-full max-w-md rounded-lg p-5 shadow-float md:p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-description"
      >
        <h2 id="session-expired-title" className="text-xl font-semibold">
          Tu sesión expiró
        </h2>
        <p id="session-expired-description" className="mt-2 text-sm text-muted-foreground">
          Lo que estabas escribiendo aún no se ha guardado, pero queda como borrador: al ingresar volverás a esta
          pantalla para revisarlo y guardarlo.
        </p>
        {/* Navegación completa: descarta el estado de la app y el middleware vuelve a validar la sesión. */}
        <Button autoFocus className="mt-6 w-full" onClick={() => window.location.assign('/login')}>
          <LogIn />
          Iniciar sesión
        </Button>
      </section>
    </div>
  );
}
