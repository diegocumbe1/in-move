/**
 * Grupos (Fase 2 · C1): reglas puras, sin base de datos, para poder testearlas.
 *
 * Grupo ≠ categoría. La categoría es el tipo de servicio del deportista (una por
 * persona, gobierna su ficha privada). El grupo es el equipo al que pertenece
 * (cero o más por persona, con histórico). Ver PLAN_FASE2_C1.md §2.1.
 */
import { z } from 'zod';
import type { Athlete } from './mock-product.ts';

export const GROUP_STATUSES = ['active', 'inactive', 'archived'] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

/**
 * Flags del grupo. Cada uno guarda el **id** del ítem de catálogo, no el texto,
 * para que renombrar en Configuración no deje grupos huérfanos.
 * disciplina → catálogo 'sport' (una sola lista con Deportes) · sede → 'sede' · modalidad → 'modalidad'.
 */
export const groupFlagsSchema = z.object({
  disciplina: z.string().uuid().optional(),
  sede: z.string().uuid().optional(),
  modalidad: z.string().uuid().optional(),
});
export type GroupFlags = z.infer<typeof groupFlagsSchema>;
export type GroupFlagKey = keyof GroupFlags;

/** Catálogo del que sale cada flag. */
export const GROUP_FLAG_CATALOG = {
  disciplina: 'sport',
  sede: 'sede',
  modalidad: 'modalidad',
} as const;

export const GROUP_FLAG_LABELS: Record<GroupFlagKey, string> = {
  disciplina: 'Disciplina',
  sede: 'Sede',
  modalidad: 'Modalidad',
};

/**
 * Responsable del grupo: quien recibe el enlace público (dueño de la escuela,
 * líder del grupo, entrenador). Teléfono y correo son solo para el admin: la
 * ficha grupal pública muestra únicamente nombre y cargo.
 */
export type GroupResponsible = {
  name: string;
  role: string;
  phone: string;
  email: string;
};

export const RESPONSIBLE_ROLE_SUGGESTIONS = ['Dueño', 'Líder del grupo', 'Entrenador', 'Coordinador', 'Rector / director'];

/** Grupo tal como lo consume la UI. */
export type GroupSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string | null;
  flags: GroupFlags;
  capacity: number | null;
  responsible: GroupResponsible | null;
  /** Token del enlace público; null = desactivado. */
  shareToken: string | null;
  status: GroupStatus;
  startsOn: string | null;
  endsOn: string | null;
  /** Deportistas con membresía activa (left_at is null). */
  memberIds: string[];
};

export type GroupInput = {
  name: string;
  description?: string;
  color?: string | null;
  flags?: GroupFlags;
  capacity?: number | null;
  responsible?: GroupResponsible | null;
  status?: GroupStatus;
  startsOn?: string | null;
  endsOn?: string | null;
};

/**
 * Normaliza el responsable. null si no se diligenció nombre; mensaje de error
 * si algún dato es inválido.
 */
export function cleanResponsible(input: GroupResponsible | null | undefined): { value: GroupResponsible | null } | { error: string } {
  if (!input) return { value: null };
  const value: GroupResponsible = {
    name: input.name?.trim() ?? '',
    role: input.role?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    email: input.email?.trim().toLowerCase() ?? '',
  };
  if (!value.name && !value.role && !value.phone && !value.email) return { value: null };
  if (value.name.length < 2) return { error: 'El responsable necesita un nombre (mínimo 2 caracteres).' };
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { error: 'El correo del responsable no es válido.' };
  if (value.phone && !/^[+\d\s()-]{7,20}$/.test(value.phone)) return { error: 'El teléfono del responsable no es válido.' };
  return { value };
}

/**
 * Slug normalizado: sin tildes, minúsculas, espacios colapsados a guiones.
 * "Running", "running " y "RUNNING" dan el mismo slug y la base rechaza el
 * duplicado. Es el seguro contra volver a partir un equipo en dos grafías.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Límites de plan (app_settings.plan_limits) ──────────────────────────────

/**
 * INTERRUPTOR de los límites de plan (propuesta §3). Un solo cambio aquí:
 *  - true  → se aplican los topes (grupos activos, deportistas por grupo) y la
 *            tarjeta "Límites del plan" aparece en Settings.
 *  - false → no hay topes de plan y la tarjeta se oculta. El cupo propio de cada
 *            grupo (Editar grupo → Cupo máximo) se sigue respetando si se define.
 * Los valores guardados en app_settings.plan_limits no se borran al apagarlo.
 */
export const PLAN_LIMITS_ENABLED = true;

export type PlanLimits = {
  /** Viene siempre de PLAN_LIMITS_ENABLED; no se guarda en la base. */
  enabled: boolean;
  maxActiveGroups: number;
  maxMembersPerGroup: number;
  maxPhotoMb: number;
  rankingRetention: number;
};

export const DEFAULT_PLAN_LIMITS: PlanLimits = {
  enabled: PLAN_LIMITS_ENABLED,
  maxActiveGroups: 8,
  maxMembersPerGroup: 40,
  maxPhotoMb: 1,
  rankingRetention: 24,
};

/** Umbral a partir del cual el panel avisa que se acerca al límite. */
export const LIMIT_WARNING_RATIO = 0.8;

export type LimitState = 'ok' | 'warning' | 'full';

export function limitState(used: number, max: number): LimitState {
  if (max <= 0) return 'full';
  if (used >= max) return 'full';
  if (used / max >= LIMIT_WARNING_RATIO) return 'warning';
  return 'ok';
}

/**
 * Cupo efectivo del grupo: el menor entre su cupo propio y el del plan.
 * null = sin tope (límites apagados y el grupo no tiene cupo propio).
 */
export function effectiveCapacity(capacity: number | null, limits: PlanLimits): number | null {
  const own = capacity && capacity > 0 ? capacity : null;
  if (!limits.enabled) return own;
  return own ? Math.min(own, limits.maxMembersPerGroup) : limits.maxMembersPerGroup;
}

/** Mensaje de error si no caben `adding` deportistas más; null si caben. */
export function capacityProblem(
  group: Pick<GroupSummary, 'name' | 'capacity' | 'memberIds'>,
  adding: number,
  limits: PlanLimits,
): string | null {
  const max = effectiveCapacity(group.capacity, limits);
  if (max == null) return null;
  const next = group.memberIds.length + adding;
  return next > max ? `${group.name} tiene cupo para ${max} deportistas (quedaría con ${next}).` : null;
}

/** Mensaje de error si activar un grupo más supera el límite del plan; null si cabe. */
export function activeGroupsProblem(activeCount: number, limits: PlanLimits): string | null {
  if (!limits.enabled) return null;
  return activeCount >= limits.maxActiveGroups
    ? `El plan permite ${limits.maxActiveGroups} grupos activos. Archiva o inactiva uno para crear otro.`
    : null;
}

/**
 * Espejo de escritura doble: `athletes.group` guarda el nombre del primer grupo
 * activo (orden alfabético, para que sea estable) o null si no tiene ninguno.
 */
export function mirrorGroupName(groupNames: string[]): string | null {
  const sorted = [...groupNames].sort((a, b) => a.localeCompare(b, 'es'));
  return sorted[0] ?? null;
}

// ── Ranking simple dentro del grupo ────────────────────────────────────────
// Ordena por los puntajes 0-100 que ya calcula `buildAssessment` (más alto =
// mejor en todos, incluso velocidad y agilidad, que ya vienen invertidos).
// El motor configurable (percentil, normalización por sexo/edad, cortes por
// periodo, movimiento) es Fase 3.

export const RANKING_INDICATORS = [
  { key: 'score', label: 'Score global' },
  { key: 'jump', label: 'Salto' },
  { key: 'speed', label: 'Velocidad' },
  { key: 'agility', label: 'Agilidad' },
  { key: 'strength', label: 'Fuerza' },
] as const;
export type RankingIndicator = (typeof RANKING_INDICATORS)[number]['key'];

export type RankingRow = {
  athlete: Athlete;
  position: number;
  score: number;
  /** Valor medido legible (ej. "32.4 cm (prom.)"), o el score si es el global. */
  display: string;
  assessedOn: string;
};

/**
 * Ranking por la última ficha real de cada deportista. Quien no tiene ficha, o
 * no tiene dato en ese indicador, queda fuera (no se le pone 0). Empates
 * comparten posición (1, 2, 2, 4).
 */
export function rankAthletes(athletes: Athlete[], indicator: RankingIndicator): { rows: RankingRow[]; withoutData: Athlete[] } {
  const scored: Omit<RankingRow, 'position'>[] = [];
  const withoutData: Athlete[] = [];

  for (const athlete of athletes) {
    const latest = athlete.assessments.find((assessment) => assessment.id);
    if (!latest) {
      withoutData.push(athlete);
      continue;
    }
    if (indicator === 'score') {
      scored.push({ athlete, score: latest.score, display: `${latest.score}/100`, assessedOn: latest.date });
      continue;
    }
    const axis = latest.radar.find((metric) => metric.key === indicator);
    if (!axis || axis.raw === 'Sin dato') {
      withoutData.push(athlete);
      continue;
    }
    scored.push({ athlete, score: axis.score, display: axis.raw, assessedOn: latest.date });
  }

  scored.sort((a, b) => b.score - a.score || a.athlete.name.localeCompare(b.athlete.name, 'es'));
  const rows: RankingRow[] = [];
  scored.forEach((row, index) => {
    const previous = rows[index - 1];
    const position = previous && previous.score === row.score ? previous.position : index + 1;
    rows.push({ ...row, position });
  });
  return { rows, withoutData };
}
