/**
 * Tabla general del grupo: un deportista por fila y una columna por indicador,
 * cada celda con su valor y la escala de color donde cae.
 *
 * Módulo puro (sin base de datos ni alias `@/`) para poder testearlo. Las celdas
 * se calculan en `group-cells.ts`, que sí depende de las escalas de la ficha.
 */
import type { Level } from '../styles/tokens.ts';
import type { Assessment, Athlete } from './mock-product.ts';

export const MIN_PUBLIC_RANKING = 3;

/** Las claves del radar (strength, speed, agility, jump) coinciden a propósito. */
export const GROUP_COLUMNS = [
  { key: 'score', label: 'Score global', better: 'higher' },
  { key: 'jump', label: 'Salto (prom.)', better: 'higher' },
  { key: 'cmj', label: 'Salto CMJ', better: 'higher' },
  { key: 'strength', label: 'Fuerza', better: 'higher' },
  { key: 'speed', label: 'Velocidad', better: 'higher' },
  { key: 'agility', label: 'Agilidad', better: 'higher' },
  { key: 'sitReach', label: 'Flexibilidad', better: 'higher' },
  { key: 'fat', label: '% grasa', better: 'lower' },
  { key: 'masa', label: '% masa muscular', better: 'higher' },
  { key: 'bmi', label: 'IMC', better: 'neutral' },
  { key: 'hr', label: 'FC reposo', better: 'lower' },
] as const;

export type GroupColumnKey = (typeof GROUP_COLUMNS)[number]['key'];
export const GROUP_COLUMN_KEYS = GROUP_COLUMNS.map((column) => column.key) as GroupColumnKey[];

export type ScaleCell = {
  /** Valor legible (ej. "32.4 cm", "2.7 s"). */
  display: string;
  /** Valor numérico para ordenar la columna. */
  value: number;
  level: Level | null;
  levelLabel: string;
  bands: Array<{ label: string; level: Level }>;
  /** -1 si el valor no cae en ninguna banda (ej. edad fuera del baremo). */
  activeIndex: number;
};

export type GroupCells = Record<GroupColumnKey, ScaleCell | null>;

/**
 * Escala para los puntajes 0–100 (score global y ejes del radar). Los cortes son
 * los mismos para todos: el puntaje ya viene normalizado por indicador.
 */
export const SCORE_BANDS: Array<{ label: string; level: Level; min: number }> = [
  { label: 'Bajo', level: 'danger', min: 0 },
  { label: 'Medio', level: 'warning', min: 40 },
  { label: 'Óptimo', level: 'good', min: 60 },
  { label: 'Excelente', level: 'elite', min: 80 },
];

export function scoreCell(score: number, display: string): ScaleCell {
  let activeIndex = 0;
  SCORE_BANDS.forEach((band, index) => {
    if (score >= band.min) activeIndex = index;
  });
  const active = SCORE_BANDS[activeIndex];
  return {
    display,
    value: score,
    level: active.level,
    levelLabel: active.label,
    bands: SCORE_BANDS.map(({ label, level }) => ({ label, level })),
    activeIndex,
  };
}

// ── Configuración de la tabla general (en Settings) ────────────────────────

/** Cómo se identifica a cada deportista en el ranking público. */
export const PUBLIC_IDENTITIES = [
  { key: 'none', label: 'Anónimo' },
  { key: 'name', label: 'Solo nombre' },
  { key: 'photo', label: 'Solo foto' },
  { key: 'both', label: 'Nombre y foto' },
] as const;
export type PublicIdentity = (typeof PUBLIC_IDENTITIES)[number]['key'];

export const showsName = (identity: PublicIdentity) => identity === 'name' || identity === 'both';
export const showsPhoto = (identity: PublicIdentity) => identity === 'photo' || identity === 'both';

export type GroupPublicSettings = {
  /** 'none' (por defecto): el ranking público sale sin nombre ni foto. */
  identity: PublicIdentity;
  /** Indicadores visibles en el enlace público (tabla, promedios, semáforo y evolución). */
  columns: GroupColumnKey[];
  /** Indicadores visibles en la tabla del módulo Grupos (admin). */
  adminColumns: GroupColumnKey[];
  /**
   * Grupos SIN tabla general ni ranking. Se guardan los excluidos (no los
   * incluidos) para que un grupo nuevo quede activado sin tener que configurarlo.
   */
  excludedGroupIds: string[];
};

/** Por defecto no se publican medidas corporales: la grasa solo en promedio (propuesta, matriz de visibilidad). */
export const DEFAULT_GROUP_PUBLIC_SETTINGS: GroupPublicSettings = {
  identity: 'none',
  columns: ['score', 'jump', 'cmj', 'strength', 'speed', 'agility', 'sitReach'],
  adminColumns: GROUP_COLUMN_KEYS,
  excludedGroupIds: [],
};

export const groupTableEnabled = (settings: GroupPublicSettings, groupId: string) => !settings.excludedGroupIds.includes(groupId);

function parseIdentity(parsed: Partial<GroupPublicSettings> & { showNames?: unknown }): PublicIdentity {
  if (PUBLIC_IDENTITIES.some((option) => option.key === parsed.identity)) return parsed.identity!;
  // Configuración guardada con el interruptor anterior (nombres y fotos juntos).
  return parsed.showNames === true ? 'both' : 'none';
}

export function parseGroupPublicSettings(raw: string | null | undefined): GroupPublicSettings {
  if (!raw) return DEFAULT_GROUP_PUBLIC_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<GroupPublicSettings> & { showNames?: unknown };
    const pickColumns = (value: unknown, fallback: GroupColumnKey[]) =>
      Array.isArray(value) ? GROUP_COLUMN_KEYS.filter((key) => value.includes(key)) : fallback;
    return {
      identity: parseIdentity(parsed),
      columns: pickColumns(parsed.columns, DEFAULT_GROUP_PUBLIC_SETTINGS.columns),
      adminColumns: pickColumns(parsed.adminColumns, DEFAULT_GROUP_PUBLIC_SETTINGS.adminColumns),
      excludedGroupIds: Array.isArray(parsed.excludedGroupIds)
        ? parsed.excludedGroupIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return DEFAULT_GROUP_PUBLIC_SETTINGS;
  }
}

// ── Ranking global del grupo ───────────────────────────────────────────────

export type RankedMember = { athlete: Athlete; assessment: Assessment; position: number };

/**
 * Orden por score global de la última ficha real. Quien no tiene ficha queda
 * fuera. Empates comparten posición (1, 2, 2, 4).
 */
export function rankByScore(members: Athlete[]): { ranked: RankedMember[]; withoutAssessment: Athlete[] } {
  const withAssessment: Array<{ athlete: Athlete; assessment: Assessment }> = [];
  const withoutAssessment: Athlete[] = [];
  for (const athlete of members) {
    const assessment = athlete.assessments.find((item) => item.id);
    if (assessment) withAssessment.push({ athlete, assessment });
    else withoutAssessment.push(athlete);
  }
  withAssessment.sort((a, b) => b.assessment.score - a.assessment.score || a.athlete.name.localeCompare(b.athlete.name, 'es'));
  const ranked: RankedMember[] = [];
  withAssessment.forEach((row, index) => {
    const previous = ranked[index - 1];
    const position = previous && previous.assessment.score === row.assessment.score ? previous.position : index + 1;
    ranked.push({ ...row, position });
  });
  return { ranked, withoutAssessment };
}

export type PublicRankingRow = {
  position: number;
  /** null si la configuración no publica nombres. */
  name: string | null;
  /** null si la configuración no publica fotos. */
  photoUrl: string | null;
  cells: Partial<Record<GroupColumnKey, ScaleCell | null>>;
};

export type PublicRanking = {
  /** false si el grupo está excluido de la tabla general en Settings. */
  enabled: boolean;
  identity: PublicIdentity;
  columns: GroupColumnKey[];
  rows: PublicRankingRow[];
  withoutAssessment: number;
};

/**
 * Ranking para el enlace público: solo las columnas configuradas y, si los
 * nombres están apagados, sin nombre ni foto. Con menos de MIN_PUBLIC_RANKING
 * deportistas valorados no se publica (cada fila sería identificable).
 */
export function buildPublicRanking(
  members: Athlete[],
  settings: GroupPublicSettings,
  cellsFor: (athlete: Athlete, assessment: Assessment) => GroupCells,
  enabled = true,
): PublicRanking {
  const { ranked, withoutAssessment } = rankByScore(members);
  const rows =
    !enabled || ranked.length < MIN_PUBLIC_RANKING || settings.columns.length === 0
      ? []
      : ranked.map(({ athlete, assessment, position }) => {
          const all = cellsFor(athlete, assessment);
          return {
            position,
            name: showsName(settings.identity) ? athlete.name : null,
            photoUrl: showsPhoto(settings.identity) ? athlete.photoUrl ?? null : null,
            cells: Object.fromEntries(settings.columns.map((key) => [key, all[key]])),
          };
        });
  return { enabled, identity: settings.identity, columns: settings.columns, rows, withoutAssessment: withoutAssessment.length };
}

/** Orden de una columna según qué es "mejor"; sin dato siempre al final. */
export function compareCells(a: ScaleCell | null, b: ScaleCell | null, better: 'higher' | 'lower' | 'neutral'): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return better === 'lower' ? a.value - b.value : b.value - a.value;
}
