/**
 * Ficha grupal: agregados de un grupo para el enlace público del responsable.
 *
 * Regla de privacidad: el resultado NO contiene nombres, documentos, fotos ni
 * enlaces de deportistas. Solo conteos, promedios y porcentajes. Además, un
 * indicador con menos de MIN_SAMPLE datos no se muestra: con 1 o 2 personas un
 * "promedio" es en la práctica el dato individual.
 *
 * Función pura (sin base de datos) para poder testearla.
 */
import type { Assessment, Athlete } from './mock-product.ts';
import type { Level } from '../styles/tokens.ts';
import type { GroupColumnKey } from './group-columns.ts';

export const MIN_SAMPLE = 3;

type Direction = 'higher' | 'lower' | 'neutral';

type IndicatorDef = {
  key: string;
  /** Columna de la tabla general que gobierna su visibilidad en el enlace público. */
  column: GroupColumnKey;
  label: string;
  unit: string;
  /** Qué dirección es "mejor", para leer la evolución. */
  better: Direction;
  read: (assessment: Assessment) => number | null | undefined;
};

const INDICATORS: IndicatorDef[] = [
  { key: 'score', column: 'score', label: 'Score global', unit: '/100', better: 'higher', read: (a) => a.score },
  { key: 'cmj', column: 'cmj', label: 'Salto CMJ', unit: 'cm', better: 'higher', read: (a) => a.raw?.performance?.cmjCm },
  { key: 'agility', column: 'agility', label: 'Agilidad 5-0-5', unit: 's', better: 'lower', read: (a) => a.raw?.performance?.agilidad505S },
  { key: 'bench', column: 'strength', label: 'Press banca 1RM', unit: 'kg', better: 'higher', read: (a) => a.raw?.performance?.pressBanca1rmKg },
  { key: 'sitReach', column: 'sitReach', label: 'Sit and reach', unit: 'cm', better: 'higher', read: (a) => a.raw?.flexibility?.resultadoCm },
  { key: 'fat', column: 'fat', label: 'Grasa corporal', unit: '%', better: 'lower', read: (a) => a.raw?.anthropometry?.pctGrasa },
  { key: 'imc', column: 'bmi', label: 'IMC', unit: 'kg/m²', better: 'neutral', read: (a) => a.raw?.anthropometry?.imc },
  { key: 'restingHr', column: 'hr', label: 'FC reposo', unit: 'ppm', better: 'lower', read: (a) => a.raw?.cardio?.fcReposo },
];

/** Semáforos de la ficha individual y el dato crudo que los respalda (sin dato → no cuenta). */
const TRAFFIC_LIGHTS: Array<{ label: string; column: GroupColumnKey; read: (a: Assessment) => number | null | undefined }> = [
  { label: 'Grasa corporal', column: 'fat', read: (a) => a.raw?.anthropometry?.pctGrasa },
  { label: 'FC reposo', column: 'hr', read: (a) => a.raw?.cardio?.fcReposo },
  { label: 'Sit and reach', column: 'sitReach', read: (a) => a.raw?.flexibility?.resultadoCm },
  { label: 'CMJ', column: 'cmj', read: (a) => a.raw?.performance?.cmjCm },
];

export const LEVEL_ORDER: Level[] = ['danger', 'warning', 'good', 'elite'];
export const LEVEL_LABELS: Record<Level, string> = {
  danger: 'Bajo',
  warning: 'Medio',
  good: 'Óptimo',
  elite: 'Excelente',
};

const AGE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: '11 o menos', min: 0, max: 11 },
  { label: '12 a 14', min: 12, max: 14 },
  { label: '15 a 17', min: 15, max: 17 },
  { label: '18 a 29', min: 18, max: 29 },
  { label: '30 o más', min: 30, max: 200 },
];

export type IndicatorSummary = {
  key: string;
  column: GroupColumnKey;
  label: string;
  unit: string;
  better: Direction;
  n: number;
  /** null si n < MIN_SAMPLE. */
  average: number | null;
};

export type EvolutionSummary = {
  key: string;
  column: GroupColumnKey;
  label: string;
  unit: string;
  better: Direction;
  n: number;
  previous: number;
  latest: number;
  deltaPct: number;
};

export type TrafficLightSummary = {
  label: string;
  column: GroupColumnKey;
  n: number;
  /** Porcentaje por nivel (suma 100); vacío si n < MIN_SAMPLE. */
  pct: Partial<Record<Level, number>>;
};

export type AxisSummary = { label: string; column: GroupColumnKey; n: number; average: number | null; reference: number };

export type GroupReportData = {
  members: number;
  withAssessment: number;
  lastAssessedOn: string | null;
  composition: {
    sex: { M: number; F: number };
    ages: Array<{ label: string; count: number }>;
    categories: Array<{ label: string; count: number }>;
  };
  indicators: IndicatorSummary[];
  axes: AxisSummary[];
  trafficLights: TrafficLightSummary[];
  evolution: EvolutionSummary[];
  alerts: { alert: number; followUp: number };
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const isNumber = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

function countBy<T>(items: T[], key: (item: T) => string): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** Fichas reales (con id), más recientes primero. */
const realAssessments = (athlete: Athlete) => athlete.assessments.filter((assessment) => assessment.id);

export function summarizeGroup(members: Athlete[], today: string): GroupReportData {
  const latest = members
    .map((athlete) => ({ athlete, assessment: realAssessments(athlete)[0] }))
    .filter((row): row is { athlete: Athlete; assessment: Assessment } => Boolean(row.assessment));

  const indicators = INDICATORS.map((def) => {
    const values = latest.map((row) => def.read(row.assessment)).filter(isNumber);
    return {
      key: def.key,
      column: def.column,
      label: def.label,
      unit: def.unit,
      better: def.better,
      n: values.length,
      average: values.length >= MIN_SAMPLE ? round1(mean(values)) : null,
    };
  });

  // Ejes del radar contra la referencia que ya usa la ficha individual.
  const axisKeys = latest[0]?.assessment.radar.map((axis) => axis.key) ?? [];
  const axes = axisKeys.map((key) => {
    const points = latest
      .map((row) => row.assessment.radar.find((axis) => axis.key === key))
      .filter((axis): axis is NonNullable<typeof axis> => Boolean(axis) && axis!.raw !== 'Sin dato');
    const sample = latest[0].assessment.radar.find((axis) => axis.key === key)!;
    return {
      label: sample.shortLabel,
      column: key,
      n: points.length,
      average: points.length >= MIN_SAMPLE ? Math.round(mean(points.map((axis) => axis.score))) : null,
      reference: sample.team,
    };
  });

  const trafficLights = TRAFFIC_LIGHTS.map((light) => {
    const levels = latest
      .filter((row) => isNumber(light.read(row.assessment)))
      .map((row) => row.assessment.metrics.find((metric) => metric.label === light.label)?.level)
      .filter((level): level is Level => Boolean(level));
    const pct: Partial<Record<Level, number>> = {};
    if (levels.length >= MIN_SAMPLE) {
      for (const level of LEVEL_ORDER) {
        const count = levels.filter((item) => item === level).length;
        if (count) pct[level] = Math.round((count / levels.length) * 100);
      }
    }
    return { label: light.label, column: light.column, n: levels.length, pct };
  });

  // Evolución: solo deportistas con al menos 2 fichas, ficha anterior vs última.
  const evolution: EvolutionSummary[] = [];
  for (const def of INDICATORS) {
    const pairs = members
      .map((athlete) => realAssessments(athlete))
      .filter((list) => list.length >= 2)
      .map((list) => [def.read(list[1]), def.read(list[0])] as const)
      .filter((pair): pair is readonly [number, number] => isNumber(pair[0]) && isNumber(pair[1]));
    if (pairs.length < MIN_SAMPLE) continue;
    const previous = mean(pairs.map((pair) => pair[0]));
    const current = mean(pairs.map((pair) => pair[1]));
    if (previous === 0) continue;
    evolution.push({
      key: def.key,
      column: def.column,
      label: def.label,
      unit: def.unit,
      better: def.better,
      n: pairs.length,
      previous: round1(previous),
      latest: round1(current),
      deltaPct: round1(((current - previous) / Math.abs(previous)) * 100),
    });
  }

  return {
    members: members.length,
    withAssessment: latest.length,
    lastAssessedOn: latest.reduce<string | null>((max, row) => (!max || row.assessment.date > max ? row.assessment.date : max), null),
    composition: {
      sex: { M: members.filter((athlete) => athlete.sex === 'M').length, F: members.filter((athlete) => athlete.sex === 'F').length },
      ages: AGE_BANDS.map((band) => ({
        label: band.label,
        count: members.filter((athlete) => {
          const age = ageOn(athlete.birthDate, today);
          return age >= band.min && age <= band.max;
        }).length,
      })).filter((band) => band.count > 0),
      categories: countBy(members, (athlete) => athlete.category || 'Sin categoría'),
    },
    indicators,
    axes,
    trafficLights,
    evolution,
    // Conteo sin nombre (matriz de visibilidad: "Alertas de riesgo → conteo sin nombre").
    alerts: {
      alert: latest.filter((row) => row.athlete.status === 'danger').length,
      followUp: latest.filter((row) => row.athlete.status === 'warning' && row.athlete.statusLabel !== 'Nuevo').length,
    },
  };
}
