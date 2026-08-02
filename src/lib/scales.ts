import type { Level } from '@/styles/tokens';
import type { Assessment, Athlete, RadarMetric, ScaleMetric } from '@/lib/mock-product';
import type { Anthropometry, Cardio, Flexibility, Performance, Rom } from '@/lib/ficha';
import { cmjNorm, cmjScore, sitReachNorm, type Norm } from '@/lib/norms';

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
/**
 * Promedio de los saltos disponibles (Drop Jump, CMJ, Abalakov).
 * Ignora los que no se midieron; si no hay ninguno devuelve null.
 */
export const jumpAverage = (values: Array<number | null | undefined>) => {
  const measured = values.filter((v): v is number => v != null && Number.isFinite(v));
  return measured.length ? measured.reduce((total, v) => total + v, 0) / measured.length : null;
};
/**
 * Agilidad (test 5-0-5, segundos): menor es mejor.
 * Escala PROVISIONAL 3.6 s = 0 → 2.2 s = 100 (pendiente de baremo definitivo).
 */
export const normalizeAgility = (seconds: number | null | undefined) =>
  seconds == null || seconds <= 0 ? 0 : clampScore(((3.6 - seconds) / (3.6 - 2.2)) * 100);
export const kmhFrom10m = (seconds: number | null | undefined) =>
  seconds == null || seconds <= 0 ? null : (10 / seconds) * 3.6;
export const kmhFromSprint = (meters: number, seconds: number | null | undefined) =>
  seconds == null || seconds <= 0 ? null : (meters / seconds) * 3.6;

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
  sittingHeightCm: number | null | undefined,
  weightKg: number | null | undefined,
) => {
  const ageDecimal = yearsBetween(birthDate, assessmentDate);
  if (
    ageDecimal == null ||
    heightCm == null ||
    sittingHeightCm == null ||
    weightKg == null ||
    heightCm <= 0 ||
    sittingHeightCm <= 0 ||
    weightKg <= 0 ||
    sittingHeightCm >= heightCm
  ) return null;

  const legLengthCm = heightCm - sittingHeightCm;
  const weightHeightRatio = (weightKg / heightCm) * 100;
  const maturityOffset = sex === 'M'
    ? -9.236 +
      0.0002708 * (legLengthCm * sittingHeightCm) -
      0.001663 * (ageDecimal * legLengthCm) +
      0.007216 * (ageDecimal * sittingHeightCm) +
      0.02292 * weightHeightRatio
    : -9.376 +
      0.0001882 * (legLengthCm * sittingHeightCm) +
      0.0022 * (ageDecimal * legLengthCm) +
      0.005841 * (ageDecimal * sittingHeightCm) -
      0.002658 * (ageDecimal * weightKg) +
      0.07693 * weightHeightRatio;

  return ageDecimal - maturityOffset;
};

const noData = { level: 'warning' as Level, label: 'Sin dato', range: 'Pendiente' };

/** IMC manual: por ahora no se calcula desde peso/estatura; se captura en el formulario. */
export const bmi = (weightKg: number | null | undefined, heightCm: number | null | undefined) => {
  return null;
  /*
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
  */
};

export const classifyBmi = (value: number | null | undefined) => {
  if (value == null) return noData;
  if (value < 18.5) return { level: 'warning' as Level, label: 'Bajo peso', range: '< 18.5' };
  if (value < 25) return { level: 'good' as Level, label: 'Normal', range: '18.5 – 24.9' };
  if (value < 30) return { level: 'warning' as Level, label: 'Sobrepeso', range: '25 – 29.9' };
  return { level: 'danger' as Level, label: 'Obesidad', range: '≥ 30' };
};

/** Legacy: antes se derivaba velocidad desde desplazamiento/tiempo; el encoder ahora entrega Vm directamente. */
export const averageVelocity = (meters: number | null | undefined, seconds: number | null | undefined) =>
  meters == null || seconds == null || seconds <= 0 ? null : meters / seconds;

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

/** Banda activa de un baremo como semáforo `{ level, label, range }`. */
const fromNorm = (norm: Norm) => {
  const band = norm.activeIndex < 0 ? null : norm.bands[norm.activeIndex];
  return band ? { level: band.level, label: band.label, range: band.range } : noData;
};

/** Sit and Reach por edad y sexo (Emilio y Martínez, 2002) — ver `@/lib/norms`. */
export const classifySitReach = (
  sex: Athlete['sex'],
  age: number | null | undefined,
  value: number | null | undefined,
) => (value == null ? noData : fromNorm(sitReachNorm(sex, age, value)));

/** CMJ por franja de edad (percentiles P25/P75) — ver `@/lib/norms`. */
export const classifyCmj = (
  sex: Athlete['sex'],
  age: number | null | undefined,
  value: number | null | undefined,
) => (value == null ? noData : fromNorm(cmjNorm(sex, age, value)));

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
  const sittingHeight = m.anthropometry?.estaturaSentadoCm ?? null;
  const imc = m.anthropometry?.imc ?? null;
  const restingHr = m.cardio?.fcReposo ?? null;
  const sitReach = m.flexibility?.resultadoCm ?? null;
  const cmj = m.performance?.cmjCm ?? null;
  const speed10m = m.performance?.velocidad10mS ?? null;
  const speed20m = m.performance?.velocidad20mS ?? null;
  const speed30m = m.performance?.velocidad30mS ?? null;
  const sprintDistance = speed10m != null ? 10 : speed20m != null ? 20 : 30;
  const sprintSeconds = speed10m ?? speed20m ?? speed30m;
  const squat = m.performance?.sentadilla1rmKg ?? null;
  const bench = m.performance?.pressBanca1rmKg ?? null;
  const vo2 = m.performance?.vo2Ml ?? null;
  const agility = m.performance?.agilidad505S ?? null;
  // El eje de salto promedia las tres pruebas de salto disponibles.
  const jumpAvg = jumpAverage([m.performance?.dropJumpCm ?? m.performance?.sjCm, cmj, m.performance?.abalakovCm]);
  const agilityLabel = m.performance?.agilidadLabel?.trim() || 'Test 5-0-5';
  const kmh = kmhFromSprint(sprintDistance, sprintSeconds);
  const age = chronologicalAge(birthDate, assessedOn);

  const fatStatus = classifyFat(sex, fat);
  const hrStatus = classifyRestingHr(restingHr);
  const sitStatus = classifySitReach(sex, age, sitReach);
  const cmjStatus = classifyCmj(sex, age, cmj);

  const metrics: ScaleMetric[] = [
    { label: 'Grasa corporal', value: fat ?? 0, unit: '%', level: fatStatus.level, levelLabel: fatStatus.label, range: fatStatus.range },
    { label: 'FC reposo', value: restingHr ?? 0, unit: 'ppm', level: hrStatus.level, levelLabel: hrStatus.label, range: hrStatus.range },
    { label: 'Sit and reach', value: sitReach ?? 0, unit: 'cm', level: sitStatus.level, levelLabel: sitStatus.label, range: sitStatus.range },
    { label: 'CMJ', value: cmj ?? 0, unit: 'cm', level: cmjStatus.level, levelLabel: cmjStatus.label, range: cmjStatus.range },
  ];

  const radar: RadarMetric[] = [
    { key: 'strength', label: 'Fuerza', shortLabel: 'Fuerza', score: normalize(bench, 20, 120), team: 70, raw: bench == null ? 'Sin dato' : `${bench} kg`, source: 'Press banca 1RM' },
    { key: 'speed', label: 'Velocidad punta', shortLabel: 'Velocidad', score: normalizeSpeed(sprintSeconds == null ? null : sprintSeconds * (10 / sprintDistance)), team: 68, raw: kmh == null ? 'Sin dato' : `${kmh.toFixed(1)} km/h`, source: `Sprint ${sprintDistance} m` },
    { key: 'agility', label: 'Agilidad', shortLabel: 'Agilidad', score: normalizeAgility(agility), team: 66, raw: agility == null ? 'Sin dato' : `${agility} s`, source: agilityLabel },
    { key: 'jump', label: 'Rendimiento · Salto', shortLabel: 'Salto', score: cmjScore(age, jumpAvg) ?? normalize(jumpAvg, 15, 55), team: 61, raw: jumpAvg == null ? 'Sin dato' : `${jumpAvg.toFixed(1)} cm (prom.)`, source: 'Drop Jump · CMJ · Abalakov' },
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
      bmi: imc,
      chronologicalAge: age,
      biologicalAge: biologicalAge(sex, birthDate, assessedOn, height, sittingHeight, weight),
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
