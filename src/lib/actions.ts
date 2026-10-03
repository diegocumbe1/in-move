'use server';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { athletes, assessments, catalogItems, appSettings, groupMembers, groups } from '@/db/schema';
import { DEFAULT_PLAN_LIMITS, type GroupFlags, type GroupSummary, type PlanLimits } from '@/lib/groups';
import { getGroupPublicSettings, getPlanLimits, listGroups } from '@/lib/group-actions';
import { DEFAULT_GROUP_PUBLIC_SETTINGS, type GroupPublicSettings } from '@/lib/group-columns';
import { generateCode } from '@/lib/mock-product';
import { isFutureIso, isValidIsoDate, todayIso } from '@/lib/date';
import type { Athlete, ProductSettings } from '@/lib/mock-product';
import type { NewAthleteInput, AssessmentDraftInput } from '@/lib/form-types';
import { defaultFichaSections, FICHA_SECTION_KEYS, type CatalogKind, type FichaSectionsConfig, type FichaSectionKey } from '@/lib/ficha';
import { toAthlete } from '@/lib/athlete-mapper';

/**
 * Fecha de valoración: `yyyy-mm-dd` válido y no futuro (según el calendario de
 * Bogotá). Cualquier otra cosa cae a hoy en Bogotá.
 */
const assessedOnDate = (value: string | undefined): string => {
  const trimmed = value?.trim();
  if (!isValidIsoDate(trimmed) || isFutureIso(trimmed)) return todayIso();
  return trimmed;
};

/** Campo de catálogo opcional: vacío o solo espacios se guarda como null. */
const optionalLabel = (value: string | undefined): string | null => value?.trim() || null;

const num = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Ítem de catálogo con id: los flags de grupo guardan el id, no el texto. */
export type CatalogOption = { id: string; kind: string; label: string };

/**
 * Grupos + límites. Si las tablas de Fase 2 aún no existen en la base (antes del
 * `db:push`), la app sigue funcionando como en Fase 1 con `groupsReady: false`.
 */
async function loadGroups(): Promise<{
  groups: GroupSummary[];
  planLimits: PlanLimits;
  groupPublicSettings: GroupPublicSettings;
  groupsReady: boolean;
}> {
  try {
    const [list, planLimits, groupPublicSettings] = await Promise.all([listGroups(), getPlanLimits(), getGroupPublicSettings()]);
    return { groups: list, planLimits, groupPublicSettings, groupsReady: true };
  } catch (error) {
    console.warn('[grupos] tablas no disponibles todavía; se omite el módulo.', error);
    return { groups: [], planLimits: DEFAULT_PLAN_LIMITS, groupPublicSettings: DEFAULT_GROUP_PUBLIC_SETTINGS, groupsReady: false };
  }
}

export async function getInitialData(): Promise<{
  athletes: Athlete[];
  settings: ProductSettings;
  fichaTheme: 'light' | 'dark';
  fichaSectionsByCategory: FichaSectionsConfig;
  catalogOptions: CatalogOption[];
  groups: GroupSummary[];
  planLimits: PlanLimits;
  groupPublicSettings: GroupPublicSettings;
  groupsReady: boolean;
}> {
  const [athleteRows, assessmentRows, catalogRows, fichaTheme, fichaSectionsByCategory, groupData] = await Promise.all([
    // Los eliminados (borrado lógico) no llegan a la app; los inhabilitados sí, marcados.
    db.select().from(athletes).where(isNull(athletes.deletedAt)).orderBy(desc(athletes.createdAt)),
    db.select().from(assessments).where(isNull(assessments.deletedAt)),
    db.select().from(catalogItems).orderBy(catalogItems.sort),
    getFichaTheme(),
    getFichaSectionsByCategory(),
    loadGroups(),
  ]);

  // Todas las valoraciones por deportista, más recientes primero.
  const byAthlete = new Map<string, (typeof assessments.$inferSelect)[]>();
  for (const a of assessmentRows) {
    const list = byAthlete.get(a.athleteId) ?? [];
    list.push(a);
    byAthlete.set(a.athleteId, list);
  }
  for (const list of byAthlete.values()) {
    list.sort((x, y) =>
      x.assessedOn === y.assessedOn
        ? y.createdAt.getTime() - x.createdAt.getTime()
        : y.assessedOn.localeCompare(x.assessedOn),
    );
  }

  const groupIdsByAthlete = new Map<string, string[]>();
  for (const group of groupData.groups) {
    for (const athleteId of group.memberIds) {
      groupIdsByAthlete.set(athleteId, [...(groupIdsByAthlete.get(athleteId) ?? []), group.id]);
    }
  }

  const mapped = await Promise.all(
    athleteRows.map(async (row) => ({
      ...(await toAthlete(row, byAthlete.get(row.id) ?? [])),
      groupIds: groupIdsByAthlete.get(row.id) ?? [],
    })),
  );

  const byKind = (kind: CatalogKind) => catalogRows.filter((c) => c.kind === kind).map((c) => c.label);
  const settings: ProductSettings = {
    categories: byKind('category'),
    groups: byKind('group'),
    sports: byKind('sport'),
    positions: byKind('position'),
    sedes: byKind('sede'),
    modalidades: byKind('modalidad'),
  };

  return {
    athletes: mapped,
    settings,
    fichaTheme,
    fichaSectionsByCategory,
    catalogOptions: catalogRows.map((row) => ({ id: row.id, kind: row.kind, label: row.label })),
    ...groupData,
  };
}

export async function createAthlete(input: NewAthleteInput): Promise<Athlete> {
  let inserted: typeof athletes.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
    try {
      const [row] = await db
        .insert(athletes)
        .values({
          code: generateCode(),
          name: input.name.trim(),
          document: input.document.trim(),
          birthDate: input.birthDate,
          sex: input.sex,
          category: optionalLabel(input.category),
          group: optionalLabel(input.group),
          sport: optionalLabel(input.sport),
          position: optionalLabel(input.position),
          photoPath: input.photoPath ?? null,
        })
        .returning();
      inserted = row;
    } catch (error: unknown) {
      // 23505 = unique_violation (código duplicado) -> reintentar con otro código.
      if (typeof error === 'object' && error && 'code' in error && (error as { code: string }).code === '23505') continue;
      throw error;
    }
  }
  if (!inserted) throw new Error('No se pudo generar un código único para el deportista.');
  return toAthlete(inserted, []);
}

export async function updateAthlete(
  athleteId: string,
  input: Omit<NewAthleteInput, 'photoPath'> & { photoPath?: string | null },
): Promise<void> {
  const set: Record<string, unknown> = {
    name: input.name.trim(),
    document: input.document.trim(),
    birthDate: input.birthDate,
    sex: input.sex,
    category: optionalLabel(input.category),
    group: optionalLabel(input.group),
    sport: optionalLabel(input.sport),
    position: optionalLabel(input.position),
    updatedAt: new Date(),
  };
  // Solo reemplaza la foto si se subió una nueva.
  if (input.photoPath) set.photoPath = input.photoPath;
  await db.update(athletes).set(set).where(eq(athletes.id, athleteId));
}

/**
 * Guarda una valoración. Si `assessmentId` viene, ACTUALIZA esa ficha;
 * si no, CREA una ficha nueva fechada hoy (historial versionado).
 * Devuelve el id de la ficha guardada.
 */
export async function saveAssessment(
  athleteId: string,
  draft: AssessmentDraftInput,
  assessmentId?: string,
): Promise<string> {
  const values = {
    assessedOn: assessedOnDate(draft.assessedOn),
    anthropometry: {
      pesoKg: num(draft.weight),
      estaturaCm: num(draft.height),
      estaturaSentadoCm: num(draft.sittingHeight),
      envergaduraCm: num(draft.wingspan),
      imc: num(draft.imc),
      pctGrasa: num(draft.fat),
      pctMasa: num(draft.masa),
    },
    cardio: {
      fcReposo: num(draft.restingHr),
      fcInicial: num(draft.fcInicial),
      fcFinal: num(draft.fcFinal),
      fcMax: num(draft.fcMax),
    },
    rom: {
      columnaFlexion: num(draft.colFlex),
      columnaExtension: num(draft.colExt),
      hombroRotIntIzq: num(draft.hombRotIntIzq),
      hombroRotIntDer: num(draft.hombRotIntDer),
      hombroRotExtIzq: num(draft.hombRotExtIzq),
      hombroRotExtDer: num(draft.hombRotExtDer),
      hombroFlexionIzq: num(draft.hombFlexIzq),
      hombroFlexionDer: num(draft.hombFlexDer),
      caderaFlexionIzq: num(draft.caderaIzq),
      caderaFlexionDer: num(draft.caderaDer),
      rodillaFlexionIzq: num(draft.rodillaIzq),
      rodillaFlexionDer: num(draft.rodillaDer),
      otraLabel: draft.otraLabel.trim() || undefined,
      otraValor: num(draft.otraValor),
    },
    flexibility: {
      pruebaAplicada: draft.pruebaAplicada.trim() || undefined,
      resultadoCm: num(draft.sitReach),
      observacion: draft.flexObs.trim() || undefined,
    },
    performance: {
      dropJumpCm: num(draft.dropJump),
      cmjCm: num(draft.cmj),
      abalakovCm: num(draft.abalakov),
      saltoUnilateralDerCm: num(draft.saltoUniDer),
      saltoUnilateralIzqCm: num(draft.saltoUniIzq),
      rsi: num(draft.rsi),
      sentadillaCargaKg: num(draft.squatLoad),
      sentadilla1rmKg: num(draft.squat1rm),
      sentadillaVelocidadMediaMs: num(draft.squatVm),
      sentadillaPotenciaW: num(draft.squatPower),
      pct1rmSentadilla: num(draft.pct1rm),
      pressBancaCargaKg: num(draft.bancaLoad),
      pressBanca1rmKg: num(draft.banca1rm),
      pressBancaVelocidadMediaMs: num(draft.bancaVm),
      pressBancaPotenciaW: num(draft.bancaPower),
      pct1rmPressBanca: num(draft.bancaPct1rm),
      velocidad10mS: num(draft.speed10m),
      velocidad20mS: num(draft.speed20m),
      velocidad30mS: num(draft.speed30m),
      agilidadLabel: draft.agilityLabel.trim() || undefined,
      agilidad505S: num(draft.agilidad505),
      vo2Ml: num(draft.vo2),
    },
    observations: draft.notes.trim() || null,
    plan: draft.plan.trim() || null,
  };

  if (assessmentId) {
    await db
      .update(assessments)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(assessments.id, assessmentId));
    return assessmentId;
  }

  const [row] = await db
    .insert(assessments)
    .values({ athleteId, ...values })
    .returning({ id: assessments.id });
  return row.id;
}

/**
 * Elimina una ficha (borrado lógico) exigiendo una justificación.
 * La fila se conserva en BD con `deletedAt` + `deletedReason` para auditoría;
 * deja de listarse en la app y la ruta pública /ficha/[id] responde 404.
 */
export async function deleteAssessment(assessmentId: string, reason: string): Promise<void> {
  const clean = reason.trim();
  if (clean.length < 5) throw new Error('La justificación es obligatoria (mínimo 5 caracteres).');

  const result = await db
    .update(assessments)
    .set({ deletedAt: new Date(), deletedReason: clean.slice(0, 500), updatedAt: new Date() })
    .where(and(eq(assessments.id, assessmentId), isNull(assessments.deletedAt)))
    .returning({ id: assessments.id });

  if (!result.length) throw new Error('La ficha no existe o ya fue eliminada.');
}

/** Inhabilita o reactiva un deportista. Sus fichas, grupos y enlaces se conservan. */
export async function setAthleteDisabled(athleteId: string, disabled: boolean): Promise<void> {
  const result = await db
    .update(athletes)
    .set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(athletes.id, athleteId), isNull(athletes.deletedAt)))
    .returning({ id: athletes.id });
  if (!result.length) throw new Error('El deportista no existe o fue eliminado.');
}

/**
 * Elimina un deportista (borrado lógico) exigiendo una justificación, igual que
 * las fichas. Deja de listarse, sale de sus grupos (queda en el histórico) y sus
 * fichas públicas responden 404. La fila y las fichas se conservan en BD.
 */
export async function deleteAthlete(athleteId: string, reason: string): Promise<void> {
  const clean = reason.trim();
  if (clean.length < 5) throw new Error('La justificación es obligatoria (mínimo 5 caracteres).');

  await db.transaction(async (tx) => {
    const result = await tx
      .update(athletes)
      .set({ deletedAt: new Date(), deletedReason: clean.slice(0, 500), group: null, updatedAt: new Date() })
      .where(and(eq(athletes.id, athleteId), isNull(athletes.deletedAt)))
      .returning({ id: athletes.id });
    if (!result.length) throw new Error('El deportista no existe o ya fue eliminado.');
    await tx
      .update(groupMembers)
      .set({ leftAt: todayIso() })
      .where(and(eq(groupMembers.athleteId, athleteId), isNull(groupMembers.leftAt)));
  });
}

// ---- Catálogos (variables editables por el admin) ----

// ---- Tema de la ficha (claro / oscuro) ----

export async function getFichaTheme(): Promise<'light' | 'dark'> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, 'ficha_theme')).limit(1);
  return row?.value === 'dark' ? 'dark' : 'light';
}

export async function setFichaTheme(theme: 'light' | 'dark'): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: 'ficha_theme', value: theme })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: theme } });
}

export async function getFichaSectionsByCategory(): Promise<FichaSectionsConfig> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, 'ficha_sections_by_category')).limit(1);
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    const allowed = new Set<FichaSectionKey>(FICHA_SECTION_KEYS);
    return Object.fromEntries(
      Object.entries(parsed).map(([category, sections]) => [
        category,
        Array.isArray(sections)
          ? sections.filter((section): section is FichaSectionKey => allowed.has(section as FichaSectionKey))
          : defaultFichaSections,
      ]),
    );
  } catch {
    return {};
  }
}

export async function setFichaSectionsForCategory(category: string, sections: FichaSectionKey[]): Promise<void> {
  const clean = category.trim();
  if (!clean) return;
  const allowed = new Set<FichaSectionKey>(FICHA_SECTION_KEYS);
  const current = await getFichaSectionsByCategory();
  current[clean] = sections.filter((section) => allowed.has(section));
  await db
    .insert(appSettings)
    .values({ key: 'ficha_sections_by_category', value: JSON.stringify(current) })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(current) } });
}

/**
 * Columna de `athletes` que guarda el texto de cada catálogo. Los deportistas
 * copian la etiqueta (no un id), así que renombrar o borrar en el catálogo tiene
 * que tocarlos también — si no, quedan huérfanos (caso Cofisam/Coofisam).
 */
const athleteColumnByKind: Partial<Record<CatalogKind, AnyPgColumn>> = {
  category: athletes.category,
  group: athletes.group,
  sport: athletes.sport,
  position: athletes.position,
};

/**
 * Flag de grupo que apunta a cada catálogo. Los grupos guardan el id del ítem
 * (no el texto), así que renombrar no los toca; borrar sí debe revisarlos.
 */
const groupFlagByKind: Partial<Record<CatalogKind, keyof GroupFlags>> = {
  sport: 'disciplina',
  sede: 'sede',
  modalidad: 'modalidad',
};

/** Mensaje de error para mostrar al usuario, o null si la operación se aplicó. */
type CatalogResult = string | null;

const sameLabel = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');

export async function addCatalogItem(kind: CatalogKind, label: string): Promise<CatalogResult> {
  const clean = label.trim();
  if (!clean) return null;
  const rows = await db.select().from(catalogItems).where(eq(catalogItems.kind, kind));
  const existing = rows.find((row) => sameLabel(row.label, clean));
  if (existing) return `"${existing.label}" ya existe.`;
  await db.insert(catalogItems).values({ kind, label: clean, sort: rows.length });
  return null;
}

/**
 * Renombra la opción y, en la misma transacción, a todos los deportistas que la
 * tienen (y la clave de secciones de ficha si es una categoría). O se aplica todo,
 * o nada.
 */
export async function renameCatalogItem(kind: CatalogKind, oldLabel: string, newLabel: string): Promise<CatalogResult> {
  const clean = newLabel.trim();
  if (!clean || clean === oldLabel) return null;

  return db.transaction(async (tx) => {
    const rows = await tx.select().from(catalogItems).where(eq(catalogItems.kind, kind));
    const clash = rows.find((row) => row.label !== oldLabel && sameLabel(row.label, clean));
    if (clash) return `"${clash.label}" ya existe. Para unir las dos opciones, reasigna los deportistas y borra la sobrante.`;

    await tx
      .update(catalogItems)
      .set({ label: clean })
      .where(and(eq(catalogItems.kind, kind), eq(catalogItems.label, oldLabel)));

    const column = athleteColumnByKind[kind];
    if (column) {
      await tx
        .update(athletes)
        .set({ [kind]: clean, updatedAt: new Date() }) // kind === nombre del campo en athletes
        .where(eq(column, oldLabel));
    }

    if (kind === 'category') {
      const [settingsRow] = await tx
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, 'ficha_sections_by_category'))
        .limit(1);
      if (settingsRow?.value) {
        const config = JSON.parse(settingsRow.value) as Record<string, unknown>;
        if (oldLabel in config) {
          config[clean] = config[oldLabel];
          delete config[oldLabel];
          await tx
            .update(appSettings)
            .set({ value: JSON.stringify(config) })
            .where(eq(appSettings.key, 'ficha_sections_by_category'));
        }
      }
    }
    return null;
  });
}

/** Solo borra si ningún deportista ni grupo usa la opción; si no, avisa quién la usa. */
export async function deleteCatalogItem(kind: CatalogKind, label: string): Promise<CatalogResult> {
  const column = athleteColumnByKind[kind];
  if (column) {
    const inUse = await db.select({ id: athletes.id }).from(athletes).where(eq(column, label));
    if (inUse.length > 0) {
      return `"${label}" está asignado a ${inUse.length} deportista(s). Reasígnalos antes de borrarlo.`;
    }
  }

  const [item] = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.kind, kind), eq(catalogItems.label, label)))
    .limit(1);
  if (!item) return null;

  const flag = groupFlagByKind[kind];
  if (flag) {
    const usedBy = await db
      .select({ name: groups.name })
      .from(groups)
      .where(sql`${groups.flags} ->> ${flag} = ${item.id}`);
    if (usedBy.length > 0) {
      return `"${label}" está en uso por ${usedBy.length} grupo(s): ${usedBy.map((g) => g.name).join(', ')}. Cámbialo en esos grupos antes de borrarlo.`;
    }
  }

  await db.delete(catalogItems).where(eq(catalogItems.id, item.id));
  return null;
}
