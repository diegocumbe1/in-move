/**
 * Agilidad: puntaje 0–100 del eje del radar a partir de los segundos del test.
 *
 * Separado de `scales.ts` (sin imports) para poder probarlo con el runner nativo.
 *
 * El 5-10-5 y el 5-0-5 son recorridos parecidos pero se cronometran distinto
 * (20 m completos vs. solo los 5 m alrededor del giro), así que sus tiempos no
 * se comparan: cada uno se puntúa contra su propia escala en segundos.
 */

export const AGILITY_TESTS = ['5-10-5', '5-0-5'] as const;
export type AgilityTest = (typeof AGILITY_TESTS)[number];

/** El test que usa el centro casi siempre; se puede cambiar desde Settings. */
export const DEFAULT_AGILITY_TEST: AgilityTest = '5-10-5';

/** Segundos que valen 0 y 100 puntos. Escalas PROVISIONALES, pendientes de baremo por edad/sexo. */
export const AGILITY_SCALES: Record<AgilityTest, { zero: number; full: number; label: string }> = {
  '5-10-5': { zero: 6.0, full: 4.3, label: 'Test 5-10-5' },
  '5-0-5': { zero: 3.6, full: 2.2, label: 'Test 5-0-5' },
};

export const isAgilityTest = (value: unknown): value is AgilityTest =>
  typeof value === 'string' && (AGILITY_TESTS as readonly string[]).includes(value);

/**
 * Test con el que se puntúa una ficha. Las fichas anteriores al selector no lo
 * guardaron (y su etiqueta libre no es fiable: hay "505" con tiempos de 5-10-5),
 * así que se deduce por el tiempo: los rangos no se cruzan (2.2–3.6 s vs 4.3–6 s).
 */
export const resolveAgilityTest = (test: unknown, seconds: number | null | undefined): AgilityTest => {
  if (isAgilityTest(test)) return test;
  return seconds != null && seconds > 0 && seconds < 4 ? '5-0-5' : '5-10-5';
};

/** Menor tiempo es mejor: `full` s = 100, `zero` s = 0, lineal entre ambos. */
export const normalizeAgility = (seconds: number | null | undefined, test: AgilityTest): number => {
  if (seconds == null || seconds <= 0) return 0;
  const { zero, full } = AGILITY_SCALES[test];
  return Math.max(0, Math.min(100, Math.round(((zero - seconds) / (zero - full)) * 100)));
};
