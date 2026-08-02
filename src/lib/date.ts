/**
 * Fechas de la app — SIEMPRE en la zona del centro: America/Bogota (UTC-5, sin
 * horario de verano).
 *
 * Por qué: el servidor (Vercel / Supabase) corre en UTC y el navegador usa la
 * zona del equipo. Sin fijar la zona, una ficha creada a las 7 p.m. en Bogotá
 * quedaba fechada al día siguiente. Todo cálculo de "hoy" o de días
 * transcurridos debe pasar por este módulo.
 *
 * Las fechas de calendario (valoración, nacimiento) se guardan como `yyyy-mm-dd`
 * y se anclan al **mediodía de Bogotá** al convertirlas a instante, para que
 * ningún desfase de horas cambie el día.
 */

export const BOGOTA_TZ = 'America/Bogota';
export const BOGOTA_UTC_OFFSET = '-05:00';

const isoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const longFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: BOGOTA_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** Hoy en Bogotá como `yyyy-mm-dd`, sin importar dónde corra el código. */
export const todayIso = (): string => isoFormatter.format(new Date());

/** `yyyy-mm-dd` → instante del mediodía en Bogotá (evita saltos de día al comparar). */
export const isoToInstant = (iso: string): Date => new Date(`${iso}T12:00:00${BOGOTA_UTC_OFFSET}`);

/** Valida un `yyyy-mm-dd` real (rechaza formatos raros y días inexistentes como 2026-02-31). */
export const isValidIsoDate = (value: string | null | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = isoToInstant(value);
  if (Number.isNaN(instant.getTime())) return false;
  return isoFormatter.format(instant) === value;
};

/** Días calendario (en Bogotá) transcurridos desde una fecha; negativo si es futura. */
export const daysSinceIso = (iso: string): number | null => {
  if (!isValidIsoDate(iso)) return null;
  const diff = isoToInstant(todayIso()).getTime() - isoToInstant(iso).getTime();
  return Math.round(diff / 86_400_000);
};

/** ¿La fecha es posterior a hoy en Bogotá? */
export const isFutureIso = (iso: string): boolean => {
  const days = daysSinceIso(iso);
  return days != null && days < 0;
};

/** Formato largo es-CO fijado a Bogotá, ej. "30 de jul de 2026". */
export const formatDate = (iso: string): string => (isValidIsoDate(iso) ? longFormatter.format(isoToInstant(iso)) : '—');
