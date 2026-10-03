import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assessments, athletes, catalogItems, groupMembers, groups } from '@/db/schema';
import { toAthlete } from '@/lib/athlete-mapper';
import { todayIso } from '@/lib/date';
import { GROUP_FLAG_CATALOG, GROUP_FLAG_LABELS, groupFlagsSchema, type GroupFlagKey } from '@/lib/groups';
import { summarizeGroup, type GroupReportData } from '@/lib/group-report';
import { getGroupPublicSettings } from '@/lib/group-actions';
import { athleteCells } from '@/lib/group-cells';
import { buildPublicRanking, groupTableEnabled, type PublicRanking } from '@/lib/group-columns';

/**
 * Lo que ve el responsable del grupo por el enlace público: agregados y el
 * ranking, ambos limitados a los indicadores configurados en Settings. El
 * ranking lleva nombres solo si Settings lo permite.
 */
export type PublicGroupReport = {
  group: {
    name: string;
    description: string;
    color: string | null;
    flags: Array<{ label: string; value: string }>;
    /** Solo nombre y cargo: teléfono y correo del responsable no se publican. */
    responsible: { name: string; role: string } | null;
    startsOn: string | null;
    endsOn: string | null;
  };
  generatedOn: string;
  report: GroupReportData;
  ranking: PublicRanking;
};

/**
 * Carga la ficha grupal por token (uso público, sin sesión). null si el token
 * no existe, fue revocado o el grupo está archivado.
 */
export async function getPublicGroupReport(token: string): Promise<PublicGroupReport | null> {
  if (!token || token.length < 16) return null;
  const [group] = await db.select().from(groups).where(eq(groups.shareToken, token)).limit(1);
  if (!group || group.status === 'archived') return null;

  const memberRows = await db
    .select({ athleteId: groupMembers.athleteId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), isNull(groupMembers.leftAt)));
  const ids = memberRows.map((row) => row.athleteId);

  const [athleteRows, assessmentRows, catalogRows, settings] = await Promise.all([
    // Inhabilitados y eliminados no cuentan en la ficha grupal.
    ids.length
      ? db.select().from(athletes).where(and(inArray(athletes.id, ids), isNull(athletes.disabledAt), isNull(athletes.deletedAt)))
      : Promise.resolve([]),
    ids.length
      ? db.select().from(assessments).where(and(inArray(assessments.athleteId, ids), isNull(assessments.deletedAt)))
      : Promise.resolve([]),
    db.select().from(catalogItems),
    getGroupPublicSettings(),
  ]);

  const byAthlete = new Map<string, (typeof assessmentRows)[number][]>();
  for (const row of assessmentRows) byAthlete.set(row.athleteId, [...(byAthlete.get(row.athleteId) ?? []), row]);
  for (const list of byAthlete.values()) {
    list.sort((x, y) =>
      x.assessedOn === y.assessedOn ? y.createdAt.getTime() - x.createdAt.getTime() : y.assessedOn.localeCompare(x.assessedOn),
    );
  }
  const members = await Promise.all(athleteRows.map((row) => toAthlete(row, byAthlete.get(row.id) ?? [])));

  const flags = groupFlagsSchema.safeParse(group.flags).data ?? {};
  const labelById = new Map(catalogRows.map((row) => [row.id, row.label]));
  const today = todayIso();
  const report = summarizeGroup(members, today);
  const visible = new Set(settings.columns);

  return {
    group: {
      name: group.name,
      description: group.description ?? '',
      color: group.color,
      flags: (Object.keys(GROUP_FLAG_CATALOG) as GroupFlagKey[])
        .map((key) => ({ label: GROUP_FLAG_LABELS[key], value: labelById.get(flags[key] ?? '') ?? '' }))
        .filter((flag) => flag.value),
      responsible: group.responsible ? { name: group.responsible.name, role: group.responsible.role } : null,
      startsOn: group.startsOn,
      endsOn: group.endsOn,
    },
    generatedOn: today,
    report: {
      ...report,
      indicators: report.indicators.filter((item) => visible.has(item.column)),
      axes: report.axes.filter((item) => visible.has(item.column)),
      trafficLights: report.trafficLights.filter((item) => visible.has(item.column)),
      evolution: report.evolution.filter((item) => visible.has(item.column)),
    },
    ranking: buildPublicRanking(members, settings, athleteCells, groupTableEnabled(settings, group.id)),
  };
}
