import type { Level } from '@/styles/tokens';
import type { Assessment, Athlete, RadarMetric, ScaleMetric } from '@/lib/mock-product';
import type { Anthropometry, Cardio, Flexibility, Performance, Rom } from '@/lib/ficha';

/**
 * Escalas de clasificación (semáforo) y cálculos derivados de la ficha.
 * Funciones puras: se usan tanto en el servidor (mapear filas de BD a la ficha
 * calculada) como en el cliente (previsualización en vivo).
 * Rangos basados en FICHA_CAMPOS.md.
 */

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
export const normalize = (value: number | null | undefined, min: number, max: number) =>
  value == null ? 0 : clampScore(((value - min) / (max - min)) * 100);
export const normalizeSpeed = (seconds: number | null | undefined) =>
  seconds == null || seconds <= 0 ? 0 : clampScore(((2.4 - seconds) / (2.4 - 1.5)) * 100);
export const kmhFrom10m = (seconds: number | null | undefined) =>
  seconds == null || seconds <= 0 ? null : (10 / seconds) * 3.6;

export const yearsBetween = (fromDate: string, toDate: string) => {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const years = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years >= 0 ? years : null;
};
export const chronologicalAge = (birthDate: string, assessmentDate: string) => {
  const years = yearsBetween(birthDate, assessmentDate);
  return years == null ? null : Math.floor(years);
};
export const biologicalAge = (
  sex: Athlete['sex'],
  birthDate: string,
  assessmentDate: string,
  heightCm: number | null | undefined,
) => {
  const ageDecimal = yearsBetween(birthDate, assessmentDate);
  if (ageDecimal == null || heightCm == null || heightCm <= 0) return null;
  const ageHeight = ageDecimal * heightCm;
  const offset = sex === 'M' ? -7.999994 + 0.0036124 * ageHeight : -7.709133 + 0.0042232 * ageHeight;
  const peakHeightVelocity = sex === 'M' ? 13.8 : 12.0;
  return peakHeightVelocity + offset;
};

const noData = { level: 'warning' as Level, label: 'Sin dato', range: 'Pendiente' };

/** Índice de Masa Corporal = peso(kg) / estatura(m)². */
export const bmi = (weightKg: number | null | undefined, heightCm: number | null | undefined) => {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
};

export const classifyBmi = (value: number | null | undefined) => {
  if (value == null) return noData;
  if (value < 18.5) return { level: 'warning' as Level, label: 'Bajo peso', range: '< 18.5' };
  if (value < 25) return { level: 'good' as Level, label: 'Normal', range: '18.5 – 24.9' };
  if (value < 30) return { level: 'warning' as Level, label: 'Sobrepeso', range: '25 – 29.9' };
  return { level: 'danger' as Level, label: 'Obesidad', range: '≥ 30' };
};

/** Explosividad = carga(kg) / tiempo(s). Índice simple de potencia con encoder. */
export const explosiveness = (kg: number | null | undefined, seconds: number | null | undefined) =>
  kg == null || seconds == null || seconds <= 0 ? null : kg / seconds;

export const classifyFat = (sex: Athlete['sex'], value: number | null | undefined) => {
  if (value == null) return noData;
  if (sex === 'M') {
    if (value <= 13) return { level: 'good' as Level, label: 'Optimo', range: '6-13 %' };
    if (value <= 17) return { level: 'good' as Level, label: 'Optimo', range: '14-17 %' };
    if (value <= 24) return { level: 'warning' as Level, label: 'Medio', range: '18-24 %' };
    return { level: 'danger' as Level, label: 'Bajo', range: '>= 25 %' };
  }
  if (value <= 20) return { level: 'good' as Level, label: 'Optimo', range: '14-20 %' };
  if (value <= 24) return { level: 'good' as Level, label: 'Optimo', range: '21-24 %' };
  if (value <= 31) return { level: 'warning' as Level, label: 'Medio', range: '25-31 %' };
  return { level: 'danger' as Level, label: 'Bajo', range: '>= 32 %' };
};

export const classifyRestingHr = (value: number | null | undefined) => {
  if (value == null) return noData;
  if (value < 50) return { level: 'elite' as Level, label: 'Atleta', range: '< 50 ppm' };
  if (value <= 59) return { level: 'good' as Level, label: 'Optimo', range: '50-59 ppm' };
  if (value <= 80) return { level: 'warning' as Level, label: 'Medio', range: '60-80 ppm' };
  return { level: 'danger' as Level, label: 'Bajo', range: '> 80 ppm' };
};

export const classifySitReach = (sex: Athlete['sex'], value: number | null | undefined) => {
  if (value == null) return noData;
  const limits = sex === 'M' ? [20, 27, 35] : [23, 30, 38];
  if (value < limits[0]) return { level: 'danger' as Level, label: 'Bajo', range: `< ${limits[0]} cm` };
  if (value <= limits[1]) return { level: 'warning' as Level, label: 'Medio', range: `${limits[0]}-${limits[1]} cm` };
  if (value <= limits[2]) return { level: 'good' as Level, label: 'Optimo', range: `${limits[1]}-${limits[2]} cm` };
  return { level: 'elite' as Level, label: 'Atleta', range: `> ${limits[2]} cm` };
};

export const classifyCmj = (value: number | null | undefined) => {
  if (value == null) return noData;
  if (value >= 44) return { level: 'elite' as Level, label: 'Atleta', range: '>= 44 cm' };
  if (value >= 38) return { level: 'good' as Level, label: 'Optimo', range: '38-46 cm' };
  if (value >= 32) return { level: 'warning' as Level, label: 'Medio', range: '32-38 cm' };
  return { level: 'danger' as Level, label: 'Bajo', range: '< 32 cm' };
};

export type FichaMeasures = {
  anthropometry?: Anthropometry | null;
  cardio?: Cardio | null;
  rom?: Rom | null;
  flexibility?: Flexibility | null;
  performance?: Performance | null;
  observations?: string | null;
  plan?: string | null;
};

/** Construye la Assessment calculada (radar + semáforos + perfil) desde las medidas crudas. */
export function buildAssessment(
  sex: Athlete['sex'],
  birthDate: string,
  assessedOn: string,
  m: FichaMeasures,
  id?: string,
): Assessment {
  const fat = m.anthropometry?.pctGrasa ?? null;
  const weight = m.anthropometry?.pesoKg ?? null;
  const height = m.anthropometry?.estaturaCm ?? null;
  const restingHr = m.cardio?.fcReposo ?? null;
  const sitReach = m.flexibility?.resultadoCm ?? null;
  const cmj = m.performance?.cmjCm ?? null;
  const speed10m = m.performance?.velocidad10mS ?? null;
  const squat = m.performance?.sentadilla1rmKg ?? null;
  const vo2 = m.performance?.vo2Ml ?? null;
  const kmh = kmhFrom10m(speed10m);

  const fatStatus = classifyFat(sex, fat);
  const hrStatus = classifyRestingHr(restingHr);
  const sitStatus = classifySitReach(sex, sitReach);
  const cmjStatus = classifyCmj(cmj);

  const metrics: ScaleMetric[] = [
    { label: 'Grasa corporal', value: fat ?? 0, unit: '%', level: fatStatus.level, levelLabel: fatStatus.label, range: fatStatus.range },
    { label: 'FC reposo', value: restingHr ?? 0, unit: 'ppm', level: hrStatus.level, levelLabel: hrStatus.label, range: hrStatus.range },
    { label: 'Sit and reach', value: sitReach ?? 0, unit: 'cm', level: sitStatus.level, levelLabel: sitStatus.label, range: sitStatus.range },
    { label: 'CMJ', value: cmj ?? 0, unit: 'cm', level: cmjStatus.level, levelLabel: cmjStatus.label, range: cmjStatus.range },
  ];

  const radar: RadarMetric[] = [
    { key: 'strength', label: 'Fuerza maxima', shortLabel: 'Fuerza', score: normalize(squat, 40, 140), team: 70, raw: squat == null ? 'Sin dato' : `${squat} kg`, source: 'Sentadilla 1RM' },
    { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: normalizeSpeed(speed10m), team: 68, raw: kmh == null ? 'Sin dato' : `${kmh.toFixed(1)} km/h`, source: 'Sprint 10 m' },
    { key: 'endurance', label: 'Resistencia', shortLabel: 'Resistencia', score: normalize(vo2, 30, 65), team: 66, raw: vo2 == null ? 'Sin dato' : `${vo2} ml/kg`, source: 'VO2max' },
    { key: 'jump', label: 'Altura de salto', shortLabel: 'Salto', score: normalize(cmj, 15, 55), team: 61, raw: cmj == null ? 'Sin dato' : `${cmj} cm`, source: 'CMJ' },
  ];

  return {
    id,
    date: assessedOn,
    score: Math.round(radar.reduce((total, metric) => total + metric.score, 0) / radar.length),
    radar,
    metrics,
    profile: {
      weight,
      height,
      chronologicalAge: chronologicalAge(birthDate, assessedOn),
      biologicalAge: biologicalAge(sex, birthDate, assessedOn, height),
      speed10m,
      squat1rm: squat,
      vo2,
      notes: m.observations ?? '',
    },
    raw: {
      anthropometry: m.anthropometry ?? null,
      cardio: m.cardio ?? null,
      rom: m.rom ?? null,
      flexibility: m.flexibility ?? null,
      performance: m.performance ?? null,
      plan: m.plan ?? null,
    },
  };
}

/** Deriva el estado global del deportista a partir de sus semáforos. */
export function deriveStatus(assessment: Assessment): { status: Level; statusLabel: string } {
  const levels = assessment.metrics.map((metric) => metric.level);
  if (levels.every((level) => level === 'warning')) return { status: 'warning', statusLabel: 'Nuevo' };
  if (levels.includes('danger')) return { status: 'danger', statusLabel: 'Alerta' };
  if (levels.includes('warning')) return { status: 'warning', statusLabel: 'Seguimiento' };
  if (levels.includes('elite')) return { status: 'elite', statusLabel: 'Atleta' };
  return { status: 'good', statusLabel: 'Optimo' };
}
