import type { Level } from '@/styles/tokens';
import type { Anthropometry, Cardio, Flexibility, Performance } from '@/lib/ficha';
import { jumpAverage, normalize, normalizeAgility, normalizeSpeed } from '@/lib/scales';
import { cmjNorm, cmjScore, sitReachNorm, type Band, type Norm, type Sex } from '@/lib/norms';

/**
 * Escalas de comparación (semáforo) por indicador — FICHA_CAMPOS.md.
 * Genera, para cada medida clasificable, la banda en la que cae el atleta
 * (bajo/medio/óptimo/atleta) con su rango de referencia.
 * CMJ y Sit and Reach usan baremos por edad y sexo definidos en `@/lib/norms`.
 */

export type { Band, Sex };
export type IndicatorComparison = {
  key: string;
  title: string;
  valueLabel: string;
  status: { level: Level; label: string } | null;
  bands: Band[];
  /** Franja de edad y cita del baremo aplicado (sólo indicadores normativos). */
  reference?: string;
  /** Advertencia sobre el baremo (extrapolación por edad, baremo pendiente…). */
  note?: string;
};

/** Empaqueta un baremo de `norms.ts` como tarjeta de comparación. */
const fromNorm = (key: string, title: string, valueLabel: string, norm: Norm): IndicatorComparison => {
  const active = norm.activeIndex < 0 ? null : norm.bands[norm.activeIndex];
  return {
    key,
    title,
    valueLabel,
    status: active ? { level: active.level, label: active.label } : null,
    bands: norm.bands,
    reference: norm.reference,
    note: norm.note,
  };
};

const mk = (defs: Omit<Band, 'active'>[], activeIndex: number): Band[] =>
  defs.map((b, i) => ({ ...b, active: i === activeIndex }));

function fatComparison(sex: Sex, v: number | null | undefined): IndicatorComparison {
  const defs: Omit<Band, 'active'>[] =
    sex === 'M'
      ? [
          { label: 'Esencial', range: '2 – 5 %', level: 'elite' },
          { label: 'Atleta', range: '6 – 13 %', level: 'good' },
          { label: 'Saludable', range: '14 – 17 %', level: 'good' },
          { label: 'Aceptable', range: '18 – 24 %', level: 'warning' },
          { label: 'Exceso', range: '≥ 25 %', level: 'danger' },
        ]
      : [
          { label: 'Esencial', range: '10 – 13 %', level: 'elite' },
          { label: 'Atleta', range: '14 – 20 %', level: 'good' },
          { label: 'Saludable', range: '21 – 24 %', level: 'good' },
          { label: 'Aceptable', range: '25 – 31 %', level: 'warning' },
          { label: 'Exceso', range: '≥ 32 %', level: 'danger' },
        ];
  let idx = -1;
  if (v != null) {
    const t = sex === 'M' ? [5, 13, 17, 24] : [13, 20, 24, 31];
    idx = v <= t[0] ? 0 : v <= t[1] ? 1 : v <= t[2] ? 2 : v <= t[3] ? 3 : 4;
  }
  return {
    key: 'fat',
    title: '% Grasa corporal',
    valueLabel: v == null ? '—' : `${v} %`,
    status: idx < 0 ? null : { level: defs[idx].level, label: defs[idx].label },
    bands: mk(defs, idx),
  };
}

function masaComparison(sex: Sex, v: number | null | undefined): IndicatorComparison {
  const defs: Omit<Band, 'active'>[] =
    sex === 'M'
      ? [
          { label: 'Bajo', range: '< 70 %', level: 'danger' },
          { label: 'Normal', range: '70 – 85 %', level: 'good' },
          { label: 'Alto', range: '> 85 %', level: 'elite' },
        ]
      : [
          { label: 'Bajo', range: '< 65 %', level: 'danger' },
          { label: 'Normal', range: '65 – 75 %', level: 'good' },
          { label: 'Alto', range: '> 75 %', level: 'elite' },
        ];
  let idx = -1;
  if (v != null) {
    const t = sex === 'M' ? [70, 85] : [65, 75];
    idx = v < t[0] ? 0 : v <= t[1] ? 1 : 2;
  }
  return {
    key: 'masa',
    title: '% Masa magra',
    valueLabel: v == null ? '—' : `${v} %`,
    status: idx < 0 ? null : { level: defs[idx].level, label: defs[idx].label },
    bands: mk(defs, idx),
  };
}

function hrComparison(v: number | null | undefined): IndicatorComparison {
  const defs: Omit<Band, 'active'>[] = [
    { label: 'Atleta', range: '< 50 ppm', level: 'elite' },
    { label: 'Buena', range: '50 – 59 ppm', level: 'good' },
    { label: 'Normal', range: '60 – 80 ppm', level: 'warning' },
    { label: 'Baja condición', range: '> 80 ppm', level: 'danger' },
  ];
  let idx = -1;
  if (v != null) idx = v < 50 ? 0 : v <= 59 ? 1 : v <= 80 ? 2 : 3;
  return {
    key: 'hr',
    title: 'FC en reposo',
    valueLabel: v == null ? '—' : `${v} ppm`,
    status: idx < 0 ? null : { level: defs[idx].level, label: defs[idx].label },
    bands: mk(defs, idx),
  };
}

function sitReachComparison(sex: Sex, age: number | null, v: number | null | undefined): IndicatorComparison {
  return fromNorm('sitReach', 'Sit and Reach', v == null ? '—' : `${v} cm`, sitReachNorm(sex, age, v));
}

function bmiComparison(v: number | null | undefined): IndicatorComparison {
  const defs: Omit<Band, 'active'>[] = [
    { label: 'Bajo peso', range: '< 18.5', level: 'warning' },
    { label: 'Normal', range: '18.5 – 24.9', level: 'good' },
    { label: 'Sobrepeso', range: '25 – 29.9', level: 'warning' },
    { label: 'Obesidad', range: '≥ 30', level: 'danger' },
  ];
  let idx = -1;
  if (v != null) idx = v < 18.5 ? 0 : v < 25 ? 1 : v < 30 ? 2 : 3;
  return {
    key: 'bmi',
    title: 'IMC (Índice de Masa Corporal)',
    valueLabel: v == null ? '—' : v.toFixed(1),
    status: idx < 0 ? null : { level: defs[idx].level, label: defs[idx].label },
    bands: mk(defs, idx),
  };
}

function cmjComparison(sex: Sex, age: number | null, v: number | null | undefined): IndicatorComparison {
  return fromNorm('cmj', 'Salto CMJ', v == null ? '—' : `${v} cm`, cmjNorm(sex, age, v));
}

export type ComparisonMeasures = {
  anthropometry?: Anthropometry | null;
  cardio?: Cardio | null;
  flexibility?: Flexibility | null;
  performance?: Performance | null;
};

export type RadarAxis = { label: string; score: number; raw: string };

/** Ejes del radar de perfil de rendimiento (0–100). */
export function buildRadar(m: ComparisonMeasures, age: number | null = null): RadarAxis[] {
  const p = m.performance ?? {};
  const bench = p.pressBanca1rmKg;
  const speed10m = p.velocidad10mS;
  const speed20m = p.velocidad20mS;
  const speed30m = p.velocidad30mS;
  const sprintDistance = speed10m != null ? 10 : speed20m != null ? 20 : 30;
  const speed = speed10m ?? speed20m ?? speed30m;
  const agility = p.agilidad505S;
  const cmj = p.cmjCm;
  // El eje de salto promedia las tres pruebas de salto disponibles.
  const jumpAvg = jumpAverage([p.dropJumpCm ?? p.sjCm, cmj, p.abalakovCm]);
  return [
    { label: 'Fuerza', score: normalize(bench, 20, 120), raw: bench == null ? '—' : `${bench} kg` },
    { label: 'Velocidad', score: normalizeSpeed(speed == null ? null : speed * (10 / sprintDistance)), raw: speed == null ? '—' : `${speed} s (${sprintDistance} m)` },
    { label: 'Agilidad', score: normalizeAgility(agility), raw: agility == null ? '—' : `${agility} s` },
    // El salto se puntúa contra el baremo CMJ de su edad; sin edad, escala genérica.
    { label: 'Rendimiento · Salto', score: cmjScore(age, jumpAvg) ?? normalize(jumpAvg, 15, 55), raw: jumpAvg == null ? '—' : `${jumpAvg.toFixed(1)} cm (prom.)` },
  ];
}

export function buildComparison(sex: Sex, age: number | null, m: ComparisonMeasures): IndicatorComparison[] {
  return [
    bmiComparison(m.anthropometry?.imc),
    fatComparison(sex, m.anthropometry?.pctGrasa),
    masaComparison(sex, m.anthropometry?.pctMasa),
    hrComparison(m.cardio?.fcReposo),
    sitReachComparison(sex, age, m.flexibility?.resultadoCm),
    cmjComparison(sex, age, m.performance?.cmjCm),
  ];
}
