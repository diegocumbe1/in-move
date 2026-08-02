import type { Level } from '@/styles/tokens';

/**
 * Baremos normativos por edad y sexo (fuente única de verdad).
 *
 * Módulo puro: lo consumen tanto `scales.ts` (semáforos del preview admin y de
 * la Assessment calculada) como `comparison.ts` (gauge de la ficha pública),
 * para que ambas vistas nunca se desalineen.
 */

export type Sex = 'M' | 'F';
export type Band = { label: string; range: string; level: Level; active: boolean };
export type Norm = {
  bands: Band[];
  /** Índice de la banda donde cae el atleta; -1 si no se puede ubicar (sin valor o sin edad). */
  activeIndex: number;
  reference?: string;
  note?: string;
};

const NO_AGE = 'Registra la fecha de nacimiento del deportista para aplicar el baremo por edad.';

/** Formatea con 1 decimal y sin decimal colgante (10.60 → 10.6, 24.0 → 24). */
const fmt = (v: number) => {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
/** Siguiente valor medible tras un corte del baremo (resolución 0.1 cm). */
const next = (v: number) => Math.round((v + 0.1) * 10) / 10;

const withBands = (defs: Omit<Band, 'active'>[], activeIndex: number): Band[] =>
  defs.map((b, i) => ({ ...b, active: i === activeIndex }));

const joinNotes = (...parts: (string | null | undefined)[]) => {
  const kept = parts.filter(Boolean) as string[];
  return kept.length ? kept.join(' · ') : undefined;
};

/* -------------------------------------------------------------------------- */
/* CMJ — Countermovement Jump                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Percentiles P25/P75 por franja de edad (Hombres).
 * Mujeres: baremo propio PENDIENTE → por ahora se aplica esta misma tabla y la
 * ficha muestra una nota de advertencia (ver CMJ_FEMALE_NOTE).
 */
const CMJ_MALE = [
  { min: 9, max: 12, p25: 24, p75: 34, ref: 'Ramírez-Vélez et al. (2015)' },
  { min: 13, max: 17, p25: 30, p75: 42, ref: 'Castro-Piñero et al. (2020)' },
  { min: 18, max: 29, p25: 36, p75: 50, ref: 'López-Segovia et al. (2023)' },
  { min: 30, max: 39, p25: 32, p75: 45, ref: 'González-Badillo et al. (2018)' },
  { min: 40, max: 49, p25: 28, p75: 41, ref: 'España-Romero et al. (2010)' },
  { min: 50, max: 59, p25: 24, p75: 36, ref: 'Casasús et al. (2017)' },
  { min: 60, max: 69, p25: 20, p75: 30, ref: 'Serra-Paya et al. (2021)' },
] as const;

const CMJ_FEMALE_NOTE = 'Baremo femenino pendiente: se aplica la referencia masculina.';

/** Fila de la tabla para una edad, extendiendo los extremos fuera de rango. */
function cmjRow(age: number) {
  const first = CMJ_MALE[0];
  const last = CMJ_MALE[CMJ_MALE.length - 1];
  if (age < first.min) return { row: first, extrapolated: true };
  if (age > last.max) return { row: last, extrapolated: true };
  const row = CMJ_MALE.find((r) => age >= r.min && age <= r.max) ?? last;
  return { row, extrapolated: false };
}

export function cmjNorm(sex: Sex, age: number | null | undefined, value: number | null | undefined): Norm {
  if (age == null) {
    return { bands: [], activeIndex: -1, note: joinNotes(NO_AGE, sex === 'F' ? CMJ_FEMALE_NOTE : null) };
  }
  const { row, extrapolated } = cmjRow(age);
  const defs: Omit<Band, 'active'>[] = [
    { label: 'Bajo', range: `< ${row.p25} cm`, level: 'danger' },
    { label: 'Normal', range: `${row.p25} – ${row.p75} cm`, level: 'good' },
    { label: 'Alto', range: `≥ ${row.p75} cm`, level: 'elite' },
  ];
  const activeIndex = value == null ? -1 : value < row.p25 ? 0 : value < row.p75 ? 1 : 2;
  return {
    bands: withBands(defs, activeIndex),
    activeIndex,
    reference: `${row.min}–${row.max} años · ${row.ref}`,
    note: joinNotes(
      sex === 'F' ? CMJ_FEMALE_NOTE : null,
      extrapolated ? `Edad fuera del baremo (9–69): se usa la franja ${row.min}–${row.max} años.` : null,
    ),
  };
}

/**
 * Puntaje 0–100 del eje "Salto" del radar, referenciado al mismo baremo que el
 * semáforo (P25 → 25 pts, P75 → 75 pts). Si no hay edad devuelve null y el
 * llamador cae a la normalización genérica.
 */
export function cmjScore(age: number | null | undefined, value: number | null | undefined): number | null {
  if (age == null || value == null) return null;
  const { row } = cmjRow(age);
  const score = 25 + ((value - row.p25) / (row.p75 - row.p25)) * 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/* -------------------------------------------------------------------------- */
/* Sit and Reach                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Cortes superiores (cm) de Muy baja / Baja / Regular / Buena por edad y sexo;
 * por encima del último corte = Excelente. Adaptado de Emilio y Martínez (2002).
 *
 * Transcripción: en niños 13 años la fila "Baja" viene impresa como `10-7 – 14,3`;
 * se interpreta 10,7 – 14,3 por continuidad con "Muy baja ≤ 10,6". En niños 14
 * años "Muy baja 11,0–14,2" y "Baja 14,3–17,5" fijan el corte en 14,2.
 */
const SIT_REACH: Record<Sex, Record<number, [number, number, number, number]>> = {
  M: {
    13: [10.6, 14.3, 18.0, 21.7],
    14: [14.2, 17.5, 20.8, 24.1],
    15: [17.0, 22.1, 27.2, 32.3],
    16: [13.4, 18.9, 24.4, 29.9],
    17: [14.8, 20.7, 26.6, 32.5],
  },
  F: {
    13: [12.6, 18.3, 24.0, 29.7],
    14: [15.4, 19.9, 24.4, 28.9],
    15: [18.2, 22.5, 26.8, 31.1],
    16: [18.0, 23.1, 28.2, 33.3],
    17: [17.8, 22.7, 27.6, 32.5],
  },
};

const SIT_REACH_MIN_AGE = 13;
const SIT_REACH_MAX_AGE = 17;
const SIT_REACH_LABELS = ['Muy baja', 'Baja', 'Regular', 'Buena', 'Excelente'] as const;
const SIT_REACH_LEVELS: Level[] = ['danger', 'danger', 'warning', 'good', 'elite'];

export function sitReachNorm(sex: Sex, age: number | null | undefined, value: number | null | undefined): Norm {
  if (age == null) return { bands: [], activeIndex: -1, note: NO_AGE };

  // Fuera de 13–17 se extienden los extremos: la fila de 13 hacia abajo, la de 17 hacia arriba.
  const refAge = Math.max(SIT_REACH_MIN_AGE, Math.min(SIT_REACH_MAX_AGE, age));
  const extrapolated = refAge !== age;
  const cuts = SIT_REACH[sex][refAge];

  const defs: Omit<Band, 'active'>[] = SIT_REACH_LABELS.map((label, i) => ({
    label,
    level: SIT_REACH_LEVELS[i],
    range:
      i === 0
        ? `≤ ${fmt(cuts[0])} cm`
        : i === SIT_REACH_LABELS.length - 1
          ? `≥ ${fmt(next(cuts[3]))} cm`
          : `${fmt(next(cuts[i - 1]))} – ${fmt(cuts[i])} cm`,
  }));

  let activeIndex = -1;
  if (value != null) {
    activeIndex = cuts.findIndex((cut) => value <= cut);
    if (activeIndex === -1) activeIndex = SIT_REACH_LABELS.length - 1;
  }

  return {
    bands: withBands(defs, activeIndex),
    activeIndex,
    reference: `${refAge} años · Adaptado de Emilio y Martínez (2002)`,
    note: extrapolated
      ? `Edad fuera del baremo (13–17): se usa la referencia de ${refAge} años.`
      : undefined,
  };
}
