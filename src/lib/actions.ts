'use server';

import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { athletes, assessments, catalogItems, appSettings } from '@/db/schema';
import { buildAssessment, deriveStatus } from '@/lib/scales';
import { emptyAssessment, generateCode, todayIso } from '@/lib/mock-product';
import type { Athlete, ProductSettings } from '@/lib/mock-product';
import type { NewAthleteInput, AssessmentDraftInput } from '@/lib/form-types';
import type { CatalogKind } from '@/lib/ficha';
import { publicPhotoUrl } from '@/lib/photo';

const num = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Convierte una fila de deportista (+ TODAS sus valoraciones, más recientes primero) al shape de la UI. */
async function toAthlete(
  row: typeof athletes.$inferSelect,
  rows: (typeof assessments.$inferSelect)[],
): Promise<Athlete> {
  const built = rows.map((r) =>
    buildAssessment(
      row.sex as 'M' | 'F',
      row.birthDate,
      r.assessedOn,
      {
        anthropometry: r.anthropometry,
        cardio: r.cardio,
        rom: r.rom,
        flexibility: r.flexibility,
        performance: r.performance,
        observations: r.observations,
        plan: r.plan,
      },
      r.id,
    ),
  );
  const assessments = built.length ? built : [emptyAssessment()];
  const latest = built[0];
  const state = latest ? deriveStatus(latest) : { status: 'warning' as const, statusLabel: 'Nuevo' };

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    document: row.document,
    birthDate: row.birthDate,
    sex: row.sex as 'M' | 'F',
    category: row.category ?? '',
    group: row.group ?? '',
    sport: row.sport ?? '',
    position: row.position ?? '',
    photoUrl: publicPhotoUrl(row.photoPath),
    status: state.status,
    statusLabel: state.statusLabel,
    assessments,
  };
}

export async function getInitialData(): Promise<{
  athletes: Athlete[];
  settings: ProductSettings;
  fichaTheme: 'light' | 'dark';
}> {
  const [athleteRows, assessmentRows, catalogRows, fichaTheme] = await Promise.all([
    db.select().from(athletes).orderBy(desc(athletes.createdAt)),
    db.select().from(assessments),
    db.select().from(catalogItems).orderBy(catalogItems.sort),
    getFichaTheme(),
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

  const mapped = await Promise.all(athleteRows.map((row) => toAthlete(row, byAthlete.get(row.id) ?? [])));

  const byKind = (kind: CatalogKind) => catalogRows.filter((c) => c.kind === kind).map((c) => c.label);
  const settings: ProductSettings = {
    categories: byKind('category'),
    groups: byKind('group'),
    sports: byKind('sport'),
    positions: byKind('position'),
  };

  return { athletes: mapped, settings, fichaTheme };
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
          category: input.category,
          group: input.group,
          sport: input.sport,
          position: input.position,
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
    category: input.category,
    group: input.group,
    sport: input.sport,
    position: input.position,
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
    anthropometry: {
      pesoKg: num(draft.weight),
      estaturaCm: num(draft.height),
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
      sjCm: num(draft.sj),
      cmjCm: num(draft.cmj),
      abalakovCm: num(draft.abalakov),
      saltoUnilateralDerCm: num(draft.saltoUniDer),
      saltoUnilateralIzqCm: num(draft.saltoUniIzq),
      fuerzaMaximaKg: num(draft.fuerzaMax),
      sentadilla1rmKg: num(draft.squat1rm),
      sentadillaDesplazamientoM: num(draft.squatDist),
      sentadillaSeg: num(draft.squatSeg),
      pressBanca1rmKg: num(draft.banca1rm),
      pressBancaDesplazamientoM: num(draft.bancaDist),
      pressBancaSeg: num(draft.bancaSeg),
      pct1rmSentadilla: num(draft.pct1rm),
      velocidad10mS: num(draft.speed10m),
      velocidad30mS: num(draft.speed30m),
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
    .values({ athleteId, assessedOn: todayIso(), ...values })
    .returning({ id: assessments.id });
  return row.id;
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

export async function addCatalogItem(kind: CatalogKind, label: string): Promise<void> {
  const clean = label.trim();
  if (!clean) return;
  const rows = await db.select().from(catalogItems).where(eq(catalogItems.kind, kind));
  await db.insert(catalogItems).values({ kind, label: clean, sort: rows.length });
}

export async function renameCatalogItem(kind: CatalogKind, oldLabel: string, newLabel: string): Promise<void> {
  const clean = newLabel.trim();
  if (!clean) return;
  await db
    .update(catalogItems)
    .set({ label: clean })
    .where(and(eq(catalogItems.kind, kind), eq(catalogItems.label, oldLabel)));
}

export async function deleteCatalogItem(kind: CatalogKind, label: string): Promise<void> {
  await db.delete(catalogItems).where(and(eq(catalogItems.kind, kind), eq(catalogItems.label, label)));
}
