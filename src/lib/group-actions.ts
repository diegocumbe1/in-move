'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { db } from '@/db';
import { appSettings, athletes, groupMembers, groups } from '@/db/schema';
import { todayIso } from '@/lib/date';
import { GROUP_COLUMN_KEYS, PUBLIC_IDENTITIES, parseGroupPublicSettings, type GroupPublicSettings } from '@/lib/group-columns';
import {
  DEFAULT_PLAN_LIMITS,
  GROUP_STATUSES,
  PLAN_LIMITS_ENABLED,
  activeGroupsProblem,
  capacityProblem,
  cleanResponsible,
  groupFlagsSchema,
  mirrorGroupName,
  slugify,
  type GroupInput,
  type GroupStatus,
  type GroupSummary,
  type PlanLimits,
} from '@/lib/groups';

/**
 * Acciones del módulo de grupos (Fase 2 · C1).
 *
 * Escritura doble: `group_members` es la fuente de verdad, y `athletes.group`
 * se mantiene como espejo (primer grupo activo) para que la tabla, los filtros
 * y la ficha pública de Fase 1 sigan leyendo lo mismo. Ver PLAN_FASE2_C1.md §2.2.
 *
 * Todas devuelven un mensaje de error para el usuario, o null si se aplicaron.
 */

type Result = string | null;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PLAN_LIMITS_KEY = 'plan_limits';
const GROUP_PUBLIC_KEY = 'group_public_view';

// ── Lectura ────────────────────────────────────────────────────────────────

export async function getPlanLimits(): Promise<PlanLimits> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, PLAN_LIMITS_KEY)).limit(1);
  if (!row?.value) return DEFAULT_PLAN_LIMITS;
  try {
    const parsed = JSON.parse(row.value) as Partial<PlanLimits>;
    const pick = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
    return {
      enabled: PLAN_LIMITS_ENABLED,
      maxActiveGroups: pick(parsed.maxActiveGroups, DEFAULT_PLAN_LIMITS.maxActiveGroups),
      maxMembersPerGroup: pick(parsed.maxMembersPerGroup, DEFAULT_PLAN_LIMITS.maxMembersPerGroup),
      maxPhotoMb: pick(parsed.maxPhotoMb, DEFAULT_PLAN_LIMITS.maxPhotoMb),
      rankingRetention: pick(parsed.rankingRetention, DEFAULT_PLAN_LIMITS.rankingRetention),
    };
  } catch {
    return DEFAULT_PLAN_LIMITS;
  }
}

export async function setPlanLimits(limits: PlanLimits): Promise<Result> {
  if (!PLAN_LIMITS_ENABLED) return 'Los límites de plan están desactivados en el código (PLAN_LIMITS_ENABLED).';
  const { enabled: _enabled, ...stored } = limits; // `enabled` vive en el código, no en la base
  if (Object.values(stored).some((value) => !Number.isInteger(value) || value <= 0)) {
    return 'Los límites deben ser números enteros mayores que cero.';
  }
  const value = JSON.stringify(stored);
  await db
    .insert(appSettings)
    .values({ key: PLAN_LIMITS_KEY, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  return null;
}

/** Tabla general de los grupos: qué se ve en el admin y en el enlace público, y en qué grupos. */
export async function getGroupPublicSettings(): Promise<GroupPublicSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, GROUP_PUBLIC_KEY)).limit(1);
  return parseGroupPublicSettings(row?.value);
}

export async function setGroupPublicSettings(settings: GroupPublicSettings): Promise<Result> {
  const value = JSON.stringify({
    identity: PUBLIC_IDENTITIES.some((option) => option.key === settings.identity) ? settings.identity : 'none',
    columns: GROUP_COLUMN_KEYS.filter((key) => settings.columns.includes(key)),
    adminColumns: GROUP_COLUMN_KEYS.filter((key) => settings.adminColumns.includes(key)),
    excludedGroupIds: [...new Set(settings.excludedGroupIds)],
  });
  await db
    .insert(appSettings)
    .values({ key: GROUP_PUBLIC_KEY, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  return null;
}

/** Todos los grupos con sus miembros activos, ordenados por nombre. */
export async function listGroups(): Promise<GroupSummary[]> {
  const [groupRows, memberRows] = await Promise.all([
    db.select().from(groups).orderBy(groups.name),
    // Los inhabilitados no cuentan como miembros visibles (siguen en group_members y vuelven al reactivarlos).
    db
      .select({ groupId: groupMembers.groupId, athleteId: groupMembers.athleteId })
      .from(groupMembers)
      .innerJoin(athletes, eq(athletes.id, groupMembers.athleteId))
      .where(and(isNull(groupMembers.leftAt), isNull(athletes.disabledAt), isNull(athletes.deletedAt))),
  ]);
  const membersByGroup = new Map<string, string[]>();
  for (const member of memberRows) {
    const list = membersByGroup.get(member.groupId) ?? [];
    list.push(member.athleteId);
    membersByGroup.set(member.groupId, list);
  }
  return groupRows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    color: row.color,
    flags: groupFlagsSchema.safeParse(row.flags).data ?? {},
    capacity: row.capacity,
    responsible: row.responsible ?? null,
    shareToken: row.shareToken,
    status: (GROUP_STATUSES as readonly string[]).includes(row.status) ? (row.status as GroupStatus) : 'active',
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    memberIds: membersByGroup.get(row.id) ?? [],
  }));
}

// ── Helpers internos ───────────────────────────────────────────────────────

/** Normaliza y valida lo que llega del formulario. */
function cleanInput(input: GroupInput): { error: string } | { value: Required<GroupInput> & { slug: string } } {
  const name = input.name.trim();
  if (name.length < 2) return { error: 'El nombre del grupo debe tener al menos 2 caracteres.' };
  const slug = slugify(name);
  if (!slug) return { error: 'El nombre del grupo debe tener letras o números.' };
  const flags = groupFlagsSchema.safeParse(input.flags ?? {});
  if (!flags.success) return { error: 'Los flags del grupo no son válidos.' };
  const capacity = input.capacity == null || Number.isNaN(input.capacity) ? null : Math.round(input.capacity);
  if (capacity != null && capacity <= 0) return { error: 'El cupo debe ser mayor que cero, o dejarse vacío.' };
  const status = input.status ?? 'active';
  if (!GROUP_STATUSES.includes(status)) return { error: 'Estado de grupo no válido.' };
  const startsOn = input.startsOn || null;
  const endsOn = input.endsOn || null;
  if (startsOn && endsOn && endsOn < startsOn) return { error: 'La fecha de cierre no puede ser anterior a la de inicio.' };
  const color = input.color && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : null;
  const responsible = cleanResponsible(input.responsible);
  if ('error' in responsible) return { error: responsible.error };
  return {
    value: {
      name,
      slug,
      description: input.description?.trim() ?? '',
      color,
      flags: flags.data,
      capacity,
      responsible: responsible.value,
      status,
      startsOn,
      endsOn,
    },
  };
}

/** Recalcula el espejo `athletes.group` de los deportistas indicados. */
async function refreshMirror(tx: Tx, athleteIds: string[]) {
  if (athleteIds.length === 0) return;
  const rows = await tx
    .select({ athleteId: groupMembers.athleteId, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(inArray(groupMembers.athleteId, athleteIds), isNull(groupMembers.leftAt)));
  for (const athleteId of athleteIds) {
    const names = rows.filter((row) => row.athleteId === athleteId).map((row) => row.name);
    await tx.update(athletes).set({ group: mirrorGroupName(names), updatedAt: new Date() }).where(eq(athletes.id, athleteId));
  }
}

async function activeMemberIds(tx: Tx, groupId: string): Promise<string[]> {
  const rows = await tx
    .select({ athleteId: groupMembers.athleteId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.leftAt)));
  return rows.map((row) => row.athleteId);
}

async function countActiveGroups(tx: Tx, exceptId?: string): Promise<number> {
  const rows = await tx
    .select({ id: groups.id })
    .from(groups)
    .where(exceptId ? and(eq(groups.status, 'active'), ne(groups.id, exceptId)) : eq(groups.status, 'active'));
  return rows.length;
}

// ── Grupos ─────────────────────────────────────────────────────────────────

export async function createGroup(input: GroupInput): Promise<Result> {
  const cleaned = cleanInput(input);
  if ('error' in cleaned) return cleaned.error;
  const { value } = cleaned;
  const limits = await getPlanLimits();

  return db.transaction(async (tx) => {
    const [clash] = await tx.select({ name: groups.name }).from(groups).where(eq(groups.slug, value.slug)).limit(1);
    if (clash) return `Ya existe el grupo "${clash.name}".`;
    if (value.status === 'active') {
      const problem = activeGroupsProblem(await countActiveGroups(tx), limits);
      if (problem) return problem;
    }
    await tx.insert(groups).values(value);
    return null;
  });
}

export async function updateGroup(groupId: string, input: GroupInput): Promise<Result> {
  const cleaned = cleanInput(input);
  if ('error' in cleaned) return cleaned.error;
  const { value } = cleaned;
  const limits = await getPlanLimits();

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!current) return 'El grupo ya no existe.';

    const [clash] = await tx
      .select({ name: groups.name })
      .from(groups)
      .where(and(eq(groups.slug, value.slug), ne(groups.id, groupId)))
      .limit(1);
    if (clash) return `Ya existe el grupo "${clash.name}".`;

    if (value.status === 'active' && current.status !== 'active') {
      const problem = activeGroupsProblem(await countActiveGroups(tx, groupId), limits);
      if (problem) return problem;
    }

    const members = await activeMemberIds(tx, groupId);
    if (value.capacity != null && members.length > value.capacity) {
      return `El grupo tiene ${members.length} deportistas activos; el cupo no puede quedar en ${value.capacity}.`;
    }

    await tx.update(groups).set({ ...value, updatedAt: new Date() }).where(eq(groups.id, groupId));
    // Renombrar: los miembros ven el nombre nuevo también en el espejo de texto.
    if (current.name !== value.name) await refreshMirror(tx, members);
    return null;
  });
}

/** Inhabilitar (inactive) o reactivar un grupo sin pasar por el formulario completo. */
export async function setGroupStatus(groupId: string, status: GroupStatus): Promise<Result> {
  if (!GROUP_STATUSES.includes(status)) return 'Estado de grupo no válido.';
  const limits = await getPlanLimits();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!current) return 'El grupo ya no existe.';
    if (status === 'active' && current.status !== 'active') {
      const problem = activeGroupsProblem(await countActiveGroups(tx, groupId), limits);
      if (problem) return problem;
    }
    await tx.update(groups).set({ status, updatedAt: new Date() }).where(eq(groups.id, groupId));
    return null;
  });
}

/**
 * Elimina el grupo y sus membresías (también el histórico). Los deportistas y
 * sus fichas no se tocan; su espejo `athletes.group` pasa al siguiente grupo
 * activo o queda vacío. El enlace público deja de abrir.
 */
export async function deleteGroup(groupId: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!current) return 'El grupo ya no existe.';
    const members = await activeMemberIds(tx, groupId);
    await tx.delete(groups).where(eq(groups.id, groupId)); // group_members cae por cascade
    await refreshMirror(tx, members);
    return null;
  });
}

// ── Membresías ─────────────────────────────────────────────────────────────

/** Agrega deportistas a un grupo activo, respetando el cupo. Ignora a quien ya es miembro. */
export async function addGroupMembers(groupId: string, athleteIds: string[]): Promise<Result> {
  const limits = await getPlanLimits();
  return db.transaction(async (tx) => {
    const [group] = await tx.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group) return 'El grupo ya no existe.';
    if (group.status !== 'active') return `${group.name} no está activo. Actívalo para asignar deportistas.`;

    const current = new Set(await activeMemberIds(tx, groupId));
    const adding = [...new Set(athleteIds)].filter((id) => !current.has(id));
    if (adding.length === 0) return null;

    const problem = capacityProblem({ name: group.name, capacity: group.capacity, memberIds: [...current] }, adding.length, limits);
    if (problem) return problem;

    const today = todayIso();
    await tx.insert(groupMembers).values(adding.map((athleteId) => ({ groupId, athleteId, joinedAt: today })));
    await refreshMirror(tx, adding);
    return null;
  });
}

/** Retira al deportista del grupo. No borra: cierra la membresía (histórico). */
export async function removeGroupMember(groupId: string, athleteId: string): Promise<Result> {
  return db.transaction(async (tx) => {
    await tx
      .update(groupMembers)
      .set({ leftAt: todayIso() })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.athleteId, athleteId), isNull(groupMembers.leftAt)));
    await refreshMirror(tx, [athleteId]);
    return null;
  });
}

/**
 * Deja al deportista exactamente en `groupIds` (selector del formulario):
 * cierra las membresías que ya no están y abre las nuevas, con cupo.
 */
export async function setAthleteGroups(athleteId: string, groupIds: string[]): Promise<Result> {
  const limits = await getPlanLimits();
  const wanted = new Set(groupIds);

  return db.transaction(async (tx) => {
    const currentRows = await tx
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(and(eq(groupMembers.athleteId, athleteId), isNull(groupMembers.leftAt)));
    const current = new Set(currentRows.map((row) => row.groupId));
    const toAdd = [...wanted].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !wanted.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) return null;

    if (toAdd.length > 0) {
      const targets = await tx.select().from(groups).where(inArray(groups.id, toAdd));
      for (const group of targets) {
        if (group.status !== 'active') return `${group.name} no está activo.`;
        const problem = capacityProblem(
          { name: group.name, capacity: group.capacity, memberIds: await activeMemberIds(tx, group.id) },
          1,
          limits,
        );
        if (problem) return problem;
      }
      const today = todayIso();
      await tx.insert(groupMembers).values(targets.map((group) => ({ groupId: group.id, athleteId, joinedAt: today })));
    }

    if (toRemove.length > 0) {
      await tx
        .update(groupMembers)
        .set({ leftAt: todayIso() })
        .where(and(eq(groupMembers.athleteId, athleteId), inArray(groupMembers.groupId, toRemove), isNull(groupMembers.leftAt)));
    }

    await refreshMirror(tx, [athleteId]);
    return null;
  });
}

// ── Enlace público de la ficha grupal ──────────────────────────────────────

/** Token no adivinable (144 bits), apto para URL. */
const newShareToken = () => randomBytes(18).toString('base64url');

/**
 * Activa el enlace público (o lo regenera: el enlace anterior deja de funcionar).
 * Solo muestra datos generales del grupo, nunca fichas individuales.
 */
export async function enableGroupShare(groupId: string, regenerate = false): Promise<Result> {
  const [group] = await db.select({ shareToken: groups.shareToken }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group) return 'El grupo ya no existe.';
  if (group.shareToken && !regenerate) return null;
  await db.update(groups).set({ shareToken: newShareToken(), updatedAt: new Date() }).where(eq(groups.id, groupId));
  return null;
}

/** Desactiva el enlace público: quien lo tenga ya no puede abrirlo. */
export async function disableGroupShare(groupId: string): Promise<Result> {
  await db.update(groups).set({ shareToken: null, updatedAt: new Date() }).where(eq(groups.id, groupId));
  return null;
}
