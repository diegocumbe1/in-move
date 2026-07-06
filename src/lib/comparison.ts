import type { Level } from '@/styles/tokens';
import type { Anthropometry, Cardio, Flexibility, Performance } from '@/lib/ficha';
import { bmi, normalize, normalizeSpeed } from '@/lib/scales';

/**
 * Escalas de comparación (semáforo) por indicador — FICHA_CAMPOS.md.
 * Genera, para cada medida clasificable, la banda en la que cae el atleta
 * (bajo/medio/óptimo/atleta) con su rango de referencia.
 */

export type Band = { label: string; range: string; level: Level; active: boolean };
export type IndicatorComparison = {
  key: string;
  title: string;
  valueLabel: string;
  status: { level: Level; label: string } | null;
  bands: Band[];
};

type Sex = 'M' | 'F';

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

function sitReachComparison(sex: Sex, v: number | null | undefined): IndicatorComparison {
  const t = sex === 'M' ? [20, 27, 35] : [23, 30, 38];
  const defs: Omit<Band, 'active'>[] = [
    { label: 'Bajo', range: `< ${t[0]} cm`, level: 'danger' },
    { label: 'Promedio', range: `${t[0]} – ${t[1]} cm`, level: 'warning' },
    { label: 'Bueno', range: `${t[1] + 1} – ${t[2]} cm`, level: 'good' },
    { label: 'Excelente', range: `> ${t[2]} cm`, level: 'elite' },
  ];
  let idx = -1;
  if (v != null) idx = v < t[0] ? 0 : v <= t[1] ? 1 : v <= t[2] ? 2 : 3;
  return {
    key: 'sitReach',
    title: 'Sit and Reach',
    valueLabel: v == null ? '—' : `${v} cm`,
    status: idx < 0 ? null : { level: defs[idx].level, label: defs[idx].label },
    bands: mk(defs, idx),
  };
}

function bmiComparison(weightKg: number | null | undefined, heightCm: number | null | undefined): IndicatorComparison {
  const v = bmi(weightKg, heightCm);
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

function cmjComparison(v: number | null | undefined): IndicatorComparison {
  const defs: Omit<Band, 'active'>[] = [
    { label: 'Bajo', range: '< 32 cm', level: 'danger' },
    { label: 'Medio', range: '32 – 38 cm', level: 'warning' },
    { label: 'Óptimo', range: '38 – 44 cm', level: 'good' },
    { label: 'Atleta', range: '≥ 44 cm', level: 'elite' },
  ];
  let idx = -1;
  if (v != null) idx = v < 32 ? 0 : v < 38 ? 1 : v < 44 ? 2 : 3;
  return {
    key: 'cmj',
    title: 'Salto CMJ',
    valueLabel: v == null ? '—' : `${v} cm`,
    status: idx < 0 ? null : { level: defs[idx].level, label: defs[idx].label },
    bands: mk(defs, idx),
  };
}

export type ComparisonMeasures = {
  anthropometry?: Anthropometry | null;
  cardio?: Cardio | null;
  flexibility?: Flexibility | null;
  performance?: Performance | null;
};

export type RadarAxis = { label: string; score: number; raw: string };

/** Ejes del radar de perfil de rendimiento (0–100). */
export function buildRadar(m: ComparisonMeasures): RadarAxis[] {
  const p = m.performance ?? {};
  const squat = p.sentadilla1rmKg ?? p.fuerzaMaximaKg;
  const speed = p.velocidad10mS;
  const vo2 = p.vo2Ml;
  const cmj = p.cmjCm;
  return [
    { label: 'Fuerza', score: normalize(squat, 40, 140), raw: squat == null ? '—' : `${squat} kg` },
    { label: 'Velocidad', score: normalizeSpeed(speed), raw: speed == null ? '—' : `${speed} s` },
    { label: 'Resistencia', score: normalize(vo2, 30, 65), raw: vo2 == null ? '—' : `${vo2} ml/kg` },
    { label: 'Salto', score: normalize(cmj, 15, 55), raw: cmj == null ? '—' : `${cmj} cm` },
  ];
}

export function buildComparison(sex: Sex, m: ComparisonMeasures): IndicatorComparison[] {
  return [
    bmiComparison(m.anthropometry?.pesoKg, m.anthropometry?.estaturaCm),
    fatComparison(sex, m.anthropometry?.pctGrasa),
    masaComparison(sex, m.anthropometry?.pctMasa),
    hrComparison(m.cardio?.fcReposo),
    sitReachComparison(sex, m.flexibility?.resultadoCm),
    cmjComparison(m.performance?.cmjCm),
  ];
}
