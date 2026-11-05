/**
 * Señal global de "sesión expirada". La emite quien detecta el fallo (cualquier
 * respuesta 401 de la app o la subida de fotos) y la escucha
 * `SessionExpiredGuard`, que muestra el modal y lleva a /login.
 */

/** También es el cuerpo del 401 del middleware: Next lo relanza como `error.message` en el Server Action. */
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Inicia sesión de nuevo para continuar.';

const SESSION_EXPIRED_EVENT = 'inmove:session-expired';

/** Para que los `catch` no muestren su alerta genérica encima del modal. */
export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE;
}

export function notifySessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
}
