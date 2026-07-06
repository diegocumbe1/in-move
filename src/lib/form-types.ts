import type { Sex } from '@/lib/ficha';

// DTOs de entrada desde el formulario (los 'use server' no pueden exportar tipos,
// por eso viven aquí).

export type NewAthleteInput = {
  name: string;
  document: string;
  birthDate: string;
  sex: Sex;
  category: string;
  group: string;
  sport: string;
  position: string;
  photoPath?: string | null;
};

// Campos crudos (strings) tal como llegan del formulario de valoración completo
// (FICHA_CAMPOS.md). Todos opcionales: se llenan cuando se miden.
export type AssessmentDraftInput = {
  // Antropometría
  weight: string; // peso kg
  height: string; // estatura cm
  fat: string; // % grasa
  masa: string; // % masa corporal
  // Cardiovascular
  restingHr: string; // FC reposo
  fcInicial: string;
  fcFinal: string;
  fcMax: string;
  // Movilidad / ROM (grados)
  colFlex: string;
  colExt: string;
  hombRotIntIzq: string;
  hombRotIntDer: string;
  hombRotExtIzq: string;
  hombRotExtDer: string;
  hombFlexIzq: string;
  hombFlexDer: string;
  caderaIzq: string;
  caderaDer: string;
  rodillaIzq: string;
  rodillaDer: string;
  otraLabel: string;
  otraValor: string;
  // Flexibilidad
  pruebaAplicada: string;
  sitReach: string; // resultado cm
  flexObs: string;
  // Rendimiento — saltos
  sj: string;
  cmj: string;
  abalakov: string;
  saltoUniDer: string;
  saltoUniIzq: string;
  // Rendimiento — fuerza
  fuerzaMax: string;
  squat1rm: string;
  banca1rm: string;
  pct1rm: string;
  // Rendimiento — velocidad / agilidad
  speed10m: string;
  speed30m: string;
  agilidad505: string;
  vo2: string;
  // Observaciones
  notes: string;
  plan: string;
};

/** Draft vacío con todos los campos en string vacío. */
export const emptyDraft: AssessmentDraftInput = {
  weight: '', height: '', fat: '', masa: '',
  restingHr: '', fcInicial: '', fcFinal: '', fcMax: '',
  colFlex: '', colExt: '', hombRotIntIzq: '', hombRotIntDer: '', hombRotExtIzq: '', hombRotExtDer: '',
  hombFlexIzq: '', hombFlexDer: '', caderaIzq: '', caderaDer: '', rodillaIzq: '', rodillaDer: '',
  otraLabel: '', otraValor: '',
  pruebaAplicada: '', sitReach: '', flexObs: '',
  sj: '', cmj: '', abalakov: '', saltoUniDer: '', saltoUniIzq: '',
  fuerzaMax: '', squat1rm: '', banca1rm: '', pct1rm: '',
  speed10m: '', speed30m: '', agilidad505: '', vo2: '',
  notes: '', plan: '',
};
